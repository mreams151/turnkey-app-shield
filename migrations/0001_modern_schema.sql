-- Turnkey Software Shield v2.0 - Modern Database Schema
-- Enhanced schema with advanced features and security

-- License Rules: Flexible rule engine for different license types
CREATE TABLE IF NOT EXISTS license_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Activation Limits
  max_activations INTEGER DEFAULT 0, -- 0 = unlimited
  max_concurrent_sessions INTEGER DEFAULT 1,
  
  -- Time Limits  
  max_days INTEGER DEFAULT 0, -- 0 = unlimited (from first activation)
  grace_period_days INTEGER DEFAULT 7,
  
  -- Hardware Limits
  max_devices INTEGER DEFAULT 1, -- MAC address limit
  max_ips INTEGER DEFAULT 0, -- 0 = unlimited
  allow_vm BOOLEAN DEFAULT FALSE, -- Allow virtual machines
  
  -- Geographic Restrictions
  allowed_countries TEXT, -- JSON array: ["US", "CA", "GB"]
  blocked_countries TEXT, -- JSON array: ["CN", "RU"]
  timezone_restrictions TEXT, -- JSON: {"start": "09:00", "end": "17:00"}
  
  -- Feature Flags
  allow_offline_days INTEGER DEFAULT 3, -- Days offline before re-validation required
  require_periodic_validation BOOLEAN DEFAULT TRUE,
  validation_interval_hours INTEGER DEFAULT 24,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products: Software products available for protection
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  description TEXT,
  
  -- File Management
  download_url TEXT NOT NULL,
  file_size INTEGER, -- In bytes
  file_hash TEXT, -- SHA-256 hash for integrity
  
  -- Protection Settings
  rule_id INTEGER,
  protection_level TEXT DEFAULT 'standard', -- standard, advanced, premium
  
  -- Landing Pages
  landing_page_token TEXT UNIQUE, -- For encrypted URLs
  landing_page_template TEXT DEFAULT 'default',
  custom_branding TEXT, -- JSON for custom styling
  
  -- Update Management
  update_policy TEXT DEFAULT 'optional', -- optional, recommended, forced
  minimum_version TEXT, -- Oldest allowed version
  changelog TEXT,
  update_notification_message TEXT,
  
  -- Business Settings
  price DECIMAL(10,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  category TEXT,
  tags TEXT, -- JSON array for categorization
  
  -- Status and Metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
  client_name TEXT DEFAULT 'Main Admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (rule_id) REFERENCES license_rules(id)
);

-- Customers: Licensed users of protected software
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Identity
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  customer_id TEXT UNIQUE, -- External customer ID if needed
  
  -- License Information
  product_id INTEGER NOT NULL,
  license_key TEXT NOT NULL UNIQUE,
  license_type TEXT DEFAULT 'standard', -- trial, standard, premium, enterprise
  
  -- Hardware Fingerprinting (Enhanced)
  primary_device_id TEXT, -- Primary hardware fingerprint
  registered_devices TEXT, -- JSON array of all registered devices
  device_names TEXT, -- JSON array of friendly device names
  
  -- Network Information
  registration_ip TEXT,
  last_seen_ip TEXT,
  ip_history TEXT, -- JSON array of recent IPs
  
  -- Usage Tracking
  first_activation_date DATETIME,
  last_activation_date DATETIME,
  total_activations INTEGER DEFAULT 0,
  total_usage_hours INTEGER DEFAULT 0,
  
  -- License Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
  suspension_reason TEXT,
  expires_at DATETIME,
  
  -- Metadata
  registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT, -- Admin notes
  tags TEXT, -- JSON array for customer segmentation
  
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Activation Logs: Detailed logging of all software usage
CREATE TABLE IF NOT EXISTS activation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- References
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  license_key TEXT NOT NULL,
  
  -- Device Information (Enhanced)
  device_fingerprint TEXT NOT NULL, -- Complete hardware fingerprint
  device_name TEXT, -- Computer name or friendly name
  operating_system TEXT, -- Windows version, architecture
  cpu_info TEXT, -- CPU model and specs
  memory_info TEXT, -- RAM information
  
  -- Network Information
  ip_address TEXT NOT NULL,
  country_code TEXT, -- Detected country
  city TEXT, -- Detected city
  isp TEXT, -- Internet service provider
  is_vpn BOOLEAN DEFAULT FALSE, -- VPN detection
  
  -- Session Information
  session_id TEXT, -- Unique session identifier
  session_duration INTEGER DEFAULT 0, -- Minutes
  file_name TEXT NOT NULL, -- Protected executable name
  file_version TEXT, -- Version of protected software
  
  -- Validation Results
  status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'expired', 'blocked', 'suspended')),
  validation_method TEXT DEFAULT 'standard', -- standard, offline_cache, emergency
  rule_violations TEXT, -- JSON array of any rule violations
  
  -- Security Flags
  is_suspicious BOOLEAN DEFAULT FALSE,
  risk_score INTEGER DEFAULT 0, -- 0-100 risk assessment
  security_flags TEXT, -- JSON array of security concerns
  
  -- Timestamps
  activation_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT, -- If web-based activation
  
  -- Error Information
  error_code TEXT,
  error_message TEXT,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Email Templates: Modern email system with automation
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Template Identity
  name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- welcome, license_key, update, security_alert, etc.
  product_id INTEGER, -- NULL for global templates
  
  -- Email Content
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  
  -- Template Features
  variables TEXT, -- JSON array of available variables
  conditional_logic TEXT, -- JSON for advanced templating
  
  -- Automation Settings
  trigger_events TEXT, -- JSON array: ["registration", "first_activation", etc.]
  send_delay_minutes INTEGER DEFAULT 0,
  is_automated BOOLEAN DEFAULT FALSE,
  
  -- A/B Testing
  variant_name TEXT DEFAULT 'default',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- System Settings: Configuration and feature flags
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL, -- security, email, ui, api, etc.
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  value_type TEXT DEFAULT 'string', -- string, number, boolean, json
  description TEXT,
  is_sensitive BOOLEAN DEFAULT FALSE, -- Encrypt sensitive values
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Users: System administrators with role-based access
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Identity
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  
  -- Authentication
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  two_factor_secret TEXT, -- For 2FA
  
  -- Authorization
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'viewer')),
  permissions TEXT, -- JSON array of specific permissions
  
  -- Security
  last_login DATETIME,
  login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Activity
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Security Events: Advanced security monitoring
CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Event Classification
  event_type TEXT NOT NULL, -- failed_login, suspicious_activation, rule_violation, etc.
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Context
  customer_id INTEGER,
  product_id INTEGER,
  admin_user_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Event Details
  description TEXT NOT NULL,
  raw_data TEXT, -- JSON with full event data
  
  -- Response
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER, -- admin_user_id
  resolution_notes TEXT,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id),
  FOREIGN KEY (resolved_by) REFERENCES admin_users(id)
);

-- API Keys: For external integrations and automation
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Key Management
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL, -- Hashed version for security
  
  -- Permissions
  permissions TEXT, -- JSON array of allowed endpoints
  rate_limit INTEGER DEFAULT 1000, -- Requests per hour
  
  -- Usage Tracking
  total_requests INTEGER DEFAULT 0,
  last_used DATETIME,
  
  -- Security
  allowed_ips TEXT, -- JSON array of allowed IP addresses
  is_active BOOLEAN DEFAULT TRUE,
  expires_at DATETIME,
  
  -- Metadata
  created_by INTEGER, -- admin_user_id
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES admin_users(id)
);

-- Performance Indexes for optimal query speed
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_license_key ON customers(license_key);
CREATE INDEX IF NOT EXISTS idx_customers_product_id ON customers(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

CREATE INDEX IF NOT EXISTS idx_activation_logs_customer_id ON activation_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_activation_logs_product_id ON activation_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_activation_logs_license_key ON activation_logs(license_key);
CREATE INDEX IF NOT EXISTS idx_activation_logs_activation_time ON activation_logs(activation_time);
CREATE INDEX IF NOT EXISTS idx_activation_logs_status ON activation_logs(status);
CREATE INDEX IF NOT EXISTS idx_activation_logs_ip_address ON activation_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_rule_id ON products(rule_id);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

CREATE INDEX IF NOT EXISTS idx_email_templates_template_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_product_id ON email_templates(product_id);

-- Full-text search indexes for admin panel search
CREATE VIRTUAL TABLE IF NOT EXISTS customers_search USING fts5(
  name, email, license_key, notes, content='customers', content_rowid='id'
);

-- Triggers to maintain search index
CREATE TRIGGER IF NOT EXISTS customers_search_insert AFTER INSERT ON customers BEGIN
  INSERT INTO customers_search(rowid, name, email, license_key, notes)
  VALUES (new.id, new.name, new.email, new.license_key, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS customers_search_delete AFTER DELETE ON customers BEGIN
  INSERT INTO customers_search(customers_search, rowid, name, email, license_key, notes)
  VALUES ('delete', old.id, old.name, old.email, old.license_key, old.notes);
END;

CREATE TRIGGER IF NOT EXISTS customers_search_update AFTER UPDATE ON customers BEGIN
  INSERT INTO customers_search(customers_search, rowid, name, email, license_key, notes)
  VALUES ('delete', old.id, old.name, old.email, old.license_key, old.notes);
  INSERT INTO customers_search(rowid, name, email, license_key, notes)
  VALUES (new.id, new.name, new.email, new.license_key, new.notes);
END;