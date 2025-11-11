export interface AlchemyTokenData {
  address: string;
  network: string;
  tokenAddress?: string;
  tokenBalance: string;
  tokenMetadata: {
    symbol?: string;
    decimals?: number;
    name?: string;
    logo?: string;
  };
  tokenPrices?: Array<{
    currency: string;
    value: string;
    lastUpdatedAt: string;
  }>;
}

export interface AlchemyApiResponse {
  data: {
    tokens: AlchemyTokenData[];
    pageKey?: string;
  };
}

export interface TokensByAddressRequest {
  addresses: Array<{
    address: string;
    networks: string[];
  }>;
  withPrices: boolean;
  includeErc20Tokens: boolean;
  includeNativeTokens: boolean;
  pageKey?: string;
}