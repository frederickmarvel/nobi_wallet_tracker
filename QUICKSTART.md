# Quick Start Guide - Transaction History Feature

## Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] MySQL 5.7+ running
- [ ] Alchemy API key obtained from https://www.alchemy.com/

## Setup Steps (5 minutes)

### 1. Environment Configuration
Update your `.env` file with these settings:

```env
# Database (Update with your credentials)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=nobicuan888
DATABASE_NAME=nobi_wallet_tracker

# Alchemy API (IMPORTANT: Add your key)
ALCHEMY_API_KEY=your_actual_alchemy_api_key_here
ALCHEMY_BASE_URL=https://api.g.alchemy.com/data/v1

# Transaction Sync (Can leave as-is)
TRANSACTION_SYNC_ENABLED=true
TRANSACTION_SYNC_INTERVAL=600000  # 10 minutes
MAX_TRANSACTIONS_PER_SYNC=1000
```

### 2. Start the Application
```bash
npm install
npm run start:dev
```

The application will automatically:
- Connect to MySQL
- Create all necessary tables (wallets, transaction_history, wallet_sync_status, etc.)
- Start the API server on http://localhost:3000
- Enable Swagger docs at http://localhost:3000/api/docs

### 3. Add Your First Wallet

**Option A: Using Swagger UI**
1. Open http://localhost:3000/api/docs
2. Find `POST /api/v1/wallets`
3. Click "Try it out"
4. Enter:
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "name": "Test Wallet",
  "networks": ["eth-mainnet"],
  "active": true
}
```
5. Click "Execute"

**Option B: Using cURL**
```bash
curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "name": "Test Wallet",
    "networks": ["eth-mainnet"],
    "active": true
  }'
```

### 4. Trigger Transaction Sync

**Full sync from genesis block:**
```bash
curl -X POST "http://localhost:3000/api/v1/transactions/sync/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?fullSync=true&network=eth-mainnet"
```

Response will look like:
```json
{
  "success": true,
  "message": "Successfully synced 234 new transactions",
  "synced": 234,
  "skipped": 0,
  "totalFetched": 234,
  "walletAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  "network": "eth-mainnet"
}
```

**Note:** First sync may take 30 seconds to several minutes depending on transaction count!

### 5. Query Transaction History

**Get recent transactions:**
```bash
curl "http://localhost:3000/api/v1/transactions/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?network=eth-mainnet&limit=10"
```

**Get incoming ERC20 transfers only:**
```bash
curl "http://localhost:3000/api/v1/transactions/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?category=erc20&direction=incoming"
```

**Get transactions in a date range:**
```bash
curl "http://localhost:3000/api/v1/transactions/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?startDate=2025-01-01&endDate=2025-11-12"
```

### 6. Check Sync Status
```bash
curl "http://localhost:3000/api/v1/transactions/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/sync-status"
```

Response:
```json
[
  {
    "id": "uuid",
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

### 7. Get Transaction Statistics
```bash
curl "http://localhost:3000/api/v1/transactions/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/stats"
```

Response:
```json
{
  "totalTransactions": 234,
  "incomingCount": 156,
  "outgoingCount": 78,
  "byCategory": {
    "external": 45,
    "erc20": 180,
    "erc721": 9
  },
  "oldestTransaction": "2020-05-10T08:15:00Z",
  "latestTransaction": "2025-11-12T09:45:00Z"
}
```

## Automatic Syncing

After initial setup, the system automatically:
- ✅ Syncs ALL active wallets every 10 minutes
- ✅ Only fetches NEW transactions (incremental sync)
- ✅ Tracks sync status per wallet-network
- ✅ Handles errors gracefully with retry

**Check logs to monitor automatic syncing:**
```bash
# The logs will show:
[TransactionSyncScheduler] Starting scheduled transaction sync...
[TransactionSyncScheduler] Found 1 wallet-network combinations to sync
[TransactionSyncScheduler] Syncing wallet 0x742d... on eth-mainnet...
[TransactionSyncScheduler] Synced 5 new transactions for 0x742d... on eth-mainnet
[TransactionSyncScheduler] Transaction sync completed in 2.35s: 1 successful, 0 failed, 5 new transactions
```

## Common Use Cases

### Monitor Multiple Wallets
```bash
# Add multiple wallets
curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Content-Type: application/json" \
  -d '{"address": "0xWallet1...", "networks": ["eth-mainnet", "polygon-mainnet"], "active": true}'

curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Content-Type: application/json" \
  -d '{"address": "0xWallet2...", "networks": ["eth-mainnet"], "active": true}'

# They will ALL sync automatically every 10 minutes!
```

### Track Multiple Networks
```bash
# Same wallet on multiple networks
curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "networks": ["eth-mainnet", "polygon-mainnet", "arbitrum-mainnet"],
    "active": true
  }'

# Sync all networks
curl -X POST "http://localhost:3000/api/v1/transactions/sync/0x742d...?fullSync=true&network=eth-mainnet"
curl -X POST "http://localhost:3000/api/v1/transactions/sync/0x742d...?fullSync=true&network=polygon-mainnet"
curl -X POST "http://localhost:3000/api/v1/transactions/sync/0x742d...?fullSync=true&network=arbitrum-mainnet"
```

### Find Large Transactions
```bash
# Get all transactions, then filter in your app by USD value
curl "http://localhost:3000/api/v1/transactions/0x742d.../stats"
```

### Export for Tax Purposes
```bash
# Get all transactions for a year
curl "http://localhost:3000/api/v1/transactions/0x742d...?startDate=2024-01-01&endDate=2024-12-31&limit=10000" > transactions_2024.json
```

## Troubleshooting

### Problem: Sync Takes Forever
**Solution:** First sync can be slow for wallets with many transactions. Check logs for progress. Consider syncing during off-peak hours.

### Problem: No Transactions Showing
**Check:**
1. Is wallet marked as `active: true`?
2. Did sync complete successfully? Check sync status endpoint
3. Are you querying the correct network?
4. Check application logs for errors

### Problem: "Alchemy API Error"
**Solutions:**
1. Verify API key in .env is correct
2. Check if you have sufficient Alchemy credits
3. Check rate limits on your Alchemy plan
4. Try again after a few minutes

### Problem: Database Connection Failed
**Solutions:**
1. Is MySQL running? Check with `mysql -u root -p`
2. Verify DATABASE_* credentials in .env
3. Does database exist? `CREATE DATABASE nobi_wallet_tracker;`
4. Check MySQL logs for errors

## Database Queries

### Check What's in Database
```sql
-- Connect to MySQL
mysql -u root -p nobi_wallet_tracker

-- See all wallets
SELECT * FROM wallets;

-- Count transactions per wallet
SELECT w.address, COUNT(th.id) as tx_count
FROM wallets w
LEFT JOIN transaction_history th ON w.id = th.walletId
GROUP BY w.id;

-- Check sync status
SELECT w.address, wss.network, wss.status, wss.transactionCount
FROM wallet_sync_status wss
JOIN wallets w ON wss.walletId = w.id;

-- Get latest transactions
SELECT hash, fromAddress, toAddress, asset, value, timestamp
FROM transaction_history
ORDER BY timestamp DESC
LIMIT 10;
```

## Performance Tips

1. **First Sync**: Do it manually during setup, don't wait for scheduled sync
2. **Multiple Networks**: Sync networks in parallel using separate API calls
3. **Large Result Sets**: Use pagination (limit/offset) for queries
4. **Disable Auto-Sync**: Set `autoSync: false` in wallet_sync_status for wallets you don't need to track actively

## Next Steps

Now that you have transaction history working:

1. ✅ Add more wallets
2. ✅ Explore different query filters
3. ✅ Monitor automatic syncing in logs
4. ✅ Set up whitelist tokens for balance tracking
5. ✅ Build dashboards/visualizations on top of the data
6. ✅ Export data for analysis

## Support Networks

All EVM chains supported by Alchemy:
- `eth-mainnet` - Ethereum Mainnet
- `eth-sepolia` - Ethereum Sepolia Testnet
- `polygon-mainnet` - Polygon Mainnet
- `polygon-amoy` - Polygon Amoy Testnet
- `arbitrum-mainnet` - Arbitrum One
- `arbitrum-sepolia` - Arbitrum Sepolia
- `optimism-mainnet` - Optimism Mainnet
- `optimism-sepolia` - Optimism Sepolia
- `base-mainnet` - Base Mainnet
- `base-sepolia` - Base Sepolia

## Resources

- 📖 Full Documentation: [TRANSACTION_HISTORY.md](./TRANSACTION_HISTORY.md)
- 📋 Implementation Details: [REWRITE_SUMMARY.md](./REWRITE_SUMMARY.md)
- 📚 API Docs (Swagger): http://localhost:3000/api/docs
- 🔗 Alchemy Docs: https://docs.alchemy.com/reference/transfers-api-quickstart

## Quick Reference Card

```bash
# Add wallet
POST /api/v1/wallets
{"address": "0x...", "networks": ["eth-mainnet"], "active": true}

# Sync transactions
POST /api/v1/transactions/sync/:address?fullSync=true&network=eth-mainnet

# Query transactions
GET /api/v1/transactions/:address?network=eth-mainnet&limit=100

# Check sync status
GET /api/v1/transactions/:address/sync-status

# Get statistics
GET /api/v1/transactions/:address/stats

# Common filters:
# - category: external|internal|erc20|erc721|erc1155
# - direction: incoming|outgoing
# - startDate/endDate: ISO 8601 format
# - startBlock/endBlock: decimal numbers
# - whitelistedOnly: true|false
```

---

**You're all set! 🎉** The transaction history feature is now fully operational.
