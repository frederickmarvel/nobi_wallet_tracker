#!/bin/bash

echo "🔄 Fresh Start - Nobi Wallet Tracker"
echo "====================================="
echo ""

# Stop and remove everything
echo "🛑 Stopping and removing containers..."
docker-compose down -v

# Start services
echo "🚀 Starting fresh services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Services failed to start!"
    docker-compose logs --tail 50
    exit 1
fi

echo "✅ Services are running!"
echo ""

# Add wallets
echo "👛 Adding wallets..."
bash ./scripts/add-wallets.sh

echo ""
echo "✅ Fresh start completed!"
echo ""
echo "📊 To sync transactions for a wallet:"
echo "   curl -X POST 'http://localhost:3000/api/v1/transactions/sync/0x455e53cbb86018ac2b8092fdcd39d8444affc3f6?network=eth-mainnet&fromBlock=0x989680'"
echo ""
echo "📝 To check sync status:"
echo "   curl 'http://localhost:3000/api/v1/transactions/0x455e53cbb86018ac2b8092fdcd39d8444affc3f6/sync-status?network=eth-mainnet' | jq '.'"
echo ""
