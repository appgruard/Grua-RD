import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, AlertCircle, User, Truck, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import logoUrl from '@assets/20251126_144937_0000_1764283370962.png';

interface AccountOption {
  id: string;
  userType: 'cliente' | 'conductor';
  nombre: string;
  apellido: string | null;
  fotoUrl: string | null;
}

type LoginStep = 'credentials' | 'select-account';

export default function Login() {
  const [location, setLocation] = useLocation();
  const { login, checkAccounts, user, isLoading, pendingVerification } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  useEffect(() => {
    if (pendingVerification) {
      setLocation('/verify-pending');
      return;
    }
    
    if (user && !isLoading) {
      if (user.userType === 'conductor') {
        const emailVerificado = (user as any).emailVerificado;
        const needsVerification = !user.cedulaVerificada || !emailVerificado || !user.fotoVerificada;
        if (needsVerification) {
          setLocation('/verify-pending');
          return;
        }
        setLocation('/driver');
      } else if (user.userType === 'admin') {
        setLocation('/admin');
      } else if (user.userType === 'aseguradora') {
        setLocation('/aseguradora');
      } else if (user.userType === 'socio') {
        setLocation('/socio');
      } else if (user.userType === 'empresa') {
        setLocation('/empresa');
      } else {
        // Check if client needs verification (cedula and email)
        const emailVerificado = (user as any).emailVerificado;
        const needsVerification = !user.cedulaVerificada || !emailVerificado;
        if (needsVerification) {
          setLocation('/verify-pending');
          return;
        }
        setLocation('/client');
      }
    }
  }, [user, isLoading, setLocation, pendingVerification]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }
    
    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const result = await checkAccounts(email, password);
      
      if (result.requiresDisambiguation && result.accounts.length > 1) {
        setAccounts(result.accounts);
        setStep('select-account');
        setLoading(false);
        return;
      }
      
      await performLogin();
    } catch (error: any) {
      const errorMessage = error?.message || 'Credenciales inválidas';
      setErrors({ general: errorMessage });
      toast({
        title: 'Error al iniciar sesión',
        description: errorMessage,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const performLogin = async (userType?: string) => {
    setLoading(true);
    try {
      const loggedInUser = await login(email, password, userType ? { userType } : undefined);
      
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión exitosamente',
      });
      
      if (loggedInUser.userType === 'admin') {
        setLocation('/admin');
      } else if (loggedInUser.userType === 'conductor') {
        setLocation('/driver');
      } else if (loggedInUser.userType === 'aseguradora') {
        setLocation('/aseguradora');
      } else if (loggedInUser.userType === 'socio') {
        setLocation('/socio');
      } else if (loggedInUser.userType === 'empresa') {
        setLocation('/empresa');
      } else {
        setLocation('/client');
      }
    } catch (error: any) {
      if (error?.requiresVerification) {
        // Don't redirect here - let the useEffect handle it
        // This ensures pendingVerification state is properly set before navigation
        setLoading(false);
        return;
      }
      
      const errorMessage = error?.message || 'Credenciales inválidas';
      setErrors({ general: errorMessage });
      toast({
        title: 'Error al iniciar sesión',
        description: errorMessage,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleAccountSelect = async (userType: 'cliente' | 'conductor') => {
    await performLogin(userType);
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setAccounts([]);
    setErrors({});
  };

  const getAccountTypeLabel = (userType: 'cliente' | 'conductor') => {
    return userType === 'conductor' ? 'Operador' : 'Cliente';
  };

  const getAccountTypeDescription = (userType: 'cliente' | 'conductor') => {
    return userType === 'conductor' 
      ? 'Gestiona y acepta servicios de grúa' 
      : 'Solicita servicios de grúa';
  };

  if (step === 'select-account') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <img 
                    src={logoUrl} 
                    alt="Grúa RD Logo" 
                    className="w-24 h-24 object-contain"
                  />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Selecciona tu cuenta</h1>
              <p className="text-muted-foreground mt-2">
                Tienes múltiples cuentas con este correo
              </p>
            </div>

            <div className="space-y-4">
              {accounts.map((account) => (
                <Card
                  key={account.userType}
                  className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                  onClick={() => !loading && handleAccountSelect(account.userType)}
                  data-testid={`button-select-${account.userType}`}
                >
                  <button
                    type="button"
                    disabled={loading}
                    className="w-full p-4 text-left flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {account.userType === 'conductor' ? (
                        <Truck className="w-7 h-7 text-primary" />
                      ) : (
                        <User className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg text-foreground">
                        {getAccountTypeLabel(account.userType)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {getAccountTypeDescription(account.userType)}
                      </p>
                    </div>
                    {loading && (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                  </button>
                </Card>
              ))}
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBackToCredentials}
                disabled={loading}
                data-testid="button-back-to-credentials"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img 
                  src={logoUrl} 
                  alt="Grúa RD Logo" 
                  className="w-24 h-24 object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Bienvenido de vuelta</h1>
            <p className="text-muted-foreground mt-2">
              Ingresa tus credenciales para continuar
            </p>
          </div>
          
          <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  className={`pl-10 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors({ ...errors, email: undefined });
                  }}
                  disabled={loading}
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
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className={`pl-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors({ ...errors, password: undefined });
                  }}
                  disabled={loading}
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
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Continuar'
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">o</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              onClick={() => setLocation('/onboarding')}
              data-testid="link-register"
            >
              Crear cuenta nueva
            </Button>
            
            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setLocation('/forgot-password')}
              data-testid="link-forgot-password"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          </div>
        </div>
      </div>
      
      <footer className="py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Al continuar, aceptas nuestra{' '}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
            onClick={() => setLocation('/privacy-policy')}
            data-testid="link-privacy-policy"
          >
            Política de Privacidad
          </button>
        </p>
      </footer>
    </div>
  );
}
