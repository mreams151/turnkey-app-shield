// Modern License Validation API - Enhanced replacement for WCF service
// Core license validation and management endpoints

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { AppContext, ValidateLicenseRequest, ValidateLicenseResponse } from '../types/database';
import { DatabaseManager } from '../utils/database';
import { SecurityValidator, RateLimiter, VMDetector } from '../utils/security';

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
// Helper function to detect country from IP address
async function detectCountryFromIP(ip: string): Promise<string> {
  // For development/testing, return a default country
  if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return 'US'; // Default for local IPs
  }

  try {
    // Use a free IP geolocation service (in production, consider paid services)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    const data = await response.json();
    return data.countryCode || 'US'; // Default to US if detection fails
  } catch (error) {
    console.warn('IP geolocation failed:', error);
    return 'US'; // Default fallback
  }
}

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
        customer_id: 0,
        product_id: 0,
        license_key: request.license_key,
        device_fingerprint: request.hardware_fingerprint,
        ip_address: clientIP,
        user_agent: c.req.header('user-agent') || null,
        device_name: request.computer_name,
        operating_system: request.os_version,
        file_name: 'license_validation',
        status: 'invalid',
        error_message: 'Invalid license key format',
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
      customer_id: logData.customer_id,
      product_id: logData.product_id,
      license_key: request.license_key,
      device_fingerprint: request.hardware_fingerprint,
      ip_address: clientIP,
      user_agent: c.req.header('user-agent') || null,
      device_name: request.computer_name,
      operating_system: request.os_version,
      file_name: 'license_validation', 
      status: validation.valid ? 'valid' : 'invalid',
      session_id: logData.session_id || null,
      session_duration: 0,
      error_message: validation.valid ? null : validation.message,
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

    // Successful validation - check for VM restrictions
    const product = await db.getProductById(validation.license!.product_id);
    
    // Check if VM protection is enabled for this license
    if (product?.rule_id) {
      const licenseRule = await db.db.prepare(`
        SELECT allow_vm FROM license_rules WHERE id = ?
      `).bind(product.rule_id).first<{ allow_vm: boolean }>();

      if (licenseRule && !licenseRule.allow_vm) {
        // VM protection is enabled - perform VM detection
        const vmDetectionResult = VMDetector.isVirtualMachine({
          computerName: request.computer_name,
          osVersion: request.os_version,
          processorInfo: undefined, // Will be enhanced when client sends this data
          diskInfo: undefined,      // Will be enhanced when client sends this data
          macAddresses: request.mac_addresses,
          biosInfo: undefined,      // Will be enhanced when client sends this data
          motherboardInfo: undefined // Will be enhanced when client sends this data
        });

        if (vmDetectionResult.isVM) {
          // Log VM detection security event
          await db.logSecurityEvent({
            event_type: 'vm_detected',
            severity: 'high',
            customer_id: validation.license!.customer_id,
            license_id: validation.license!.id,
            ip_address: clientIP,
            description: `Virtual machine usage blocked for license ${request.license_key}`,
            metadata: JSON.stringify({
              vm_type: vmDetectionResult.vmType,
              confidence: vmDetectionResult.confidence,
              indicators: vmDetectionResult.indicators,
              computer_name: request.computer_name,
              mac_addresses: request.mac_addresses
            }),
            resolved: false
          });

          // Block the validation
          return c.json({
            valid: false,
            status: 'blocked',
            message: `License cannot be used in virtual machines. ${VMDetector.getVMDetectionSummary(vmDetectionResult)}`,
            server_time: new Date().toISOString()
          } as ValidateLicenseResponse, 403);
        }

        // Log successful VM check for audit trail
        await db.logSecurityEvent({
          event_type: 'vm_check_passed',
          severity: 'low',
          customer_id: validation.license!.customer_id,
          license_id: validation.license!.id,
          ip_address: clientIP,
          description: `VM protection check passed for license ${request.license_key}`,
          metadata: JSON.stringify({
            confidence: vmDetectionResult.confidence,
            computer_name: request.computer_name
          }),
          resolved: true
        });
      }
    }

    // Check all rule-based restrictions (devices, sessions, offline validation, duration)
    if (product?.rule_id) {
      const licenseRule = await db.db.prepare(`
        SELECT max_concurrent_sessions, max_devices, allow_offline_days, 
               max_days, grace_period_days
        FROM license_rules WHERE id = ?
      `).bind(product.rule_id).first<{ 
        max_concurrent_sessions: number; 
        max_devices: number; 
        allow_offline_days: number;
        max_days: number;
        grace_period_days: number;
      }>();

      if (licenseRule) {
        // 1. Check device limit (max_devices enforcement)
        if (licenseRule.max_devices > 0) {
          const uniqueDevices = await db.db.prepare(`
            SELECT COUNT(DISTINCT device_fingerprint) as count FROM activation_logs 
            WHERE license_key = ? AND status = 'valid'
          `).bind(request.license_key).first<{ count: number }>();

          if (uniqueDevices && uniqueDevices.count >= licenseRule.max_devices) {
            // Check if current device is already registered
            const existingDevice = await db.db.prepare(`
              SELECT id FROM activation_logs 
              WHERE license_key = ? AND device_fingerprint = ? AND status = 'valid'
              LIMIT 1
            `).bind(request.license_key, request.hardware_fingerprint).first();

            if (!existingDevice) {
              await db.logSecurityEvent({
                event_type: 'device_limit_exceeded',
                severity: 'medium',
                customer_id: validation.license!.customer_id,
                license_id: validation.license!.id,
                ip_address: clientIP,
                description: `Device limit exceeded for license ${request.license_key}`,
                metadata: JSON.stringify({
                  current_devices: uniqueDevices.count,
                  max_allowed: licenseRule.max_devices,
                  attempted_device: request.hardware_fingerprint
                }),
                resolved: false
              });

              return c.json({
                valid: false,
                status: 'device_limit_exceeded',
                message: `License device limit exceeded. Maximum ${licenseRule.max_devices} devices allowed.`,
                server_time: new Date().toISOString()
              } as ValidateLicenseResponse, 403);
            }
          }
        }

        // 2. Check offline validation limit (allow_offline_days enforcement)
        if (licenseRule.allow_offline_days >= 0) {
          const lastOnlineValidation = await db.db.prepare(`
            SELECT MAX(created_at) as last_validation FROM activation_logs 
            WHERE license_key = ? AND status = 'valid'
          `).bind(request.license_key).first<{ last_validation: string | null }>();

          if (lastOnlineValidation?.last_validation) {
            const daysSinceLastValidation = Math.floor(
              (Date.now() - new Date(lastOnlineValidation.last_validation).getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceLastValidation > licenseRule.allow_offline_days) {
              await db.logSecurityEvent({
                event_type: 'offline_limit_exceeded',
                severity: 'medium',
                customer_id: validation.license!.customer_id,
                license_id: validation.license!.id,
                ip_address: clientIP,
                description: `Offline validation limit exceeded for license ${request.license_key}`,
                metadata: JSON.stringify({
                  days_since_last_validation: daysSinceLastValidation,
                  max_offline_days: licenseRule.allow_offline_days,
                  last_validation: lastOnlineValidation.last_validation
                }),
                resolved: false
              });

              return c.json({
                valid: false,
                status: 'offline_limit_exceeded',
                message: `License requires online validation. Maximum ${licenseRule.allow_offline_days} days offline allowed. Last validation: ${Math.floor(daysSinceLastValidation)} days ago.`,
                server_time: new Date().toISOString()
              } as ValidateLicenseResponse, 403);
            }
          }
        }

        // 3. Check license duration and grace period (max_days enforcement)
        if (licenseRule.max_days > 0) {
          // Calculate license age from first activation
          const firstActivation = await db.db.prepare(`
            SELECT MIN(created_at) as first_activation FROM activation_logs 
            WHERE license_key = ? AND status = 'valid'
          `).bind(request.license_key).first<{ first_activation: string | null }>();

          if (firstActivation?.first_activation) {
            const daysSinceFirstActivation = Math.floor(
              (Date.now() - new Date(firstActivation.first_activation).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            const totalAllowedDays = licenseRule.max_days + licenseRule.grace_period_days;

            if (daysSinceFirstActivation > totalAllowedDays) {
              await db.logSecurityEvent({
                event_type: 'license_duration_exceeded',
                severity: 'high',
                customer_id: validation.license!.customer_id,
                license_id: validation.license!.id,
                ip_address: clientIP,
                description: `License duration exceeded for ${request.license_key}`,
                metadata: JSON.stringify({
                  days_since_first_activation: daysSinceFirstActivation,
                  max_days: licenseRule.max_days,
                  grace_period_days: licenseRule.grace_period_days,
                  total_allowed_days: totalAllowedDays
                }),
                resolved: false
              });

              return c.json({
                valid: false,
                status: 'license_expired',
                message: `License has expired. Duration: ${licenseRule.max_days} days + ${licenseRule.grace_period_days} grace period. Current usage: ${daysSinceFirstActivation} days.`,
                server_time: new Date().toISOString()
              } as ValidateLicenseResponse, 403);
            }
          }
        }

        // 4. Check concurrent session limit
        if (licenseRule.max_concurrent_sessions > 0) {
          // Generate unique session ID for this activation
          const sessionId = `${validation.license!.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

          // Count active sessions (sessions from last 5 minutes are considered active)
          const activeSessions = await db.db.prepare(`
            SELECT COUNT(DISTINCT session_id) as count 
            FROM activation_logs 
            WHERE license_key = ? 
            AND status = 'valid'
            AND session_id IS NOT NULL
            AND activation_time > datetime('now', '-5 minutes')
          `).bind(request.license_key).first<{ count: number }>();

          if (activeSessions && activeSessions.count >= licenseRule.max_concurrent_sessions) {
            // Log concurrent session limit exceeded
            await db.logSecurityEvent({
              event_type: 'concurrent_session_limit_exceeded',
              severity: 'medium',
              customer_id: validation.license!.customer_id,
              license_id: validation.license!.id,
              ip_address: clientIP,
              description: `Concurrent session limit exceeded for license ${request.license_key}`,
              metadata: JSON.stringify({
                active_sessions: activeSessions.count,
                max_allowed: licenseRule.max_concurrent_sessions,
                device_fingerprint: request.hardware_fingerprint,
                attempted_session_id: sessionId
              }),
              resolved: false
            });

            return c.json({
              valid: false,
              status: 'concurrent_limit_exceeded',
              message: `Too many concurrent sessions. Maximum ${licenseRule.max_concurrent_sessions} concurrent sessions allowed.`,
              server_time: new Date().toISOString()
            } as ValidateLicenseResponse, 403);
          }

          // Store the session ID for this successful activation
          logData.session_id = sessionId;
        }
      }
    }

    // Check geographic and time-based restrictions
    if (product?.rule_id) {
      const licenseRule = await db.db.prepare(`
        SELECT allowed_countries, timezone_restrictions 
        FROM license_rules WHERE id = ?
      `).bind(product.rule_id).first<{ 
        allowed_countries: string | null; 
        timezone_restrictions: string | null;
      }>();

      if (licenseRule) {
        // 1. Geographic restrictions (whitelist-only approach)
        const allowedCountries = licenseRule.allowed_countries ? JSON.parse(licenseRule.allowed_countries) : null;

        // Get country from IP
        const userCountry = await detectCountryFromIP(clientIP);

        if (allowedCountries && allowedCountries.length > 0) {
          // Whitelist mode: only allow specific countries
          if (!allowedCountries.includes(userCountry)) {
            await db.logSecurityEvent({
              event_type: 'geographic_restriction_violation',
              severity: 'medium',
              customer_id: validation.license!.customer_id,
              license_id: validation.license!.id,
              ip_address: clientIP,
              description: `License used from unauthorized country: ${userCountry}`,
              metadata: JSON.stringify({
                user_country: userCountry,
                allowed_countries: allowedCountries,
                license_key: request.license_key
              }),
              resolved: false
            });

            return c.json({
              valid: false,
              status: 'geographic_restriction',
              message: `License cannot be used from ${userCountry}. Allowed countries: ${allowedCountries.join(', ')}`,
              server_time: new Date().toISOString()
            } as ValidateLicenseResponse, 403);
          }
        }

        // Note: blocked_countries enforcement removed - UI simplified to whitelist-only approach
        // This maintains backward compatibility while aligning with simplified UI

        // 2. Time-based restrictions
        if (licenseRule.timezone_restrictions) {
          const timeRestrictions = JSON.parse(licenseRule.timezone_restrictions);
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const currentTime = currentHour * 60 + currentMinute; // Minutes since midnight

          if (timeRestrictions.business_hours) {
            const { start, end, allowed_days } = timeRestrictions.business_hours;
            
            // Parse start/end times (format: "HH:MM")
            const [startHour, startMinute] = start.split(':').map(Number);
            const [endHour, endMinute] = end.split(':').map(Number);
            const startTime = startHour * 60 + startMinute;
            const endTime = endHour * 60 + endMinute;

            // Check if current day is allowed
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const currentDayName = dayNames[currentDay];
            
            if (!allowed_days.includes(currentDayName)) {
              await db.logSecurityEvent({
                event_type: 'time_restriction_violation',
                severity: 'low',
                customer_id: validation.license!.customer_id,
                license_id: validation.license!.id,
                ip_address: clientIP,
                description: `License used outside allowed days: ${currentDayName}`,
                metadata: JSON.stringify({
                  current_day: currentDayName,
                  allowed_days: allowed_days,
                  current_time: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
                }),
                resolved: false
              });

              return c.json({
                valid: false,
                status: 'time_restriction',
                message: `License cannot be used on ${currentDayName}. Allowed days: ${allowed_days.join(', ')}`,
                server_time: new Date().toISOString()
              } as ValidateLicenseResponse, 403);
            }

            // Check if current time is within allowed hours
            if (currentTime < startTime || currentTime > endTime) {
              await db.logSecurityEvent({
                event_type: 'time_restriction_violation',
                severity: 'low',
                customer_id: validation.license!.customer_id,
                license_id: validation.license!.id,
                ip_address: clientIP,
                description: `License used outside business hours`,
                metadata: JSON.stringify({
                  current_time: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
                  allowed_hours: `${start} - ${end}`,
                  current_day: currentDayName
                }),
                resolved: false
              });

              return c.json({
                valid: false,
                status: 'time_restriction',
                message: `License can only be used during business hours: ${start} - ${end}`,
                server_time: new Date().toISOString()
              } as ValidateLicenseResponse, 403);
            }
          }
        }
      }
    }

    // Check for product updates
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
    return c.json({
      success: false,
      message: 'Failed to retrieve license activity'
    }, 500);
  }
});

export default license;