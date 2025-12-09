import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AseguradoraLayout } from '@/components/layout/AseguradoraLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  Save,
} from 'lucide-react';

interface AseguradoraPerfil {
  id: string;
  userId: string;
  nombreEmpresa: string;
  rnc: string;
  telefono: string | null;
  direccion: string | null;
  emailContacto: string | null;
  personaContacto: string | null;
  activo: boolean;
  createdAt: string;
  user?: {
    email: string;
  };
}

interface PerfilFormData {
  telefono: string;
  direccion: string;
  emailContacto: string;
  personaContacto: string;
}

function PerfilContent() {
  const { toast } = useToast();

  const { data: perfil, isLoading } = useQuery<AseguradoraPerfil>({
    queryKey: ['/api/aseguradora/perfil'],
  });

  const form = useForm<PerfilFormData>({
    defaultValues: {
      telefono: '',
      direccion: '',
      emailContacto: '',
      personaContacto: '',
    },
    values: perfil ? {
      telefono: perfil.telefono || '',
      direccion: perfil.direccion || '',
      emailContacto: perfil.emailContacto || '',
      personaContacto: perfil.personaContacto || '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PerfilFormData) => {
      return apiRequest('PUT', '/api/aseguradora/perfil', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aseguradora/perfil'] });
      toast({
        title: 'Perfil actualizado',
        description: 'Los datos de la empresa han sido actualizados.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el perfil.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PerfilFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Perfil de Empresa
        </h2>
        <p className="text-muted-foreground">
          Información de tu empresa aseguradora
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información de la Empresa
            </CardTitle>
            <CardDescription>
              Datos básicos de la aseguradora (solo lectura)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground">Nombre de la Empresa</Label>
                <p className="text-lg font-medium" data-testid="text-empresa-nombre">{perfil?.nombreEmpresa}</p>
              </div>
              <Badge variant={perfil?.activo ? 'default' : 'secondary'} data-testid="badge-empresa-status">
                {perfil?.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <div>
              <Label className="text-muted-foreground">RNC</Label>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="font-mono" data-testid="text-empresa-rnc">{perfil?.rnc}</p>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Email de Acceso</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p data-testid="text-empresa-email">{perfil?.user?.email}</p>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Fecha de Registro</Label>
              <p data-testid="text-empresa-fecha">{perfil?.createdAt ? new Date(perfil.createdAt).toLocaleDateString('es-DO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) : '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información de Contacto
            </CardTitle>
            <CardDescription>
              Actualiza los datos de contacto de tu empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="personaContacto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persona de Contacto</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="Nombre del contacto principal"
                            className="pl-9"
                            data-testid="input-persona-contacto"
                          />
                        </div>
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
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="809-555-1234"
                            className="pl-9"
                            data-testid="input-telefono"
                          />
                        </div>
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
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="contacto@empresa.com"
                            className="pl-9"
                            data-testid="input-email-contacto"
                          />
                        </div>
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
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="Dirección de la oficina"
                            className="pl-9"
                            data-testid="input-direccion"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AseguradoraPerfil() {
  return (
    <AseguradoraLayout>
      <PerfilContent />
    </AseguradoraLayout>
  );
}
