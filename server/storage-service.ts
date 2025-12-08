import { Client } from '@replit/object-storage';
import { logSystem } from './logger';

class StorageService {
  private client: Client | null = null;
  private initialized = false;
  private initError: Error | null = null;

  private ensureInitialized() {
    if (this.initialized) {
      if (!this.client) {
        throw this.initError || new Error('Object Storage is not available. Please create a bucket in your Replit workspace.');
      }
      return;
    }

    try {
      this.client = new Client();
      this.initialized = true;
      logSystem.info('Replit Object Storage initialized successfully');
    } catch (error) {
      this.initialized = true;
      this.initError = error instanceof Error ? error : new Error('Failed to initialize Object Storage');
      logSystem.warn('Replit Object Storage not available. Documents upload feature will not work until a bucket is created.', { error: this.initError.message });
      throw this.initError;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    customName?: string
  ): Promise<{ url: string; filename: string }> {
    this.ensureInitialized();

    const timestamp = Date.now();
    const filename = customName || `${timestamp}-${file.originalname}`;
    const objectPath = `${folder}/${filename}`;

    const { ok, error } = await this.client!.uploadFromBytes(
      objectPath,
      file.buffer
    );

    if (!ok) {
      logSystem.error('Error uploading file', error, { objectPath });
      throw new Error(`Failed to upload file: ${error}`);
    }

    return {
      url: objectPath,
      filename: file.originalname,
    };
  }

  async downloadFile(objectPath: string): Promise<Buffer> {
    this.ensureInitialized();

    const { ok, value, error } = await this.client!.downloadAsBytes(objectPath);

    if (!ok) {
      logSystem.error('Error downloading file', error, { objectPath });
      throw new Error(`Failed to download file: ${error}`);
    }

    return Buffer.from(value as unknown as Uint8Array);
  }

  async deleteFile(objectPath: string): Promise<void> {
    this.ensureInitialized();

    const { ok, error } = await this.client!.delete(objectPath);

    if (!ok) {
      logSystem.error('Error deleting file', error, { objectPath });
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    this.ensureInitialized();

    const { ok, value, error } = await this.client!.list({ prefix });

    if (!ok) {
      logSystem.error('Error listing files', error, { prefix });
      throw new Error(`Failed to list files: ${error}`);
    }

    return value.map((obj) => obj.name);
  }

  async uploadBase64Image(
    base64Data: string,
    folder: string,
    filename: string,
    maxSizeBytes: number = 5 * 1024 * 1024 // Default 5MB max
  ): Promise<{ url: string; filename: string }> {
    this.ensureInitialized();
    
    // Extract base64 content and validate MIME type
    let mimeType = 'image/jpeg';
    let base64Content = base64Data;
    
    if (base64Data.includes('base64,')) {
      const parts = base64Data.split('base64,');
      const mimeMatch = parts[0].match(/data:([^;]+);/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      base64Content = parts[1];
    }
    
    // Validate MIME type - only allow images
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(mimeType)) {
      logSystem.warn('Invalid MIME type for image upload', { mimeType, folder });
      throw new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WebP, GIF).');
    }
    
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Validate file size
    if (buffer.length > maxSizeBytes) {
      logSystem.warn('Image too large for upload', { size: buffer.length, maxSize: maxSizeBytes });
      throw new Error(`La imagen es demasiado grande. Máximo ${Math.round(maxSizeBytes / 1024 / 1024)}MB.`);
    }
    
    // Validate minimum buffer size for magic bytes check
    if (buffer.length < 12) {
      logSystem.warn('Image buffer too small', { size: buffer.length, folder });
      throw new Error('El archivo es demasiado pequeño para ser una imagen válida.');
    }
    
    // Validate magic bytes to ensure it's actually an image
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && 
                   buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    
    if (!isJpeg && !isPng && !isGif && !isWebp) {
      logSystem.warn('Invalid image magic bytes', { folder });
      throw new Error('El archivo no parece ser una imagen válida.');
    }
    
    const objectPath = `${folder}/${filename}`;

    const { ok, error } = await this.client!.uploadFromBytes(objectPath, buffer);

    if (!ok) {
      logSystem.error('Error uploading base64 image', error, { objectPath });
      throw new Error(`Failed to upload image: ${error}`);
    }

    return { url: objectPath, filename };
  }
}

export const storageService = new StorageService();
