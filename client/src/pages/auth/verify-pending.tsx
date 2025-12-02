import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Loader2, IdCard, Phone, CheckCircle2, AlertCircle, 
  Camera, Upload, RefreshCcw, ScanLine, LogOut, ShieldCheck
} from 'lucide-react';
import logoUrl from '@assets/20251126_144937_0000_1764283370962.png';

type VerificationStep = 'cedula' | 'phone' | 'complete';

export default function VerifyPending() {
  const [, setLocation] = useLocation();
  const { user, logout, pendingVerification, pendingVerificationUser, clearPendingVerification, refreshUser } = useAuth();
  const { toast } = useToast();
  
  const currentUser = user || pendingVerificationUser;
  const verificationStatus = pendingVerification || {
    cedulaVerificada: currentUser?.cedulaVerificada || false,
    telefonoVerificado: currentUser?.telefonoVerificado || false,
  };

  const [currentStep, setCurrentStep] = useState<VerificationStep>('cedula');
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cedulaVerified, setCedulaVerified] = useState(verificationStatus.cedulaVerificada);
  const [phoneVerified, setPhoneVerified] = useState(verificationStatus.telefonoVerificado);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (verificationStatus.cedulaVerificada && verificationStatus.telefonoVerificado) {
      clearPendingVerification();
      refreshUser().then(() => {
        setLocation('/driver');
      });
    } else if (verificationStatus.cedulaVerificada) {
      setCedulaVerified(true);
      setCurrentStep('phone');
    }
  }, [verificationStatus, setLocation, clearPendingVerification, refreshUser]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const progress = cedulaVerified && phoneVerified ? 100 : cedulaVerified ? 50 : 0;

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
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
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        if (height > maxHeight) { width = (width * maxHeight) / height; height = maxHeight; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = base64;
    });
  };

  const scanCedulaImage = async (imageBase64: string) => {
    setIsScanning(true);
    setErrors({});

    try {
      const resizedImage = await resizeImage(imageBase64);
      const response = await fetch('/api/identity/scan-cedula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          image: resizedImage,
          nombre: currentUser?.nombre,
          apellido: currentUser?.apellido
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al escanear la cédula');

      if (data.verified) {
        setCedulaVerified(true);
        toast({ title: 'Cédula verificada', description: 'Tu identidad ha sido verificada exitosamente' });
        setCurrentStep('phone');
      } else if (data.success && !data.verified) {
        setErrors({ cedula: data.error || 'El nombre en la cédula no coincide con el nombre registrado' });
        toast({ 
          title: 'Verificación fallida', 
          description: data.error || 'El nombre no coincide',
          variant: 'destructive' 
        });
      } else {
        throw new Error(data.error || 'Error al procesar la cédula');
      }
    } catch (err: any) {
      setErrors({ cedula: err.message || 'Error al procesar la imagen' });
      toast({ title: 'Error de escaneo', description: err.message, variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrors({ cedula: 'Solo se permiten imágenes' }); return; }
    if (file.size > 10 * 1024 * 1024) { setErrors({ cedula: 'La imagen es muy grande. Máximo 10MB.' }); return; }
    try {
      const base64 = await convertToBase64(file);
      setCapturedImage(base64);
      await scanCedulaImage(base64);
    } catch { setErrors({ cedula: 'Error al procesar la imagen' }); }
  };

  const startCamera = async () => {
    try {
      setShowCamera(true);
      setErrors({});
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) { reject(new Error('Video not available')); return; }
          videoRef.current.onloadedmetadata = () => { videoRef.current?.play().then(resolve).catch(reject); };
          setTimeout(() => reject(new Error('Camera timeout')), 10000);
        });
      }
    } catch {
      setShowCamera(false);
      stopCamera();
      setErrors({ cedula: 'No se pudo acceder a la cámara' });
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
    await scanCedulaImage(base64);
  };

  const resetScan = () => {
    setCapturedImage(null);
    setErrors({});
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/send-otp', {
        telefono: currentUser?.phone,
        tipoOperacion: 'registro'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al enviar código');
      }
      return res.json();
    },
    onSuccess: () => {
      setOtpTimer(60);
      toast({ title: 'Código enviado', description: 'Revisa tu teléfono para el código de verificación' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/verify-otp', {
        telefono: currentUser?.phone,
        codigo: otpCode,
        tipoOperacion: 'registro'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Código incorrecto');
      }
      return res.json();
    },
    onSuccess: async () => {
      setPhoneVerified(true);
      toast({ title: 'Teléfono verificado', description: 'Tu número de teléfono ha sido verificado' });
      clearPendingVerification();
      await refreshUser();
      setLocation('/driver');
    },
    onError: (error: any) => {
      setErrors({ otp: error.message });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleLogout = async () => {
    await logout();
    clearPendingVerification();
    setLocation('/login');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Sesión no encontrada</h2>
            <p className="text-muted-foreground mb-4">Por favor inicia sesión nuevamente.</p>
            <Button onClick={() => setLocation('/login')} data-testid="button-go-login">
              Ir a iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Grúa RD" className="h-10 w-auto" />
          <div>
            <h1 className="font-semibold">Verificación de Identidad</h1>
            <p className="text-xs text-muted-foreground">{currentUser.nombre} {currentUser.apellido}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progreso de verificación</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <ShieldCheck className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Para continuar usando Grúa RD como operador, debes completar la verificación de identidad.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <Card className={cn(
            "transition-all",
            cedulaVerified ? "border-green-500/50 bg-green-500/5" : currentStep === 'cedula' ? "ring-2 ring-primary" : ""
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  cedulaVerified ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                )}>
                  {cedulaVerified ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <IdCard className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">Verificación de Cédula</CardTitle>
                  <CardDescription>
                    {cedulaVerified ? 'Verificado' : 'Escanea tu cédula de identidad'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            {!cedulaVerified && currentStep === 'cedula' && (
              <CardContent className="space-y-4">
                {errors.cedula && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.cedula}</AlertDescription>
                  </Alert>
                )}

                {showCamera ? (
                  <div className="space-y-4">
                    <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-2 border-dashed border-white/50 rounded-lg w-[90%] h-[70%] flex items-center justify-center">
                          <ScanLine className="w-12 h-12 text-white/70 animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={capturePhoto} className="flex-1" disabled={isScanning} data-testid="button-capture">
                        {isScanning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> : <><Camera className="w-4 h-4 mr-2" />Capturar</>}
                      </Button>
                      <Button variant="outline" onClick={stopCamera} data-testid="button-cancel-camera">Cancelar</Button>
                    </div>
                  </div>
                ) : capturedImage ? (
                  <div className="space-y-4">
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                      <img src={capturedImage} alt="Cédula capturada" className="w-full h-full object-contain" />
                      {isScanning && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-sm">Escaneando documento...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" onClick={resetScan} className="w-full" data-testid="button-reset-scan">
                      <RefreshCcw className="w-4 h-4 mr-2" />Tomar otra foto
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" onClick={startCamera} className="h-auto py-6 flex flex-col items-center gap-2" data-testid="button-use-camera">
                        <Camera className="w-8 h-8" />
                        <span className="text-sm">Usar cámara</span>
                      </Button>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-auto py-6 flex flex-col items-center gap-2" data-testid="button-upload-file">
                        <Upload className="w-8 h-8" />
                        <span className="text-sm">Subir imagen</span>
                      </Button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" data-testid="input-file-cedula" />
                    <p className="text-xs text-center text-muted-foreground">
                      Coloca tu cédula sobre una superficie plana y bien iluminada
                    </p>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </CardContent>
            )}
          </Card>

          <Card className={cn(
            "transition-all",
            phoneVerified ? "border-green-500/50 bg-green-500/5" : 
            currentStep === 'phone' && cedulaVerified ? "ring-2 ring-primary" : "opacity-60"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  phoneVerified ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                )}>
                  {phoneVerified ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Phone className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">Verificación de Teléfono</CardTitle>
                  <CardDescription>
                    {phoneVerified ? 'Verificado' : currentUser?.phone || 'Sin teléfono registrado'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            {!phoneVerified && currentStep === 'phone' && cedulaVerified && (
              <CardContent className="space-y-4">
                {errors.otp && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.otp}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="otp">Código de verificación</Label>
                  <Input
                    id="otp"
                    placeholder="Ingresa el código de 6 dígitos"
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setErrors({});
                    }}
                    maxLength={6}
                    data-testid="input-otp-code"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => sendOtpMutation.mutate()}
                    disabled={otpTimer > 0 || sendOtpMutation.isPending}
                    className="flex-1"
                    data-testid="button-send-otp"
                  >
                    {sendOtpMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : otpTimer > 0 ? (
                      `Reenviar en ${otpTimer}s`
                    ) : (
                      'Enviar código'
                    )}
                  </Button>
                  <Button
                    onClick={() => verifyOtpMutation.mutate()}
                    disabled={otpCode.length !== 6 || verifyOtpMutation.isPending}
                    className="flex-1"
                    data-testid="button-verify-otp"
                  >
                    {verifyOtpMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Verificar'
                    )}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
