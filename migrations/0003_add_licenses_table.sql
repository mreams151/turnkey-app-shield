-- Add dedicated licenses table to separate customer and license data
-- This migration adds a proper licenses table and migrates existing data

-- Create the new licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- License Identity
  license_key TEXT NOT NULL UNIQUE,
  license_type TEXT DEFAULT 'standard', -- trial, standard, premium, enterprise
  
  -- References
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  
  -- License Details
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
  expires_at DATETIME,
  
  -- Usage Tracking
  activations_used INTEGER DEFAULT 0,
  max_activations INTEGER DEFAULT 1,
  devices_registered TEXT, -- JSON array of registered devices
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  activated_at DATETIME, -- First activation
  revoked_at DATETIME, -- If revoked
  
  -- Notes
  notes TEXT,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_customer_id ON licenses(customer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_product_id ON licenses(product_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_created_at ON licenses(created_at);

-- Migrate existing data from customers table to licenses table
INSERT INTO licenses (
  license_key, license_type, customer_id, product_id, status, 
  expires_at, created_at, activated_at
)
SELECT 
  license_key, 
  license_type,
  id as customer_id,
  product_id,
  status,
  expires_at,
  registration_date as created_at,
  first_activation_date as activated_at
FROM customers
WHERE license_key IS NOT NULL AND license_key != '';

-- Add missing tables for file uploads and protection jobs
CREATE TABLE IF NOT EXISTS file_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  original_filename TEXT NOT NULL,
  file_size INTEGER,
  file_hash TEXT,
  mime_type TEXT,
  upload_path TEXT,
  status TEXT DEFAULT 'pending',
  protection_job_id INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS protection_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  job_type TEXT DEFAULT 'protect_file',
  input_file_path TEXT,
  output_file_path TEXT,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Add missing data export jobs table
CREATE TABLE IF NOT EXISTS data_export_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  export_name TEXT NOT NULL,
  export_type TEXT DEFAULT 'csv',
  entity_type TEXT NOT NULL,
  export_filters TEXT, -- JSON
  columns_selected TEXT, -- JSON
  status TEXT DEFAULT 'pending',
  file_path TEXT,
  download_url TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (created_by) REFERENCES admin_users(id)
);

-- Create performance indexes for new tables
CREATE INDEX IF NOT EXISTS idx_file_uploads_customer_id ON file_uploads(customer_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(status);
CREATE INDEX IF NOT EXISTS idx_protection_jobs_customer_id ON protection_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_protection_jobs_status ON protection_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_created_by ON data_export_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_status ON data_export_jobs(status);