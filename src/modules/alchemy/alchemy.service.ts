import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { 
  AlchemyApiResponse, 
  AlchemyTokenData, 
  TokensByAddressRequest 
} from './interfaces/alchemy.interface';

@Injectable()
export class AlchemyService {
  private readonly logger = new Logger(AlchemyService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ALCHEMY_API_KEY');
    this.baseUrl = this.configService.get<string>('ALCHEMY_BASE_URL');

    if (!this.apiKey) {
      throw new Error('ALCHEMY_API_KEY is required');
    }

    if (!this.baseUrl) {
      throw new Error('ALCHEMY_BASE_URL is required');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch token balances for multiple wallet addresses
   * Based on the example.ts implementation
   */
  async getTokensByAddresses(
    walletAddresses: Array<{ address: string; networks: string[] }>,
    options: {
      withPrices?: boolean;
      includeErc20Tokens?: boolean;
      includeNativeTokens?: boolean;
      pageKey?: string;
    } = {},
  ): Promise<AlchemyApiResponse> {
    try {
      const requestPayload: TokensByAddressRequest = {
        addresses: walletAddresses,
        withPrices: options.withPrices ?? true,
        includeErc20Tokens: options.includeErc20Tokens ?? true,
        includeNativeTokens: options.includeNativeTokens ?? true,
        ...(options.pageKey && { pageKey: options.pageKey }),
      };

      this.logger.debug(`Fetching tokens for ${walletAddresses.length} wallet(s)`, {
        addresses: walletAddresses.map(w => w.address),
        options,
      });

      const response = await this.httpClient.post(
        `/${this.apiKey}/assets/tokens/by-address`,
        requestPayload,
      );

      this.logger.debug(`Successfully fetched ${response.data.data.tokens.length} tokens`);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch tokens from Alchemy', {
        error: error.message,
        walletAddresses: walletAddresses.map(w => w.address),
      });

      if (axios.isAxiosError(error)) {
        const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const message = error.response?.data?.message || 'Alchemy API error';
        
        throw new HttpException(
          {
            message: 'Failed to fetch wallet tokens',
            details: message,
          },
          status,
        );
      }

      throw new HttpException(
        'Failed to fetch wallet tokens',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetch tokens for a single wallet address
   */
  async getTokensForWallet(
    walletAddress: string,
    networks: string[],
    options?: {
      withPrices?: boolean;
      includeErc20Tokens?: boolean;
      includeNativeTokens?: boolean;
    },
  ): Promise<AlchemyTokenData[]> {
    const response = await this.getTokensByAddresses(
      [{ address: walletAddress, networks }],
      options,
    );

    return response.data.tokens;
  }

  /**
   * Convert hex balance to decimal string
   */
  hexToDecimal(hexBalance: string, decimals: number = 18): string {
    try {
      const balance = BigInt(hexBalance);
      const divisor = BigInt(10 ** decimals);
      const wholePart = balance / divisor;
      const fractionalPart = balance % divisor;
      
      if (fractionalPart === BigInt(0)) {
        return wholePart.toString();
      }
      
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      const trimmedFractional = fractionalStr.replace(/0+$/, '');
      
      if (trimmedFractional === '') {
        return wholePart.toString();
      }
      
      return `${wholePart.toString()}.${trimmedFractional}`;
    } catch (error) {
      this.logger.warn(`Failed to convert hex balance: ${hexBalance}`, error);
      return '0';
    }
  }

  /**
   * Get USD value from token prices
   */
  getUsdValue(tokenPrices: AlchemyTokenData['tokenPrices']): number | null {
    if (!tokenPrices || tokenPrices.length === 0) {
      return null;
    }

    const usdPrice = tokenPrices.find(price => price.currency === 'usd');
    return usdPrice ? parseFloat(usdPrice.value) : null;
  }

  /**
   * Check if a token appears to be spam/dust based on metadata
   */
  isLikelySpamToken(token: AlchemyTokenData): boolean {
    const { tokenMetadata, tokenAddress } = token;
    
    // Native tokens (null address) are never spam
    if (!tokenAddress) {
      return false;
    }

    const name = tokenMetadata.name?.toLowerCase() || '';
    const symbol = tokenMetadata.symbol?.toLowerCase() || '';

    // Common spam indicators
    const spamPatterns = [
      /visit|claim|airdrop|reward|bonus/,
      /\$\s*(usdt|usdc|eth|btc)/,
      /www\./,
      /\.com|\.net|\.org|\.io/,
      /https?:\/\//,
      /t\.ly|t\.me/,
      /access|check|get/,
    ];

    return spamPatterns.some(pattern => 
      pattern.test(name) || pattern.test(symbol)
    );
  }
}