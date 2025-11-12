import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionCategoryDto {
  EXTERNAL = 'external',
  INTERNAL = 'internal',
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  ERC1155 = 'erc1155',
}

export enum TransactionDirectionDto {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

export class GetTransactionHistoryDto {
  @ApiPropertyOptional({ description: 'Network to filter by (e.g., eth-mainnet, polygon-mainnet)' })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({ enum: TransactionCategoryDto, description: 'Transaction category' })
  @IsOptional()
  @IsEnum(TransactionCategoryDto)
  category?: TransactionCategoryDto;

  @ApiPropertyOptional({ enum: TransactionDirectionDto, description: 'Transaction direction' })
  @IsOptional()
  @IsEnum(TransactionDirectionDto)
  direction?: TransactionDirectionDto;

  @ApiPropertyOptional({ description: 'Start block number (decimal)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startBlock?: number;

  @ApiPropertyOptional({ description: 'End block number (decimal)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  endBlock?: number;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Number of results to return', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of results to skip', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number;

  @ApiPropertyOptional({ description: 'Only return whitelisted tokens', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  whitelistedOnly?: boolean;
}

export class SyncTransactionsDto {
  @ApiPropertyOptional({ description: 'Network to sync (e.g., eth-mainnet, polygon-mainnet)' })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({ description: 'Starting block (hex)', example: '0x0' })
  @IsOptional()
  @IsString()
  fromBlock?: string;

  @ApiPropertyOptional({ description: 'Ending block (hex)', example: 'latest' })
  @IsOptional()
  @IsString()
  toBlock?: string;

  @ApiPropertyOptional({ description: 'Perform full sync from genesis block', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  fullSync?: boolean;
}
