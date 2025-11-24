import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import logoUrl from '@assets/Grúa_20251124_024218_0000_1763966543810.png';

export default function VerifyOTP() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [errors, setErrors] = useState<{ codigo?: string; general?: string }>({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [resending, setResending] = useState(false);

  const params = new URLSearchParams(location.split('?')[1]);
  const phone = params.get('phone') || '';
  const type = params.get('type') || 'registro';

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleResendOTP = async () => {
    setResending(true);
    try {
      const res = await apiRequest('POST', '/api/auth/send-otp', {
        telefono: phone,
        tipoOperacion: type,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al reenviar código');
      }

      toast({
        title: 'Código reenviado',
        description: 'Revisa tu teléfono para el nuevo código',
      });
      setTimeLeft(600);
      setCodigo('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo reenviar el código',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!codigo.trim()) {
      setErrors({ codigo: 'El código es requerido' });
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('POST', '/api/auth/verify-otp', {
        telefono: phone,
        codigo,
        tipoOperacion: type,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al verificar código');
      }

      toast({
        title: '¡Verificación exitosa!',
        description: 'Tu teléfono ha sido verificado correctamente',
      });

      setTimeout(() => {
        setLocation(type === 'registro' ? '/login' : '/login');
      }, 1500);
    } catch (error: any) {
      const errorMessage = error?.message || 'No se pudo verificar el código';
      setErrors({ general: errorMessage });
      toast({
        title: 'Error',
        description: errorMessage,
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
          <CardTitle className="text-2xl font-bold">Verificar Teléfono</CardTitle>
          <CardDescription>
            Ingresa el código enviado a {phone}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

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
                  setErrors({ ...errors, codigo: undefined });
                }}
                disabled={loading}
                data-testid="input-otp-codigo"
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

            <Button
              type="submit"
              className="w-full"
              disabled={loading || timeLeft <= 0}
              data-testid="button-verify-otp"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Código'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={resending || timeLeft > 60}
              onClick={handleResendOTP}
              data-testid="button-resend-otp"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reenviando...
                </>
              ) : (
                'Reenviar Código'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setLocation('/login')}
                data-testid="link-back-login"
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
