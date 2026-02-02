import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, getApiUrl } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Camera, Video, Image as ImageIcon, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MensajeChat } from '@shared/schema';

interface EvidenceUploaderProps {
  servicioId: string;
  onUploadComplete?: (url: string, tipo: 'imagen' | 'video') => void;
  disabled?: boolean;
  compact?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export function EvidenceUploader({ 
  servicioId, 
  onUploadComplete, 
  disabled = false,
  compact = false
}: EvidenceUploaderProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      toast({
        title: "Tipo de archivo no permitido",
        description: "Solo se permiten imagenes (JPG, PNG, GIF, WebP) y videos (MP4, MOV, WebM)",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no puede superar los 10MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  };

  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('servicioId', servicioId);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      try {
        const response = await fetch(getApiUrl('/api/chat/send-media'), {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al subir archivo');
        }

        setUploadProgress(100);
        return response.json() as Promise<MensajeChat>;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (mensaje) => {
      toast({
        title: "Archivo subido",
        description: "La evidencia se ha enviado correctamente",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/chat', servicioId] });
      
      if (mensaje.urlArchivo && onUploadComplete) {
        const tipo = selectedFile?.type.startsWith('video/') ? 'video' : 'imagen';
        onUploadComplete(mensaje.urlArchivo, tipo);
      }
      
      clearSelection();
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al subir",
        description: error.message || "No se pudo subir el archivo",
        variant: "destructive",
      });
      setUploadProgress(0);
      setIsUploading(false);
    },
  });

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const isVideo = selectedFile?.type.startsWith('video/');

  if (compact) {
    return (
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(',')}
          onChange={handleInputChange}
          className="hidden"
          data-testid="input-file"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
          data-testid="input-camera"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
          data-testid="input-video-capture"
        />

        {!selectedFile ? (
          <>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || isUploading}
              title="Tomar foto"
              data-testid="button-take-photo"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              title="Seleccionar archivo"
              data-testid="button-select-file"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 rounded overflow-hidden border">
              {isVideo ? (
                <video src={previewUrl!} className="w-full h-full object-cover" />
              ) : (
                <img src={previewUrl!} alt="Preview" className="w-full h-full object-cover" />
              )}
            </div>
            {isUploading ? (
              <div className="w-20">
                <Progress value={uploadProgress} className="h-2" />
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={clearSelection}
                  data-testid="button-clear-selection"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  onClick={handleUpload}
                  data-testid="button-upload"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border-dashed" data-testid="evidence-uploader">
      <CardContent className="p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(',')}
          onChange={handleInputChange}
          className="hidden"
          data-testid="input-file-full"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
          data-testid="input-camera-full"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
          data-testid="input-video-full"
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-sm font-medium mb-1">Subir Evidencia</p>
              <p className="text-xs text-muted-foreground">
                Fotos o videos de la situacion (max 10MB)
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled || isUploading}
                data-testid="button-camera-full"
                className="flex gap-2"
              >
                <Camera className="h-4 w-4" />
                Tomar Foto
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                disabled={disabled || isUploading}
                data-testid="button-video-full"
                className="flex gap-2"
              >
                <Video className="h-4 w-4" />
                Grabar Video
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                data-testid="button-gallery-full"
                className="flex gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                Galeria
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video max-h-48 mx-auto overflow-hidden rounded-lg border bg-muted">
              {isVideo ? (
                <video 
                  src={previewUrl!} 
                  controls 
                  className="w-full h-full object-contain"
                  data-testid="video-preview"
                />
              ) : (
                <img 
                  src={previewUrl!} 
                  alt="Vista previa" 
                  className="w-full h-full object-contain"
                  data-testid="image-preview"
                />
              )}
              {!isUploading && (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={clearSelection}
                  data-testid="button-remove-preview"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Subiendo... {uploadProgress}%
                </p>
              </div>
            )}

            {!isUploading && (
              <div className="flex justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearSelection}
                  data-testid="button-cancel-upload"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  data-testid="button-confirm-upload"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Enviar Evidencia
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
