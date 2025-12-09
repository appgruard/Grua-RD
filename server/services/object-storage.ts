export {
  uploadDocument,
  downloadDocument as getDocument,
  deleteDocument,
  listDocuments as listUserDocuments,
  checkStorageHealth,
  isStorageAvailable as isStorageInitialized,
  validateFile,
  getActiveProviderName,
  getFilesystemProvider,
  getPublicUrl,
  type StorageResult as UploadResult,
  type StorageUploadOptions as UploadOptions,
} from './storage-provider';

export function resetStorageClient(): void {
  // No-op for compatibility - storage provider handles its own lifecycle
}
