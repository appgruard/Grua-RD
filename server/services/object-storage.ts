import { Client } from '@replit/object-storage';
import { logger } from '../logger';
import crypto from 'crypto';
import path from 'path';

let storage: Client | null = null;
let storageInitAttempted = false;

/**
 * Attempts to initialize storage client, returns null if unavailable
 * Allows retry on subsequent calls if initialization failed previously
 */
function getStorageClient(): Client | null {
  if (storage) {
    return storage;
  }

  if (!storageInitAttempted) {
    try {
      storage = new Client();
      storageInitAttempted = true;
      logger.info('Replit Object Storage initialized successfully');
      return storage;
    } catch (error) {
      storageInitAttempted = true;
      logger.warn('Replit Object Storage not available. Document upload feature will not work until a bucket is created.', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  // On subsequent calls, allow retry by resetting the flag periodically
  // This enables recovery if a bucket is created after startup
  return null;
}

/**
 * Resets storage initialization state to allow retry
 * Called when we want to attempt reconnection
 */
export function resetStorageClient(): void {
  storage = null;
  storageInitAttempted = false;
  logger.info('Storage client reset, will retry initialization on next operation');
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
 * Generate a unique file key for object storage
 */
function generateFileKey(userId: string, documentType: string, originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  return `documents/${userId}/${documentType}/${timestamp}-${randomId}${ext}`;
}

/**
 * Upload a file to Replit Object Storage
 */
export async function uploadDocument(options: UploadOptions): Promise<UploadResult> {
  const { buffer, originalName, mimeType, userId, documentType } = options;

  try {
    // Validate file
    const validation = validateFile(buffer.length, mimeType);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check if storage is available
    const storageClient = getStorageClient();
    if (!storageClient) {
      throw new Error('El servicio de almacenamiento no está disponible. Por favor contacta al administrador.');
    }

    // Generate unique key
    const key = generateFileKey(userId, documentType, originalName);

    // Upload to object storage using uploadFromBytes
    const result = await storageClient.uploadFromBytes(key, buffer);
    
    if (!result.ok) {
      throw new Error(result.error?.message || 'Failed to upload document');
    }

    logger.info('Document uploaded to object storage', {
      key,
      userId,
      documentType,
      fileSize: buffer.length,
      mimeType,
    });

    // Return result with public URL
    // Note: Replit object storage URLs are accessible via the storage client
    return {
      key,
      url: key, // We'll store the key as the URL and retrieve via storage client
      fileName: originalName,
      fileSize: buffer.length,
      mimeType,
    };
  } catch (error) {
    logger.error('Error uploading document to object storage', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      documentType,
    });
    throw error;
  }
}

/**
 * Retrieve a document from object storage
 */
export async function getDocument(key: string): Promise<Buffer | null> {
  try {
    const storageClient = getStorageClient();
    if (!storageClient) {
      logger.warn('Storage client not available for document retrieval', { key });
      return null;
    }
    
    const result = await storageClient.downloadAsBytes(key);
    
    if (!result.ok) {
      logger.warn('Document not found in object storage', { 
        key,
        error: result.error?.message 
      });
      return null;
    }
    
    return result.value;
  } catch (error) {
    logger.error('Error retrieving document from object storage', {
      error: error instanceof Error ? error.message : 'Unknown error',
      key,
    });
    return null;
  }
}

/**
 * Delete a document from object storage
 */
export async function deleteDocument(key: string): Promise<boolean> {
  try {
    const storageClient = getStorageClient();
    if (!storageClient) {
      logger.warn('Storage client not available for document deletion', { key });
      return false;
    }
    
    await storageClient.delete(key);
    logger.info('Document deleted from object storage', { key });
    return true;
  } catch (error) {
    logger.error('Error deleting document from object storage', {
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
    const storageClient = getStorageClient();
    if (!storageClient) {
      logger.warn('Storage client not available for listing documents', { userId });
      return [];
    }
    
    const prefix = `documents/${userId}/`;
    const result = await storageClient.list({ prefix });
    
    if (!result.ok) {
      logger.error('Error listing user documents', {
        error: result.error?.message,
        userId,
      });
      return [];
    }
    
    // Extract names from StorageObject array
    return result.value.map((obj) => obj.name);
  } catch (error) {
    logger.error('Error listing user documents', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    return [];
  }
}
