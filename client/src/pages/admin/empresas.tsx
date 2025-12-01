import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Building2, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Power,
  TrendingUp,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const createEmpresaSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  apellido: z.string().optional(),
  phone: z.string().optional(),
  nombreEmpresa: z.string().min(1, 'Nombre de empresa es requerido'),
  rnc: z.string().min(9, 'RNC debe tener al menos 9 caracteres'),
  tipoEmpresa: z.enum([
    'constructora', 'ferreteria', 'logistica', 'turistica',
    'ayuntamiento', 'zona_franca', 'industria', 'rent_car',
    'maquinaria_pesada', 'otro'
  ]),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  emailContacto: z.string().email('Email inválido').optional().or(z.literal('')),
  personaContacto: z.string().optional(),
  limiteCredito: z.string().optional(),
  diasCredito: z.number().optional(),
  descuentoVolumen: z.string().optional(),
});

type CreateEmpresaFormData = z.infer<typeof createEmpresaSchema>;

interface Empresa {
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
  };
}

interface EmpresaStats {
  totalEmpresas: number;
  empresasVerificadas: number;
  empresasPendientes: number;
  empresasActivas: number;
  porTipo: Record<string, number>;
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

export default function AdminEmpresas() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const { toast } = useToast();

  const { data: empresas = [], isLoading } = useQuery<Empresa[]>({
    queryKey: ['/api/admin/empresas'],
  });

  const { data: stats } = useQuery<EmpresaStats>({
    queryKey: ['/api/admin/empresas-stats'],
  });

  const form = useForm<CreateEmpresaFormData>({
    resolver: zodResolver(createEmpresaSchema),
    defaultValues: {
      email: '',
      password: '',
      nombre: '',
      apellido: '',
      phone: '',
      nombreEmpresa: '',
      rnc: '',
      tipoEmpresa: 'otro',
      direccion: '',
      telefono: '',
      emailContacto: '',
      personaContacto: '',
      limiteCredito: '0',
      diasCredito: 30,
      descuentoVolumen: '0',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateEmpresaFormData) => {
      return apiRequest('/api/admin/empresas', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/empresas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/empresas-stats'] });
      toast({
        title: 'Empresa creada',
        description: 'La empresa ha sido creada exitosamente.',
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la empresa',
        variant: 'destructive',
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/empresas/${id}/verificar`, 'PUT');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/empresas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/empresas-stats'] });
      toast({
        title: 'Empresa verificada',
        description: 'La empresa ha sido verificada exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo verificar la empresa',
        variant: 'destructive',
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/empresas/${id}/toggle-activo`, 'PUT');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/empresas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/empresas-stats'] });
      toast({
        title: 'Estado actualizado',
        description: 'El estado de la empresa ha sido actualizado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateEmpresaFormData) => {
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

  const filteredEmpresas = empresas.filter((e) => {
    const matchesSearch =
      e.nombreEmpresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.rnc.includes(searchTerm) ||
      e.user?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === 'all' || e.tipoEmpresa === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  const pendientes = filteredEmpresas.filter(e => !e.verificado);
  const verificadas = filteredEmpresas.filter(e => e.verificado);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-full mb-2" />
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
          <h1 className="text-3xl font-bold" data-testid="text-admin-empresas-title">
            Gestión de Empresas
          </h1>
          <p className="text-muted-foreground">
            Administre las empresas con contratos empresariales
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-nueva-empresa">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Empresa</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-medium mb-3">Datos del Representante</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="apellido"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellido</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-apellido" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Datos de la Empresa</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                      name="rnc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RNC</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-rnc" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="tipoEmpresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Empresa</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tipo">
                              <SelectValue placeholder="Seleccione tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(tipoEmpresaLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
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
                    name="direccion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-direccion" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
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
                    <FormField
                      control={form.control}
                      name="emailContacto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email de Contacto</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-email-contacto" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-medium">Condiciones Comerciales</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="limiteCredito"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Límite de Crédito (RD$)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-limite-credito" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="diasCredito"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Días de Crédito</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-dias-credito" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="descuentoVolumen"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descuento (%)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-descuento" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                    data-testid="button-guardar-empresa"
                  >
                    {createMutation.isPending ? 'Guardando...' : 'Crear Empresa'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-total">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmpresas || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-verificadas">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verificadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.empresasVerificadas || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-pendientes">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.empresasPendientes || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-activas">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.empresasActivas || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RNC o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-buscar"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-48" data-testid="select-tipo-filter">
            <SelectValue placeholder="Tipo de empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(tipoEmpresaLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="todas" className="w-full">
        <TabsList>
          <TabsTrigger value="todas" data-testid="tab-todas">
            Todas ({filteredEmpresas.length})
          </TabsTrigger>
          <TabsTrigger value="pendientes" data-testid="tab-pendientes">
            Pendientes ({pendientes.length})
          </TabsTrigger>
          <TabsTrigger value="verificadas" data-testid="tab-verificadas">
            Verificadas ({verificadas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="mt-4">
          <EmpresasTable 
            empresas={filteredEmpresas}
            onVerify={(id) => verifyMutation.mutate(id)}
            onToggle={(id) => toggleMutation.mutate(id)}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="pendientes" className="mt-4">
          <EmpresasTable 
            empresas={pendientes}
            onVerify={(id) => verifyMutation.mutate(id)}
            onToggle={(id) => toggleMutation.mutate(id)}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="verificadas" className="mt-4">
          <EmpresasTable 
            empresas={verificadas}
            onVerify={(id) => verifyMutation.mutate(id)}
            onToggle={(id) => toggleMutation.mutate(id)}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmpresasTable({
  empresas,
  onVerify,
  onToggle,
  formatDate,
  formatCurrency,
}: {
  empresas: Empresa[];
  onVerify: (id: string) => void;
  onToggle: (id: string) => void;
  formatDate: (d: string) => string;
  formatCurrency: (v: string) => string;
}) {
  if (empresas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No hay empresas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>RNC</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Límite Crédito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Verificación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map((empresa) => (
                <TableRow key={empresa.id} data-testid={`row-empresa-${empresa.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{empresa.nombreEmpresa}</p>
                      <p className="text-xs text-muted-foreground">
                        {empresa.user?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{empresa.rnc}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tipoEmpresaLabels[empresa.tipoEmpresa] || empresa.tipoEmpresa}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(empresa.limiteCredito || '0')}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={empresa.activo}
                      onCheckedChange={() => onToggle(empresa.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {empresa.verificado ? (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verificada
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onVerify(empresa.id)}
                        data-testid={`button-verificar-${empresa.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verificar
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-ver-${empresa.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
