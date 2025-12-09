import { Client } from '@replit/object-storage';
import { logger } from '../logger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

export interface StorageResult {
  key: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface StorageUploadOptions {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  userId: string;
  documentType: string;
}

export interface StorageProvider {
  name: string;
  isAvailable(): boolean;
  upload(options: StorageUploadOptions): Promise<StorageResult>;
  download(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

function generateFileKey(userId: string, documentType: string, originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  return `documents/${userId}/${documentType}/${timestamp}-${randomId}${ext}`;
}

class ReplitStorageProvider implements StorageProvider {
  name = 'replit';
  private client: Client | null = null;
  private initAttempted = false;

  private getClient(): Client | null {
    if (this.client) return this.client;
    if (this.initAttempted) return null;

    try {
      this.client = new Client();
      this.initAttempted = true;
      logger.info('Replit Object Storage initialized successfully');
      return this.client;
    } catch (error) {
      this.initAttempted = true;
      logger.warn('Replit Object Storage not available', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  isAvailable(): boolean {
    return this.getClient() !== null;
  }

  async upload(options: StorageUploadOptions): Promise<StorageResult> {
    const client = this.getClient();
    if (!client) {
      throw new Error('Replit storage not available');
    }

    const validation = validateFile(options.buffer.length, options.mimeType);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const key = generateFileKey(options.userId, options.documentType, options.originalName);
    const result = await client.uploadFromBytes(key, options.buffer);

    if (!result.ok) {
      throw new Error(result.error?.message || 'Failed to upload document');
    }

    logger.info('Document uploaded to Replit storage', {
      key,
      userId: options.userId,
      documentType: options.documentType,
    });

    return {
      key,
      url: key,
      fileName: options.originalName,
      fileSize: options.buffer.length,
      mimeType: options.mimeType,
    };
  }

  async download(key: string): Promise<Buffer | null> {
    const client = this.getClient();
    if (!client) return null;

    const result = await client.downloadAsBytes(key);
    if (!result.ok) {
      logger.warn('Document not found in Replit storage', { key });
      return null;
    }

    return Buffer.from(result.value as unknown as Uint8Array);
  }

  async delete(key: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      await client.delete(key);
      logger.info('Document deleted from Replit storage', { key });
      return true;
    } catch (error) {
      logger.error('Error deleting from Replit storage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      return false;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const client = this.getClient();
    if (!client) return [];

    const result = await client.list({ prefix });
    if (!result.ok) return [];

    return result.value.map((obj) => obj.name);
  }
}

class FilesystemStorageProvider implements StorageProvider {
  name = 'filesystem';
  private baseDir: string;

  constructor() {
    this.baseDir = process.env.STORAGE_PATH || '/app/uploads';
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        logger.info('Created filesystem storage directory', { baseDir: this.baseDir });
      }
    } catch (error) {
      logger.error('Failed to create storage directory', {
        baseDir: this.baseDir,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  isAvailable(): boolean {
    try {
      this.ensureBaseDir();
      fs.accessSync(this.baseDir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  async upload(options: StorageUploadOptions): Promise<StorageResult> {
    const validation = validateFile(options.buffer.length, options.mimeType);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const key = generateFileKey(options.userId, options.documentType, options.originalName);
    const fullPath = path.join(this.baseDir, key);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, options.buffer);

    logger.info('Document uploaded to filesystem', {
      key,
      userId: options.userId,
      documentType: options.documentType,
      path: fullPath,
    });

    return {
      key,
      url: key,
      fileName: options.originalName,
      fileSize: options.buffer.length,
      mimeType: options.mimeType,
    };
  }

  async download(key: string): Promise<Buffer | null> {
    const fullPath = path.join(this.baseDir, key);

    try {
      if (!fs.existsSync(fullPath)) {
        logger.warn('Document not found in filesystem', { key, path: fullPath });
        return null;
      }
      return fs.readFileSync(fullPath);
    } catch (error) {
      logger.error('Error reading from filesystem', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, key);

    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        logger.info('Document deleted from filesystem', { key });
      }
      return true;
    } catch (error) {
      logger.error('Error deleting from filesystem', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      return false;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const searchPath = path.join(this.baseDir, prefix);

    try {
      if (!fs.existsSync(searchPath)) {
        return [];
      }

      const files: string[] = [];
      const walkDir = (dir: string): void => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else {
            files.push(fullPath.replace(this.baseDir + '/', ''));
          }
        }
      };

      walkDir(searchPath);
      return files;
    } catch (error) {
      logger.error('Error listing filesystem', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prefix,
      });
      return [];
    }
  }

  getFilePath(key: string): string {
    return path.join(this.baseDir, key);
  }
}

let activeProvider: StorageProvider | null = null;
const filesystemProvider = new FilesystemStorageProvider();

// Solo inicializar Replit provider si no estamos forzando filesystem
const forceFilesystem = process.env.STORAGE_PROVIDER === 'filesystem' || process.env.CAPROVER === 'true';
const replitProvider = forceFilesystem ? null : new ReplitStorageProvider();

if (forceFilesystem) {
  logger.info('Filesystem storage forced via environment variable (CapRover deployment)');
}

function getStorageProvider(): StorageProvider {
  if (activeProvider && activeProvider.isAvailable()) {
    return activeProvider;
  }

  // Solo intentar Replit si no estamos forzando filesystem
  if (replitProvider && replitProvider.isAvailable()) {
    activeProvider = replitProvider;
    logger.info('Using Replit Object Storage provider');
    return activeProvider;
  }

  if (filesystemProvider.isAvailable()) {
    activeProvider = filesystemProvider;
    logger.info('Using Filesystem storage provider (CapRover/local deployment)');
    return activeProvider;
  }

  logger.error('No storage provider available');
  throw new Error('No storage provider available');
}

export function isStorageAvailable(): boolean {
  try {
    getStorageProvider();
    return true;
  } catch {
    return false;
  }
}

export function getActiveProviderName(): string {
  try {
    return getStorageProvider().name;
  } catch {
    return 'none';
  }
}

export async function uploadDocument(options: StorageUploadOptions): Promise<StorageResult> {
  const provider = getStorageProvider();
  return provider.upload(options);
}

export async function downloadDocument(key: string): Promise<Buffer | null> {
  const provider = getStorageProvider();
  return provider.download(key);
}

export async function deleteDocument(key: string): Promise<boolean> {
  const provider = getStorageProvider();
  return provider.delete(key);
}

export async function listDocuments(prefix: string): Promise<string[]> {
  const provider = getStorageProvider();
  return provider.list(prefix);
}

export async function checkStorageHealth(): Promise<{ 
  status: string; 
  provider: string;
  responseTime: number; 
  error?: string;
}> {
  const start = Date.now();
  
  try {
    const provider = getStorageProvider();
    await provider.list('_health_check_');
    
    return {
      status: 'healthy',
      provider: provider.name,
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      provider: 'none',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function getFilesystemProvider(): FilesystemStorageProvider {
  return filesystemProvider;
}

export function getPublicUrl(key: string): string {
  const provider = getStorageProvider();
  if (provider.name === 'filesystem') {
    return `/api/storage/files/${key}`;
  }
  return key;
}
