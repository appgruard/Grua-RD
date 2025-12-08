import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './button';
import { Label } from './label';

interface FileUploadProps {
  label: string;
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  fileName?: string;
  isLoading?: boolean;
  testId?: string;
}

export function FileUpload({
  label,
  onFileSelect,
  accept = 'image/*,application/pdf',
  maxSize = 5 * 1024 * 1024,
  disabled = false,
  required = false,
  error,
  fileName,
  isLoading = false,
  testId,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Archivo muy grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
      };
    }

    const allowedTypes = accept.split(',').map(t => t.trim());
    let isAllowed = false;

    for (const type of allowedTypes) {
      if (type.endsWith('*')) {
        const prefix = type.replace('*', '');
        if (file.type.startsWith(prefix)) {
          isAllowed = true;
          break;
        }
      } else if (file.type === type) {
        isAllowed = true;
        break;
      }
    }

    if (!isAllowed) {
      return {
        valid: false,
        error: 'Tipo de archivo no permitido',
      };
    }

    return { valid: true };
  };

  const handleFile = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setLocalError(validation.error ?? null);
      return;
    }
    setLocalError(null);
    onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {required && <span className="text-destructive">*</span>}
      </div>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          accept={accept}
          disabled={disabled || isLoading}
          className="hidden"
          data-testid={testId}
        />
        <div
          onClick={() => !disabled && !isLoading && inputRef.current?.click()}
          className="text-center"
        >
          {fileName ? (
            <div className="space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-600" />
              <p className="text-sm font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                Haz clic para cambiar o arrastra otro archivo
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Arrastra tu archivo aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Máximo {(maxSize / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {(error || localError) && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error || localError}
        </div>
      )}
    </div>
  );
}
