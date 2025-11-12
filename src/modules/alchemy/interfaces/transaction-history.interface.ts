export interface AlchemyTransferResult {
  blockNum: string; // Hex block number
  hash: string; // Transaction hash
  from: string; // From address
  to: string; // To address
  value: number | null; // Transfer value
  asset: string | null; // Asset symbol (ETH, USDC, etc.)
  category: 'external' | 'internal' | 'erc20' | 'erc721' | 'erc1155';
  erc721TokenId: string | null;
  erc1155Metadata: Array<{ tokenId: string; value: string }> | null;
  tokenId: string | null;
  rawContract: {
    value: string | null;
    address: string | null;
    decimal: string | null;
  };
  metadata?: {
    blockTimestamp?: string; // ISO timestamp
  };
}

export interface AlchemyTransactionHistoryResponse {
  jsonrpc: string;
  id: number;
  result: {
    transfers: AlchemyTransferResult[];
    pageKey?: string; // For pagination
  };
}

export interface TransactionHistoryRequest {
  fromBlock?: string; // Hex block number or "0x0" for genesis
  toBlock?: string; // Hex block number or "latest"
  fromAddress?: string; // Filter by sender
  toAddress?: string; // Filter by recipient
  contractAddresses?: string[]; // Filter by token contracts
  excludeZeroValue?: boolean;
  category?: Array<'external' | 'internal' | 'erc20' | 'erc721' | 'erc1155'>;
  withMetadata?: boolean;
  maxCount?: string; // Hex number, max results per request
  pageKey?: string; // For pagination
  order?: 'asc' | 'desc';
}

export interface NetworkConfig {
  name: string; // e.g., 'eth-mainnet'
  chainId: number;
  rpcUrl: string; // Alchemy RPC URL
  nativeSymbol: string; // ETH, MATIC, etc.
}

export const SUPPORTED_NETWORKS: { [key: string]: NetworkConfig } = {
  'eth-mainnet': {
    name: 'eth-mainnet',
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2',
    nativeSymbol: 'ETH',
  },
  'eth-sepolia': {
    name: 'eth-sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2',
    nativeSymbol: 'ETH',
  },
  'polygon-mainnet': {
    name: 'polygon-mainnet',
    chainId: 137,
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2',
    nativeSymbol: 'MATIC',
  },
  'polygon-amoy': {
    name: 'polygon-amoy',
    chainId: 80002,
    rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2',
    nativeSymbol: 'MATIC',
  },
  'arbitrum-mainnet': {
    name: 'arbitrum-mainnet',
    chainId: 42161,
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2',
    nativeSymbol: 'ETH',
  },
  'arbitrum-sepolia': {
    name: 'arbitrum-sepolia',
    chainId: 421614,
    rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2',
    nativeSymbol: 'ETH',
  },
  'optimism-mainnet': {
    name: 'optimism-mainnet',
    chainId: 10,
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2',
    nativeSymbol: 'ETH',
  },
  'optimism-sepolia': {
    name: 'optimism-sepolia',
    chainId: 11155420,
    rpcUrl: 'https://opt-sepolia.g.alchemy.com/v2',
    nativeSymbol: 'ETH',
  },
  'base-mainnet': {
    name: 'base-mainnet',
    chainId: 8453,
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2',
    nativeSymbol: 'ETH',
  },
  'base-sepolia': {
    name: 'base-sepolia',
    chainId: 84532,
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2',
    nativeSymbol: 'ETH',
  },
};
