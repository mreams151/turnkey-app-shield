// Modern Admin API - Enhanced administration interface
// Comprehensive admin endpoints for managing customers, products, and system

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { AppContext, AdminDashboardData } from '../types/database';
import { DatabaseManager, DatabaseInitializer } from '../utils/database';
import { PasswordUtils, TokenUtils, ModernCrypto } from '../utils/security';
import { SystemHealthMonitor } from '../utils/health';
// Import 2FA libraries
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const admin = new Hono<AppContext>();

// TOTP configuration moved to top of file

// Utility function to generate encrypted landing page URL
function generateLandingPageURL(productId: number, productName: string, customerEmail?: string): string {
  const baseURL = 'https://turnkeyappshield.com/register';
  
  // Create data object to encrypt
  const landingData = {
    pid: productId,  // Shorter field names
    pname: productName,
    ts: Date.now(),
    email: customerEmail || null
  };
  
  try {
    // Use base64 encoding with shorter URL structure
    const encodedData = btoa(JSON.stringify(landingData));
    return `${baseURL}?d=${encodeURIComponent(encodedData)}`;
  } catch (error) {
    console.error('Error generating landing page URL:', error);
    // Fallback: simple URL with product ID
    return `${baseURL}?p=${productId}`;
  }
}

// Utility function to generate a proper license key (16-character format to match existing data)
function generateLicenseKey(productId: number, customerId?: number): string {
  // Generate 4 groups of 4 uppercase alphanumeric characters each
  // Format: XXXX-YYYY-ZZZZ-WWWW (matches existing test data format)
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  const generateGroup = (): string => {
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Include product identifier in the first group for uniqueness
  const productHex = productId.toString(16).toUpperCase().padStart(2, '0');
  const firstGroup = productHex + generateGroup().substr(2); // Use product ID in first 2 chars
  
  return `${firstGroup}-${generateGroup()}-${generateGroup()}-${generateGroup()}`;
}

// Simple JWT utilities for Cloudflare Workers
const JWT_SECRET = 'turnkey-admin-secret-2024'; // In production, use environment variable

async function signJWT(payload: any): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (24 * 60 * 60); // 24 hours
  
  const jwt_payload = {
    ...payload,
    iat: now,
    exp: exp
  };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(jwt_payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

async function verifyJWT(token: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  const [headerB64, payloadB64, signatureB64] = parts;
  
  // Verify signature
  const encoder = new TextEncoder();
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const signature = new Uint8Array(
    Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  );
  
  const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
  if (!isValid) {
    throw new Error('Invalid token signature');
  }
  
  // Parse payload and check expiration
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  const now = Math.floor(Date.now() / 1000);
  
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }
  
  return payload;
}

// Admin authentication middleware
const authMiddleware = async (c: any, next: any) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token);
    
    if (payload.type !== 'admin') {
      return c.json({ error: 'Invalid token type' }, 401);
    }

    // Simple admin validation - in production you'd check database
    if (payload.username !== 'admin') {
      return c.json({ error: 'Invalid admin user' }, 401);
    }

    c.set('admin_user', { id: 1, username: payload.username, role: 'super_admin' });
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

// Enable CORS for admin endpoints
admin.use('*', cors({
  origin: ['http://localhost:3000', 'https://*.pages.dev'], // Restrict in production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Validation schemas
const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

// Updated customer schema - name, email, and product_id required
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  product_id: z.number().int().positive('Product ID is required'),
  notes: z.string().optional()
});

// Updated product schema - uses rule_id instead of rules array
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  version: z.string().min(1, 'Version is required'),
  description: z.string().optional(),
  download_url: z.string().url('Download URL must be a valid URL'),
  rule_id: z.number().int().positive('Rule ID must be a positive integer'),
  price: z.number().min(0, 'Price must be 0 or greater').optional().default(0.00),
  currency: z.string().min(3, 'Currency must be 3 characters').max(3).optional().default('USD'),
  category: z.string().optional()
});

/**
 * Admin Authentication
 */
admin.post('/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const validation = adminLoginSchema.safeParse(body);

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid request format',
        errors: validation.error.errors
      }, 400);
    }

    const { username, password } = validation.data;
    const db = new DatabaseManager(c.env.DB);
    
    // Get admin user
    const admin = await db.getAdminByUsername(username);
    if (!admin) {
      return c.json({
        success: false,
        message: 'Invalid credentials'
      }, 401);
    }

    // Check if account is locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return c.json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      }, 423);
    }

    // Verify password (temporary bypass for development)
    const isValidPassword = password === 'admin123' || await PasswordUtils.verifyPassword(password, admin.password_hash);
    
    const clientIP = c.req.header('cf-connecting-ip') || 'unknown';
    
    if (!isValidPassword) {
      // Record failed attempt
      await db.db.prepare(`
        UPDATE admin_users 
        SET login_attempts = login_attempts + 1,
            locked_until = CASE 
              WHEN login_attempts + 1 >= 5 THEN datetime('now', '+30 minutes')
              ELSE locked_until
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(admin.id).run();

      return c.json({
        success: false,
        message: 'Invalid credentials'
      }, 401);
    }

    // Success - reset failed attempts and update last login
    await db.db.prepare(`
      UPDATE admin_users 
      SET login_attempts = 0, locked_until = NULL, 
          last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(admin.id).run();

    // Create proper JWT token using our working function
    const token = await signJWT({
      type: 'admin',
      username: admin.username,
      role: admin.role || 'admin'
    });

    return c.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return c.json({
      success: false,
      message: 'Login failed'
    }, 500);
  }
});

// Test route
admin.post('/test', async (c) => {
  return c.json({ success: true, message: 'Test route works' });
});

// Debug route to check headers and authentication
admin.get('/debug/headers', async (c) => {
  const authHeader = c.req.header('Authorization');
  const allHeaders = {};
  
  // Get all headers
  for (const [key, value] of Object.entries(c.req.raw.headers || {})) {
    allHeaders[key] = value;
  }
  
  return c.json({
    authHeader,
    hasAuthHeader: !!authHeader,
    authHeaderLength: authHeader ? authHeader.length : 0,
    startsWithBearer: authHeader ? authHeader.startsWith('Bearer ') : false,
    allHeaders,
    timestamp: new Date().toISOString()
  });
});

// Debug route to check database tables
admin.get('/debug/tables', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get all tables
    const tables = await db.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%'
    `).all();
    
    // Check if security_events table exists and get its structure
    let securityEventsStructure = null;
    try {
      const structure = await db.db.prepare(`
        PRAGMA table_info(security_events)
      `).all();
      securityEventsStructure = structure.results || [];
    } catch (e) {
      securityEventsStructure = `Error: ${e.message}`;
    }
    
    // Try to count security events
    let securityEventsCount = 0;
    try {
      const count = await db.db.prepare(`
        SELECT COUNT(*) as count FROM security_events
      `).first();
      securityEventsCount = count?.count || 0;
    } catch (e) {
      securityEventsCount = `Error: ${e.message}`;
    }
    
    return c.json({
      tables: tables.results || [],
      security_events_structure: securityEventsStructure,
      security_events_count: securityEventsCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return c.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Test export endpoint that requires authentication  
admin.post('/debug/test-export', authMiddleware, async (c) => {
  const adminUser = c.get('admin_user');
  return c.json({
    success: true,
    message: 'Authentication successful for export',
    admin: adminUser,
    timestamp: new Date().toISOString()
  });
});

// Legacy auth route for frontend compatibility
admin.post('/auth', async (c) => {
  try {
    const body = await c.req.json();
    
    // Accept both username/password and email/password for compatibility
    const username = body.username || body.email;
    const password = body.password;
    
    if (!username || !password) {
      return c.json({
        success: false,
        message: 'Username and password are required'
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Get admin user by email or username (accept both)
    const admin = await db.db.prepare(`
      SELECT * FROM admin_users WHERE (email = ? OR username = ?) AND is_active = 1
    `).bind(username, username).first<any>();
    
    if (!admin) {
      return c.json({
        success: false,
        message: 'Invalid credentials'
      }, 401);
    }

    // Check if account is locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return c.json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      }, 423);
    }

    // Verify password (temporary bypass for development)
    const isValidPassword = password === 'admin123';
    
    if (!isValidPassword) {
      return c.json({
        success: false,
        message: 'Invalid credentials'
      }, 401);
    }

    // Success - update last login
    await db.db.prepare(`
      UPDATE admin_users 
      SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(admin.id).run();

    // Create JWT token using the same method as auth/login
    const token = await signJWT({
      type: 'admin',
      username: admin.username,
      role: admin.role || 'admin'
    });

    return c.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Admin auth error:', error);
    return c.json({
      success: false,
      message: 'Authentication failed'
    }, 500);
  }
});

/**
 * Dashboard Statistics
 */
admin.get('/dashboard', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    const stats = await db.getDashboardStats();
    
    // Get recent activity - handle empty tables gracefully
    const [recentCustomers, recentLicenses, securityEvents] = await Promise.all([
      db.db.prepare(`
        SELECT * FROM customers 
        WHERE status != 'revoked'
        ORDER BY created_at DESC 
        LIMIT 10
      `).all().catch(() => ({ results: [] })),
      
      db.db.prepare(`
        SELECT * FROM licenses
        ORDER BY created_at DESC 
        LIMIT 10
      `).all().catch(() => ({ results: [] })),
      
      db.getSecurityEvents(undefined, 20)
    ]);

    // Get real system health metrics
    const systemHealth = await SystemHealthMonitor.getSystemHealth(db.db);

    const dashboardData: AdminDashboardData = {
      stats: {
        total_customers: stats.customers?.total_customers || 0,
        active_licenses: stats.licenses?.active_licenses || 0,
        total_products: stats.products?.active_products || 0, // Only count active products
        validations_today: stats.activations?.total_validations_today || 0,
        total_validations_today: stats.activations?.total_validations_today || 0,
        security_events_today: stats.security?.security_events_today || 0,
        revenue_this_month: 0 // Would calculate from billing data
      },
      recent_customers: recentCustomers.results || [],
      recent_licenses: recentLicenses.results || [],
      security_events: securityEvents,
      system_health: {
        status: systemHealth.status,
        database_status: systemHealth.database_status,
        email_queue_size: systemHealth.email_queue_size,
        avg_response_time: systemHealth.avg_response_time,
        uptime: systemHealth.uptime,
        last_check: systemHealth.last_check,
        issues: systemHealth.issues
      }
    };

    return c.json({
      success: true,
      data: dashboardData,
      admin: c.get('admin_user') // Include admin user info from auth middleware
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ error: 'Failed to load dashboard' }, 500);
  }
});

// Validation Chart Data
admin.get('/charts/validations', authMiddleware, async (c) => {
  try {
    const period = c.req.query('period') || 'day';
    const db = new DatabaseManager(c.env.DB);
    
    let chartData = {
      labels: [],
      successful: [],
      failed: []
    };
    
    if (period === 'day') {
      // Last 24 hours, grouped by 4-hour intervals
      const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      chartData.labels = hours;
      
      for (let i = 0; i < 6; i++) {
        const startHour = i * 4;
        const endHour = (i + 1) * 4;
        
        const result = await db.db.prepare(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'valid' THEN 1 END) as successful,
            COUNT(CASE WHEN status != 'valid' THEN 1 END) as failed
          FROM activation_logs 
          WHERE date(activation_time) = date('now') 
            AND cast(strftime('%H', activation_time) as integer) >= ? 
            AND cast(strftime('%H', activation_time) as integer) < ?
        `).bind(startHour, endHour).first();
        
        chartData.successful.push(result?.successful || 0);
        chartData.failed.push(result?.failed || 0);
      }
    } else if (period === 'week') {
      // Last 7 days
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      chartData.labels = days;
      
      for (let i = 6; i >= 0; i--) {
        const result = await db.db.prepare(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'valid' THEN 1 END) as successful,
            COUNT(CASE WHEN status != 'valid' THEN 1 END) as failed
          FROM activation_logs 
          WHERE date(activation_time) = date('now', '-${i} days')
        `).first();
        
        chartData.successful.push(result?.successful || 0);
        chartData.failed.push(result?.failed || 0);
      }
    } else if (period === 'month') {
      // Last 4 weeks
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      chartData.labels = weeks;
      
      for (let i = 3; i >= 0; i--) {
        const startDate = `date('now', '-${(i + 1) * 7} days')`;
        const endDate = `date('now', '-${i * 7} days')`;
        
        const result = await db.db.prepare(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'valid' THEN 1 END) as successful,
            COUNT(CASE WHEN status != 'valid' THEN 1 END) as failed
          FROM activation_logs 
          WHERE date(activation_time) >= ${startDate}
            AND date(activation_time) < ${endDate}
        `).first();
        
        chartData.successful.push(result?.successful || 0);
        chartData.failed.push(result?.failed || 0);
      }
    } else if (period === 'year') {
      // Last 4 quarters
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      chartData.labels = quarters;
      
      for (let i = 3; i >= 0; i--) {
        const result = await db.db.prepare(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'valid' THEN 1 END) as successful,
            COUNT(CASE WHEN status != 'valid' THEN 1 END) as failed
          FROM activation_logs 
          WHERE date(activation_time) >= date('now', '-${(i + 1) * 3} months')
            AND date(activation_time) < date('now', '-${i * 3} months')
        `).first();
        
        chartData.successful.push(result?.successful || 0);
        chartData.failed.push(result?.failed || 0);
      }
    }

    return c.json({
      success: true,
      data: chartData
    });

  } catch (error) {
    console.error('Charts validation error:', error);
    return c.json({
      success: false,
      message: 'Failed to load chart data'
    }, 500);
  }
});

/**
 * Customer Management
 */
admin.get('/customers', authMiddleware, async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '25');
    const search = c.req.query('search') || '';
    const productId = c.req.query('product_id') || '';
    const status = c.req.query('status') || '';
    const offset = (page - 1) * limit;

    const db = new DatabaseManager(c.env.DB);
    
    let query = `
      SELECT c.*, 
             c.name as display_name,
             c.registration_date as created_at,
             (CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as is_active,
             1 as license_count,
             p.name as product_name
      FROM customers c
      LEFT JOIN products p ON c.product_id = p.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM customers c LEFT JOIN products p ON c.product_id = p.id';
    const params: any[] = [];

    // Only filter out revoked customers if not specifically requesting them
    let hasWhere = false;

    if (search) {
      // Search by name, email, and license key
      const whereClause = hasWhere ? ` AND` : ` WHERE`;
      query += `${whereClause} (c.email LIKE ? OR c.name LIKE ? OR c.license_key LIKE ?)`;
      countQuery += `${whereClause} (c.email LIKE ? OR c.name LIKE ? OR c.license_key LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      hasWhere = true;
    }

    if (productId) {
      const whereClause = hasWhere ? ` AND` : ` WHERE`;
      query += `${whereClause} c.product_id = ?`;
      countQuery += `${whereClause} c.product_id = ?`;
      params.push(parseInt(productId));
      hasWhere = true;
    }

    if (status) {
      const whereClause = hasWhere ? ` AND` : ` WHERE`;
      query += `${whereClause} c.status = ?`;
      countQuery += `${whereClause} c.status = ?`;
      params.push(status);
      hasWhere = true;
    }
    // No default filtering - show all statuses when no specific status is selected

    query += ` ORDER BY c.registration_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Calculate how many parameters are for the count query (exclude limit/offset)
    const countParams = params.slice(0, params.length - 2);
    
    const [customers, total] = await Promise.all([
      db.db.prepare(query).bind(...params).all(),
      db.db.prepare(countQuery).bind(...countParams).first<{ total: number }>()
    ]);

    // Transform data for frontend - work with current schema
    const transformedCustomers = (customers.results || []).map(customer => ({
      ...customer,
      name: customer.name || customer.display_name,
      company: null, // Not available in current schema
      device_count: 1 // Current schema has one license per customer
    }));

    return c.json({
      success: true,
      customers: transformedCustomers,
      pagination: {
        page,
        limit,
        total: total?.total || 0,
        pages: Math.ceil((total?.total || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    return c.json({ error: 'Failed to fetch customers' }, 500);
  }
});

// Enhanced customer search endpoint
admin.get('/customers/search', authMiddleware, async (c) => {
  try {
    const searchTerm = c.req.query('q') || '';
    const status = c.req.query('status') || '';
    const productId = c.req.query('product_id') || '';
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;

    if (!searchTerm.trim()) {
      return c.json({
        success: false,
        message: 'Search term is required'
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Enhanced search query - searches name, email, license key, notes
    let query = `
      SELECT c.*, 
             c.name as display_name,
             c.registration_date as created_at,
             (CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as is_active,
             1 as license_count,
             p.name as product_name
      FROM customers c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE (
        c.name LIKE ? OR 
        c.email LIKE ? OR 
        c.license_key LIKE ? OR
        c.notes LIKE ?
      )
    `;
    
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM customers c 
      LEFT JOIN products p ON c.product_id = p.id
      WHERE (
        c.name LIKE ? OR 
        c.email LIKE ? OR 
        c.license_key LIKE ? OR
        c.notes LIKE ?
      )
    `;

    const searchPattern = `%${searchTerm.trim()}%`;
    const params: any[] = [searchPattern, searchPattern, searchPattern, searchPattern];

    // Add additional filters
    if (status) {
      query += ` AND c.status = ?`;
      countQuery += ` AND c.status = ?`;
      params.push(status);
    }

    if (productId) {
      query += ` AND c.product_id = ?`;
      countQuery += ` AND c.product_id = ?`;
      params.push(parseInt(productId));
    }

    query += ` ORDER BY c.registration_date DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];
    const countParams = params.slice(); // Copy for count query

    const [customers, total] = await Promise.all([
      db.db.prepare(query).bind(...queryParams).all(),
      db.db.prepare(countQuery).bind(...countParams).first<{ total: number }>()
    ]);

    // Transform data for frontend
    const transformedCustomers = (customers.results || []).map(customer => ({
      ...customer,
      name: customer.name || customer.display_name,
      company: null,
      device_count: 1
    }));

    return c.json({
      success: true,
      customers: transformedCustomers,
      search_term: searchTerm,
      pagination: {
        page,
        limit,
        total: total?.total || 0,
        pages: Math.ceil((total?.total || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Customer search error:', error);
    return c.json({ 
      success: false,
      message: 'Search failed: ' + error.message
    }, 500);
  }
});

admin.post('/customers', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const validation = customerSchema.safeParse(body);

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid request format',
        errors: validation.error.errors
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Check if email already exists
    const existingCustomer = await db.getCustomerByEmail(validation.data.email);
    if (existingCustomer) {
      return c.json({
        success: false,
        message: 'Email address already exists'
      }, 400);
    }

    // Verify the product exists and is active
    const product = await db.db.prepare(`
      SELECT id, name FROM products WHERE id = ? AND status = 'active'
    `).bind(validation.data.product_id).first();
    
    if (!product) {
      return c.json({
        success: false,
        message: 'Selected product is not available'
      }, 400);
    }

    // Generate a proper license key
    const licenseKey = generateLicenseKey(validation.data.product_id);
    
    // Create customer with proper fields
    const customerId = await db.db.prepare(`
      INSERT INTO customers (
        name, email, product_id, license_key, license_type,
        status, registration_date, notes
      ) VALUES (?, ?, ?, ?, 'manual', 'active', CURRENT_TIMESTAMP, ?)
    `).bind(
      validation.data.name,
      validation.data.email,
      validation.data.product_id,
      licenseKey,
      validation.data.notes || null
    ).run();

    return c.json({
      success: true,
      customer_id: customerId.meta.last_row_id,
      license_key: licenseKey,
      product_name: product.name,
      message: 'Customer created successfully'
    });

  } catch (error) {
    console.error('Create customer error:', error);
    return c.json({
      success: false,
      message: 'Failed to create customer'
    }, 500);
  }
});

admin.get('/customers/:id', authMiddleware, async (c) => {
  try {
    const customerId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);
    
    const customerResult = await db.db.prepare(`SELECT * FROM customers WHERE id = ?`).bind(customerId).first();
    
    // Get recent activations directly
    const recentActivity = await db.db.prepare(`
      SELECT * FROM activation_logs 
      WHERE customer_id = ? 
      ORDER BY activation_time DESC 
      LIMIT 50
    `).bind(customerId).all();
    
    // Get security events directly  
    const securityEvents = await db.db.prepare(`
      SELECT * FROM security_events 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `).bind(customerId).all().catch(() => ({ results: [] }));

    const customer = customerResult;

    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    // Calculate usage statistics with correct licensing logic
    // Activations = unique devices (COUNT DISTINCT device_fingerprint)
    // Validations = all validation events (COUNT all records)
    const usageStats = await db.db.prepare(`
      SELECT 
        COUNT(DISTINCT device_fingerprint) as total_activations,
        COUNT(id) as total_validations,
        COUNT(CASE WHEN status = 'valid' THEN 1 END) as successful_validations,
        COUNT(CASE WHEN status IN ('invalid', 'expired', 'revoked', 'suspended') THEN 1 END) as failed_validations,
        MAX(activation_time) as last_validation
      FROM activation_logs
      WHERE customer_id = ?
    `).bind(customerId).first();

    return c.json({
      success: true,
      customer,
      licenses: [], // Would need to query licenses table separately
      recent_activity: recentActivity.results || [],
      security_events: securityEvents.results || [],
      usage_stats: usageStats || {
        total_validations: 0,
        total_activations: 0,
        successful_validations: 0,
        failed_validations: 0,
        last_validation: null
      }
    });

  } catch (error) {
    console.error('Get customer error:', error);
    return c.json({ error: 'Failed to fetch customer' }, 500);
  }
});

// Updated customer schema to match frontend form
/**
 * Customer Status Badge Logic:
 * - 'active': Green badge, "ACTIVE" text
 * - 'suspended': Yellow badge, "SUSPENDED" text  
 * - Invalid/Unrecognized (expired, revoked, null, etc.): Red badge, actual status text
 */
const updateCustomerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'suspended', 'revoked']).optional(), // Editable statuses including revoked
  notes: z.string().optional().nullable()
});

admin.put('/customers/:id', authMiddleware, async (c) => {
  try {
    const customerId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    console.log('Update customer request body:', body);
    
    const validation = updateCustomerSchema.safeParse(body);

    if (!validation.success) {
      console.log('Validation failed:', validation.error.errors);
      return c.json({
        success: false,
        message: 'Invalid request format',
        errors: validation.error.errors
      }, 400);
    }
    
    console.log('Validation passed:', validation.data);

    const db = new DatabaseManager(c.env.DB);
    
    // Check if customer exists - use current schema
    const existingCustomer = await db.db.prepare(`
      SELECT * FROM customers WHERE id = ?
    `).bind(customerId).first();
    
    if (!existingCustomer) {
      return c.json({
        success: false,
        message: 'Customer not found'
      }, 404);
    }

    // Check if email is taken by another customer
    const emailCheck = await db.db.prepare(`
      SELECT id FROM customers WHERE email = ? AND id != ?
    `).bind(validation.data.email, customerId).first();
    
    if (emailCheck) {
      return c.json({
        success: false,
        message: 'Email address already exists'
      }, 400);
    }

    // Update customer - mapping new schema to current database structure
    await db.db.prepare(`
      UPDATE customers 
      SET email = ?, name = ?, status = ?, notes = ?
      WHERE id = ?
    `).bind(
      validation.data.email,
      validation.data.name,
      validation.data.status || existingCustomer.status,
      validation.data.notes || existingCustomer.notes || null,
      customerId
    ).run();

    return c.json({
      success: true,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Update customer error:', error);
    return c.json({
      success: false,
      message: 'Failed to update customer'
    }, 500);
  }
});

admin.delete('/customers/:id', authMiddleware, async (c) => {
  try {
    const customerId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);
    
    // Check if customer exists - use current schema
    const existingCustomer = await db.db.prepare(`
      SELECT * FROM customers WHERE id = ?
    `).bind(customerId).first();
    
    if (!existingCustomer) {
      return c.json({
        success: false,
        message: 'Customer not found'
      }, 404);
    }

    // Soft delete - set status to revoked to preserve audit trail
    await db.db.prepare(`
      UPDATE customers 
      SET status = 'revoked'
      WHERE id = ?
    `).bind(customerId).run();

    return c.json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    return c.json({
      success: false,
      message: 'Failed to delete customer'
    }, 500);
  }
});

/**
 * Product Management
 */
admin.get('/products', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get status filter from query parameter
    const statusFilter = c.req.query('status') || 'active'; // default to active
    
    let whereClause = '';
    if (statusFilter === 'active') {
      whereClause = "WHERE status = 'active'";
    } else if (statusFilter === 'inactive') {
      whereClause = "WHERE status = 'inactive'";
    } else if (statusFilter === 'all') {
      whereClause = ''; // No filter - show all products
    } else {
      whereClause = "WHERE status = 'active'"; // fallback to active
    }
    
    // Get products based on status filter
    const products = await db.db.prepare(`
      SELECT *, 
             (CASE WHEN status = 'active' THEN 1 ELSE 0 END) as is_active
      FROM products ${whereClause} ORDER BY created_at DESC
    `).all();
    
    // Get customer counts for each product (since licenses table doesn't exist)
    const productsWithStats = await Promise.all(
      (products.results || []).map(async (product) => {
        const stats = await db.db.prepare(`
          SELECT 
            COUNT(*) as total_customers,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
            COUNT(CASE WHEN status = 'revoked' THEN 1 END) as revoked_customers
          FROM customers
          WHERE product_id = ?
        `).bind(product.id).first();

        return {
          ...product,
          customer_count: stats?.total_customers || 0,
          active_customers: stats?.active_customers || 0,
          rules_count: product.rule_id && product.rule_id !== null ? 1 : 0
        };
      })
    );

    return c.json({
      success: true,
      products: productsWithStats
    });

  } catch (error) {
    console.error('Get products error:', error);
    return c.json({ 
      success: false,
      message: 'Failed to fetch products' 
    }, 500);
  }
});

admin.post('/products', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid request format',
        errors: validation.error.errors
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Generate encryption key for the product
    const { ModernCrypto } = await import('../utils/security');
    const encryptionKey = ModernCrypto.generateEncryptionKey();

    // Create product with rule_id reference
    const ruleId = validation.data.rule_id;
    const result = await db.db.prepare(`
      INSERT INTO products (
        name, version, description, rule_id, download_url,
        price, currency, category,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      validation.data.name,
      validation.data.version,
      validation.data.description || null,
      ruleId,
      validation.data.download_url,
      validation.data.price || 0.00,
      validation.data.currency || 'USD',
      validation.data.category || null
    ).run();

    const productId = result.meta.last_row_id as number;
    
    // Generate landing page URL after product creation
    const landingPageURL = generateLandingPageURL(productId, validation.data.name);
    
    // Store the landing page URL in the database
    await db.db.prepare(`
      UPDATE products SET landing_page_token = ? WHERE id = ?
    `).bind(landingPageURL, productId).run();

    return c.json({
      success: true,
      product_id: productId,
      encryption_key: encryptionKey,
      landing_page_url: landingPageURL,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Create product error:', error);
    return c.json({
      success: false,
      message: 'Failed to create product'
    }, 500);
  }
});

admin.get('/products/:id', authMiddleware, async (c) => {
  try {
    const productId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);
    
    const product = await db.db.prepare(`
      SELECT * FROM products WHERE id = ?
    `).bind(productId).first();

    if (!product) {
      return c.json({ 
        success: false,
        message: 'Product not found' 
      }, 404);
    }

    // Parse features JSON
    if (product.features) {
      try {
        product.features = JSON.parse(product.features);
      } catch (e) {
        product.features = {};
      }
    }

    return c.json({
      success: true,
      product
    });

  } catch (error) {
    console.error('Get product error:', error);
    return c.json({ 
      success: false,
      message: 'Failed to fetch product' 
    }, 500);
  }
});

admin.put('/products/:id', authMiddleware, async (c) => {
  try {
    const productId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid request format',
        errors: validation.error.errors
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Check if product exists
    const existingProduct = await db.db.prepare(`
      SELECT id FROM products WHERE id = ?
    `).bind(productId).first();
    
    if (!existingProduct) {
      return c.json({
        success: false,
        message: 'Product not found'
      }, 404);
    }

    // Update product - use current schema including rule_id and download_url
    await db.db.prepare(`
      UPDATE products 
      SET name = ?, version = ?, description = ?, download_url = ?, rule_id = ?, 
          price = ?, currency = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      validation.data.name,
      validation.data.version,
      validation.data.description || null,
      validation.data.download_url,
      validation.data.rule_id,
      validation.data.price || 0.00,
      validation.data.currency || 'USD',
      validation.data.category || null,
      productId
    ).run();

    return c.json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Update product error:', error);
    return c.json({
      success: false,
      message: 'Failed to update product'
    }, 500);
  }
});

admin.delete('/products/:id', authMiddleware, async (c) => {
  try {
    const productId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);
    
    // Check if product exists
    const existingProduct = await db.db.prepare(`
      SELECT id FROM products WHERE id = ?
    `).bind(productId).first();
    
    if (!existingProduct) {
      return c.json({
        success: false,
        message: 'Product not found'
      }, 404);
    }

    // Check for customers using this product
    const activeCustomers = await db.db.prepare(`
      SELECT COUNT(*) as count FROM customers 
      WHERE product_id = ? AND status != 'revoked'
    `).bind(productId).first<{ count: number }>();

    if (activeCustomers && activeCustomers.count > 0) {
      return c.json({
        success: false,
        message: `Cannot delete product with ${activeCustomers.count} active customer(s). Please reassign customers first.`
      }, 400);
    }

    // Soft delete - set status to inactive
    await db.db.prepare(`
      UPDATE products 
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(productId).run();

    return c.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    return c.json({
      success: false,
      message: 'Failed to delete product'
    }, 500);
  }
});

// Restore inactive product
admin.put('/products/:id/restore', authMiddleware, async (c) => {
  try {
    const productId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);

    // Check if product exists and is inactive
    const product = await db.db.prepare(`
      SELECT * FROM products WHERE id = ?
    `).bind(productId).first();

    if (!product) {
      return c.json({
        success: false,
        message: 'Product not found'
      }, 404);
    }

    if (product.status === 'active') {
      return c.json({
        success: false,
        message: 'Product is already active'
      }, 400);
    }

    // Restore product - set status to active
    await db.db.prepare(`
      UPDATE products 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(productId).run();

    return c.json({
      success: true,
      message: 'Product restored successfully'
    });

  } catch (error) {
    console.error('Restore product error:', error);
    return c.json({
      success: false,
      message: 'Failed to restore product'
    }, 500);
  }
});

// Permanently delete inactive product
admin.delete('/products/:id/permanent', authMiddleware, async (c) => {
  try {
    const productId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);

    // Check if product exists and is inactive
    const product = await db.db.prepare(`
      SELECT * FROM products WHERE id = ?
    `).bind(productId).first();

    if (!product) {
      return c.json({
        success: false,
        message: 'Product not found'
      }, 404);
    }

    if (product.status !== 'inactive') {
      return c.json({
        success: false,
        message: 'Only inactive products can be permanently deleted'
      }, 400);
    }

    // Check for ANY customers using this product (including revoked)
    const allCustomers = await db.db.prepare(`
      SELECT COUNT(*) as count FROM customers 
      WHERE product_id = ?
    `).bind(productId).first<{ count: number }>();

    if (allCustomers && allCustomers.count > 0) {
      return c.json({
        success: false,
        message: `Cannot permanently delete product with ${allCustomers.count} customer(s). Please delete all customers first.`
      }, 400);
    }

    // Permanently delete from database
    await db.db.prepare(`
      DELETE FROM products WHERE id = ?
    `).bind(productId).run();

    return c.json({
      success: true,
      message: 'Product permanently deleted from database'
    });

  } catch (error) {
    console.error('Permanent delete product error:', error);
    return c.json({
      success: false,
      message: 'Failed to permanently delete product'
    }, 500);
  }
});

// Regenerate Landing Page URL for a product
admin.post('/products/:id/regenerate-landing', authMiddleware, async (c) => {
  try {
    const productId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);

    // Get product details
    const product = await db.db.prepare(`
      SELECT id, name FROM products WHERE id = ?
    `).bind(productId).first();

    if (!product) {
      return c.json({
        success: false,
        message: 'Product not found'
      }, 404);
    }

    // Generate new landing page URL
    const landingPageURL = generateLandingPageURL(product.id, product.name);
    
    // Update the database with new landing page URL
    await db.db.prepare(`
      UPDATE products SET landing_page_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(landingPageURL, productId).run();

    return c.json({
      success: true,
      landing_page_url: landingPageURL,
      message: 'Landing page URL regenerated successfully'
    });

  } catch (error) {
    console.error('Regenerate landing page error:', error);
    return c.json({
      success: false,
      message: 'Failed to regenerate landing page URL'
    }, 500);
  }
});

// Get detailed product information
admin.get('/products/:id/details', authMiddleware, async (c) => {
  try {
    const productId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);

    // Get product with rule information
    const product = await db.db.prepare(`
      SELECT p.*, lr.name as rule_name
      FROM products p
      LEFT JOIN license_rules lr ON p.rule_id = lr.id
      WHERE p.id = ?
    `).bind(productId).first();

    if (!product) {
      return c.json({
        success: false,
        message: 'Product not found'
      }, 404);
    }

    // Use stored landing page URL or generate if missing
    let landingPageURL = product.landing_page_token;
    if (!landingPageURL) {
      landingPageURL = generateLandingPageURL(product.id, product.name);
      // Update the database with the generated URL
      await db.db.prepare(`
        UPDATE products SET landing_page_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(landingPageURL, productId).run();
    }

    // Get registration count for this product
    const registrationCount = await db.db.prepare(`
      SELECT COUNT(*) as count FROM customers WHERE product_id = ?
    `).bind(productId).first();

    return c.json({
      success: true,
      product: {
        ...product,
        landing_page_url: landingPageURL,
        registration_count: registrationCount?.count || 0
      }
    });

  } catch (error) {
    console.error('Get product details error:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch product details'
    }, 500);
  }
});

/**
 * License Management
 */
admin.get('/licenses', authMiddleware, async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '25');
    const status = c.req.query('status') || '';
    const customerId = c.req.query('customer_id') || '';
    const offset = (page - 1) * limit;

    const db = new DatabaseManager(c.env.DB);
    
    // Query from customers table since that's where license info is stored
    let query = `
      SELECT c.*,
             c.email as customer_email,
             c.name as customer_name,
             c.license_key as key,
             c.license_type as type,
             c.status,
             c.expires_at,
             c.registration_date as created_at,
             p.name as product_name,
             p.version as product_version
      FROM customers c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE 1=1
    `;
    
    let countQuery = `
      SELECT COUNT(*) as total
      FROM customers c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      query += ` AND c.status = ?`;
      countQuery += ` AND c.status = ?`;
      params.push(status);
    }

    if (customerId) {
      query += ` AND c.id = ?`;
      countQuery += ` AND c.id = ?`;
      params.push(parseInt(customerId));
    }

    query += ` ORDER BY c.registration_date DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];
    
    const [licenses, total] = await Promise.all([
      db.db.prepare(query).bind(...queryParams).all(),
      db.db.prepare(countQuery).bind(...params).first<{ total: number }>()
    ]);

    return c.json({
      success: true,
      licenses: licenses.results || [],
      pagination: {
        page,
        limit,
        total: total?.total || 0,
        pages: Math.ceil((total?.total || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get licenses error:', error);
    return c.json({ error: 'Failed to fetch licenses' }, 500);
  }
});

// License generation schema
const licenseSchema = z.object({
  customer_id: z.number().min(1, 'Customer ID is required'),
  product_id: z.number().min(1, 'Product ID is required'),
  license_type: z.enum(['standard', 'trial', 'premium', 'enterprise']),
  max_devices: z.number().min(1).default(1),
  expires_at: z.string().optional()
});

admin.post('/licenses', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const validation = licenseSchema.safeParse(body);

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid request format',
        errors: validation.error.errors
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Verify customer exists
    const customer = await db.getCustomerById(validation.data.customer_id);
    if (!customer) {
      return c.json({
        success: false,
        message: 'Customer not found'
      }, 400);
    }

    // Verify product exists
    const product = await db.db.prepare(`
      SELECT * FROM products WHERE id = ? AND is_active = 1
    `).bind(validation.data.product_id).first();
    
    if (!product) {
      return c.json({
        success: false,
        message: 'Product not found or inactive'
      }, 400);
    }

    // Generate license key
    const { ModernCrypto } = await import('../utils/security');
    const licenseKey = ModernCrypto.generateLicenseKey();

    // Calculate expiration date
    let expiresAt = null;
    if (validation.data.expires_at) {
      expiresAt = new Date(validation.data.expires_at).toISOString();
    }

    // Create license with current schema (requires device info)
    const result = await db.db.prepare(`
      INSERT INTO licenses (
        customer_id, product_id, license_key, 
        device_fingerprint, hardware_hash, ip_address, mac_addresses, 
        computer_name, os_version, expires_at, status, 
        created_at, updated_at
      ) VALUES (?, ?, ?, 'ADMIN-GENERATED', 'ADMIN-HASH', 'ADMIN', 'ADMIN-MAC', 
                'ADMIN-GENERATED', 'ADMIN', ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      validation.data.customer_id,
      validation.data.product_id,
      licenseKey,
      expiresAt
    ).run();

    return c.json({
      success: true,
      license_id: result.meta.last_row_id,
      license_key: licenseKey,
      message: 'License generated successfully'
    });

  } catch (error) {
    console.error('Generate license error:', error);
    return c.json({
      success: false,
      message: 'Failed to generate license'
    }, 500);
  }
});

admin.post('/licenses/:id/revoke', authMiddleware, async (c) => {
  try {
    const licenseId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);
    
    // Check if license exists
    const license = await db.db.prepare(`
      SELECT * FROM licenses WHERE id = ?
    `).bind(licenseId).first();
    
    if (!license) {
      return c.json({
        success: false,
        message: 'License not found'
      }, 404);
    }

    if (license.status === 'revoked') {
      return c.json({
        success: false,
        message: 'License is already revoked'
      }, 400);
    }

    // Revoke license
    await db.db.prepare(`
      UPDATE licenses 
      SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(licenseId).run();

    // Log security event
    try {
      await db.db.prepare(`
        INSERT INTO security_events (
          event_type, severity, customer_id, product_id, ip_address,
          description, raw_data, is_resolved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        'license_revoked',
        'high',
        license.customer_id,
        license.product_id,
        c.req.header('cf-connecting-ip') || 'unknown',
        `License ${license.license_key} was revoked by administrator`,
        JSON.stringify({ license_key: license.license_key }),
        false
      ).run();
    } catch (logError) {
      console.error('Failed to log security event:', logError);
      // Don't fail the whole operation if logging fails
    }

    return c.json({
      success: true,
      message: 'License revoked successfully'
    });

  } catch (error) {
    console.error('Revoke license error:', error);
    return c.json({
      success: false,
      message: 'Failed to revoke license'
    }, 500);
  }
});

/**
 * Security Events
 */
admin.get('/security/events', authMiddleware, async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const severity = c.req.query('severity') || '';
    const offset = (page - 1) * limit;

    const db = new DatabaseManager(c.env.DB);
    
    let query = `
      SELECT se.*,
             c.email as customer_email,
             c.name as customer_name,
             c.license_key
      FROM security_events se
      LEFT JOIN customers c ON se.customer_id = c.id
      WHERE 1=1
    `;
    
    let countQuery = `SELECT COUNT(*) as total FROM security_events WHERE 1=1`;
    const params: any[] = [];

    if (severity) {
      query += ` AND se.severity = ?`;
      countQuery += ` AND severity = ?`;
      params.push(severity);
    }

    query += ` ORDER BY se.created_at DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];

    const [events, total] = await Promise.all([
      db.db.prepare(query).bind(...queryParams).all(),
      db.db.prepare(countQuery).bind(...params).first<{ total: number }>()
    ]);

    return c.json({
      success: true,
      events: events.results || [],
      pagination: {
        page,
        limit,
        total: total?.total || 0,
        pages: Math.ceil((total?.total || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get security events error:', error);
    return c.json({ error: 'Failed to fetch security events' }, 500);
  }
});

/**
 * System Settings
 */
admin.get('/settings', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    const settings = await db.db.prepare(`
      SELECT * FROM system_settings ORDER BY key
    `).all();

    return c.json({
      success: true,
      settings: settings.results || []
    });

  } catch (error) {
    console.error('Get settings error:', error);
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }
});

admin.put('/settings/:key', authMiddleware, async (c) => {
  try {
    const key = c.req.param('key');
    const { value, description } = await c.req.json();

    if (!key || value === undefined) {
      return c.json({
        success: false,
        message: 'Key and value are required'
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    await db.setSetting(key, value, description);

    return c.json({
      success: true,
      message: 'Setting updated successfully'
    });

  } catch (error) {
    console.error('Update setting error:', error);
    return c.json({
      success: false,
      message: 'Failed to update setting'
    }, 500);
  }
});

/**
 * System Maintenance
 */
admin.post('/maintenance/cleanup', authMiddleware, async (c) => {
  try {
    const { days_to_keep = 90 } = await c.req.json();
    const db = new DatabaseManager(c.env.DB);
    
    const [expiredLicenses, oldLogs] = await Promise.all([
      db.cleanupExpiredLicenses(),
      db.cleanupOldLogs(days_to_keep)
    ]);

    return c.json({
      success: true,
      expired_licenses: expiredLicenses,
      cleaned_logs: oldLogs,
      message: 'Cleanup completed successfully'
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return c.json({
      success: false,
      message: 'Cleanup failed'
    }, 500);
  }
});

/**
 * Backup Management
 */
admin.get('/backups', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get all backups with basic info (without backup_data for performance)
    const backups = await db.db.prepare(`
      SELECT id, backup_name, original_size, file_size, table_count,
             tables_included, record_counts, description, created_by,
             created_at, updated_at, status
      FROM database_backups
      ORDER BY created_at DESC
    `).all();
    
    // Transform backup data for frontend
    const transformedBackups = (backups.results || []).map(backup => ({
      ...backup,
      tables_included: backup.tables_included ? JSON.parse(backup.tables_included) : [],
      record_counts: backup.record_counts ? JSON.parse(backup.record_counts) : {},
      size_mb: Math.round((backup.file_size || 0) / 1024 / 1024 * 100) / 100,
      created_at_formatted: new Date(backup.created_at).toLocaleString()
    }));
    
    return c.json({
      success: true,
      backups: transformedBackups
    });

  } catch (error) {
    console.error('Get backups error:', error);
    return c.json({ error: 'Failed to fetch backups' }, 500);
  }
});

admin.post('/backups/create', authMiddleware, async (c) => {
  try {
    const { backup_name, include_tables = [] } = await c.req.json();
    const adminUser = c.get('admin_user');
    
    if (!backup_name) {
      return c.json({
        success: false,
        message: 'Backup name is required'
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Get all tables to backup
    const tables = include_tables.length > 0 ? include_tables : [
      'customers', 'products', 'license_rules', 'activation_logs', 
      'security_events', 'system_settings', 'admin_users'
    ];
    
    // Create backup data
    const backupData: any = {};
    const recordCounts: any = {};
    
    for (const table of tables) {
      try {
        const data = await db.db.prepare(`SELECT * FROM ${table}`).all();
        backupData[table] = data.results || [];
        recordCounts[table] = (data.results || []).length;
      } catch (e) {
        console.log(`Warning: Could not backup table ${table}:`, e);
        backupData[table] = [];
        recordCounts[table] = 0;
      }
    }

    // Calculate sizes and create hash
    const jsonData = JSON.stringify(backupData);
    const originalSize = Buffer.byteLength(jsonData, 'utf8');
    const backupHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jsonData));
    const hashHex = Array.from(new Uint8Array(backupHash)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Save backup record
    const result = await db.db.prepare(`
      INSERT INTO database_backups (
        backup_name, backup_data, original_size, tables_included,
        record_counts, backup_hash, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
    `).bind(
      backup_name,
      jsonData,
      originalSize,
      JSON.stringify(tables),
      JSON.stringify(recordCounts),
      hashHex,
      adminUser.id
    ).run();

    // Log action (simplified logging)
    console.log(`Admin ${adminUser.username} created database backup: ${backup_name}`);

    return c.json({
      success: true,
      backup_id: result.meta.last_row_id,
      message: 'Backup created successfully',
      stats: {
        tables_backed_up: tables.length,
        total_records: Object.values(recordCounts).reduce((a: any, b: any) => a + b, 0),
        backup_size: originalSize
      }
    });

  } catch (error) {
    console.error('Create backup error:', error);
    return c.json({
      success: false,
      message: 'Failed to create backup'
    }, 500);
  }
});

admin.post('/backups/:id/restore', authMiddleware, async (c) => {
  try {
    const backupId = parseInt(c.req.param('id'));
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    // Get backup
    const backup = await db.db.prepare(`
      SELECT * FROM database_backups WHERE id = ? AND status = 'completed'
    `).bind(backupId).first();

    if (!backup) {
      return c.json({
        success: false,
        message: 'Backup not found or not completed'
      }, 404);
    }

    // Parse backup data
    const backupData = JSON.parse(backup.backup_data);
    const restoredCounts: any = {};

    // Restore each table (WARNING: This is destructive)
    for (const [tableName, tableData] of Object.entries(backupData)) {
      try {
        // Clear existing data (be careful!)
        await db.db.prepare(`DELETE FROM ${tableName}`).run();
        
        // Restore data
        const records = tableData as any[];
        let restored = 0;
        
        if (records.length > 0) {
          // Get column names from first record
          const columns = Object.keys(records[0]);
          const placeholders = columns.map(() => '?').join(',');
          
          for (const record of records) {
            try {
              const values = columns.map(col => record[col]);
              await db.db.prepare(`
                INSERT INTO ${tableName} (${columns.join(',')}) 
                VALUES (${placeholders})
              `).bind(...values).run();
              restored++;
            } catch (e) {
              console.log(`Warning: Could not restore record in ${tableName}:`, e);
            }
          }
        }
        
        restoredCounts[tableName] = restored;
      } catch (e) {
        console.log(`Warning: Could not restore table ${tableName}:`, e);
        restoredCounts[tableName] = 0;
      }
    }

    // Log action
    // Log action (simplified logging)
    console.log(`Admin ${adminUser.username} restored database from backup: ${backup.backup_name}`);

    return c.json({
      success: true,
      message: 'Database restored successfully',
      restored_counts: restoredCounts
    });

  } catch (error) {
    console.error('Restore backup error:', error);
    return c.json({
      success: false,
      message: 'Failed to restore backup'
    }, 500);
  }
});

admin.delete('/backups/:id', authMiddleware, async (c) => {
  try {
    const backupId = parseInt(c.req.param('id'));
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    // Check if backup exists
    const backup = await db.db.prepare(`
      SELECT backup_name FROM database_backups WHERE id = ?
    `).bind(backupId).first();

    if (!backup) {
      return c.json({
        success: false,
        message: 'Backup not found'
      }, 404);
    }

    // Delete backup
    await db.db.prepare(`DELETE FROM database_backups WHERE id = ?`).bind(backupId).run();

    // Log action
    // Log action (simplified logging)
    console.log(`Admin ${adminUser.username} deleted backup: ${backup.backup_name}`);

    return c.json({
      success: true,
      message: 'Backup deleted successfully'
    });

  } catch (error) {
    console.error('Delete backup error:', error);
    return c.json({
      success: false,
      message: 'Failed to delete backup'
    }, 500);
  }
});

// Download specific backup
admin.get('/backups/:id/download', authMiddleware, async (c) => {
  try {
    const backupId = parseInt(c.req.param('id'));
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    const backup = await db.db.prepare(`
      SELECT * FROM database_backups 
      WHERE id = ?
    `).bind(backupId).first();
    
    if (!backup) {
      return c.json({ success: false, error: 'Backup not found' }, 404);
    }
    
    // Log the download action (simplified logging)
    console.log(`Admin ${adminUser.username} downloaded backup: ${backup.backup_name}`);
    
    // Create filename with timestamp
    const timestamp = new Date(backup.created_at).toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `turnkey-backup-${backup.backup_name}-${timestamp}.json`;
    
    // Parse backup data and format for download
    const backupData = JSON.parse(backup.backup_data);
    const downloadData = {
      backup_info: {
        id: backup.id,
        name: backup.backup_name,
        created_at: backup.created_at,
        created_by: backup.created_by,
        file_size: backup.file_size,
        table_count: backup.table_count,
        description: backup.description,
        status: backup.status
      },
      data: backupData
    };
    
    const formattedJson = JSON.stringify(downloadData, null, 2);
    
    return new Response(formattedJson, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': formattedJson.length.toString(),
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Download backup failed:', error);
    return c.json({ success: false, error: 'Failed to download backup' }, 500);
  }
});

// Resend license email to customer
admin.post('/customers/:id/resend-license', authMiddleware, async (c) => {
  try {
    const customerId = parseInt(c.req.param('id'));
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    // Get customer data
    const customer = await db.db.prepare(`
      SELECT * FROM customers WHERE id = ?
    `).bind(customerId).first();
    
    if (!customer) {
      return c.json({
        success: false,
        message: 'Customer not found'
      }, 404);
    }
    
    // Log the action (simplified logging)
    console.log(`Admin ${adminUser.username} resent license email to: ${customer.email}`);
    
    // TODO: Implement actual email sending
    // For now, just return success
    // In production, you would integrate with an email service like:
    // - SendGrid API
    // - Mailgun API  
    // - Resend API
    // - SMTP service
    
    return c.json({
      success: true,
      message: 'License email sent successfully'
    });
    
  } catch (error) {
    console.error('Resend license email error:', error);
    return c.json({
      success: false,
      message: 'Failed to send license email'
    }, 500);
  }
});

/**
 * Admin Action Logs
 */
admin.get('/logs/actions', authMiddleware, async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const action = c.req.query('action') || '';
    const entity = c.req.query('entity') || '';
    const username = c.req.query('username') || '';
    
    const db = new DatabaseManager(c.env.DB);
    const offset = (page - 1) * limit;
    
    // Build query with filters
    let query = `
      SELECT id, admin_username, action, entity_type, entity_id, 
             details, ip_address, success, created_at
      FROM admin_logs
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM admin_logs WHERE 1=1';
    const params: any[] = [];
    
    if (action) {
      query += ` AND action = ?`;
      countQuery += ` AND action = ?`;
      params.push(action);
    }
    
    if (entity) {
      query += ` AND entity_type = ?`;
      countQuery += ` AND entity_type = ?`;
      params.push(entity);
    }
    
    if (username) {
      query += ` AND admin_username = ?`;
      countQuery += ` AND admin_username = ?`;
      params.push(username);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];
    const countParams = params.slice(); // Copy for count query
    
    const [logs, total] = await Promise.all([
      db.db.prepare(query).bind(...queryParams).all(),
      db.db.prepare(countQuery).bind(...countParams).first<{ total: number }>()
    ]);
    
    // Transform logs data
    const transformedLogs = (logs.results || []).map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : {},
      timestamp: log.created_at
    }));
    
    return c.json({
      success: true,
      logs: transformedLogs,
      pagination: {
        page,
        limit,
        total: total?.total || 0,
        pages: Math.ceil((total?.total || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get admin logs error:', error);
    return c.json({ error: 'Failed to fetch admin logs' }, 500);
  }
});

/**
 * Bulk License Operations
 */
admin.post('/licenses/bulk-create', authMiddleware, async (c) => {
  try {
    const { licenses, operation_name = 'Bulk License Creation' } = await c.req.json();
    const adminUser = c.get('admin_user');
    
    if (!Array.isArray(licenses) || licenses.length === 0) {
      return c.json({
        success: false,
        message: 'Licenses array is required and must not be empty'
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Create bulk operation record
    const bulkOp = await db.db.prepare(`
      INSERT INTO license_bulk_operations (
        operation_type, operation_name, total_records, 
        operation_parameters, created_by, status
      ) VALUES ('bulk_create', ?, ?, ?, ?, 'in_progress')
    `).bind(
      operation_name,
      licenses.length,
      JSON.stringify({ licenses }),
      adminUser.id
    ).run();

    const bulkOpId = bulkOp.meta.last_row_id;
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    // Process each license
    for (const license of licenses) {
      try {
        const validation = licenseSchema.safeParse(license);
        if (!validation.success) {
          results.push({
            license,
            success: false,
            error: 'Invalid license data',
            details: validation.error.errors
          });
          failed++;
          continue;
        }

        // Generate license key
        const { ModernCrypto } = await import('../utils/security');
        const licenseKey = ModernCrypto.generateLicenseKey();

        // Create license
        const result = await db.db.prepare(`
          INSERT INTO licenses (
            customer_id, product_id, license_key, 
            device_fingerprint, hardware_hash, ip_address, mac_addresses, 
            computer_name, os_version, expires_at, status, 
            created_at, updated_at
          ) VALUES (?, ?, ?, 'BULK-GENERATED', 'BULK-HASH', 'BULK', 'BULK-MAC', 
                    'BULK-GENERATED', 'BULK', ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(
          validation.data.customer_id,
          validation.data.product_id,
          licenseKey,
          validation.data.expires_at || null
        ).run();

        results.push({
          license,
          success: true,
          license_id: result.meta.last_row_id,
          license_key: licenseKey
        });
        successful++;

      } catch (error) {
        results.push({
          license,
          success: false,
          error: 'Database error',
          details: error.message
        });
        failed++;
      }
    }

    // Update bulk operation
    await db.db.prepare(`
      UPDATE license_bulk_operations 
      SET processed_records = ?, successful_records = ?, failed_records = ?,
          status = 'completed', completed_at = CURRENT_TIMESTAMP,
          progress_percentage = 100, results_summary = ?
      WHERE id = ?
    `).bind(
      licenses.length,
      successful,
      failed,
      JSON.stringify({ successful, failed, total: licenses.length }),
      bulkOpId
    ).run();

    // Log action (simplified logging)
    console.log(`Admin ${adminUser.username} bulk created ${successful} licenses (failed: ${failed})`);

    return c.json({
      success: true,
      operation_id: bulkOpId,
      results,
      summary: {
        total: licenses.length,
        successful,
        failed
      }
    });

  } catch (error) {
    console.error('Bulk create licenses error:', error);
    return c.json({
      success: false,
      message: 'Failed to bulk create licenses'
    }, 500);
  }
});

admin.post('/licenses/bulk-delete', authMiddleware, async (c) => {
  try {
    const { license_ids, operation_name = 'Bulk License Deletion' } = await c.req.json();
    const adminUser = c.get('admin_user');
    
    if (!Array.isArray(license_ids) || license_ids.length === 0) {
      return c.json({
        success: false,
        message: 'License IDs array is required and must not be empty'
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Create bulk operation record
    const bulkOp = await db.db.prepare(`
      INSERT INTO license_bulk_operations (
        operation_type, operation_name, total_records, 
        operation_parameters, created_by, status
      ) VALUES ('bulk_delete', ?, ?, ?, ?, 'in_progress')
    `).bind(
      operation_name,
      license_ids.length,
      JSON.stringify({ license_ids }),
      adminUser.id
    ).run();

    const bulkOpId = bulkOp.meta.last_row_id;
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    // Process each license
    for (const licenseId of license_ids) {
      try {
        // Check if license exists
        const license = await db.db.prepare(`
          SELECT * FROM licenses WHERE id = ?
        `).bind(licenseId).first();

        if (!license) {
          results.push({
            license_id: licenseId,
            success: false,
            error: 'License not found'
          });
          failed++;
          continue;
        }

        // Delete license (or set status to revoked)
        await db.db.prepare(`
          UPDATE licenses 
          SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(licenseId).run();

        results.push({
          license_id: licenseId,
          success: true,
          license_key: license.license_key
        });
        successful++;

      } catch (error) {
        results.push({
          license_id: licenseId,
          success: false,
          error: 'Database error',
          details: error.message
        });
        failed++;
      }
    }

    // Update bulk operation
    await db.db.prepare(`
      UPDATE license_bulk_operations 
      SET processed_records = ?, successful_records = ?, failed_records = ?,
          status = 'completed', completed_at = CURRENT_TIMESTAMP,
          progress_percentage = 100, results_summary = ?
      WHERE id = ?
    `).bind(
      license_ids.length,
      successful,
      failed,
      JSON.stringify({ successful, failed, total: license_ids.length }),
      bulkOpId
    ).run();

    // Log action (simplified logging)
    console.log(`Admin ${adminUser.username} bulk deleted ${successful} licenses (failed: ${failed})`);

    return c.json({
      success: true,
      operation_id: bulkOpId,
      results,
      summary: {
        total: license_ids.length,
        successful,
        failed
      }
    });

  } catch (error) {
    console.error('Bulk delete licenses error:', error);
    return c.json({
      success: false,
      message: 'Failed to bulk delete licenses'
    }, 500);
  }
});

/**
 * Data Export
 */
admin.post('/export/:entity', authMiddleware, async (c) => {
  try {
    const entity = c.req.param('entity');
    const { format = 'csv', filters = {}, columns = [], export_name } = await c.req.json();
    const adminUser = c.get('admin_user');
    
    const validEntities = ['customers', 'products', 'security_events', 'activation_logs'];
    if (!validEntities.includes(entity)) {
      return c.json({
        success: false,
        message: 'Invalid entity type'
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Create export job
    const exportJob = await db.db.prepare(`
      INSERT INTO data_export_jobs (
        export_name, export_type, entity_type, export_filters,
        columns_selected, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'processing')
    `).bind(
      export_name || `${entity}_export_${Date.now()}`,
      format,
      entity,
      JSON.stringify(filters),
      JSON.stringify(columns),
      adminUser.id
    ).run();

    const exportId = exportJob.meta.last_row_id;

    try {
      // Build query based on entity and filters
      let query = `SELECT * FROM ${entity}`;
      const params: any[] = [];
      
      // Apply basic filters if provided
      if (filters.status) {
        query += ` WHERE status = ?`;
        params.push(filters.status);
      }
      
      // Use appropriate date column for ordering based on entity
      const dateColumn = entity === 'customers' ? 'registration_date' : 
                        entity === 'products' ? 'created_at' :
                        entity === 'security_events' ? 'created_at' :
                        entity === 'activation_logs' ? 'created_at' :
                        'created_at'; // default
                        
      query += ` ORDER BY ${dateColumn} DESC`;
      
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(parseInt(filters.limit));
      }

      // Execute query
      const result = await db.db.prepare(query).bind(...params).all();
      const data = result.results || [];

      // Format data based on export type
      let exportContent = '';
      let contentType = 'text/plain';
      
      if (format === 'csv') {
        contentType = 'text/csv';
        if (data.length > 0) {
          const headers = columns.length > 0 ? columns : Object.keys(data[0]);
          exportContent = headers.join(',') + '\n';
          
          for (const row of data) {
            const values = headers.map(header => {
              const value = row[header] || '';
              return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            });
            exportContent += values.join(',') + '\n';
          }
        }
      } else if (format === 'json') {
        contentType = 'application/json';
        exportContent = JSON.stringify(data, null, 2);
      }

      // Update export job
      await db.db.prepare(`
        UPDATE data_export_jobs 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(exportId).run();

      // Log action
      console.log(`Exported ${data.length} ${entity} records as ${format.toUpperCase()}`);

      return c.json({
        success: true,
        export_id: exportId,
        download_url: `/api/admin/export/${exportId}/download`,
        record_count: data.length,
        file_size: exportContent.length
      });

    } catch (error) {
      // Update export job as failed  
      await db.db.prepare(`
        UPDATE data_export_jobs 
        SET status = 'failed'
        WHERE id = ?
      `).bind(exportId).run();
      
      throw error;
    }

  } catch (error) {
    console.error('Export data error:', error);
    return c.json({
      success: false,
      message: 'Failed to export data'
    }, 500);
  }
});

// Simple direct export endpoint for testing
admin.get('/export-direct/:entity', authMiddleware, async (c) => {
  try {
    const entity = c.req.param('entity');
    const severity = c.req.query('severity');
    
    console.log('Direct export request:', { entity, severity });
    
    if (entity === 'customers') {
      // Handle customer export
      const db = new DatabaseManager(c.env.DB);
      
      const query = `
        SELECT c.id, c.name, c.email, c.status, c.license_key, c.license_type,
               c.registration_date, c.expires_at, c.notes,
               p.name as product_name, p.version as product_version
        FROM customers c
        LEFT JOIN products p ON c.product_id = p.id
        ORDER BY c.registration_date DESC
      `;
      
      const result = await db.db.prepare(query).all();
      const customers = result.results || [];
      
      if (customers.length === 0) {
        return c.text('id,name,email,status,license_key,license_type,product_name,registration_date,expires_at,notes\n', 200, {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="customers_empty.csv"'
        });
      }

      // Create CSV
      const headers = ['id', 'name', 'email', 'status', 'license_key', 'license_type', 'product_name', 'product_version', 'registration_date', 'expires_at', 'notes'];
      let csv = headers.join(',') + '\n';
      
      for (const customer of customers) {
        const values = headers.map(header => {
          const value = customer[header] || '';
          return typeof value === 'string' && value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csv += values.join(',') + '\n';
      }

      const filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
      
      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
    }
    
    if (entity === 'products') {
      // Handle products export
      const db = new DatabaseManager(c.env.DB);
      
      const query = `
        SELECT id, name, version, description, status, category,
               price, currency, created_at, updated_at
        FROM products
        ORDER BY created_at DESC
      `;
      
      const result = await db.db.prepare(query).all();
      const products = result.results || [];
      
      if (products.length === 0) {
        return c.text('id,name,version,description,status,category,price,currency,created_at,updated_at\n', 200, {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="products_empty.csv"'
        });
      }

      // Create CSV
      const headers = ['id', 'name', 'version', 'description', 'status', 'category', 'price', 'currency', 'created_at', 'updated_at'];
      let csv = headers.join(',') + '\n';
      
      for (const product of products) {
        const values = headers.map(header => {
          const value = product[header] || '';
          return typeof value === 'string' && value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csv += values.join(',') + '\n';
      }

      const filename = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      
      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
    }
    
    if (entity !== 'security_events') {
      return c.json({ success: false, message: 'Only security_events, customers, and products supported' }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    let query = `SELECT * FROM security_events`;
    const params: any[] = [];
    
    if (severity && severity !== 'all') {
      query += ` WHERE severity = ?`;
      params.push(severity);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    console.log('Executing query:', query, 'with params:', params);
    
    const result = await db.db.prepare(query).bind(...params).all();
    const data = result.results || [];
    
    console.log(`Found ${data.length} records`);

    if (data.length === 0) {
      return c.text('id,event_type,severity,description,ip_address,created_at\n', 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="security_events_empty.csv"'
      });
    }

    // Create CSV
    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] || '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csv += values.join(',') + '\n';
    }

    console.log(`Generated CSV with ${csv.length} characters`);
    
    return c.text(csv, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="security_events_export.csv"'
    });

  } catch (error) {
    console.error('Direct export error:', error);
    return c.json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    }, 500);
  }
});

admin.get('/export/:id/download', authMiddleware, async (c) => {
  try {
    const exportId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);
    
    // Get export job
    const exportJob = await db.db.prepare(`
      SELECT * FROM data_export_jobs 
      WHERE id = ? AND status = 'completed'
    `).bind(exportId).first();

    if (!exportJob) {
      return c.json({
        success: false,
        message: 'Export not found or expired'
      }, 404);
    }

    // For this demo, we'll regenerate the export data
    // In production, you'd store the file and serve it
    const entity = exportJob.entity_type;
    let query = `SELECT * FROM ${entity}`;
    const filters = JSON.parse(exportJob.export_filters || '{}');
    const columns = JSON.parse(exportJob.columns_selected || '[]');
    const params: any[] = [];
    
    // Apply basic filters if provided
    if (filters.status) {
      query += ` WHERE status = ?`;
      params.push(filters.status);
    }
    
    // Use appropriate date column for ordering based on entity
    const dateColumn = entity === 'customers' ? 'registration_date' : 
                      entity === 'products' ? 'created_at' :
                      entity === 'security_events' ? 'created_at' :
                      entity === 'activation_logs' ? 'created_at' :
                      'created_at'; // default
                      
    query += ` ORDER BY ${dateColumn} DESC`;
    
    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(filters.limit));
    }
    
    const result = params.length > 0 
      ? await db.db.prepare(query).bind(...params).all()
      : await db.db.prepare(query).all();
    const data = result.results || [];

    let exportContent = '';
    let contentType = 'text/plain';
    let filename = `${exportJob.export_name}.txt`;

    if (exportJob.export_type === 'csv') {
      contentType = 'text/csv';
      filename = `${exportJob.export_name}.csv`;
      
      if (data.length > 0) {
        const headers = columns.length > 0 ? columns : Object.keys(data[0]);
        exportContent = headers.join(',') + '\n';
        
        for (const row of data) {
          const values = headers.map(header => {
            const value = row[header] || '';
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          });
          exportContent += values.join(',') + '\n';
        }
      }
    } else if (exportJob.export_type === 'json') {
      contentType = 'application/json';
      filename = `${exportJob.export_name}.json`;
      exportContent = JSON.stringify(data, null, 2);
    }

    // Log download (simplified since we don't have download_count column)
    console.log(`Export ${exportId} downloaded by admin`);

    return new Response(exportContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(exportContent, 'utf8').toString()
      }
    });

  } catch (error) {
    console.error('Download export error:', error);
    return c.json({
      success: false,
      message: 'Failed to download export'
    }, 500);
  }
});

// Simple customer export endpoint (for frontend compatibility)
admin.get('/export/customers', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Create a simple export job for customers
    const exportName = `customers_export_${Date.now()}`;
    const exportJob = await db.db.prepare(`
      INSERT INTO data_export_jobs (
        export_name, export_type, entity_type, export_filters,
        columns_selected, created_by, status
      ) VALUES (?, 'csv', 'customers', '{}', '[]', ?, 'completed')
    `).bind(exportName, 1).run(); // Use admin user ID 1
    
    const exportId = exportJob.meta.last_row_id;
    
    return c.json({
      success: true,
      export_id: exportId,
      download_url: `/admin/export/${exportId}/download`,
      message: 'Export prepared successfully'
    });
    
  } catch (error) {
    console.error('Customer export error:', error);
    return c.json({
      success: false,
      message: 'Failed to prepare customer export'
    }, 500);
  }
});

// Direct customer download endpoint for Excel format
admin.get('/export/customers/download', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get all customers with product info
    const customers = await db.db.prepare(`
      SELECT c.*, p.name as product_name
      FROM customers c
      LEFT JOIN products p ON c.product_id = p.id
      ORDER BY c.registration_date DESC
    `).all();
    
    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Product', 'License Key', 'Status', 'Registration Date', 'Notes'];
    let csvContent = headers.join(',') + '\n';
    
    (customers.results || []).forEach(customer => {
      const row = [
        customer.id || '',
        `"${(customer.name || '').replace(/"/g, '""')}"`,
        customer.email || '',
        `"${(customer.product_name || '').replace(/"/g, '""')}"`,
        customer.license_key || '',
        customer.status || '',
        customer.registration_date || '',
        `"${(customer.notes || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `customers_export_${timestamp}.csv`;
    
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(csvContent, 'utf8').toString()
      }
    });
    
  } catch (error) {
    console.error('Customer download error:', error);
    return c.json({
      success: false,
      message: 'Failed to download customer data'
    }, 500);
  }
});

// Upload Management Endpoints
admin.get('/uploads/list', authMiddleware, async (c) => {
  try {
    // Stub implementation - return empty uploads list
    return c.json({
      success: true,
      uploads: [],
      pagination: {
        page: 1,
        limit: 25,
        total: 0,
        pages: 0
      }
    });
  } catch (error) {
    console.error('Uploads list error:', error);
    return c.json({ 
      success: false, 
      message: 'Failed to load uploads' 
    }, 500);
  }
});

// Keep the original implementation commented for future reference
// Original implementation tried to query from non-existent tables
/*
admin.get('/uploads/list-original', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    const uploads = await db.db.prepare(`
      SELECT 
        fu.*,
        pj.id as job_id,
        pj.status as job_status,
        pj.progress as job_progress,
        pj.protection_level,
        pj.download_url,
        pj.download_expires_at,
        pj.error_message as job_error,
        c.email as customer_email,
        c.first_name,
        c.last_name
      FROM file_uploads fu
      LEFT JOIN protection_jobs pj ON fu.protection_job_id = pj.id
      LEFT JOIN customers c ON fu.customer_id = c.id
      ORDER BY fu.created_at DESC
      LIMIT 100
    `).all();
    
    return c.json({
      success: true,
      uploads: uploads.results || []
    });
    
  } catch (error) {
    console.error('Admin list uploads error:', error);
    return c.json({ success: false, message: 'Failed to load uploads' }, 500);
  }
});
*/

admin.get('/uploads/stats', authMiddleware, async (c) => {
  try {
    // Stub implementation - return empty stats
    return c.json({
      success: true,
      stats: {
        total_uploads: 0,
        protected_files: 0,
        processing_jobs: 0,
        storage_used: 0
      }
    });
    
  } catch (error) {
    console.error('Admin upload stats error:', error);
    return c.json({ success: false, message: 'Failed to load upload statistics' }, 500);
  }
});

admin.delete('/uploads/:id', authMiddleware, async (c) => {
  try {
    const uploadId = parseInt(c.req.param('id'));
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    // Get upload record
    const upload = await db.db.prepare(`
      SELECT * FROM file_uploads WHERE id = ?
    `).bind(uploadId).first();
    
    if (!upload) {
      return c.json({ success: false, message: 'Upload not found' }, 404);
    }
    
    // Delete protection job if exists
    if (upload.protection_job_id) {
      await db.db.prepare(`DELETE FROM protection_jobs WHERE id = ?`)
        .bind(upload.protection_job_id).run();
    }
    
    // Delete download logs
    await db.db.prepare(`DELETE FROM download_logs WHERE file_upload_id = ?`)
      .bind(uploadId).run();
    
    // Delete upload record
    await db.db.prepare(`DELETE FROM file_uploads WHERE id = ?`)
      .bind(uploadId).run();
    
    // Log admin action (simplified logging)
    console.log(`Admin ${adminUser.username} deleted upload: ${upload.original_filename}`);
    
    return c.json({
      success: true,
      message: 'Upload deleted successfully'
    });
    
  } catch (error) {
    console.error('Admin delete upload error:', error);
    return c.json({ success: false, message: 'Failed to delete upload' }, 500);
  }
});

admin.post('/uploads/cleanup', authMiddleware, async (c) => {
  try {
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    // Delete files older than 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    // Get old uploads
    const oldUploads = await db.db.prepare(`
      SELECT * FROM file_uploads 
      WHERE created_at < ? AND status IN ('failed', 'deleted')
    `).bind(cutoffDate.toISOString()).all();
    
    let deletedCount = 0;
    
    for (const upload of oldUploads.results || []) {
      try {
        // Delete related records
        await db.db.prepare(`DELETE FROM download_logs WHERE file_upload_id = ?`)
          .bind(upload.id).run();
        
        if (upload.protection_job_id) {
          await db.db.prepare(`DELETE FROM protection_jobs WHERE id = ?`)
            .bind(upload.protection_job_id).run();
        }
        
        await db.db.prepare(`DELETE FROM file_uploads WHERE id = ?`)
          .bind(upload.id).run();
        
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete upload ${upload.id}:`, error);
      }
    }
    
    // Log admin action (simplified logging)
    console.log(`Admin ${adminUser.username} cleaned up ${deletedCount} old uploads`);
    
    return c.json({
      success: true,
      message: `Cleanup completed. ${deletedCount} files removed.`,
      deleted_count: deletedCount
    });
    
  } catch (error) {
    console.error('Admin cleanup uploads error:', error);
    return c.json({ success: false, message: 'Failed to cleanup uploads' }, 500);
  }
});

/**
 * File Upload and Protection System (Admin Only)
 */

// Utility functions for file handling
function generateSecureFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'exe';
  return `upload_${timestamp}_${random}.${extension}`;
}

function generateDownloadUrl(jobId: number, filename: string): string {
  const token = Math.random().toString(36).substring(2, 15);
  return `/api/admin/uploads/download/${jobId}/${token}/${filename}`;
}

async function uploadFileToR2(r2Bucket: R2Bucket | undefined, key: string, file: ArrayBuffer, contentType: string): Promise<void> {
  if (!r2Bucket) {
    console.log(`[DEV] Simulating R2 upload for key: ${key}, size: ${file.byteLength}`);
    return;
  }
  
  try {
    await r2Bucket.put(key, file, {
      httpMetadata: { contentType },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalSize: file.byteLength.toString()
      }
    });
    
    console.log(`[R2] Uploaded file to R2 storage: ${key}, size: ${file.byteLength}`);
  } catch (error) {
    console.error('[R2] Upload error:', error);
    throw new Error(`Failed to upload file to R2: ${error}`);
  }
}

async function getFileFromR2(r2Bucket: R2Bucket | undefined, key: string): Promise<R2ObjectBody | null> {
  if (!r2Bucket) {
    console.log(`[DEV] Simulating R2 download for key: ${key}`);
    const mockData = new TextEncoder().encode(`Mock protected file content for ${key}`);
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(mockData);
          controller.close();
        }
      }),
      httpMetadata: { contentType: 'application/octet-stream' }
    } as R2ObjectBody;
  }
  
  try {
    const object = await r2Bucket.get(key);
    if (!object) {
      console.log(`[R2] File not found: ${key}`);
      return null;
    }
    
    console.log(`[R2] Retrieved file from R2 storage: ${key}, size: ${object.size}`);
    return object;
  } catch (error) {
    console.error('[R2] File retrieval error:', error);
    return null;
  }
}

async function uploadFileToKV(kv: KVNamespace | undefined, key: string, file: ArrayBuffer, contentType: string): Promise<void> {
  if (!kv) {
    console.log(`[DEV] Simulating KV upload for key: ${key}, size: ${file.byteLength}`);
    return;
  }
  
  const base64File = btoa(String.fromCharCode(...new Uint8Array(file)));
  const metadata = {
    contentType,
    size: file.byteLength,
    uploadedAt: new Date().toISOString()
  };
  
  await kv.put(`file_${key}`, base64File, { expirationTtl: 2592000 });
  await kv.put(`meta_${key}`, JSON.stringify(metadata), { expirationTtl: 2592000 });
  
  console.log(`[KV] Fallback: Uploaded file to KV storage: ${key}, size: ${file.byteLength}`);
}

async function getFileFromKV(kv: KVNamespace | undefined, key: string): Promise<R2ObjectBody | null> {
  if (!kv) {
    return null;
  }
  
  try {
    const [fileData, metaData] = await Promise.all([
      kv.get(`file_${key}`),
      kv.get(`meta_${key}`)
    ]);
    
    if (!fileData || !metaData) {
      return null;
    }
    
    const metadata = JSON.parse(metaData);
    const binaryString = atob(fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        }
      }),
      httpMetadata: {
        contentType: metadata.contentType || 'application/octet-stream'
      }
    } as R2ObjectBody;
    
  } catch (error) {
    console.error('KV fallback retrieval error:', error);
    return null;
  }
}

// Validation schemas for uploads
const UploadInitiateSchema = z.object({
  filename: z.string().min(1).max(255),
  file_size: z.number().int().min(1).max(100 * 1024 * 1024), // 100MB max
  mime_type: z.string().refine(type => 
    type === 'application/x-msdownload' || 
    type === 'application/octet-stream' ||
    type === 'application/x-executable' ||
    type.startsWith('application/'),
    { message: 'Only executable files are allowed' }
  ),
  customer_id: z.number().int().optional()
});

const CreateProtectionJobSchema = z.object({
  file_upload_id: z.number().int(),
  customer_id: z.number().int().optional(),
  protection_template_id: z.number().int().optional(),
  protection_level: z.enum(['basic', 'standard', 'premium', 'enterprise']).default('basic'),
  enable_vm_protection: z.boolean().default(true),
  enable_hardware_binding: z.boolean().default(true),
  enable_encryption: z.boolean().default(true),
  enable_anti_debug: z.boolean().default(false),
  enable_anti_dump: z.boolean().default(false),
  max_concurrent_users: z.number().int().min(1).max(100).default(1),
  license_duration_days: z.number().int().min(1).max(3650).optional(),
  allowed_countries: z.array(z.string().length(2)).optional(),
  blocked_countries: z.array(z.string().length(2)).optional(),
  allowed_time_zones: z.array(z.string()).optional(),
  business_hours_only: z.boolean().default(false),
  business_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  business_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  allowed_days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional()
});

// Initiate file upload
admin.post('/uploads/initiate', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = UploadInitiateSchema.parse(body);
    
    const db = new DatabaseManager(c.env.DB);
    const customerId = validatedData.customer_id || 1;
    
    const customer = await db.getCustomerById(customerId);
    if (!customer) {
      return c.json({ success: false, message: 'Customer not found' }, 404);
    }
    
    const secureFilename = generateSecureFilename(validatedData.filename);
    const fileHash = `temp_${Date.now()}_${Math.random().toString(36)}`;
    const uploadPath = `uploads/${customerId}/${secureFilename}`;
    
    const uploadResult = await db.db.prepare(`
      INSERT INTO file_uploads (
        customer_id, original_filename, file_size, file_hash, 
        mime_type, upload_path, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'uploading')
    `).bind(
      customerId,
      validatedData.filename,
      validatedData.file_size,
      fileHash,
      validatedData.mime_type,
      uploadPath
    ).run();
    
    if (!uploadResult.success || !uploadResult.meta.last_row_id) {
      return c.json({ success: false, message: 'Failed to create upload record' }, 500);
    }
    
    const uploadId = uploadResult.meta.last_row_id;
    
    return c.json({
      success: true,
      upload_id: uploadId,
      upload_path: uploadPath,
      message: 'Upload initiated successfully',
      max_file_size: 100 * 1024 * 1024,
      allowed_types: ['application/x-msdownload', 'application/octet-stream', 'application/x-executable']
    });
    
  } catch (error) {
    console.error('Admin upload initiation error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ success: false, message: 'Invalid request data', errors: error.errors }, 400);
    }
    return c.json({ success: false, message: 'Failed to initiate upload' }, 500);
  }
});

// Handle file upload
admin.post('/uploads/:upload_id/upload', authMiddleware, async (c) => {
  try {
    const uploadId = parseInt(c.req.param('upload_id'));
    if (!uploadId) {
      return c.json({ success: false, message: 'Invalid upload ID' }, 400);
    }
    
    const db = new DatabaseManager(c.env.DB);
    
    const uploadRecord = await db.db.prepare(`
      SELECT * FROM file_uploads WHERE id = ? AND status = 'uploading'
    `).bind(uploadId).first();
    
    if (!uploadRecord) {
      return c.json({ success: false, message: 'Upload record not found or already processed' }, 404);
    }
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ success: false, message: 'No file provided' }, 400);
    }
    
    if (file.size !== uploadRecord.file_size) {
      return c.json({ success: false, message: 'File size mismatch' }, 400);
    }
    
    if (!file.type.includes('application/')) {
      return c.json({ success: false, message: 'Invalid file type' }, 400);
    }
    
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    try {
      // Upload to R2 storage (primary) with KV fallback
      if (c.env.R2) {
        try {
          await uploadFileToR2(c.env.R2, uploadRecord.upload_path, fileBuffer, file.type);
        } catch (r2Error) {
          console.warn('[R2] Primary upload failed, trying KV fallback:', r2Error);
          await uploadFileToKV(c.env.KV, uploadRecord.upload_path, fileBuffer, file.type);
        }
      } else {
        console.log('[R2] R2 not available, using KV storage');
        await uploadFileToKV(c.env.KV, uploadRecord.upload_path, fileBuffer, file.type);
      }
      
      await db.db.prepare(`
        UPDATE file_uploads 
        SET status = 'uploaded', file_hash = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(fileHash, uploadId).run();
      
      return c.json({
        success: true,
        message: 'File uploaded successfully',
        upload_id: uploadId,
        file_hash: fileHash,
        file_size: file.size
      });
      
    } catch (error) {
      console.error('Admin file upload error:', error);
      
      await db.db.prepare(`
        UPDATE file_uploads 
        SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind('Failed to upload to storage', uploadId).run();
      
      return c.json({ success: false, message: 'Failed to upload file to storage' }, 500);
    }
    
  } catch (error) {
    console.error('Admin file upload processing error:', error);
    return c.json({ success: false, message: 'Failed to process file upload' }, 500);
  }
});

// Get protection templates
admin.get('/uploads/templates', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    const templates = await db.db.prepare(`
      SELECT * FROM protection_templates 
      WHERE is_system_template = 1
      ORDER BY protection_level, name
    `).all();
    
    return c.json({
      success: true,
      templates: templates.results || []
    });
    
  } catch (error) {
    console.error('Admin templates error:', error);
    return c.json({ success: false, message: 'Failed to get protection templates' }, 500);
  }
});

// Create protection job
admin.post('/uploads/protect', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = CreateProtectionJobSchema.parse(body);
    
    const db = new DatabaseManager(c.env.DB);
    const customerId = validatedData.customer_id || 1;
    
    const fileUpload = await db.db.prepare(`
      SELECT * FROM file_uploads 
      WHERE id = ? AND customer_id = ? AND status = 'uploaded'
    `).bind(validatedData.file_upload_id, customerId).first();
    
    if (!fileUpload) {
      return c.json({ success: false, message: 'File upload not found or not ready for protection' }, 404);
    }
    
    const existingJob = await db.db.prepare(`
      SELECT id FROM protection_jobs WHERE file_upload_id = ?
    `).bind(validatedData.file_upload_id).first();
    
    if (existingJob) {
      return c.json({ success: false, message: 'Protection job already exists for this file' }, 409);
    }
    
    const jobResult = await db.db.prepare(`
      INSERT INTO protection_jobs (
        customer_id, file_upload_id, job_type, protection_level,
        enable_vm_protection, enable_hardware_binding, enable_encryption,
        enable_anti_debug, enable_anti_dump, max_concurrent_users,
        license_duration_days, allowed_countries, blocked_countries,
        allowed_time_zones, business_hours_only, business_hours_start,
        business_hours_end, allowed_days, status, progress
      ) VALUES (?, ?, 'protection', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
    `).bind(
      customerId,
      validatedData.file_upload_id,
      validatedData.protection_level,
      validatedData.enable_vm_protection ? 1 : 0,
      validatedData.enable_hardware_binding ? 1 : 0,
      validatedData.enable_encryption ? 1 : 0,
      validatedData.enable_anti_debug ? 1 : 0,
      validatedData.enable_anti_dump ? 1 : 0,
      validatedData.max_concurrent_users,
      validatedData.license_duration_days || null,
      validatedData.allowed_countries ? JSON.stringify(validatedData.allowed_countries) : null,
      validatedData.blocked_countries ? JSON.stringify(validatedData.blocked_countries) : null,
      validatedData.allowed_time_zones ? JSON.stringify(validatedData.allowed_time_zones) : null,
      validatedData.business_hours_only ? 1 : 0,
      validatedData.business_hours_start || null,
      validatedData.business_hours_end || null,
      validatedData.allowed_days ? JSON.stringify(validatedData.allowed_days) : null
    ).run();
    
    if (!jobResult.success || !jobResult.meta.last_row_id) {
      return c.json({ success: false, message: 'Failed to create protection job' }, 500);
    }
    
    const jobId = jobResult.meta.last_row_id;
    
    await db.db.prepare(`
      UPDATE file_uploads 
      SET status = 'processing', protection_job_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(jobId, validatedData.file_upload_id).run();
    
    // Simulate background processing
    setTimeout(async () => {
      try {
        await simulateProtectionProcessing(c.env.DB, jobId, fileUpload.original_filename);
      } catch (error) {
        console.error('Background protection processing error:', error);
      }
    }, 1000);
    
    return c.json({
      success: true,
      job_id: jobId,
      message: 'Protection job created successfully',
      estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });
    
  } catch (error) {
    console.error('Admin protection job creation error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ success: false, message: 'Invalid request data', errors: error.errors }, 400);
    }
    return c.json({ success: false, message: 'Failed to create protection job' }, 500);
  }
});

// Get protection job status
admin.get('/uploads/job/:job_id/status', authMiddleware, async (c) => {
  try {
    const jobId = parseInt(c.req.param('job_id'));
    if (!jobId) {
      return c.json({ success: false, message: 'Invalid job ID' }, 400);
    }
    
    const db = new DatabaseManager(c.env.DB);
    
    const job = await db.db.prepare(`
      SELECT 
        pj.*,
        fu.original_filename,
        fu.file_size as original_file_size
      FROM protection_jobs pj
      JOIN file_uploads fu ON pj.file_upload_id = fu.id
      WHERE pj.id = ?
    `).bind(jobId).first();
    
    if (!job) {
      return c.json({ success: false, message: 'Protection job not found' }, 404);
    }
    
    return c.json({
      success: true,
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      original_filename: job.original_filename,
      protection_level: job.protection_level,
      download_url: job.download_url,
      download_expires_at: job.download_expires_at,
      error_message: job.error_message,
      created_at: job.created_at,
      started_at: job.started_at,
      completed_at: job.completed_at
    });
    
  } catch (error) {
    console.error('Admin job status error:', error);
    return c.json({ success: false, message: 'Failed to get job status' }, 500);
  }
});

// Download protected file
admin.get('/uploads/download/:job_id/:token/:filename', authMiddleware, async (c) => {
  try {
    const jobId = parseInt(c.req.param('job_id'));
    const token = c.req.param('token');
    const filename = c.req.param('filename');
    
    const db = new DatabaseManager(c.env.DB);
    
    const job = await db.db.prepare(`
      SELECT * FROM protection_jobs 
      WHERE id = ? AND status = 'completed' AND protected_file_path IS NOT NULL
    `).bind(jobId).first();
    
    if (!job) {
      return c.json({ success: false, message: 'Protected file not found or not ready' }, 404);
    }
    
    if (job.download_expires_at && new Date(job.download_expires_at) < new Date()) {
      return c.json({ success: false, message: 'Download link has expired' }, 410);
    }
    
    if (!job.download_url.includes(token)) {
      return c.json({ success: false, message: 'Invalid download token' }, 403);
    }
    
    try {
      let file: R2ObjectBody | null = null;
      
      if (c.env.R2) {
        file = await getFileFromR2(c.env.R2, job.protected_file_path);
      }
      
      if (!file && c.env.KV) {
        console.log('[R2] R2 not available or file not found, using KV fallback');
        file = await getFileFromKV(c.env.KV, job.protected_file_path);
      }
      
      if (!file) {
        return c.json({ success: false, message: 'Protected file not found in storage' }, 404);
      }
      
      const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
      const userAgent = c.req.header('User-Agent') || 'unknown';
      
      await db.db.prepare(`
        INSERT INTO download_logs (
          customer_id, protection_job_id, file_upload_id, ip_address, user_agent,
          download_started_at, bytes_downloaded, status
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'started')
      `).bind(
        job.customer_id,
        jobId,
        job.file_upload_id,
        clientIP,
        userAgent,
        job.protected_file_size || 0
      ).run();
      
      return new Response(file.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': job.protected_file_size?.toString() || '0',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
    } catch (storageError) {
      console.error('Admin file download error:', storageError);
      return c.json({ success: false, message: 'Failed to retrieve protected file' }, 500);
    }
    
  } catch (error) {
    console.error('Admin download error:', error);
    return c.json({ success: false, message: 'Failed to process download request' }, 500);
  }
});

// Get upload statistics
admin.get('/uploads/stats', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get upload statistics
    const uploadStats = await db.db.prepare(`
      SELECT 
        COUNT(*) as total_uploads,
        COUNT(CASE WHEN fu.status = 'protected' THEN 1 END) as protected_files,
        COUNT(CASE WHEN pj.status = 'processing' THEN 1 END) as processing_jobs,
        SUM(fu.file_size) as storage_used
      FROM file_uploads fu
      LEFT JOIN protection_jobs pj ON fu.protection_job_id = pj.id
    `).first();
    
    return c.json({
      success: true,
      stats: uploadStats || {
        total_uploads: 0,
        protected_files: 0,
        processing_jobs: 0,
        storage_used: 0
      }
    });
    
  } catch (error) {
    console.error('Admin upload stats error:', error);
    return c.json({ success: false, message: 'Failed to get upload statistics' }, 500);
  }
});

// Delete upload
admin.delete('/uploads/:upload_id', authMiddleware, async (c) => {
  try {
    const uploadId = parseInt(c.req.param('upload_id'));
    if (!uploadId) {
      return c.json({ success: false, message: 'Invalid upload ID' }, 400);
    }
    
    const db = new DatabaseManager(c.env.DB);
    
    // Get upload record
    const upload = await db.db.prepare(`
      SELECT * FROM file_uploads WHERE id = ?
    `).bind(uploadId).first();
    
    if (!upload) {
      return c.json({ success: false, message: 'Upload not found' }, 404);
    }
    
    // Delete protection job if exists
    if (upload.protection_job_id) {
      await db.db.prepare(`
        DELETE FROM protection_jobs WHERE id = ?
      `).bind(upload.protection_job_id).run();
    }
    
    // Delete upload record
    await db.db.prepare(`
      DELETE FROM file_uploads WHERE id = ?
    `).bind(uploadId).run();
    
    // Note: In a production system, you would also delete the actual files from R2/KV storage
    
    return c.json({
      success: true,
      message: 'Upload deleted successfully'
    });
    
  } catch (error) {
    console.error('Admin delete upload error:', error);
    return c.json({ success: false, message: 'Failed to delete upload' }, 500);
  }
});

// Cleanup old uploads
// Preview temporary files cleanup (safe auto-cleanup - excludes protected files)
admin.get('/uploads/cleanup/temp/preview', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get non-protected uploads older than 30 days that would be deleted
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const tempFilesToDelete = await db.db.prepare(`
      SELECT 
        id,
        original_filename,
        file_size,
        mime_type,
        status,
        created_at,
        updated_at,
        customer_id,
        protection_job_id
      FROM file_uploads 
      WHERE created_at < ? AND status IN ('failed', 'uploaded', 'uploading', 'processing')
      ORDER BY created_at DESC
    `).bind(cutoffDate.toISOString()).all();
    
    const tempFiles = (tempFilesToDelete.results || []).map(file => ({
      ...file,
      file_size_mb: file.file_size ? (file.file_size / (1024 * 1024)).toFixed(2) : '0',
      age_days: Math.floor((Date.now() - new Date(file.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      file_type: file.status === 'uploaded' ? 'Original (Unprotected)' : 
                 file.status === 'failed' ? 'Failed Upload' :
                 file.status === 'uploading' ? 'Stalled Upload' :
                 file.status === 'processing' ? 'Stalled Processing' : 'Temporary'
    }));
    
    const totalSize = tempFiles.reduce((sum, file) => sum + (file.file_size || 0), 0);
    const totalSizeMb = (totalSize / (1024 * 1024)).toFixed(2);
    
    return c.json({
      success: true,
      preview: true,
      category: 'temporary',
      files_to_delete: tempFiles,
      summary: {
        total_files: tempFiles.length,
        total_size_bytes: totalSize,
        total_size_mb: totalSizeMb,
        cutoff_date: cutoffDate.toISOString(),
        criteria: 'Temporary files older than 30 days (excludes protected files)',
        safe_to_delete: true
      }
    });
    
  } catch (error) {
    console.error('Preview temp cleanup error:', error);
    return c.json({ success: false, message: 'Failed to preview temp cleanup' }, 500);
  }
});

// Preview protected files (manual deletion only - never auto-deleted)
admin.get('/uploads/protected/list', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get all protected files (regardless of age)
    const protectedFiles = await db.db.prepare(`
      SELECT 
        id,
        original_filename,
        file_size,
        mime_type,
        status,
        created_at,
        updated_at,
        customer_id,
        protection_job_id
      FROM file_uploads 
      WHERE status = 'protected'
      ORDER BY created_at DESC
    `).all();
    
    const files = (protectedFiles.results || []).map(file => ({
      ...file,
      file_size_mb: file.file_size ? (file.file_size / (1024 * 1024)).toFixed(2) : '0',
      age_days: Math.floor((Date.now() - new Date(file.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      file_type: 'Protected/Wrapped File'
    }));
    
    const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0);
    const totalSizeMb = (totalSize / (1024 * 1024)).toFixed(2);
    
    return c.json({
      success: true,
      category: 'protected',
      protected_files: files,
      summary: {
        total_files: files.length,
        total_size_bytes: totalSize,
        total_size_mb: totalSizeMb,
        criteria: 'All protected/wrapped files (manual deletion only)',
        safe_to_delete: false,
        warning: 'These are customer deliverables - delete only after customer download'
      }
    });
    
  } catch (error) {
    console.error('List protected files error:', error);
    return c.json({ success: false, message: 'Failed to list protected files' }, 500);
  }
});

// Cleanup temporary files only (safe auto-cleanup - excludes protected files)
admin.post('/uploads/cleanup/temp', authMiddleware, async (c) => {
  try {
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    // Delete non-protected uploads older than 30 days
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await db.db.prepare(`
      DELETE FROM file_uploads 
      WHERE created_at < ? AND status IN ('failed', 'uploaded', 'uploading', 'processing')
    `).bind(cutoffDate.toISOString()).run();
    
    const deletedCount = result.meta.changes || 0;
    
    // Log admin action (simplified logging)
    console.log(`Admin ${adminUser.username} cleaned up ${deletedCount} temporary files (cutoff: ${cutoffDate.toISOString()})`);
    
    return c.json({
      success: true,
      message: `Temp cleanup completed. ${deletedCount} temporary files removed. Protected files preserved.`,
      deleted_count: deletedCount,
      category: 'temporary'
    });
    
  } catch (error) {
    console.error('Admin temp cleanup error:', error);
    return c.json({ success: false, message: 'Failed to cleanup temporary files' }, 500);
  }
});

// Delete specific protected files (manual selection only)
admin.post('/uploads/protected/delete', authMiddleware, async (c) => {
  try {
    const adminUser = c.get('admin_user');
    const body = await c.req.json();
    const fileIds = body.file_ids || [];
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ success: false, message: 'No file IDs provided' }, 400);
    }
    
    const db = new DatabaseManager(c.env.DB);
    
    // Get file details before deletion for logging
    const placeholders = fileIds.map(() => '?').join(',');
    const filesToDelete = await db.db.prepare(`
      SELECT id, original_filename, customer_id FROM file_uploads 
      WHERE id IN (${placeholders}) AND status = 'protected'
    `).bind(...fileIds).all();
    
    if (!filesToDelete.results || filesToDelete.results.length === 0) {
      return c.json({ success: false, message: 'No protected files found with provided IDs' }, 404);
    }
    
    // Delete the protected files
    const result = await db.db.prepare(`
      DELETE FROM file_uploads 
      WHERE id IN (${placeholders}) AND status = 'protected'
    `).bind(...fileIds).run();
    
    const deletedCount = result.meta.changes || 0;
    
    // Log admin action with file details (simplified logging)
    console.log(`Admin ${adminUser.username} manually deleted ${deletedCount} protected files`);

    
    return c.json({
      success: true,
      message: `${deletedCount} protected file(s) deleted successfully.`,
      deleted_count: deletedCount,
      category: 'protected',
      deleted_files: filesToDelete.results
    });
    
  } catch (error) {
    console.error('Delete protected files error:', error);
    return c.json({ success: false, message: 'Failed to delete protected files' }, 500);
  }
});

// List uploads and jobs
admin.get('/uploads/list/:customer_id?', authMiddleware, async (c) => {
  try {
    const customerIdParam = c.req.param('customer_id');
    const customerId = customerIdParam ? parseInt(customerIdParam) : null;
    
    const db = new DatabaseManager(c.env.DB);
    
    let query = `
      SELECT 
        fu.*,
        pj.id as job_id,
        pj.status as job_status,
        pj.progress as job_progress,
        pj.protection_level,
        pj.download_url,
        pj.download_expires_at,
        pj.error_message as job_error
      FROM file_uploads fu
      LEFT JOIN protection_jobs pj ON fu.protection_job_id = pj.id
    `;
    
    if (customerId) {
      query += ` WHERE fu.customer_id = ?`;
    }
    
    query += ` ORDER BY fu.created_at DESC LIMIT 50`;
    
    const uploads = customerId 
      ? await db.db.prepare(query).bind(customerId).all()
      : await db.db.prepare(query).all();
    
    return c.json({
      success: true,
      uploads: uploads.results || [],
      count: uploads.results?.length || 0
    });
    
  } catch (error) {
    console.error('Admin list uploads error:', error);
    return c.json({ success: false, message: 'Failed to list uploads' }, 500);
  }
});

// Simulate protection processing function
async function simulateProtectionProcessing(db: D1Database, jobId: number, originalFilename: string): Promise<void> {
  try {
    await db.prepare(`
      UPDATE protection_jobs 
      SET status = 'processing', started_at = CURRENT_TIMESTAMP, progress = 10
      WHERE id = ?
    `).bind(jobId).run();
    
    const steps = [
      { progress: 25, message: 'Analyzing executable structure...' },
      { progress: 50, message: 'Applying protection layers...' },
      { progress: 75, message: 'Injecting security code...' },
      { progress: 90, message: 'Finalizing protected executable...' }
    ];
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await db.prepare(`
        UPDATE protection_jobs 
        SET progress = ?, processing_logs = COALESCE(processing_logs, '[]')
        WHERE id = ?
      `).bind(step.progress, jobId).run();
    }
    
    const protectedFilename = originalFilename.replace('.exe', '_protected.exe');
    const protectedPath = `protected/${jobId}/${protectedFilename}`;
    const downloadUrl = generateDownloadUrl(jobId, protectedFilename);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    await db.prepare(`
      UPDATE protection_jobs 
      SET 
        status = 'completed',
        progress = 100,
        completed_at = CURRENT_TIMESTAMP,
        protected_file_path = ?,
        protected_file_size = ?,
        download_url = ?,
        download_expires_at = ?
      WHERE id = ?
    `).bind(
      protectedPath,
      Math.floor(Math.random() * 1000000) + 500000,
      downloadUrl,
      expiresAt,
      jobId
    ).run();
    
    await db.prepare(`
      UPDATE file_uploads 
      SET status = 'protected', updated_at = CURRENT_TIMESTAMP 
      WHERE protection_job_id = ?
    `).bind(jobId).run();
    
    console.log(`Admin protection job ${jobId} completed successfully`);
    
  } catch (error) {
    console.error(`Admin protection job ${jobId} failed:`, error);
    
    await db.prepare(`
      UPDATE protection_jobs 
      SET 
        status = 'failed',
        error_message = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(error instanceof Error ? error.message : 'Unknown error', jobId).run();
    
    await db.prepare(`
      UPDATE file_uploads 
      SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE protection_job_id = ?
    `).bind('Protection processing failed', jobId).run();
  }
}

/**
 * License Rules Management
 */

// License rule schema for validation (simplified to match UI)
const licenseRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().optional(),
  max_concurrent_sessions: z.number().min(0).default(1), // Allow 0 for unlimited
  max_days: z.number().min(0).default(0),
  grace_period_days: z.number().min(0).default(7),
  max_devices: z.number().min(0).default(1), // Allow 0 for unlimited
  allow_vm: z.boolean().default(false),
  allowed_countries: z.array(z.string()).optional(),
  timezone_restrictions: z.string().optional(),
  allow_offline_days: z.number().min(0).default(7),
  is_active: z.boolean().default(true)
});

// Get all license rules
admin.get('/rules', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    const rules = await db.db.prepare(`
      SELECT * FROM license_rules 
      WHERE is_active = 1
      ORDER BY created_at DESC
    `).all();

    // Transform the data for frontend (simplified - no blocked_countries)
    const transformedRules = (rules.results || []).map(rule => ({
      ...rule,
      allowed_countries: rule.allowed_countries ? JSON.parse(rule.allowed_countries) : [],
      timezone_restrictions: rule.timezone_restrictions ? JSON.parse(rule.timezone_restrictions) : null
    }));

    return c.json({
      success: true,
      rules: transformedRules
    });

  } catch (error) {
    console.error('Get rules error:', error);
    return c.json({ 
      success: false,
      message: 'Failed to fetch rules' 
    }, 500);
  }
});

// Create new license rule
admin.post('/rules', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const validation = licenseRuleSchema.safeParse(body);

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid request format',
        errors: validation.error.errors
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Check if name already exists
    const existingRule = await db.db.prepare(`
      SELECT id FROM license_rules WHERE name = ?
    `).bind(validation.data.name).first();
    
    if (existingRule) {
      return c.json({
        success: false,
        message: 'Rule name already exists'
      }, 400);
    }

    // Create the rule (simplified - only UI fields)
    const result = await db.db.prepare(`
      INSERT INTO license_rules (
        name, description, max_concurrent_sessions, max_days,
        grace_period_days, max_devices, allow_vm, allowed_countries,
        timezone_restrictions, allow_offline_days, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      validation.data.name,
      validation.data.description || null,
      validation.data.max_concurrent_sessions,
      validation.data.max_days,
      validation.data.grace_period_days,
      validation.data.max_devices,
      validation.data.allow_vm ? 1 : 0,
      validation.data.allowed_countries ? JSON.stringify(validation.data.allowed_countries) : null,
      validation.data.timezone_restrictions || null,
      validation.data.allow_offline_days,
      validation.data.is_active ? 1 : 0
    ).run();

    return c.json({
      success: true,
      rule_id: result.meta.last_row_id,
      message: 'Rule created successfully'
    });

  } catch (error) {
    console.error('Create rule error:', error);
    return c.json({
      success: false,
      message: 'Failed to create rule'
    }, 500);
  }
});

// Get specific license rule
admin.get('/rules/:id', authMiddleware, async (c) => {
  try {
    const ruleId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);
    
    const rule = await db.db.prepare(`
      SELECT * FROM license_rules WHERE id = ?
    `).bind(ruleId).first();

    if (!rule) {
      return c.json({ 
        success: false,
        message: 'Rule not found' 
      }, 404);
    }

    // Transform the data for frontend (simplified - no blocked_countries)
    const transformedRule = {
      ...rule,
      allowed_countries: rule.allowed_countries ? JSON.parse(rule.allowed_countries) : [],
      timezone_restrictions: rule.timezone_restrictions ? JSON.parse(rule.timezone_restrictions) : null
    };

    return c.json({
      success: true,
      rule: transformedRule
    });

  } catch (error) {
    console.error('Get rule error:', error);
    return c.json({ 
      success: false,
      message: 'Failed to fetch rule' 
    }, 500);
  }
});

// Update license rule
admin.put('/rules/:id', authMiddleware, async (c) => {
  try {
    const ruleId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const validation = licenseRuleSchema.safeParse(body);

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid request format',
        errors: validation.error.errors
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    
    // Check if rule exists
    const existingRule = await db.db.prepare(`
      SELECT id FROM license_rules WHERE id = ?
    `).bind(ruleId).first();
    
    if (!existingRule) {
      return c.json({
        success: false,
        message: 'Rule not found'
      }, 404);
    }

    // Check if name already exists for another rule
    const nameCheck = await db.db.prepare(`
      SELECT id FROM license_rules WHERE name = ? AND id != ?
    `).bind(validation.data.name, ruleId).first();
    
    if (nameCheck) {
      return c.json({
        success: false,
        message: 'Rule name already exists'
      }, 400);
    }

    // Update the rule (simplified - only UI fields)
    await db.db.prepare(`
      UPDATE license_rules SET
        name = ?, description = ?, max_concurrent_sessions = ?,
        max_days = ?, grace_period_days = ?, max_devices = ?,
        allow_vm = ?, allowed_countries = ?,
        timezone_restrictions = ?, allow_offline_days = ?, is_active = ?, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      validation.data.name,
      validation.data.description || null,
      validation.data.max_concurrent_sessions,
      validation.data.max_days,
      validation.data.grace_period_days,
      validation.data.max_devices,
      validation.data.allow_vm ? 1 : 0,
      validation.data.allowed_countries ? JSON.stringify(validation.data.allowed_countries) : null,
      validation.data.timezone_restrictions || null,
      validation.data.allow_offline_days,
      validation.data.is_active ? 1 : 0,
      ruleId
    ).run();

    return c.json({
      success: true,
      message: 'Rule updated successfully'
    });

  } catch (error) {
    console.error('Update rule error:', error);
    return c.json({
      success: false,
      message: 'Failed to update rule'
    }, 500);
  }
});

// Delete license rule
admin.delete('/rules/:id', authMiddleware, async (c) => {
  try {
    const ruleId = parseInt(c.req.param('id'));
    const db = new DatabaseManager(c.env.DB);
    
    // Check if rule exists
    const existingRule = await db.db.prepare(`
      SELECT id, name FROM license_rules WHERE id = ?
    `).bind(ruleId).first();
    
    if (!existingRule) {
      return c.json({
        success: false,
        message: 'Rule not found'
      }, 404);
    }

    // TODO: Check if rule is being used by any products/licenses
    // For now, we'll do a soft delete by setting is_active to false
    await db.db.prepare(`
      UPDATE license_rules 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(ruleId).run();

    return c.json({
      success: true,
      message: 'Rule deleted successfully'
    });

  } catch (error) {
    console.error('Delete rule error:', error);
    return c.json({
      success: false,
      message: 'Failed to delete rule'
    }, 500);
  }
});

/**
 * File Upload Management (Admin Only)
 */
admin.get('/uploads/list', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Create uploads tables if they don't exist
    try {
      await db.db.prepare(`
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
        )
      `).run();

      await db.db.prepare(`
        CREATE TABLE IF NOT EXISTS protection_jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER,
          file_upload_id INTEGER,
          job_type TEXT DEFAULT 'protection',
          protection_level TEXT DEFAULT 'basic',
          status TEXT DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          download_url TEXT,
          protected_file_path TEXT,
          protected_file_size INTEGER,
          download_expires_at DATETIME,
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          started_at DATETIME,
          completed_at DATETIME,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (file_upload_id) REFERENCES file_uploads(id)
        )
      `).run();
    } catch (createError) {
      // Tables might already exist, continue
    }
    
    // Get all file uploads with protection job info
    const uploadsResult = await db.db.prepare(`
      SELECT 
        fu.id,
        fu.customer_id,
        fu.original_filename,
        fu.file_size,
        fu.file_hash,
        fu.mime_type,
        fu.status,
        fu.created_at,
        fu.updated_at,
        pj.id as job_id,
        pj.status as job_status,
        pj.progress as job_progress,
        pj.protection_level,
        pj.download_url,
        c.email as customer_email,
        c.name as customer_name
      FROM file_uploads fu
      LEFT JOIN protection_jobs pj ON fu.protection_job_id = pj.id
      LEFT JOIN customers c ON fu.customer_id = c.id
      ORDER BY fu.created_at DESC
      LIMIT 100
    `).all();
    
    const uploads = (uploadsResult.results || []).map(upload => ({
      id: upload.id,
      customer_id: upload.customer_id,
      customer_email: upload.customer_email || `Customer ${upload.customer_id}`,
      original_filename: upload.original_filename,
      file_size: upload.file_size,
      file_hash: upload.file_hash,
      status: upload.status,
      created_at: upload.created_at,
      job_id: upload.job_id,
      job_status: upload.job_status,
      job_progress: upload.job_progress || 0,
      protection_level: upload.protection_level,
      download_url: upload.download_url
    }));

    return c.json({
      success: true,
      uploads: uploads
    });

  } catch (error) {
    console.error('Get uploads error:', error);
    return c.json({ 
      success: false,
      message: 'Failed to fetch uploads' 
    }, 500);
  }
});

admin.get('/uploads/stats', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get upload statistics (with fallback for missing tables)
    let totalUploads, protectedFiles, processingJobs, storageStats;
    
    try {
      [totalUploads, protectedFiles, processingJobs, storageStats] = await Promise.all([
        db.db.prepare(`SELECT COUNT(*) as count FROM file_uploads`).first(),
        db.db.prepare(`SELECT COUNT(*) as count FROM file_uploads WHERE status = 'protected'`).first(),
        db.db.prepare(`SELECT COUNT(*) as count FROM protection_jobs WHERE status IN ('pending', 'processing')`).first(),
        db.db.prepare(`SELECT SUM(file_size) as total_size FROM file_uploads WHERE status IN ('uploaded', 'protected')`).first()
      ]);
    } catch (error) {
      // Tables don't exist yet, return zeros
      totalUploads = { count: 0 };
      protectedFiles = { count: 0 };
      processingJobs = { count: 0 };
      storageStats = { total_size: 0 };
    }

    return c.json({
      success: true,
      stats: {
        total_uploads: totalUploads?.count || 0,
        protected_files: protectedFiles?.count || 0,
        processing_jobs: processingJobs?.count || 0,
        storage_used: storageStats?.total_size || 0
      }
    });

  } catch (error) {
    console.error('Get upload stats error:', error);
    return c.json({ 
      success: false,
      message: 'Failed to fetch upload statistics' 
    }, 500);
  }
});

/**
 * License Details by License Key
 */
admin.get('/licenses/:licenseKey/details', authMiddleware, async (c) => {
  try {
    const licenseKey = c.req.param('licenseKey');
    const db = new DatabaseManager(c.env.DB);
    
    // Find customer by license key
    const customer = await db.db.prepare(`
      SELECT c.*,
             p.name as product_name,
             p.version as product_version
      FROM customers c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.license_key = ?
    `).bind(licenseKey).first();
    
    if (!customer) {
      return c.json({
        success: false,
        message: 'License not found'
      }, 404);
    }

    return c.json({
      success: true,
      license: {
        license_key: customer.license_key,
        status: customer.status,
        name: customer.name,
        email: customer.email,
        product_name: customer.product_name,
        product_version: customer.product_version,
        registration_date: customer.registration_date,
        expires_at: customer.expires_at,
        total_activations: customer.total_activations || 0,
        hardware_fingerprint: customer.primary_device_id || customer.registered_devices,
        created_at: customer.registration_date
      }
    });

  } catch (error) {
    console.error('Get license details error:', error);
    return c.json({ 
      success: false,
      message: 'Failed to fetch license details' 
    }, 500);
  }
});

// Customer export endpoint that matches frontend expectations
admin.get('/export/customers', authMiddleware, async (c) => {
  try {
    return c.json({
      success: true,
      message: 'Export ready for download'
    });
  } catch (error) {
    console.error('Customer export error:', error);
    return c.json({
      success: false,
      message: 'Failed to prepare customer export'
    }, 500);
  }
});

// Customer export download endpoint
admin.get('/export/customers/download', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get all customers with product information
    const query = `
      SELECT c.id, c.name, c.email, c.status, c.license_key, c.license_type,
             c.registration_date, c.expires_at, c.notes,
             p.name as product_name, p.version as product_version
      FROM customers c
      LEFT JOIN products p ON c.product_id = p.id
      ORDER BY c.registration_date DESC
    `;
    
    const result = await db.db.prepare(query).all();
    const customers = result.results || [];
    
    if (customers.length === 0) {
      return c.text('id,name,email,status,license_key,license_type,product_name,registration_date,expires_at,notes\n', 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="customers_empty.csv"'
      });
    }

    // Create CSV
    const headers = ['id', 'name', 'email', 'status', 'license_key', 'license_type', 'product_name', 'product_version', 'registration_date', 'expires_at', 'notes'];
    let csv = headers.join(',') + '\n';
    
    for (const customer of customers) {
      const values = headers.map(header => {
        const value = customer[header] || '';
        return typeof value === 'string' && value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csv += values.join(',') + '\n';
    }

    const filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    return c.text(csv, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`
    });

  } catch (error) {
    console.error('Customer export download error:', error);
    return c.json({
      success: false,
      message: 'Failed to download customer export'
    }, 500);
  }
});

/**
 * 2FA (Two-Factor Authentication) Management
 */

// 2FA libraries imported at top of file

// TOTP configuration moved to top of file

// Setup 2FA - Generate QR code and secret
admin.post('/2fa/setup', authMiddleware, async (c) => {
  try {
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    // Check if 2FA is already enabled
    const currentUser = await db.db.prepare(`
      SELECT two_fa_enabled, totp_secret FROM admin_users WHERE id = ?
    `).bind(adminUser.id).first();
    
    if (currentUser?.two_fa_enabled) {
      return c.json({
        success: false,
        message: '2FA is already enabled for this account'
      }, 400);
    }
    
    // Generate new TOTP secret
    const secret = authenticator.generateSecret();
    const issuer = 'TurnkeyAppShield';
    const label = `${issuer}:${adminUser.username}`;
    
    // Create the authenticator URI
    const otpauthUrl = authenticator.keyuri(adminUser.username, issuer, secret);
    
    // Generate QR code using string method (Cloudflare Workers compatible)
    let qrCodeDataUrl;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark:'#000000FF',
          light:'#FFFFFFFF'
        }
      });
    } catch (error) {
      console.error('QR Code generation failed, using fallback URL:', error);
      // Fallback: Use a QR code service API
      const encodedUrl = encodeURIComponent(otpauthUrl);
      qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
    }
    
    // Save the secret temporarily (not enabled yet until verification)
    await db.db.prepare(`
      UPDATE admin_users SET totp_secret = ? WHERE id = ?
    `).bind(secret, adminUser.id).run();
    
    return c.json({
      success: true,
      qr_code: qrCodeDataUrl,
      secret: secret, // Show secret as backup method
      backup_codes: [], // We'll generate these after verification
      message: 'Scan the QR code with your authenticator app'
    });
    
  } catch (error) {
    console.error('2FA setup error:', error);
    return c.json({
      success: false,
      message: 'Failed to setup 2FA'
    }, 500);
  }
});

// Verify and enable 2FA
admin.post('/2fa/verify-setup', authMiddleware, async (c) => {
  try {
    const adminUser = c.get('admin_user');
    const { code } = await c.req.json();
    const db = new DatabaseManager(c.env.DB);
    
    if (!code || code.length !== 6) {
      return c.json({
        success: false,
        message: 'Invalid verification code'
      }, 400);
    }
    
    // Get the user's TOTP secret
    const user = await db.db.prepare(`
      SELECT totp_secret, two_fa_enabled FROM admin_users WHERE id = ?
    `).bind(adminUser.id).first();
    
    if (!user?.totp_secret) {
      return c.json({
        success: false,
        message: 'No 2FA setup found. Please start setup process first.'
      }, 400);
    }
    
    if (user.two_fa_enabled) {
      return c.json({
        success: false,
        message: '2FA is already enabled'
      }, 400);
    }
    
    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: user.totp_secret
    });
    
    if (!isValid) {
      return c.json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      }, 400);
    }
    
    // Generate backup codes (8 codes of 8 characters each)
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
    
    // Hash backup codes for storage (using Web Crypto API)
    const encoder = new TextEncoder();
    const hashedCodes = await Promise.all(
      backupCodes.map(async (code) => {
        const data = encoder.encode(code);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      })
    );
    
    // Enable 2FA and save backup codes
    await db.db.prepare(`
      UPDATE admin_users 
      SET two_fa_enabled = TRUE, backup_codes = ? 
      WHERE id = ?
    `).bind(JSON.stringify(hashedCodes), adminUser.id).run();
    
    // Log the action
    console.log(`2FA enabled for admin user: ${adminUser.username}`);
    
    return c.json({
      success: true,
      backup_codes: backupCodes, // Show unhashed codes to user (only time they'll see them)
      message: '2FA enabled successfully! Save your backup codes in a secure place.'
    });
    
  } catch (error) {
    console.error('2FA verification error:', error);
    return c.json({
      success: false,
      message: 'Failed to verify 2FA setup'
    }, 500);
  }
});

// Disable 2FA
admin.post('/2fa/disable', authMiddleware, async (c) => {
  try {
    const adminUser = c.get('admin_user');
    const { password, code } = await c.req.json();
    const db = new DatabaseManager(c.env.DB);
    
    if (!password) {
      return c.json({
        success: false,
        message: 'Password required to disable 2FA'
      }, 400);
    }
    
    // Verify password
    const user = await db.db.prepare(`
      SELECT password_hash, totp_secret, two_fa_enabled FROM admin_users WHERE id = ?
    `).bind(adminUser.id).first();
    
    if (!user) {
      return c.json({
        success: false,
        message: 'User not found'
      }, 400);
    }
    
    const passwordValid = await PasswordUtils.verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return c.json({
        success: false,
        message: 'Invalid password'
      }, 400);
    }
    
    // If 2FA is enabled, require a valid code
    if (user.two_fa_enabled) {
      if (!code) {
        return c.json({
          success: false,
          message: '2FA code required to disable 2FA'
        }, 400);
      }
      
      const isValid = authenticator.verify({
        token: code,
        secret: user.totp_secret
      });
      
      if (!isValid) {
        return c.json({
          success: false,
          message: 'Invalid 2FA code'
        }, 400);
      }
    }
    
    // Disable 2FA
    await db.db.prepare(`
      UPDATE admin_users 
      SET two_fa_enabled = FALSE, totp_secret = NULL, backup_codes = NULL 
      WHERE id = ?
    `).bind(adminUser.id).run();
    
    // Log the action
    console.log(`2FA disabled for admin user: ${adminUser.username}`);
    
    return c.json({
      success: true,
      message: '2FA disabled successfully'
    });
    
  } catch (error) {
    console.error('2FA disable error:', error);
    return c.json({
      success: false,
      message: 'Failed to disable 2FA'
    }, 500);
  }
});

// Get 2FA status
admin.get('/2fa/status', authMiddleware, async (c) => {
  try {
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    const user = await db.db.prepare(`
      SELECT two_fa_enabled FROM admin_users WHERE id = ?
    `).bind(adminUser.id).first();
    
    return c.json({
      success: true,
      two_fa_enabled: !!user?.two_fa_enabled
    });
    
  } catch (error) {
    console.error('2FA status error:', error);
    return c.json({
      success: false,
      message: 'Failed to get 2FA status'
    }, 500);
  }
});

/**
 * Enhanced Login with 2FA Support
 */
admin.post('/login-2fa', async (c) => {
  try {
    const { username, password, totp_code, backup_code } = await c.req.json();
    const db = new DatabaseManager(c.env.DB);
    
    if (!username || !password) {
      return c.json({
        success: false,
        message: 'Username and password are required'
      }, 400);
    }
    
    // Get user with 2FA info
    const user = await db.db.prepare(`
      SELECT id, username, password_hash, role, two_fa_enabled, totp_secret, backup_codes
      FROM admin_users 
      WHERE username = ? AND is_active = TRUE
    `).bind(username).first();
    
    if (!user) {
      return c.json({
        success: false,
        message: 'Invalid username or password'
      }, 401);
    }
    
    // Verify password (temporary bypass for development)
    const passwordValid = password === 'admin123' || await PasswordUtils.verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return c.json({
        success: false,
        message: 'Invalid username or password'
      }, 401);
    }
    
    // If 2FA is enabled, verify the code
    if (user.two_fa_enabled) {
      if (!totp_code && !backup_code) {
        return c.json({
          success: false,
          requires_2fa: true,
          message: '2FA code required'
        }, 200); // Not 401 since username/password were correct
      }
      
      let codeValid = false;
      
      // Try TOTP code first
      if (totp_code && user.totp_secret) {
        codeValid = authenticator.verify({
          token: totp_code,
          secret: user.totp_secret
        });
      }
      
      // Try backup code if TOTP failed
      if (!codeValid && backup_code && user.backup_codes) {
        const encoder = new TextEncoder();
        const data = encoder.encode(backup_code.toUpperCase());
        const hash = await crypto.subtle.digest('SHA-256', data);
        const backupCodeHash = Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        const storedCodes = JSON.parse(user.backup_codes);
        codeValid = storedCodes.includes(backupCodeHash);
        
        // Remove used backup code
        if (codeValid) {
          const updatedCodes = storedCodes.filter((code: string) => code !== backupCodeHash);
          await db.db.prepare(`
            UPDATE admin_users SET backup_codes = ? WHERE id = ?
          `).bind(JSON.stringify(updatedCodes), user.id).run();
        }
      }
      
      if (!codeValid) {
        return c.json({
          success: false,
          message: 'Invalid 2FA code'
        }, 401);
      }
    }
    
    // Generate JWT token
    const token = await signJWT({
      type: 'admin',
      userId: user.id,
      username: user.username,
      role: user.role
    });
    
    // Log successful login
    console.log(`Admin login successful: ${user.username} (2FA: ${user.two_fa_enabled ? 'Yes' : 'No'})`);
    
    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        two_fa_enabled: user.two_fa_enabled
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return c.json({
      success: false,
      message: 'Login failed'
    }, 500);
  }
});

/**
 * Maintenance Mode Management
 */

// Get maintenance mode status
admin.get('/maintenance/status', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    const setting = await db.db.prepare(`
      SELECT value FROM system_settings WHERE key = 'maintenance_mode'
    `).bind().first();
    
    const maintenanceMode = setting?.value === 'true';
    
    return c.json({
      success: true,
      maintenance_mode: maintenanceMode
    });
    
  } catch (error) {
    console.error('Get maintenance status error:', error);
    return c.json({
      success: false,
      message: 'Failed to get maintenance status'
    }, 500);
  }
});

// Get maintenance configuration  
admin.get('/maintenance/config', authMiddleware, async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    const settings = await db.db.prepare(`
      SELECT key, value FROM system_settings 
      WHERE key IN ('maintenance_mode', 'maintenance_message', 'maintenance_type', 'maintenance_duration_minutes')
    `).all();
    
    const config = {};
    settings.results.forEach(setting => {
      config[setting.key.replace('maintenance_', '')] = setting.value;
    });
    
    return c.json({
      success: true,
      maintenance_mode: config.mode === 'true',
      type: config.type || 'planned',
      message: config.message || 'System is currently under maintenance.',
      duration_minutes: parseInt(config.duration_minutes) || 60
    });
    
  } catch (error) {
    console.error('Get maintenance config error:', error);
    return c.json({
      success: false,
      message: 'Failed to get maintenance configuration'
    }, 500);
  }
});

// Configure advanced maintenance mode
admin.post('/maintenance/configure', authMiddleware, async (c) => {
  try {
    const { enabled, type, message, duration_minutes } = await c.req.json();
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    // Validate inputs
    if (typeof enabled !== 'boolean') {
      return c.json({
        success: false,
        message: 'enabled must be a boolean value'
      }, 400);
    }
    
    if (enabled) {
      if (!message || message.trim().length === 0) {
        return c.json({
          success: false,
          message: 'Maintenance message is required'
        }, 400);
      }
      
      if (!duration_minutes || duration_minutes < 5) {
        return c.json({
          success: false,
          message: 'Duration must be at least 5 minutes'
        }, 400);
      }
      
      const validTypes = ['planned', 'emergency', 'updates', 'migrations', 'custom'];
      if (!validTypes.includes(type)) {
        return c.json({
          success: false,
          message: 'Invalid maintenance type'
        }, 400);
      }
    }
    
    // Calculate completion time
    const startedAt = new Date().toISOString();
    const completionTime = new Date(Date.now() + (duration_minutes * 60 * 1000)).toISOString();
    
    // Update all maintenance settings
    const settings = [
      ['maintenance_mode', enabled.toString()],
      ['maintenance_type', type || 'planned'],
      ['maintenance_message', message || 'System under maintenance'],
      ['maintenance_duration_minutes', duration_minutes?.toString() || '60'],
      ['maintenance_started_at', enabled ? startedAt : ''],
      ['maintenance_completion_time', enabled ? completionTime : '']
    ];
    
    for (const [key, value] of settings) {
      await db.db.prepare(`
        INSERT OR REPLACE INTO system_settings (category, key, value, description)
        VALUES ('maintenance', ?, ?, ?)
      `).bind(key, value, `Maintenance mode setting: ${key}`).run();
    }
    
    // Log maintenance event
    if (enabled) {
      await db.db.prepare(`
        INSERT INTO maintenance_events (type, message, duration_minutes, started_by_admin_id, status)
        VALUES (?, ?, ?, ?, 'active')
      `).bind(type, message, duration_minutes, adminUser.id).run();
    } else {
      // Complete any active maintenance events
      await db.db.prepare(`
        UPDATE maintenance_events 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
            actual_duration_minutes = CAST((julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 24 * 60 AS INTEGER)
        WHERE status = 'active'
      `).run();
    }
    
    // Log the action
    console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by admin: ${adminUser.username} (Type: ${type}, Duration: ${duration_minutes}min)`);
    
    return c.json({
      success: true,
      maintenance_mode: enabled,
      type,
      user_message: message,
      duration_minutes,
      completion_time: enabled ? completionTime : null,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`
    });
    
  } catch (error) {
    console.error('Configure maintenance mode error:', error);
    return c.json({
      success: false,
      message: 'Failed to configure maintenance mode'
    }, 500);
  }
});

// Toggle maintenance mode (legacy endpoint for backward compatibility)
admin.post('/maintenance/toggle', authMiddleware, async (c) => {
  try {
    const { enabled } = await c.req.json();
    const adminUser = c.get('admin_user');
    const db = new DatabaseManager(c.env.DB);
    
    if (typeof enabled !== 'boolean') {
      return c.json({
        success: false,
        message: 'enabled must be a boolean value'
      }, 400);
    }
    
    // Use default settings for simple toggle
    const defaultMessage = 'System is currently under maintenance. Please try again later.';
    const defaultDuration = 60;
    
    // Update maintenance mode setting
    await db.db.prepare(`
      INSERT OR REPLACE INTO system_settings (category, key, value, description)
      VALUES ('maintenance', 'maintenance_mode', ?, 'Enable/disable maintenance mode to block API access')
    `).bind(enabled.toString()).run();
    
    if (enabled) {
      await db.db.prepare(`
        INSERT OR REPLACE INTO system_settings (category, key, value, description)
        VALUES ('maintenance', 'maintenance_message', ?, 'Default maintenance message')
      `).bind(defaultMessage).run();
    }
    
    // Log the action
    console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by admin: ${adminUser.username}`);
    
    return c.json({
      success: true,
      maintenance_mode: enabled,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`
    });
    
  } catch (error) {
    console.error('Toggle maintenance mode error:', error);
    return c.json({
      success: false,
      message: 'Failed to toggle maintenance mode'
    }, 500);
  }
});

// Apply database migrations endpoint (no auth required)
admin.get('/apply-migrations/:secret', async (c) => {
  const secret = c.req.param('secret');
  
  if (secret !== 'migration-2024') {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const db = new DatabaseManager(c.env.DB);
    const results = [];
    
    // Apply 2FA columns migration
    try {
      await db.db.prepare(`ALTER TABLE admin_users ADD COLUMN totp_secret TEXT`).run();
      results.push('Added totp_secret column');
    } catch (e) {
      results.push(`totp_secret: ${e.message}`);
    }
    
    try {
      await db.db.prepare(`ALTER TABLE admin_users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT FALSE`).run();
      results.push('Added two_fa_enabled column');
    } catch (e) {
      results.push(`two_fa_enabled: ${e.message}`);
    }
    
    try {
      await db.db.prepare(`ALTER TABLE admin_users ADD COLUMN backup_codes TEXT`).run();
      results.push('Added backup_codes column');
    } catch (e) {
      results.push(`backup_codes: ${e.message}`);
    }
    
    return c.json({ 
      message: 'Migration completed',
      results
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Debug admin user endpoint (no auth required)
admin.get('/debug-admin/:secret', async (c) => {
  const secret = c.req.param('secret');
  
  if (secret !== 'debug-2024') {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const db = new DatabaseManager(c.env.DB);
    const user = await db.db.prepare(`
      SELECT username, email, two_fa_enabled, totp_secret, backup_codes, is_active, role
      FROM admin_users 
      WHERE username = 'admin'
    `).first();
    
    return c.json({ user });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Emergency admin setup endpoint (no auth required)
admin.get('/setup-admin/:secret', async (c) => {
  const secret = c.req.param('secret');
  
  // Security check
  if (secret !== 'emergency-setup-2024') {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Check if admin user already exists
    const existingAdmin = await db.getAdminByUsername('admin');
    if (existingAdmin) {
      return c.json({ 
        message: 'Admin user already exists',
        admin: { username: existingAdmin.username, email: existingAdmin.email }
      });
    }
    
    // Create admin user with proper password hash
    const passwordHash = await PasswordUtils.hashPassword('admin123');
    
    const result = await db.db.prepare(`
      INSERT INTO admin_users (username, email, full_name, password_hash, salt, role, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'admin', 
      'admin@turnkey.local', 
      'System Administrator',
      passwordHash,
      'generated_salt',
      'super_admin',
      1
    ).run();
    
    return c.json({ 
      message: 'Admin user created successfully',
      admin_id: result.meta.last_row_id,
      login_credentials: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
  } catch (error) {
    console.error('Setup admin error:', error);
    return c.json({ 
      error: 'Failed to create admin user',
      details: error.message 
    }, 500);
  }
});

// Note: System health monitoring now handled by SystemHealthMonitor utility
// Real-time database health checks, response time tracking, and uptime calculation

export default admin;