#!/bin/bash

API_URL="http://localhost:3000/api/v1/wallets"

echo "Adding wallets..."
echo ""

# NOBI LABS LEDGER - Multi-chain
echo "Adding: NOBI LABS LEDGER..."
curl -s -X POST $API_URL -H "Content-Type: application/json" -d '{
  "address":"0x455e53cbb86018ac2b8092fdcd39d8444affc3f6",
  "name":"NOBI LABS LEDGER",
  "description":"Main Nobi Labs Ledger wallet across multiple EVM chains",
  "networks":["eth-mainnet","polygon-mainnet","arb-mainnet","bsc-mainnet","base-mainnet"],
  "active":true
}' | jq -r '.id // .message' && echo ""

# NOBI LABS LEDGER - MF USDT
echo "Adding: NOBI LABS LEDGER - MF USDT..."
curl -s -X POST $API_URL -H "Content-Type: application/json" -d '{
  "address":"0xE8c24Ce4c8D3FF7AB82Efd7A74752E7393ff57CB",
  "name":"NOBI LABS LEDGER - MF USDT",
  "description":"Nobi Labs Ledger - MF USDT",
  "networks":["eth-mainnet"],
  "active":true
}' | jq -r '.id // .message' && echo ""

# NOBI LABS LEDGER - MF ETH
echo "Adding: NOBI LABS LEDGER - MF ETH..."
curl -s -X POST $API_URL -H "Content-Type: application/json" -d '{
  "address":"0x432b5780e008822eCc430506766CCa53D496bafd",
  "name":"NOBI LABS LEDGER - MF ETH",
  "description":"Nobi Labs Ledger - MF ETH",
  "networks":["eth-mainnet"],
  "active":true
}' | jq -r '.id // .message' && echo ""

# NOBI LABS LEDGER - MF BTC
echo "Adding: NOBI LABS LEDGER - MF BTC..."
curl -s -X POST $API_URL -H "Content-Type: application/json" -d '{
  "address":"0xC38aCc4cD96B6Ae2A820910972eA66085D0BbC2A",
  "name":"NOBI LABS LEDGER - MF BTC",
  "description":"Nobi Labs Ledger - MF BTC",
  "networks":["eth-mainnet"],
  "active":true
}' | jq -r '.id // .message' && echo ""

# METAMASK MAC SEN
echo "Adding: METAMASK MAC SEN..."
curl -s -X POST $API_URL -H "Content-Type: application/json" -d '{
  "address":"0x2f5780dd1b6ad5fdae2076d639026a238a876044",
  "name":"METAMASK MAC SEN",
  "description":"MetaMask Mac Sen wallet",
  "networks":["eth-mainnet","polygon-mainnet"],
  "active":true
}' | jq -r '.id // .message' && echo ""

# SAFE EXPENSE
echo "Adding: SAFE EXPENSE..."
curl -s -X POST $API_URL -H "Content-Type: application/json" -d '{
  "address":"0x698364F6a2032A47ed5b952b36280d4C0FF97A91",
  "name":"SAFE EXPENSE",
  "description":"Safe Expense wallet on Base",
  "networks":["base-mainnet"],
  "active":true
}' | jq -r '.id // .message' && echo ""

echo "✅ Wallet addition completed!"
echo ""

# List all wallets
echo "Fetching all wallets..."
curl -s -X GET $API_URL | jq -r '.[] | "\(.name) (\(.address)) - Networks: \(.networks | join(", "))"'
