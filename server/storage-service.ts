import { logSystem } from './logger';
import {
  uploadDocument,
  downloadDocument,
  deleteDocument,
  listDocuments,
  isStorageAvailable,
  getActiveProviderName,
} from './services/storage-provider';

class StorageService {
  private checkAvailability() {
    if (!isStorageAvailable()) {
      throw new Error('El servicio de almacenamiento no está disponible. Por favor contacta al administrador.');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    customName?: string
  ): Promise<{ url: string; filename: string }> {
    this.checkAvailability();

    const timestamp = Date.now();
    const filename = customName || `${timestamp}-${file.originalname}`;

    const result = await uploadDocument({
      buffer: file.buffer,
      originalName: filename,
      mimeType: file.mimetype,
      userId: folder,
      documentType: 'files',
    });

    logSystem.info('File uploaded via StorageService', { 
      provider: getActiveProviderName(),
      key: result.key 
    });

    return {
      url: result.url,
      filename: file.originalname,
    };
  }

  async downloadFile(objectPath: string): Promise<Buffer> {
    this.checkAvailability();

    const buffer = await downloadDocument(objectPath);

    if (!buffer) {
      throw new Error(`Failed to download file: ${objectPath}`);
    }

    return buffer;
  }

  async deleteFile(objectPath: string): Promise<void> {
    this.checkAvailability();

    const success = await deleteDocument(objectPath);
    if (!success) {
      throw new Error(`Failed to delete file: ${objectPath}`);
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    this.checkAvailability();
    return listDocuments(prefix || '');
  }

  async uploadBase64Image(
    base64Data: string,
    folder: string,
    filename: string,
    maxSizeBytes: number = 5 * 1024 * 1024
  ): Promise<{ url: string; filename: string }> {
    this.checkAvailability();
    
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
    
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(mimeType)) {
      logSystem.warn('Invalid MIME type for image upload', { mimeType, folder });
      throw new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WebP, GIF).');
    }
    
    const buffer = Buffer.from(base64Content, 'base64');
    
    if (buffer.length > maxSizeBytes) {
      logSystem.warn('Image too large for upload', { size: buffer.length, maxSize: maxSizeBytes });
      throw new Error(`La imagen es demasiado grande. Máximo ${Math.round(maxSizeBytes / 1024 / 1024)}MB.`);
    }
    
    if (buffer.length < 12) {
      logSystem.warn('Image buffer too small', { size: buffer.length, folder });
      throw new Error('El archivo es demasiado pequeño para ser una imagen válida.');
    }
    
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && 
                   buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    
    if (!isJpeg && !isPng && !isGif && !isWebp) {
      logSystem.warn('Invalid image magic bytes', { folder });
      throw new Error('El archivo no parece ser una imagen válida.');
    }

    const result = await uploadDocument({
      buffer,
      originalName: filename,
      mimeType,
      userId: folder,
      documentType: 'images',
    });

    logSystem.info('Base64 image uploaded via StorageService', { 
      provider: getActiveProviderName(),
      key: result.key 
    });

    return { url: result.url, filename };
  }
}

export const storageService = new StorageService();
