import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const perfilSchema = z.object({
  nombreEmpresa: z.string().min(1, 'Nombre de empresa es requerido'),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  emailContacto: z.string().email('Email inválido').optional().nullable(),
  personaContacto: z.string().optional().nullable(),
});

type PerfilFormData = z.infer<typeof perfilSchema>;

interface EmpresaProfile {
  id: string;
  nombreEmpresa: string;
  rnc: string;
  tipoEmpresa: string;
  direccion?: string;
  telefono?: string;
  emailContacto?: string;
  personaContacto?: string;
  limiteCredito?: string;
  diasCredito?: number;
  descuentoVolumen?: string;
  verificado: boolean;
  activo: boolean;
  createdAt: string;
  user?: {
    nombre: string;
    apellido: string;
    email: string;
    phone?: string;
  };
}

const tipoEmpresaLabels: Record<string, string> = {
  constructora: 'Constructora',
  ferreteria: 'Ferretería',
  logistica: 'Logística',
  turistica: 'Turística',
  ayuntamiento: 'Ayuntamiento',
  zona_franca: 'Zona Franca',
  industria: 'Industria',
  rent_car: 'Rent a Car',
  maquinaria_pesada: 'Maquinaria Pesada',
  otro: 'Otro',
};

export default function EmpresaPerfil() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<EmpresaProfile>({
    queryKey: ['/api/empresa/profile'],
  });

  const form = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    values: {
      nombreEmpresa: profile?.nombreEmpresa || '',
      direccion: profile?.direccion || '',
      telefono: profile?.telefono || '',
      emailContacto: profile?.emailContacto || '',
      personaContacto: profile?.personaContacto || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PerfilFormData) => {
      return apiRequest('/api/empresa/profile', 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/empresa/profile'] });
      toast({
        title: 'Perfil actualizado',
        description: 'Los datos de su empresa han sido actualizados.',
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el perfil',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PerfilFormData) => {
    updateMutation.mutate(data);
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(parseFloat(value || '0'));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-perfil-title">
            Perfil de Empresa
          </h1>
          <p className="text-muted-foreground">
            Gestione la información de su empresa
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.verificado ? (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Verificada
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Pendiente Verificación
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información de la Empresa
            </CardTitle>
            <CardDescription>
              Datos legales y de contacto
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nombreEmpresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Empresa</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-nombre-empresa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} data-testid="input-direccion" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} data-testid="input-telefono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emailContacto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email de Contacto</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            {...field} 
                            value={field.value || ''} 
                            data-testid="input-email-contacto" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="personaContacto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persona de Contacto</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} data-testid="input-persona-contacto" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      data-testid="button-guardar-perfil"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-medium">{profile?.nombreEmpresa}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">RNC</p>
                    <p className="font-medium">{profile?.rnc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Empresa</p>
                    <Badge variant="outline">
                      {tipoEmpresaLabels[profile?.tipoEmpresa || ''] || profile?.tipoEmpresa}
                    </Badge>
                  </div>
                </div>

                {profile?.direccion && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dirección</p>
                      <p className="font-medium">{profile.direccion}</p>
                    </div>
                  </div>
                )}

                {profile?.telefono && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <p className="font-medium">{profile.telefono}</p>
                    </div>
                  </div>
                )}

                {profile?.emailContacto && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email de Contacto</p>
                      <p className="font-medium">{profile.emailContacto}</p>
                    </div>
                  </div>
                )}

                {profile?.personaContacto && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Persona de Contacto</p>
                      <p className="font-medium">{profile.personaContacto}</p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full mt-4"
                  data-testid="button-editar-perfil"
                >
                  Editar Información
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Condiciones Comerciales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Límite de Crédito</span>
                <span className="font-bold text-lg">
                  {formatCurrency(profile?.limiteCredito || '0')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Días de Crédito</span>
                <span className="font-medium">{profile?.diasCredito || 30} días</span>
              </div>

              {profile?.descuentoVolumen && parseFloat(profile.descuentoVolumen) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Descuento por Volumen</span>
                  <Badge variant="outline" className="text-green-600">
                    {profile.descuentoVolumen}%
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Representante Legal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">
                    {profile?.user?.nombre} {profile?.user?.apellido}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.user?.email}</p>
                </div>
              </div>

              {profile?.user?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{profile.user.phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Información de Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cuenta desde</span>
                <span className="font-medium">
                  {profile?.createdAt ? formatDate(profile.createdAt) : '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant={profile?.activo ? 'default' : 'secondary'}>
                  {profile?.activo ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
