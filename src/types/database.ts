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
  status: 'active' | 'suspended' | 'expired' | 'revoked'; // UI: Green=active, Yellow=suspended, Red=invalid/unrecognized
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
  session_id?: string;
  session_duration?: number;
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
  status: 'active' | 'suspended' | 'expired' | 'revoked' | 'invalid'; // Any non-active/suspended shows as red badge with actual status
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
    total_products: number;
    total_validations_today: number;
    security_events_today: number;
    revenue_this_month: number;
  };
  recent_customers: Customer[];
  recent_licenses: License[];
  security_events: SecurityEvent[];
  system_health: {
    status: 'healthy' | 'degraded' | 'critical';
    database_status: 'healthy' | 'degraded' | 'disconnected';
    email_queue_size: number;
    avg_response_time: number;
    uptime: string;
    last_check?: string;
    issues?: string[];
  };
}

// File Upload and Protection System Interfaces
export interface FileUpload {
  id: number;
  customer_id: number;
  original_filename: string;
  file_size: number;
  file_hash: string;
  mime_type: string;
  upload_path: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'protected' | 'failed' | 'deleted';
  protection_job_id?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ProtectionJob {
  id: number;
  customer_id: number;
  file_upload_id: number;
  job_type: 'protection' | 'repackaging' | 'licensing';
  protection_level: 'basic' | 'standard' | 'premium' | 'enterprise';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  
  // Protection settings
  enable_vm_protection: boolean;
  enable_hardware_binding: boolean;
  enable_encryption: boolean;
  enable_anti_debug: boolean;
  enable_anti_dump: boolean;
  max_concurrent_users: number;
  license_duration_days?: number;
  
  // Geographic and time restrictions
  allowed_countries?: string; // JSON array of country codes
  blocked_countries?: string; // JSON array of country codes
  allowed_time_zones?: string; // JSON array of timezone strings
  business_hours_only: boolean;
  business_hours_start?: string; // HH:MM format
  business_hours_end?: string; // HH:MM format
  allowed_days?: string; // JSON array of day names
  
  // Output information
  protected_file_path?: string;
  protected_file_size?: number;
  protected_file_hash?: string;
  download_url?: string;
  download_expires_at?: string;
  
  // Processing details
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  processing_logs?: string; // JSON array of log entries
  
  created_at: string;
  updated_at: string;
}

export interface ProtectionTemplate {
  id: number;
  customer_id?: number; // null for system templates
  name: string;
  description?: string;
  is_system_template: boolean;
  is_default: boolean;
  
  // Protection settings
  protection_level: 'basic' | 'standard' | 'premium' | 'enterprise';
  enable_vm_protection: boolean;
  enable_hardware_binding: boolean;
  enable_encryption: boolean;
  enable_anti_debug: boolean;
  enable_anti_dump: boolean;
  max_concurrent_users: number;
  license_duration_days?: number;
  
  // Geographic and time restrictions
  allowed_countries?: string;
  blocked_countries?: string;
  allowed_time_zones?: string;
  business_hours_only: boolean;
  business_hours_start?: string;
  business_hours_end?: string;
  allowed_days?: string;
  
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface DownloadLog {
  id: number;
  customer_id: number;
  protection_job_id: number;
  file_upload_id: number;
  ip_address: string;
  user_agent?: string;
  download_started_at: string;
  download_completed_at?: string;
  bytes_downloaded: number;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  created_at: string;
}

// Upload and Protection Request/Response Types
export interface UploadFileRequest {
  filename: string;
  file_size: number;
  mime_type: string;
  customer_id: number;
}

export interface UploadFileResponse {
  success: boolean;
  upload_id?: number;
  upload_url?: string;
  message: string;
}

export interface CreateProtectionJobRequest {
  file_upload_id: number;
  customer_id: number;
  protection_template_id?: number;
  protection_level: 'basic' | 'standard' | 'premium' | 'enterprise';
  enable_vm_protection: boolean;
  enable_hardware_binding: boolean;
  enable_encryption: boolean;
  enable_anti_debug: boolean;
  enable_anti_dump: boolean;
  max_concurrent_users: number;
  license_duration_days?: number;
  allowed_countries?: string[];
  blocked_countries?: string[];
  allowed_time_zones?: string[];
  business_hours_only: boolean;
  business_hours_start?: string;
  business_hours_end?: string;
  allowed_days?: string[];
}

export interface CreateProtectionJobResponse {
  success: boolean;
  job_id?: number;
  message: string;
  estimated_completion?: string;
}

export interface ProtectionJobStatus {
  job_id: number;
  status: string;
  progress: number;
  message?: string;
  download_url?: string;
  download_expires_at?: string;
  error_message?: string;
}

// Enhanced dashboard data with upload statistics
export interface CustomerDashboardDataWithUploads extends CustomerDashboardData {
  file_uploads: FileUpload[];
  protection_jobs: ProtectionJob[];
  upload_stats: {
    total_uploads: number;
    completed_protections: number;
    failed_protections: number;
    total_file_size: number;
  };
}

// Enhanced admin dashboard with upload/protection statistics
export interface AdminDashboardDataWithUploads extends AdminDashboardData {
  upload_stats: {
    total_uploads_today: number;
    protection_jobs_pending: number;
    protection_jobs_completed_today: number;
    total_storage_used: number;
    average_protection_time: number;
  };
}

// Utility types for form validation
export type CustomerCreateData = Omit<Customer, 'id' | 'device_count' | 'last_login' | 'failed_attempts' | 'locked_until' | 'created_at' | 'updated_at'>;
export type CustomerUpdateData = Partial<CustomerCreateData>;
export type ProductCreateData = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type ProductUpdateData = Partial<ProductCreateData>;
export type LicenseCreateData = Omit<License, 'id' | 'license_key' | 'last_validation' | 'validation_count' | 'created_at' | 'updated_at'>;
export type FileUploadCreateData = Omit<FileUpload, 'id' | 'created_at' | 'updated_at'>;
export type ProtectionJobCreateData = Omit<ProtectionJob, 'id' | 'created_at' | 'updated_at'>;
export type ProtectionTemplateCreateData = Omit<ProtectionTemplate, 'id' | 'usage_count' | 'created_at' | 'updated_at'>;

// Cloudflare bindings interface
export interface Bindings {
  DB: D1Database;
  KV: KVNamespace;
  R2?: R2Bucket; // For file storage (primary storage when available, falls back to KV)
  ENCRYPTION_KEY: string;
  JWT_SECRET: string;
  ADMIN_JWT_SECRET: string;
  EMAIL_API_KEY?: string;
  WEBHOOK_SECRET?: string;
  FILE_UPLOAD_MAX_SIZE?: string; // Default: 100MB
  FILE_STORAGE_RETENTION_DAYS?: string; // Default: 30 days
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