import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Truck, Loader2 } from 'lucide-react';

export default function Register() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'cliente' | 'conductor'>('cliente');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    phone: '',
    licencia: '',
    placaGrua: '',
    marcaGrua: '',
    modeloGrua: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data: any = {
        email: formData.email,
        password: formData.password,
        nombre: formData.nombre,
        apellido: formData.apellido,
        phone: formData.phone,
        userType,
      };

      if (userType === 'conductor') {
        data.conductorData = {
          licencia: formData.licencia,
          placaGrua: formData.placaGrua,
          marcaGrua: formData.marcaGrua,
          modeloGrua: formData.modeloGrua,
        };
      }

      await register(data);
      
      toast({
        title: '¡Registro exitoso!',
        description: 'Tu cuenta ha sido creada',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la cuenta',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <Truck className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
          <CardDescription>
            Regístrate en GruaRD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userType">Tipo de Usuario</Label>
              <Select value={userType} onValueChange={(v: any) => setUserType(v)}>
                <SelectTrigger data-testid="select-usertype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="conductor">Conductor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  data-testid="input-nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  required
                  data-testid="input-apellido"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                data-testid="input-password"
              />
            </div>

            {userType === 'conductor' && (
              <>
                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold mb-4">Información de la Grúa</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="licencia">Número de Licencia</Label>
                      <Input
                        id="licencia"
                        value={formData.licencia}
                        onChange={(e) => setFormData({ ...formData, licencia: e.target.value })}
                        required={userType === 'conductor'}
                        data-testid="input-licencia"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="placa">Placa de la Grúa</Label>
                      <Input
                        id="placa"
                        value={formData.placaGrua}
                        onChange={(e) => setFormData({ ...formData, placaGrua: e.target.value })}
                        required={userType === 'conductor'}
                        data-testid="input-placa"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="marca">Marca</Label>
                        <Input
                          id="marca"
                          value={formData.marcaGrua}
                          onChange={(e) => setFormData({ ...formData, marcaGrua: e.target.value })}
                          required={userType === 'conductor'}
                          data-testid="input-marca"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modelo">Modelo</Label>
                        <Input
                          id="modelo"
                          value={formData.modeloGrua}
                          onChange={(e) => setFormData({ ...formData, modeloGrua: e.target.value })}
                          required={userType === 'conductor'}
                          data-testid="input-modelo"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="button-register"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setLocation('/login')}
                data-testid="link-login"
              >
                Inicia sesión
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
