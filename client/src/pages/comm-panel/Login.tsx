import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCommPanelAuth } from '@/contexts/CommPanelAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Mail, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Por favor ingresa un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function CommPanelLogin() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated, isLoading: authLoading } = useCommPanelAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/admin/communications');
    }
  }, [isAuthenticated, setLocation]);

  const onSubmit = async (values: LoginFormValues) => {
    const result = await login(values.email, values.password);

    if (!result.success) {
      toast({
        title: 'Error de autenticación',
        description: result.error || 'No se pudo iniciar sesión. Intenta nuevamente.',
        variant: 'destructive',
      });
    } else {
      setLocation('/admin/communications');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          {/* Branding */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Mail className="h-8 w-8 text-primary" data-testid="icon-mail" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Grúa RD</h1>
              <p className="text-sm text-muted-foreground">Panel de Comunicaciones</p>
            </div>
          </div>

          {/* Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-login">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="tu@email.com"
                        type="email"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="error-email" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="error-password" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting || authLoading}
                data-testid="button-submit"
              >
                {form.formState.isSubmitting || authLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
          </Form>

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center mt-8">
            Panel exclusivo para administradores de comunicaciones
          </p>
        </div>
      </Card>
    </div>
  );
}
