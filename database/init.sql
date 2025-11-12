-- Create database (run this in your MySQL client)
CREATE DATABASE IF NOT EXISTS nobi_wallet_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional, for better security)
-- CREATE USER 'nobi_user'@'localhost' IDENTIFIED BY 'your_secure_password';
-- GRANT ALL PRIVILEGES ON nobi_wallet_tracker.* TO 'nobi_user'@'localhost';
-- FLUSH PRIVILEGES;

USE nobi_wallet_tracker;

-- The tables will be created automatically by TypeORM synchronization
-- This file is for reference and manual database setup if needed

-- Manual table creation for transaction_history (reference only)
-- CREATE TABLE IF NOT EXISTS transaction_history (
--   id VARCHAR(36) PRIMARY KEY,
--   hash VARCHAR(66) NOT NULL,
--   fromAddress VARCHAR(42) NOT NULL,
--   toAddress VARCHAR(42) NOT NULL,
--   network VARCHAR(255) NOT NULL,
--   blockNum VARCHAR(20) NOT NULL,
--   blockNumDecimal BIGINT NOT NULL,
--   timestamp TIMESTAMP NOT NULL,
--   category ENUM('external', 'internal', 'erc20', 'erc721', 'erc1155') NOT NULL,
--   direction ENUM('incoming', 'outgoing') NOT NULL,
--   value DECIMAL(36, 18) NULL,
--   asset VARCHAR(10) NULL,
--   tokenAddress VARCHAR(42) NULL,
--   tokenId VARCHAR(255) NULL,
--   erc721TokenId JSON NULL,
--   erc1155Metadata JSON NULL,
--   rawContract JSON NULL,
--   usdValue DECIMAL(20, 8) NULL,
--   metadata TEXT NULL,
--   isWhitelisted BOOLEAN DEFAULT FALSE,
--   walletId VARCHAR(36) NOT NULL,
--   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   INDEX idx_wallet_network_timestamp (walletId, network, timestamp),
--   INDEX idx_hash_network (hash, network),
--   INDEX idx_block (blockNum, network),
--   INDEX idx_block_decimal (blockNumDecimal, network),
--   INDEX idx_from_address (fromAddress),
--   INDEX idx_to_address (toAddress),
--   INDEX idx_direction (direction),
--   INDEX idx_timestamp (timestamp),
--   UNIQUE KEY unique_hash_network_wallet (hash, network, walletId),
--   FOREIGN KEY (walletId) REFERENCES wallets(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Manual table creation for wallet_sync_status (reference only)
-- CREATE TABLE IF NOT EXISTS wallet_sync_status (
--   id VARCHAR(36) PRIMARY KEY,
--   walletId VARCHAR(36) NOT NULL,
--   network VARCHAR(255) NOT NULL,
--   status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
--   lastSyncedBlock VARCHAR(20) NULL,
--   lastSyncedBlockDecimal BIGINT NULL,
--   lastSyncedAt TIMESTAMP NULL,
--   lastAttemptAt TIMESTAMP NULL,
--   transactionCount INT DEFAULT 0,
--   lastError TEXT NULL,
--   errorCount INT DEFAULT 0,
--   autoSync BOOLEAN DEFAULT TRUE,
--   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   UNIQUE KEY unique_wallet_network (walletId, network),
--   INDEX idx_wallet (walletId),
--   INDEX idx_network (network),
--   FOREIGN KEY (walletId) REFERENCES wallets(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example queries for monitoring:

-- Check wallet count
-- SELECT COUNT(*) as total_wallets, 
--        SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_wallets 
-- FROM wallets;

-- Check balance count
-- SELECT COUNT(*) as total_balances,
--        SUM(CASE WHEN isWhitelisted = 1 THEN 1 ELSE 0 END) as whitelisted_balances,
--        SUM(CASE WHEN isDust = 1 THEN 1 ELSE 0 END) as dust_balances
-- FROM wallet_balances;

-- Get top wallets by USD value
-- SELECT w.address, w.name, SUM(wb.usdValue) as total_usd_value
-- FROM wallets w
-- JOIN wallet_balances wb ON w.id = wb.walletId
-- WHERE wb.usdValue IS NOT NULL AND wb.isDust = 0
-- GROUP BY w.id
-- ORDER BY total_usd_value DESC
-- LIMIT 10;

-- Check transaction counts per wallet
-- SELECT w.address, w.name, COUNT(th.id) as transaction_count
-- FROM wallets w
-- LEFT JOIN transaction_history th ON w.id = th.walletId
-- GROUP BY w.id
-- ORDER BY transaction_count DESC;

-- Check sync status
-- SELECT w.address, wss.network, wss.status, wss.transactionCount, wss.lastSyncedAt
-- FROM wallet_sync_status wss
-- JOIN wallets w ON wss.walletId = w.id
-- ORDER BY wss.lastSyncedAt DESC;

-- Get transaction summary by network
-- SELECT network, 
--        COUNT(*) as total_txs,
--        SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
--        SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing,
--        MIN(timestamp) as oldest_tx,
--        MAX(timestamp) as latest_tx
-- FROM transaction_history
-- GROUP BY network;