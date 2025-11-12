import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionHistoryService } from './transaction-history.service';
import { TransactionHistoryController } from './transaction-history.controller';
import { TransactionSyncScheduler } from './transaction-sync.scheduler';
import { TransactionHistory } from './entities/transaction-history.entity';
import { WalletSyncStatus } from './entities/wallet-sync-status.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { AlchemyModule } from '../alchemy/alchemy.module';
import { WhitelistModule } from '../whitelist/whitelist.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionHistory, WalletSyncStatus, Wallet]),
    AlchemyModule,
    WhitelistModule,
    WalletModule,
  ],
  controllers: [TransactionHistoryController],
  providers: [TransactionHistoryService, TransactionSyncScheduler],
  exports: [TransactionHistoryService],
})
export class TransactionHistoryModule {}
