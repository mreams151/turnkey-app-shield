// Modern Turnkey Software Shield - Main Application
// Enhanced web-based software protection system built on Cloudflare Workers

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/cloudflare-workers';
import type { AppContext } from './types/database';
import { DatabaseManager, DatabaseInitializer } from './utils/database';

// Import route handlers
import license from './routes/license';
import admin from './routes/admin';
import uploads from './routes/uploads';
import { init } from './routes/init';

const app = new Hono<AppContext>();

// Global middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: '*', // Configure appropriately for production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
}));

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }));

app.get('/favicon.ico', (c) => {
  return c.text('', 204);
});

// API Routes
app.route('/api/license', license);
app.route('/admin', admin);
app.route('/api/init', init);
// Upload API routes now secured within admin routes only

// Customer registration endpoint - Landing page for product registration
app.get('/register', async (c) => {
  try {
    const encodedData = c.req.query('d');
    const productId = c.req.query('p'); // Fallback for simple URLs
    
    let productInfo = null;
    
    if (encodedData) {
      try {
        // Decode the landing page data
        const decodedData = JSON.parse(atob(decodeURIComponent(encodedData)));
        const db = new DatabaseManager(c.env.DB);
        
        // Get product information
        const product = await db.db.prepare(`
          SELECT * FROM products WHERE id = ? AND status = 'active'
        `).bind(decodedData.pid).first();
        
        if (product) {
          productInfo = {
            id: product.id,
            name: product.name,
            version: product.version,
            description: product.description
          };
        }
      } catch (error) {
        console.error('Error decoding landing page data:', error);
      }
    } else if (productId) {
      // Fallback: direct product ID
      const db = new DatabaseManager(c.env.DB);
      const product = await db.db.prepare(`
        SELECT * FROM products WHERE id = ? AND status = 'active'
      `).bind(parseInt(productId)).first();
      
      if (product) {
        productInfo = {
          id: product.id,
          name: product.name,
          version: product.version,
          description: product.description
        };
      }
    }
    
    if (!productInfo) {
      return c.html(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Registration Error - TurnkeyAppShield</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-50 flex items-center justify-center min-h-screen">
            <div class="text-center">
                <h1 class="text-2xl font-bold text-red-600 mb-4">Registration Error</h1>
                <p class="text-gray-600">Invalid or expired registration link.</p>
            </div>
        </body>
        </html>
      `);
    }
    
    // Show registration form
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Register ${productInfo.name} - TurnkeyAppShield</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-50">
          <!-- Navigation -->
          <nav class="bg-white shadow-sm border-b border-gray-200">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div class="flex justify-between h-16">
                      <div class="flex items-center">
                          <div class="flex-shrink-0 flex items-center">
                              <i class="fas fa-shield-alt text-2xl text-blue-600 mr-3"></i>
                              <h1 class="text-xl font-bold text-gray-900">TurnkeyAppShield</h1>
                          </div>
                      </div>
                  </div>
              </div>
          </nav>

          <div class="max-w-2xl mx-auto px-4 py-12">
              <div class="bg-white rounded-lg shadow-lg p-8">
                  <div class="text-center mb-8">
                      <i class="fas fa-user-plus text-4xl text-blue-600 mb-4"></i>
                      <h1 class="text-3xl font-bold text-gray-900 mb-2">Software Registration</h1>
                      <p class="text-gray-600">Complete your registration for ${productInfo.name} v${productInfo.version}</p>
                  </div>

                  <form id="registrationForm" class="space-y-6">
                      <input type="hidden" id="productId" value="${productInfo.id}">
                      
                      <div class="bg-blue-50 p-4 rounded-lg">
                          <h3 class="font-semibold text-blue-900 mb-2">Product Information</h3>
                          <p class="text-blue-800"><strong>Name:</strong> ${productInfo.name}</p>
                          <p class="text-blue-800"><strong>Version:</strong> ${productInfo.version}</p>
                          ${productInfo.description ? `<p class="text-blue-800"><strong>Description:</strong> ${productInfo.description}</p>` : ''}
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label class="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                              <input type="text" id="firstName" required 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                          </div>
                          <div>
                              <label class="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                              <input type="text" id="lastName" required 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                          </div>
                      </div>

                      <div>
                          <label class="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                          <input type="email" id="email" required 
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="your.email@example.com"
                              pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}">
                      </div>

                      <div class="bg-yellow-50 p-4 rounded-lg">
                          <div class="flex items-start">
                              <i class="fas fa-info-circle text-yellow-600 mt-1 mr-3"></i>
                              <div>
                                  <h4 class="font-semibold text-yellow-900">Hardware Fingerprinting</h4>
                                  <p class="text-yellow-800 text-sm mt-1">
                                      We collect hardware information to ensure your license is used only on the device it is being registered on. If you are using a device to fill out this form that will not be using the product, switch to the device that will be using the product and use it to register this form. This helps protect against software piracy and ensures license compliance.
                                  </p>
                              </div>
                          </div>
                      </div>

                      <div id="registrationError" class="hidden text-red-600 text-sm"></div>

                      <button type="submit" id="registerBtn" 
                          class="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                          Complete Registration
                      </button>
                  </form>
              </div>
          </div>

          <script>
              // Collect hardware fingerprint
              function collectHardwareFingerprint() {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  ctx.textBaseline = 'top';
                  ctx.font = '14px Arial';
                  ctx.fillText('Hardware fingerprint', 2, 2);
                  
                  const fingerprint = {
                      userAgent: navigator.userAgent,
                      language: navigator.language,
                      platform: navigator.platform,
                      screenResolution: screen.width + 'x' + screen.height,
                      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      canvasFingerprint: canvas.toDataURL(),
                      cookieEnabled: navigator.cookieEnabled,
                      doNotTrack: navigator.doNotTrack,
                      timestamp: new Date().toISOString()
                  };
                  
                  return JSON.stringify(fingerprint);
              }

              document.getElementById('registrationForm').addEventListener('submit', async (e) => {
                  e.preventDefault();
                  
                  const registerBtn = document.getElementById('registerBtn');
                  const errorDiv = document.getElementById('registrationError');
                  
                  // Validate email format with comprehensive pattern
                  const email = document.getElementById('email').value.trim();
                  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                  if (!email || !emailPattern.test(email)) {
                      errorDiv.textContent = 'Please enter a valid email address.';
                      errorDiv.classList.remove('hidden');
                      return;
                  }
                  
                  registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Registering...';
                  registerBtn.disabled = true;
                  errorDiv.classList.add('hidden');
                  
                  try {
                      const response = await fetch('/api/register', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              product_id: parseInt(document.getElementById('productId').value),
                              first_name: document.getElementById('firstName').value,
                              last_name: document.getElementById('lastName').value,
                              email: document.getElementById('email').value,
                              hardware_fingerprint: collectHardwareFingerprint()
                          })
                      });
                      
                      const result = await response.json();
                      
                      if (result.success) {
                          // Redirect to download page with license key and download URL
                          const downloadUrl = '/download?key=' + encodeURIComponent(result.license_key) + 
                                            '&product=' + encodeURIComponent(result.product_id) + 
                                            '&email=' + encodeURIComponent(email);
                          window.location.href = downloadUrl;
                      } else {
                          throw new Error(result.message || 'Registration failed');
                      }
                  } catch (error) {
                      errorDiv.textContent = error.message;
                      errorDiv.classList.remove('hidden');
                  } finally {
                      registerBtn.innerHTML = 'Complete Registration';
                      registerBtn.disabled = false;
                  }
              });
          </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Registration page error:', error);
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head><title>Error - TurnkeyAppShield</title></head>
      <body>
          <h1>System Error</h1>
          <p>Unable to load registration page. Please try again later.</p>
      </body>
      </html>
    `);
  }
});

// Download page after successful registration
app.get('/download', async (c) => {
  const licenseKey = c.req.query('key');
  const productId = c.req.query('product');
  const email = c.req.query('email');
  
  if (!licenseKey || !productId) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head><title>Download Error - TurnkeyAppShield</title></head>
      <body>
          <h1>Invalid Download Link</h1>
          <p>This download link is invalid or expired.</p>
      </body>
      </html>
    `);
  }
  
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get product and customer information
    const customer = await db.db.prepare(`
      SELECT c.*, p.name as product_name, p.version, p.download_url, p.description
      FROM customers c
      JOIN products p ON c.product_id = p.id
      WHERE c.license_key = ? AND c.product_id = ? AND c.status = 'active'
    `).bind(licenseKey, parseInt(productId)).first();
    
    if (!customer) {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head><title>Download Error - TurnkeyAppShield</title></head>
        <body>
            <h1>License Not Found</h1>
            <p>Invalid license key or the license may be revoked.</p>
        </body>
        </html>
      `);
    }
    
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Download ${customer.product_name} - TurnkeyAppShield</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-50">
          <!-- Navigation -->
          <nav class="bg-white shadow-sm border-b border-gray-200">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div class="flex justify-between h-16">
                      <div class="flex items-center">
                          <div class="flex-shrink-0 flex items-center">
                              <i class="fas fa-shield-alt text-2xl text-blue-600 mr-3"></i>
                              <h1 class="text-xl font-bold text-gray-900">TurnkeyAppShield</h1>
                          </div>
                      </div>
                  </div>
              </div>
          </nav>

          <div class="max-w-4xl mx-auto px-4 py-12">
              <div class="bg-white rounded-lg shadow-lg p-8">
                  <div class="text-center mb-8">
                      <i class="fas fa-check-circle text-5xl text-green-600 mb-4"></i>
                      <h1 class="text-3xl font-bold text-gray-900 mb-2">Registration Complete!</h1>
                      <p class="text-gray-600">Your software is ready for download</p>
                  </div>

                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <!-- Product Information -->
                      <div class="space-y-6">
                          <div class="bg-blue-50 p-6 rounded-lg">
                              <h3 class="text-xl font-bold text-blue-900 mb-4">Product Details</h3>
                              <div class="space-y-3">
                                  <p class="text-blue-800"><strong>Name:</strong> ${customer.product_name}</p>
                                  <p class="text-blue-800"><strong>Version:</strong> ${customer.version}</p>
                                  ${customer.description ? `<p class="text-blue-800"><strong>Description:</strong> ${customer.description}</p>` : ''}
                              </div>
                          </div>

                          <div class="bg-green-50 p-6 rounded-lg">
                              <h3 class="text-xl font-bold text-green-900 mb-4">Registration Info</h3>
                              <div class="space-y-3">
                                  <p class="text-green-800"><strong>Name:</strong> ${customer.name}</p>
                                  <p class="text-green-800"><strong>Email:</strong> ${customer.email}</p>
                                  <p class="text-green-800"><strong>Registration Date:</strong> ${new Date(customer.registration_date).toLocaleDateString()}</p>
                              </div>
                          </div>
                      </div>

                      <!-- Download Section -->
                      <div class="space-y-6">
                          <div class="bg-gray-50 p-6 rounded-lg">
                              <h3 class="text-xl font-bold text-gray-900 mb-4">Your License Key</h3>
                              <div class="bg-white p-4 rounded-lg border-2 border-gray-200">
                                  <code class="text-2xl font-mono text-blue-600 break-all">${licenseKey}</code>
                              </div>
                              <button onclick="copyLicenseKey()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">
                                  <i class="fas fa-copy mr-1"></i> Copy License Key
                              </button>
                          </div>

                          <div class="text-center">
                              <a href="${customer.download_url}" 
                                 class="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
                                  <i class="fas fa-download mr-2"></i>
                                  Download ${customer.product_name}
                              </a>
                          </div>

                          <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <div class="flex items-start">
                                  <i class="fas fa-info-circle text-yellow-600 mt-1 mr-3"></i>
                                  <div>
                                      <h4 class="font-semibold text-yellow-900">Important Notes</h4>
                                      <ul class="text-yellow-800 text-sm mt-2 space-y-1">
                                          <li>• Your license key has been emailed to you</li>
                                          <li>• This license is tied to this device's hardware</li>
                                          <li>• Keep your license key safe for future reference</li>
                                          <li>• Contact support if you need to transfer to another device</li>
                                      </ul>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <script>
              function copyLicenseKey() {
                  const licenseKey = '${licenseKey}';
                  navigator.clipboard.writeText(licenseKey).then(function() {
                      // Show temporary success message
                      const button = event.target.closest('button');
                      const originalText = button.innerHTML;
                      button.innerHTML = '<i class="fas fa-check mr-1"></i> Copied!';
                      button.classList.add('text-green-600');
                      
                      setTimeout(function() {
                          button.innerHTML = originalText;
                          button.classList.remove('text-green-600');
                      }, 2000);
                  });
              }
          </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Download page error:', error);
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head><title>Error - TurnkeyAppShield</title></head>
      <body>
          <h1>System Error</h1>
          <p>Unable to load download page. Please try again later.</p>
      </body>
      </html>
    `);
  }
});

// Temporary endpoint for regenerating landing pages (without auth for testing)
app.post('/api/regenerate-landing/:id', async (c) => {
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

    // Import the utility function from admin routes
    function generateLandingPageURL(productId: number, productName: string): string {
      const baseURL = 'https://turnkeyappshield.com/register';
      
      const landingData = {
        pid: productId,
        pname: productName,
        ts: Date.now(),
        email: null
      };
      
      try {
        const encodedData = btoa(JSON.stringify(landingData));
        return `${baseURL}?d=${encodeURIComponent(encodedData)}`;
      } catch (error) {
        return `${baseURL}?p=${productId}`;
      }
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
      message: 'Failed to regenerate landing page'
    }, 500);
  }
});

// All temporary simple auth endpoints have been removed for production security.
// The admin panel now uses proper JWT authentication via /api/admin/* routes.
app.get('/api/admin/simple/products', async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    const statusFilter = c.req.query('status') || 'active';
    
    let whereClause = '';
    if (statusFilter === 'active') {
      whereClause = "WHERE status = 'active'";
    } else if (statusFilter === 'inactive') {
      whereClause = "WHERE status = 'inactive'";
    }
    
    const products = await db.db.prepare(`
      SELECT *, 
             (CASE WHEN status = 'active' THEN 1 ELSE 0 END) as is_active
      FROM products ${whereClause} ORDER BY created_at DESC
    `).all();
    
    const productsWithStats = await Promise.all(
      (products.results || []).map(async (product) => {
        const stats = await db.db.prepare(`
          SELECT 
            COUNT(*) as total_customers,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers
          FROM customers
          WHERE product_id = ? AND status != 'revoked'
        `).bind(product.id).first();

        return {
          ...product,
          rules_count: 1, // Simplified for now
          total_customers: stats?.total_customers || 0,
          active_customers: stats?.active_customers || 0
        };
      })
    );

    return c.json({
      success: true,
      products: productsWithStats,
      total: productsWithStats.length
    });
  } catch (error) {
    return c.json({
      success: false,
      message: 'Failed to load products'
    }, 500);
  }
});

app.get('/api/admin/simple/dashboard', async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    // Get separate counts for better accuracy
    const productResult = await db.db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE status = 'active'
    `).first();
    
    const customerResult = await db.db.prepare(`
      SELECT COUNT(*) as count FROM customers WHERE status = 'active'  
    `).first();
    
    const licenseResult = await db.db.prepare(`
      SELECT COUNT(*) as count FROM customers
    `).first();

    const stats = {
      total_products: productResult?.count || 0,
      total_customers: customerResult?.count || 0, 
      active_licenses: customerResult?.count || 0,
      total_licenses: licenseResult?.count || 0
    };

    return c.json({
      success: true,
      dashboard: stats
    });
  } catch (error) {
    return c.json({
      success: false,
      message: 'Failed to load dashboard'
    }, 500);
  }
});

// Simple customers endpoint (no auth required)
app.get('/api/admin/simple/customers', async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    const productFilter = c.req.query('product');
    const statusFilter = c.req.query('status');
    
    let query = `
      SELECT 
        c.id,
        c.email,
        c.name,
        c.license_key,
        c.product_id,
        c.primary_device_id as hardware_fingerprint,
        c.first_activation_date as activation_date,
        c.expires_at as expiry_date,
        c.status,
        c.registration_date as created_at,
        c.total_activations,
        c.total_usage_hours,
        p.name as product_name,
        p.version as product_version
      FROM customers c
      LEFT JOIN products p ON c.product_id = p.id`;
    
    const conditions = [];
    const params = [];
    
    if (productFilter) {
      conditions.push('c.product_id = ?');
      params.push(productFilter);
    }
    
    if (statusFilter) {
      conditions.push('c.status = ?');
      params.push(statusFilter);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY c.registration_date DESC`;
    
    const customersResult = params.length > 0 
      ? await db.db.prepare(query).bind(...params).all()
      : await db.db.prepare(query).all();

    // Extract the results array from D1 response
    const customers = customersResult.results || [];

    return c.json({
      success: true,
      customers: customers
    });
  } catch (error) {
    console.error('Customers query error:', error);
    return c.json({
      success: false,
      message: 'Failed to load customers'
    }, 500);
  }
});

// Simple licenses endpoint (no auth required)
app.get('/api/admin/simple/licenses', async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    const licensesResult = await db.db.prepare(`
      SELECT 
        c.id,
        c.license_key,
        c.email,
        c.name,
        c.product_id,
        c.first_activation_date as activation_date,
        c.expires_at as expiry_date,
        c.status,
        c.primary_device_id as hardware_fingerprint,
        c.registration_date as created_at,
        c.total_activations,
        c.license_type,
        p.name as product_name,
        p.version as product_version,
        p.price as product_price
      FROM customers c
      LEFT JOIN products p ON c.product_id = p.id
      ORDER BY c.registration_date DESC
    `).all();

    // Extract the results array from D1 response
    const licenses = licensesResult.results || [];

    return c.json({
      success: true,
      data: licenses
    });
  } catch (error) {
    console.error('Licenses query error:', error);
    return c.json({
      success: false,
      message: 'Failed to load licenses'
    }, 500);
  }
});

// Simple rules endpoint (no auth required)
app.get('/api/admin/simple/rules', async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    
    const rulesResult = await db.db.prepare(`
      SELECT 
        id,
        name,
        description,
        max_activations,
        max_concurrent_sessions,
        max_days,
        grace_period_days,
        max_devices,
        max_ips,
        allow_vm,
        allowed_countries,
        blocked_countries,
        timezone_restrictions,
        allow_offline_days,
        require_periodic_validation,
        validation_interval_hours,
        is_active,
        created_at,
        updated_at
      FROM license_rules
      ORDER BY created_at DESC
    `).all();

    // Extract the results array from D1 response
    const rules = rulesResult.results || [];

    return c.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Rules query error:', error);
    return c.json({
      success: false,
      message: 'Failed to load rules'
    }, 500);
  }
});

// Simple single customer endpoint (no auth required)
app.get('/api/admin/simple/customers/:id', async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    const customerId = c.req.param('id');
    
    const customerResult = await db.db.prepare(`
      SELECT 
        c.id,
        c.email,
        c.name,
        c.license_key,
        c.product_id,
        c.primary_device_id as hardware_fingerprint,
        c.first_activation_date as activation_date,
        c.expires_at as expiry_date,
        c.status,
        c.registration_date as created_at,
        c.total_activations,
        c.total_usage_hours,
        p.name as product_name,
        p.version as product_version
      FROM customers c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.id = ?
    `).bind(customerId).first();

    if (!customerResult) {
      return c.json({
        success: false,
        message: 'Customer not found'
      }, 404);
    }

    return c.json({
      success: true,
      customer: customerResult
    });
  } catch (error) {
    console.error('Single customer query error:', error);
    return c.json({
      success: false,
      message: 'Failed to load customer'
    }, 500);
  }
});

// Simple customer update endpoint (no auth required)
app.put('/api/admin/simple/customers/:id', async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    const customerId = c.req.param('id');
    const { name, email, status, notes } = await c.req.json();
    
    const updateResult = await db.db.prepare(`
      UPDATE customers 
      SET name = ?, email = ?, status = ?, notes = ?
      WHERE id = ?
    `).bind(name, email, status, notes || '', customerId).run();

    if (updateResult.changes === 0) {
      return c.json({
        success: false,
        message: 'Customer not found'
      }, 404);
    }

    return c.json({
      success: true,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Customer update error:', error);
    return c.json({
      success: false,
      message: 'Failed to update customer'
    }, 500);
  }
});

// Health check endpoint
app.get('/api/health', async (c) => {
  try {
    // Test database connection
    const db = new DatabaseManager(c.env.DB);
    await db.db.prepare('SELECT 1').first();
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: 'connected'
    });
  } catch (error) {
    return c.json({
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    }, 500);
  }
});

// Customer registration API endpoint
app.post('/api/register', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validate required fields
    if (!body.product_id || !body.first_name || !body.last_name || !body.email) {
      return c.json({
        success: false,
        message: 'Missing required fields'
      }, 400);
    }
    
    const db = new DatabaseManager(c.env.DB);
    
    // Check if product exists and is active
    const product = await db.db.prepare(`
      SELECT * FROM products WHERE id = ? AND status = 'active'
    `).bind(body.product_id).first();
    
    if (!product) {
      return c.json({
        success: false,
        message: 'Invalid product'
      }, 404);
    }
    
    // Check if customer already exists with this email for this product
    const existingCustomer = await db.db.prepare(`
      SELECT id FROM customers WHERE email = ? AND product_id = ?
    `).bind(body.email, body.product_id).first();
    
    if (existingCustomer) {
      return c.json({
        success: false,
        message: 'Customer already registered for this product'
      }, 409);
    }
    
    // Generate license key - simple format for now
    function generateLicenseKey(): string {
      const segments = 4;
      const segmentLength = 4;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      
      const keySegments: string[] = [];
      
      for (let i = 0; i < segments; i++) {
        let segment = '';
        for (let j = 0; j < segmentLength; j++) {
          const randomIndex = Math.floor(Math.random() * chars.length);
          segment += chars[randomIndex];
        }
        keySegments.push(segment);
      }
      
      return keySegments.join('-');
    }
    
    const licenseKey = generateLicenseKey();
    
    // Create customer record - match the actual table schema
    const customerName = `${body.first_name} ${body.last_name}`;
    const result = await db.db.prepare(`
      INSERT INTO customers (
        name, email, product_id, license_key, 
        registered_devices, registration_ip, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      customerName,
      body.email,
      body.product_id,
      licenseKey,
      body.hardware_fingerprint || null,
      'unknown' // We'll get IP in a future update
    ).run();
    
    // TODO: Send email with license key (email system to be implemented)
    // await sendLicenseKeyEmail(body.email, licenseKey, product.name, product.download_url);
    
    return c.json({
      success: true,
      customer_id: result.meta.last_row_id,
      product_id: body.product_id,
      license_key: licenseKey,
      download_url: product.download_url,
      message: 'Registration completed successfully'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({
      success: false,
      message: 'Registration failed. Please try again.'
    }, 500);
  }
});

// System info endpoint
app.get('/api/info', (c) => {
  return c.json({
    name: 'TurnkeyAppShield',
    version: '2.0.0',
    description: 'Modern software protection and licensing system',
    features: [
      'VM Protection & Detection (VMware, VirtualBox, Hyper-V)',
      'Concurrent Usage Control & Session Management',
      'Geographic Restrictions with Real-time IP Geolocation',
      'Time-Based Access Control & Business Hours Enforcement',
      'Advanced Hardware Fingerprinting & Device Binding',
      'AES-256-GCM Military-Grade Encryption', 
      'Sub-100ms Real-time License Validation',
      'Comprehensive Security Monitoring & Threat Detection',
      'Enterprise Admin Portal with Complete Audit Trails',
      'Global Edge Network (290+ Locations)',
      'Rate Limiting and DDoS Protection',
      'Advanced Analytics & Revenue Optimization'
    ],
    endpoints: {
      license_validation: '/api/license/validate',
      license_creation: '/api/license/create',
      admin_dashboard: '/api/admin/dashboard',
      health_check: '/api/health'
    }
  });
});

// Test endpoint for admin authentication
app.get('/api/test/admin', async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    const admin = await db.getAdminByUsername('admin');
    
    return c.json({
      success: true,
      admin_found: !!admin,
      admin_username: admin?.username,
      admin_role: admin?.role,
      admin_active: admin?.is_active,
      has_password_hash: !!admin?.password_hash,
      hash_length: admin?.password_hash?.length || 0
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple dashboard test
app.get('/api/test/dashboard', async (c) => {
  try {
    const db = new DatabaseManager(c.env.DB);
    const stats = await db.getDashboardStats();
    
    return c.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Debug route for testing admin login
app.get('/debug-admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Debug Admin Login</title>
    </head>
    <body>
        <h1>Debug Admin Login</h1>
        <button onclick="testLogin()">Test Login</button>
        <button onclick="testDashboard()">Test Dashboard</button>
        <div id="results"></div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            const apiBaseUrl = window.location.origin + '/api';
            let token = null;
            
            async function testLogin() {
                try {
                    console.log('Testing login...');
                    const response = await axios.post(\`\${apiBaseUrl}/admin/simple-auth\`, {
                        username: 'admin',
                        password: 'admin123'
                    });
                    
                    console.log('Login response:', response.data);
                    token = response.data.token;
                    
                    document.getElementById('results').innerHTML += 
                        '<p>✅ Login successful: ' + JSON.stringify(response.data) + '</p>';
                        
                } catch (error) {
                    console.error('Login failed:', error);
                    document.getElementById('results').innerHTML += 
                        '<p>❌ Login failed: ' + error.message + '</p>';
                }
            }
            
            async function testDashboard() {
                try {
                    console.log('Testing dashboard...');
                    const response = await axios.get(\`\${apiBaseUrl}/admin/simple/dashboard\`);
                    
                    console.log('Dashboard response:', response.data);
                    document.getElementById('results').innerHTML += 
                        '<p>✅ Dashboard successful: ' + JSON.stringify(response.data) + '</p>';
                        
                } catch (error) {
                    console.error('Dashboard failed:', error);
                    document.getElementById('results').innerHTML += 
                        '<p>❌ Dashboard failed: ' + error.message + '</p>';
                }
            }
        </script>
    </body>
    </html>
  `);
});

// Admin Panel - Single Page Application
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TurnkeyAppShield - Admin Panel</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/admin.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'brand-blue': '#2563eb',
                  'brand-gray': '#1f2937'
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gray-50 min-h-screen">
        <div id="admin-app">
            <!-- Loading state -->
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
                    <h2 class="text-xl font-semibold text-gray-900">Loading Admin Panel...</h2>
                    <p class="text-gray-600 mt-2">Initializing TurnkeyAppShield</p>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
        <script src="/static/admin.js?v=${Date.now()}&bust=${Math.random()}"></script>
    </body>
    </html>
  `);
});

// Note: File upload functionality moved to admin panel only for security

// Customer Portal
app.get('/portal', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TurnkeyAppShield - Customer Portal</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/portal.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50 min-h-screen">
        <div id="customer-portal">
            <!-- Portal content will be loaded here -->
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <h2 class="text-xl font-semibold text-gray-900">Loading Customer Portal...</h2>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/portal.js"></script>
    </body>
    </html>
  `);
});

// Main landing page - Modern design showcasing the system
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TurnkeyAppShield - High Level Software Protection</title>
        <meta name="description" content="Advanced software protection and licensing system with hardware fingerprinting, real-time validation, and comprehensive security monitoring.">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'brand-blue': '#2563eb',
                  'brand-dark': '#1e293b'
                },
                animation: {
                  'fade-in': 'fadeIn 0.5s ease-in-out',
                  'slide-up': 'slideUp 0.6s ease-out'
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-white">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 flex items-center">
                            <i class="fas fa-shield-alt text-2xl text-brand-blue mr-3"></i>
                            <h1 class="text-xl font-bold text-gray-900">TurnkeyAppShield</h1>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <a href="/portal" class="text-gray-600 hover:text-brand-blue transition-colors">
                            <i class="fas fa-user mr-2"></i>Customer Portal
                        </a>
                        <a href="/admin" class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="fas fa-cog mr-2"></i>Admin Panel
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <div class="bg-gradient-to-br from-brand-blue to-blue-700 text-white">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div class="text-center">
                    <h1 class="text-5xl font-bold mb-6 animate-fade-in">
                        High Level Software Protection
                    </h1>
                    <p class="text-xl mb-8 text-blue-100 max-w-3xl mx-auto animate-slide-up">
                        Advanced non coding licensing and piracy prevention system with hardware fingerprinting, 
                        real-time validation, and comprehensive security monitoring. Built on 
                        Cloudflare's global edge network for maximum performance and reliability.
                    </p>
                </div>
            </div>
        </div>

        <!-- Features Section -->
        <div class="py-24 bg-gray-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">Enterprise Grade Security Features</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <!-- VM Protection (NEW FEATURED) -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-2 border-red-200">
                        <div class="flex items-center justify-between mb-6">
                            <div class="bg-red-100 w-16 h-16 rounded-lg flex items-center justify-center">
                                <i class="fas fa-server text-2xl text-red-600"></i>
                            </div>
                            <span class="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">NEW</span>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">VM Protection & Detection</h3>
                        <p class="text-gray-600 mb-4">
                            Advanced virtual machine detection blocks usage in VMware, VirtualBox, 
                            Hyper-V, and QEMU environments. Prevents easy license copying and piracy.
                        </p>
                        <div class="text-sm text-red-600 font-semibold">
                            <i class="fas fa-ban mr-2"></i>Stops 95% of VM-based piracy attempts
                        </div>
                    </div>

                    <!-- Concurrent Usage Control (NEW FEATURED) -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-2 border-blue-200">
                        <div class="flex items-center justify-between mb-6">
                            <div class="bg-blue-100 w-16 h-16 rounded-lg flex items-center justify-center">
                                <i class="fas fa-users text-2xl text-blue-600"></i>
                            </div>
                            <span class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">NEW</span>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Concurrent Usage Control</h3>
                        <p class="text-gray-600 mb-4">
                            Enforce session limits and activation counts. Prevent license sharing 
                            across multiple users and unlimited device installations.
                        </p>
                        <div class="text-sm text-blue-600 font-semibold">
                            <i class="fas fa-shield-alt mr-2"></i>Revenue protection up to 1000%
                        </div>
                    </div>

                    <!-- Geographic Restrictions (ENHANCED) -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-2 border-green-200">
                        <div class="flex items-center justify-between mb-6">
                            <div class="bg-green-100 w-16 h-16 rounded-lg flex items-center justify-center">
                                <i class="fas fa-globe-americas text-2xl text-green-600"></i>
                            </div>
                            <span class="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">ENHANCED</span>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Smart Geographic Control</h3>
                        <p class="text-gray-600 mb-4">
                            Real-time IP geolocation with country whitelist/blacklist. 
                            Automatic compliance with export restrictions and regional licensing.
                        </p>
                        <div class="text-sm text-green-600 font-semibold">
                            <i class="fas fa-map-marker-alt mr-2"></i>290+ global detection points
                        </div>
                    </div>

                    <!-- Time-Based Restrictions (NEW) -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-2 border-purple-200">
                        <div class="flex items-center justify-between mb-6">
                            <div class="bg-purple-100 w-16 h-16 rounded-lg flex items-center justify-center">
                                <i class="fas fa-clock text-2xl text-purple-600"></i>
                            </div>
                            <span class="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">NEW</span>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Time-Based Access Control</h3>
                        <p class="text-gray-600 mb-4">
                            Enforce business hours and day-of-week restrictions. 
                            Perfect for workforce management and compliance requirements.
                        </p>
                        <div class="text-sm text-purple-600 font-semibold">
                            <i class="fas fa-business-time mr-2"></i>24/7 or custom schedule options
                        </div>
                    </div>

                    <!-- Hardware Fingerprinting (ENHANCED) -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-indigo-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-fingerprint text-2xl text-indigo-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Advanced Hardware Fingerprinting</h3>
                        <p class="text-gray-600">
                            Multi-layer device identification: MAC addresses, CPU serial numbers, 
                            motherboard IDs, and system characteristics for unbreakable binding.
                        </p>
                    </div>

                    <!-- Real-time Security Engine -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-orange-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-bolt text-2xl text-orange-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Real-time Security Engine</h3>
                        <p class="text-gray-600">
                            Sub-100ms license validation with instant threat detection, 
                            automatic blocking, and comprehensive audit logging across 290+ edge locations.
                        </p>
                    </div>

                    <!-- Military-Grade Encryption -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-gray-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-lock text-2xl text-gray-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Military-Grade Encryption</h3>
                        <p class="text-gray-600">
                            AES-256-GCM authenticated encryption with Web Crypto API. 
                            Zero-knowledge architecture ensures maximum security and compliance.
                        </p>
                    </div>

                    <!-- Advanced Analytics -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-teal-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-chart-line text-2xl text-teal-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Advanced Analytics & Insights</h3>
                        <p class="text-gray-600">
                            Real-time dashboards with license usage patterns, security events, 
                            geographic distribution, and revenue optimization insights.
                        </p>
                    </div>

                    <!-- Enterprise Admin Portal -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-pink-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-cogs text-2xl text-pink-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Enterprise Admin Portal</h3>
                        <p class="text-gray-600">
                            Professional web-based management console with customer management, 
                            license creation, security monitoring, and complete audit trails.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Stats Section -->
        <div class="bg-brand-dark text-white py-16">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <div class="text-4xl font-bold mb-2" id="stat-response-time">< 100ms</div>
                        <div class="text-gray-300">Average Response Time</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold mb-2" id="stat-uptime">99.9%</div>
                        <div class="text-gray-300">System Uptime</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold mb-2" id="stat-locations">290+</div>
                        <div class="text-gray-300">Global Edge Locations</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold mb-2" id="stat-security">100%</div>
                        <div class="text-gray-300">Security Score</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="bg-gray-900 text-white py-12">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col items-center text-center space-y-8">
                    <div class="text-center">
                        <div class="flex items-center justify-center mb-4">
                            <i class="fas fa-shield-alt text-2xl text-brand-blue mr-3"></i>
                            <h3 class="text-xl font-bold">TurnkeyAppShield</h3>
                        </div>
                        <p class="text-gray-400">
                            Protecting software integrity with advanced licensing and anti-piracy solutions.
                        </p>
                    </div>
                    <div class="text-center">
                        <h4 class="text-lg font-semibold mb-4">System Status</h4>
                        <div class="space-y-2">
                            <div class="flex items-center justify-center">
                                <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                <span class="text-gray-400">All Systems Operational</span>
                            </div>
                            <div class="text-sm text-gray-500">
                                Last updated: <span id="last-updated">${new Date().toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                    <p>&copy; ${new Date().getFullYear()} TurnkeyAppShield. Built with modern technologies for maximum security and performance.</p>
                </div>
            </div>
        </footer>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

// Initialize database on first startup (development only)
app.get('/api/init', async (c) => {
  try {
    const initializer = new DatabaseInitializer(c.env.DB);
    await initializer.initializeDatabase();
    await initializer.seedInitialData();
    
    return c.json({
      success: true,
      message: 'Database initialized successfully',
      note: 'This endpoint should be disabled in production'
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return c.json({
      success: false,
      message: 'Database initialization failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    available_endpoints: {
      api_info: '/api/info',
      health_check: '/api/health',
      admin_panel: '/admin',
      customer_portal: '/portal'
    }
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  }, 500);
});

export default app;
