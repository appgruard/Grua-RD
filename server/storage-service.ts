import { Client } from '@replit/object-storage';

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
      console.log('✅ Replit Object Storage initialized successfully');
    } catch (error) {
      this.initialized = true;
      this.initError = error instanceof Error ? error : new Error('Failed to initialize Object Storage');
      console.warn('⚠️  Replit Object Storage not available. Please create a bucket in the Replit workspace.');
      console.warn('   Documents upload feature will not work until a bucket is created.');
      console.warn('   Error:', this.initError.message);
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
      console.error('Error uploading file:', error);
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
      console.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${error}`);
    }

    return Buffer.from(value);
  }

  async deleteFile(objectPath: string): Promise<void> {
    this.ensureInitialized();

    const { ok, error } = await this.client!.delete(objectPath);

    if (!ok) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    this.ensureInitialized();

    const { ok, value, error } = await this.client!.list({ prefix });

    if (!ok) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error}`);
    }

    return value.map((obj) => obj.name);
  }
}

export const storageService = new StorageService();
