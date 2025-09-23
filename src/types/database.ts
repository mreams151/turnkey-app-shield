// TurnkeyAppShield - Database Types
// Enhanced types for the modernized protection system

export interface Customer {
  id: number;
  email: string;
  company_name?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  is_active: boolean;
  max_devices: number;
  device_count: number;
  last_login?: string;
  failed_attempts: number;
  locked_until?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  version: string;
  file_path: string;
  file_size: number;
  file_hash: string;
  protection_level: 'basic' | 'standard' | 'premium' | 'enterprise';
  encryption_key: string;
  split_count: number;
  wrapper_template?: string;
  update_url?: string;
  update_policy: 'manual' | 'automatic' | 'notify';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface License {
  id: number;
  customer_id: number;
  product_id: number;
  license_key: string;
  device_fingerprint: string;
  hardware_hash: string;
  ip_address: string;
  mac_addresses: string;
  computer_name: string;
  os_version: string;
  status: 'active' | 'suspended' | 'expired' | 'revoked';
  expires_at?: string;
  last_validation?: string;
  validation_count: number;
  created_at: string;
  updated_at: string;
}

export interface LicenseRule {
  id: number;
  customer_id: number;
  product_id: number;
  rule_type: 'device_limit' | 'time_limit' | 'ip_restriction' | 'geo_restriction' | 'usage_limit' | 'feature_access';
  rule_value: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ActivationLog {
  id: number;
  license_id: number;
  customer_id: number;
  product_id: number;
  action: 'validate' | 'activate' | 'deactivate' | 'suspend' | 'error';
  status: 'success' | 'failed' | 'blocked';
  ip_address: string;
  user_agent?: string;
  device_fingerprint: string;
  hardware_changes?: string;
  error_message?: string;
  response_time: number;
  created_at: string;
}

export interface SecurityEvent {
  id: number;
  event_type: 'suspicious_activity' | 'multiple_failures' | 'geo_anomaly' | 'hardware_change' | 'rate_limit' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  customer_id?: number;
  license_id?: number;
  ip_address: string;
  description: string;
  metadata?: string;
  resolved: boolean;
  resolved_by?: number;
  resolved_at?: string;
  created_at: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  type: 'activation' | 'expiry_warning' | 'suspended' | 'security_alert' | 'welcome' | 'update_available';
  subject: string;
  html_content: string;
  text_content?: string;
  variables?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailQueue {
  id: number;
  template_id: number;
  customer_id: number;
  to_email: string;
  subject: string;
  html_content: string;
  text_content?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  priority: number;
  scheduled_at?: string;
  sent_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  password_hash: string;
  salt: string;
  two_factor_secret?: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'viewer';
  permissions?: string;
  last_login?: string;
  login_attempts: number;
  locked_until?: string;
  password_changed_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  admin_id?: number;
  action: string;
  table_name?: string;
  record_id?: number;
  old_values?: string;
  new_values?: string;
  ip_address: string;
  user_agent?: string;
  created_at: string;
}

// Request/Response Types for API endpoints
export interface ValidateLicenseRequest {
  license_key: string;
  hardware_fingerprint: string;
  hardware_hash: string;
  ip_address: string;
  mac_addresses: string[];
  computer_name: string;
  os_version: string;
  product_version?: string;
}

export interface ValidateLicenseResponse {
  valid: boolean;
  status: 'active' | 'suspended' | 'expired' | 'revoked' | 'invalid';
  message: string;
  expires_at?: string;
  validation_id?: number;
  update_available?: boolean;
  update_url?: string;
  server_time: string;
}

export interface CreateLicenseRequest {
  customer_id: number;
  product_id: number;
  device_fingerprint: string;
  hardware_hash: string;
  expires_at?: string;
}

export interface CreateLicenseResponse {
  success: boolean;
  license_key?: string;
  message: string;
  license_id?: number;
}

export interface CustomerDashboardData {
  customer: Customer;
  licenses: License[];
  recent_activity: ActivationLog[];
  security_alerts: SecurityEvent[];
  usage_stats: {
    total_validations: number;
    successful_validations: number;
    failed_validations: number;
    last_validation?: string;
  };
}

export interface AdminDashboardData {
  stats: {
    total_customers: number;
    active_licenses: number;
    total_validations_today: number;
    security_events_today: number;
    revenue_this_month: number;
  };
  recent_customers: Customer[];
  recent_licenses: License[];
  security_events: SecurityEvent[];
  system_health: {
    database_status: 'healthy' | 'warning' | 'error';
    email_queue_size: number;
    avg_response_time: number;
    uptime: string;
  };
}

// Utility types for form validation
export type CustomerCreateData = Omit<Customer, 'id' | 'device_count' | 'last_login' | 'failed_attempts' | 'locked_until' | 'created_at' | 'updated_at'>;
export type CustomerUpdateData = Partial<CustomerCreateData>;
export type ProductCreateData = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type ProductUpdateData = Partial<ProductCreateData>;
export type LicenseCreateData = Omit<License, 'id' | 'license_key' | 'last_validation' | 'validation_count' | 'created_at' | 'updated_at'>;

// Cloudflare bindings interface
export interface Bindings {
  DB: D1Database;
  KV: KVNamespace;
  ENCRYPTION_KEY: string;
  JWT_SECRET: string;
  ADMIN_JWT_SECRET: string;
  EMAIL_API_KEY?: string;
  WEBHOOK_SECRET?: string;
}

// Context type for Hono
export type AppContext = {
  Bindings: Bindings;
  Variables: {
    customer?: Customer;
    admin_user?: AdminUser;
    license?: License;
  };
};