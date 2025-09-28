// TurnkeyAppShield - File Upload and Protection API Routes
// Handles EXE file uploads, protection job management, and download system

import { Hono } from 'hono';
import type { AppContext } from '../types/database';
import { DatabaseManager } from '../utils/database';
import { z } from 'zod';

const uploads = new Hono<AppContext>();

// Validation schemas
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

// Utility functions
function generateSecureFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'exe';
  return `upload_${timestamp}_${random}.${extension}`;
}

function generateDownloadUrl(jobId: number, filename: string): string {
  const token = Math.random().toString(36).substring(2, 15);
  return `/api/uploads/download/${jobId}/${token}/${filename}`;
}

async function uploadFileToR2(r2Bucket: R2Bucket | undefined, key: string, file: ArrayBuffer, contentType: string): Promise<void> {
  if (!r2Bucket) {
    // Fallback for development: simulate successful upload
    console.log(`[DEV] Simulating R2 upload for key: ${key}, size: ${file.byteLength}`);
    return;
  }
  
  try {
    // Upload file directly to R2 with metadata
    await r2Bucket.put(key, file, {
      httpMetadata: {
        contentType,
      },
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
    // Fallback for development: create a mock file
    console.log(`[DEV] Simulating R2 download for key: ${key}`);
    const mockData = new TextEncoder().encode(`Mock protected file content for ${key}`);
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(mockData);
          controller.close();
        }
      }),
      httpMetadata: {
        contentType: 'application/octet-stream'
      }
    } as R2ObjectBody;
  }
  
  try {
    // Get file from R2
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

// Legacy KV fallback functions for backwards compatibility
async function uploadFileToKV(kv: KVNamespace | undefined, key: string, file: ArrayBuffer, contentType: string): Promise<void> {
  if (!kv) {
    console.log(`[DEV] Simulating KV upload for key: ${key}, size: ${file.byteLength}`);
    return;
  }
  
  // Store file as base64 in KV with metadata (fallback only)
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

// Initiate file upload - creates upload record and presigned URL
uploads.post('/initiate', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = UploadInitiateSchema.parse(body);
    
    const db = new DatabaseManager(c.env.DB);
    
    // Default customer_id to 1 if not provided (for demo purposes)
    const customerId = validatedData.customer_id || 1;
    
    // Verify customer exists
    const customer = await db.getCustomerById(customerId);
    if (!customer) {
      return c.json({ success: false, message: 'Customer not found' }, 404);
    }
    
    // Generate secure filename and calculate file hash placeholder
    const secureFilename = generateSecureFilename(validatedData.filename);
    const fileHash = `temp_${Date.now()}_${Math.random().toString(36)}`;
    const uploadPath = `uploads/${customerId}/${secureFilename}`;
    
    // Create file upload record
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
      max_file_size: 100 * 1024 * 1024, // 100MB
      allowed_types: ['application/x-msdownload', 'application/octet-stream', 'application/x-executable']
    });
    
  } catch (error) {
    console.error('Upload initiation error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ success: false, message: 'Invalid request data', errors: error.errors }, 400);
    }
    return c.json({ success: false, message: 'Failed to initiate upload' }, 500);
  }
});

// Handle actual file upload to R2 storage
uploads.post('/:upload_id/upload', async (c) => {
  try {
    const uploadId = parseInt(c.req.param('upload_id'));
    if (!uploadId) {
      return c.json({ success: false, message: 'Invalid upload ID' }, 400);
    }
    
    const db = new DatabaseManager(c.env.DB);
    
    // Get upload record
    const uploadRecord = await db.db.prepare(`
      SELECT * FROM file_uploads WHERE id = ? AND status = 'uploading'
    `).bind(uploadId).first();
    
    if (!uploadRecord) {
      return c.json({ success: false, message: 'Upload record not found or already processed' }, 404);
    }
    
    // Get file from request
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ success: false, message: 'No file provided' }, 400);
    }
    
    // Validate file size
    if (file.size !== uploadRecord.file_size) {
      return c.json({ success: false, message: 'File size mismatch' }, 400);
    }
    
    // Validate file type
    if (!file.type.includes('application/')) {
      return c.json({ success: false, message: 'Invalid file type' }, 400);
    }
    
    // Convert file to ArrayBuffer and calculate hash
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
      
      // Update upload record with success status and real hash
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
      
    } catch (r2Error) {
      console.error('R2 upload error:', r2Error);
      
      // Update upload record with failed status
      await db.db.prepare(`
        UPDATE file_uploads 
        SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind('Failed to upload to storage', uploadId).run();
      
      return c.json({ success: false, message: 'Failed to upload file to storage' }, 500);
    }
    
  } catch (error) {
    console.error('File upload error:', error);
    return c.json({ success: false, message: 'Failed to process file upload' }, 500);
  }
});

// Create protection job for uploaded file
uploads.post('/protect', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = CreateProtectionJobSchema.parse(body);
    
    const db = new DatabaseManager(c.env.DB);
    
    // Default customer_id to 1 if not provided
    const customerId = validatedData.customer_id || 1;
    
    // Verify file upload exists and belongs to customer
    const fileUpload = await db.db.prepare(`
      SELECT * FROM file_uploads 
      WHERE id = ? AND customer_id = ? AND status = 'uploaded'
    `).bind(validatedData.file_upload_id, customerId).first();
    
    if (!fileUpload) {
      return c.json({ success: false, message: 'File upload not found or not ready for protection' }, 404);
    }
    
    // Check if protection job already exists for this file
    const existingJob = await db.db.prepare(`
      SELECT id FROM protection_jobs WHERE file_upload_id = ?
    `).bind(validatedData.file_upload_id).first();
    
    if (existingJob) {
      return c.json({ success: false, message: 'Protection job already exists for this file' }, 409);
    }
    
    // Create protection job
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
    
    // Update file upload status
    await db.db.prepare(`
      UPDATE file_uploads 
      SET status = 'processing', protection_job_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(jobId, validatedData.file_upload_id).run();
    
    // Start background processing (simplified simulation)
    // In a real implementation, this would trigger a worker or queue system
    setTimeout(async () => {
      try {
        await simulateProtectionProcessing(c.env.DB, jobId, fileUpload.original_filename);
      } catch (error) {
        console.error('Background protection processing error:', error);
      }
    }, 1000); // Start processing after 1 second
    
    return c.json({
      success: true,
      job_id: jobId,
      message: 'Protection job created successfully',
      estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    });
    
  } catch (error) {
    console.error('Protection job creation error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ success: false, message: 'Invalid request data', errors: error.errors }, 400);
    }
    return c.json({ success: false, message: 'Failed to create protection job' }, 500);
  }
});

// Get protection job status
uploads.get('/job/:job_id/status', async (c) => {
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
    console.error('Job status error:', error);
    return c.json({ success: false, message: 'Failed to get job status' }, 500);
  }
});

// Download protected file
uploads.get('/download/:job_id/:token/:filename', async (c) => {
  try {
    const jobId = parseInt(c.req.param('job_id'));
    const token = c.req.param('token');
    const filename = c.req.param('filename');
    
    const db = new DatabaseManager(c.env.DB);
    
    // Get protection job with download info
    const job = await db.db.prepare(`
      SELECT * FROM protection_jobs 
      WHERE id = ? AND status = 'completed' AND protected_file_path IS NOT NULL
    `).bind(jobId).first();
    
    if (!job) {
      return c.json({ success: false, message: 'Protected file not found or not ready' }, 404);
    }
    
    // Check if download has expired
    if (job.download_expires_at && new Date(job.download_expires_at) < new Date()) {
      return c.json({ success: false, message: 'Download link has expired' }, 410);
    }
    
    // Simple token validation (in production, use proper JWT or signed tokens)
    if (!job.download_url.includes(token)) {
      return c.json({ success: false, message: 'Invalid download token' }, 403);
    }
    
    try {
      // Get file from R2 storage (primary) with KV fallback
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
      
      // Log download attempt
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
      
      // Return file with proper headers
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
      console.error('File download error:', storageError);
      return c.json({ success: false, message: 'Failed to retrieve protected file' }, 500);
    }
    
  } catch (error) {
    console.error('Download error:', error);
    return c.json({ success: false, message: 'Failed to process download request' }, 500);
  }
});

// List customer uploads and jobs
uploads.get('/list/:customer_id?', async (c) => {
  try {
    const customerIdParam = c.req.param('customer_id');
    const customerId = customerIdParam ? parseInt(customerIdParam) : 1; // Default to customer 1
    
    const db = new DatabaseManager(c.env.DB);
    
    // Get file uploads with their protection jobs
    const uploads = await db.db.prepare(`
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
      WHERE fu.customer_id = ?
      ORDER BY fu.created_at DESC
      LIMIT 50
    `).bind(customerId).all();
    
    return c.json({
      success: true,
      uploads: uploads.results || [],
      count: uploads.results?.length || 0
    });
    
  } catch (error) {
    console.error('List uploads error:', error);
    return c.json({ success: false, message: 'Failed to list uploads' }, 500);
  }
});

// Get protection templates
uploads.get('/templates', async (c) => {
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
    console.error('Templates error:', error);
    return c.json({ success: false, message: 'Failed to get protection templates' }, 500);
  }
});

// Simulate protection processing (in real implementation, this would be a worker/queue)
async function simulateProtectionProcessing(db: D1Database, jobId: number, originalFilename: string): Promise<void> {
  const dbManager = new DatabaseManager(db);
  
  try {
    // Update job to processing
    await db.prepare(`
      UPDATE protection_jobs 
      SET status = 'processing', started_at = CURRENT_TIMESTAMP, progress = 10
      WHERE id = ?
    `).bind(jobId).run();
    
    // Simulate processing steps with progress updates
    const steps = [
      { progress: 25, message: 'Analyzing executable structure...' },
      { progress: 50, message: 'Applying protection layers...' },
      { progress: 75, message: 'Injecting security code...' },
      { progress: 90, message: 'Finalizing protected executable...' }
    ];
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      await db.prepare(`
        UPDATE protection_jobs 
        SET progress = ?, processing_logs = COALESCE(processing_logs, '[]')
        WHERE id = ?
      `).bind(step.progress, jobId).run();
    }
    
    // Complete the job
    const protectedFilename = originalFilename.replace('.exe', '_protected.exe');
    const protectedPath = `protected/${jobId}/${protectedFilename}`;
    const downloadUrl = generateDownloadUrl(jobId, protectedFilename);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    
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
      Math.floor(Math.random() * 1000000) + 500000, // Simulated file size
      downloadUrl,
      expiresAt,
      jobId
    ).run();
    
    // Update file upload status
    await db.prepare(`
      UPDATE file_uploads 
      SET status = 'protected', updated_at = CURRENT_TIMESTAMP 
      WHERE protection_job_id = ?
    `).bind(jobId).run();
    
    console.log(`Protection job ${jobId} completed successfully`);
    
  } catch (error) {
    console.error(`Protection job ${jobId} failed:`, error);
    
    // Mark job as failed
    await db.prepare(`
      UPDATE protection_jobs 
      SET 
        status = 'failed',
        error_message = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(error instanceof Error ? error.message : 'Unknown error', jobId).run();
    
    // Update file upload status
    await db.prepare(`
      UPDATE file_uploads 
      SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE protection_job_id = ?
    `).bind('Protection processing failed', jobId).run();
  }
}

export default uploads;