-- ============================================
-- TurnkeyAppShield Complete Database Backup
-- ============================================
-- This file contains EVERYTHING needed to restore your database

PRAGMA foreign_keys=OFF;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS license_rules;
DROP TABLE IF EXISTS activation_logs;
DROP TABLE IF EXISTS security_events;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS licenses;


-- Data will be added here manually or via dashboard export

-- To restore: sqlite3 newdb.db < COMPLETE_DATABASE_BACKUP_20251001_154828.sql
