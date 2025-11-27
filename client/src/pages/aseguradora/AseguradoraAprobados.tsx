import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AseguradoraLayout } from '@/components/layout/AseguradoraLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle } from 'lucide-react';

interface ServicioAseguradora {
  id: string;
  servicioId: string;
  numeroPoliza: string;
  montoSolicitado: string;
  montoAprobado: string | null;
  estadoPago: string;
  aprobadoPor: string | null;
  fechaAprobacion: string | null;
  numeroFactura: string | null;
  servicio?: {
    id: string;
    tipoServicio: string;
    vehiculoMarca: string;
    vehiculoModelo: string;
    vehiculoPlaca: string;
    cliente?: {
      nombre: string;
      apellido: string;
    };
  };
}

function AprobadosContent() {
  const { data: servicios, isLoading } = useQuery<ServicioAseguradora[]>({
    queryKey: ['/api/aseguradora/servicios'],
  });

  const aprobados = servicios?.filter(s => s.aprobadoPor);

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getPaymentStatusBadge = (status: string, servicioId: string) => {
    switch (status) {
      case 'pagado':
        return <Badge className="bg-green-100 text-green-800" data-testid={`badge-payment-${servicioId}`}>Pagado</Badge>;
      case 'facturado':
        return <Badge className="bg-blue-100 text-blue-800" data-testid={`badge-payment-${servicioId}`}>Facturado</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800" data-testid={`badge-payment-${servicioId}`}>Pendiente Factura</Badge>;
    }
  };

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
          Servicios Aprobados
        </h2>
        <p className="text-muted-foreground">
          Historial de servicios aprobados y su estado de pago
        </p>
      </div>

      {aprobados?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay servicios aprobados</p>
            <p className="text-sm text-muted-foreground">
              Los servicios aprobados aparecerán aquí
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {aprobados?.length || 0} Servicios Aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Póliza</TableHead>
                  <TableHead>Monto Aprobado</TableHead>
                  <TableHead>Estado Pago</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Fecha Aprobación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aprobados?.map((servicio) => (
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
                        <p>{servicio.servicio?.vehiculoMarca} {servicio.servicio?.vehiculoModelo}</p>
                        <p className="text-xs text-muted-foreground">{servicio.servicio?.vehiculoPlaca}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{servicio.numeroPoliza}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(servicio.montoAprobado)}
                    </TableCell>
                    <TableCell>{getPaymentStatusBadge(servicio.estadoPago, servicio.id)}</TableCell>
                    <TableCell>
                      {servicio.numeroFactura || '-'}
                    </TableCell>
                    <TableCell>
                      {servicio.fechaAprobacion
                        ? new Date(servicio.fechaAprobacion).toLocaleDateString('es-DO')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AseguradoraAprobados() {
  return (
    <AseguradoraLayout>
      <AprobadosContent />
    </AseguradoraLayout>
  );
}
