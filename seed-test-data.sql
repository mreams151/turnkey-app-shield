-- Seed test data for TurnkeyAppShield admin panel
-- This file creates sample customers, products, rules, and licenses for testing

-- Insert test rule templates
INSERT INTO license_rules (name, max_concurrent_sessions, max_devices, offline_validation_days, license_duration_days, allowed_countries, is_active) VALUES
('Standard License', 2, 3, 7, 365, '["US", "CA", "GB", "AU"]', 1),
('Premium License', 5, 10, 30, 365, '[]', 1),
('Enterprise License', 20, 50, 90, 730, '[]', 1),
('Trial License', 1, 1, 1, 30, '["US", "CA", "GB"]', 1),
('Geographic Restricted', 3, 5, 14, 365, '["US", "CA"]', 1);

-- Insert test products
INSERT INTO products (name, version, description, download_url, price, currency, category, status) VALUES
('Professional Suite', '2.1.0', 'Advanced business automation software with premium features', 'https://example.com/downloads/pro-suite-v2.1.exe', 199.99, 'USD', 'Business Software', 'active'),
('Security Guard Enterprise', '1.5.2', 'Enterprise-grade security and monitoring solution', 'https://example.com/downloads/security-guard.exe', 499.99, 'USD', 'Security Software', 'active'),
('Development Tools Pro', '3.0.1', 'Professional development toolkit for software developers', 'https://example.com/downloads/dev-tools.exe', 299.99, 'USD', 'Development Tools', 'active'),
('Analytics Dashboard', '1.2.0', 'Real-time analytics and reporting dashboard', 'https://example.com/downloads/analytics.exe', 149.99, 'USD', 'Analytics Software', 'active');

-- Insert test customers with licenses
INSERT INTO customers (name, email, product_id, license_key, license_type, status, registration_date, expires_at) VALUES
('Alice Johnson', 'alice@example.com', 1, 'ABCD-EFGH-IJKL-MNOP', 'premium', 'active', '2024-01-15 10:30:00', '2025-01-15 10:30:00'),
('Bob Smith', 'bob@techcorp.com', 2, 'QRST-UVWX-YZAB-CDEF', 'enterprise', 'active', '2024-02-20 14:45:00', '2025-02-20 14:45:00'), 
('Carol Davis', 'carol@startup.io', 1, 'GHIJ-KLMN-OPQR-STUV', 'standard', 'active', '2024-03-10 09:15:00', '2025-03-10 09:15:00'),
('David Wilson', 'david@consulting.net', 3, 'WXYZ-1234-5678-9ABC', 'premium', 'active', '2024-03-25 16:20:00', '2025-03-25 16:20:00'),
('Eva Martinez', 'eva@designstudio.com', 4, 'DEFG-HIJK-LMNO-PQRS', 'standard', 'suspended', '2024-01-05 11:00:00', '2025-01-05 11:00:00'),
('Frank Thompson', 'frank@enterprise.org', 2, 'TUVW-XYZA-BCDE-FGHI', 'enterprise', 'active', '2024-04-01 08:30:00', '2026-04-01 08:30:00');

-- Insert some activation logs for testing dashboard
INSERT INTO activation_logs (customer_id, product_id, license_key, device_fingerprint, device_name, operating_system, ip_address, country_code, file_name, file_version, status, activation_time) VALUES
(1, 1, 'ABCD-EFGH-IJKL-MNOP', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', 'ALICE-PC', 'Windows 11 Pro', '192.168.1.100', 'US', 'ProSuite.exe', '2.1.0', 'valid', '2024-09-27 10:15:00'),
(2, 2, 'QRST-UVWX-YZAB-CDEF', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567', 'BOB-WORKSTATION', 'Windows 11 Enterprise', '10.0.1.50', 'CA', 'SecurityGuard.exe', '1.5.2', 'valid', '2024-09-27 09:30:00'),
(3, 1, 'GHIJ-KLMN-OPQR-STUV', 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678', 'CAROL-LAPTOP', 'Windows 10 Pro', '203.0.113.15', 'GB', 'ProSuite.exe', '2.1.0', 'valid', '2024-09-27 11:45:00'),
(4, 3, 'WXYZ-1234-5678-9ABC', 'd4e5f6789012345678901234567890abcdef1234567890abcdef123456789', 'DAVID-DEV', 'Windows 11 Pro', '198.51.100.25', 'AU', 'DevTools.exe', '3.0.1', 'valid', '2024-09-27 08:20:00'),
(6, 2, 'TUVW-XYZA-BCDE-FGHI', 'f6789012345678901234567890abcdef1234567890abcdef12345678901234', 'FRANK-SERVER', 'Windows Server 2022', '172.16.0.100', 'US', 'SecurityGuard.exe', '1.5.2', 'valid', '2024-09-27 07:00:00');

-- Insert some security events for testing
INSERT INTO security_events (event_type, severity, customer_id, product_id, ip_address, description, created_at) VALUES
('failed_login', 'medium', 1, 1, '192.168.1.100', 'Multiple failed login attempts detected', '2024-09-27 12:00:00'),
('suspicious_activation', 'high', 2, 2, '10.0.1.50', 'Activation from new device without proper verification', '2024-09-26 15:30:00'),
('license_key_sharing', 'high', 3, 1, '203.0.113.15', 'Same license key used from multiple IP addresses', '2024-09-25 14:20:00'),
('vm_detection', 'medium', 4, 3, '198.51.100.25', 'Virtual machine detected during license validation', '2024-09-24 16:45:00');

-- Insert email templates for testing
INSERT INTO email_templates (name, template_type, subject, html_body, text_body, is_active) VALUES
('Welcome Email', 'welcome', 'Welcome to TurnkeyAppShield', 
 '<h1>Welcome {{customer_name}}!</h1><p>Your license key: {{license_key}}</p>', 
 'Welcome {{customer_name}}! Your license key: {{license_key}}', 1),
('License Expiry Warning', 'expiry_warning', 'License Expiring Soon', 
 '<h2>License Expiry Notice</h2><p>Your license expires on {{expiry_date}}</p>', 
 'License Expiry Notice - Your license expires on {{expiry_date}}', 1),
('Security Alert', 'security_alert', 'Security Alert for Your Account', 
 '<h2>Security Alert</h2><p>Suspicious activity detected: {{event_description}}</p>', 
 'Security Alert - Suspicious activity detected: {{event_description}}', 1);

-- Insert system settings for testing
INSERT INTO system_settings (category, key, value, value_type, description) VALUES
('security', 'max_login_attempts', '5', 'number', 'Maximum login attempts before account lockout'),
('security', 'lockout_duration_minutes', '30', 'number', 'Account lockout duration in minutes'),
('email', 'smtp_server', 'smtp.example.com', 'string', 'SMTP server hostname'),
('email', 'smtp_port', '587', 'number', 'SMTP server port'),
('api', 'rate_limit_per_hour', '100', 'number', 'API rate limit per hour per IP'),
('ui', 'dashboard_refresh_interval', '30', 'number', 'Dashboard auto-refresh interval in seconds');