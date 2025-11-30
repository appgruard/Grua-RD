import { useState, useEffect } from 'react';
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
import { 
  Loader2, Mail, Lock, User, Phone, AlertCircle, FileText, Car, IdCard,
  CheckCircle2, ArrowRight, Clock, Upload, Truck
} from 'lucide-react';
import logoUrl from '@assets/20251126_144937_0000_1764283370962.png';

type UserType = 'cliente' | 'conductor';

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
const TOTAL_STEPS = 7;

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
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);

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

  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setCurrentStep(parsed.currentStep || 1);
        setFormData(parsed.formData || formData);
        setCompletedSteps(new Set(parsed.completedSteps || []));
        setSelectedServices(parsed.selectedServices || []);
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
      };
      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving wizard state:', error);
    }
  }, [currentStep, formData, completedSteps, selectedServices, isInitialized]);

  const updateField = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
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
      if (!licenseFile && !insuranceFile) {
        throw new Error('Debe cargar al menos un documento');
      }

      const filesUploaded = [];
      if (licenseFile) {
        const formDataLicense = new FormData();
        formDataLicense.append('document', licenseFile);
        formDataLicense.append('tipoDocumento', formData.userType === 'conductor' ? 'licencia_conducir' : 'seguro_cliente');
        const licRes = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formDataLicense,
        });
        if (!licRes.ok) throw new Error('Error al subir licencia');
        filesUploaded.push(licRes.json());
      }

      if (insuranceFile) {
        const formDataIns = new FormData();
        formDataIns.append('document', insuranceFile);
        formDataIns.append('tipoDocumento', formData.userType === 'conductor' ? 'seguro_grua' : 'seguro_cliente');
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
      setCurrentStep(formData.userType === 'conductor' ? 5 : 7);
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
      setCompletedSteps(prev => new Set(prev).add(5));
      setCurrentStep(6);
    },
    onError: (error: any) => {
      setErrors({ services: error?.message });
      toast({ title: 'Error', description: error?.message, variant: 'destructive' });
    },
  });

  const finalizeProfileMutation = useMutation({
    mutationFn: async () => {
      const updateData: any = { nombre: formData.nombre, apellido: formData.apellido };
      if (formData.userType === 'conductor') {
        updateData.conductorData = {
          licencia: formData.licencia, placaGrua: formData.placaGrua,
          marcaGrua: formData.marcaGrua, modeloGrua: formData.modeloGrua,
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
      if (!status.cedulaVerificada || !status.telefonoVerificado) {
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
    if (formData.userType === 'conductor' && !licenseFile) {
      setErrors({ licenseFile: 'La licencia es obligatoria' });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep5 = (): boolean => {
    if (selectedServices.length === 0) {
      setErrors({ services: 'Debes seleccionar al menos una categoría de servicio' });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep6 = (): boolean => {
    const newErrors: StepErrors = {};
    if (!formData.licencia.trim()) newErrors.licencia = 'Número de licencia requerido';
    if (!formData.placaGrua.trim()) newErrors.placaGrua = 'Placa de la grúa requerida';
    if (!formData.marcaGrua.trim()) newErrors.marcaGrua = 'Marca de la grúa requerida';
    if (!formData.modeloGrua.trim()) newErrors.modeloGrua = 'Modelo de la grúa requerido';
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

  const renderStep2 = () => (
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
        <FileUpload label="Licencia de Conducir" required onFileSelect={setLicenseFile} fileName={licenseFile?.name} error={errors.licenseFile} testId="input-license-file" />
      )}
      <FileUpload label={formData.userType === 'conductor' ? 'Documento de Seguro de Grúa' : 'Documento de Seguro'} onFileSelect={setInsuranceFile} fileName={insuranceFile?.name} required={formData.userType === 'conductor'} testId="input-insurance-file" />
      <Button type="button" className="w-full" onClick={() => validateStep4() && uploadDocsMutation.mutate()} disabled={uploadingDocs || uploadDocsMutation.isPending} data-testid="button-upload-docs">
        {uploadDocsMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Subiendo...</>) : (<>Subir Documentos<Upload className="w-4 h-4 ml-2" /></>)}
      </Button>
    </div>
  );

  const renderStep5 = () => (
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
        onClick={() => validateStep5() && saveServicesMutation.mutate()} 
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

  const renderStep6 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="licencia">Número de Licencia</Label>
        <Input id="licencia" placeholder="Licencia de conducir" value={formData.licencia} onChange={(e) => updateField('licencia', e.target.value)} disabled={finalizeProfileMutation.isPending} data-testid="input-licencia" />
        {errors.licencia && <p className="text-sm text-destructive">{errors.licencia}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="placaGrua">Placa de la Grúa</Label>
        <Input id="placaGrua" placeholder="A123456" value={formData.placaGrua} onChange={(e) => updateField('placaGrua', e.target.value.toUpperCase())} disabled={finalizeProfileMutation.isPending} data-testid="input-placa-grua" />
        {errors.placaGrua && <p className="text-sm text-destructive">{errors.placaGrua}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="marcaGrua">Marca de la Grúa</Label>
        <Input id="marcaGrua" placeholder="Ej: Ford" value={formData.marcaGrua} onChange={(e) => updateField('marcaGrua', e.target.value)} disabled={finalizeProfileMutation.isPending} data-testid="input-marca-grua" />
        {errors.marcaGrua && <p className="text-sm text-destructive">{errors.marcaGrua}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="modeloGrua">Modelo de la Grúa</Label>
        <Input id="modeloGrua" placeholder="Ej: F-450" value={formData.modeloGrua} onChange={(e) => updateField('modeloGrua', e.target.value)} disabled={finalizeProfileMutation.isPending} data-testid="input-modelo-grua" />
        {errors.modeloGrua && <p className="text-sm text-destructive">{errors.modeloGrua}</p>}
      </div>
      <Button type="button" className="w-full" onClick={() => validateStep6() && setCurrentStep(7)} disabled={finalizeProfileMutation.isPending} data-testid="button-continue-step6">
        Continuar
      </Button>
    </div>
  );

  const renderStep7 = () => (
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
    const titles = ['Crea tu Cuenta', 'Verificación de Cédula', 'Verificación de Teléfono', 'Subir Documentos', 'Servicios Ofrecidos', 'Datos de la Grúa', 'Confirmación'];
    return titles[currentStep - 1] || '';
  };

  const getStepDescription = () => {
    const descs = [
      'Ingresa tus datos personales',
      'Valida tu identidad con cédula',
      'Verifica tu número de teléfono',
      'Sube tus documentos requeridos',
      'Selecciona los servicios que ofreces',
      'Completa los datos de tu grúa',
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
