import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  FolderOpen,
  Plus,
  Search,
  Calendar,
  DollarSign,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const proyectoSchema = z.object({
  nombreProyecto: z.string().min(1, 'Nombre del proyecto es requerido'),
  descripcion: z.string().optional(),
  ubicacion: z.string().optional(),
  presupuestoAsignado: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFinEstimada: z.string().optional(),
});

type ProyectoFormData = z.infer<typeof proyectoSchema>;

interface Proyecto {
  id: string;
  nombreProyecto: string;
  descripcion?: string;
  ubicacion?: string;
  presupuestoAsignado?: string;
  gastoActual?: string;
  fechaInicio?: string;
  fechaFinEstimada?: string;
  activo: boolean;
  createdAt: string;
}

export default function EmpresaProyectos() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: proyectos = [], isLoading } = useQuery<Proyecto[]>({
    queryKey: ['/api/empresa/proyectos'],
  });

  const form = useForm<ProyectoFormData>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: {
      nombreProyecto: '',
      descripcion: '',
      ubicacion: '',
      presupuestoAsignado: '',
      fechaInicio: '',
      fechaFinEstimada: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProyectoFormData) => {
      return apiRequest('/api/empresa/proyectos', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/empresa/proyectos'] });
      toast({
        title: 'Proyecto creado',
        description: 'El proyecto ha sido creado exitosamente.',
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el proyecto',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProyectoFormData) => {
    createMutation.mutate(data);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(parseFloat(value || '0'));
  };

  const getProgressPercent = (gasto: string, presupuesto: string) => {
    const gastoNum = parseFloat(gasto || '0');
    const presupuestoNum = parseFloat(presupuesto || '0');
    if (presupuestoNum === 0) return 0;
    return Math.min((gastoNum / presupuestoNum) * 100, 100);
  };

  const filteredProyectos = proyectos.filter((p) =>
    p.nombreProyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-proyectos-title">
            Proyectos
          </h1>
          <p className="text-muted-foreground">
            Gestione los proyectos de construcción y obras de su empresa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-nuevo-proyecto">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nombreProyecto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Proyecto</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: Construcción Torre Empresarial" 
                          {...field} 
                          data-testid="input-nombre-proyecto"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detalles del proyecto..."
                          className="resize-none"
                          {...field} 
                          data-testid="input-descripcion-proyecto"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ubicacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Dirección del proyecto" 
                          {...field} 
                          data-testid="input-ubicacion-proyecto"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="presupuestoAsignado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presupuesto Asignado (RD$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-presupuesto-proyecto"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fechaInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Inicio</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-fecha-inicio" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fechaFinEstimada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha Fin Estimada</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-fecha-fin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-guardar-proyecto"
                  >
                    {createMutation.isPending ? 'Guardando...' : 'Crear Proyecto'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proyectos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-buscar-proyectos"
          />
        </div>
      </div>

      {filteredProyectos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay proyectos</p>
            <p className="text-muted-foreground">
              Cree un nuevo proyecto para comenzar a gestionar servicios
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProyectos.map((proyecto) => {
            const progress = getProgressPercent(
              proyecto.gastoActual || '0',
              proyecto.presupuestoAsignado || '0'
            );

            return (
              <Card key={proyecto.id} data-testid={`card-proyecto-${proyecto.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{proyecto.nombreProyecto}</CardTitle>
                      {proyecto.descripcion && (
                        <CardDescription className="line-clamp-2 mt-1">
                          {proyecto.descripcion}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={proyecto.activo ? 'default' : 'secondary'}>
                      {proyecto.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proyecto.ubicacion && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{proyecto.ubicacion}</span>
                    </div>
                  )}

                  {proyecto.fechaInicio && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatDate(proyecto.fechaInicio)}
                        {proyecto.fechaFinEstimada && ` - ${formatDate(proyecto.fechaFinEstimada)}`}
                      </span>
                    </div>
                  )}

                  {proyecto.presupuestoAsignado && parseFloat(proyecto.presupuestoAsignado) > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          Presupuesto
                        </span>
                        <span className="font-medium">
                          {formatCurrency(proyecto.presupuestoAsignado)}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Gastado: {formatCurrency(proyecto.gastoActual || '0')}</span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {progress.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full">
                    Ver Detalles
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
