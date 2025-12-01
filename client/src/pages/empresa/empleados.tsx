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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Users, Plus, Search, Mail, Shield, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const empleadoSchema = z.object({
  email: z.string().email('Email inválido'),
  rol: z.enum(['admin_empresa', 'supervisor', 'empleado']),
  departamento: z.string().optional(),
  puedeCrearServicios: z.boolean().default(true),
  puedeProgramarServicios: z.boolean().default(true),
  puedeVerFacturas: z.boolean().default(false),
  puedeGestionarEmpleados: z.boolean().default(false),
});

type EmpleadoFormData = z.infer<typeof empleadoSchema>;

interface Empleado {
  id: string;
  userId: string;
  rol: string;
  departamento?: string;
  puedeCrearServicios: boolean;
  puedeProgramarServicios: boolean;
  puedeVerFacturas: boolean;
  puedeGestionarEmpleados: boolean;
  activo: boolean;
  user?: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

const rolLabels: Record<string, string> = {
  admin_empresa: 'Administrador',
  supervisor: 'Supervisor',
  empleado: 'Empleado',
};

const rolColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  admin_empresa: 'default',
  supervisor: 'secondary',
  empleado: 'outline',
};

export default function EmpresaEmpleados() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: empleados = [], isLoading } = useQuery<Empleado[]>({
    queryKey: ['/api/empresa/empleados'],
  });

  const form = useForm<EmpleadoFormData>({
    resolver: zodResolver(empleadoSchema),
    defaultValues: {
      email: '',
      rol: 'empleado',
      departamento: '',
      puedeCrearServicios: true,
      puedeProgramarServicios: true,
      puedeVerFacturas: false,
      puedeGestionarEmpleados: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmpleadoFormData) => {
      return apiRequest('/api/empresa/empleados', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/empresa/empleados'] });
      toast({
        title: 'Empleado agregado',
        description: 'El empleado ha sido agregado exitosamente.',
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo agregar el empleado',
        variant: 'destructive',
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/empresa/empleados/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/empresa/empleados'] });
      toast({
        title: 'Empleado eliminado',
        description: 'El empleado ha sido removido del equipo.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el empleado',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EmpleadoFormData) => {
    createMutation.mutate(data);
  };

  const getInitials = (nombre?: string, apellido?: string) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  const filteredEmpleados = empleados.filter((e) =>
    e.user?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.user?.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.departamento?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-empleados-title">
            Empleados
          </h1>
          <p className="text-muted-foreground">
            Gestione los usuarios autorizados de su empresa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-agregar-empleado">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Agregar Empleado</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email del Empleado</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="empleado@ejemplo.com" 
                          {...field} 
                          data-testid="input-email-empleado"
                        />
                      </FormControl>
                      <FormDescription>
                        El usuario debe estar registrado en Grúa RD
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="rol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-rol">
                              <SelectValue placeholder="Seleccione rol" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="empleado">Empleado</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="admin_empresa">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="departamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Operaciones" 
                            {...field} 
                            data-testid="input-departamento"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <p className="text-sm font-medium">Permisos</p>
                  
                  <FormField
                    control={form.control}
                    name="puedeCrearServicios"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Crear Servicios</FormLabel>
                          <FormDescription>Puede solicitar servicios inmediatos</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="puedeProgramarServicios"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Programar Servicios</FormLabel>
                          <FormDescription>Puede programar servicios futuros</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="puedeVerFacturas"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Ver Facturas</FormLabel>
                          <FormDescription>Puede acceder a la facturación</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="puedeGestionarEmpleados"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Gestionar Empleados</FormLabel>
                          <FormDescription>Puede agregar/remover empleados</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
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
                    data-testid="button-guardar-empleado"
                  >
                    {createMutation.isPending ? 'Guardando...' : 'Agregar Empleado'}
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
            placeholder="Buscar empleados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-buscar-empleados"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipo ({filteredEmpleados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEmpleados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay empleados</p>
              <p className="text-muted-foreground">
                Agregue empleados para que puedan solicitar servicios
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Permisos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmpleados.map((empleado) => (
                    <TableRow key={empleado.id} data-testid={`row-empleado-${empleado.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(empleado.user?.nombre, empleado.user?.apellido)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {empleado.user?.nombre} {empleado.user?.apellido}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {empleado.user?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rolColors[empleado.rol] || 'secondary'}>
                          {rolLabels[empleado.rol] || empleado.rol}
                        </Badge>
                      </TableCell>
                      <TableCell>{empleado.departamento || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {empleado.puedeCrearServicios && (
                            <Badge variant="outline" className="text-xs">Crear</Badge>
                          )}
                          {empleado.puedeProgramarServicios && (
                            <Badge variant="outline" className="text-xs">Programar</Badge>
                          )}
                          {empleado.puedeVerFacturas && (
                            <Badge variant="outline" className="text-xs">Facturas</Badge>
                          )}
                          {empleado.puedeGestionarEmpleados && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={empleado.activo ? 'default' : 'secondary'}>
                          {empleado.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMutation.mutate(empleado.id)}
                          disabled={removeMutation.isPending}
                          data-testid={`button-eliminar-${empleado.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
}
