import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCommPanelAuth } from '@/contexts/CommPanelAuthContext';
import { useToast } from '@/hooks/use-toast';
import { CommPanelLayout } from '@/components/comm-panel/CommPanelLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PushConfig {
  id: string;
  nombre: string;
  titulo: string;
  cuerpo: string;
  iconoUrl?: string;
  imagenUrl?: string;
  colorAccento?: string;
  sonido?: string;
  vibracion: boolean;
  prioridad: string;
  createdAt: string;
  updatedAt: string;
}

const pushConfigSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').min(3, 'Mínimo 3 caracteres'),
  titulo: z.string().min(1, 'El título es requerido').min(3, 'Mínimo 3 caracteres'),
  cuerpo: z.string().min(1, 'El cuerpo es requerido').min(5, 'Mínimo 5 caracteres'),
  iconoUrl: z.string().optional().nullable(),
  imagenUrl: z.string().optional().nullable(),
  colorAccento: z.string().default('#e94560'),
  sonido: z.string().default('default'),
  vibracion: z.boolean().default(true),
  prioridad: z.enum(['high', 'normal', 'low']).default('high'),
});

type PushConfigFormValues = z.infer<typeof pushConfigSchema>;

export default function PushConfigs() {
  const { apiRequest } = useCommPanelAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PushConfig | null>(null);

  const form = useForm<PushConfigFormValues>({
    resolver: zodResolver(pushConfigSchema),
    defaultValues: {
      nombre: '',
      titulo: '',
      cuerpo: '',
      iconoUrl: '',
      imagenUrl: '',
      colorAccento: '#e94560',
      sonido: 'default',
      vibracion: true,
      prioridad: 'high',
    },
  });

  // Fetch push configs
  const { data: configs = [], isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['/api/comm-panel/push-configs'],
    queryFn: async () => {
      return await apiRequest<PushConfig[]>('/api/comm-panel/push-configs');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create push config mutation
  const createMutation = useMutation({
    mutationFn: async (data: PushConfigFormValues) => {
      return await apiRequest('/api/comm-panel/push-configs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Configuración creada correctamente',
      });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/push-configs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la configuración',
        variant: 'destructive',
      });
    },
  });

  // Update push config mutation
  const updateMutation = useMutation({
    mutationFn: async (data: PushConfigFormValues) => {
      if (!editingConfig) throw new Error('No config selected');

      return await apiRequest(`/api/comm-panel/push-configs/${editingConfig.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Configuración actualizada correctamente',
      });
      setIsDialogOpen(false);
      setEditingConfig(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/push-configs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la configuración',
        variant: 'destructive',
      });
    },
  });

  // Delete push config mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/comm-panel/push-configs/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Configuración eliminada correctamente',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/push-configs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la configuración',
        variant: 'destructive',
      });
    },
  });

  const handleNewConfig = () => {
    setEditingConfig(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleEditConfig = (config: PushConfig) => {
    setEditingConfig(config);
    form.reset({
      nombre: config.nombre,
      titulo: config.titulo,
      cuerpo: config.cuerpo,
      iconoUrl: config.iconoUrl || '',
      imagenUrl: config.imagenUrl || '',
      colorAccento: config.colorAccento || '#e94560',
      sonido: config.sonido || 'default',
      vibracion: config.vibracion,
      prioridad: (config.prioridad as 'high' | 'normal' | 'low') || 'high',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteConfig = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta configuración?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const onSubmit = async (values: PushConfigFormValues) => {
    if (editingConfig) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingConfig(null);
    form.reset();
  };

  const getPriorityLabel = (prioridad: string) => {
    const labels: Record<string, string> = {
      high: 'Alta',
      normal: 'Normal',
      low: 'Baja',
    };
    return labels[prioridad] || prioridad;
  };

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <CommPanelLayout>
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground" data-testid="text-page-title">
                Configuraciones de Notificaciones Push
              </h1>
              <p className="text-muted-foreground mt-2">
                Administra las configuraciones para las notificaciones push
              </p>
            </div>
            <Button
              onClick={handleNewConfig}
              className="gap-2"
              data-testid="button-new-config"
            >
              <Plus className="w-4 h-4" />
              Nueva Configuración
            </Button>
          </div>

          {/* Table Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configuraciones Activas</CardTitle>
              <CardDescription>
                {configs.length} configuración{configs.length !== 1 ? 'es' : ''} registrada{configs.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingConfigs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : configs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground" data-testid="text-no-configs">
                    No hay configuraciones registradas. Crea una nueva para empezar.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead data-testid="header-nombre">Nombre</TableHead>
                        <TableHead data-testid="header-titulo">Título</TableHead>
                        <TableHead data-testid="header-prioridad">Prioridad</TableHead>
                        <TableHead data-testid="header-fecha">Fecha Creación</TableHead>
                        <TableHead className="text-right" data-testid="header-acciones">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((config) => (
                        <TableRow key={config.id} data-testid={`row-config-${config.id}`}>
                          <TableCell className="font-medium" data-testid={`cell-nombre-${config.id}`}>
                            {config.nombre}
                          </TableCell>
                          <TableCell data-testid={`cell-titulo-${config.id}`}>
                            {config.titulo}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getPriorityColor(config.prioridad)}`}
                              data-testid={`badge-priority-${config.id}`}
                            >
                              {getPriorityLabel(config.prioridad)}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`cell-fecha-${config.id}`}>
                            {format(new Date(config.createdAt), 'dd MMM yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditConfig(config)}
                                data-testid={`button-edit-${config.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteConfig(config.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${config.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-config-form">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">
              {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? 'Actualiza los detalles de la configuración de notificación push'
                : 'Crea una nueva configuración de notificación push'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Nombre */}
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Promoción de verano"
                        {...field}
                        data-testid="input-nombre"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Título */}
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Título de la notificación"
                        {...field}
                        data-testid="input-titulo"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cuerpo */}
              <FormField
                control={form.control}
                name="cuerpo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuerpo</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Contenido de la notificación"
                        className="min-h-24"
                        {...field}
                        data-testid="textarea-cuerpo"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Icono URL */}
              <FormField
                control={form.control}
                name="iconoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del Icono</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/icon.png"
                        type="url"
                        {...field}
                        value={field.value || ''}
                        data-testid="input-iconoUrl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Imagen URL */}
              <FormField
                control={form.control}
                name="imagenUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de la Imagen</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/image.jpg"
                        type="url"
                        {...field}
                        value={field.value || ''}
                        data-testid="input-imagenUrl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color Acento */}
              <FormField
                control={form.control}
                name="colorAccento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color de Acento</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          {...field}
                          className="w-12 h-10 rounded border border-input cursor-pointer"
                          data-testid="input-colorAccento"
                        />
                        <Input
                          placeholder="#e94560"
                          {...field}
                          data-testid="input-colorAccento-text"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sonido */}
              <FormField
                control={form.control}
                name="sonido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sonido</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-sonido">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default">Por Defecto</SelectItem>
                        <SelectItem value="silent">Silencioso</SelectItem>
                        <SelectItem value="notification">Notificación</SelectItem>
                        <SelectItem value="alert">Alerta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prioridad */}
              <FormField
                control={form.control}
                name="prioridad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-prioridad">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vibración */}
              <FormField
                control={form.control}
                name="vibracion"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Vibración</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Activar vibración en dispositivos compatibles
                      </p>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-vibracion"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : editingConfig ? (
                    'Actualizar'
                  ) : (
                    'Crear'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </CommPanelLayout>
  );
}
