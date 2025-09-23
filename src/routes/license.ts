// Modern License Validation API - Enhanced replacement for WCF service
// Core license validation and management endpoints

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { AppContext, ValidateLicenseRequest, ValidateLicenseResponse } from '../types/database';
import { DatabaseManager } from '../utils/database';
import { SecurityValidator, RateLimiter } from '../utils/security';

const license = new Hono<AppContext>();

// Enable CORS for all license endpoints
license.use('*', cors({
  origin: '*', // In production, restrict to your domains
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Validation schemas
const validateLicenseSchema = z.object({
  license_key: z.string().min(1, 'License key is required'),
  hardware_fingerprint: z.string().min(1, 'Hardware fingerprint is required'),
  hardware_hash: z.string().min(1, 'Hardware hash is required'),
  ip_address: z.string().ip('Invalid IP address'),
  mac_addresses: z.array(z.string()).min(1, 'At least one MAC address is required'),
  computer_name: z.string().min(1, 'Computer name is required'),
  os_version: z.string().min(1, 'OS version is required'),
  product_version: z.string().optional()
});

const createLicenseSchema = z.object({
  customer_id: z.number().positive('Invalid customer ID'),
  product_id: z.number().positive('Invalid product ID'),
  device_fingerprint: z.string().min(1, 'Device fingerprint is required'),
  hardware_hash: z.string().min(1, 'Hardware hash is required'),
  expires_at: z.string().datetime().optional()
});

/**
 * Validate License - Core endpoint replacing WCF ValidateLicense
 * Enhanced with modern security features, rate limiting, and detailed logging
 */
license.post('/validate', async (c) => {
  const startTime = Date.now();
  let db: DatabaseManager | null = null;
  let logData: any = {};

  try {
    // Get client IP for rate limiting
    const clientIP = c.req.header('cf-connecting-ip') || 
                     c.req.header('x-forwarded-for') || 
                     c.req.header('x-real-ip') || 
                     'unknown';

    // Rate limiting check
    const rateLimit = await RateLimiter.checkRateLimit(
      c.env.KV,
      `license_validate:${clientIP}`,
      100, // 100 requests per hour
      60
    );

    if (!rateLimit.allowed) {
      return c.json({
        valid: false,
        status: 'invalid',
        message: 'Rate limit exceeded. Please try again later.',
        server_time: new Date().toISOString()
      } as ValidateLicenseResponse, 429);
    }

    // Check if IP is blocked
    const isBlocked = await RateLimiter.isIPBlocked(c.env.KV, clientIP);
    if (isBlocked) {
      return c.json({
        valid: false,
        status: 'invalid',
        message: 'Access denied from this IP address.',
        server_time: new Date().toISOString()
      } as ValidateLicenseResponse, 403);
    }

    // Parse and validate request
    const rawBody = await c.req.json();
    const validationResult = validateLicenseSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return c.json({
        valid: false,
        status: 'invalid',
        message: 'Invalid request format',
        server_time: new Date().toISOString()
      } as ValidateLicenseResponse, 400);
    }

    const request = validationResult.data;
    
    // Initialize database
    db = new DatabaseManager(c.env.DB);
    
    // Validate input formats
    if (!SecurityValidator.isValidLicenseKey(request.license_key)) {
      logData = {
        license_key: request.license_key,
        action: 'validate',
        status: 'failed',
        error_message: 'Invalid license key format'
      };
      
      await db.logActivation({
        ...logData,
        license_id: 0,
        customer_id: 0,
        product_id: 0,
        ip_address: clientIP,
        user_agent: c.req.header('user-agent') || null,
        device_fingerprint: request.hardware_fingerprint,
        hardware_changes: null,
        response_time: Date.now() - startTime
      });

      return c.json({
        valid: false,
        status: 'invalid',
        message: 'Invalid license key format',
        server_time: new Date().toISOString()
      } as ValidateLicenseResponse, 400);
    }

    if (!SecurityValidator.isValidHardwareFingerprint(request.hardware_fingerprint)) {
      return c.json({
        valid: false,
        status: 'invalid', 
        message: 'Invalid hardware fingerprint format',
        server_time: new Date().toISOString()
      } as ValidateLicenseResponse, 400);
    }

    // Validate MAC addresses format
    const invalidMacs = request.mac_addresses.filter(mac => !SecurityValidator.isValidMacAddress(mac));
    if (invalidMacs.length > 0) {
      return c.json({
        valid: false,
        status: 'invalid',
        message: 'Invalid MAC address format',
        server_time: new Date().toISOString()
      } as ValidateLicenseResponse, 400);
    }

    // Perform license validation
    const validation = await db.validateLicense(
      request.license_key,
      request.hardware_fingerprint,
      clientIP
    );

    logData = {
      license_id: validation.license?.id || 0,
      customer_id: validation.license?.customer_id || 0,
      product_id: validation.license?.product_id || 0,
      action: 'validate',
      status: validation.valid ? 'success' : 'failed',
      error_message: validation.valid ? null : validation.message
    };

    // Log activation attempt
    const validationId = await db.logActivation({
      ...logData,
      ip_address: clientIP,
      user_agent: c.req.header('user-agent') || null,
      device_fingerprint: request.hardware_fingerprint,
      hardware_changes: null,
      response_time: Date.now() - startTime
    });

    if (!validation.valid) {
      // Check for suspicious activity (multiple failures from same IP)
      const recentFailures = await db.db.prepare(`
        SELECT COUNT(*) as count
        FROM activation_logs 
        WHERE ip_address = ? 
        AND status = 'failed' 
        AND created_at > datetime('now', '-1 hour')
      `).bind(clientIP).first<{ count: number }>();

      if (recentFailures && recentFailures.count >= 10) {
        // Block IP for suspicious activity
        await RateLimiter.blockIP(c.env.KV, clientIP, 24);
        
        await db.logSecurityEvent({
          event_type: 'multiple_failures',
          severity: 'high',
          customer_id: validation.license?.customer_id || null,
          license_id: validation.license?.id || null,
          ip_address: clientIP,
          description: `Multiple validation failures from IP ${clientIP}`,
          metadata: JSON.stringify({
            failure_count: recentFailures.count,
            license_key: request.license_key,
            user_agent: c.req.header('user-agent')
          }),
          resolved: false
        });
      }

      return c.json({
        valid: false,
        status: validation.license?.status || 'invalid',
        message: validation.message,
        server_time: new Date().toISOString()
      } as ValidateLicenseResponse, 200);
    }

    // Successful validation - check for updates
    const product = await db.getProductById(validation.license!.product_id);
    let updateAvailable = false;
    let updateUrl = null;

    if (product && request.product_version && product.version !== request.product_version) {
      updateAvailable = true;
      updateUrl = product.update_url;
    }

    // Check for hardware changes
    if (validation.license) {
      const storedMacs = validation.license.mac_addresses.split(',');
      const hardwareCheck = SecurityValidator.detectHardwareChanges(
        request.hardware_fingerprint,
        validation.license.device_fingerprint,
        request.mac_addresses,
        storedMacs
      );

      if (hardwareCheck.changed) {
        await db.logSecurityEvent({
          event_type: 'hardware_change',
          severity: hardwareCheck.severity,
          customer_id: validation.license.customer_id,
          license_id: validation.license.id,
          ip_address: clientIP,
          description: `Hardware changes detected for license ${request.license_key}`,
          metadata: JSON.stringify({
            changes: hardwareCheck.changes,
            severity: hardwareCheck.severity,
            old_fingerprint: validation.license.device_fingerprint,
            new_fingerprint: request.hardware_fingerprint
          }),
          resolved: false
        });

        // If changes are severe, suspend the license
        if (hardwareCheck.severity === 'high') {
          await db.updateLicenseStatus(validation.license.id, 'suspended');
          
          return c.json({
            valid: false,
            status: 'suspended',
            message: 'License suspended due to significant hardware changes',
            server_time: new Date().toISOString()
          } as ValidateLicenseResponse, 200);
        }
      }
    }

    // Return successful validation
    const response: ValidateLicenseResponse = {
      valid: true,
      status: 'active',
      message: 'License validated successfully',
      expires_at: validation.license!.expires_at || undefined,
      validation_id: validationId,
      update_available: updateAvailable,
      update_url: updateUrl || undefined,
      server_time: new Date().toISOString()
    };

    return c.json(response, 200);

  } catch (error) {
    console.error('License validation error:', error);
    
    // Log error if we have database access
    if (db && logData.license_key) {
      try {
        await db.logActivation({
          ...logData,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Internal server error',
          ip_address: c.req.header('cf-connecting-ip') || 'unknown',
          user_agent: c.req.header('user-agent') || null,
          device_fingerprint: 'unknown',
          hardware_changes: null,
          response_time: Date.now() - startTime
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    return c.json({
      valid: false,
      status: 'invalid',
      message: 'Internal server error',
      server_time: new Date().toISOString()
    } as ValidateLicenseResponse, 500);
  }
});

/**
 * Create License - Enhanced license creation with automatic key generation
 */
license.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const validationResult = createLicenseSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json({
        success: false,
        message: 'Invalid request format',
        errors: validationResult.error.errors
      }, 400);
    }

    const request = validationResult.data;
    const db = new DatabaseManager(c.env.DB);

    // Verify customer exists
    const customer = await db.getCustomerById(request.customer_id);
    if (!customer || !customer.is_active) {
      return c.json({
        success: false,
        message: 'Customer not found or inactive'
      }, 404);
    }

    // Verify product exists
    const product = await db.getProductById(request.product_id);
    if (!product || !product.is_active) {
      return c.json({
        success: false,
        message: 'Product not found or inactive'
      }, 404);
    }

    // Check device limits
    if (customer.device_count >= customer.max_devices) {
      return c.json({
        success: false,
        message: 'Customer has reached maximum device limit'
      }, 400);
    }

    // Create license
    const clientIP = c.req.header('cf-connecting-ip') || 'unknown';
    
    const result = await db.createLicense({
      customer_id: request.customer_id,
      product_id: request.product_id,
      device_fingerprint: request.device_fingerprint,
      hardware_hash: request.hardware_hash,
      ip_address: clientIP,
      mac_addresses: '', // Will be updated on first validation
      computer_name: '', // Will be updated on first validation
      os_version: '', // Will be updated on first validation
      status: 'active',
      expires_at: request.expires_at || null,
      last_validation: null,
      validation_count: 0
    });

    // Update customer device count
    await db.updateCustomerDeviceCount(request.customer_id, 1);

    // Log license creation
    await db.logActivation({
      license_id: result.id,
      customer_id: request.customer_id,
      product_id: request.product_id,
      action: 'activate',
      status: 'success',
      ip_address: clientIP,
      user_agent: c.req.header('user-agent') || null,
      device_fingerprint: request.device_fingerprint,
      hardware_changes: null,
      error_message: null,
      response_time: 0
    });

    return c.json({
      success: true,
      license_key: result.license_key,
      license_id: result.id,
      message: 'License created successfully'
    });

  } catch (error) {
    console.error('License creation error:', error);
    return c.json({
      success: false,
      message: 'Failed to create license'
    }, 500);
  }
});

/**
 * Get License Details - Fetch license information
 */
license.get('/:license_key', async (c) => {
  try {
    const licenseKey = c.req.param('license_key');
    
    if (!SecurityValidator.isValidLicenseKey(licenseKey)) {
      return c.json({
        success: false,
        message: 'Invalid license key format'
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    const license = await db.getLicenseByKey(licenseKey);

    if (!license) {
      return c.json({
        success: false,
        message: 'License not found'
      }, 404);
    }

    // Get related data
    const [customer, product] = await Promise.all([
      db.getCustomerById(license.customer_id),
      db.getProductById(license.product_id)
    ]);

    return c.json({
      success: true,
      license: {
        ...license,
        customer_name: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown',
        customer_email: customer?.email || 'Unknown',
        product_name: product?.name || 'Unknown',
        product_version: product?.version || 'Unknown'
      }
    });

  } catch (error) {
    console.error('License lookup error:', error);
    return c.json({
      success: false,
      message: 'Failed to retrieve license'
    }, 500);
  }
});

/**
 * Update License Status - Suspend, reactivate, or revoke licenses
 */
license.put('/:license_key/status', async (c) => {
  try {
    const licenseKey = c.req.param('license_key');
    const { status, reason } = await c.req.json();

    if (!SecurityValidator.isValidLicenseKey(licenseKey)) {
      return c.json({
        success: false,
        message: 'Invalid license key format'
      }, 400);
    }

    if (!['active', 'suspended', 'revoked'].includes(status)) {
      return c.json({
        success: false,
        message: 'Invalid status. Must be active, suspended, or revoked'
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    const license = await db.getLicenseByKey(licenseKey);

    if (!license) {
      return c.json({
        success: false,
        message: 'License not found'
      }, 404);
    }

    // Update status
    await db.updateLicenseStatus(license.id, status as any);

    // Log the action
    const clientIP = c.req.header('cf-connecting-ip') || 'unknown';
    await db.logActivation({
      license_id: license.id,
      customer_id: license.customer_id,
      product_id: license.product_id,
      action: status === 'active' ? 'activate' : 'deactivate',
      status: 'success',
      ip_address: clientIP,
      user_agent: c.req.header('user-agent') || null,
      device_fingerprint: license.device_fingerprint,
      hardware_changes: reason || null,
      error_message: null,
      response_time: 0
    });

    return c.json({
      success: true,
      message: `License ${status} successfully`
    });

  } catch (error) {
    console.error('License status update error:', error);
    return c.json({
      success: false,
      message: 'Failed to update license status'
    }, 500);
  }
});

/**
 * Get License Activity - Recent validation attempts and security events
 */
license.get('/:license_key/activity', async (c) => {
  try {
    const licenseKey = c.req.param('license_key');
    
    if (!SecurityValidator.isValidLicenseKey(licenseKey)) {
      return c.json({
        success: false,
        message: 'Invalid license key format'
      }, 400);
    }

    const db = new DatabaseManager(c.env.DB);
    const license = await db.getLicenseByKey(licenseKey);

    if (!license) {
      return c.json({
        success: false,
        message: 'License not found'
      }, 404);
    }

    // Get recent activity
    const [activations, securityEvents] = await Promise.all([
      db.db.prepare(`
        SELECT * FROM activation_logs 
        WHERE license_id = ? 
        ORDER BY created_at DESC 
        LIMIT 50
      `).bind(license.id).all(),
      
      db.db.prepare(`
        SELECT * FROM security_events 
        WHERE license_id = ? 
        ORDER BY created_at DESC 
        LIMIT 20
      `).bind(license.id).all()
    ]);

    return c.json({
      success: true,
      license_key: licenseKey,
      recent_activations: activations.results || [],
      security_events: securityEvents.results || []
    });

  } catch (error) {
    console.error('License activity lookup error:', error);
    return c.json({
      success: false,
      message: 'Failed to retrieve license activity'
    }, 500);
  }
});

export default license;