// Modern Database Utilities - Enhanced D1 Operations
// Advanced database operations for the modernized protection system

import type { 
  Customer, Product, License, LicenseRule, ActivationLog, 
  SecurityEvent, EmailTemplate, EmailQueue, AdminUser, 
  Setting, AuditLog, Bindings 
} from '../types/database';

/**
 * Enhanced database operations for Cloudflare D1
 */
export class DatabaseManager {
  constructor(private db: D1Database) {}

  // Customer Operations
  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO customers (
        email, company_name, first_name, last_name, phone, address, 
        city, state, country, zip_code, is_active, max_devices, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customer.email, customer.company_name, customer.first_name, 
      customer.last_name, customer.phone, customer.address, 
      customer.city, customer.state, customer.country, 
      customer.zip_code, customer.is_active, customer.max_devices, 
      customer.notes
    ).run();

    if (!result.success) {
      throw new Error(`Failed to create customer: ${result.error}`);
    }

    return result.meta.last_row_id as number;
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    const result = await this.db.prepare(`
      SELECT * FROM customers WHERE id = ?
    `).bind(id).first<Customer>();

    return result || null;
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    const result = await this.db.prepare(`
      SELECT * FROM customers WHERE email = ? AND is_active = 1
    `).bind(email).first<Customer>();

    return result || null;
  }

  async updateCustomerDeviceCount(customerId: number, increment: number = 1): Promise<void> {
    await this.db.prepare(`
      UPDATE customers 
      SET device_count = device_count + ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(increment, customerId).run();
  }

  async recordCustomerLogin(customerId: number, success: boolean, ip: string): Promise<void> {
    if (success) {
      await this.db.prepare(`
        UPDATE customers 
        SET last_login = CURRENT_TIMESTAMP, failed_attempts = 0, locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(customerId).run();
    } else {
      // Increment failed attempts and potentially lock account
      await this.db.prepare(`
        UPDATE customers 
        SET failed_attempts = failed_attempts + 1,
            locked_until = CASE 
              WHEN failed_attempts + 1 >= 5 THEN datetime('now', '+30 minutes')
              ELSE locked_until
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(customerId).run();
    }
  }

  // Product Operations
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO products (
        name, description, version, file_path, file_size, file_hash,
        protection_level, encryption_key, split_count, wrapper_template,
        update_url, update_policy, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      product.name, product.description, product.version, product.file_path,
      product.file_size, product.file_hash, product.protection_level,
      product.encryption_key, product.split_count, product.wrapper_template,
      product.update_url, product.update_policy, product.is_active
    ).run();

    if (!result.success) {
      throw new Error(`Failed to create product: ${result.error}`);
    }

    return result.meta.last_row_id as number;
  }

  async getProductById(id: number): Promise<Product | null> {
    const result = await this.db.prepare(`
      SELECT * FROM products WHERE id = ? AND is_active = 1
    `).bind(id).first<Product>();

    return result || null;
  }

  async getActiveProducts(): Promise<Product[]> {
    const result = await this.db.prepare(`
      SELECT * FROM products WHERE is_active = 1 ORDER BY name
    `).all<Product>();

    return result.results || [];
  }

  // License Operations  
  async createLicense(license: Omit<License, 'id' | 'license_key' | 'created_at' | 'updated_at'>): Promise<{ id: number; license_key: string }> {
    // Generate unique license key
    const { ModernCrypto } = await import('./security');
    let licenseKey: string;
    let attempts = 0;
    
    do {
      licenseKey = ModernCrypto.generateLicenseKey();
      attempts++;
      
      // Check if key already exists
      const existing = await this.db.prepare(`
        SELECT id FROM licenses WHERE license_key = ?
      `).bind(licenseKey).first();
      
      if (!existing) break;
      
      if (attempts > 10) {
        throw new Error('Failed to generate unique license key');
      }
    } while (true);

    const result = await this.db.prepare(`
      INSERT INTO licenses (
        customer_id, product_id, license_key, device_fingerprint,
        hardware_hash, ip_address, mac_addresses, computer_name,
        os_version, status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      license.customer_id, license.product_id, licenseKey,
      license.device_fingerprint, license.hardware_hash, license.ip_address,
      license.mac_addresses, license.computer_name, license.os_version,
      license.status, license.expires_at
    ).run();

    if (!result.success) {
      throw new Error(`Failed to create license: ${result.error}`);
    }

    return {
      id: result.meta.last_row_id as number,
      license_key: licenseKey
    };
  }

  async getLicenseByKey(licenseKey: string): Promise<License | null> {
    const result = await this.db.prepare(`
      SELECT * FROM licenses WHERE license_key = ?
    `).bind(licenseKey).first<License>();

    return result || null;
  }

  async validateLicense(
    licenseKey: string, 
    hardwareFingerprint: string, 
    ipAddress: string
  ): Promise<{
    valid: boolean;
    license?: License;
    customer?: Customer;
    product?: Product;
    message: string;
  }> {
    // Get license with related data
    const result = await this.db.prepare(`
      SELECT 
        l.*,
        c.is_active as customer_active,
        c.max_devices,
        c.device_count,
        p.is_active as product_active,
        p.version as product_version
      FROM licenses l
      JOIN customers c ON l.customer_id = c.id
      JOIN products p ON l.product_id = p.id
      WHERE l.license_key = ?
    `).bind(licenseKey).first();

    if (!result) {
      return { valid: false, message: 'License key not found' };
    }

    const license = result as License & { 
      customer_active: number; 
      product_active: number; 
      max_devices: number;
      device_count: number;
    };

    // Check customer status
    if (!license.customer_active) {
      return { valid: false, message: 'Customer account is inactive' };
    }

    // Check product status
    if (!license.product_active) {
      return { valid: false, message: 'Product is no longer active' };
    }

    // Check license status
    if (license.status !== 'active') {
      return { valid: false, message: `License is ${license.status}` };
    }

    // Check expiration
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      // Auto-expire the license
      await this.updateLicenseStatus(license.id, 'expired');
      return { valid: false, message: 'License has expired' };
    }

    // Check hardware fingerprint match
    if (license.device_fingerprint !== hardwareFingerprint) {
      // Log potential hardware change
      await this.logSecurityEvent({
        event_type: 'hardware_change',
        severity: 'medium',
        customer_id: license.customer_id,
        license_id: license.id,
        ip_address: ipAddress,
        description: `Hardware fingerprint mismatch for license ${licenseKey}`,
        metadata: JSON.stringify({
          expected: license.device_fingerprint,
          received: hardwareFingerprint,
          ip: ipAddress
        })
      });

      return { valid: false, message: 'Hardware fingerprint mismatch' };
    }

    // Update validation timestamp and count
    await this.db.prepare(`
      UPDATE licenses 
      SET last_validation = CURRENT_TIMESTAMP, 
          validation_count = validation_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(license.id).run();

    return { 
      valid: true, 
      license: license as License,
      message: 'License validated successfully' 
    };
  }

  async updateLicenseStatus(licenseId: number, status: License['status']): Promise<void> {
    await this.db.prepare(`
      UPDATE licenses 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(status, licenseId).run();
  }

  async getCustomerLicenses(customerId: number): Promise<License[]> {
    const result = await this.db.prepare(`
      SELECT l.*, p.name as product_name, p.version as product_version
      FROM licenses l
      JOIN products p ON l.product_id = p.id
      WHERE l.customer_id = ?
      ORDER BY l.created_at DESC
    `).all();

    return result.results || [];
  }

  // License Rules Operations
  async createLicenseRule(rule: Omit<LicenseRule, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO license_rules (
        customer_id, product_id, rule_type, rule_value, is_active, priority
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      rule.customer_id, rule.product_id, rule.rule_type, 
      rule.rule_value, rule.is_active, rule.priority
    ).run();

    if (!result.success) {
      throw new Error(`Failed to create license rule: ${result.error}`);
    }

    return result.meta.last_row_id as number;
  }

  async getLicenseRules(customerId: number, productId: number): Promise<LicenseRule[]> {
    const result = await this.db.prepare(`
      SELECT * FROM license_rules 
      WHERE customer_id = ? AND product_id = ? AND is_active = 1
      ORDER BY priority ASC
    `).bind(customerId, productId).all<LicenseRule>();

    return result.results || [];
  }

  // Activation Logging
  async logActivation(log: Omit<ActivationLog, 'id' | 'created_at'>): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO activation_logs (
        license_id, customer_id, product_id, action, status, ip_address,
        user_agent, device_fingerprint, hardware_changes, error_message, response_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      log.license_id, log.customer_id, log.product_id, log.action, log.status,
      log.ip_address, log.user_agent, log.device_fingerprint, log.hardware_changes,
      log.error_message, log.response_time
    ).run();

    return result.meta.last_row_id as number;
  }

  async getRecentActivations(customerId?: number, limit: number = 100): Promise<ActivationLog[]> {
    const query = customerId 
      ? `SELECT * FROM activation_logs WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM activation_logs ORDER BY created_at DESC LIMIT ?`;
    
    const params = customerId ? [customerId, limit] : [limit];
    
    const result = await this.db.prepare(query).bind(...params).all<ActivationLog>();
    return result.results || [];
  }

  // Security Events
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'created_at'>): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO security_events (
        event_type, severity, customer_id, license_id, ip_address,
        description, metadata, resolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      event.event_type, event.severity, event.customer_id, event.license_id,
      event.ip_address, event.description, event.metadata, event.resolved || false
    ).run();

    return result.meta.last_row_id as number;
  }

  async getSecurityEvents(customerId?: number, limit: number = 50): Promise<SecurityEvent[]> {
    const query = customerId
      ? `SELECT * FROM security_events WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM security_events ORDER BY created_at DESC LIMIT ?`;
    
    const params = customerId ? [customerId, limit] : [limit];
    
    const result = await this.db.prepare(query).bind(...params).all<SecurityEvent>();
    return result.results || [];
  }

  // Admin Operations
  async createAdminUser(admin: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO admin_users (
        username, email, password_hash, role, is_active
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      admin.username, admin.email, admin.password_hash, admin.role, admin.is_active
    ).run();

    if (!result.success) {
      throw new Error(`Failed to create admin user: ${result.error}`);
    }

    return result.meta.last_row_id as number;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | null> {
    const result = await this.db.prepare(`
      SELECT * FROM admin_users WHERE username = ? AND is_active = 1
    `).bind(username).first<AdminUser>();

    return result || null;
  }

  // Dashboard Analytics
  async getDashboardStats(): Promise<any> {
    try {
      const [
        customerStats,
        licenseStats,
        activationStats,
        securityStats
      ] = await Promise.all([
        // Customer statistics - exclude revoked (deleted) customers
        this.db.prepare(`
          SELECT 
            COUNT(*) as total_customers,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
            COUNT(CASE WHEN registration_date >= date('now', '-30 days') THEN 1 END) as new_customers_30d
          FROM customers
          WHERE status != 'revoked'
        `).first().catch(() => ({ total_customers: 0, active_customers: 0, new_customers_30d: 0 })),
        
        // License statistics - count products as licenses (match products tab filtering)
        this.db.prepare(`
          SELECT 
            COUNT(CASE WHEN status = 'active' THEN 1 END) as total_licenses,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_licenses,
            COUNT(CASE WHEN status = 'deprecated' THEN 1 END) as expired_licenses,
            COUNT(CASE WHEN created_at >= date('now', '-30 days') AND status = 'active' THEN 1 END) as new_licenses_30d
          FROM products
        `).first().catch(() => ({ total_licenses: 0, active_licenses: 0, expired_licenses: 0, new_licenses_30d: 0 })),
        
        // Activation statistics - actual data from activation_logs
        this.db.prepare(`
          SELECT 
            COUNT(*) as total_validations_today,
            COUNT(CASE WHEN status = 'valid' THEN 1 END) as successful_validations_today,
            COUNT(CASE WHEN status IN ('invalid', 'expired', 'revoked', 'suspended') THEN 1 END) as failed_validations_today
          FROM activation_logs 
          WHERE date(activation_time) = date('now')
        `).first().catch(() => ({ total_validations_today: 0, successful_validations_today: 0, failed_validations_today: 0 })),
        
        // Security events statistics
        this.db.prepare(`
          SELECT 
            COUNT(*) as security_events_today,
            COUNT(CASE WHEN severity = 'high' OR severity = 'critical' THEN 1 END) as high_severity_today
          FROM security_events 
          WHERE date(created_at) = date('now')
        `).first().catch(() => ({ security_events_today: 0, high_severity_today: 0 }))
      ]);

      return {
        customers: customerStats,
        licenses: licenseStats,
        activations: activationStats,
        security: securityStats
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      // Return default stats if there's an error
      return {
        customers: { total_customers: 0, active_customers: 0, new_customers_30d: 0 },
        licenses: { total_licenses: 0, active_licenses: 0, expired_licenses: 0, new_licenses_30d: 0 },
        activations: { total_validations_today: 0, successful_validations_today: 0, failed_validations_today: 0 },
        security: { security_events_today: 0, high_severity_today: 0 }
      };
    }
  }

  // Settings Management
  async getSetting(key: string): Promise<string | null> {
    const result = await this.db.prepare(`
      SELECT value FROM system_settings WHERE key = ?
    `).bind(key).first<{ value: string }>();

    return result?.value || null;
  }

  async setSetting(key: string, value: string, description?: string, isEncrypted: boolean = false): Promise<void> {
    await this.db.prepare(`
      INSERT OR REPLACE INTO system_settings (category, key, value, value_type, description, is_sensitive)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind('general', key, value, 'string', description, isEncrypted).run();
  }

  // Full-text search
  async searchCustomers(query: string): Promise<Customer[]> {
    const result = await this.db.prepare(`
      SELECT c.* FROM customers c
      JOIN customers_fts fts ON c.id = fts.rowid
      WHERE customers_fts MATCH ?
      ORDER BY rank
      LIMIT 50
    `).bind(query).all<Customer>();

    return result.results || [];
  }

  async searchProducts(query: string): Promise<Product[]> {
    const result = await this.db.prepare(`
      SELECT p.* FROM products p
      JOIN products_fts fts ON p.id = fts.rowid
      WHERE products_fts MATCH ?
      ORDER BY rank
      LIMIT 50
    `).bind(query).all<Product>();

    return result.results || [];
  }

  // Cleanup operations
  async cleanupExpiredLicenses(): Promise<number> {
    const result = await this.db.prepare(`
      UPDATE licenses 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' 
      AND expires_at IS NOT NULL 
      AND expires_at < CURRENT_TIMESTAMP
    `).run();

    return result.changes || 0;
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const result = await this.db.prepare(`
      DELETE FROM activation_logs 
      WHERE created_at < date('now', '-' || ? || ' days')
    `).bind(daysToKeep).run();

    return result.changes || 0;
  }
}

/**
 * Database initialization and migration utilities
 */
export class DatabaseInitializer {
  constructor(private db: D1Database) {}

  async initializeDatabase(): Promise<void> {
    // Check if database is already initialized
    const tables = await this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table'
    `).all<{ name: string }>();

    const tableNames = tables.results?.map(t => t.name) || [];
    
    if (tableNames.includes('customers')) {
      console.log('Database already initialized');
      return;
    }

    console.log('Initializing database...');
    // Run the initialization script
    // In practice, this would be handled by wrangler migrations
    console.log('Run: npx wrangler d1 migrations apply webapp-production --local');
  }

  async seedInitialData(): Promise<void> {
    // Check if we already have admin users
    const adminCount = await this.db.prepare(`
      SELECT COUNT(*) as count FROM admin_users
    `).first<{ count: number }>();

    if (adminCount && adminCount.count > 0) {
      console.log('Database already seeded');
      return;
    }

    // Create default admin user
    const { PasswordUtils } = await import('./security');
    const passwordHash = await PasswordUtils.hashPassword('admin123');
    
    await this.db.prepare(`
      INSERT INTO admin_users (username, email, full_name, password_hash, salt, role, is_active)
      VALUES ('admin', 'admin@turnkey.local', 'System Administrator', ?, 'bcrypt_managed', 'super_admin', 1)
    `).bind(passwordHash).run();

    // Add default settings
    const defaultSettings = [
      { key: 'system_name', value: 'TurnkeyAppShield', description: 'System name' },
      { key: 'default_license_duration', value: '365', description: 'Default license duration in days' },
      { key: 'max_devices_per_customer', value: '5', description: 'Default max devices per customer' },
      { key: 'rate_limit_requests', value: '100', description: 'Rate limit requests per hour' },
      { key: 'security_alert_email', value: 'security@turnkey.local', description: 'Security alerts email' }
    ];

    for (const setting of defaultSettings) {
      await this.db.prepare(`
        INSERT INTO system_settings (category, key, value, value_type, description, is_sensitive)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind('general', setting.key, setting.value, 'string', setting.description, false).run();
    }

    console.log('Database seeded with initial data');
  }
}