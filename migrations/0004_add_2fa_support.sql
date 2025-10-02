-- Add 2FA support to admin_users table
-- Two-Factor Authentication with TOTP (Time-based One-Time Password)

-- Add 2FA columns to admin_users table
ALTER TABLE admin_users ADD COLUMN totp_secret TEXT;
ALTER TABLE admin_users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN backup_codes TEXT; -- JSON array of backup codes

-- Add maintenance mode setting to system_settings if not exists
INSERT OR IGNORE INTO system_settings (category, key, value, description)
VALUES ('maintenance', 'maintenance_mode', 'false', 'Enable/disable maintenance mode to block API access');

-- Add 2FA related system settings
INSERT OR IGNORE INTO system_settings (category, key, value, description)
VALUES 
  ('security', 'require_2fa_for_admins', 'false', 'Require 2FA for all admin accounts'),
  ('security', '2fa_issuer_name', 'TurnkeyAppShield', 'Issuer name shown in authenticator apps'),
  ('security', 'session_timeout_minutes', '30', 'Admin session timeout in minutes');

-- Create index for faster 2FA lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_2fa ON admin_users(username, two_fa_enabled);

-- Create a backup codes table for better management (optional, can use JSON in admin_users)
CREATE TABLE IF NOT EXISTS admin_backup_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL,
    code_hash TEXT NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON admin_backup_codes(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_hash ON admin_backup_codes(code_hash);