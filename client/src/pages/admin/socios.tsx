import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Pencil, 
  Power,
  Loader2,
  Calculator,
  CheckCircle,
  Clock,
  Percent,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface SocioStats {
  totalSocios: number;
  sociosActivos: number;
  totalInversion: number;
  totalDistribuido: number;
  pendientePago: number;
}

interface Socio {
  id: string;
  userId: string;
  porcentajeParticipacion: string;
  montoInversion: string;
  fechaInversion: string;
  activo: boolean;
  notas: string | null;
  createdAt: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    telefono: string | null;
  };
}

interface DistribucionPreview {
  ingresosTotales: number;
  comisionEmpresa: number;
  sociosActivos: { id: string; nombre: string; porcentaje: number }[];
}

interface Distribucion {
  id: string;
  socioId: string;
  periodo: string;
  ingresosTotales: string;
  comisionEmpresa: string;
  porcentajeAlMomento: string;
  montoSocio: string;
  estado: 'calculado' | 'aprobado' | 'pagado';
  fechaPago?: string | null;
  metodoPago?: string | null;
  socio: {
    user: {
      nombre: string;
    };
  };
}

const createSocioSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  telefono: z.string().optional(),
  porcentajeParticipacion: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100,
    'Porcentaje debe ser entre 0.01 y 100'
  ),
  montoInversion: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    'Monto debe ser positivo'
  ),
  fechaInversion: z.string().optional(),
  notas: z.string().optional(),
});

const calcularDistribucionSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/, 'Formato: YYYY-MM'),
});

const pagarDistribucionSchema = z.object({
  metodoPago: z.string().min(1, 'Método de pago requerido'),
  referenciaTransaccion: z.string().min(1, 'Referencia requerida'),
});

type CreateSocioForm = z.infer<typeof createSocioSchema>;

export default function AdminSocios() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [calcularDialogOpen, setCalcularDialogOpen] = useState(false);
  const [pagarDialogOpen, setPagarDialogOpen] = useState(false);
  const [selectedDistribucion, setSelectedDistribucion] = useState<string | null>(null);
  const [periodoPreview, setPeriodoPreview] = useState('');
  const [activeTab, setActiveTab] = useState<'socios' | 'distribuciones'>('socios');

  const { data: stats, isLoading: statsLoading } = useQuery<SocioStats>({
    queryKey: ['/api/admin/socios/stats'],
  });

  const { data: socios, isLoading: sociosLoading } = useQuery<Socio[]>({
    queryKey: ['/api/admin/socios'],
  });

  const { data: distribuciones, isLoading: distribucionesLoading } = useQuery<Distribucion[]>({
    queryKey: ['/api/admin/distribuciones'],
  });

  const { data: previewData, isLoading: previewLoading } = useQuery<DistribucionPreview>({
    queryKey: ['/api/admin/distribuciones/preview', periodoPreview],
    enabled: !!periodoPreview && periodoPreview.match(/^\d{4}-\d{2}$/) !== null,
  });

  const createForm = useForm<CreateSocioForm>({
    resolver: zodResolver(createSocioSchema),
    defaultValues: {
      email: '',
      password: '',
      nombre: '',
      telefono: '',
      porcentajeParticipacion: '',
      montoInversion: '0',
      fechaInversion: format(new Date(), 'yyyy-MM-dd'),
      notas: '',
    },
  });

  const createSocioMutation = useMutation({
    mutationFn: async (data: CreateSocioForm) => {
      const res = await apiRequest('POST', '/api/admin/socios', data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al crear socio');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/socios'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/socios/stats'] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: 'Socio creado',
        description: 'El nuevo socio ha sido registrado exitosamente.',
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

  const toggleSocioMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('PUT', `/api/admin/socios/${id}/toggle-activo`, {});
      if (!res.ok) throw new Error('Error al cambiar estado');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/socios'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/socios/stats'] });
      toast({
        title: 'Estado actualizado',
        description: 'El estado del socio ha sido actualizado.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del socio.',
        variant: 'destructive',
      });
    },
  });

  const calcularDistribucionMutation = useMutation({
    mutationFn: async (periodo: string) => {
      const res = await apiRequest('POST', '/api/admin/distribuciones/calcular', { periodo });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al calcular distribuciones');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/distribuciones'] });
      setCalcularDialogOpen(false);
      setPeriodoPreview('');
      toast({
        title: 'Distribuciones calculadas',
        description: 'Las distribuciones han sido calculadas exitosamente.',
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

  const aprobarDistribucionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('PUT', `/api/admin/distribuciones/${id}/aprobar`, {});
      if (!res.ok) throw new Error('Error al aprobar distribución');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/distribuciones'] });
      toast({
        title: 'Distribución aprobada',
        description: 'La distribución ha sido aprobada.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo aprobar la distribución.',
        variant: 'destructive',
      });
    },
  });

  const pagarDistribucionMutation = useMutation({
    mutationFn: async ({ id, metodoPago, referenciaTransaccion }: { id: string; metodoPago: string; referenciaTransaccion: string }) => {
      const res = await apiRequest('PUT', `/api/admin/distribuciones/${id}/pagar`, { metodoPago, referenciaTransaccion });
      if (!res.ok) throw new Error('Error al registrar pago');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/distribuciones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/socios/stats'] });
      setPagarDialogOpen(false);
      setSelectedDistribucion(null);
      toast({
        title: 'Pago registrado',
        description: 'El pago ha sido registrado exitosamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo registrar el pago.',
        variant: 'destructive',
      });
    },
  });

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatPeriodo = (periodo: string) => {
    const [year, month] = periodo.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy', { locale: es });
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pagado':
        return <Badge className="gap-1 bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Pagado</Badge>;
      case 'aprobado':
        return <Badge className="gap-1 bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" />Aprobado</Badge>;
      case 'calculado':
        return <Badge className="gap-1 bg-blue-100 text-blue-800"><Calculator className="w-3 h-3" />Calculado</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getCurrentPeriodo = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const handlePagarClick = (id: string) => {
    setSelectedDistribucion(id);
    setPagarDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-socios-title">
            Gestión de Socios
          </h1>
          <p className="text-muted-foreground">
            Administra socios, inversiones y distribuciones de ganancias
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCalcularDialogOpen(true)} variant="outline" data-testid="button-calcular">
            <Calculator className="w-4 h-4 mr-2" />
            Calcular Distribución
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-crear-socio">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Socio
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card data-testid="card-total-socios">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Total Socios</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSocios || 0}</div>
                <p className="text-xs text-muted-foreground">{stats?.sociosActivos || 0} activos</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-inversion">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Inversión Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.totalInversion || 0)}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-distribuido">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Total Distribuido</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalDistribuido || 0)}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-pendiente-pago">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Pendiente Pago</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats?.pendientePago || 0)}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-participacion-total">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">% Asignado</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {socios?.reduce((sum, s) => sum + parseFloat(s.porcentajeParticipacion), 0).toFixed(2) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {(100 - (socios?.filter(s => s.activo).reduce((sum, s) => sum + parseFloat(s.porcentajeParticipacion), 0) || 0)).toFixed(2)}% disponible
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'socios' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('socios')}
          data-testid="tab-socios"
        >
          Socios
        </Button>
        <Button
          variant={activeTab === 'distribuciones' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('distribuciones')}
          data-testid="tab-distribuciones"
        >
          Distribuciones
        </Button>
      </div>

      {activeTab === 'socios' && (
        <Card data-testid="card-socios-list">
          <CardHeader>
            <CardTitle>Lista de Socios</CardTitle>
            <CardDescription>Gestiona los socios e inversores de la plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {sociosLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : socios?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay socios registrados.</p>
            ) : (
              <div className="space-y-4">
                {socios?.map((socio) => (
                  <div
                    key={socio.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    data-testid={`row-socio-${socio.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{socio.user.nombre}</p>
                        <p className="text-sm text-muted-foreground">{socio.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-bold">{socio.porcentajeParticipacion}%</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(socio.montoInversion)}</p>
                      </div>
                      <Badge variant={socio.activo ? 'default' : 'secondary'}>
                        {socio.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={socio.activo}
                          onCheckedChange={() => toggleSocioMutation.mutate(socio.id)}
                          data-testid={`switch-socio-${socio.id}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'distribuciones' && (
        <Card data-testid="card-distribuciones-list">
          <CardHeader>
            <CardTitle>Distribuciones de Ganancias</CardTitle>
            <CardDescription>Historial de distribuciones calculadas y pagadas</CardDescription>
          </CardHeader>
          <CardContent>
            {distribucionesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : distribuciones?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay distribuciones registradas.</p>
            ) : (
              <div className="space-y-4">
                {distribuciones?.map((dist) => (
                  <div
                    key={dist.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    data-testid={`row-dist-${dist.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{formatPeriodo(dist.periodo)}</p>
                        <p className="text-sm text-muted-foreground">{dist.socio?.user?.nombre || 'Socio'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(dist.montoSocio)}</p>
                        <p className="text-sm text-muted-foreground">{dist.porcentajeAlMomento}%</p>
                      </div>
                      {getEstadoBadge(dist.estado)}
                      <div className="flex gap-2">
                        {dist.estado === 'calculado' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => aprobarDistribucionMutation.mutate(dist.id)}
                            disabled={aprobarDistribucionMutation.isPending}
                            data-testid={`button-aprobar-${dist.id}`}
                          >
                            Aprobar
                          </Button>
                        )}
                        {dist.estado === 'aprobado' && (
                          <Button
                            size="sm"
                            onClick={() => handlePagarClick(dist.id)}
                            data-testid={`button-pagar-${dist.id}`}
                          >
                            Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Socio</DialogTitle>
            <DialogDescription>
              Registra un nuevo socio o inversor en la plataforma
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createSocioMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-nombre" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-telefono" />
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
                      <Input type="email" {...field} data-testid="input-email" />
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
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="porcentajeParticipacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>% Participación</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-porcentaje" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="montoInversion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto Inversión (RD$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-monto" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="fechaInversion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inversión</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-fecha" />
                    </FormControl>
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
                      <Textarea {...field} data-testid="input-notas" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createSocioMutation.isPending} data-testid="button-submit-socio">
                  {createSocioMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear Socio
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={calcularDialogOpen} onOpenChange={setCalcularDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calcular Distribución</DialogTitle>
            <DialogDescription>
              Calcula las distribuciones de ganancias para un período
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Período (YYYY-MM)</Label>
              <Input
                value={periodoPreview}
                onChange={(e) => setPeriodoPreview(e.target.value)}
                placeholder={getCurrentPeriodo()}
                data-testid="input-periodo"
              />
            </div>

            {previewLoading && <Skeleton className="h-20" />}
            
            {previewData && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Ingresos Totales:</span>
                      <span className="font-bold">{formatCurrency(previewData.ingresosTotales || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comisión Empresa:</span>
                      <span className="font-bold">{formatCurrency(previewData.comisionEmpresa || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Socios Activos:</span>
                      <span className="font-bold">{previewData.sociosActivos?.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalcularDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => calcularDistribucionMutation.mutate(periodoPreview)}
              disabled={!periodoPreview || calcularDistribucionMutation.isPending}
              data-testid="button-confirmar-calculo"
            >
              {calcularDistribucionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Calcular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pagarDialogOpen} onOpenChange={setPagarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registra el pago de una distribución
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (selectedDistribucion) {
                pagarDistribucionMutation.mutate({
                  id: selectedDistribucion,
                  metodoPago: formData.get('metodoPago') as string,
                  referenciaTransaccion: formData.get('referenciaTransaccion') as string,
                });
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Método de Pago</Label>
              <Select name="metodoPago" required>
                <SelectTrigger data-testid="select-metodo-pago">
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia/Número de Transacción</Label>
              <Input
                name="referenciaTransaccion"
                required
                placeholder="Ej: TRF-12345"
                data-testid="input-referencia"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPagarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pagarDistribucionMutation.isPending} data-testid="button-confirmar-pago">
                {pagarDistribucionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
