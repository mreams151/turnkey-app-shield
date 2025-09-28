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
import { serveStatic } from 'hono/cloudflare-workers';
app.use('/static/*', serveStatic({ root: './public' }));

app.get('/favicon.ico', (c) => {
  return c.text('', 204);
});

// API Routes
app.route('/api/license', license);
app.route('/api/admin', admin);
app.route('/api/init', init);
// Upload API routes now secured within admin routes only

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
        <script src="/static/admin.js?v=${Date.now()}"></script>
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
