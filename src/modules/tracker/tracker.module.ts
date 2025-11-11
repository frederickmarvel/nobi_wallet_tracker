import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackerService } from './tracker.service';
import { TrackerController } from './tracker.controller';
import { WalletModule } from '../wallet/wallet.module';
import { AlchemyModule } from '../alchemy/alchemy.module';
import { WhitelistModule } from '../whitelist/whitelist.module';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletBalance]),
    WalletModule,
    AlchemyModule,
    WhitelistModule,
  ],
  controllers: [TrackerController],
  providers: [TrackerService],
  exports: [TrackerService],
})
export class TrackerModule {}