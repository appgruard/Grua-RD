import { logSystem } from './logger';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

// Base upload directory - use /app/uploads for CapRover, fallback to ./uploads for local development
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || (process.env.NODE_ENV === 'production' ? '/app/uploads' : './uploads');

// Ensure base upload directory exists on startup
if (!existsSync(UPLOAD_BASE_DIR)) {
  mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
}

class StorageService {
  private initialized = true;

  private ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    customName?: string
  ): Promise<{ url: string; filename: string }> {
    const timestamp = Date.now();
    const filename = customName || `${timestamp}-${file.originalname}`;
    const objectPath = `${folder}/${filename}`;
    const fullPath = path.join(UPLOAD_BASE_DIR, objectPath);

    try {
      this.ensureDirectoryExists(fullPath);
      await fs.writeFile(fullPath, file.buffer);

      logSystem.info('File uploaded successfully', { objectPath });

      return {
        url: objectPath,
        filename: file.originalname,
      };
    } catch (error) {
      logSystem.error('Error uploading file', error instanceof Error ? error : new Error('Unknown error'), { objectPath });
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadFile(objectPath: string): Promise<Buffer> {
    const fullPath = path.join(UPLOAD_BASE_DIR, objectPath);

    try {
      const buffer = await fs.readFile(fullPath);
      return buffer;
    } catch (error) {
      logSystem.error('Error downloading file', error instanceof Error ? error : new Error('Unknown error'), { objectPath });
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(objectPath: string): Promise<void> {
    const fullPath = path.join(UPLOAD_BASE_DIR, objectPath);

    try {
      await fs.unlink(fullPath);
      logSystem.info('File deleted successfully', { objectPath });
    } catch (error) {
      logSystem.error('Error deleting file', error instanceof Error ? error : new Error('Unknown error'), { objectPath });
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    const searchDir = prefix ? path.join(UPLOAD_BASE_DIR, prefix) : UPLOAD_BASE_DIR;

    try {
      if (!existsSync(searchDir)) {
        return [];
      }

      const results: string[] = [];

      async function walkDir(dir: string, baseKey: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(dir, entry.name);
          const entryKey = baseKey ? path.join(baseKey, entry.name) : entry.name;
          if (entry.isDirectory()) {
            await walkDir(entryPath, entryKey);
          } else {
            results.push(entryKey);
          }
        }
      }

      await walkDir(searchDir, prefix || '');
      return results;
    } catch (error) {
      logSystem.error('Error listing files', error instanceof Error ? error : new Error('Unknown error'), { prefix });
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const storageService = new StorageService();
