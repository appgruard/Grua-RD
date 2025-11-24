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
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  AlertCircle, 
  FileText, 
  Car, 
  IdCard,
  CheckCircle2,
  ArrowRight,
  Clock
} from 'lucide-react';
import logoUrl from '@assets/Grúa_20251124_024218_0000_1763966543810.png';

type UserType = 'cliente' | 'conductor';

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

export default function OnboardingWizard() {
  const [location, setLocation] = useLocation();
  const { register, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    email: '',
    password: '',
    userType: 'cliente',
    cedula: '',
    phone: '',
    otpCode: '',
    nombre: '',
    apellido: '',
    licencia: '',
    placaGrua: '',
    marcaGrua: '',
    modeloGrua: '',
  });
  const [errors, setErrors] = useState<StepErrors>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [otpTimer, setOtpTimer] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

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
        currentStep,
        formData,
        completedSteps: Array.from(completedSteps),
      };
      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving wizard state:', error);
    }
  }, [currentStep, formData, completedSteps, isInitialized]);

  const updateField = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        email: formData.email,
        password: formData.password,
        userType: formData.userType,
        nombre: formData.nombre,
        apellido: formData.apellido,
        phone: formData.phone,
      };
      return await register(data);
    },
    onSuccess: () => {
      toast({
        title: '¡Cuenta creada!',
        description: 'Ahora verificaremos tu identidad',
      });
      setCompletedSteps(prev => new Set(prev).add(1));
      setCurrentStep(2);
    },
    onError: (error: any) => {
      const message = error?.message || 'Error al crear la cuenta';
      setErrors({ general: message });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const verifyCedulaMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/identity/verify-cedula', {
        cedula: formData.cedula,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al verificar cédula');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: '¡Cédula verificada!',
        description: 'Tu cédula ha sido validada correctamente',
      });
      setCompletedSteps(prev => new Set(prev).add(2));
      setCurrentStep(3);
    },
    onError: (error: any) => {
      const message = error?.message || 'Error al verificar cédula';
      setErrors({ cedula: message });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/identity/send-phone-otp', {
        phone: formData.phone,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al enviar código');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setOtpTimer(data.expiresIn || 600);
      toast({
        title: 'Código enviado',
        description: 'Revisa tu teléfono para el código de verificación',
      });
    },
    onError: (error: any) => {
      const message = error?.message || 'Error al enviar código';
      setErrors({ phone: message });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/identity/verify-phone-otp', {
        phone: formData.phone,
        code: formData.otpCode,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al verificar código');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: '¡Teléfono verificado!',
        description: 'Tu número ha sido verificado correctamente',
      });
      setCompletedSteps(prev => new Set(prev).add(3));
      setCurrentStep(4);
    },
    onError: (error: any) => {
      const message = error?.message || 'Código incorrecto';
      setErrors({ otpCode: message });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const finalizeProfileMutation = useMutation({
    mutationFn: async () => {
      const updateData: any = {
        nombre: formData.nombre,
        apellido: formData.apellido,
      };

      if (formData.userType === 'conductor') {
        updateData.conductorData = {
          licencia: formData.licencia,
          placaGrua: formData.placaGrua,
          marcaGrua: formData.marcaGrua,
          modeloGrua: formData.modeloGrua,
        };
      }

      const res = await apiRequest('PATCH', '/api/users/me', updateData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al actualizar perfil');
      }
      return res.json();
    },
    onSuccess: async () => {
      const statusRes = await apiRequest('GET', '/api/identity/status');
      if (!statusRes.ok) {
        toast({
          title: 'Error',
          description: 'No se pudo verificar el estado de identidad',
          variant: 'destructive',
        });
        return;
      }

      const status = await statusRes.json();
      
      if (!status.cedulaVerificada || !status.telefonoVerificado) {
        toast({
          title: 'Verificación incompleta',
          description: 'Asegúrate de completar todas las verificaciones',
          variant: 'destructive',
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      sessionStorage.removeItem(WIZARD_STORAGE_KEY);

      toast({
        title: '¡Registro completado!',
        description: 'Bienvenido a GruaRD',
      });
      
      const redirectPath = formData.userType === 'conductor' ? '/driver' : '/client';
      setTimeout(() => setLocation(redirectPath), 1500);
    },
    onError: (error: any) => {
      const message = error?.message || 'Error al completar registro';
      setErrors({ general: message });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const validateStep1 = (): boolean => {
    const newErrors: StepErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.apellido.trim()) {
      newErrors.apellido = 'El apellido es requerido';
    } else if (formData.apellido.trim().length < 2) {
      newErrors.apellido = 'El apellido debe tener al menos 2 caracteres';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^\+?1?8\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = 'Formato de teléfono inválido (use +1809XXXXXXX)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: StepErrors = {};

    if (!formData.cedula.trim()) {
      newErrors.cedula = 'La cédula es requerida';
    } else if (!/^\d{11}$/.test(formData.cedula.replace(/\D/g, ''))) {
      newErrors.cedula = 'La cédula debe tener 11 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: StepErrors = {};

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^\+?1?8\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = 'Formato de teléfono inválido (use +1809XXXXXXX)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = (): boolean => {
    const newErrors: StepErrors = {};

    if (formData.userType === 'conductor') {
      if (!formData.licencia.trim()) {
        newErrors.licencia = 'El número de licencia es requerido';
      }
      if (!formData.placaGrua.trim()) {
        newErrors.placaGrua = 'La placa de la grúa es requerida';
      }
      if (!formData.marcaGrua.trim()) {
        newErrors.marcaGrua = 'La marca de la grúa es requerida';
      }
      if (!formData.modeloGrua.trim()) {
        newErrors.modeloGrua = 'El modelo de la grúa es requerido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Submit = async () => {
    if (!validateStep1()) return;
    registerMutation.mutate();
  };

  const handleStep2Submit = async () => {
    if (!validateStep2()) return;
    verifyCedulaMutation.mutate();
  };

  const handleSendOtp = async () => {
    if (!formData.phone.trim()) {
      setErrors({ phone: 'El teléfono es requerido' });
      toast({
        title: 'Error',
        description: 'Debes ingresar un número de teléfono',
        variant: 'destructive',
      });
      return;
    }
    if (!validateStep3()) return;
    sendOtpMutation.mutate();
  };

  const handleStep3Submit = async () => {
    if (!formData.otpCode.trim()) {
      setErrors({ otpCode: 'El código es requerido' });
      return;
    }
    verifyOtpMutation.mutate();
  };

  const handleStep4Submit = async () => {
    if (!validateStep4()) return;
    finalizeProfileMutation.mutate();
  };

  const getProgressValue = () => {
    return (currentStep / 4) * 100;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="userType">Tipo de Usuario</Label>
        <Select
          value={formData.userType}
          onValueChange={(value) => updateField('userType', value)}
          disabled={registerMutation.isPending}
        >
          <SelectTrigger id="userType" data-testid="select-user-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="conductor">Conductor de Grúa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="nombre"
            placeholder="Tu nombre"
            className={`pl-9 ${errors.nombre ? 'border-destructive' : ''}`}
            value={formData.nombre}
            onChange={(e) => updateField('nombre', e.target.value)}
            disabled={registerMutation.isPending}
            data-testid="input-nombre-step1"
          />
        </div>
        {errors.nombre && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.nombre}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="apellido">Apellido</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="apellido"
            placeholder="Tu apellido"
            className={`pl-9 ${errors.apellido ? 'border-destructive' : ''}`}
            value={formData.apellido}
            onChange={(e) => updateField('apellido', e.target.value)}
            disabled={registerMutation.isPending}
            data-testid="input-apellido-step1"
          />
        </div>
        {errors.apellido && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.apellido}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Número de Teléfono</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="+1 809 555 0100"
            className={`pl-9 ${errors.phone ? 'border-destructive' : ''}`}
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            disabled={registerMutation.isPending}
            data-testid="input-phone-step1"
          />
        </div>
        {errors.phone && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.phone}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            className={`pl-9 ${errors.email ? 'border-destructive' : ''}`}
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            disabled={registerMutation.isPending}
            data-testid="input-email"
          />
        </div>
        {errors.email && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            className={`pl-9 ${errors.password ? 'border-destructive' : ''}`}
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            disabled={registerMutation.isPending}
            data-testid="input-password"
          />
        </div>
        {errors.password && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.password}
          </p>
        )}
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={handleStep1Submit}
        disabled={registerMutation.isPending}
        data-testid="button-continue-step1"
      >
        {registerMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creando cuenta...
          </>
        ) : (
          <>
            Continuar
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="cedula">Cédula de Identidad</Label>
        <div className="relative">
          <IdCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="cedula"
            placeholder="000-0000000-0"
            maxLength={13}
            className={`pl-9 ${errors.cedula ? 'border-destructive' : ''}`}
            value={formData.cedula}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              updateField('cedula', value);
            }}
            disabled={verifyCedulaMutation.isPending}
            data-testid="input-cedula"
          />
        </div>
        {errors.cedula && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.cedula}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Ingresa tu cédula dominicana (11 dígitos)
        </p>
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={handleStep2Submit}
        disabled={verifyCedulaMutation.isPending}
        data-testid="button-verify-cedula"
      >
        {verifyCedulaMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verificando...
          </>
        ) : (
          <>
            Verificar Cédula
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="phone">Número de Teléfono</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="+1 809 555 0100"
            className={`pl-9 ${errors.phone ? 'border-destructive' : ''}`}
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            disabled={sendOtpMutation.isPending}
            data-testid="input-phone"
          />
        </div>
        {errors.phone && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.phone}
          </p>
        )}
      </div>

      {otpTimer === 0 ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleSendOtp}
          disabled={sendOtpMutation.isPending}
          data-testid="button-send-otp"
        >
          {sendOtpMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando código...
            </>
          ) : (
            'Enviar Código de Verificación'
          )}
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="otpCode">Código de Verificación</Label>
            <Input
              id="otpCode"
              placeholder="000000"
              maxLength={6}
              className={`text-center text-2xl tracking-widest ${
                errors.otpCode ? 'border-destructive' : ''
              }`}
              value={formData.otpCode}
              onChange={(e) => updateField('otpCode', e.target.value.replace(/\D/g, ''))}
              disabled={verifyOtpMutation.isPending}
              data-testid="input-otp-code"
            />
            {errors.otpCode && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.otpCode}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Código expira en: {formatTime(otpTimer)}</span>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={handleStep3Submit}
            disabled={verifyOtpMutation.isPending || !formData.otpCode}
            data-testid="button-verify-otp"
          >
            {verifyOtpMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                Verificar Código
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleSendOtp}
            disabled={sendOtpMutation.isPending || otpTimer > 60}
            data-testid="button-resend-otp"
          >
            {sendOtpMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando código...
              </>
            ) : otpTimer > 60 ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Reenviar disponible en {formatTime(otpTimer - 60)}
              </>
            ) : (
              'Reenviar Código'
            )}
          </Button>
        </>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {formData.userType === 'conductor' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="licencia">Número de Licencia</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="licencia"
                placeholder="Número de licencia de conducir"
                className={`pl-9 ${errors.licencia ? 'border-destructive' : ''}`}
                value={formData.licencia}
                onChange={(e) => updateField('licencia', e.target.value)}
                disabled={finalizeProfileMutation.isPending}
                data-testid="input-licencia"
              />
            </div>
            {errors.licencia && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.licencia}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="placaGrua">Placa de la Grúa</Label>
            <div className="relative">
              <Car className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="placaGrua"
                placeholder="A123456"
                className={`pl-9 ${errors.placaGrua ? 'border-destructive' : ''}`}
                value={formData.placaGrua}
                onChange={(e) => updateField('placaGrua', e.target.value.toUpperCase())}
                disabled={finalizeProfileMutation.isPending}
                data-testid="input-placa-grua"
              />
            </div>
            {errors.placaGrua && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.placaGrua}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="marcaGrua">Marca de la Grúa</Label>
            <Input
              id="marcaGrua"
              placeholder="Ej: Ford, Chevrolet, etc."
              className={errors.marcaGrua ? 'border-destructive' : ''}
              value={formData.marcaGrua}
              onChange={(e) => updateField('marcaGrua', e.target.value)}
              disabled={finalizeProfileMutation.isPending}
              data-testid="input-marca-grua"
            />
            {errors.marcaGrua && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.marcaGrua}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modeloGrua">Modelo de la Grúa</Label>
            <Input
              id="modeloGrua"
              placeholder="Ej: F-450, Silverado 3500, etc."
              className={errors.modeloGrua ? 'border-destructive' : ''}
              value={formData.modeloGrua}
              onChange={(e) => updateField('modeloGrua', e.target.value)}
              disabled={finalizeProfileMutation.isPending}
              data-testid="input-modelo-grua"
            />
            {errors.modeloGrua && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.modeloGrua}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <CheckCircle2 className="w-16 h-16 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">¡Todo listo!</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Haz clic en el botón para completar tu registro
          </p>
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        onClick={handleStep4Submit}
        disabled={finalizeProfileMutation.isPending}
        data-testid="button-complete-registration"
      >
        {finalizeProfileMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Completando registro...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Completar Registro
          </>
        )}
      </Button>
    </div>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Crea tu Cuenta';
      case 2:
        return 'Verificación de Cédula';
      case 3:
        return 'Verificación de Teléfono';
      case 4:
        return formData.userType === 'conductor'
          ? 'Datos de la Grúa'
          : 'Confirmación';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return 'Ingresa tus datos personales y crea tu cuenta';
      case 2:
        return 'Valida tu identidad con tu cédula dominicana';
      case 3:
        return 'Verifica tu número de teléfono con un código SMS';
      case 4:
        return formData.userType === 'conductor' 
          ? 'Completa los datos de tu grúa'
          : 'Finaliza tu registro';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logoUrl} 
              alt="GruaRD Logo" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">{getStepTitle()}</CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Paso {currentStep} de 4</span>
              <span>{Math.round(getProgressValue())}%</span>
            </div>
            <Progress value={getProgressValue()} data-testid="progress-wizard" />
          </div>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          <div className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => setLocation('/login')}
              className="text-primary hover:underline"
              data-testid="link-login"
            >
              Inicia sesión
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
