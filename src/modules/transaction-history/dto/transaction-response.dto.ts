import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  hash: string;

  @ApiProperty()
  fromAddress: string;

  @ApiProperty()
  toAddress: string;

  @ApiProperty()
  network: string;

  @ApiProperty()
  blockNum: string;

  @ApiProperty()
  blockNumDecimal: number;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  category: string;

  @ApiProperty()
  direction: string;

  @ApiPropertyOptional()
  value?: string;

  @ApiPropertyOptional()
  asset?: string;

  @ApiPropertyOptional()
  tokenAddress?: string;

  @ApiPropertyOptional()
  tokenId?: string;

  @ApiPropertyOptional()
  usdValue?: string;

  @ApiProperty()
  isWhitelisted: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class TransactionHistoryResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  transactions: TransactionResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;
}

export class SyncResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  synced: number;

  @ApiProperty()
  skipped: number;

  @ApiProperty()
  totalFetched: number;

  @ApiProperty()
  walletAddress: string;

  @ApiProperty()
  network: string;
}

export class SyncStatusDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  network: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  lastSyncedBlock?: string;

  @ApiPropertyOptional()
  lastSyncedAt?: Date;

  @ApiProperty()
  transactionCount: number;

  @ApiProperty()
  errorCount: number;

  @ApiProperty()
  autoSync: boolean;
}

export class TransactionStatsDto {
  @ApiProperty()
  totalTransactions: number;

  @ApiProperty()
  incomingCount: number;

  @ApiProperty()
  outgoingCount: number;

  @ApiProperty()
  byCategory: Record<string, number>;

  @ApiPropertyOptional()
  oldestTransaction?: Date;

  @ApiPropertyOptional()
  latestTransaction?: Date;
}
