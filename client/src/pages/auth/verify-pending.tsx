import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Loader2, IdCard, Mail, CheckCircle2, AlertCircle, 
  Camera, Upload, RefreshCcw, ScanLine, LogOut, ShieldCheck, 
  UserCircle, ArrowRight, Circle, CheckCircle
} from 'lucide-react';
import logoUrl from '@assets/20251126_144937_0000_1764283370962.png';

type VerificationStep = 'cedula' | 'email' | 'photo' | 'complete';

interface VerificationStepInfo {
  id: VerificationStep;
  title: string;
  shortTitle: string;
  description: string;
  icon: typeof IdCard;
  completed: boolean;
  current: boolean;
}

export default function VerifyPending() {
  const [, setLocation] = useLocation();
  const { user, logout, pendingVerification, pendingVerificationUser, clearPendingVerification, refreshUser } = useAuth();
  const { toast } = useToast();
  
  // Use user from context or pendingVerificationUser immediately
  const contextUser = user || pendingVerificationUser;
  
  // State declarations - initialize with optimistic values from pendingVerification
  const [currentStep, setCurrentStep] = useState<VerificationStep>('cedula');
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cedulaVerified, setCedulaVerified] = useState(pendingVerification?.cedulaVerificada || false);
  const [emailVerified, setEmailVerified] = useState((pendingVerification as any)?.emailVerificado || false);
  const [photoVerified, setPhotoVerified] = useState(pendingVerification?.fotoVerificada || false);
  const [profilePhotoImage, setProfilePhotoImage] = useState<string | null>(null);
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);
  const [showProfileCamera, setShowProfileCamera] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInitializing, setIsInitializing] = useState(!contextUser); // Only initializing if no context user
  const [initializedUser, setInitializedUser] = useState<any>(null);
  const [initError, setInitError] = useState(false);
  const initFetchedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Use user from context, or pendingVerificationUser, or initializedUser from API
  const currentUser = contextUser || initializedUser;
  const isDriver = currentUser?.userType === 'conductor';
  // Only email verification is required (no SMS)
  const emailVerificado = (currentUser as any)?.emailVerificado || false;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const profileVideoRef = useRef<HTMLVideoElement>(null);
  const profileCanvasRef = useRef<HTMLCanvasElement>(null);
  const profileStreamRef = useRef<MediaStream | null>(null);

  // Reusable function to fetch verification status from the server
  // When skipRedirects is true, only update local state without triggering redirects
  const fetchVerificationStatusFromServer = useCallback(async (signal?: AbortSignal, options?: { skipRedirects?: boolean }) => {
    try {
      const res = await fetch('/api/identity/verification-status', {
        credentials: 'include',
        signal
      });
      
      if (res.ok) {
        const data = await res.json();
        const { cedulaVerificada, cedulaPendingReview, emailVerificado, fotoVerificada } = data.verification;
        
        // Store user data from the response if we don't have context user
        if (data.user && !contextUser) {
          setInitializedUser(data.user);
        }
        
        // For onboarding flow, cedula step is complete if verified OR pending review
        const cedulaStepComplete = cedulaVerificada || cedulaPendingReview;
        
        // Always update local verification state
        setCedulaVerified(cedulaStepComplete);
        setEmailVerified(emailVerificado);
        setPhotoVerified(fotoVerificada);

        // Determine user type from API response or context
        const checkUser = data.user || contextUser;
        const isDriverCheck = checkUser?.userType === 'conductor';

        if (isDriverCheck) {
          // Only redirect if skipRedirects is not true
          if (cedulaVerificada && emailVerificado && fotoVerificada) {
            if (!options?.skipRedirects) {
              clearPendingVerification();
              refreshUser().then(() => {
                setLocation('/driver');
              });
            }
          } else if (cedulaStepComplete && emailVerificado && !fotoVerificada) {
            setCurrentStep('photo');
          } else if (cedulaStepComplete && !emailVerificado) {
            setCurrentStep('email');
          } else {
            setCurrentStep('cedula');
          }
        } else {
          // Client verification flow
          if (cedulaVerificada && emailVerificado) {
            // Fully verified - redirect if skipRedirects is not true
            if (!options?.skipRedirects) {
              clearPendingVerification();
              refreshUser().then(() => {
                setLocation('/client');
              });
            }
          } else if (cedulaStepComplete && !emailVerificado) {
            // Cedula done, needs email verification
            setCurrentStep('email');
          } else {
            // Needs cedula verification first
            setCurrentStep('cedula');
          }
        }
        return { success: true };
      } else if (res.status === 401) {
        if (!options?.skipRedirects) {
          setLocation('/login');
        }
        return { success: false, unauthorized: true };
      } else {
        return { success: false };
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return { success: false, aborted: true };
      console.error('Error checking verification status:', error);
      return { success: false };
    }
  }, [contextUser, setLocation, clearPendingVerification, refreshUser]);

  // Function to manually refetch verification status (for focus events, retry, etc.)
  // Always passes skipRedirects: true to avoid duplicate redirects after mutations
  const refetchVerificationStatus = useCallback(async (options?: { bypassInitGuard?: boolean }) => {
    // Skip if init hasn't completed yet, unless bypassInitGuard is true
    if (!options?.bypassInitGuard && !initFetchedRef.current) {
      return false;
    }
    
    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Always skip redirects when refetching - caller handles navigation
    const result = await fetchVerificationStatusFromServer(controller.signal, { skipRedirects: true });
    return result.success;
  }, [fetchVerificationStatusFromServer]);

  // Single effect to fetch verification status on mount - runs once per session
  useEffect(() => {
    // Skip if already fetched this session
    if (initFetchedRef.current) {
      setIsInitializing(false);
      return;
    }
    
    initFetchedRef.current = true;
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => {
      controller.abort();
      setInitError(true);
      setCedulaVerified(false);
      setEmailVerified(false);
      setPhotoVerified(false);
      setCurrentStep('cedula');
      setIsInitializing(false);
    }, 10000);
    
    const doFetch = async () => {
      // Initial fetch can do redirects (skipRedirects: false by default)
      const result = await fetchVerificationStatusFromServer(controller.signal);
      clearTimeout(timeoutId);
      if (!result.success && !result.aborted && !result.unauthorized) {
        setInitError(true);
        setCedulaVerified(false);
        setEmailVerified(false);
        setPhotoVerified(false);
        setCurrentStep('cedula');
      }
      setIsInitializing(false);
    };

    doFetch();
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fetchVerificationStatusFromServer]);

  // Effect to refetch verification status when tab regains focus (handles multi-tab scenarios)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only refetch if page becomes visible and we have a user
      if (document.visibilityState === 'visible' && currentUser && initFetchedRef.current) {
        refetchVerificationStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, refetchVerificationStatus]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const getSteps = (): VerificationStepInfo[] => {
    const baseSteps: VerificationStepInfo[] = [
      {
        id: 'cedula',
        title: 'Verificar Cédula',
        shortTitle: 'Cédula',
        description: 'Escanea tu documento de identidad',
        icon: IdCard,
        completed: cedulaVerified,
        current: currentStep === 'cedula'
      },
      {
        id: 'email',
        title: 'Verificar Correo',
        shortTitle: 'Correo',
        description: 'Confirma tu correo electrónico con un código',
        icon: Mail,
        completed: emailVerified,
        current: currentStep === 'email'
      }
    ];

    if (isDriver) {
      baseSteps.push({
        id: 'photo',
        title: 'Foto de Perfil',
        shortTitle: 'Foto',
        description: 'Sube una foto clara de tu rostro',
        icon: UserCircle,
        completed: photoVerified,
        current: currentStep === 'photo'
      });
    }

    return baseSteps;
  };

  const steps = getSteps();
  const completedSteps = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const progress = Math.round((completedSteps / totalSteps) * 100);
  const currentStepIndex = steps.findIndex(s => s.current);

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
        await refetchVerificationStatus();
        toast({ title: 'Cédula verificada', description: 'Tu identidad ha sido verificada exitosamente' });
        setCurrentStep('email');
      } else if (data.success && data.manualVerificationRequired) {
        // Manual verification required - allow user to proceed
        setCedulaVerified(true);
        await refetchVerificationStatus();
        toast({ 
          title: 'Cédula recibida', 
          description: 'Tu cédula será verificada manualmente por un administrador' 
        });
        setCurrentStep('email');
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

  const startProfileCamera = async () => {
    try {
      setShowProfileCamera(true);
      setErrors({});
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      profileStreamRef.current = stream;
      if (profileVideoRef.current) {
        profileVideoRef.current.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
          if (!profileVideoRef.current) { reject(new Error('Video not available')); return; }
          profileVideoRef.current.onloadedmetadata = () => { profileVideoRef.current?.play().then(resolve).catch(reject); };
          setTimeout(() => reject(new Error('Camera timeout')), 10000);
        });
      }
    } catch {
      setShowProfileCamera(false);
      stopProfileCamera();
      setErrors({ profilePhoto: 'No se pudo acceder a la cámara' });
    }
  };

  const stopProfileCamera = () => {
    if (profileStreamRef.current) {
      profileStreamRef.current.getTracks().forEach(track => track.stop());
      profileStreamRef.current = null;
    }
    setShowProfileCamera(false);
  };

  const validateProfilePhoto = async (imageBase64: string) => {
    setIsValidatingPhoto(true);
    setErrors({});

    try {
      const resizedImage = await resizeImage(imageBase64, 800, 800);
      const response = await fetch('/api/identity/verify-profile-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ image: resizedImage }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al verificar la foto');

      if (data.verified) {
        setPhotoVerified(true);
        toast({ title: 'Foto verificada', description: `Verificación exitosa (${Math.round((data.score || 0) * 100)}%)` });
        clearPendingVerification();
        await refreshUser();
        await refetchVerificationStatus({ bypassInitGuard: true });
        setLocation('/driver');
      } else {
        setErrors({ profilePhoto: data.error || 'La foto no cumple con los requisitos' });
        toast({ 
          title: 'Verificación fallida', 
          description: data.error || 'La foto no es válida',
          variant: 'destructive' 
        });
      }
    } catch (err: any) {
      setErrors({ profilePhoto: err.message || 'Error al procesar la imagen' });
      toast({ title: 'Error de verificación', description: err.message, variant: 'destructive' });
    } finally {
      setIsValidatingPhoto(false);
    }
  };

  const captureProfilePhotoFromVideo = async () => {
    if (!profileVideoRef.current || !profileCanvasRef.current) return;
    const video = profileVideoRef.current;
    const canvas = profileCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setProfilePhotoImage(base64);
    stopProfileCamera();
    await validateProfilePhoto(base64);
  };

  const handleProfileFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrors({ profilePhoto: 'Solo se permiten imágenes' }); return; }
    if (file.size > 10 * 1024 * 1024) { setErrors({ profilePhoto: 'La imagen es muy grande. Máximo 10MB.' }); return; }
    try {
      const base64 = await convertToBase64(file);
      setProfilePhotoImage(base64);
      await validateProfilePhoto(base64);
    } catch { setErrors({ profilePhoto: 'Error al procesar la imagen' }); }
  };

  const resetProfilePhoto = () => {
    setProfilePhotoImage(null);
    setErrors({});
    stopProfileCamera();
    if (profileFileInputRef.current) profileFileInputRef.current.value = '';
  };

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/send-otp', {
        email: currentUser?.email,
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
      toast({ title: 'Código enviado', description: 'Revisa tu correo electrónico para el código de verificación' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/verify-otp', {
        email: currentUser?.email,
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
      setEmailVerified(true);
      toast({ title: 'Correo verificado', description: 'Tu correo electrónico ha sido verificado' });
      
      if (isDriver) {
        await refetchVerificationStatus({ bypassInitGuard: true });
        setCurrentStep('photo');
      } else {
        clearPendingVerification();
        await refreshUser();
        await refetchVerificationStatus({ bypassInitGuard: true });
        setLocation('/client');
      }
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

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold mb-2">Cargando...</h2>
            <p className="text-muted-foreground mb-4">Verificando tu sesión</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initError && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error de conexión</h2>
            <p className="text-muted-foreground mb-4">No pudimos verificar tu sesión. Intenta nuevamente.</p>
            <Button onClick={() => setLocation('/login')} data-testid="button-go-login-error">
              Ir a iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <header className="flex items-center justify-between p-4 border-b bg-card">
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

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold" data-testid="heading-verification-progress">
                Paso {currentStepIndex + 1} de {totalSteps}
              </h2>
              <p className="text-sm text-muted-foreground">
                {completedSteps} de {totalSteps} verificaciones completadas
              </p>
            </div>
            <Badge variant={progress === 100 ? "default" : "secondary"} className="text-sm" data-testid="badge-progress">
              {progress}%
            </Badge>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-bar" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-6 overflow-x-auto pb-2" data-testid="step-indicators">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                step.completed ? "bg-green-100 dark:bg-green-900/30" :
                step.current ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"
              )}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  step.completed ? "bg-green-500 text-white" :
                  step.current ? "bg-primary text-primary-foreground" : "bg-muted-foreground/30 text-muted-foreground"
                )}>
                  {step.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                <span className={cn(
                  "text-sm font-medium whitespace-nowrap",
                  step.completed ? "text-green-700 dark:text-green-400" :
                  step.current ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.shortTitle}
                </span>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className={cn(
                  "w-4 h-4 mx-1 flex-shrink-0",
                  steps[index].completed ? "text-green-500" : "text-muted-foreground/30"
                )} />
              )}
            </div>
          ))}
        </div>

        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <ShieldCheck className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">Verificación requerida</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-400/80">
            Para continuar usando Grúa RD como {isDriver ? 'operador' : 'cliente'}, debes completar todos los pasos de verificación.
          </AlertDescription>
        </Alert>

        <Card className="mb-6" data-testid="card-summary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Resumen de Verificación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {steps.map((step) => (
                <div 
                  key={step.id} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    step.completed ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20" :
                    step.current ? "border-primary bg-primary/5" : "border-muted bg-muted/30"
                  )}
                  data-testid={`summary-step-${step.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      step.completed ? "bg-green-100 dark:bg-green-800" :
                      step.current ? "bg-primary/10" : "bg-muted"
                    )}>
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <step.icon className={cn(
                          "w-5 h-5",
                          step.current ? "text-primary" : "text-muted-foreground"
                        )} />
                      )}
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium text-sm",
                        step.completed ? "text-green-700 dark:text-green-400" :
                        step.current ? "text-primary" : "text-muted-foreground"
                      )}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={step.completed ? "default" : step.current ? "outline" : "secondary"}
                    className={cn(
                      step.completed && "bg-green-500 hover:bg-green-600"
                    )}
                  >
                    {step.completed ? 'Completado' : step.current ? 'En progreso' : 'Pendiente'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={cn(
            "transition-all",
            cedulaVerified ? "border-green-500/50 bg-green-500/5" : currentStep === 'cedula' ? "ring-2 ring-primary" : "opacity-60"
          )} data-testid="card-cedula-verification">
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
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span>Paso 1: Verificación de Cédula</span>
                    {cedulaVerified && (
                      <Badge className="bg-green-500 hover:bg-green-600">Verificado</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {cedulaVerified ? 'Tu cédula ha sido verificada exitosamente' : 'Escanea tu cédula de identidad dominicana'}
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
            emailVerified ? "border-green-500/50 bg-green-500/5" : 
            currentStep === 'email' && cedulaVerified ? "ring-2 ring-primary" : "opacity-60"
          )} data-testid="card-phone-verification">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  emailVerified ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                )}>
                  {emailVerified ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span>Paso 2: Verificación de Correo</span>
                    {emailVerified && (
                      <Badge className="bg-green-500 hover:bg-green-600">Verificado</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {emailVerified ? 'Tu correo ha sido verificado' : currentUser?.email || 'Sin correo registrado'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            {!emailVerified && currentStep === 'email' && cedulaVerified && (
              <CardContent className="space-y-4">
                {errors.otp && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.otp}</AlertDescription>
                  </Alert>
                )}

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Enviaremos un código a:</p>
                  <p className="font-medium">{currentUser?.email}</p>
                </div>

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
                    className="text-center text-lg tracking-widest"
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

          {isDriver && (
            <Card className={cn(
              "transition-all",
              photoVerified ? "border-green-500/50 bg-green-500/5" : 
              currentStep === 'photo' && cedulaVerified && emailVerified ? "ring-2 ring-primary" : "opacity-60"
            )} data-testid="card-photo-verification">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    photoVerified ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                  )}>
                    {photoVerified ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <UserCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <span>Paso 3: Foto de Perfil Verificada</span>
                      {photoVerified && (
                        <Badge className="bg-green-500 hover:bg-green-600">Verificado</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {photoVerified ? 'Tu foto de perfil ha sido verificada' : 'Sube una foto clara de tu rostro'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              {!photoVerified && currentStep === 'photo' && cedulaVerified && emailVerified && (
                <CardContent className="space-y-4">
                  {errors.profilePhoto && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errors.profilePhoto}</AlertDescription>
                    </Alert>
                  )}

                  {showProfileCamera ? (
                    <div className="space-y-4">
                      <div className="relative mx-auto w-48 h-48 rounded-full overflow-hidden bg-black">
                        <video ref={profileVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="border-2 border-dashed border-white/50 rounded-full w-40 h-40" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={captureProfilePhotoFromVideo} className="flex-1" disabled={isValidatingPhoto} data-testid="button-capture-profile">
                          {isValidatingPhoto ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> : <><Camera className="w-4 h-4 mr-2" />Capturar</>}
                        </Button>
                        <Button variant="outline" onClick={stopProfileCamera} data-testid="button-cancel-profile-camera">Cancelar</Button>
                      </div>
                    </div>
                  ) : profilePhotoImage ? (
                    <div className="space-y-4">
                      <div className="relative mx-auto w-48 h-48 rounded-full overflow-hidden bg-muted">
                        <img src={profilePhotoImage} alt="Foto de perfil" className="w-full h-full object-cover" />
                        {isValidatingPhoto && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                              <p className="text-sm">Verificando foto...</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" onClick={resetProfilePhoto} className="w-full" data-testid="button-reset-profile-photo">
                        <RefreshCcw className="w-4 h-4 mr-2" />Tomar otra foto
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mx-auto w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                        <UserCircle className="w-16 h-16 text-muted-foreground" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={startProfileCamera} className="h-auto py-6 flex flex-col items-center gap-2" data-testid="button-use-profile-camera">
                          <Camera className="w-8 h-8" />
                          <span className="text-sm">Usar cámara</span>
                        </Button>
                        <Button variant="outline" onClick={() => profileFileInputRef.current?.click()} className="h-auto py-6 flex flex-col items-center gap-2" data-testid="button-upload-profile-file">
                          <Upload className="w-8 h-8" />
                          <span className="text-sm">Subir imagen</span>
                        </Button>
                      </div>
                      <input ref={profileFileInputRef} type="file" accept="image/*" onChange={handleProfileFileSelect} className="hidden" data-testid="input-file-profile" />
                      <p className="text-xs text-center text-muted-foreground">
                        Asegúrate de que tu rostro sea visible y esté bien iluminado
                      </p>
                    </div>
                  )}
                  <canvas ref={profileCanvasRef} className="hidden" />
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
