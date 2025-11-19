import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Truck, Loader2, Mail, Lock, User, Phone, AlertCircle, FileText, Car } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type FormErrors = {
  email?: string;
  password?: string;
  nombre?: string;
  apellido?: string;
  phone?: string;
  licencia?: string;
  placaGrua?: string;
  marcaGrua?: string;
  modeloGrua?: string;
  general?: string;
};

export default function Register() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'cliente' | 'conductor'>('cliente');
  const [errors, setErrors] = useState<FormErrors>({});
  
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

  const validateForm = () => {
    const newErrors: FormErrors = {};

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

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Ingresa un número de teléfono válido (10 dígitos)';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (userType === 'conductor') {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      toast({
        title: 'Errores en el formulario',
        description: 'Por favor corrige los campos marcados',
        variant: 'destructive',
      });
      return;
    }

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
        description: 'Tu cuenta ha sido creada correctamente',
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'No se pudo crear la cuenta. Intenta nuevamente.';
      setErrors({ general: errorMessage });
      toast({
        title: 'Error al registrarse',
        description: errorMessage,
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
            {errors.general && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

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
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nombre"
                    placeholder="Juan"
                    className={`pl-10 ${errors.nombre ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    value={formData.nombre}
                    onChange={(e) => {
                      setFormData({ ...formData, nombre: e.target.value });
                      setErrors({ ...errors, nombre: undefined });
                    }}
                    disabled={loading}
                    data-testid="input-nombre"
                  />
                </div>
                {errors.nombre && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.nombre}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="apellido"
                    placeholder="Pérez"
                    className={`pl-10 ${errors.apellido ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    value={formData.apellido}
                    onChange={(e) => {
                      setFormData({ ...formData, apellido: e.target.value });
                      setErrors({ ...errors, apellido: undefined });
                    }}
                    disabled={loading}
                    data-testid="input-apellido"
                  />
                </div>
                {errors.apellido && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.apellido}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  className={`pl-10 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
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
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="809-555-1234"
                  className={`pl-10 ${errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    setErrors({ ...errors, phone: undefined });
                  }}
                  disabled={loading}
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

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className={`pl-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
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

            {userType === 'conductor' && (
              <>
                <div className="border-t border-border pt-4 mt-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Información de la Grúa
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="licencia">Número de Licencia</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="licencia"
                          placeholder="L-1234567"
                          className={`pl-10 ${errors.licencia ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                          value={formData.licencia}
                          onChange={(e) => {
                            setFormData({ ...formData, licencia: e.target.value });
                            setErrors({ ...errors, licencia: undefined });
                          }}
                          disabled={loading}
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
                      <Label htmlFor="placa">Placa de la Grúa</Label>
                      <div className="relative">
                        <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="placa"
                          placeholder="A123456"
                          className={`pl-10 ${errors.placaGrua ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                          value={formData.placaGrua}
                          onChange={(e) => {
                            setFormData({ ...formData, placaGrua: e.target.value });
                            setErrors({ ...errors, placaGrua: undefined });
                          }}
                          disabled={loading}
                          data-testid="input-placa"
                        />
                      </div>
                      {errors.placaGrua && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.placaGrua}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="marca">Marca</Label>
                        <Input
                          id="marca"
                          placeholder="Ford"
                          className={errors.marcaGrua ? 'border-destructive focus-visible:ring-destructive' : ''}
                          value={formData.marcaGrua}
                          onChange={(e) => {
                            setFormData({ ...formData, marcaGrua: e.target.value });
                            setErrors({ ...errors, marcaGrua: undefined });
                          }}
                          disabled={loading}
                          data-testid="input-marca"
                        />
                        {errors.marcaGrua && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.marcaGrua}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modelo">Modelo</Label>
                        <Input
                          id="modelo"
                          placeholder="F-350"
                          className={errors.modeloGrua ? 'border-destructive focus-visible:ring-destructive' : ''}
                          value={formData.modeloGrua}
                          onChange={(e) => {
                            setFormData({ ...formData, modeloGrua: e.target.value });
                            setErrors({ ...errors, modeloGrua: undefined });
                          }}
                          disabled={loading}
                          data-testid="input-modelo"
                        />
                        {errors.modeloGrua && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.modeloGrua}
                          </p>
                        )}
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
