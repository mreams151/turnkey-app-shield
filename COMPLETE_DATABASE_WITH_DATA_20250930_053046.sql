-- ============================================
-- TurnkeyAppShield COMPLETE Database Backup with DATA
-- ============================================
-- Created: $(date)
-- This file contains EVERYTHING: schemas, data, indexes
-- To restore: sqlite3 newdb.db < this_file.sql

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- ============================================
-- TABLE SCHEMAS
-- ============================================
CREATE TABLE d1_migrations(\n\t\tid         INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\tname       TEXT UNIQUE,\n\t\tapplied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL\n)
CREATE TABLE license_rules (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL UNIQUE,\n  description TEXT,\n  \n  \n  max_activations INTEGER DEFAULT 0, \n  max_concurrent_sessions INTEGER DEFAULT 1,\n  \n  \n  max_days INTEGER DEFAULT 0, \n  grace_period_days INTEGER DEFAULT 7,\n  \n  \n  max_devices INTEGER DEFAULT 1, \n  max_ips INTEGER DEFAULT 0, \n  allow_vm BOOLEAN DEFAULT FALSE, \n  \n  \n  allowed_countries TEXT, \n  blocked_countries TEXT, \n  timezone_restrictions TEXT, \n  \n  \n  allow_offline_days INTEGER DEFAULT 3, \n  require_periodic_validation BOOLEAN DEFAULT TRUE,\n  validation_interval_hours INTEGER DEFAULT 24,\n  \n  \n  is_active BOOLEAN DEFAULT TRUE,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n)
CREATE TABLE products (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL,\n  version TEXT NOT NULL DEFAULT '1.0.0',\n  description TEXT,\n  \n  \n  download_url TEXT NOT NULL,\n  file_size INTEGER, \n  file_hash TEXT, \n  \n  \n  rule_id INTEGER,\n  protection_level TEXT DEFAULT 'standard', \n  \n  \n  landing_page_token TEXT UNIQUE, \n  landing_page_template TEXT DEFAULT 'default',\n  custom_branding TEXT, \n  \n  \n  update_policy TEXT DEFAULT 'optional', \n  minimum_version TEXT, \n  changelog TEXT,\n  update_notification_message TEXT,\n  \n  \n  price DECIMAL(10,2) DEFAULT 0.00,\n  currency TEXT DEFAULT 'USD',\n  category TEXT,\n  tags TEXT, \n  \n  \n  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),\n  client_name TEXT DEFAULT 'Main Admin',\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  \n  FOREIGN KEY (rule_id) REFERENCES license_rules(id)\n)
CREATE TABLE customers (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  \n  \n  name TEXT NOT NULL,\n  email TEXT NOT NULL,\n  customer_id TEXT UNIQUE, \n  \n  \n  product_id INTEGER NOT NULL,\n  license_key TEXT NOT NULL UNIQUE,\n  license_type TEXT DEFAULT 'standard', \n  \n  \n  primary_device_id TEXT, \n  registered_devices TEXT, \n  device_names TEXT, \n  \n  \n  registration_ip TEXT,\n  last_seen_ip TEXT,\n  ip_history TEXT, \n  \n  \n  first_activation_date DATETIME,\n  last_activation_date DATETIME,\n  total_activations INTEGER DEFAULT 0,\n  total_usage_hours INTEGER DEFAULT 0,\n  \n  \n  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),\n  suspension_reason TEXT,\n  expires_at DATETIME,\n  \n  \n  registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,\n  notes TEXT, \n  tags TEXT, \n  \n  FOREIGN KEY (product_id) REFERENCES products(id)\n)
CREATE TABLE email_templates (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  \n  \n  name TEXT NOT NULL,\n  template_type TEXT NOT NULL, \n  product_id INTEGER, \n  \n  \n  subject TEXT NOT NULL,\n  html_body TEXT NOT NULL,\n  text_body TEXT,\n  \n  \n  variables TEXT, \n  conditional_logic TEXT, \n  \n  \n  trigger_events TEXT, \n  send_delay_minutes INTEGER DEFAULT 0,\n  is_automated BOOLEAN DEFAULT FALSE,\n  \n  \n  variant_name TEXT DEFAULT 'default',\n  is_active BOOLEAN DEFAULT TRUE,\n  \n  \n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  \n  FOREIGN KEY (product_id) REFERENCES products(id)\n)
CREATE TABLE system_settings (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  category TEXT NOT NULL, \n  key TEXT NOT NULL UNIQUE,\n  value TEXT,\n  value_type TEXT DEFAULT 'string', \n  description TEXT,\n  is_sensitive BOOLEAN DEFAULT FALSE, \n  \n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n)
CREATE TABLE admin_users (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  \n  \n  username TEXT NOT NULL UNIQUE,\n  email TEXT NOT NULL UNIQUE,\n  full_name TEXT,\n  \n  \n  password_hash TEXT NOT NULL,\n  salt TEXT NOT NULL,\n  two_factor_secret TEXT, \n  \n  \n  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'viewer')),\n  permissions TEXT, \n  \n  \n  last_login DATETIME,\n  login_attempts INTEGER DEFAULT 0,\n  locked_until DATETIME,\n  password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  \n  \n  is_active BOOLEAN DEFAULT TRUE,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n)
CREATE TABLE security_events (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  \n  \n  event_type TEXT NOT NULL, \n  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),\n  \n  \n  customer_id INTEGER,\n  product_id INTEGER,\n  admin_user_id INTEGER,\n  ip_address TEXT,\n  user_agent TEXT,\n  \n  \n  description TEXT NOT NULL,\n  raw_data TEXT, \n  \n  \n  is_resolved BOOLEAN DEFAULT FALSE,\n  resolved_by INTEGER, \n  resolution_notes TEXT,\n  \n  \n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  \n  FOREIGN KEY (customer_id) REFERENCES customers(id),\n  FOREIGN KEY (product_id) REFERENCES products(id),\n  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id),\n  FOREIGN KEY (resolved_by) REFERENCES admin_users(id)\n)
CREATE TABLE api_keys (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  \n  \n  key_name TEXT NOT NULL,\n  api_key TEXT NOT NULL UNIQUE,\n  key_hash TEXT NOT NULL, \n  \n  \n  permissions TEXT, \n  rate_limit INTEGER DEFAULT 1000, \n  \n  \n  total_requests INTEGER DEFAULT 0,\n  last_used DATETIME,\n  \n  \n  allowed_ips TEXT, \n  is_active BOOLEAN DEFAULT TRUE,\n  expires_at DATETIME,\n  \n  \n  created_by INTEGER, \n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  \n  FOREIGN KEY (created_by) REFERENCES admin_users(id)\n)
CREATE VIRTUAL TABLE customers_search USING fts5(\n  name, email, license_key, notes, content='customers', content_rowid='id'\n)
CREATE TABLE 'customers_search_data'(id INTEGER PRIMARY KEY, block BLOB)
CREATE TABLE 'customers_search_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID
CREATE TABLE 'customers_search_docsize'(id INTEGER PRIMARY KEY, sz BLOB)
CREATE TABLE 'customers_search_config'(k PRIMARY KEY, v) WITHOUT ROWID
CREATE TABLE \
CREATE TABLE licenses (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  \n  \n  license_key TEXT NOT NULL UNIQUE,\n  license_type TEXT DEFAULT 'standard', \n  \n  \n  customer_id INTEGER NOT NULL,\n  product_id INTEGER NOT NULL,\n  \n  \n  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),\n  expires_at DATETIME,\n  \n  \n  activations_used INTEGER DEFAULT 0,\n  max_activations INTEGER DEFAULT 1,\n  devices_registered TEXT, \n  \n  \n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  activated_at DATETIME, \n  revoked_at DATETIME, \n  \n  \n  notes TEXT,\n  \n  FOREIGN KEY (customer_id) REFERENCES customers(id),\n  FOREIGN KEY (product_id) REFERENCES products(id)\n)
CREATE TABLE file_uploads (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  customer_id INTEGER,\n  original_filename TEXT NOT NULL,\n  file_size INTEGER,\n  file_hash TEXT,\n  mime_type TEXT,\n  upload_path TEXT,\n  status TEXT DEFAULT 'pending',\n  protection_job_id INTEGER,\n  error_message TEXT,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (customer_id) REFERENCES customers(id)\n)
CREATE TABLE protection_jobs (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  customer_id INTEGER NOT NULL,\n  product_id INTEGER NOT NULL,\n  job_type TEXT DEFAULT 'protect_file',\n  input_file_path TEXT,\n  output_file_path TEXT,\n  status TEXT DEFAULT 'pending',\n  progress INTEGER DEFAULT 0,\n  error_message TEXT,\n  started_at DATETIME,\n  completed_at DATETIME,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (customer_id) REFERENCES customers(id),\n  FOREIGN KEY (product_id) REFERENCES products(id)\n)
CREATE TABLE data_export_jobs (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  export_name TEXT NOT NULL,\n  export_type TEXT DEFAULT 'csv',\n  entity_type TEXT NOT NULL,\n  export_filters TEXT, \n  columns_selected TEXT, \n  status TEXT DEFAULT 'pending',\n  file_path TEXT,\n  download_url TEXT,\n  created_by INTEGER,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n  completed_at DATETIME,\n  FOREIGN KEY (created_by) REFERENCES admin_users(id)\n)
CREATE TABLE email_queue (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  to_email TEXT NOT NULL,\n  subject TEXT NOT NULL,\n  body TEXT NOT NULL,\n  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'retry', 'failed')),\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n)

-- ============================================
-- TABLE DATA
-- ============================================

-- Data for table: customers

-- Data for table: products

-- Data for table: license_rules

-- Data for table: admin_users

-- Data for table: licenses

-- Data for table: activation_logs

-- Data for table: security_events

-- Data for table: system_settings

-- Data for table: email_templates

-- Data for table: api_keys
-- Table api_keys is empty

-- Data for table: file_uploads
-- Table file_uploads is empty

-- Data for table: protection_jobs
-- Table protection_jobs is empty

-- Data for table: data_export_jobs

-- Data for table: email_queue

COMMIT;
PRAGMA foreign_keys=ON;
