import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FileUpload } from '@/components/ui/file-upload';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ServiceCategoryMultiSelect } from '@/components/ServiceCategoryMultiSelect';
import { VehicleCategoryForm, type VehicleData } from '@/components/VehicleCategoryForm';
import { 
  Loader2, Mail, Lock, User, Phone, AlertCircle, FileText, Car, IdCard,
  CheckCircle2, ArrowRight, Clock, Upload, Truck, Camera, ScanLine, RefreshCcw,
  UserCircle, XCircle
} from 'lucide-react';
import logoUrl from '@assets/20251126_144937_0000_1764283370962.png';

type UserType = 'cliente' | 'conductor';

const PLACA_DOMINICANA_REGEX = /^[A-Z]{1,2}\d{4,6}$/;

interface ServiceSelection {
  categoria: string;
  subtipos: string[];
}

interface OnboardingData {
  email: string;
  password: string;
  userType: UserType;
  cedula: string;
  phone: string;
  otpCode: string;
  nombre: string;
  apellido: string;
  licencia: string;
  placaGrua: string;
  marcaGrua: string;
  modeloGrua: string;
}

type StepErrors = Record<string, string>;

const WIZARD_STORAGE_KEY = 'gruard_onboarding_wizard_state';
const TOTAL_STEPS = 8;

export default function OnboardingWizard() {
  const [location, setLocation] = useLocation();
  const { register, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    email: '', password: '', userType: 'cliente', cedula: '', phone: '',
    otpCode: '', nombre: '', apellido: '', licencia: '',
    placaGrua: '', marcaGrua: '', modeloGrua: '',
  });
  const [errors, setErrors] = useState<StepErrors>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [otpTimer, setOtpTimer] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);
  const [vehicleData, setVehicleData] = useState<VehicleData[]>([]);
  
  // OCR scanning state for operators
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cedulaVerified, setCedulaVerified] = useState(false);
  const [ocrScore, setOcrScore] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Profile photo verification state for operators
  const [profilePhotoImage, setProfilePhotoImage] = useState<string | null>(null);
  const [profilePhotoVerified, setProfilePhotoVerified] = useState(false);
  const [profilePhotoScore, setProfilePhotoScore] = useState<number | null>(null);
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);
  const [showProfileCamera, setShowProfileCamera] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const profileVideoRef = useRef<HTMLVideoElement>(null);
  const profileCanvasRef = useRef<HTMLCanvasElement>(null);
  const profileStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      if (currentStep === 1) {
        setCurrentStep(2);
        setCompletedSteps(new Set([1]));
      }
    }
  }, [user, authLoading, currentStep]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Define stopOCRCamera early
  const stopOCRCameraEarly = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Reset OCR state when user type changes
  useEffect(() => {
    setCedulaVerified(false);
    setOcrScore(null);
    setCapturedImage(null);
    setErrors({});
    stopOCRCameraEarly();
  }, [formData.userType]);

  // Advance to next step when cedula is verified for operators
  useEffect(() => {
    if (cedulaVerified && formData.userType === 'conductor' && currentStep === 2) {
      setCompletedSteps(prev => new Set(prev).add(2));
      setCurrentStep(3);
    }
  }, [cedulaVerified, formData.userType, currentStep]);

  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setCurrentStep(parsed.currentStep || 1);
        setFormData(parsed.formData || formData);
        setCompletedSteps(new Set(parsed.completedSteps || []));
        setSelectedServices(parsed.selectedServices || []);
        setVehicleData(parsed.vehicleData || []);
      }
    } catch (error) {
      console.error('Error restoring wizard state:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      const stateToSave = {
        currentStep, formData,
        completedSteps: Array.from(completedSteps),
        selectedServices,
        vehicleData,
      };
      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving wizard state:', error);
    }
  }, [currentStep, formData, completedSteps, selectedServices, vehicleData, isInitialized]);

  const updateField = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // OCR Helper functions for operators
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
          nombre: formData.nombre,
          apellido: formData.apellido
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al escanear la cédula');

      setOcrScore(data.confidenceScore || null);
      
      if (data.verified) {
        updateField('cedula', data.cedula);
        setCedulaVerified(true);
        toast({ title: 'Cédula verificada', description: `Verificación exitosa (${Math.round((data.confidenceScore || 0) * 100)}%)` });
        setCompletedSteps(prev => new Set(prev).add(2));
        setCurrentStep(3);
      } else if (data.success && data.manualVerificationRequired) {
        updateField('cedula', data.cedula || '');
        setCedulaVerified(true);
        toast({ 
          title: 'Cédula recibida', 
          description: 'Tu cédula será verificada manualmente por un administrador' 
        });
        setCompletedSteps(prev => new Set(prev).add(2));
        setCurrentStep(3);
      } else if (data.success && !data.verified) {
        updateField('cedula', data.cedula || '');
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

  const handleOCRFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const startOCRCamera = async () => {
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
      stopOCRCamera();
      setErrors({ cedula: 'No se pudo acceder a la cámara' });
    }
  };

  const stopOCRCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureOCRPhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(base64);
    stopOCRCamera();
    await scanCedulaImage(base64);
  };

  const resetOCRScan = () => {
    setCapturedImage(null);
    setErrors({});
    setCedulaVerified(false);
    setOcrScore(null);
    stopOCRCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        email: formData.email, password: formData.password,
        userType: formData.userType, nombre: formData.nombre,
        apellido: formData.apellido, phone: formData.phone,
      };
      return await register(data);
    },
    onSuccess: () => {
      toast({ title: '¡Cuenta creada!', description: 'Ahora verificaremos tu identidad' });
      setCompletedSteps(prev => new Set(prev).add(1));
      setCurrentStep(2);
    },
    onError: (error: any) => {
      setErrors({ general: error?.message || 'Error al crear la cuenta' });
      toast({ title: 'Error', description: error?.message, variant: 'destructive' });
    },
  });

  const verifyCedulaMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/identity/verify-cedula', { cedula: formData.cedula });
      if (!res.ok) throw new Error((await res.json()).message || 'Error al verificar cédula');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '¡Cédula verificada!', description: 'Tu cédula ha sido validada correctamente' });
      setCompletedSteps(prev => new Set(prev).add(2));
      setCurrentStep(3);
    },
    onError: (error: any) => {
      setErrors({ cedula: error?.message });
      toast({ title: 'Error', description: error?.message, variant: 'destructive' });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/identity/send-phone-otp', { phone: formData.phone });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: (data) => {
      setOtpTimer(data.expiresIn || 600);
      toast({ title: 'Código enviado', description: 'Revisa tu teléfono para el código' });
    },
    onError: (error: any) => {
      setErrors({ phone: error?.message });
      toast({ title: 'Error', description: error?.message, variant: 'destructive' });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/identity/verify-phone-otp',
        { phone: formData.phone, code: formData.otpCode });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '¡Teléfono verificado!', description: 'Tu número ha sido verificado' });
      setCompletedSteps(prev => new Set(prev).add(3));
      setCurrentStep(4);
    },
    onError: (error: any) => {
      setErrors({ otpCode: error?.message });
      toast({ title: 'Error', description: error?.message, variant: 'destructive' });
    },
  });

  const uploadDocsMutation = useMutation({
    mutationFn: async () => {
      if (!licenseFile && !insuranceFile && !licenseBackFile) {
        throw new Error('Debe cargar al menos un documento');
      }

      const filesUploaded = [];
      if (licenseFile) {
        const formDataLicense = new FormData();
        formDataLicense.append('document', licenseFile);
        formDataLicense.append('tipoDocumento', formData.userType === 'conductor' ? 'licencia' : 'seguro_cliente');
        const licRes = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formDataLicense,
        });
        if (!licRes.ok) throw new Error('Error al subir licencia (frente)');
        filesUploaded.push(licRes.json());
      }

      if (licenseBackFile && formData.userType === 'conductor') {
        const formDataLicenseBack = new FormData();
        formDataLicenseBack.append('document', licenseBackFile);
        formDataLicenseBack.append('tipoDocumento', 'licencia_trasera');
        const licBackRes = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formDataLicenseBack,
        });
        if (!licBackRes.ok) throw new Error('Error al subir licencia (reverso)');
        filesUploaded.push(licBackRes.json());
      }

      if (insuranceFile) {
        const formDataIns = new FormData();
        formDataIns.append('document', insuranceFile);
        formDataIns.append('tipoDocumento', formData.userType === 'conductor' ? 'poliza' : 'seguro_cliente');
        const insRes = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formDataIns,
        });
        if (!insRes.ok) throw new Error('Error al subir documento de seguro');
        filesUploaded.push(insRes.json());
      }

      return Promise.all(filesUploaded);
    },
    onSuccess: () => {
      toast({ title: '¡Documentos subidos!', description: 'Tus documentos han sido guardados' });
      setCompletedSteps(prev => new Set(prev).add(4));
      setCurrentStep(formData.userType === 'conductor' ? 5 : 8);
    },
    onError: (error: any) => {
      setErrors({ documents: error?.message });
      toast({ title: 'Error', description: error?.message, variant: 'destructive' });
    },
  });

  const saveServicesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', '/api/drivers/me/servicios', { categorias: selectedServices });
      if (!res.ok) throw new Error((await res.json()).message || 'Error al guardar servicios');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '¡Servicios guardados!', description: 'Tus categorías de servicio han sido registradas' });
      setCompletedSteps(prev => new Set(prev).add(6));
      setCurrentStep(7);
    },
    onError: (error: any) => {
      setErrors({ services: error?.message });
      toast({ title: 'Error', description: error?.message, variant: 'destructive' });
    },
  });

  const saveVehiclesMutation = useMutation({
    mutationFn: async () => {
      const promises = vehicleData.map(async (vehicle) => {
        const res = await apiRequest('POST', '/api/drivers/me/vehiculos', vehicle);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Error al guardar vehículo para ${vehicle.categoria}`);
        }
        return res.json();
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({ title: '¡Vehículos guardados!', description: 'Los datos de tus vehículos han sido registrados' });
      setCompletedSteps(prev => new Set(prev).add(7));
      setCurrentStep(8);
    },
    onError: (error: any) => {
      setErrors({ vehicles: error?.message });
      toast({ title: 'Error', description: error?.message, variant: 'destructive' });
    },
  });

  // Profile photo helper functions
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

      setProfilePhotoScore(data.score || null);
      
      if (data.verified) {
        setProfilePhotoVerified(true);
        toast({ title: 'Foto verificada', description: `Verificación exitosa (${Math.round((data.score || 0) * 100)}%)` });
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

  const captureProfilePhoto = async () => {
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
    setProfilePhotoVerified(false);
    setProfilePhotoScore(null);
    stopProfileCamera();
    if (profileFileInputRef.current) profileFileInputRef.current.value = '';
  };

  const finalizeProfileMutation = useMutation({
    mutationFn: async () => {
      const updateData: any = { nombre: formData.nombre, apellido: formData.apellido };
      if (formData.userType === 'conductor') {
        const firstVehicle = vehicleData[0];
        updateData.conductorData = {
          licencia: formData.licencia,
          placaGrua: firstVehicle?.placa || formData.placaGrua || '',
          marcaGrua: firstVehicle?.marca || formData.marcaGrua || '',
          modeloGrua: firstVehicle?.modelo || formData.modeloGrua || '',
        };
      }
      const res = await apiRequest('PATCH', '/api/users/me', updateData);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: async () => {
      const statusRes = await apiRequest('GET', '/api/identity/status');
      if (!statusRes.ok) {
        toast({ title: 'Error', description: 'No se pudo verificar identidad', variant: 'destructive' });
        return;
      }
      const status = await statusRes.json();
      // Either telefonoVerificado OR emailVerificado counts as contact verified
      const contactoVerificado = status.telefonoVerificado || status.emailVerificado;
      if (!status.cedulaVerificada || !contactoVerificado) {
        toast({ title: 'Verificación incompleta', description: 'Completa todas las verificaciones', variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      sessionStorage.removeItem(WIZARD_STORAGE_KEY);
      toast({ title: '¡Registro completado!', description: 'Bienvenido a Grúa RD' });
      const redirectPath = formData.userType === 'conductor' ? '/driver' : '/client';
      setTimeout(() => setLocation(redirectPath), 1500);
    },
    onError: (error: any) => {
      setErrors({ general: error?.message });
      toast({ title: 'Error', description: error?.message, variant: 'destructive' });
    },
  });

  const validateStep1 = (): boolean => {
    const newErrors: StepErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Correo requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Correo inválido';
    if (!formData.password) newErrors.password = 'Contraseña requerida';
    else if (formData.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre requerido';
    if (!formData.apellido.trim()) newErrors.apellido = 'Apellido requerido';
    if (!formData.phone.trim()) newErrors.phone = 'Teléfono requerido';
    else if (!/^\+?1?8\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) newErrors.phone = 'Teléfono inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    if (!formData.cedula.trim()) {
      setErrors({ cedula: 'Cédula requerida' });
      return false;
    }
    if (!/^\d{11}$/.test(formData.cedula.replace(/\D/g, ''))) {
      setErrors({ cedula: 'La cédula debe tener 11 dígitos' });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep4 = (): boolean => {
    const newErrors: StepErrors = {};
    if (formData.userType === 'conductor') {
      if (!licenseFile) {
        newErrors.licenseFile = 'La licencia (frente) es obligatoria';
      }
      if (!licenseBackFile) {
        newErrors.licenseBackFile = 'La licencia (reverso) es obligatoria';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep5 = (): boolean => {
    if (!profilePhotoVerified) {
      setErrors({ profilePhoto: 'Debes verificar tu foto de perfil' });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep6 = (): boolean => {
    if (selectedServices.length === 0) {
      setErrors({ services: 'Debes seleccionar al menos una categoría de servicio' });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep7 = (): boolean => {
    const newErrors: StepErrors = {};
    const selectedCategories = selectedServices.map(s => s.categoria);
    
    for (const categoria of selectedCategories) {
      const vehicle = vehicleData.find(v => v.categoria === categoria);
      if (!vehicle || !vehicle.placa || !vehicle.color || !vehicle.modelo) {
        newErrors[`vehicle_${categoria}`] = 'Placa, color y modelo son requeridos';
      } else if (!PLACA_DOMINICANA_REGEX.test(vehicle.placa.toUpperCase().trim())) {
        newErrors[`vehicle_${categoria}`] = 'Formato de placa inválido. Ej: A123456';
      }
    }
    
    if (!formData.licencia.trim()) newErrors.licencia = 'Número de licencia requerido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getProgressValue = () => (currentStep / TOTAL_STEPS) * 100;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const renderStep1 = () => (
    <div className="space-y-4">
      {errors.general && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{errors.general}</AlertDescription></Alert>)}
      <div className="space-y-2">
        <Label htmlFor="userType">Tipo de Usuario</Label>
        <Select value={formData.userType} onValueChange={(value) => updateField('userType', value)} disabled={registerMutation.isPending}>
          <SelectTrigger id="userType" data-testid="select-user-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="conductor">Operador</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" placeholder="Tu nombre" value={formData.nombre} onChange={(e) => updateField('nombre', e.target.value)} disabled={registerMutation.isPending} data-testid="input-nombre-step1" />
        {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="apellido">Apellido</Label>
        <Input id="apellido" placeholder="Tu apellido" value={formData.apellido} onChange={(e) => updateField('apellido', e.target.value)} disabled={registerMutation.isPending} data-testid="input-apellido-step1" />
        {errors.apellido && <p className="text-sm text-destructive">{errors.apellido}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input id="email" type="email" placeholder="tu@email.com" value={formData.email} onChange={(e) => updateField('email', e.target.value)} disabled={registerMutation.isPending} data-testid="input-email" />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={formData.password} onChange={(e) => updateField('password', e.target.value)} disabled={registerMutation.isPending} data-testid="input-password" />
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" type="tel" placeholder="+1 809 555 0100" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} disabled={registerMutation.isPending} data-testid="input-phone-step1" />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
      </div>
      <Button type="button" className="w-full" onClick={() => validateStep1() && registerMutation.mutate()} disabled={registerMutation.isPending} data-testid="button-continue-step1">
        {registerMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</>) : (<>Continuar<ArrowRight className="w-4 h-4 ml-2" /></>)}
      </Button>
    </div>
  );

  const renderStep2 = () => {
    // For operators, use OCR scanning with name verification
    if (formData.userType === 'conductor') {
      return (
        <div className="space-y-4">
          {errors.cedula && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.cedula}</AlertDescription>
            </Alert>
          )}

          {cedulaVerified ? (
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Cédula Verificada</h3>
                <p className="text-sm text-muted-foreground mt-1">Cédula: {formData.cedula}</p>
                {ocrScore && <p className="text-sm text-muted-foreground">Confianza: {Math.round(ocrScore * 100)}%</p>}
              </div>
              <Button variant="outline" size="sm" onClick={resetOCRScan} data-testid="button-rescan-cedula">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Escanear otra
              </Button>
            </div>
          ) : showCamera ? (
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
                <Button onClick={captureOCRPhoto} className="flex-1" disabled={isScanning} data-testid="button-capture-cedula">
                  {isScanning ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>) : (<><Camera className="w-4 h-4 mr-2" />Capturar</>)}
                </Button>
                <Button variant="outline" onClick={stopOCRCamera} data-testid="button-cancel-camera">Cancelar</Button>
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
              <Button variant="outline" onClick={resetOCRScan} className="w-full" data-testid="button-reset-scan">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Tomar otra foto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-2">
                <IdCard className="w-12 h-12 mx-auto text-primary mb-2" />
                <p className="text-sm font-medium">Escanea tu cédula de identidad</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tu nombre debe coincidir con el registrado: <strong>{formData.nombre} {formData.apellido}</strong>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={startOCRCamera} className="h-auto py-6 flex flex-col items-center gap-2" data-testid="button-use-camera">
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">Usar cámara</span>
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-auto py-6 flex flex-col items-center gap-2" data-testid="button-upload-cedula">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm">Subir imagen</span>
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleOCRFileSelect} className="hidden" data-testid="input-file-cedula" />
              <p className="text-xs text-muted-foreground text-center">Coloca tu cédula sobre una superficie plana y bien iluminada. Se requiere un score de confianza mínimo de 60%.</p>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      );
    }

    // For clients, keep the simple text input
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cedula">Cédula de Identidad</Label>
          <Input id="cedula" placeholder="000-0000000-0" maxLength={13} value={formData.cedula} onChange={(e) => updateField('cedula', e.target.value.replace(/\D/g, ''))} disabled={verifyCedulaMutation.isPending} data-testid="input-cedula" />
          {errors.cedula && <p className="text-sm text-destructive">{errors.cedula}</p>}
          <p className="text-sm text-muted-foreground">Cédula dominicana (11 dígitos)</p>
        </div>
        <Button type="button" className="w-full" onClick={() => validateStep2() && verifyCedulaMutation.mutate()} disabled={verifyCedulaMutation.isPending} data-testid="button-verify-cedula">
          {verifyCedulaMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</>) : (<>Verificar Cédula<ArrowRight className="w-4 h-4 ml-2" /></>)}
        </Button>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Número de Teléfono</Label>
        <Input id="phone" type="tel" placeholder="+1 809 555 0100" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} disabled={sendOtpMutation.isPending} data-testid="input-phone" />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
      </div>
      {otpTimer === 0 ? (
        <Button type="button" variant="outline" className="w-full" onClick={sendOtpMutation.mutate} disabled={sendOtpMutation.isPending} data-testid="button-send-otp">
          {sendOtpMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>) : 'Enviar Código'}
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="otpCode">Código de Verificación</Label>
            <Input id="otpCode" placeholder="000000" maxLength={6} className="text-center text-2xl tracking-widest" value={formData.otpCode} onChange={(e) => updateField('otpCode', e.target.value.replace(/\D/g, ''))} disabled={verifyOtpMutation.isPending} data-testid="input-otp-code" />
            {errors.otpCode && <p className="text-sm text-destructive">{errors.otpCode}</p>}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Expira en: {formatTime(otpTimer)}</span>
          </div>
          <Button type="button" className="w-full" onClick={verifyOtpMutation.mutate} disabled={verifyOtpMutation.isPending || !formData.otpCode} data-testid="button-verify-otp">
            {verifyOtpMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</>) : (<>Verificar<ArrowRight className="w-4 h-4 ml-2" /></>)}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={sendOtpMutation.mutate} disabled={sendOtpMutation.isPending || otpTimer > 60} data-testid="button-resend-otp">
            {otpTimer > 60 ? (<><Clock className="w-4 h-4 mr-2" />Reenviar en {formatTime(otpTimer - 60)}</>) : 'Reenviar Código'}
          </Button>
        </>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      {errors.documents && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{errors.documents}</AlertDescription></Alert>)}
      {formData.userType === 'conductor' && (
        <>
          <FileUpload label="Licencia de Conducir (Frente)" required onFileSelect={setLicenseFile} fileName={licenseFile?.name} error={errors.licenseFile} testId="input-license-file" />
          <FileUpload label="Licencia de Conducir (Reverso)" required onFileSelect={setLicenseBackFile} fileName={licenseBackFile?.name} error={errors.licenseBackFile} testId="input-license-back-file" />
        </>
      )}
      <FileUpload label={formData.userType === 'conductor' ? 'Documento de Seguro de Grúa' : 'Documento de Seguro'} onFileSelect={setInsuranceFile} fileName={insuranceFile?.name} required={formData.userType === 'conductor'} testId="input-insurance-file" />
      <Button type="button" className="w-full" onClick={() => validateStep4() && uploadDocsMutation.mutate()} disabled={uploadingDocs || uploadDocsMutation.isPending} data-testid="button-upload-docs">
        {uploadDocsMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Subiendo...</>) : (<>Subir Documentos<Upload className="w-4 h-4 ml-2" /></>)}
      </Button>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      {errors.profilePhoto && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.profilePhoto}</AlertDescription>
        </Alert>
      )}

      {profilePhotoVerified ? (
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-green-500">
              {profilePhotoImage && (
                <img src={profilePhotoImage} alt="Foto de perfil" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Foto Verificada</h3>
            {profilePhotoScore && <p className="text-sm text-muted-foreground">Confianza: {Math.round(profilePhotoScore * 100)}%</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetProfilePhoto} data-testid="button-retake-photo">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Tomar otra
            </Button>
            <Button size="sm" onClick={() => { setCompletedSteps(prev => new Set(prev).add(5)); setCurrentStep(6); }} data-testid="button-continue-step5">
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      ) : showProfileCamera ? (
        <div className="space-y-4">
          <div className="relative aspect-square max-w-[280px] mx-auto bg-black rounded-full overflow-hidden">
            <video ref={profileVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-dashed border-white/50 rounded-full w-[80%] h-[80%]" />
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">Centra tu rostro en el círculo</p>
          <div className="flex gap-2">
            <Button onClick={captureProfilePhoto} className="flex-1" disabled={isValidatingPhoto} data-testid="button-capture-profile">
              {isValidatingPhoto ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>) : (<><Camera className="w-4 h-4 mr-2" />Capturar</>)}
            </Button>
            <Button variant="outline" onClick={stopProfileCamera} data-testid="button-cancel-profile-camera">Cancelar</Button>
          </div>
        </div>
      ) : profilePhotoImage ? (
        <div className="space-y-4">
          <div className="relative aspect-square max-w-[200px] mx-auto rounded-full overflow-hidden bg-muted">
            <img src={profilePhotoImage} alt="Foto capturada" className="w-full h-full object-cover" />
            {isValidatingPhoto && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Verificando foto...</p>
                </div>
              </div>
            )}
          </div>
          {!isValidatingPhoto && !profilePhotoVerified && (
            <Button variant="outline" onClick={resetProfilePhoto} className="w-full" data-testid="button-reset-profile-photo">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Tomar otra foto
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-2">
            <UserCircle className="w-16 h-16 mx-auto text-primary mb-2" />
            <p className="text-sm font-medium">Sube una foto de tu rostro</p>
            <p className="text-xs text-muted-foreground mt-1">
              Esta foto se usará como tu foto de perfil verificada
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={startProfileCamera} className="h-auto py-6 flex flex-col items-center gap-2" data-testid="button-use-profile-camera">
              <Camera className="w-8 h-8" />
              <span className="text-sm">Usar cámara</span>
            </Button>
            <Button variant="outline" onClick={() => profileFileInputRef.current?.click()} className="h-auto py-6 flex flex-col items-center gap-2" data-testid="button-upload-profile-photo">
              <Upload className="w-8 h-8" />
              <span className="text-sm">Subir imagen</span>
            </Button>
          </div>
          <input ref={profileFileInputRef} type="file" accept="image/*" onChange={handleProfileFileSelect} className="hidden" data-testid="input-file-profile-photo" />
          <p className="text-xs text-muted-foreground text-center">Asegúrate de tener buena iluminación y que tu rostro sea claramente visible.</p>
        </div>
      )}
      <canvas ref={profileCanvasRef} className="hidden" />
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-4">
      {errors.services && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.services}</AlertDescription>
        </Alert>
      )}
      <div className="text-center mb-4">
        <Truck className="w-12 h-12 mx-auto text-primary mb-2" />
        <p className="text-sm text-muted-foreground">
          Selecciona las categorías de servicios que puedes ofrecer. Puedes elegir múltiples categorías y subtipos específicos.
        </p>
      </div>
      <div className="max-h-[400px] overflow-y-auto pr-2">
        <ServiceCategoryMultiSelect
          value={selectedServices}
          onChange={setSelectedServices}
          disabled={saveServicesMutation.isPending}
        />
      </div>
      <Button 
        type="button" 
        className="w-full" 
        onClick={() => validateStep6() && saveServicesMutation.mutate()} 
        disabled={saveServicesMutation.isPending || selectedServices.length === 0} 
        data-testid="button-save-services"
      >
        {saveServicesMutation.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
        ) : (
          <>Continuar<ArrowRight className="w-4 h-4 ml-2" /></>
        )}
      </Button>
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-4">
      {errors.vehicles && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.vehicles}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="licencia">Número de Licencia *</Label>
        <Input 
          id="licencia" 
          placeholder="Licencia de conducir" 
          value={formData.licencia} 
          onChange={(e) => updateField('licencia', e.target.value)} 
          disabled={saveVehiclesMutation.isPending} 
          data-testid="input-licencia" 
        />
        {errors.licencia && <p className="text-sm text-destructive">{errors.licencia}</p>}
      </div>

      <div className="max-h-[350px] overflow-y-auto pr-1">
        <VehicleCategoryForm
          selectedCategories={selectedServices.map(s => s.categoria)}
          vehicles={vehicleData}
          onChange={setVehicleData}
          disabled={saveVehiclesMutation.isPending}
          errors={errors}
        />
      </div>

      <Button 
        type="button" 
        className="w-full" 
        onClick={() => validateStep7() && saveVehiclesMutation.mutate()} 
        disabled={saveVehiclesMutation.isPending} 
        data-testid="button-save-vehicles"
      >
        {saveVehiclesMutation.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
        ) : (
          <>Continuar<ArrowRight className="w-4 h-4 ml-2" /></>
        )}
      </Button>
    </div>
  );

  const renderStep8 = () => (
    <div className="space-y-4">
      <div className="text-center py-8">
        <CheckCircle2 className="w-16 h-16 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">¡Listo para finalizar!</h3>
        <p className="text-sm text-muted-foreground mb-6">Haz clic para completar tu registro</p>
      </div>
      <Button type="button" className="w-full" onClick={() => finalizeProfileMutation.mutate()} disabled={finalizeProfileMutation.isPending} data-testid="button-complete-registration">
        {finalizeProfileMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Completando...</>) : (<><CheckCircle2 className="w-4 h-4 mr-2" />Completar Registro</>)}
      </Button>
    </div>
  );

  const getStepTitle = () => {
    const titles = ['Crea tu Cuenta', 'Verificación de Cédula', 'Verificación de Teléfono', 'Subir Documentos', 'Foto de Perfil', 'Servicios Ofrecidos', 'Vehículos por Categoría', 'Confirmación'];
    return titles[currentStep - 1] || '';
  };

  const getStepDescription = () => {
    const descs = [
      'Ingresa tus datos personales',
      formData.userType === 'conductor' 
        ? 'Escanea tu cédula para verificar que tu nombre coincide'
        : 'Valida tu identidad con cédula',
      'Verifica tu número de teléfono',
      'Sube tus documentos requeridos',
      'Sube una foto de tu rostro para tu perfil verificado',
      'Selecciona los servicios que ofreces',
      'Configura un vehículo para cada categoría',
      'Finaliza tu registro',
    ];
    return descs[currentStep - 1] || '';
  };

  if (!isInitialized) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src={logoUrl} alt="Grúa RD Logo" className="w-32 h-32 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">{getStepTitle()}</CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Paso {currentStep} de {TOTAL_STEPS}</span>
              <span>{Math.round(getProgressValue())}%</span>
            </div>
            <Progress value={getProgressValue()} data-testid="progress-wizard" />
          </div>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
          {currentStep === 7 && renderStep7()}
          {currentStep === 8 && renderStep8()}
          <div className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <button onClick={() => setLocation('/login')} className="text-primary hover:underline" data-testid="link-login">
              Inicia sesión
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
