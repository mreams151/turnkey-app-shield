-- Import Production Data to Local Development Database
-- This script populates the local database with the exact data from production

-- Insert admin user (with the exact password hash and 2FA setup)
INSERT OR REPLACE INTO admin_users (
  id, username, email, full_name, password_hash, salt, 
  two_factor_secret, role, permissions, last_login, login_attempts, 
  locked_until, password_changed_at, is_active, created_at, updated_at, 
  totp_secret, two_fa_enabled, backup_codes
) VALUES (
  1, 'admin', 'admin@turnkey.local', 'System Administrator',
  'vzZXy4CEA86g1alCuMevEMXmv70sdJznFPrdngcywbboUHRi3YY5m/VxHyM2rN8u',
  'bcrypt_managed', NULL, 'super_admin', NULL, '2025-10-08 21:29:22', 0,
  NULL, '2025-09-24 01:35:58', 1, '2025-09-24 01:35:58', '2025-10-08 21:29:22',
  'I5VZTXDUCGUQ5LGM3MNCXOZQFWAOLEAN', 1,
  '["ba0671542231173524f1d93b83cd76f612d3fda4e054311acc89a46359c49828","eda2c0f1ec8a99e02b60fd208a77f0556a5cfaafffd9d21f5f3801692f0e1c40","5147aa0e06c9ea00934f08e21c60806cbd98471f3bacf1b3ce2fa4c2781e04bf","59e33c6fb5cfd95d773384a11704c3c078c2f34ae775a60dc43fe7473e5f3eb7","78782c3399ec9650253525f712a1a8ef0411c9c414865072965956ccc677af64","eaa9ec6798e820ce2da2cc5bad788110dbe51cbe75b7c82844fea88300bce0e2","4b6ba0156c6d7971fcf17433d6a58273b7230727ed438e375392ca34c35c9f42","72897f641b517445d9d30204f192a591ccf90822bccabc7a95167cf18d959b68"]'
);

-- Insert products
INSERT OR REPLACE INTO products (id, name, version, description, download_url, price, currency, category, status, client_name, created_at, updated_at) VALUES
(1, 'Test', '1', 'Test script', 'https://example.com/download/test', 0, 'USD', NULL, 'active', 'Main Admin', '2025-09-24 04:08:27', '2025-09-24 04:08:27'),
(2, 'test', '1', 'test', 'https://example.com/download/test', 0, 'USD', NULL, 'active', 'Main Admin', '2025-09-24 04:08:41', '2025-09-24 04:08:41'),
(3, 'Professional Suite', '2.1.0', 'Advanced business automation software with premium features', 'https://example.com/downloads/pro-suite-v2.1.exe', 199.99, 'USD', 'Business Software', 'active', 'Main Admin', '2025-09-28 02:34:56', '2025-09-28 02:34:56'),
(4, 'Security Guard Enterprise', '1.5.2', 'Enterprise-grade security and monitoring solution', 'https://example.com/downloads/security-guard.exe', 499.99, 'USD', 'Security Software', 'active', 'Main Admin', '2025-09-28 02:34:56', '2025-09-28 02:34:56'),
(7, 'Professional Suite', '2.1.0', 'Advanced business automation software', 'https://example.com/downloads/pro-suite.exe', 199.99, 'USD', 'Business Software', 'active', 'Main Admin', '2025-09-28 06:53:37', '2025-09-28 06:53:37');

-- Insert customers
INSERT OR REPLACE INTO customers (id, email, name, license_key, product_id, hardware_fingerprint, activation_date, expiry_date, status, created_at) VALUES
(1, 'alice@example.com', 'Alice Johnson', 'ABCD-EFGH-IJKL-MNOP', 1, NULL, NULL, '2025-01-15 10:30:00', 'active', '2024-01-15 10:30:00'),
(2, 'bob@techcorp.com', 'Bob Smith', 'QRST-UVWX-YZAB-CDEF', 2, NULL, NULL, '2025-02-20 14:45:00', 'active', '2024-02-20 14:45:00'),
(3, 'carol@startup.io', 'Carol Davis', 'GHIJ-KLMN-OPQR-STUV', 1, NULL, NULL, '2025-03-10 09:15:00', 'active', '2024-03-10 09:15:00'),
(4, 'david@consulting.net', 'David Wilson', 'WXYZ-1234-5678-9ABC', 3, NULL, NULL, '2025-03-25 16:20:00', 'active', '2024-03-25 16:20:00'),
(5, 'eva@designstudio.com', 'Eva Martinez', 'DEFG-HIJK-LMNO-PQRS', 4, NULL, NULL, '2025-01-05 11:00:00', 'suspended', '2024-01-05 11:00:00'),
(6, 'frank@enterprise.org', 'Frank Thompson', 'TUVW-XYZA-BCDE-FGHI', 2, NULL, NULL, '2026-04-01 08:30:00', 'revoked', '2024-04-01 08:30:00'),
(7, 'demo@example.com', 'Demo Customer', 'DEMO-1234-5678-9ABC', 1, NULL, NULL, '2026-09-28 06:53:37', 'active', '2025-09-28 06:53:37');

-- Insert license rules
INSERT OR REPLACE INTO license_rules (id, name, description, max_activations, max_concurrent_sessions, max_days, grace_period_days, max_devices, max_ips, allow_vm, allowed_countries, blocked_countries, timezone_restrictions, allow_offline_days, require_periodic_validation, validation_interval_hours, is_active, created_at, updated_at) VALUES
(1, 'Standard License', 'Basic license for individual users with standard features', 0, 2, 365, 7, 3, 0, 0, '["US", "CA", "GB", "AU"]', NULL, NULL, 7, 1, 24, 1, '2025-09-28 02:34:56', '2025-09-28 02:34:56'),
(2, 'Premium License', 'Enhanced license with premium features and extended support', 0, 5, 365, 7, 10, 0, 0, '[]', NULL, NULL, 30, 1, 24, 1, '2025-09-28 02:34:56', '2025-09-28 02:34:56'),
(3, 'Enterprise License', 'Full-featured license for enterprise customers', 0, 20, 730, 7, 50, 0, 0, '[]', NULL, NULL, 90, 1, 24, 1, '2025-09-28 02:34:56', '2025-09-28 02:34:56'),
(4, 'Trial License', 'Limited trial license for evaluation purposes', 0, 1, 30, 7, 1, 0, 0, '["US", "CA", "GB"]', NULL, NULL, 1, 1, 24, 1, '2025-09-28 02:34:56', '2025-09-28 02:34:56'),
(5, 'Geographic Restricted', 'License restricted to specific geographic regions', 0, 3, 365, 7, 5, 0, 0, '["US", "CA"]', NULL, NULL, 14, 1, 24, 1, '2025-09-28 02:34:56', '2025-09-28 02:34:56');