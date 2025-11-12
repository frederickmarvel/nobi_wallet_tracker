import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TransactionHistoryService } from '../transaction-history/transaction-history.service';

@Injectable()
export class TransactionSyncScheduler {
  private readonly logger = new Logger(TransactionSyncScheduler.name);
  private readonly syncEnabled: boolean;
  private isSyncing = false;

  constructor(
    private readonly transactionHistoryService: TransactionHistoryService,
    private readonly configService: ConfigService,
  ) {
    this.syncEnabled =
      this.configService.get<string>('TRANSACTION_SYNC_ENABLED') === 'true';
    
    if (this.syncEnabled) {
      this.logger.log('Transaction sync scheduler is ENABLED');
    } else {
      this.logger.warn('Transaction sync scheduler is DISABLED');
    }
  }

  /**
   * Sync transactions for all active wallets
   * Runs every 10 minutes by default (configurable via TRANSACTION_SYNC_INTERVAL)
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleTransactionSync() {
    if (!this.syncEnabled) {
      return;
    }

    if (this.isSyncing) {
      this.logger.warn('Transaction sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting scheduled transaction sync...');

      const walletsToSync =
        await this.transactionHistoryService.getWalletsForSync();

      if (walletsToSync.length === 0) {
        this.logger.log('No wallets need syncing');
        return;
      }

      this.logger.log(
        `Found ${walletsToSync.length} wallet-network combinations to sync`,
      );

      let successCount = 0;
      let failureCount = 0;
      let totalSynced = 0;
      let totalSkipped = 0;

      for (const { wallet, network } of walletsToSync) {
        try {
          this.logger.debug(
            `Syncing wallet ${wallet.address} on ${network}...`,
          );

          const result =
            await this.transactionHistoryService.syncWalletTransactions(
              wallet.id,
              network,
            );

          successCount++;
          totalSynced += result.synced;
          totalSkipped += result.skipped;

          this.logger.debug(
            `Synced ${result.synced} new transactions for ${wallet.address} on ${network}`,
          );

          // Add small delay between syncs to avoid rate limiting
          await this.delay(300);
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Failed to sync wallet ${wallet.address} on ${network}`,
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(
        `Transaction sync completed in ${duration}s: ` +
          `${successCount} successful, ${failureCount} failed, ` +
          `${totalSynced} new transactions, ${totalSkipped} skipped`,
      );
    } catch (error) {
      this.logger.error('Transaction sync job failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Manually trigger sync (can be called via API or console)
   */
  async triggerManualSync(): Promise<void> {
    this.logger.log('Manual transaction sync triggered');
    await this.handleTransactionSync();
  }
}
