// Initialization endpoint to bootstrap production database with sample data
import { Hono } from 'hono'
import { DatabaseManager } from '../utils/database'

const init = new Hono<{ Bindings: { DB: D1Database } }>()

// Simple auth for initialization - use a query parameter
const INIT_SECRET = 'turnkey2024init'

init.get('/bootstrap', async (c) => {
  const secret = c.req.query('secret')
  if (secret !== INIT_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const db = new DatabaseManager(c.env.DB)

    // Create some basic data
    const queries = [
      // Basic license rules
      `INSERT OR IGNORE INTO license_rules (name, description, max_concurrent_sessions, max_devices, max_days, allow_offline_days, allowed_countries, is_active) 
       VALUES ('Standard License', 'Basic license for individual users', 2, 3, 365, 7, '["US", "CA", "GB", "AU"]', 1)`,
      
      // Basic products  
      `INSERT OR IGNORE INTO products (name, version, description, download_url, price, currency, category, status) 
       VALUES ('Professional Suite', '2.1.0', 'Advanced business automation software', 'https://example.com/downloads/pro-suite.exe', 199.99, 'USD', 'Business Software', 'active')`,
      
      // Basic customers
      `INSERT OR IGNORE INTO customers (name, email, product_id, license_key, license_type, status, registration_date, expires_at) 
       VALUES ('Demo Customer', 'demo@example.com', 1, 'DEMO-1234-5678-9ABC', 'standard', 'active', datetime('now'), datetime('now', '+1 year'))`,
      
      // Basic activation logs
      `INSERT OR IGNORE INTO activation_logs (customer_id, product_id, license_key, device_fingerprint, device_name, operating_system, ip_address, country_code, file_name, file_version, status, activation_time) 
       VALUES (1, 1, 'DEMO-1234-5678-9ABC', 'demo_device_fingerprint_12345', 'DEMO-PC', 'Windows 11 Pro', '192.168.1.100', 'US', 'ProSuite.exe', '2.1.0', 'valid', datetime('now'))`,
      
      // Create admin user (password hash for 'admin123')
      `INSERT OR IGNORE INTO admin_users (username, email, full_name, password_hash, salt, role) 
       VALUES ('admin', 'admin@example.com', 'System Administrator', 'hashed_admin123', 'salt123', 'super_admin')`
    ]

    const results = []
    for (const query of queries) {
      try {
        const result = await c.env.DB.prepare(query).run()
        results.push({ query: query.substring(0, 100) + '...', success: true, result })
      } catch (error) {
        results.push({ query: query.substring(0, 100) + '...', success: false, error: error.message })
      }
    }

    return c.json({ 
      message: 'Database bootstrap completed',
      results,
      next_steps: [
        'Visit /admin to access the admin panel',
        'Login with username: admin, password: admin123',
        'The dashboard should now show data'
      ]
    })

  } catch (error) {
    return c.json({ 
      error: 'Bootstrap failed', 
      details: error.message 
    }, 500)
  }
})

init.get('/check', async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB)
    
    const stats = await c.env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM activation_logs) as activations,
        (SELECT COUNT(*) FROM admin_users) as admins
    `).first()

    return c.json({ 
      message: 'Database status',
      stats,
      has_data: stats.customers > 0
    })
  } catch (error) {
    return c.json({ 
      error: 'Check failed',
      details: error.message,
      likely_cause: 'Database tables may not exist - tables are created automatically on first API call'
    }, 500)
  }
})

export { init }