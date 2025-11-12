import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { 
  AlchemyApiResponse, 
  AlchemyTokenData, 
  TokensByAddressRequest 
} from './interfaces/alchemy.interface';
import {
  AlchemyTransactionHistoryResponse,
  TransactionHistoryRequest,
  AlchemyTransferResult,
  SUPPORTED_NETWORKS,
  NetworkConfig,
} from './interfaces/transaction-history.interface';

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

  /**
   * Get transaction history for an address using alchemy_getAssetTransfers
   */
  async getTransactionHistory(
    address: string,
    network: string,
    options: TransactionHistoryRequest = {},
  ): Promise<AlchemyTransactionHistoryResponse> {
    try {
      const networkConfig = SUPPORTED_NETWORKS[network];
      if (!networkConfig) {
        throw new HttpException(
          `Unsupported network: ${network}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const requestPayload = {
        jsonrpc: '2.0',
        id: 0,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: options.fromBlock || '0x0',
            toBlock: options.toBlock || 'latest',
            fromAddress: options.fromAddress,
            toAddress: options.toAddress,
            category: options.category || ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
            withMetadata: options.withMetadata !== false,
            excludeZeroValue: options.excludeZeroValue ?? false,
            maxCount: options.maxCount || '0x3e8', // 1000 in hex
            ...(options.pageKey && { pageKey: options.pageKey }),
            ...(options.contractAddresses && { contractAddresses: options.contractAddresses }),
            ...(options.order && { order: options.order }),
          },
        ],
      };

      this.logger.debug(`Fetching transaction history for ${address} on ${network}`, {
        fromBlock: options.fromBlock,
        toBlock: options.toBlock,
        hasPageKey: !!options.pageKey,
      });

      const rpcUrl = `${networkConfig.rpcUrl}/${this.apiKey}`;
      const response = await this.httpClient.post<AlchemyTransactionHistoryResponse>(
        rpcUrl,
        requestPayload,
      );

      const transferCount = response.data.result?.transfers?.length || 0;
      this.logger.debug(`Fetched ${transferCount} transactions for ${address}`, {
        hasMorePages: !!response.data.result?.pageKey,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch transaction history from Alchemy', {
        error: error instanceof Error ? error.message : String(error),
        address,
        network,
      });

      if (axios.isAxiosError(error)) {
        const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const message = error.response?.data?.message || 'Alchemy API error';
        
        throw new HttpException(
          {
            message: 'Failed to fetch transaction history',
            details: message,
          },
          status,
        );
      }

      throw new HttpException(
        'Failed to fetch transaction history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all transaction history for an address (handles pagination automatically)
   */
  async getAllTransactionHistory(
    address: string,
    network: string,
    options: Omit<TransactionHistoryRequest, 'pageKey'> = {},
  ): Promise<AlchemyTransferResult[]> {
    const allTransfers: AlchemyTransferResult[] = [];
    let pageKey: string | undefined;
    let pageCount = 0;
    const maxPages = 100; // Safety limit

    this.logger.log(`Starting full transaction history sync for ${address} on ${network}`);

    do {
      try {
        const response = await this.getTransactionHistory(address, network, {
          ...options,
          pageKey,
        });

        const transfers = response.result?.transfers || [];
        allTransfers.push(...transfers);

        pageKey = response.result?.pageKey;
        pageCount++;

        this.logger.debug(
          `Page ${pageCount}: Fetched ${transfers.length} transactions (Total: ${allTransfers.length})`,
          { hasMorePages: !!pageKey },
        );

        // Safety check to prevent infinite loops
        if (pageCount >= maxPages) {
          this.logger.warn(
            `Reached maximum page limit (${maxPages}) for ${address} on ${network}`,
          );
          break;
        }

        // Add small delay between requests to avoid rate limiting
        if (pageKey) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        this.logger.error(`Failed to fetch page ${pageCount + 1}`, {
          error: error instanceof Error ? error.message : String(error),
          address,
          network,
        });
        throw error;
      }
    } while (pageKey);

    this.logger.log(
      `Completed transaction history sync for ${address} on ${network}: ${allTransfers.length} transactions`,
    );

    return allTransfers;
  }

  /**
   * Get transactions sent FROM an address
   */
  async getOutgoingTransactions(
    address: string,
    network: string,
    options: Omit<TransactionHistoryRequest, 'fromAddress'> = {},
  ): Promise<AlchemyTransferResult[]> {
    return this.getAllTransactionHistory(address, network, {
      ...options,
      fromAddress: address,
    });
  }

  /**
   * Get transactions sent TO an address
   */
  async getIncomingTransactions(
    address: string,
    network: string,
    options: Omit<TransactionHistoryRequest, 'toAddress'> = {},
  ): Promise<AlchemyTransferResult[]> {
    return this.getAllTransactionHistory(address, network, {
      ...options,
      toAddress: address,
    });
  }

  /**
   * Get both incoming and outgoing transactions for an address
   */
  async getCompleteTransactionHistory(
    address: string,
    network: string,
    options: Omit<TransactionHistoryRequest, 'fromAddress' | 'toAddress'> = {},
  ): Promise<{ incoming: AlchemyTransferResult[]; outgoing: AlchemyTransferResult[] }> {
    const [incoming, outgoing] = await Promise.all([
      this.getIncomingTransactions(address, network, options),
      this.getOutgoingTransactions(address, network, options),
    ]);

    return { incoming, outgoing };
  }

  /**
   * Convert block number from hex to decimal
   */
  hexToDecimalBlockNumber(hexBlock: string): number {
    return parseInt(hexBlock, 16);
  }

  /**
   * Convert block number from decimal to hex
   */
  decimalToHexBlockNumber(decimalBlock: number): string {
    return '0x' + decimalBlock.toString(16);
  }

  /**
   * Get supported networks
   */
  getSupportedNetworks(): NetworkConfig[] {
    return Object.values(SUPPORTED_NETWORKS);
  }

  /**
   * Check if network is supported
   */
  isNetworkSupported(network: string): boolean {
    return network in SUPPORTED_NETWORKS;
  }
}