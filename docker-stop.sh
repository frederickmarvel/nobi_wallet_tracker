#!/bin/bash

echo "🛑 Stopping Nobi Wallet Tracker..."
docker-compose down

echo ""
echo "✅ All services stopped!"
echo ""
echo "To remove volumes (database data), run:"
echo "   docker-compose down -v"
