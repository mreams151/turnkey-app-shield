import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { jwt, sign, verify } from 'hono/jwt'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
  MAX_ACTIVATIONS_PER_LICENSE: string
  ENVIRONMENT: string
  API_VERSION: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS middleware for API routes
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Serve static files
app.use('/*', serveStatic({ root: './public' }))

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'TurnkeyAppShield',
    version: c.env.API_VERSION || 'v1'
  })
})

// JWT middleware for protected routes
app.use('/api/admin/*', async (c, next) => {
  try {
    if (!c.env.JWT_SECRET) {
      return c.json({ error: 'JWT_SECRET not configured' }, 500)
    }
    const jwtMiddleware = jwt({ secret: c.env.JWT_SECRET })
    return jwtMiddleware(c, next)
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
})

// Admin login endpoint
app.post('/api/auth/login', async (c) => {
  try {
    if (!c.env.ADMIN_USERNAME || !c.env.ADMIN_PASSWORD || !c.env.JWT_SECRET) {
      return c.json({ error: 'Authentication not properly configured' }, 500)
    }
    
    const { username, password } = await c.req.json()
    
    if (username === c.env.ADMIN_USERNAME && password === c.env.ADMIN_PASSWORD) {
      const token = await sign({ 
        username, 
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      }, c.env.JWT_SECRET)
      
      return c.json({ token, message: 'Login successful' })
    }
    
    return c.json({ error: 'Invalid credentials' }, 401)
  } catch (error) {
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Verify token endpoint
app.post('/api/auth/verify', async (c) => {
  try {
    if (!c.env.JWT_SECRET) {
      return c.json({ valid: false, error: 'JWT_SECRET not configured' }, 500)
    }
    
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ valid: false }, 401)
    }
    
    const token = authHeader.substring(7)
    await verify(token, c.env.JWT_SECRET)
    return c.json({ valid: true })
  } catch (error) {
    return c.json({ valid: false }, 401)
  }
})

// License validation endpoint
app.post('/api/validate-license', async (c) => {
  try {
    const { licenseKey, hardwareId } = await c.req.json()
    
    if (!licenseKey || !hardwareId) {
      return c.json({ 
        valid: false, 
        error: 'License key and hardware ID are required' 
      }, 400)
    }

    // Check if license exists
    const license = await c.env.DB.prepare(`
      SELECT * FROM licenses 
      WHERE license_key = ? AND (status = 'active' OR status = 'trial')
    `).bind(licenseKey).first()

    if (!license) {
      return c.json({ 
        valid: false, 
        error: 'Invalid or inactive license key' 
      }, 404)
    }

    // Check expiration
    const now = new Date()
    const expiresAt = new Date(license.expires_at)
    if (now > expiresAt) {
      // Update license status to expired
      await c.env.DB.prepare(`
        UPDATE licenses SET status = 'expired' WHERE license_key = ?
      `).bind(licenseKey).run()
      
      return c.json({ 
        valid: false, 
        error: 'License has expired' 
      }, 403)
    }

    // Check activation limit
    const maxActivations = parseInt(c.env.MAX_ACTIVATIONS_PER_LICENSE || '3')
    const activationCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM activations 
      WHERE license_key = ? AND status = 'active'
    `).bind(licenseKey).first()

    // Check if this hardware is already activated
    const existingActivation = await c.env.DB.prepare(`
      SELECT * FROM activations 
      WHERE license_key = ? AND hardware_id = ? AND status = 'active'
    `).bind(licenseKey, hardwareId).first()

    if (existingActivation) {
      // Update last seen timestamp
      await c.env.DB.prepare(`
        UPDATE activations 
        SET last_seen = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(existingActivation.id).run()

      return c.json({ 
        valid: true, 
        message: 'License validated successfully',
        license: {
          type: license.license_type,
          expiresAt: license.expires_at,
          activationsUsed: activationCount.count,
          maxActivations: maxActivations
        }
      })
    }

    // Check if we can add new activation
    if (activationCount.count >= maxActivations) {
      return c.json({ 
        valid: false, 
        error: `Maximum activations (${maxActivations}) reached for this license` 
      }, 403)
    }

    // Create new activation
    await c.env.DB.prepare(`
      INSERT INTO activations (license_key, hardware_id, status, activated_at, last_seen)
      VALUES (?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(licenseKey, hardwareId).run()

    return c.json({ 
      valid: true, 
      message: 'License activated successfully',
      license: {
        type: license.license_type,
        expiresAt: license.expires_at,
        activationsUsed: activationCount.count + 1,
        maxActivations: maxActivations
      }
    })

  } catch (error) {
    console.error('License validation error:', error)
    return c.json({ 
      valid: false, 
      error: 'Internal server error during license validation' 
    }, 500)
  }
})

// Admin: Get all licenses
app.get('/api/admin/licenses', async (c) => {
  try {
    const licenses = await c.env.DB.prepare(`
      SELECT 
        l.*,
        COUNT(a.id) as activation_count
      FROM licenses l
      LEFT JOIN activations a ON l.license_key = a.license_key AND a.status = 'active'
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `).all()

    return c.json({ licenses: licenses.results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch licenses' }, 500)
  }
})

// Admin: Create new license
app.post('/api/admin/licenses', async (c) => {
  try {
    const { license_type, duration_days } = await c.req.json()
    
    // Generate license key
    const licenseKey = generateLicenseKey()
    
    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + parseInt(duration_days))
    
    await c.env.DB.prepare(`
      INSERT INTO licenses (license_key, license_type, status, expires_at, created_at)
      VALUES (?, ?, 'active', ?, CURRENT_TIMESTAMP)
    `).bind(licenseKey, license_type, expiresAt.toISOString()).run()

    return c.json({ 
      message: 'License created successfully', 
      licenseKey,
      expiresAt: expiresAt.toISOString()
    })
  } catch (error) {
    return c.json({ error: 'Failed to create license' }, 500)
  }
})

// Admin: Update license status
app.put('/api/admin/licenses/:key', async (c) => {
  try {
    const licenseKey = c.req.param('key')
    const { status } = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE licenses SET status = ? WHERE license_key = ?
    `).bind(status, licenseKey).run()

    return c.json({ message: 'License updated successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to update license' }, 500)
  }
})

// Admin: Get activations for a license
app.get('/api/admin/licenses/:key/activations', async (c) => {
  try {
    const licenseKey = c.req.param('key')
    
    const activations = await c.env.DB.prepare(`
      SELECT * FROM activations 
      WHERE license_key = ? 
      ORDER BY activated_at DESC
    `).bind(licenseKey).all()

    return c.json({ activations: activations.results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch activations' }, 500)
  }
})

// Admin: Deactivate a specific activation
app.delete('/api/admin/activations/:id', async (c) => {
  try {
    const activationId = c.req.param('id')
    
    await c.env.DB.prepare(`
      UPDATE activations SET status = 'revoked' WHERE id = ?
    `).bind(activationId).run()

    return c.json({ message: 'Activation revoked successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to revoke activation' }, 500)
  }
})

// Helper function to generate license keys
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = []
  
  for (let i = 0; i < 4; i++) {
    let segment = ''
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    segments.push(segment)
  }
  
  return segments.join('-')
}

// Landing page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TurnkeyAppShield - High Level Software Protection</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
            .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
            .card-hover:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="bg-white shadow-lg fixed w-full z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <h1 class="text-2xl font-bold text-gray-800">TurnkeyAppShield</h1>
                        </div>
                    </div>
                    <div class="flex items-center space-x-8">
                        <a href="#features" class="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
                        <a href="#pricing" class="text-gray-700 hover:text-blue-600 transition-colors">Pricing</a>
                        <a href="#contact" class="text-gray-700 hover:text-blue-600 transition-colors">Contact</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero Section -->
        <section class="gradient-bg text-white pt-20">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div class="text-center">
                    <h1 class="text-4xl md:text-6xl font-extrabold mb-6">
                        High Level Software Protection
                    </h1>
                    <p class="text-xl md:text-2xl mb-8 text-blue-100">
                        Advanced non coding licensing and piracy prevention system that secures your applications with enterprise-grade protection and seamless integration.
                    </p>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section id="features" class="py-20 bg-white">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h2 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                        Enterprise Grade Security Features
                    </h2>
                    <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                        Comprehensive protection suite designed to secure your software against piracy and unauthorized usage.
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <!-- Feature 1 -->
                    <div class="bg-gray-50 p-8 rounded-xl card-hover">
                        <div class="text-blue-600 text-4xl mb-4">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Hardware Fingerprinting</h3>
                        <p class="text-gray-600">
                            Advanced hardware fingerprinting technology that uniquely identifies each device for secure license validation.
                        </p>
                    </div>

                    <!-- Feature 2 -->
                    <div class="bg-gray-50 p-8 rounded-xl card-hover">
                        <div class="text-blue-600 text-4xl mb-4">
                            <i class="fas fa-key"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-4">License Management</h3>
                        <p class="text-gray-600">
                            Flexible licensing system supporting trial, subscription, and perpetual licenses with activation limits.
                        </p>
                    </div>

                    <!-- Feature 3 -->
                    <div class="bg-gray-50 p-8 rounded-xl card-hover">
                        <div class="text-blue-600 text-4xl mb-4">
                            <i class="fas fa-cloud"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Cloud-Based Validation</h3>
                        <p class="text-gray-600">
                            Real-time license validation through secure cloud infrastructure with 99.9% uptime guarantee.
                        </p>
                    </div>

                    <!-- Feature 4 -->
                    <div class="bg-gray-50 p-8 rounded-xl card-hover">
                        <div class="text-blue-600 text-4xl mb-4">
                            <i class="fas fa-code"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Easy Integration</h3>
                        <p class="text-gray-600">
                            Simple API integration with SDKs for popular programming languages and frameworks.
                        </p>
                    </div>

                    <!-- Feature 5 -->
                    <div class="bg-gray-50 p-8 rounded-xl card-hover">
                        <div class="text-blue-600 text-4xl mb-4">
                            <i class="fas fa-analytics"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Analytics Dashboard</h3>
                        <p class="text-gray-600">
                            Comprehensive analytics and reporting to track license usage and prevent unauthorized access.
                        </p>
                    </div>

                    <!-- Feature 6 -->
                    <div class="bg-gray-50 p-8 rounded-xl card-hover">
                        <div class="text-blue-600 text-4xl mb-4">
                            <i class="fas fa-lock"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Anti-Piracy Protection</h3>
                        <p class="text-gray-600">
                            Advanced anti-piracy measures including code obfuscation and runtime protection mechanisms.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Pricing Section -->
        <section id="pricing" class="py-20 bg-gray-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h2 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                        Choose Your Protection Plan
                    </h2>
                    <p class="text-xl text-gray-600">
                        Flexible pricing options to suit businesses of all sizes.
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Starter Plan -->
                    <div class="bg-white p-8 rounded-xl shadow-lg card-hover">
                        <div class="text-center mb-8">
                            <h3 class="text-2xl font-bold text-gray-800 mb-2">Starter</h3>
                            <div class="text-4xl font-bold text-blue-600 mb-2">$29</div>
                            <div class="text-gray-600">per month</div>
                        </div>
                        <ul class="space-y-4 mb-8">
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Up to 1,000 activations</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Basic analytics</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Email support</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>API access</span>
                            </li>
                        </ul>
                        <button class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                            Get Started
                        </button>
                    </div>

                    <!-- Professional Plan -->
                    <div class="bg-white p-8 rounded-xl shadow-lg card-hover border-2 border-blue-500 relative">
                        <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <span class="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
                        </div>
                        <div class="text-center mb-8">
                            <h3 class="text-2xl font-bold text-gray-800 mb-2">Professional</h3>
                            <div class="text-4xl font-bold text-blue-600 mb-2">$99</div>
                            <div class="text-gray-600">per month</div>
                        </div>
                        <ul class="space-y-4 mb-8">
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Up to 10,000 activations</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Advanced analytics</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Priority support</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Custom integrations</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>White-label options</span>
                            </li>
                        </ul>
                        <button class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                            Get Started
                        </button>
                    </div>

                    <!-- Enterprise Plan -->
                    <div class="bg-white p-8 rounded-xl shadow-lg card-hover">
                        <div class="text-center mb-8">
                            <h3 class="text-2xl font-bold text-gray-800 mb-2">Enterprise</h3>
                            <div class="text-4xl font-bold text-blue-600 mb-2">Custom</div>
                            <div class="text-gray-600">pricing</div>
                        </div>
                        <ul class="space-y-4 mb-8">
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Unlimited activations</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Custom analytics</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>24/7 dedicated support</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>On-premise deployment</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>SLA guarantee</span>
                            </li>
                        </ul>
                        <button class="w-full bg-gray-800 text-white py-3 px-6 rounded-lg hover:bg-gray-900 transition-colors font-semibold">
                            Contact Sales
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer id="contact" class="bg-gray-800 text-white py-16">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col items-center text-center space-y-8">
                    <!-- Company Info -->
                    <div>
                        <h3 class="text-2xl font-bold mb-4">TurnkeyAppShield</h3>
                        <p class="text-gray-300 mb-4">
                            Protecting software integrity with advanced licensing and anti-piracy solutions.
                        </p>
                        <p class="text-gray-300">
                            Email: support@turnkeyappshield.com<br>
                            Phone: +1 (555) 123-4567
                        </p>
                    </div>

                    <!-- Social Links -->
                    <div>
                        <h4 class="text-lg font-semibold mb-4">Follow Us</h4>
                        <div class="flex space-x-6">
                            <a href="#" class="text-gray-300 hover:text-white transition-colors text-2xl">
                                <i class="fab fa-twitter"></i>
                            </a>
                            <a href="#" class="text-gray-300 hover:text-white transition-colors text-2xl">
                                <i class="fab fa-linkedin"></i>
                            </a>
                            <a href="#" class="text-gray-300 hover:text-white transition-colors text-2xl">
                                <i class="fab fa-github"></i>
                            </a>
                        </div>
                    </div>
                </div>

                <div class="border-t border-gray-700 mt-12 pt-8 text-center">
                    <p class="text-gray-300">
                        © 2024 TurnkeyAppShield. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    </body>
    </html>
  `)
})

export default app