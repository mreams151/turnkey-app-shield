-- Migration: Add Admin Infrastructure Tables (Backups and Logs)
-- Created: 2025-10-02
-- Purpose: Add missing database_backups and admin_logs tables for admin panel functionality

-- Create database_backups table for backup management
CREATE TABLE IF NOT EXISTS database_backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_name TEXT NOT NULL,
    backup_data TEXT NOT NULL, -- JSON string of backup data
    original_size INTEGER DEFAULT 0,
    file_size INTEGER DEFAULT 0,
    table_count INTEGER DEFAULT 0,
    tables_included TEXT, -- JSON array of table names
    record_counts TEXT, -- JSON object with table: count mapping
    backup_hash TEXT, -- SHA-256 hash for integrity
    description TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Create admin_logs table for action logging
CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT, -- 'customer', 'product', 'license', etc.
    entity_id INTEGER,
    details TEXT, -- JSON string with action details
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_database_backups_created_by ON database_backups(created_by);
CREATE INDEX IF NOT EXISTS idx_database_backups_created_at ON database_backups(created_at);
CREATE INDEX IF NOT EXISTS idx_database_backups_status ON database_backups(status);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_username ON admin_logs(admin_username);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_entity ON admin_logs(entity_type, entity_id);

-- Insert initial test data for admin logs (optional)
INSERT OR IGNORE INTO admin_logs (admin_username, action, entity_type, details, success, created_at) VALUES
('admin', 'login', 'system', '{"message": "Admin login successful"}', TRUE, datetime('now', '-1 day')),
('admin', 'create_product', 'product', '{"product_name": "Test Product"}', TRUE, datetime('now', '-2 hours')),
('admin', 'backup_create', 'system', '{"backup_name": "Initial Backup"}', TRUE, datetime('now', '-1 hour'));