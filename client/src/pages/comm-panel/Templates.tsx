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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmailTemplate {
  id: string;
  nombre: string;
  asunto: string;
  contenidoHtml: string;
  contenidoTexto?: string;
  categoria: string;
  variables?: string[];
  activo: boolean;
  createdAt: string;
}

const templateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').min(3, 'Mínimo 3 caracteres'),
  asunto: z.string().min(1, 'El asunto es requerido'),
  contenidoHtml: z.string().min(1, 'El contenido HTML es requerido'),
  categoria: z.string().min(1, 'La categoría es requerida'),
  variables: z.string().optional(),
  activo: z.boolean().default(true),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export default function Templates() {
  const { apiRequest } = useCommPanelAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      nombre: '',
      asunto: '',
      contenidoHtml: '',
      categoria: '',
      variables: '',
      activo: true,
    },
  });

  // Fetch templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/comm-panel/templates'],
    queryFn: async () => {
      return await apiRequest<EmailTemplate[]>('/api/comm-panel/templates');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const variables = data.variables
        ? data.variables.split(',').map(v => v.trim()).filter(Boolean)
        : [];

      return await apiRequest('/api/comm-panel/templates', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          variables,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Plantilla creada correctamente',
      });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/templates'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la plantilla',
        variant: 'destructive',
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      if (!editingTemplate) throw new Error('No template selected');

      const variables = data.variables
        ? data.variables.split(',').map(v => v.trim()).filter(Boolean)
        : [];

      return await apiRequest(`/api/comm-panel/templates/${editingTemplate.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          variables,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Plantilla actualizada correctamente',
      });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/templates'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la plantilla',
        variant: 'destructive',
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/comm-panel/templates/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Plantilla eliminada correctamente',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/templates'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la plantilla',
        variant: 'destructive',
      });
    },
  });

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    form.reset({
      nombre: template.nombre,
      asunto: template.asunto,
      contenidoHtml: template.contenidoHtml,
      categoria: template.categoria,
      variables: template.variables?.join(', ') || '',
      activo: template.activo,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const onSubmit = async (values: TemplateFormValues) => {
    if (editingTemplate) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    form.reset();
  };

  const categoryOptions = ['Promocional', 'Transaccional', 'Notificación', 'Bienvenida', 'Recordatorio'];

  return (
    <CommPanelLayout>
      <div className="w-full">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-templates">
              Plantillas de Correo
            </h1>
            <p className="text-muted-foreground" data-testid="text-subtitle">
              Gestiona las plantillas de correo electrónico para tu comunicación
            </p>
          </div>
          <Button 
            onClick={handleNewTemplate}
            data-testid="button-new-template"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>

        {/* Templates Table Card */}
        <Card data-testid="card-templates-table">
          <CardHeader>
            <CardTitle className="text-lg">Todas las Plantillas</CardTitle>
            <CardDescription>
              Total de plantillas: {templates.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTemplates ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" data-testid="loader-templates" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4" data-testid="text-no-templates">
                  No hay plantillas creadas aún
                </p>
                <Button 
                  onClick={handleNewTemplate}
                  variant="outline"
                  data-testid="button-create-first-template"
                >
                  Crear Primera Plantilla
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-nombre">Nombre</TableHead>
                      <TableHead data-testid="header-categoria">Categoría</TableHead>
                      <TableHead data-testid="header-activo">Estado</TableHead>
                      <TableHead data-testid="header-fecha">Fecha de Creación</TableHead>
                      <TableHead className="text-right" data-testid="header-acciones">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                        <TableCell className="font-medium" data-testid={`cell-nombre-${template.id}`}>
                          {template.nombre}
                        </TableCell>
                        <TableCell data-testid={`cell-categoria-${template.id}`}>
                          {template.categoria}
                        </TableCell>
                        <TableCell data-testid={`cell-activo-${template.id}`}>
                          <span
                            className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                              template.activo
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}
                          >
                            {template.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`cell-fecha-${template.id}`}>
                          {format(new Date(template.createdAt), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="text-right space-x-2" data-testid={`cell-acciones-${template.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                            data-testid={`button-edit-${template.id}`}
                            className="gap-2"
                          >
                            <Edit2 className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${template.id}`}
                            className="gap-2"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Template Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-template-form">
            <DialogHeader>
              <DialogTitle data-testid="dialog-title">
                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </DialogTitle>
              <DialogDescription data-testid="dialog-description">
                {editingTemplate
                  ? 'Actualiza los detalles de la plantilla'
                  : 'Crea una nueva plantilla de correo electrónico'}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-template">
                {/* Nombre Field */}
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-nombre">Nombre de la Plantilla</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Confirmación de Pago"
                          {...field}
                          data-testid="input-nombre"
                        />
                      </FormControl>
                      <FormMessage data-testid="error-nombre" />
                    </FormItem>
                  )}
                />

                {/* Asunto Field */}
                <FormField
                  control={form.control}
                  name="asunto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-asunto">Asunto del Correo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Tu pago ha sido confirmado"
                          {...field}
                          data-testid="input-asunto"
                        />
                      </FormControl>
                      <FormMessage data-testid="error-asunto" />
                    </FormItem>
                  )}
                />

                {/* Categoría Field */}
                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-categoria">Categoría</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-categoria">
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option} value={option} data-testid={`option-categoria-${option}`}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage data-testid="error-categoria" />
                    </FormItem>
                  )}
                />

                {/* HTML Content Field */}
                <FormField
                  control={form.control}
                  name="contenidoHtml"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-contenidoHtml">Contenido HTML</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ingresa el contenido HTML del correo"
                          className="font-mono text-sm h-40"
                          {...field}
                          data-testid="textarea-contenidoHtml"
                        />
                      </FormControl>
                      <FormDescription data-testid="description-contenidoHtml">
                        Puedes usar variables como {'{'}nombreCliente{'}'}, {'{'}numeroServicio{'}'}, etc.
                      </FormDescription>
                      <FormMessage data-testid="error-contenidoHtml" />
                    </FormItem>
                  )}
                />

                {/* Variables Field */}
                <FormField
                  control={form.control}
                  name="variables"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-variables">Variables (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: nombreCliente, numeroServicio, fechaPago"
                          {...field}
                          data-testid="input-variables"
                        />
                      </FormControl>
                      <FormDescription data-testid="description-variables">
                        Separa las variables con comas. Se usarán para reemplazar en el contenido HTML.
                      </FormDescription>
                      <FormMessage data-testid="error-variables" />
                    </FormItem>
                  )}
                />

                {/* Active Field */}
                <FormField
                  control={form.control}
                  name="activo"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          data-testid="checkbox-activo"
                          className="h-4 w-4"
                        />
                      </FormControl>
                      <FormLabel className="mb-0 cursor-pointer" data-testid="label-activo">
                        Plantilla Activa
                      </FormLabel>
                      <FormMessage data-testid="error-activo" />
                    </FormItem>
                  )}
                />

                {/* Dialog Footer */}
                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDialogClose}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                    className="gap-2"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      editingTemplate ? 'Actualizar Plantilla' : 'Crear Plantilla'
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
