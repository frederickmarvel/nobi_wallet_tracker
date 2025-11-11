import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletService } from '../wallet/wallet.service';
import { AlchemyService } from '../alchemy/alchemy.service';
import { WhitelistService } from '../whitelist/whitelist.service';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { AlchemyTokenData } from '../alchemy/interfaces/alchemy.interface';

@Injectable()
export class TrackerService {
  private readonly logger = new Logger(TrackerService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly alchemyService: AlchemyService,
    private readonly whitelistService: WhitelistService,
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async trackAllWallets(): Promise<void> {
    this.logger.log('Starting wallet tracking cycle');
    
    try {
      const activeWallets = await this.walletService.getActiveWallets();
      
      if (activeWallets.length === 0) {
        this.logger.log('No active wallets to track');
        return;
      }

      this.logger.log(`Tracking ${activeWallets.length} active wallets`);

      for (const wallet of activeWallets) {
        try {
          await this.trackWallet(wallet.id);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between wallets
        } catch (error) {
          this.logger.error(`Failed to track wallet ${wallet.address}:`, error);
        }
      }

      this.logger.log('Completed wallet tracking cycle');
    } catch (error) {
      this.logger.error('Failed to track wallets:', error);
    }
  }

  async trackWallet(walletId: string): Promise<void> {
    this.logger.debug(`Tracking wallet ${walletId}`);
    
    try {
      const wallet = await this.walletService.findOne(walletId);
      
      if (!wallet.active) {
        this.logger.debug(`Skipping inactive wallet ${wallet.address}`);
        return;
      }

      if (!wallet.networks || wallet.networks.length === 0) {
        this.logger.warn(`Wallet ${wallet.address} has no networks configured`);
        return;
      }

      // Fetch tokens from Alchemy
      const tokens = await this.alchemyService.getTokensForWallet(
        wallet.address,
        wallet.networks,
        {
          withPrices: true,
          includeErc20Tokens: true,
          includeNativeTokens: true,
        },
      );

      this.logger.debug(`Found ${tokens.length} tokens for wallet ${wallet.address}`);

      // Process and save token balances
      await this.processTokenBalances(wallet.id, tokens);

      // Update wallet last tracked timestamp
      await this.walletService.updateLastTracked(wallet.id);

      this.logger.debug(`Successfully tracked wallet ${wallet.address}`);
    } catch (error) {
      this.logger.error(`Failed to track wallet ${walletId}:`, error);
      throw error;
    }
  }

  async processTokenBalances(walletId: string, tokens: AlchemyTokenData[]): Promise<void> {
    const balancesToSave: Partial<WalletBalance>[] = [];

    for (const token of tokens) {
      try {
        // Check if token is whitelisted
        const isWhitelisted = await this.whitelistService.isTokenWhitelisted(
          token.tokenAddress || null,
          token.network,
        );

        // Check if token is likely spam/dust
        const isDust = this.alchemyService.isLikelySpamToken(token);

        // Convert hex balance to decimal
        const decimals = token.tokenMetadata.decimals || 18;
        const balanceDecimal = this.alchemyService.hexToDecimal(token.tokenBalance, decimals);

        // Get USD value
        const usdValue = this.alchemyService.getUsdValue(token.tokenPrices);

        // Skip tokens with zero balance
        if (balanceDecimal === '0') {
          continue;
        }

        const balanceData: Partial<WalletBalance> = {
          walletId,
          tokenAddress: token.tokenAddress || null,
          network: token.network,
          balance: token.tokenBalance,
          balanceDecimal,
          usdValue: usdValue || undefined,
          symbol: token.tokenMetadata.symbol || null,
          name: token.tokenMetadata.name || null,
          decimals: token.tokenMetadata.decimals || null,
          logo: token.tokenMetadata.logo || null,
          isWhitelisted,
          isDust,
        };

        balancesToSave.push(balanceData);
      } catch (error) {
        this.logger.error(`Failed to process token ${token.tokenAddress}:`, error);
      }
    }

    if (balancesToSave.length === 0) {
      this.logger.debug(`No balances to save for wallet ${walletId}`);
      return;
    }

    // Remove existing balances for this wallet
    await this.walletBalanceRepository.delete({ walletId });

    // Save new balances
    const entities = balancesToSave.map(balance => 
      this.walletBalanceRepository.create(balance)
    );
    
    await this.walletBalanceRepository.save(entities);
    
    this.logger.debug(`Saved ${entities.length} balances for wallet ${walletId}`);
  }

  async forceTrackWallet(walletId: string): Promise<{ message: string; balanceCount: number }> {
    this.logger.log(`Force tracking wallet ${walletId}`);
    
    await this.trackWallet(walletId);
    
    const balances = await this.walletService.getWalletBalances(walletId);
    
    return {
      message: 'Wallet tracked successfully',
      balanceCount: balances.length,
    };
  }

  async getTrackingStats(): Promise<{
    totalWallets: number;
    activeWallets: number;
    totalBalances: number;
    whitelistedBalances: number;
    dustBalances: number;
  }> {
    const [
      totalWallets,
      activeWallets,
      totalBalances,
      whitelistedBalances,
      dustBalances,
    ] = await Promise.all([
      this.walletService.findAll().then(wallets => wallets.length),
      this.walletService.getActiveWallets().then(wallets => wallets.length),
      this.walletBalanceRepository.count(),
      this.walletBalanceRepository.count({ where: { isWhitelisted: true } }),
      this.walletBalanceRepository.count({ where: { isDust: true } }),
    ]);

    return {
      totalWallets,
      activeWallets,
      totalBalances,
      whitelistedBalances,
      dustBalances,
    };
  }
}