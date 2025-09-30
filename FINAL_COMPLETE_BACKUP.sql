-- ============================================
-- TurnkeyAppShield Complete Database Backup
-- ============================================
-- Created: $(date)
-- Database: turnkey-app-shield-production

PRAGMA foreign_keys=OFF;

-- Complete table creation scripts will be added here
-- Run these commands in Cloudflare D1 Console to get the schemas:

-- 1. Get table schemas:
-- SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' AND name != 'sqlite_sequence' AND sql IS NOT NULL;

-- 2. Get your data:
-- SELECT * FROM customers;
-- SELECT * FROM products;
-- SELECT * FROM license_rules;
-- SELECT * FROM activation_logs;
-- SELECT * FROM security_events;
-- SELECT * FROM admin_users;
-- SELECT * FROM licenses;

-- Copy the results from above commands and add them to this file
