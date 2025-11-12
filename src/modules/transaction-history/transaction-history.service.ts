import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  TransactionHistory,
  TransactionCategory,
  TransactionDirection,
} from './entities/transaction-history.entity';
import {
  WalletSyncStatus,
  SyncStatus,
} from './entities/wallet-sync-status.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { AlchemyService } from '../alchemy/alchemy.service';
import { WhitelistService } from '../whitelist/whitelist.service';
import { AlchemyTransferResult } from '../alchemy/interfaces/transaction-history.interface';

@Injectable()
export class TransactionHistoryService {
  private readonly logger = new Logger(TransactionHistoryService.name);

  constructor(
    @InjectRepository(TransactionHistory)
    private readonly transactionRepository: Repository<TransactionHistory>,
    @InjectRepository(WalletSyncStatus)
    private readonly syncStatusRepository: Repository<WalletSyncStatus>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly alchemyService: AlchemyService,
    private readonly whitelistService: WhitelistService,
  ) {}

  /**
   * Sync transaction history for a wallet on a specific network
   */
  async syncWalletTransactions(
    walletId: string,
    network: string,
    options: {
      fromBlock?: string;
      toBlock?: string;
      fullSync?: boolean;
    } = {},
  ): Promise<{
    synced: number;
    skipped: number;
    totalFetched: number;
  }> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    // Get or create sync status
    let syncStatus = await this.syncStatusRepository.findOne({
      where: { walletId, network },
    });

    if (!syncStatus) {
      syncStatus = this.syncStatusRepository.create({
        walletId,
        network,
        status: SyncStatus.PENDING,
      });
      await this.syncStatusRepository.save(syncStatus);
    }

    // Check if already syncing
    if (syncStatus.status === SyncStatus.IN_PROGRESS) {
      this.logger.warn(
        `Sync already in progress for wallet ${wallet.address} on ${network}`,
      );
      return { synced: 0, skipped: 0, totalFetched: 0 };
    }

    // Update status to in progress
    syncStatus.status = SyncStatus.IN_PROGRESS;
    syncStatus.lastAttemptAt = new Date();
    await this.syncStatusRepository.save(syncStatus);

    try {
      const fromBlock = options.fullSync
        ? '0x0'
        : options.fromBlock || syncStatus.lastSyncedBlock || '0x0';

      this.logger.log(
        `Starting transaction sync for wallet ${wallet.address} on ${network} from block ${fromBlock}`,
      );

      // Fetch both incoming and outgoing transactions
      const { incoming, outgoing } =
        await this.alchemyService.getCompleteTransactionHistory(
          wallet.address,
          network,
          {
            fromBlock,
            toBlock: options.toBlock || 'latest',
          },
        );

      const allTransfers = [...incoming, ...outgoing];
      this.logger.debug(
        `Fetched ${allTransfers.length} transactions (${incoming.length} incoming, ${outgoing.length} outgoing)`,
      );

      // Process and save transactions
      const { synced, skipped } = await this.saveTransactions(
        walletId,
        wallet.address,
        network,
        allTransfers,
      );

      // Update sync status
      const latestBlock = this.getLatestBlockFromTransfers(allTransfers);
      syncStatus.status = SyncStatus.COMPLETED;
      syncStatus.lastSyncedAt = new Date();
      syncStatus.transactionCount += synced;
      syncStatus.errorCount = 0;
      syncStatus.lastError = null;

      if (latestBlock) {
        syncStatus.lastSyncedBlock = latestBlock;
        syncStatus.lastSyncedBlockDecimal =
          this.alchemyService.hexToDecimalBlockNumber(latestBlock);
      }

      await this.syncStatusRepository.save(syncStatus);

      this.logger.log(
        `Completed sync for wallet ${wallet.address} on ${network}: ${synced} new, ${skipped} skipped`,
      );

      return {
        synced,
        skipped,
        totalFetched: allTransfers.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync transactions for wallet ${wallet.address} on ${network}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      // Update sync status with error
      syncStatus.status = SyncStatus.FAILED;
      syncStatus.lastError =
        error instanceof Error ? error.message : String(error);
      syncStatus.errorCount += 1;
      await this.syncStatusRepository.save(syncStatus);

      throw error;
    }
  }

  /**
   * Save transactions to database
   */
  private async saveTransactions(
    walletId: string,
    walletAddress: string,
    network: string,
    transfers: AlchemyTransferResult[],
  ): Promise<{ synced: number; skipped: number }> {
    if (transfers.length === 0) {
      return { synced: 0, skipped: 0 };
    }

    // Get existing transaction hashes to avoid duplicates
    const hashes = transfers.map((t) => t.hash);
    const existing = await this.transactionRepository.find({
      where: {
        hash: In(hashes),
        network,
        walletId,
      },
      select: ['hash'],
    });

    const existingHashes = new Set(existing.map((t) => t.hash));
    const newTransfers = transfers.filter((t) => !existingHashes.has(t.hash));

    if (newTransfers.length === 0) {
      this.logger.debug(
        `All ${transfers.length} transactions already exist in database`,
      );
      return { synced: 0, skipped: transfers.length };
    }

    // Convert transfers to transaction entities
    const transactions = await Promise.all(
      newTransfers.map((transfer) =>
        this.transferToEntity(walletId, walletAddress, network, transfer),
      ),
    );

    // Bulk insert
    await this.transactionRepository.save(transactions, { chunk: 500 });

    this.logger.debug(
      `Saved ${transactions.length} new transactions to database`,
    );

    return {
      synced: transactions.length,
      skipped: transfers.length - transactions.length,
    };
  }

  /**
   * Convert Alchemy transfer result to transaction entity
   */
  private async transferToEntity(
    walletId: string,
    walletAddress: string,
    network: string,
    transfer: AlchemyTransferResult,
  ): Promise<TransactionHistory> {
    const direction =
      transfer.from.toLowerCase() === walletAddress.toLowerCase()
        ? TransactionDirection.OUTGOING
        : TransactionDirection.INCOMING;

    const blockNumDecimal = this.alchemyService.hexToDecimalBlockNumber(
      transfer.blockNum,
    );

    // Check if token is whitelisted
    const isWhitelisted = transfer.rawContract?.address
      ? await this.whitelistService.isTokenWhitelisted(
          transfer.rawContract.address,
          network,
        )
      : false;

    // Parse timestamp from metadata or use current time
    const timestamp = transfer.metadata?.blockTimestamp
      ? new Date(transfer.metadata.blockTimestamp)
      : new Date();

    return this.transactionRepository.create({
      walletId,
      hash: transfer.hash,
      fromAddress: transfer.from.toLowerCase(),
      toAddress: transfer.to ? transfer.to.toLowerCase() : transfer.from.toLowerCase(),
      network,
      blockNum: transfer.blockNum,
      blockNumDecimal,
      timestamp,
      category: transfer.category as TransactionCategory,
      direction,
      value: transfer.value ? transfer.value.toString() : null,
      asset: transfer.asset,
      tokenAddress: transfer.rawContract?.address?.toLowerCase() || null,
      tokenId: transfer.tokenId,
      erc721TokenId: transfer.erc721TokenId,
      erc1155Metadata: transfer.erc1155Metadata,
      rawContract: transfer.rawContract,
      isWhitelisted,
      metadata: transfer.metadata ? JSON.stringify(transfer.metadata) : null,
    });
  }

  /**
   * Get latest block number from transfers
   */
  private getLatestBlockFromTransfers(
    transfers: AlchemyTransferResult[],
  ): string | null {
    if (transfers.length === 0) return null;

    const blocks = transfers
      .map((t) => this.alchemyService.hexToDecimalBlockNumber(t.blockNum))
      .filter((b) => !isNaN(b));

    if (blocks.length === 0) return null;

    const maxBlock = Math.max(...blocks);
    return this.alchemyService.decimalToHexBlockNumber(maxBlock);
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(
    walletAddress: string,
    options: {
      network?: string;
      category?: TransactionCategory;
      direction?: TransactionDirection;
      startBlock?: number;
      endBlock?: number;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
      whitelistedOnly?: boolean;
    } = {},
  ): Promise<{ transactions: TransactionHistory[]; total: number }> {
    const wallet = await this.walletRepository.findOne({
      where: { address: walletAddress.toLowerCase() },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with address ${walletAddress} not found`);
    }

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.walletId = :walletId', { walletId: wallet.id });

    if (options.network) {
      queryBuilder.andWhere('tx.network = :network', {
        network: options.network,
      });
    }

    if (options.category) {
      queryBuilder.andWhere('tx.category = :category', {
        category: options.category,
      });
    }

    if (options.direction) {
      queryBuilder.andWhere('tx.direction = :direction', {
        direction: options.direction,
      });
    }

    if (options.startBlock) {
      queryBuilder.andWhere('tx.blockNumDecimal >= :startBlock', {
        startBlock: options.startBlock,
      });
    }

    if (options.endBlock) {
      queryBuilder.andWhere('tx.blockNumDecimal <= :endBlock', {
        endBlock: options.endBlock,
      });
    }

    if (options.startDate) {
      queryBuilder.andWhere('tx.timestamp >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options.endDate) {
      queryBuilder.andWhere('tx.timestamp <= :endDate', {
        endDate: options.endDate,
      });
    }

    if (options.whitelistedOnly) {
      queryBuilder.andWhere('tx.isWhitelisted = true');
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const transactions = await queryBuilder
      .orderBy('tx.blockNumDecimal', 'DESC')
      .addOrderBy('tx.timestamp', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return { transactions, total };
  }

  /**
   * Get sync status for a wallet
   */
  async getSyncStatus(walletId: string, network?: string): Promise<WalletSyncStatus[]> {
    const where: any = { walletId };
    if (network) {
      where.network = network;
    }

    return this.syncStatusRepository.find({
      where,
      order: { lastSyncedAt: 'DESC' },
    });
  }

  /**
   * Get wallets that need syncing
   */
  async getWalletsForSync(): Promise<
    Array<{ wallet: Wallet; network: string }>
  > {
    const activeWallets = await this.walletRepository.find({
      where: { active: true },
    });

    const walletsToSync: Array<{ wallet: Wallet; network: string }> = [];

    for (const wallet of activeWallets) {
      if (!wallet.networks || wallet.networks.length === 0) {
        continue;
      }

      for (const network of wallet.networks) {
        const syncStatus = await this.syncStatusRepository.findOne({
          where: { walletId: wallet.id, network },
        });

        // Sync if never synced, or if auto-sync is enabled and not currently syncing
        if (
          !syncStatus ||
          (syncStatus.autoSync && syncStatus.status !== SyncStatus.IN_PROGRESS)
        ) {
          walletsToSync.push({ wallet, network });
        }
      }
    }

    return walletsToSync;
  }

  /**
   * Get transaction statistics for a wallet
   */
  async getTransactionStats(walletId: string, network?: string): Promise<{
    totalTransactions: number;
    incomingCount: number;
    outgoingCount: number;
    byCategory: Record<string, number>;
    oldestTransaction?: Date;
    latestTransaction?: Date;
  }> {
    const where: any = { walletId };
    if (network) {
      where.network = network;
    }

    const transactions = await this.transactionRepository.find({ where });

    const stats = {
      totalTransactions: transactions.length,
      incomingCount: transactions.filter(
        (t) => t.direction === TransactionDirection.INCOMING,
      ).length,
      outgoingCount: transactions.filter(
        (t) => t.direction === TransactionDirection.OUTGOING,
      ).length,
      byCategory: {} as Record<string, number>,
      oldestTransaction: undefined as Date | undefined,
      latestTransaction: undefined as Date | undefined,
    };

    // Count by category
    for (const tx of transactions) {
      stats.byCategory[tx.category] = (stats.byCategory[tx.category] || 0) + 1;
    }

    // Get oldest and latest
    if (transactions.length > 0) {
      const sorted = transactions.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );
      stats.oldestTransaction = sorted[0].timestamp;
      stats.latestTransaction = sorted[sorted.length - 1].timestamp;
    }

    return stats;
  }
}
