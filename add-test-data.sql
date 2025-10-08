-- Add 5 more products
INSERT OR REPLACE INTO products (id, name, version, description, download_url, price, currency, category, status, rule_id, created_at, updated_at) VALUES
(2, 'Business Suite Pro', '3.2.1', 'Advanced business management software with CRM and analytics', 'https://example.com/downloads/business-suite-pro.exe', 299.99, 'USD', 'Business Software', 'active', 1, datetime('now'), datetime('now')),
(3, 'Security Shield Enterprise', '2.5.0', 'Comprehensive cybersecurity solution for enterprises', 'https://example.com/downloads/security-shield.exe', 199.99, 'USD', 'Security Software', 'active', 1, datetime('now'), datetime('now')),
(4, 'Data Analytics Pro', '4.1.2', 'Professional data analysis and visualization tool', 'https://example.com/downloads/data-analytics.exe', 149.99, 'USD', 'Analytics Software', 'active', 1, datetime('now'), datetime('now')),
(5, 'Cloud Backup Manager', '1.8.3', 'Automated cloud backup and restore solution', 'https://example.com/downloads/cloud-backup.exe', 89.99, 'USD', 'Utility Software', 'active', 1, datetime('now'), datetime('now')),
(6, 'Project Management Studio', '2.0.5', 'Complete project management and collaboration platform', 'https://example.com/downloads/project-mgmt.exe', 249.99, 'USD', 'Productivity Software', 'active', 1, datetime('now'), datetime('now'));

-- Add 18 customers spread across products
INSERT OR REPLACE INTO customers (id, name, email, product_id, license_key, license_type, status, registration_date, expires_at, notes) VALUES
-- Product 1 (TurnkeyApp Pro) - 3 customers
(4, 'Sarah Johnson', 'sarah.johnson@techcorp.com', 1, 'TKAP-SJOH-2024-001', 'standard', 'active', datetime('now', '-15 days'), datetime('now', '+350 days'), 'Premium corporate client'),
(5, 'Michael Chen', 'michael.chen@startup.io', 1, 'TKAP-MCHE-2024-002', 'trial', 'active', datetime('now', '-8 days'), datetime('now', '+22 days'), 'Trial user - startup company'),
(6, 'Lisa Rodriguez', 'lisa.rodriguez@freelance.net', 1, 'TKAP-LROD-2024-003', 'standard', 'suspended', datetime('now', '-45 days'), datetime('now', '+320 days'), 'Payment issue resolved'),

-- Product 2 (Business Suite Pro) - 4 customers  
(7, 'David Thompson', 'david.thompson@enterprise.com', 2, 'BSPR-DTHO-2024-004', 'premium', 'active', datetime('now', '-22 days'), datetime('now', '+343 days'), 'Enterprise license'),
(8, 'Jennifer Wong', 'jennifer.wong@consulting.biz', 2, 'BSPR-JWON-2024-005', 'standard', 'active', datetime('now', '-12 days'), datetime('now', '+353 days'), 'Consulting firm license'),
(9, 'Robert Martinez', 'robert.martinez@company.org', 2, 'BSPR-RMAR-2024-006', 'standard', 'revoked', datetime('now', '-60 days'), datetime('now', '+305 days'), 'License violation'),
(10, 'Amanda Davis', 'amanda.davis@agency.co', 2, 'BSPR-ADAV-2024-007', 'trial', 'active', datetime('now', '-3 days'), datetime('now', '+27 days'), 'Marketing agency trial'),

-- Product 3 (Security Shield Enterprise) - 3 customers
(11, 'Christopher Lee', 'christopher.lee@cybersec.net', 3, 'SSEN-CLEE-2024-008', 'enterprise', 'active', datetime('now', '-30 days'), datetime('now', '+335 days'), 'Cybersecurity firm'),
(12, 'Maria Garcia', 'maria.garcia@bank.com', 3, 'SSEN-MGAR-2024-009', 'premium', 'active', datetime('now', '-18 days'), datetime('now', '+347 days'), 'Banking sector client'),
(13, 'Kevin Brown', 'kevin.brown@gov.org', 3, 'SSEN-KBRO-2024-010', 'standard', 'suspended', datetime('now', '-55 days'), datetime('now', '+310 days'), 'Government license'),

-- Product 4 (Data Analytics Pro) - 3 customers
(14, 'Nicole Taylor', 'nicole.taylor@research.edu', 4, 'DAPR-NTAY-2024-011', 'premium', 'active', datetime('now', '-25 days'), datetime('now', '+340 days'), 'Research institution'),
(15, 'James Wilson', 'james.wilson@analytics.io', 4, 'DAPR-JWIL-2024-012', 'standard', 'active', datetime('now', '-10 days'), datetime('now', '+355 days'), 'Analytics consultant'),
(16, 'Rachel Green', 'rachel.green@datalab.com', 4, 'DAPR-RGRE-2024-013', 'trial', 'revoked', datetime('now', '-40 days'), datetime('now', '+325 days'), 'Trial expired'),

-- Product 5 (Cloud Backup Manager) - 2 customers  
(17, 'Daniel Kim', 'daniel.kim@cloudtech.net', 5, 'CBMG-DKIM-2024-014', 'standard', 'active', datetime('now', '-14 days'), datetime('now', '+351 days'), 'Cloud service provider'),
(18, 'Stephanie White', 'stephanie.white@backup.pro', 5, 'CBMG-SWHI-2024-015', 'premium', 'suspended', datetime('now', '-35 days'), datetime('now', '+330 days'), 'Service upgrade pending'),

-- Product 6 (Project Management Studio) - 3 customers
(19, 'Thomas Anderson', 'thomas.anderson@matrix.corp', 6, 'PMST-TAND-2024-016', 'enterprise', 'active', datetime('now', '-20 days'), datetime('now', '+345 days'), 'Large corporation'),
(20, 'Emily Johnson', 'emily.johnson@agile.team', 6, 'PMST-EJOH-2024-017', 'standard', 'active', datetime('now', '-7 days'), datetime('now', '+358 days'), 'Agile development team'),
(21, 'Alexander Smith', 'alexander.smith@project.hub', 6, 'PMST-ASMI-2024-018', 'trial', 'revoked', datetime('now', '-50 days'), datetime('now', '+315 days'), 'Trial user - no conversion');