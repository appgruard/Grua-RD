import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  previewUrl?: string;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  accept = 'image/jpeg,image/png,image/jpg,application/pdf',
  maxSizeMB = 5,
  previewUrl,
  disabled = false,
  label = 'Subir archivo',
  helperText = 'Arrastra un archivo aquí o haz clic para seleccionar',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const acceptedTypes = accept.split(',');
      if (!acceptedTypes.includes(file.type)) {
        return 'Tipo de archivo no válido. Solo se permiten imágenes JPG, PNG y archivos PDF.';
      }

      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        return `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`;
      }

      return null;
    },
    [accept, maxSizeMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError('');
      setFileName(file.name);
      onFileSelect(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setFileName('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileRemove?.();
  }, [onFileRemove]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      
      {!fileName ? (
        <Card
          className={`
            relative cursor-pointer transition-all
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
            ${disabled ? 'cursor-not-allowed opacity-50' : 'hover-elevate'}
            ${error ? 'border-destructive' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          data-testid="file-upload-dropzone"
        >
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground mb-1">
              {helperText}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG o PDF (máx. {maxSizeMB}MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
            data-testid="file-upload-input"
          />
        </Card>
      ) : (
        <Card className="p-4" data-testid="file-upload-preview">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {fileName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Archivo seleccionado
              </p>
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                data-testid="button-remove-file"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {error && (
        <p className="text-sm text-destructive" data-testid="text-file-upload-error">
          {error}
        </p>
      )}
    </div>
  );
}
