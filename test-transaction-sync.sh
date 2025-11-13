#!/bin/bash

WALLET="0x455e53cbb86018ac2b8092fdcd39d8444affc3f6"
NETWORK="eth-mainnet"

echo "🔄 Testing Transaction Sync for Wallet"
echo "========================================"
echo "Wallet: $WALLET"
echo "Network: $NETWORK"
echo ""

# Check if Alchemy API key is configured
if grep -q "your_alchemy_api_key_here" /root/nobi_wallet_tracker/.env; then
    echo "❌ ERROR: Alchemy API key not configured!"
    echo ""
    echo "Please update your .env file with a valid Alchemy API key:"
    echo "  nano /root/nobi_wallet_tracker/.env"
    echo ""
    echo "Then restart the application:"
    echo "  cd /root/nobi_wallet_tracker && docker-compose restart app"
    echo ""
    exit 1
fi

echo "✅ Alchemy API key is configured"
echo ""

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Docker services are not running!"
    echo "Start them with: ./docker-start.sh"
    exit 1
fi

echo "✅ Docker services are running"
echo ""

# Check sync status before
echo "📊 Current Sync Status:"
curl -s "http://localhost:3000/api/v1/transactions/$WALLET/sync-status?network=$NETWORK" | jq '.'
echo ""

# Trigger sync
echo "🚀 Starting transaction sync (this may take a few minutes)..."
echo ""

SYNC_RESULT=$(curl -s -X POST "http://localhost:3000/api/v1/transactions/sync/$WALLET?network=$NETWORK&fullSync=false")

echo "$SYNC_RESULT" | jq '.'
echo ""

# Check if sync was successful
if echo "$SYNC_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ Sync completed successfully!"
    
    SYNCED=$(echo "$SYNC_RESULT" | jq -r '.synced')
    SKIPPED=$(echo "$SYNC_RESULT" | jq -r '.skipped')
    TOTAL=$(echo "$SYNC_RESULT" | jq -r '.totalFetched')
    
    echo ""
    echo "📈 Sync Summary:"
    echo "   - New transactions synced: $SYNCED"
    echo "   - Skipped (duplicates): $SKIPPED"
    echo "   - Total fetched: $TOTAL"
    echo ""
    
    # Show recent transactions
    echo "📜 Recent Transactions (last 5):"
    curl -s "http://localhost:3000/api/v1/transactions/$WALLET?network=$NETWORK&limit=5" | jq '.transactions[] | {hash, category, direction, value, asset, timestamp}'
    
else
    echo "❌ Sync failed!"
    echo ""
    echo "Error details:"
    echo "$SYNC_RESULT" | jq '.'
    echo ""
    echo "Check application logs:"
    echo "  docker-compose logs --tail 50 app"
fi
