-- Create database (run this in your MySQL client)
CREATE DATABASE IF NOT EXISTS omega_nobi_wallet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional, for better security)
-- CREATE USER 'nobi_user'@'localhost' IDENTIFIED BY 'your_secure_password';
-- GRANT ALL PRIVILEGES ON omega_nobi_wallet.* TO 'nobi_user'@'localhost';
-- FLUSH PRIVILEGES;

USE omega_nobi_wallet;

-- The tables will be created automatically by TypeORM synchronization
-- This file is for reference and manual database setup if needed

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