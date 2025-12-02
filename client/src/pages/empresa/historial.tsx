import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, History, Download, Filter, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ServicioHistory {
  id: string;
  fechaProgramada: string;
  horaInicio: string;
  origenDireccion: string;
  destinoDireccion?: string;
  servicioCategoria: string;
  estado: string;
  descripcion?: string;
}

const servicioCategories = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'remolque_estandar', label: 'Remolque Estándar' },
  { value: 'auxilio_vial', label: 'Auxilio Vial' },
  { value: 'remolque_especializado', label: 'Remolque Especializado' },
  { value: 'vehiculos_pesados', label: 'Vehículos Pesados' },
  { value: 'maquinarias', label: 'Maquinarias' },
  { value: 'izaje_construccion', label: 'Izaje Construcción' },
  { value: 'remolque_recreativo', label: 'Remolque Recreativo' },
];

const estadoFilters = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'ejecutado', label: 'Ejecutado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
];

export default function EmpresaHistorial() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: historial = [], isLoading } = useQuery<ServicioHistory[]>({
    queryKey: ['/api/empresa/historial'],
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
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

  const getCategoryLabel = (value: string) => {
    return servicioCategories.find(c => c.value === value)?.label || value;
  };

  const filteredHistorial = historial.filter((servicio) => {
    const matchesSearch =
      servicio.origenDireccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.destinoDireccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || servicio.servicioCategoria === categoryFilter;

    const matchesStatus =
      statusFilter === 'all' || servicio.estado === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1 max-w-md" />
          <Skeleton className="h-10 w-40" />
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
          <h1 className="text-3xl font-bold" data-testid="text-historial-title">
            Historial de Servicios
          </h1>
          <p className="text-muted-foreground">
            Consulte todos los servicios realizados por su empresa
          </p>
        </div>
        <Button variant="outline" data-testid="button-exportar">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-buscar-historial"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-testid="select-categoria-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Tipo de servicio" />
          </SelectTrigger>
          <SelectContent>
            {servicioCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-estado-filter">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {estadoFilters.map((estado) => (
              <SelectItem key={estado.value} value={estado.value}>
                {estado.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Servicios ({filteredHistorial.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistorial.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay servicios en el historial</p>
              <p className="text-muted-foreground">
                Los servicios completados aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistorial.map((servicio) => (
                    <TableRow key={servicio.id} data-testid={`row-historial-${servicio.id}`}>
                      <TableCell className="font-medium">
                        {formatDate(servicio.fechaProgramada)}
                      </TableCell>
                      <TableCell>{servicio.horaInicio}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {servicio.origenDireccion}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {servicio.destinoDireccion || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(servicio.servicioCategoria)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getEstadoBadge(servicio.estado)}</TableCell>
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
