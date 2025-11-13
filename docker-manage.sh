#!/bin/bash

echo "📊 Nobi Wallet Tracker - Quick Actions"
echo "======================================"
echo ""

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Services are not running. Start them with: ./docker-start.sh"
    exit 1
fi

echo "✅ Services are running"
echo ""

PS3="Select an action: "
options=("Track All Wallets" "Generate Balance Report" "View Latest Report (JSON)" "View Latest Report (CSV)" "List All Reports" "View Wallets" "Add Wallet" "View Logs" "Quit")

select opt in "${options[@]}"
do
    case $opt in
        "Track All Wallets")
            echo ""
            echo "🔄 Tracking all wallets..."
            curl -X POST http://localhost:3000/api/v1/tracker/track-all
            echo ""
            echo ""
            ;;
        "Generate Balance Report")
            echo ""
            echo "📝 Generating balance report..."
            curl -X POST http://localhost:3000/api/v1/tracker/reports/generate
            echo ""
            echo ""
            ;;
        "View Latest Report (JSON)")
            echo ""
            curl -s http://localhost:3000/api/v1/tracker/reports/latest | jq '.'
            echo ""
            ;;
        "View Latest Report (CSV)")
            echo ""
            curl -s "http://localhost:3000/api/v1/tracker/reports/latest?format=csv"
            echo ""
            ;;
        "List All Reports")
            echo ""
            curl -s http://localhost:3000/api/v1/tracker/reports/list | jq '.'
            echo ""
            ;;
        "View Wallets")
            echo ""
            curl -s http://localhost:3000/api/v1/wallets | jq '.[] | {name, address, networks}'
            echo ""
            ;;
        "Add Wallet")
            echo ""
            read -p "Enter wallet address: " address
            read -p "Enter wallet name: " name
            read -p "Enter networks (comma-separated, e.g., eth-mainnet,polygon-mainnet): " networks
            
            # Convert comma-separated to JSON array
            network_array=$(echo $networks | sed 's/,/","/g' | sed 's/^/["/' | sed 's/$/"]/')
            
            curl -X POST http://localhost:3000/api/v1/wallets \
                -H "Content-Type: application/json" \
                -d "{\"address\":\"$address\",\"name\":\"$name\",\"networks\":$network_array}"
            echo ""
            echo ""
            ;;
        "View Logs")
            echo ""
            docker-compose logs --tail 50 app
            echo ""
            ;;
        "Quit")
            echo "👋 Goodbye!"
            break
            ;;
        *) echo "Invalid option $REPLY";;
    esac
done
