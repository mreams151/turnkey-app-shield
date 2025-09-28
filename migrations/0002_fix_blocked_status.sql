-- Fix activation_logs status: Replace 'blocked' with 'revoked'
-- Remove 'blocked' from allowed status values

-- Update existing blocked records to revoked
UPDATE activation_logs SET status = 'revoked' WHERE status = 'blocked';

-- Create new table with corrected constraint
CREATE TABLE activation_logs_new (
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
  
  -- Validation Results (FIXED: removed 'blocked', use 'revoked' instead)
  status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'expired', 'revoked', 'suspended')),
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

-- Copy data from old table to new table
INSERT INTO activation_logs_new SELECT * FROM activation_logs;

-- Drop old table and rename new table
DROP TABLE activation_logs;
ALTER TABLE activation_logs_new RENAME TO activation_logs;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_activation_logs_customer_id ON activation_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_activation_logs_product_id ON activation_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_activation_logs_license_key ON activation_logs(license_key);
CREATE INDEX IF NOT EXISTS idx_activation_logs_activation_time ON activation_logs(activation_time);
CREATE INDEX IF NOT EXISTS idx_activation_logs_status ON activation_logs(status);
CREATE INDEX IF NOT EXISTS idx_activation_logs_ip_address ON activation_logs(ip_address);