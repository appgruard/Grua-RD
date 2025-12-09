import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Clock, Phone, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import logoUrl from '@assets/20251126_144937_0000_1764283370962.png';

type Step = 'phone' | 'otp' | 'password';

export default function ForgotPassword() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!phone.trim() || !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      setErrors({ phone: 'Ingresa un número de teléfono válido (10 dígitos)' });
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('POST', '/api/auth/forgot-password', {
        telefono: phone,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al solicitar código');
      }

      toast({
        title: 'Código enviado',
        description: 'Revisa tu teléfono para el código de recuperación',
      });

      setStep('otp');
      setTimeLeft(600);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo solicitar el código',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!codigo.trim()) {
      setErrors({ codigo: 'El código es requerido' });
      return;
    }

    setStep('password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};

    if (!nuevaPassword) {
      newErrors.nuevaPassword = 'La contraseña es requerida';
    } else if (nuevaPassword.length < 6) {
      newErrors.nuevaPassword = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (nuevaPassword !== confirmarPassword) {
      newErrors.confirmarPassword = 'Las contraseñas no coinciden';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('POST', '/api/auth/reset-password', {
        telefono: phone,
        codigo,
        nuevaPassword,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al resetear contraseña');
      }

      toast({
        title: '¡Contraseña actualizada!',
        description: 'Tu contraseña ha sido cambiada correctamente',
      });

      setTimeout(() => {
        setLocation('/login');
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la contraseña',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logoUrl} 
              alt="Grúa RD Logo" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Recuperar Contraseña</CardTitle>
          <CardDescription>
            {step === 'phone' && 'Ingresa tu teléfono'}
            {step === 'otp' && 'Verifica el código enviado'}
            {step === 'password' && 'Crea una nueva contraseña'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              {errors.general && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Número de Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="809-555-1234"
                    className={`pl-10 ${
                      errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors({ ...errors, phone: '' });
                    }}
                    disabled={loading}
                    data-testid="input-forgot-phone"
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-request-code">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Solicitar Código'
                )}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código de Verificación</Label>
                <Input
                  id="codigo"
                  placeholder="000000"
                  maxLength={6}
                  className={`text-center text-2xl tracking-widest ${
                    errors.codigo ? 'border-destructive focus-visible:ring-destructive' : ''
                  }`}
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value.replace(/\D/g, ''));
                    setErrors({ ...errors, codigo: '' });
                  }}
                  disabled={loading}
                  data-testid="input-forgot-otp"
                />
                {errors.codigo && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.codigo}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Código expira en: {formatTime(timeLeft)}</span>
              </div>

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-verify-forgot-otp">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar Código'
                )}
              </Button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nuevaPassword">Nueva Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nuevaPassword"
                    type="password"
                    placeholder="••••••••"
                    className={`pl-10 ${
                      errors.nuevaPassword ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                    value={nuevaPassword}
                    onChange={(e) => {
                      setNuevaPassword(e.target.value);
                      setErrors({ ...errors, nuevaPassword: '' });
                    }}
                    disabled={loading}
                    data-testid="input-new-password"
                  />
                </div>
                {errors.nuevaPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.nuevaPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmarPassword"
                    type="password"
                    placeholder="••••••••"
                    className={`pl-10 ${
                      errors.confirmarPassword ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                    value={confirmarPassword}
                    onChange={(e) => {
                      setConfirmarPassword(e.target.value);
                      setErrors({ ...errors, confirmarPassword: '' });
                    }}
                    disabled={loading}
                    data-testid="input-confirm-password"
                  />
                </div>
                {errors.confirmarPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmarPassword}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-reset-password">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Actualizar Contraseña'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              <Button
                variant="ghost"
                className="p-0 h-auto"
                onClick={() => setLocation('/login')}
                data-testid="link-back-to-login"
              >
                Volver a iniciar sesión
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
