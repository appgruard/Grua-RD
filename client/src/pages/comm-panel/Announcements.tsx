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
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Loader2, Play, Pause, Upload, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { FileUpload } from '@/components/FileUpload';
import { es } from 'date-fns/locale';

interface Announcement {
  id: string;
  titulo: string;
  contenido: string;
  imagenUrl?: string;
  tipo: 'modal' | 'banner' | 'toast' | 'fullscreen' | 'imagen';
  tamano?: 'pequeno' | 'mediano' | 'grande';
  estado: 'borrador' | 'programado' | 'activo' | 'pausado' | 'expirado';
  audiencia: 'todos' | 'clientes' | 'conductores' | 'empresas' | 'aseguradoras';
  enlaceAccion?: string;
  textoBoton?: string;
  colorFondo?: string;
  colorTexto?: string;
  fechaInicio?: string;
  fechaFin?: string;
  prioridad: number;
  createdAt: string;
}

const announcementSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido').min(3, 'Mínimo 3 caracteres'),
  contenido: z.string().optional().default(''),
  tipo: z.enum(['modal', 'banner', 'toast', 'fullscreen', 'imagen']),
  tamano: z.enum(['pequeno', 'mediano', 'grande']).default('mediano'),
  audiencia: z.enum(['todos', 'clientes', 'conductores', 'empresas', 'aseguradoras']),
  colorFondo: z.string().default('#1a1a2e'),
  colorTexto: z.string().default('#ffffff'),
  prioridad: z.number().int().default(0),
  enlaceAccion: z.string().optional(),
  textoBoton: z.string().optional(),
  imagenUrl: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function Announcements() {
  const { apiRequest, token } = useCommPanelAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      titulo: '',
      contenido: '',
      tipo: 'modal',
      tamano: 'mediano',
      audiencia: 'todos',
      colorFondo: '#1a1a2e',
      colorTexto: '#ffffff',
      prioridad: 0,
      enlaceAccion: '',
      textoBoton: '',
      imagenUrl: '',
      fechaInicio: '',
      fechaFin: '',
    },
  });

  const tipoActual = form.watch('tipo');
  const esImagenSolo = tipoActual === 'imagen';

  // Fetch announcements
  const { data: announcements = [], isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ['/api/comm-panel/announcements'],
    queryFn: async () => {
      return await apiRequest<Announcement[]>('/api/comm-panel/announcements');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async (data: AnnouncementFormValues) => {
      return await apiRequest('/api/comm-panel/announcements', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Anuncio creado correctamente',
      });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/announcements'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el anuncio',
        variant: 'destructive',
      });
    },
  });

  // Update announcement mutation
  const updateMutation = useMutation({
    mutationFn: async (data: AnnouncementFormValues) => {
      if (!editingAnnouncement) throw new Error('No announcement selected');

      return await apiRequest(`/api/comm-panel/announcements/${editingAnnouncement.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Anuncio actualizado correctamente',
      });
      setIsDialogOpen(false);
      setEditingAnnouncement(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/announcements'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el anuncio',
        variant: 'destructive',
      });
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/comm-panel/announcements/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Anuncio eliminado correctamente',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/announcements'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el anuncio',
        variant: 'destructive',
      });
    },
  });

  // Toggle announcement status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: 'activo' | 'pausado' }) => {
      return await apiRequest(`/api/comm-panel/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: newStatus }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Estado del anuncio actualizado',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/announcements'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el estado del anuncio',
        variant: 'destructive',
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!token) throw new Error('No autenticado');
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/comm-panel/upload-image', {
        method: 'POST',
        headers: {
          'x-comm-panel-token': token,
        },
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error al subir imagen' }));
        throw new Error(error.message || 'Error al subir imagen');
      }
      return response.json() as Promise<{ url: string }>;
    },
  });

  const handleNewAnnouncement = () => {
    setEditingAnnouncement(null);
    form.reset();
    setImageFile(null);
    setImagePreview(null);
    setImageMode('upload');
    setIsDialogOpen(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    form.reset({
      titulo: announcement.titulo,
      contenido: announcement.contenido,
      tipo: announcement.tipo,
      tamano: announcement.tamano || 'mediano',
      audiencia: announcement.audiencia,
      colorFondo: announcement.colorFondo || '#1a1a2e',
      colorTexto: announcement.colorTexto || '#ffffff',
      prioridad: announcement.prioridad,
      enlaceAccion: announcement.enlaceAccion || '',
      textoBoton: announcement.textoBoton || '',
      imagenUrl: announcement.imagenUrl || '',
      fechaInicio: announcement.fechaInicio ? announcement.fechaInicio.split('T')[0] : '',
      fechaFin: announcement.fechaFin ? announcement.fechaFin.split('T')[0] : '',
    });
    setImageFile(null);
    setImagePreview(announcement.imagenUrl || null);
    setImageMode(announcement.imagenUrl ? 'url' : 'upload');
    setIsDialogOpen(true);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este anuncio?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'activo' ? 'pausado' : 'activo';
    await toggleStatusMutation.mutateAsync({ id, newStatus });
  };

  const onSubmit = async (values: AnnouncementFormValues) => {
    let finalImageUrl = values.imagenUrl;

    if (imageFile) {
      try {
        setIsUploadingImage(true);
        const result = await uploadImageMutation.mutateAsync(imageFile);
        finalImageUrl = result.url;
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo subir la imagen',
          variant: 'destructive',
        });
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    const dataToSubmit = { ...values, imagenUrl: finalImageUrl };

    if (editingAnnouncement) {
      await updateMutation.mutateAsync(dataToSubmit);
    } else {
      await createMutation.mutateAsync(dataToSubmit);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAnnouncement(null);
    form.reset();
    setImageFile(null);
    setImagePreview(null);
    setImageMode('upload');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pausado':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'borrador':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'programado':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'expirado':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      modal: 'Modal',
      banner: 'Banner',
      toast: 'Toast',
      fullscreen: 'Pantalla Completa',
    };
    return labels[tipo] || tipo;
  };

  const getAudienciaLabel = (audiencia: string) => {
    const labels: Record<string, string> = {
      todos: 'Todos',
      clientes: 'Clientes',
      conductores: 'Conductores',
      empresas: 'Empresas',
      aseguradoras: 'Aseguradoras',
    };
    return labels[audiencia] || audiencia;
  };

  return (
    <CommPanelLayout>
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-2" data-testid="heading-announcements">
              Anuncios
            </h1>
            <p className="text-muted-foreground" data-testid="text-subtitle">
              Gestiona los anuncios en la aplicación
            </p>
          </div>
          <Button 
            onClick={handleNewAnnouncement}
            data-testid="button-new-announcement"
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nuevo Anuncio
          </Button>
        </div>

        {/* Announcements Grid */}
        <div data-testid="announcements-container">
          {isLoadingAnnouncements ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-announcements" />
            </div>
          ) : announcements.length === 0 ? (
            <Card data-testid="card-empty-state">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4 text-center" data-testid="text-no-announcements">
                  No hay anuncios creados aún
                </p>
                <Button 
                  onClick={handleNewAnnouncement}
                  variant="outline"
                  data-testid="button-create-first-announcement"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Crear Primer Anuncio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {announcements.map((announcement) => (
                <Card 
                  key={announcement.id} 
                  className="flex flex-col"
                  data-testid={`card-announcement-${announcement.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2" data-testid={`title-${announcement.id}`}>
                          {announcement.titulo}
                        </CardTitle>
                      </div>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(announcement.estado)}`}
                        data-testid={`status-badge-${announcement.id}`}
                      >
                        {announcement.estado}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3">
                    {/* Preview of content */}
                    <div>
                      <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`content-preview-${announcement.id}`}>
                        {announcement.contenido}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="font-medium" data-testid={`type-${announcement.id}`}>
                          {getTipoLabel(announcement.tipo)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Audiencia:</span>
                        <span className="font-medium" data-testid={`audience-${announcement.id}`}>
                          {getAudienciaLabel(announcement.audiencia)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Prioridad:</span>
                        <span className="font-medium" data-testid={`priority-${announcement.id}`}>
                          {announcement.prioridad}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Creado:</span>
                        <span className="font-medium" data-testid={`created-${announcement.id}`}>
                          {format(new Date(announcement.createdAt), 'dd MMM', { locale: es })}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  {/* Action Buttons */}
                  <div className="border-t p-4 space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAnnouncement(announcement)}
                        data-testid={`button-edit-${announcement.id}`}
                        className="flex-1 gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant={announcement.estado === 'activo' ? 'secondary' : 'default'}
                        size="sm"
                        onClick={() => handleToggleStatus(announcement.id, announcement.estado)}
                        disabled={toggleStatusMutation.isPending}
                        data-testid={`button-toggle-${announcement.id}`}
                        className="flex-1 gap-2"
                      >
                        {toggleStatusMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : announcement.estado === 'activo' ? (
                          <>
                            <Pause className="h-4 w-4" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Activar
                          </>
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${announcement.id}`}
                      className="w-full gap-2"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Eliminar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Announcement Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-announcement-form">
            <DialogHeader>
              <DialogTitle data-testid="dialog-title">
                {editingAnnouncement ? 'Editar Anuncio' : 'Nuevo Anuncio'}
              </DialogTitle>
              <DialogDescription data-testid="dialog-description">
                {editingAnnouncement
                  ? 'Actualiza los detalles del anuncio'
                  : 'Crea un nuevo anuncio para la aplicación'}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-announcement">
                {/* Titulo Field */}
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-titulo">Título</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Nuevo servicio disponible"
                          {...field}
                          data-testid="input-titulo"
                        />
                      </FormControl>
                      <FormMessage data-testid="error-titulo" />
                    </FormItem>
                  )}
                />

                {/* Note for image-only type */}
                {esImagenSolo && (
                  <div className="p-4 bg-muted rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">
                      <strong>Anuncio de Solo Imagen:</strong> Este tipo muestra únicamente la imagen que subas. 
                      Los usuarios pueden tocar/hacer clic en cualquier parte de la imagen para cerrar el anuncio.
                      No se mostrarán título, texto ni botones.
                    </p>
                  </div>
                )}

                {/* Contenido Field - Only shown when not image-only type */}
                {!esImagenSolo && (
                  <FormField
                    control={form.control}
                    name="contenido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-contenido">Contenido</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ej: Descripción detallada del anuncio..."
                            rows={4}
                            {...field}
                            data-testid="input-contenido"
                          />
                        </FormControl>
                        <FormDescription data-testid="help-contenido">
                          Mínimo 10 caracteres
                        </FormDescription>
                        <FormMessage data-testid="error-contenido" />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tipo Field */}
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-tipo">Tipo</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tipo">
                              <SelectValue placeholder="Selecciona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent data-testid="select-tipo-content">
                            <SelectItem value="modal" data-testid="option-modal">Modal</SelectItem>
                            <SelectItem value="banner" data-testid="option-banner">Banner</SelectItem>
                            <SelectItem value="toast" data-testid="option-toast">Toast</SelectItem>
                            <SelectItem value="fullscreen" data-testid="option-fullscreen">Pantalla Completa</SelectItem>
                            <SelectItem value="imagen" data-testid="option-imagen">Solo Imagen</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="error-tipo" />
                      </FormItem>
                    )}
                  />

                  {/* Tamaño Field */}
                  <FormField
                    control={form.control}
                    name="tamano"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-tamano">Tamaño</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tamano">
                              <SelectValue placeholder="Selecciona tamaño" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent data-testid="select-tamano-content">
                            <SelectItem value="pequeno" data-testid="option-pequeno">Pequeño</SelectItem>
                            <SelectItem value="mediano" data-testid="option-mediano">Mediano</SelectItem>
                            <SelectItem value="grande" data-testid="option-grande">Grande</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="error-tamano" />
                      </FormItem>
                    )}
                  />

                  {/* Audiencia Field */}
                  <FormField
                    control={form.control}
                    name="audiencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-audiencia">Audiencia</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-audiencia">
                              <SelectValue placeholder="Selecciona audiencia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent data-testid="select-audiencia-content">
                            <SelectItem value="todos" data-testid="option-todos">Todos</SelectItem>
                            <SelectItem value="clientes" data-testid="option-clientes">Clientes</SelectItem>
                            <SelectItem value="conductores" data-testid="option-conductores">Conductores</SelectItem>
                            <SelectItem value="empresas" data-testid="option-empresas">Empresas</SelectItem>
                            <SelectItem value="aseguradoras" data-testid="option-aseguradoras">Aseguradoras</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="error-audiencia" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Color fields - only shown when not image-only type */}
                {!esImagenSolo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Color Fondo Field */}
                    <FormField
                      control={form.control}
                      name="colorFondo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-colorFondo">Color de Fondo</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                {...field}
                                data-testid="input-colorFondo"
                                className="w-12 h-10"
                              />
                              <Input
                                type="text"
                                placeholder="#1a1a2e"
                                value={field.value}
                                onChange={field.onChange}
                                data-testid="input-colorFondo-text"
                                className="flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormMessage data-testid="error-colorFondo" />
                        </FormItem>
                      )}
                    />

                    {/* Color Texto Field */}
                    <FormField
                      control={form.control}
                      name="colorTexto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-colorTexto">Color de Texto</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                {...field}
                                data-testid="input-colorTexto"
                                className="w-12 h-10"
                              />
                              <Input
                                type="text"
                                placeholder="#ffffff"
                                value={field.value}
                                onChange={field.onChange}
                                data-testid="input-colorTexto-text"
                                className="flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormMessage data-testid="error-colorTexto" />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Prioridad Field */}
                <FormField
                  control={form.control}
                  name="prioridad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-prioridad">Prioridad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-prioridad"
                        />
                      </FormControl>
                      <FormDescription data-testid="help-prioridad">
                        Mayor número = mayor prioridad
                      </FormDescription>
                      <FormMessage data-testid="error-prioridad" />
                    </FormItem>
                  )}
                />

                {/* Enlace y Boton Fields - only shown when not image-only type */}
                {!esImagenSolo && (
                  <>
                    <FormField
                      control={form.control}
                      name="enlaceAccion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-enlaceAccion">Enlace de Acción (Opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: https://ejemplo.com"
                              {...field}
                              data-testid="input-enlaceAccion"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-enlaceAccion" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="textoBoton"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-textoBoton">Texto del Botón (Opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Ver más"
                              {...field}
                              data-testid="input-textoBoton"
                            />
                          </FormControl>
                          <FormMessage data-testid="error-textoBoton" />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Imagen Field with Upload/URL modes */}
                <FormField
                  control={form.control}
                  name="imagenUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-imagenUrl">Imagen (Opcional)</FormLabel>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={imageMode === 'upload' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setImageMode('upload')}
                            data-testid="button-image-mode-upload"
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Subir Imagen
                          </Button>
                          <Button
                            type="button"
                            variant={imageMode === 'url' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setImageMode('url')}
                            data-testid="button-image-mode-url"
                            className="gap-2"
                          >
                            <ImageIcon className="h-4 w-4" />
                            URL Externa
                          </Button>
                        </div>

                        {imageMode === 'upload' ? (
                          <FileUpload
                            onFileSelect={(file) => {
                              setImageFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImagePreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }}
                            onFileRemove={() => {
                              setImageFile(null);
                              setImagePreview(null);
                            }}
                            accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                            maxSizeMB={5}
                            previewUrl={imagePreview || undefined}
                            label=""
                            helperText="Arrastra una imagen aquí o haz clic para seleccionar"
                          />
                        ) : (
                          <FormControl>
                            <Input
                              placeholder="Ej: https://ejemplo.com/imagen.jpg"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setImagePreview(e.target.value || null);
                              }}
                              data-testid="input-imagenUrl"
                            />
                          </FormControl>
                        )}

                        {imagePreview && imageMode === 'url' && (
                          <div className="mt-2" data-testid="image-preview-container">
                            <p className="text-sm text-muted-foreground mb-2">Vista previa:</p>
                            <img
                              src={imagePreview}
                              alt="Vista previa"
                              className="max-w-full max-h-40 rounded object-contain"
                              onError={() => setImagePreview(null)}
                              data-testid="image-preview"
                            />
                          </div>
                        )}

                        {imageFile && (
                          <p className="text-sm text-muted-foreground" data-testid="text-file-selected">
                            Archivo seleccionado: {imageFile.name}
                          </p>
                        )}
                      </div>
                      <FormMessage data-testid="error-imagenUrl" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fecha Inicio Field */}
                  <FormField
                    control={form.control}
                    name="fechaInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-fechaInicio">Fecha de Inicio (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-fechaInicio"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-fechaInicio" />
                      </FormItem>
                    )}
                  />

                  {/* Fecha Fin Field */}
                  <FormField
                    control={form.control}
                    name="fechaFin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-fechaFin">Fecha de Fin (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-fechaFin"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-fechaFin" />
                      </FormItem>
                    )}
                  />
                </div>

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
                    disabled={createMutation.isPending || updateMutation.isPending || isUploadingImage}
                    data-testid="button-submit"
                    className="gap-2"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Subiendo imagen...
                      </>
                    ) : createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {editingAnnouncement ? 'Actualizando...' : 'Creando...'}
                      </>
                    ) : (
                      editingAnnouncement ? 'Actualizar Anuncio' : 'Crear Anuncio'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </CommPanelLayout>
  );
}
