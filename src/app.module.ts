import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { WalletModule } from './modules/wallet/wallet.module';
import { WhitelistModule } from './modules/whitelist/whitelist.module';
import { AlchemyModule } from './modules/alchemy/alchemy.module';
import { TrackerModule } from './modules/tracker/tracker.module';
import { TransactionHistoryModule } from './modules/transaction-history/transaction-history.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Auto-create tables
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    ScheduleModule.forRoot(),
    WalletModule,
    WhitelistModule,
    AlchemyModule,
    TrackerModule,
    TransactionHistoryModule,
  ],
})
export class AppModule {}