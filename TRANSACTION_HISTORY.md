# Transaction History Feature - Implementation Guide

## Overview

This implementation adds comprehensive transaction history tracking for Ethereum and other EVM-compatible networks using the Alchemy API. All transactions (incoming and outgoing) are recorded from the genesis block (0x0) to the latest block.

## Features Implemented

### 1. **Transaction History Tracking**
- Records all transaction types: external, internal, ERC20, ERC721, ERC1155
- Tracks both incoming and outgoing transactions
- Stores complete transaction metadata (hash, block, timestamp, value, etc.)
- Supports multiple EVM networks (Ethereum, Polygon, Arbitrum, Optimism, Base)
- Automatic deduplication to prevent storing duplicate transactions

### 2. **Multi-Network Support**
Supported networks:
- Ethereum Mainnet & Sepolia
- Polygon Mainnet & Amoy
- Arbitrum Mainnet & Sepolia  
- Optimism Mainnet & Sepolia
- Base Mainnet & Sepolia

### 3. **Intelligent Sync System**
- **Full History Sync**: Fetches all transactions from genesis block (0x0)
- **Pagination Handling**: Automatically handles Alchemy API pagination
- **Incremental Sync**: Tracks last synced block to avoid re-fetching
- **Sync Status Tracking**: Monitors sync progress per wallet-network combination
- **Error Recovery**: Tracks errors and allows retry on failure

### 4. **Automated Scheduling**
- Runs every 10 minutes by default (configurable)
- Can be enabled/disabled via environment variable
- Syncs all active wallets automatically
- Rate limiting to avoid API throttling

## Database Schema

### `transaction_history` Table
```sql
- id: UUID primary key
- hash: Transaction hash
- fromAddress: Sender address
- toAddress: Recipient address
- network: Network identifier (e.g., 'eth-mainnet')
- blockNum: Block number (hex)
- blockNumDecimal: Block number (decimal, for easier querying)
- timestamp: Transaction timestamp
- category: Transaction type (external/internal/erc20/erc721/erc1155)
- direction: incoming/outgoing (relative to tracked wallet)
- value: Transfer amount
- asset: Token symbol
- tokenAddress: Token contract address
- isWhitelisted: Whether token is in whitelist
- walletId: Foreign key to wallets table
```

### `wallet_sync_status` Table
```sql
- id: UUID primary key
- walletId: Foreign key to wallets
- network: Network being synced
- status: pending/in_progress/completed/failed
- lastSyncedBlock: Last block that was synced
- lastSyncedAt: Timestamp of last successful sync
- transactionCount: Total transactions synced
- errorCount: Number of failed sync attempts
- autoSync: Whether to automatically sync this wallet
```

## API Endpoints

### Get Transaction History
```http
GET /api/v1/transactions/:walletAddress

Query Parameters:
- network (optional): Filter by network
- category (optional): external|internal|erc20|erc721|erc1155
- direction (optional): incoming|outgoing
- startBlock (optional): Start block number
- endBlock (optional): End block number
- startDate (optional): Start date (ISO 8601)
- endDate (optional): End date (ISO 8601)
- limit (optional): Results per page (default: 50)
- offset (optional): Pagination offset (default: 0)
- whitelistedOnly (optional): Only whitelisted tokens

Response:
{
  "transactions": [...],
  "total": 1234,
  "limit": 50,
  "offset": 0
}
```

### Manually Sync Transactions
```http
POST /api/v1/transactions/sync/:walletAddress

Query Parameters:
- network (optional): Network to sync
- fromBlock (optional): Starting block (hex)
- toBlock (optional): Ending block (hex)
- fullSync (optional): Sync from genesis (default: false)

Response:
{
  "success": true,
  "message": "Successfully synced 150 new transactions",
  "synced": 150,
  "skipped": 25,
  "totalFetched": 175,
  "walletAddress": "0x...",
  "network": "eth-mainnet"
}
```

### Get Sync Status
```http
GET /api/v1/transactions/:walletAddress/sync-status?network=eth-mainnet

Response:
[
  {
    "id": "...",
    "network": "eth-mainnet",
    "status": "completed",
    "lastSyncedBlock": "0x123abc",
    "lastSyncedAt": "2025-11-12T10:30:00Z",
    "transactionCount": 234,
    "errorCount": 0,
    "autoSync": true
  }
]
```

### Get Transaction Statistics
```http
GET /api/v1/transactions/:walletAddress/stats?network=eth-mainnet

Response:
{
  "totalTransactions": 234,
  "incomingCount": 156,
  "outgoingCount": 78,
  "byCategory": {
    "external": 120,
    "erc20": 100,
    "erc721": 14
  },
  "oldestTransaction": "2020-01-15T12:00:00Z",
  "latestTransaction": "2025-11-12T10:25:00Z"
}
```

## Environment Configuration

Add these variables to your `.env` file:

```env
# Transaction Sync Settings
TRANSACTION_SYNC_ENABLED=true
TRANSACTION_SYNC_INTERVAL=600000  # 10 minutes in milliseconds
MAX_TRANSACTIONS_PER_SYNC=1000
```

## Usage Examples

### 1. Add a Wallet for Transaction Tracking
```bash
POST /api/v1/wallets
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "name": "My Trading Wallet",
  "networks": ["eth-mainnet", "polygon-mainnet"],
  "active": true
}
```

### 2. Manually Trigger Full Sync
```bash
POST /api/v1/transactions/sync/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?fullSync=true&network=eth-mainnet
```

### 3. Query Recent Transactions
```bash
GET /api/v1/transactions/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?network=eth-mainnet&limit=100
```

### 4. Get Incoming ERC20 Transfers Only
```bash
GET /api/v1/transactions/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?category=erc20&direction=incoming
```

## How It Works

### Automatic Syncing
1. Scheduler runs every 10 minutes
2. Finds all active wallets with configured networks
3. Checks sync status for each wallet-network combination
4. If never synced or auto-sync enabled, triggers sync
5. Fetches both incoming and outgoing transactions
6. Deduplicates and saves to database
7. Updates sync status with latest block

### Manual Syncing
1. API endpoint triggered with wallet address
2. Optionally specify network, block range, or full sync
3. Fetches complete transaction history with pagination
4. Processes and saves transactions
5. Returns sync results

### Smart Pagination
- Alchemy API limits results per request
- Service automatically follows `pageKey` tokens
- Continues until all transactions fetched
- Safety limit of 100 pages to prevent infinite loops

## Database Queries

### Find High-Value Transactions
```sql
SELECT * FROM transaction_history 
WHERE walletId = 'wallet-uuid'
  AND usdValue > 1000
ORDER BY usdValue DESC;
```

### Get Daily Transaction Volume
```sql
SELECT DATE(timestamp) as date, 
       COUNT(*) as tx_count,
       SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
       SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing
FROM transaction_history
WHERE walletId = 'wallet-uuid'
  AND network = 'eth-mainnet'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Find Wallets Needing Sync
```sql
SELECT w.address, w.name, wss.network, wss.lastSyncedAt
FROM wallets w
LEFT JOIN wallet_sync_status wss ON w.id = wss.walletId
WHERE w.active = true
  AND (wss.status IS NULL OR wss.status != 'in_progress')
ORDER BY wss.lastSyncedAt ASC NULLS FIRST;
```

## Performance Considerations

1. **Indexes**: Multiple indexes on transaction_history for fast queries
2. **Bulk Insert**: Uses chunked bulk inserts (500 per batch)
3. **Deduplication**: Checks existing hashes before inserting
4. **Rate Limiting**: 200-300ms delay between API requests
5. **Pagination**: Handles large transaction histories efficiently

## Monitoring

Check sync health:
```sql
SELECT network, status, COUNT(*) as count
FROM wallet_sync_status
GROUP BY network, status;
```

Check error rates:
```sql
SELECT walletId, network, errorCount, lastError
FROM wallet_sync_status
WHERE errorCount > 0
ORDER BY errorCount DESC;
```

## Troubleshooting

### Sync Failures
- Check `wallet_sync_status.lastError` for error message
- Verify Alchemy API key is valid and has sufficient credits
- Check network connectivity
- Ensure wallet address is valid

### Missing Transactions
- Verify wallet has configured networks
- Check if sync is enabled (`autoSync = true`)
- Manually trigger full sync with `fullSync=true`
- Check Alchemy API response for the address

### Performance Issues
- Add more indexes if queries are slow
- Consider archiving old transactions
- Reduce sync frequency in environment config
- Enable MySQL query cache

## Next Steps

1. Start the application: `npm run start:dev`
2. Add wallets via API
3. Trigger initial sync or wait for scheduled sync
4. Query transaction history
5. Monitor sync status and errors

## Notes

- First sync may take time depending on wallet age
- Alchemy API has rate limits (check your plan)
- Database grows with transaction volume
- Consider data retention policies for production
