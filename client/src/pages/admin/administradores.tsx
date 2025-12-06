import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  UserCog, 
  Plus, 
  Loader2,
  Shield,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ADMIN_PERMISOS, ADMIN_PERMISO_LABELS, type AdminPermiso } from '@shared/schema';

interface Administrador {
  id: string;
  userId: string;
  permisos: string[];
  activo: boolean;
  primerInicioSesion: boolean;
  notas: string | null;
  createdAt: string;
  user: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  creadoPorUsuario?: {
    nombre: string;
    apellido: string;
  };
}

const createAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  apellido: z.string().optional(),
  permisos: z.array(z.string()).min(1, 'Debe seleccionar al menos un permiso'),
  notas: z.string().optional().nullable(),
});

const updateAdminSchema = z.object({
  permisos: z.array(z.string()).min(1, 'Debe seleccionar al menos un permiso'),
  notas: z.string().optional().nullable(),
});

type CreateAdminForm = z.infer<typeof createAdminSchema>;
type UpdateAdminForm = z.infer<typeof updateAdminSchema>;

export default function AdminAdministradores() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Administrador | null>(null);

  const { data: admins, isLoading: adminsLoading } = useQuery<Administrador[]>({
    queryKey: ['/api/admin/administradores'],
  });

  const createForm = useForm<CreateAdminForm>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      email: '',
      password: '',
      nombre: '',
      apellido: '',
      permisos: [],
      notas: '',
    },
  });

  const editForm = useForm<UpdateAdminForm>({
    resolver: zodResolver(updateAdminSchema),
    defaultValues: {
      permisos: [],
      notas: '',
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: CreateAdminForm) => {
      const res = await apiRequest('POST', '/api/admin/administradores', data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al crear administrador');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/administradores'] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: 'Administrador creado',
        description: 'El nuevo administrador ha sido registrado y se le ha enviado un email de bienvenida.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAdminForm }) => {
      const res = await apiRequest('PUT', `/api/admin/administradores/${id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al actualizar administrador');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/administradores'] });
      setEditDialogOpen(false);
      setSelectedAdmin(null);
      editForm.reset();
      toast({
        title: 'Administrador actualizado',
        description: 'Los permisos han sido actualizados exitosamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('PUT', `/api/admin/administradores/${id}/toggle`, {});
      if (!res.ok) throw new Error('Error al cambiar estado');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/administradores'] });
      toast({
        title: 'Estado actualizado',
        description: 'El estado del administrador ha sido actualizado.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del administrador.',
        variant: 'destructive',
      });
    },
  });

  const handleEditClick = (admin: Administrador) => {
    setSelectedAdmin(admin);
    editForm.reset({
      permisos: admin.permisos,
      notas: admin.notas || '',
    });
    setEditDialogOpen(true);
  };

  const totalAdmins = admins?.length || 0;
  const activeAdmins = admins?.filter(a => a.activo).length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-administradores-title">
            Gestión de Administradores
          </h1>
          <p className="text-muted-foreground">
            Administra los usuarios administrativos y sus permisos
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-crear-admin">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Administrador
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-admins">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Administradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdmins}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-admins-activos">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeAdmins}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-admins-inactivos">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{totalAdmins - activeAdmins}</div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-admins-list">
        <CardHeader>
          <CardTitle>Lista de Administradores</CardTitle>
          <CardDescription>Gestiona los accesos y permisos de los administradores</CardDescription>
        </CardHeader>
        <CardContent>
          {adminsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : admins?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay administradores registrados.</p>
          ) : (
            <div className="space-y-4">
              {admins?.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`row-admin-${admin.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{admin.user.nombre} {admin.user.apellido}</p>
                      <p className="text-sm text-muted-foreground">{admin.user.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {admin.permisos.slice(0, 3).map((permiso) => (
                          <Badge key={permiso} variant="secondary" className="text-xs">
                            {ADMIN_PERMISO_LABELS[permiso as AdminPermiso] || permiso}
                          </Badge>
                        ))}
                        {admin.permisos.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{admin.permisos.length - 3} más
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Creado: {format(new Date(admin.createdAt), 'dd MMM yyyy', { locale: es })}</p>
                      {admin.primerInicioSesion && (
                        <Badge variant="outline" className="text-xs">Primer inicio pendiente</Badge>
                      )}
                    </div>
                    <Badge variant={admin.activo ? 'default' : 'secondary'}>
                      {admin.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(admin)}
                        data-testid={`button-editar-${admin.id}`}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Permisos
                      </Button>
                      <Switch
                        checked={admin.activo}
                        onCheckedChange={() => toggleAdminMutation.mutate(admin.id)}
                        data-testid={`switch-admin-${admin.id}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Administrador</DialogTitle>
            <DialogDescription>
              Registra un nuevo administrador con sus permisos de acceso
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createAdminMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-admin-nombre" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="apellido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-admin-apellido" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-admin-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña Temporal</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-admin-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="permisos"
                render={() => (
                  <FormItem>
                    <FormLabel>Permisos</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {ADMIN_PERMISOS.map((permiso) => (
                        <FormField
                          key={permiso}
                          control={createForm.control}
                          name="permisos"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(permiso)}
                                  onCheckedChange={(checked) => {
                                    const newValue = checked
                                      ? [...(field.value || []), permiso]
                                      : field.value?.filter((v) => v !== permiso) || [];
                                    field.onChange(newValue);
                                  }}
                                  data-testid={`checkbox-permiso-${permiso}`}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {ADMIN_PERMISO_LABELS[permiso]}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''} 
                        data-testid="input-admin-notas" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createAdminMutation.isPending} data-testid="button-submit-crear">
                  {createAdminMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear Administrador
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Permisos</DialogTitle>
            <DialogDescription>
              {selectedAdmin && `Actualiza los permisos de ${selectedAdmin.user.nombre} ${selectedAdmin.user.apellido}`}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => selectedAdmin && updateAdminMutation.mutate({ id: selectedAdmin.id, data }))} className="space-y-4">
              <FormField
                control={editForm.control}
                name="permisos"
                render={() => (
                  <FormItem>
                    <FormLabel>Permisos</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {ADMIN_PERMISOS.map((permiso) => (
                        <FormField
                          key={permiso}
                          control={editForm.control}
                          name="permisos"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(permiso)}
                                  onCheckedChange={(checked) => {
                                    const newValue = checked
                                      ? [...(field.value || []), permiso]
                                      : field.value?.filter((v) => v !== permiso) || [];
                                    field.onChange(newValue);
                                  }}
                                  data-testid={`checkbox-edit-permiso-${permiso}`}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {ADMIN_PERMISO_LABELS[permiso]}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''} 
                        data-testid="input-edit-admin-notas" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateAdminMutation.isPending} data-testid="button-submit-editar">
                  {updateAdminMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
