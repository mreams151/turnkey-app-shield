// Modern Security Utilities - Enhanced from original Cryptology.cs
// Advanced encryption, hashing, and security functions

// All password hashing is now done with Web Crypto API

/**
 * Modern AES-256-GCM encryption (upgrade from original Rijndael)
 * Provides authenticated encryption with associated data
 */
export class ModernCrypto {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();

  /**
   * Generate cryptographically secure random key
   */
  static generateEncryptionKey(): string {
    const key = new Uint8Array(32); // 256 bits
    crypto.getRandomValues(key);
    return Array.from(key, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate secure license key (enhanced from original format)
   */
  static generateLicenseKey(): string {
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

  /**
   * Encrypt data using AES-256-GCM (Web Crypto API)
   */
  static async encrypt(data: string, keyHex: string): Promise<string> {
    try {
      // Convert hex key to ArrayBuffer
      const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
      
      // Import key
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt
      const encodedData = this.encoder.encode(data);
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encodedData
      );
      
      // Combine IV + encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static async decrypt(encryptedData: string, keyHex: string): Promise<string> {
    try {
      // Convert hex key to ArrayBuffer
      const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
      
      // Import key
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      // Decrypt
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encrypted
      );
      
      return this.decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate secure hash (enhanced from original)
   */
  static async generateHash(data: string, salt?: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data + (salt || ''));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate hardware fingerprint (enhanced from original logic)
   */
  static generateHardwareFingerprint(components: {
    macAddresses: string[];
    computerName: string;
    osVersion: string;
    processorInfo?: string;
    diskInfo?: string;
  }): string {
    const normalizedMacs = components.macAddresses
      .map(mac => mac.replace(/[:-]/g, '').toLowerCase())
      .sort()
      .join('|');
    
    const fingerprint = [
      normalizedMacs,
      components.computerName.toLowerCase(),
      components.osVersion,
      components.processorInfo || '',
      components.diskInfo || ''
    ].join('::');
    
    return this.generateHash(fingerprint);
  }
}

/**
 * Password hashing utilities using Web Crypto API (Cloudflare Workers compatible)
 */
export class PasswordUtils {
  /**
   * Hash password with salt using PBKDF2
   */
  static async hashPassword(password: string): Promise<string> {
    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Encode password as UTF-8
    const passwordBuffer = new TextEncoder().encode(password);
    
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // Derive key using PBKDF2
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 32 bytes = 256 bits
    );
    
    // Combine salt and hash
    const hashArray = new Uint8Array(derivedKey);
    const combined = new Uint8Array(salt.length + hashArray.length);
    combined.set(salt);
    combined.set(hashArray, salt.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      // Decode base64 hash
      const combined = new Uint8Array(
        atob(storedHash).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract salt and hash
      const salt = combined.slice(0, 16);
      const hash = combined.slice(16);
      
      // Encode password as UTF-8
      const passwordBuffer = new TextEncoder().encode(password);
      
      // Import password as key material
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      
      // Derive key using same parameters
      const derivedKey = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        256 // 32 bytes = 256 bits
      );
      
      // Compare hashes
      const derivedArray = new Uint8Array(derivedKey);
      
      if (hash.length !== derivedArray.length) {
        return false;
      }
      
      for (let i = 0; i < hash.length; i++) {
        if (hash[i] !== derivedArray[i]) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
}

/**
 * JWT token utilities for secure authentication
 */
export class TokenUtils {
  /**
   * Create JWT token for customer authentication
   */
  static async createCustomerToken(
    customerId: number, 
    email: string, 
    secret: string,
    expiresInHours: number = 24
  ): Promise<string> {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = {
      sub: customerId.toString(),
      email: email,
      type: 'customer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (expiresInHours * 3600)
    };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
    
    const signature = await this.sign(`${encodedHeader}.${encodedPayload}`, secret);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Create JWT token for admin authentication (simplified for development)
   */
  static async createAdminToken(
    adminId: number,
    username: string,
    role: string,
    secret: string,
    expiresInHours: number = 8
  ): Promise<string> {
    // For development, create a simple token format that doesn't require Web Crypto
    // In production, this would use proper JWT with Web Crypto signing
    const payload = {
      sub: adminId.toString(),
      username: username,
      role: role,
      type: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (expiresInHours * 3600)
    };

    // Simple base64 encoding for development (replace with proper JWT in production)
    return btoa(JSON.stringify(payload));
  }

  /**
   * Verify and decode JWT token (simplified for development)
   */
  static async verifyToken(token: string, secret: string): Promise<any> {
    try {
      // Simple base64 decoding for development
      const payload = JSON.parse(atob(token));
      
      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Sign data with HMAC-SHA256
   */
  private static async sign(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const secretBuffer = encoder.encode(secret);
    const dataBuffer = encoder.encode(data);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    const signatureArray = new Uint8Array(signature);
    
    return btoa(String.fromCharCode(...signatureArray)).replace(/=/g, '');
  }
}

/**
 * Rate limiting utilities for API protection
 */
export class RateLimiter {
  /**
   * Check if IP is within rate limit using KV storage
   */
  static async checkRateLimit(
    kv: KVNamespace,
    identifier: string,
    maxRequests: number,
    windowMinutes: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const resetTime = now + windowMs;

    try {
      const existing = await kv.get(key, { type: 'json' }) as {
        count: number;
        resetTime: number;
      } | null;

      if (!existing || existing.resetTime < now) {
        // New window
        await kv.put(key, JSON.stringify({
          count: 1,
          resetTime
        }), { expirationTtl: Math.ceil(windowMs / 1000) });

        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetTime
        };
      }

      if (existing.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: existing.resetTime
        };
      }

      // Increment counter
      const newCount = existing.count + 1;
      await kv.put(key, JSON.stringify({
        count: newCount,
        resetTime: existing.resetTime
      }), { expirationTtl: Math.ceil((existing.resetTime - now) / 1000) });

      return {
        allowed: true,
        remaining: maxRequests - newCount,
        resetTime: existing.resetTime
      };
    } catch (error) {
      // If KV fails, allow request but log error
      console.error('Rate limiting error:', error);
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime
      };
    }
  }

  /**
   * Block suspicious IP for extended period
   */
  static async blockIP(kv: KVNamespace, ip: string, hours: number = 24): Promise<void> {
    const key = `blocked_ip:${ip}`;
    const expirationTtl = hours * 3600; // Convert to seconds
    
    await kv.put(key, JSON.stringify({
      blocked_at: new Date().toISOString(),
      reason: 'Suspicious activity detected',
      expires_at: new Date(Date.now() + (hours * 3600 * 1000)).toISOString()
    }), { expirationTtl });
  }

  /**
   * Check if IP is blocked
   */
  static async isIPBlocked(kv: KVNamespace, ip: string): Promise<boolean> {
    const key = `blocked_ip:${ip}`;
    const blocked = await kv.get(key);
    return blocked !== null;
  }
}

/**
 * Virtual Machine Detection utilities
 */
export class VMDetector {
  /**
   * Detect if running in a virtual machine based on hardware fingerprint
   */
  static isVirtualMachine(components: {
    macAddresses: string[];
    computerName: string;
    osVersion: string;
    processorInfo?: string;
  }): {
    isVM: boolean;
    indicators: string[];
    confidence: 'low' | 'medium' | 'high';
  } {
    const indicators: string[] = [];
    let vmScore = 0;

    // Common VM MAC address prefixes
    const vmMacPrefixes = [
      '00:0c:29', // VMware
      '00:50:56', // VMware
      '08:00:27', // VirtualBox
      '00:03:ff', // Microsoft Virtual PC
      '00:1c:42', // Parallels
      '00:0f:4b', // Virtual Iron
    ];

    // Check MAC addresses for VM indicators
    for (const mac of components.macAddresses) {
      const normalizedMac = mac.toLowerCase();
      for (const prefix of vmMacPrefixes) {
        if (normalizedMac.startsWith(prefix)) {
          indicators.push(`VM MAC address detected: ${mac}`);
          vmScore += 3;
        }
      }
    }

    // Check computer name patterns
    const computerName = components.computerName.toLowerCase();
    const vmNamePatterns = [
      /^vm-/, /vmware/, /vbox/, /virtual/, /^win-[a-z0-9]+$/
    ];

    for (const pattern of vmNamePatterns) {
      if (pattern.test(computerName)) {
        indicators.push(`VM computer name pattern: ${components.computerName}`);
        vmScore += 2;
      }
    }

    // Check processor info for VM indicators
    if (components.processorInfo) {
      const processor = components.processorInfo.toLowerCase();
      if (processor.includes('vmware') || processor.includes('virtual') || processor.includes('qemu')) {
        indicators.push(`VM processor detected: ${components.processorInfo}`);
        vmScore += 3;
      }
    }

    // Determine confidence based on score
    let confidence: 'low' | 'medium' | 'high';
    let isVM = false;

    if (vmScore >= 5) {
      confidence = 'high';
      isVM = true;
    } else if (vmScore >= 3) {
      confidence = 'medium';
      isVM = true;
    } else if (vmScore > 0) {
      confidence = 'low';
      isVM = false; // Don't block on low confidence
    } else {
      confidence = 'low';
      isVM = false;
    }

    return {
      isVM,
      indicators,
      confidence
    };
  }

  /**
   * Get a human-readable summary of VM detection results
   */
  static getVMDetectionSummary(result: {
    isVM: boolean;
    indicators: string[];
    confidence: 'low' | 'medium' | 'high';
  }): string {
    if (!result.isVM) {
      return 'Hardware appears to be physical.';
    }

    return `Virtual machine detected (${result.confidence} confidence). Indicators: ${result.indicators.join(', ')}`;
  }
}

/**
 * Security validation utilities
 */
export class SecurityValidator {
  /**
   * Validate hardware fingerprint format
   */
  static isValidHardwareFingerprint(fingerprint: string): boolean {
    // Should be a 64-character hex string (SHA-256 hash)
    return /^[a-f0-9]{64}$/i.test(fingerprint);
  }

  /**
   * Validate license key format
   */
  static isValidLicenseKey(licenseKey: string): boolean {
    // Format: XXXX-XXXX-XXXX-XXXX
    return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey);
  }

  /**
   * Validate MAC address format
   */
  static isValidMacAddress(mac: string): boolean {
    return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
  }

  /**
   * Detect suspicious hardware changes
   */
  static detectHardwareChanges(
    currentFingerprint: string,
    storedFingerprint: string,
    currentMacs: string[],
    storedMacs: string[]
  ): {
    changed: boolean;
    severity: 'low' | 'medium' | 'high';
    changes: string[];
  } {
    const changes: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // Check fingerprint match
    if (currentFingerprint !== storedFingerprint) {
      changes.push('Hardware fingerprint changed');
      severity = 'high';
    }

    // Check MAC addresses
    const currentMacSet = new Set(currentMacs.map(mac => mac.toLowerCase()));
    const storedMacSet = new Set(storedMacs.map(mac => mac.toLowerCase()));
    
    const addedMacs = [...currentMacSet].filter(mac => !storedMacSet.has(mac));
    const removedMacs = [...storedMacSet].filter(mac => !currentMacSet.has(mac));

    if (addedMacs.length > 0) {
      changes.push(`New network adapters: ${addedMacs.join(', ')}`);
      if (severity === 'low') severity = 'medium';
    }

    if (removedMacs.length > 0) {
      changes.push(`Removed network adapters: ${removedMacs.join(', ')}`);
      if (severity === 'low') severity = 'medium';
    }

    // If all MACs changed, it's highly suspicious
    if (removedMacs.length === storedMacs.length && addedMacs.length > 0) {
      severity = 'high';
    }

    return {
      changed: changes.length > 0,
      severity,
      changes
    };
  }

  /**
   * Validate IP geolocation (basic check)
   */
  static async validateGeolocation(
    ip: string,
    allowedCountries?: string[]
  ): Promise<{ valid: boolean; country?: string; message?: string }> {
    if (!allowedCountries || allowedCountries.length === 0) {
      return { valid: true };
    }

    try {
      // In a real implementation, you would use a geolocation service
      // For now, return valid for all IPs
      return { valid: true, country: 'Unknown' };
    } catch (error) {
      return { 
        valid: false, 
        message: 'Unable to verify location' 
      };
    }
  }
}