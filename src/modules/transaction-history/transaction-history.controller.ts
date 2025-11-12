import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionHistoryService } from './transaction-history.service';
import { WalletService } from '../wallet/wallet.service';
import {
  GetTransactionHistoryDto,
  SyncTransactionsDto,
} from './dto/transaction-history.dto';
import {
  TransactionHistoryResponseDto,
  SyncResultDto,
  SyncStatusDto,
  TransactionStatsDto,
} from './dto/transaction-response.dto';

@ApiTags('Transaction History')
@Controller('transactions')
export class TransactionHistoryController {
  constructor(
    private readonly transactionHistoryService: TransactionHistoryService,
    private readonly walletService: WalletService,
  ) {}

  @Get(':walletAddress')
  @ApiOperation({ summary: 'Get transaction history for a wallet address' })
  @ApiParam({ name: 'walletAddress', description: 'Wallet address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction history retrieved successfully',
    type: TransactionHistoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Wallet not found',
  })
  async getTransactionHistory(
    @Param('walletAddress') walletAddress: string,
    @Query() query: GetTransactionHistoryDto,
  ): Promise<TransactionHistoryResponseDto> {
    const { transactions, total } =
      await this.transactionHistoryService.getTransactionHistory(walletAddress, {
        network: query.network,
        category: query.category as any,
        direction: query.direction as any,
        startBlock: query.startBlock,
        endBlock: query.endBlock,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit || 50,
        offset: query.offset || 0,
        whitelistedOnly: query.whitelistedOnly,
      });

    return {
      transactions: transactions as any,
      total,
      limit: query.limit || 50,
      offset: query.offset || 0,
    };
  }

  @Post('sync/:walletAddress')
  @ApiOperation({ summary: 'Manually sync transaction history for a wallet' })
  @ApiParam({ name: 'walletAddress', description: 'Wallet address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction sync completed successfully',
    type: SyncResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Wallet not found',
  })
  async syncTransactions(
    @Param('walletAddress') walletAddress: string,
    @Query() query: SyncTransactionsDto,
  ): Promise<SyncResultDto> {
    const wallet = await this.walletService.findByAddress(walletAddress);

    if (!query.network && (!wallet.networks || wallet.networks.length === 0)) {
      throw new NotFoundException(
        'No network specified and wallet has no configured networks',
      );
    }

    const network = query.network || wallet.networks[0];

    const result = await this.transactionHistoryService.syncWalletTransactions(
      wallet.id,
      network,
      {
        fromBlock: query.fromBlock,
        toBlock: query.toBlock,
        fullSync: query.fullSync,
      },
    );

    return {
      success: true,
      message: `Successfully synced ${result.synced} new transactions`,
      synced: result.synced,
      skipped: result.skipped,
      totalFetched: result.totalFetched,
      walletAddress: wallet.address,
      network,
    };
  }

  @Get(':walletAddress/sync-status')
  @ApiOperation({ summary: 'Get sync status for a wallet' })
  @ApiParam({ name: 'walletAddress', description: 'Wallet address' })
  @ApiQuery({ name: 'network', required: false, description: 'Filter by network' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sync status retrieved successfully',
    type: [SyncStatusDto],
  })
  async getSyncStatus(
    @Param('walletAddress') walletAddress: string,
    @Query('network') network?: string,
  ): Promise<SyncStatusDto[]> {
    const wallet = await this.walletService.findByAddress(walletAddress);
    const statuses = await this.transactionHistoryService.getSyncStatus(
      wallet.id,
      network,
    );

    return statuses as any;
  }

  @Get(':walletAddress/stats')
  @ApiOperation({ summary: 'Get transaction statistics for a wallet' })
  @ApiParam({ name: 'walletAddress', description: 'Wallet address' })
  @ApiQuery({ name: 'network', required: false, description: 'Filter by network' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction statistics retrieved successfully',
    type: TransactionStatsDto,
  })
  async getTransactionStats(
    @Param('walletAddress') walletAddress: string,
    @Query('network') network?: string,
  ): Promise<TransactionStatsDto> {
    const wallet = await this.walletService.findByAddress(walletAddress);
    return this.transactionHistoryService.getTransactionStats(wallet.id, network);
  }
}
