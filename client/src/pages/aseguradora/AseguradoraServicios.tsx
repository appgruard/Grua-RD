import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AseguradoraLayout } from '@/components/layout/AseguradoraLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface ServicioAseguradora {
  id: string;
  servicioId: string;
  numeroPoliza: string;
  montoSolicitado: string;
  montoAprobado: string | null;
  estadoPago: string;
  aprobadoPor: string | null;
  rechazadoPor: string | null;
  motivoRechazo: string | null;
  numeroFactura: string | null;
  createdAt: string;
  fechaAprobacion: string | null;
  fechaRechazo: string | null;
  servicio?: {
    id: string;
    tipoServicio: string;
    vehiculoMarca: string;
    vehiculoModelo: string;
    vehiculoPlaca: string;
    costoTotal: string;
    cliente?: {
      nombre: string;
      apellido: string;
    };
  };
}

function ServiciosContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: servicios, isLoading } = useQuery<ServicioAseguradora[]>({
    queryKey: ['/api/aseguradora/servicios'],
  });

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getStatus = (servicio: ServicioAseguradora) => {
    if (servicio.rechazadoPor) return 'rechazado';
    if (servicio.aprobadoPor) return 'aprobado';
    return 'pendiente';
  };

  const getStatusBadge = (servicio: ServicioAseguradora) => {
    const status = getStatus(servicio);
    switch (status) {
      case 'aprobado':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid={`badge-status-${servicio.id}`}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobado
          </Badge>
        );
      case 'rechazado':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" data-testid={`badge-status-${servicio.id}`}>
            <XCircle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid={`badge-status-${servicio.id}`}>
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  const filteredServicios = servicios?.filter((servicio) => {
    const matchesSearch =
      servicio.numeroPoliza?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.servicio?.vehiculoPlaca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.servicio?.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || getStatus(servicio) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Todos los Servicios
        </h2>
        <p className="text-muted-foreground">
          Historial completo de servicios asociados a tu aseguradora
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {filteredServicios?.length || 0} Servicios
            </CardTitle>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por póliza, placa..."
                  className="pl-9 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="aprobado">Aprobados</SelectItem>
                  <SelectItem value="rechazado">Rechazados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredServicios?.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay servicios</p>
              <p className="text-sm text-muted-foreground">
                No se encontraron servicios con los filtros aplicados
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Póliza</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServicios?.map((servicio) => (
                  <TableRow key={servicio.id} data-testid={`row-service-${servicio.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{servicio.servicio?.tipoServicio}</p>
                        <p className="text-xs text-muted-foreground">
                          #{servicio.servicioId?.slice(-8)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {servicio.servicio?.cliente?.nombre} {servicio.servicio?.cliente?.apellido}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {servicio.servicio?.vehiculoMarca} {servicio.servicio?.vehiculoModelo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {servicio.servicio?.vehiculoPlaca}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{servicio.numeroPoliza}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">
                          {formatCurrency(servicio.montoAprobado || servicio.montoSolicitado)}
                        </p>
                        {servicio.montoAprobado && servicio.montoAprobado !== servicio.montoSolicitado && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatCurrency(servicio.montoSolicitado)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(servicio)}</TableCell>
                    <TableCell>
                      <div>
                        <p>{new Date(servicio.createdAt).toLocaleDateString('es-DO')}</p>
                        {servicio.fechaAprobacion && (
                          <p className="text-xs text-muted-foreground">
                            Aprobado: {new Date(servicio.fechaAprobacion).toLocaleDateString('es-DO')}
                          </p>
                        )}
                        {servicio.fechaRechazo && (
                          <p className="text-xs text-muted-foreground">
                            Rechazado: {new Date(servicio.fechaRechazo).toLocaleDateString('es-DO')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AseguradoraServicios() {
  return (
    <AseguradoraLayout>
      <ServiciosContent />
    </AseguradoraLayout>
  );
}
