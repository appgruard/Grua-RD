import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  CalendarPlus,
  Clock,
  MapPin,
  Truck,
  Plus,
  Search,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const servicioCategories = [
  { value: 'remolque_estandar', label: 'Remolque Estándar' },
  { value: 'remolque_motocicletas', label: 'Remolque de Motocicletas' },
  { value: 'remolque_plataforma', label: 'Plataforma / Flatbed' },
  { value: 'auxilio_vial', label: 'Auxilio Vial' },
  { value: 'remolque_especializado', label: 'Remolque Especializado' },
  { value: 'vehiculos_pesados', label: 'Vehículos Pesados' },
  { value: 'maquinarias', label: 'Maquinarias' },
  { value: 'izaje_construccion', label: 'Izaje Construcción' },
  { value: 'remolque_recreativo', label: 'Remolque Recreativo' },
];

const solicitudSchema = z.object({
  fechaProgramada: z.string().min(1, 'Fecha es requerida'),
  horaInicio: z.string().min(1, 'Hora de inicio es requerida'),
  horaFin: z.string().optional(),
  origenDireccion: z.string().min(1, 'Dirección de origen es requerida'),
  origenLat: z.string().default('18.4861'),
  origenLng: z.string().default('-69.9312'),
  destinoDireccion: z.string().optional(),
  destinoLat: z.string().optional(),
  destinoLng: z.string().optional(),
  servicioCategoria: z.string().optional(),
  descripcion: z.string().optional(),
  proyectoId: z.string().optional(),
  contratoId: z.string().optional(),
  recurrente: z.boolean().optional(),
  frecuenciaRecurrencia: z.string().optional(),
  notasInternas: z.string().optional(),
});

type SolicitudFormData = z.infer<typeof solicitudSchema>;

interface ServicioProgramado {
  id: string;
  fechaProgramada: string;
  horaInicio: string;
  horaFin?: string;
  origenDireccion: string;
  destinoDireccion?: string;
  servicioCategoria: string;
  estado: string;
  descripcion?: string;
}

interface Proyecto {
  id: string;
  nombreProyecto: string;
}

export default function EmpresaSolicitudes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: solicitudes = [], isLoading } = useQuery<ServicioProgramado[]>({
    queryKey: ['/api/empresa/solicitudes'],
  });

  const { data: proyectos = [] } = useQuery<Proyecto[]>({
    queryKey: ['/api/empresa/proyectos'],
  });

  const form = useForm<SolicitudFormData>({
    resolver: zodResolver(solicitudSchema),
    defaultValues: {
      fechaProgramada: '',
      horaInicio: '',
      horaFin: '',
      origenDireccion: '',
      origenLat: '18.4861',
      origenLng: '-69.9312',
      destinoDireccion: '',
      descripcion: '',
      servicioCategoria: 'remolque_estandar',
      recurrente: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SolicitudFormData) => {
      return apiRequest('/api/empresa/solicitudes', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/empresa/solicitudes'] });
      toast({
        title: 'Solicitud creada',
        description: 'El servicio ha sido programado exitosamente.',
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la solicitud',
        variant: 'destructive',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/empresa/solicitudes/${id}/cancelar`, 'PUT');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/empresa/solicitudes'] });
      toast({
        title: 'Solicitud cancelada',
        description: 'El servicio programado ha sido cancelado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cancelar la solicitud',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SolicitudFormData) => {
    createMutation.mutate(data);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pendiente: 'secondary',
      confirmado: 'default',
      en_camino: 'default',
      ejecutado: 'outline',
      cancelado: 'destructive',
    };
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      en_camino: 'En Camino',
      ejecutado: 'Ejecutado',
      cancelado: 'Cancelado',
    };
    return (
      <Badge variant={variants[estado] || 'secondary'}>
        {labels[estado] || estado}
      </Badge>
    );
  };

  const filteredSolicitudes = solicitudes.filter(
    (s) =>
      s.origenDireccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.destinoDireccion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendientes = filteredSolicitudes.filter(
    (s) => ['pendiente', 'confirmado'].includes(s.estado)
  );
  const enProgreso = filteredSolicitudes.filter(
    (s) => ['en_camino'].includes(s.estado)
  );
  const completados = filteredSolicitudes.filter(
    (s) => ['ejecutado', 'cancelado'].includes(s.estado)
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
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
          <h1 className="text-3xl font-bold" data-testid="text-solicitudes-title">
            Servicios Programados
          </h1>
          <p className="text-muted-foreground">
            Gestione y programe servicios de grúa para su empresa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-nueva-solicitud">
              <Plus className="w-4 h-4 mr-2" />
              Programar Servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Programar Nuevo Servicio</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fechaProgramada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-fecha" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="horaInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de Inicio</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-hora-inicio" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="servicioCategoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Servicio</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-categoria">
                            <SelectValue placeholder="Seleccione tipo de servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {servicioCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="origenDireccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección de Origen</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ingrese la dirección de origen" 
                          {...field} 
                          data-testid="input-origen"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destinoDireccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección de Destino (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ingrese la dirección de destino" 
                          {...field} 
                          data-testid="input-destino"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {proyectos.length > 0 && (
                  <FormField
                    control={form.control}
                    name="proyectoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proyecto (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-proyecto">
                              <SelectValue placeholder="Seleccione un proyecto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {proyectos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nombreProyecto}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción / Notas</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detalles adicionales sobre el servicio..."
                          className="resize-none"
                          {...field} 
                          data-testid="input-descripcion"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    data-testid="button-guardar-solicitud"
                  >
                    {createMutation.isPending ? 'Guardando...' : 'Programar Servicio'}
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
            placeholder="Buscar servicios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-buscar-solicitudes"
          />
        </div>
      </div>

      <Tabs defaultValue="pendientes" className="w-full">
        <TabsList>
          <TabsTrigger value="pendientes" data-testid="tab-pendientes">
            Pendientes ({pendientes.length})
          </TabsTrigger>
          <TabsTrigger value="en_progreso" data-testid="tab-en-progreso">
            En Progreso ({enProgreso.length})
          </TabsTrigger>
          <TabsTrigger value="completados" data-testid="tab-completados">
            Completados ({completados.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="mt-4">
          {pendientes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarPlus className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No hay servicios pendientes</p>
                <p className="text-muted-foreground">
                  Programe un nuevo servicio para comenzar
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendientes.map((solicitud) => (
                <Card key={solicitud.id} data-testid={`card-solicitud-${solicitud.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {formatDate(solicitud.fechaProgramada)}
                      </CardTitle>
                      {getEstadoBadge(solicitud.estado)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{solicitud.horaInicio}</span>
                      {solicitud.horaFin && <span>- {solicitud.horaFin}</span>}
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="line-clamp-2">{solicitud.origenDireccion}</span>
                    </div>
                    {solicitud.destinoDireccion && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="line-clamp-2">{solicitud.destinoDireccion}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">
                        {servicioCategories.find(c => c.value === solicitud.servicioCategoria)?.label || solicitud.servicioCategoria}
                      </Badge>
                    </div>
                    {solicitud.estado === 'pendiente' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => cancelMutation.mutate(solicitud.id)}
                        disabled={cancelMutation.isPending}
                        data-testid={`button-cancelar-${solicitud.id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="en_progreso" className="mt-4">
          {enProgreso.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No hay servicios en progreso</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enProgreso.map((solicitud) => (
                <Card key={solicitud.id} className="border-primary" data-testid={`card-progreso-${solicitud.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {formatDate(solicitud.fechaProgramada)}
                      </CardTitle>
                      {getEstadoBadge(solicitud.estado)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{solicitud.horaInicio}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="line-clamp-2">{solicitud.origenDireccion}</span>
                    </div>
                    <Badge variant="default" className="w-full justify-center">
                      <Truck className="h-3 w-3 mr-1" />
                      Operador en camino
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completados" className="mt-4">
          {completados.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No hay servicios completados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completados.map((solicitud) => (
                <Card key={solicitud.id} data-testid={`card-completado-${solicitud.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {formatDate(solicitud.fechaProgramada)}
                      </CardTitle>
                      {getEstadoBadge(solicitud.estado)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="line-clamp-2">{solicitud.origenDireccion}</span>
                    </div>
                    <Badge variant="outline">
                      {servicioCategories.find(c => c.value === solicitud.servicioCategoria)?.label || solicitud.servicioCategoria}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
