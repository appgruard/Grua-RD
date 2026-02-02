import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, Upload, CheckCircle2, AlertCircle, RefreshCcw, IdCard, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/queryClient';

interface CedulaScanResult {
  success: boolean;
  cedula?: string;
  nombre?: string;
  apellido?: string;
  verified: boolean;
  message?: string;
}

interface CedulaScannerProps {
  onScanComplete: (result: CedulaScanResult) => void;
  onSkip?: () => void;
  required?: boolean;
  showSkip?: boolean;
  title?: string;
  description?: string;
}

export function CedulaScanner({
  onScanComplete,
  onSkip,
  required = false,
  showSkip = false,
  title = "Verificar Cédula",
  description = "Escanea tu cédula de identidad para verificar tu identidad"
}: CedulaScannerProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<CedulaScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resizeImage = (base64: string, maxWidth: number = 1000, maxHeight: number = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = base64;
    });
  };

  const scanImage = async (imageBase64: string) => {
    setIsScanning(true);
    setError(null);

    try {
      const resizedImage = await resizeImage(imageBase64);
      
      const response = await fetch(getApiUrl('/api/identity/scan-cedula'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          image: resizedImage,
          skipVerification: false
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al escanear la cédula');
      }

      const result: CedulaScanResult = {
        success: data.success,
        cedula: data.cedula,
        nombre: data.nombre,
        apellido: data.apellido,
        verified: data.verified,
        message: data.message,
      };

      setScanResult(result);
      
      if (result.verified) {
        onScanComplete(result);
        toast({
          title: 'Cédula verificada',
          description: 'Tu identidad ha sido verificada exitosamente',
        });
      } else if (result.success) {
        toast({
          title: 'Cédula escaneada',
          description: 'La cédula fue escaneada. Revisa el resultado y continúa.',
          variant: 'default',
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al procesar la imagen';
      setError(errorMessage);
      toast({
        title: 'Error de escaneo',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Máximo 10MB.');
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      setCapturedImage(base64);
      await scanImage(base64);
    } catch (err) {
      setError('Error al procesar la imagen');
    }
  };

  const startCamera = async () => {
    try {
      setShowCamera(true);
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => resolve())
              .catch(reject);
          };
          
          videoRef.current.onerror = () => {
            reject(new Error('Error loading video'));
          };
          
          setTimeout(() => reject(new Error('Camera timeout')), 10000);
        });
      }
    } catch (err) {
      setShowCamera(false);
      stopCamera();
      setError('No se pudo acceder a la cámara. Intenta subir una imagen.');
      toast({
        title: 'Error de cámara',
        description: 'No se pudo acceder a la cámara',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(base64);
    stopCamera();
    
    await scanImage(base64);
  };

  const reset = () => {
    setScanResult(null);
    setError(null);
    setCapturedImage(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (scanResult?.verified) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                Cédula Verificada
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Cédula: {scanResult.cedula}
              </p>
              {scanResult.nombre && (
                <p className="text-sm text-muted-foreground">
                  {scanResult.nombre} {scanResult.apellido}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={reset} data-testid="button-rescan">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Escanear otra
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (scanResult?.success && !scanResult.verified) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Cédula Escaneada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Cédula: {scanResult.cedula}
              </p>
              {scanResult.nombre && (
                <p className="text-sm text-muted-foreground">
                  {scanResult.nombre} {scanResult.apellido}
                </p>
              )}
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                La verificación en registros oficiales no pudo completarse. 
                Puedes intentar nuevamente o continuar con el registro.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button onClick={() => onScanComplete(scanResult)} data-testid="button-continue">
                Continuar con el registro
              </Button>
              <Button variant="outline" size="sm" onClick={reset} data-testid="button-retry">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Escanear de nuevo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showCamera ? (
          <div className="space-y-4">
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-dashed border-white/50 rounded-lg w-[90%] h-[70%] flex items-center justify-center">
                  <ScanLine className="w-12 h-12 text-white/70 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={capturePhoto} 
                className="flex-1"
                disabled={isScanning}
                data-testid="button-capture"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Capturar
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={stopCamera} data-testid="button-cancel-camera">
                Cancelar
              </Button>
            </div>
          </div>
        ) : capturedImage ? (
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
              <img
                src={capturedImage}
                alt="Cédula capturada"
                className="w-full h-full object-contain"
              />
              {isScanning && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Escaneando documento...</p>
                  </div>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={reset} className="w-full" data-testid="button-reset">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Tomar otra foto
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={startCamera}
                className="h-auto py-6 flex flex-col items-center gap-2"
                data-testid="button-use-camera"
              >
                <Camera className="w-8 h-8" />
                <span className="text-sm">Usar cámara</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-auto py-6 flex flex-col items-center gap-2"
                data-testid="button-upload-file"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm">Subir imagen</span>
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file-cedula"
            />

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Coloca tu cédula sobre una superficie plana y bien iluminada
              </p>
            </div>
          </div>
        )}

        {showSkip && !required && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="w-full text-muted-foreground"
            data-testid="button-skip-scan"
          >
            Omitir por ahora
          </Button>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
