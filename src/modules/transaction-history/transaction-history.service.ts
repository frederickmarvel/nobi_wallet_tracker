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

      // Fetch and save transactions in batches
      let totalSynced = 0;
      let totalSkipped = 0;
      let totalFetched = 0;

      // Fetch incoming transactions
      const incomingResult = await this.syncTransactionBatches(
        walletId,
        wallet.address,
        network,
        fromBlock,
        options.toBlock || 'latest',
        true, // incoming
      );
      totalSynced += incomingResult.synced;
      totalSkipped += incomingResult.skipped;
      totalFetched += incomingResult.fetched;

      // Fetch outgoing transactions
      const outgoingResult = await this.syncTransactionBatches(
        walletId,
        wallet.address,
        network,
        fromBlock,
        options.toBlock || 'latest',
        false, // outgoing
      );
      totalSynced += outgoingResult.synced;
      totalSkipped += outgoingResult.skipped;
      totalFetched += outgoingResult.fetched;

      // Update sync status
      syncStatus.status = SyncStatus.COMPLETED;
      syncStatus.lastSyncedAt = new Date();
      syncStatus.transactionCount += totalSynced;
      syncStatus.errorCount = 0;
      syncStatus.lastError = '';

      if (fromBlock !== '0x0') {
        syncStatus.lastSyncedBlock = options.toBlock || 'latest';
        if (options.toBlock && options.toBlock !== 'latest') {
          syncStatus.lastSyncedBlockDecimal =
            this.alchemyService.hexToDecimalBlockNumber(options.toBlock);
        }
      }

      await this.syncStatusRepository.save(syncStatus);

      this.logger.log(
        `Completed sync for wallet ${wallet.address} on ${network}: ${totalSynced} new, ${totalSkipped} skipped, ${totalFetched} total fetched`,
      );

      return {
        synced: totalSynced,
        skipped: totalSkipped,
        totalFetched: totalFetched,
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
   * Sync transactions in batches (page by page) and save immediately
   */
  private async syncTransactionBatches(
    walletId: string,
    walletAddress: string,
    network: string,
    fromBlock: string,
    toBlock: string,
    isIncoming: boolean,
  ): Promise<{ synced: number; skipped: number; fetched: number }> {
    let totalSynced = 0;
    let totalSkipped = 0;
    let totalFetched = 0;
    let pageKey: string | undefined;
    let pageCount = 0;
    const maxPages = 200; // Increased limit

    this.logger.log(
      `Syncing ${isIncoming ? 'incoming' : 'outgoing'} transactions for ${walletAddress} on ${network}`,
    );

    do {
      try {
        // Fetch one page
        const response = await this.alchemyService.getTransactionHistory(
          walletAddress,
          network,
          {
            fromBlock,
            toBlock,
            [isIncoming ? 'toAddress' : 'fromAddress']: walletAddress,
            pageKey,
          },
        );

        const transfers = response.result?.transfers || [];
        totalFetched += transfers.length;
        pageKey = response.result?.pageKey;
        pageCount++;

        this.logger.debug(
          `${isIncoming ? 'Incoming' : 'Outgoing'} page ${pageCount}: Fetched ${transfers.length} transactions`,
        );

        if (transfers.length > 0) {
          // Save this batch immediately
          const { synced, skipped } = await this.saveTransactions(
            walletId,
            walletAddress,
            network,
            transfers,
          );
          totalSynced += synced;
          totalSkipped += skipped;

          this.logger.log(
            `Saved batch ${pageCount}: ${synced} new, ${skipped} duplicates (Total: ${totalSynced} saved)`,
          );
        }

        // Safety check
        if (pageCount >= maxPages) {
          this.logger.warn(
            `Reached maximum page limit (${maxPages}) for ${walletAddress} on ${network}`,
          );
          break;
        }

        // Small delay to avoid rate limiting
        if (pageKey) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch/save ${isIncoming ? 'incoming' : 'outgoing'} page ${pageCount + 1}`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        throw error;
      }
    } while (pageKey);

    this.logger.log(
      `Completed ${isIncoming ? 'incoming' : 'outgoing'} sync: ${totalSynced} new, ${totalSkipped} duplicates, ${totalFetched} fetched`,
    );

    return {
      synced: totalSynced,
      skipped: totalSkipped,
      fetched: totalFetched,
    };
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

    // Bulk insert with error handling for duplicates
    try {
      await this.transactionRepository.save(transactions, { chunk: 500 });

      this.logger.debug(
        `Saved ${transactions.length} new transactions to database`,
      );

      return {
        synced: transactions.length,
        skipped: transfers.length - transactions.length,
      };
    } catch (error) {
      // Handle duplicate key errors gracefully
      if (error instanceof Error && error.message.includes('Duplicate entry')) {
        this.logger.warn(
          `Encountered duplicate entries during batch save, saving individually`,
        );

        // Save one by one to skip duplicates
        let savedCount = 0;
        for (const transaction of transactions) {
          try {
            await this.transactionRepository.save(transaction);
            savedCount++;
          } catch (dupError) {
            if (dupError instanceof Error && dupError.message.includes('Duplicate entry')) {
              this.logger.debug(`Skipped duplicate transaction: ${transaction.hash}`);
            } else {
              throw dupError;
            }
          }
        }

        this.logger.debug(
          `Saved ${savedCount} transactions individually, skipped ${transactions.length - savedCount} duplicates`,
        );

        return {
          synced: savedCount,
          skipped: transfers.length - savedCount,
        };
      }
      throw error;
    }
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

    const transactionData = {
      walletId,
      walletAddress: walletAddress.toLowerCase(),
      hash: transfer.hash,
      fromAddress: transfer.from.toLowerCase(),
      toAddress: transfer.to ? transfer.to.toLowerCase() : transfer.from.toLowerCase(),
      network,
      blockNum: transfer.blockNum,
      blockNumDecimal,
      timestamp,
      category: transfer.category as TransactionCategory,
      direction,
      value: transfer.value ? transfer.value.toString() : undefined,
      asset: transfer.asset || undefined,
      tokenAddress: transfer.rawContract?.address?.toLowerCase() || undefined,
      tokenId: transfer.tokenId || undefined,
      erc721TokenId: transfer.erc721TokenId || undefined,
      erc1155Metadata: transfer.erc1155Metadata || undefined,
      rawContract: transfer.rawContract || undefined,
      isWhitelisted,
      metadata: transfer.metadata ? JSON.stringify(transfer.metadata) : undefined,
    };

    const transaction = this.transactionRepository.create(transactionData);
    return Array.isArray(transaction) ? transaction[0] : transaction;
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
