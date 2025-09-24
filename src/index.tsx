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

const app = new Hono<AppContext>();

// Global middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: '*', // Configure appropriately for production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
}));

// Static file routes - development fallback  
app.get('/static/*', (c) => {
  const path = c.req.path;
  
  if (path.endsWith('.js')) {
    return c.text('console.log("JS file loaded: ' + path + '");', 200, {
      'Content-Type': 'application/javascript'
    });
  } else if (path.endsWith('.css')) {
    return c.text('/* CSS file: ' + path + ' */', 200, {
      'Content-Type': 'text/css' 
    });
  }
  
  return c.text('File not found', 404);
});

app.get('/favicon.ico', (c) => {
  return c.text('', 204);
});

// API Routes
app.route('/api/license', license);
app.route('/api/admin', admin);

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

// System info endpoint
app.get('/api/info', (c) => {
  return c.json({
    name: 'TurnkeyAppShield',
    version: '2.0.0',
    description: 'Modern software protection and licensing system',
    features: [
      'Hardware fingerprinting',
      'AES-256-GCM encryption', 
      'Real-time license validation',
      'Advanced security monitoring',
      'Geo-restriction support',
      'Rate limiting and DDoS protection',
      'Comprehensive analytics'
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
        <script src="/static/admin.js"></script>
    </body>
    </html>
  `);
});

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
                    <!-- Hardware Fingerprinting -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-blue-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-fingerprint text-2xl text-brand-blue"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Hardware Fingerprinting</h3>
                        <p class="text-gray-600">
                            Advanced device identification using MAC addresses, hardware hashes, 
                            and system characteristics for secure license binding.
                        </p>
                    </div>

                    <!-- Real-time Validation -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-green-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-check-circle text-2xl text-green-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Real-time Validation</h3>
                        <p class="text-gray-600">
                            Instant license validation with sub-100ms response times powered 
                            by Cloudflare's global edge network.
                        </p>
                    </div>

                    <!-- Advanced Encryption -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-purple-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-lock text-2xl text-purple-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">AES-256-GCM Encryption</h3>
                        <p class="text-gray-600">
                            Military-grade encryption with authenticated encryption providing 
                            both confidentiality and integrity protection.
                        </p>
                    </div>

                    <!-- Security Monitoring -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-red-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-shield-alt text-2xl text-red-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Security Monitoring</h3>
                        <p class="text-gray-600">
                            Comprehensive threat detection with automatic blocking of 
                            suspicious activities and detailed security event logging.
                        </p>
                    </div>

                    <!-- Geo-restrictions -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-yellow-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-globe text-2xl text-yellow-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Geographic Control</h3>
                        <p class="text-gray-600">
                            Flexible geographic restrictions and IP-based access control 
                            for compliance and regional licensing requirements.
                        </p>
                    </div>

                    <!-- Analytics Dashboard -->
                    <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                        <div class="bg-indigo-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                            <i class="fas fa-chart-bar text-2xl text-indigo-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Analytics Dashboard</h3>
                        <p class="text-gray-600">
                            Real-time analytics with comprehensive reporting on license usage, 
                            security events, and system performance metrics.
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
