import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { WalletResponseDto } from './dto/wallet-response.dto';

@ApiTags('wallets')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully', type: WalletResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Wallet already exists' })
  async create(@Body() createWalletDto: CreateWalletDto) {
    return this.walletService.create(createWalletDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all wallets' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Filter active wallets only' })
  @ApiResponse({ status: 200, description: 'List of wallets', type: [WalletResponseDto] })
  async findAll(@Query('activeOnly', new ParseBoolPipe({ optional: true })) activeOnly?: boolean) {
    return this.walletService.findAll(activeOnly || false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'id', description: 'Wallet UUID' })
  @ApiResponse({ status: 200, description: 'Wallet found', type: WalletResponseDto })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.walletService.findOne(id);
  }

  @Get('address/:address')
  @ApiOperation({ summary: 'Get wallet by address' })
  @ApiParam({ name: 'address', description: 'Ethereum wallet address' })
  @ApiResponse({ status: 200, description: 'Wallet found', type: WalletResponseDto })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async findByAddress(@Param('address') address: string) {
    return this.walletService.findByAddress(address);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update wallet' })
  @ApiParam({ name: 'id', description: 'Wallet UUID' })
  @ApiResponse({ status: 200, description: 'Wallet updated successfully', type: WalletResponseDto })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @ApiResponse({ status: 409, description: 'Wallet address already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWalletDto: UpdateWalletDto,
  ) {
    return this.walletService.update(id, updateWalletDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete wallet' })
  @ApiParam({ name: 'id', description: 'Wallet UUID' })
  @ApiResponse({ status: 200, description: 'Wallet deleted successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.walletService.remove(id);
    return { message: 'Wallet deleted successfully' };
  }

  @Get(':id/balances')
  @ApiOperation({ summary: 'Get wallet token balances' })
  @ApiParam({ name: 'id', description: 'Wallet UUID' })
  @ApiQuery({ name: 'network', required: false, description: 'Filter by network' })
  @ApiQuery({ name: 'whitelistedOnly', required: false, type: Boolean, description: 'Show only whitelisted tokens' })
  @ApiQuery({ name: 'excludeDust', required: false, type: Boolean, description: 'Exclude dust tokens' })
  @ApiResponse({ status: 200, description: 'Wallet balances' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getBalances(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('network') network?: string,
    @Query('whitelistedOnly', new ParseBoolPipe({ optional: true })) whitelistedOnly?: boolean,
    @Query('excludeDust', new ParseBoolPipe({ optional: true })) excludeDust?: boolean,
  ) {
    return this.walletService.getWalletBalances(id, {
      network,
      whitelistedOnly,
      excludeDust,
    });
  }

  @Get(':id/total-value')
  @ApiOperation({ summary: 'Get total USD value of wallet' })
  @ApiParam({ name: 'id', description: 'Wallet UUID' })
  @ApiResponse({ status: 200, description: 'Total USD value' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getTotalValue(@Param('id', ParseUUIDPipe) id: string) {
    const totalValue = await this.walletService.getTotalUsdValue(id);
    return { totalUsdValue: totalValue };
  }
}