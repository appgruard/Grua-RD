import { logger } from '../logger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

// Base upload directory - use /app/uploads for CapRover, fallback to ./uploads for local development
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || (process.env.NODE_ENV === 'production' ? '/app/uploads' : './uploads');

// Ensure base upload directory exists on startup
if (!existsSync(UPLOAD_BASE_DIR)) {
  mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
  console.log(`Created upload directory: ${UPLOAD_BASE_DIR}`);
}

/**
 * Check if storage is initialized (always true for file-based storage)
 */
export function isStorageInitialized(): boolean {
  return existsSync(UPLOAD_BASE_DIR);
}

/**
 * Resets storage initialization state (no-op for file-based storage)
 */
export function resetStorageClient(): void {
  logger.info('File-based storage is always available');
}

/**
 * Health check for file storage
 */
export async function checkStorageHealth(): Promise<{ 
  status: string; 
  responseTime: number; 
  error?: string;
}> {
  const start = Date.now();
  
  try {
    // Test write/read/delete to verify storage is working
    const testFile = path.join(UPLOAD_BASE_DIR, '_health_check_' + Date.now());
    await fs.writeFile(testFile, 'health check');
    await fs.readFile(testFile);
    await fs.unlink(testFile);
    
    return { 
      status: "healthy", 
      responseTime: Date.now() - start 
    };
  } catch (error) {
    return { 
      status: "unhealthy", 
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Allowed MIME types for document uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface UploadResult {
  key: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadOptions {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  userId: string;
  documentType: string;
}

/**
 * Validate file before upload
 */
export function validateFile(fileSize: number, mimeType: string): { valid: boolean; error?: string } {
  if (fileSize > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `Archivo muy grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { 
      valid: false, 
      error: 'Formato de archivo no permitido. Solo se aceptan JPG, PNG y PDF' 
    };
  }

  return { valid: true };
}

/**
 * Generate a unique file key for storage
 */
function generateFileKey(userId: string, documentType: string, originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  return `documents/${userId}/${documentType}/${timestamp}-${randomId}${ext}`;
}

/**
 * Ensure directory exists for a file path
 */
async function ensureDirectoryExists(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Upload a file to local file storage
 */
export async function uploadDocument(options: UploadOptions): Promise<UploadResult> {
  const { buffer, originalName, mimeType, userId, documentType } = options;

  try {
    // Validate file
    const validation = validateFile(buffer.length, mimeType);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate unique key
    const key = generateFileKey(userId, documentType, originalName);
    const fullPath = path.join(UPLOAD_BASE_DIR, key);

    // Ensure directory exists
    await ensureDirectoryExists(fullPath);

    // Write file to disk
    await fs.writeFile(fullPath, buffer);

    logger.info('Document uploaded to file storage', {
      key,
      userId,
      documentType,
      fileSize: buffer.length,
      mimeType,
    });

    return {
      key,
      url: key,
      fileName: originalName,
      fileSize: buffer.length,
      mimeType,
    };
  } catch (error) {
    logger.error('Error uploading document to file storage', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      documentType,
    });
    throw error;
  }
}

/**
 * Retrieve a document from file storage
 */
export async function getDocument(key: string): Promise<Buffer | null> {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, key);
    
    try {
      await fs.access(fullPath);
    } catch {
      logger.warn('Document not found in file storage', { key });
      return null;
    }
    
    const buffer = await fs.readFile(fullPath);
    return buffer;
  } catch (error) {
    logger.error('Error retrieving document from file storage', {
      error: error instanceof Error ? error.message : 'Unknown error',
      key,
    });
    return null;
  }
}

/**
 * Delete a document from file storage
 */
export async function deleteDocument(key: string): Promise<boolean> {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, key);
    
    try {
      await fs.access(fullPath);
    } catch {
      logger.warn('Document not found for deletion', { key });
      return false;
    }
    
    await fs.unlink(fullPath);
    logger.info('Document deleted from file storage', { key });
    return true;
  } catch (error) {
    logger.error('Error deleting document from file storage', {
      error: error instanceof Error ? error.message : 'Unknown error',
      key,
    });
    return false;
  }
}

/**
 * List all documents for a user
 */
export async function listUserDocuments(userId: string): Promise<string[]> {
  try {
    const userDir = path.join(UPLOAD_BASE_DIR, 'documents', userId);
    
    try {
      await fs.access(userDir);
    } catch {
      return [];
    }
    
    const results: string[] = [];
    
    async function walkDir(dir: string, baseKey: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        const entryKey = path.join(baseKey, entry.name);
        if (entry.isDirectory()) {
          await walkDir(entryPath, entryKey);
        } else {
          results.push(entryKey);
        }
      }
    }
    
    await walkDir(userDir, `documents/${userId}`);
    return results;
  } catch (error) {
    logger.error('Error listing user documents', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    return [];
  }
}
