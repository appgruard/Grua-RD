import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AseguradoraLayout } from '@/components/layout/AseguradoraLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Receipt,
  FileText,
  CreditCard,
  DollarSign,
} from 'lucide-react';

interface ServicioAseguradora {
  id: string;
  servicioId: string;
  numeroPoliza: string;
  montoAprobado: string | null;
  estadoPago: string;
  numeroFactura: string | null;
  fechaFactura: string | null;
  fechaPago: string | null;
  fechaAprobacion: string | null;
  servicio?: {
    id: string;
    tipoServicio: string;
    vehiculoPlaca: string;
    cliente?: {
      nombre: string;
      apellido: string;
    };
  };
}

function FacturacionContent() {
  const { toast } = useToast();
  const [selectedServicio, setSelectedServicio] = useState<ServicioAseguradora | null>(null);
  const [showFacturarDialog, setShowFacturarDialog] = useState(false);
  const [showPagarDialog, setShowPagarDialog] = useState(false);
  const [numeroFactura, setNumeroFactura] = useState('');

  const { data: servicios, isLoading } = useQuery<ServicioAseguradora[]>({
    queryKey: ['/api/aseguradora/servicios'],
  });

  const aprobados = servicios?.filter(s => s.aprobadoPor);
  const pendientesFactura = aprobados?.filter(s => s.estadoPago === 'pendiente_facturar');
  const facturados = aprobados?.filter(s => s.estadoPago === 'facturado');
  const pagados = aprobados?.filter(s => s.estadoPago === 'pagado');

  const facturarMutation = useMutation({
    mutationFn: async ({ id, numeroFactura }: { id: string; numeroFactura: string }) => {
      return apiRequest('POST', `/api/aseguradora/servicios/${id}/facturar`, { numeroFactura });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aseguradora/servicios'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aseguradora/dashboard'] });
      toast({
        title: 'Servicio facturado',
        description: 'El servicio ha sido marcado como facturado.',
      });
      setShowFacturarDialog(false);
      setSelectedServicio(null);
      setNumeroFactura('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo facturar el servicio.',
        variant: 'destructive',
      });
    },
  });

  const pagarMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/aseguradora/servicios/${id}/pagar`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aseguradora/servicios'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aseguradora/dashboard'] });
      toast({
        title: 'Pago registrado',
        description: 'El servicio ha sido marcado como pagado.',
      });
      setShowPagarDialog(false);
      setSelectedServicio(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar el pago.',
        variant: 'destructive',
      });
    },
  });

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const handleFacturar = () => {
    if (!selectedServicio || !numeroFactura) return;
    facturarMutation.mutate({ id: selectedServicio.id, numeroFactura });
  };

  const handlePagar = () => {
    if (!selectedServicio) return;
    pagarMutation.mutate(selectedServicio.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const renderTable = (items: ServicioAseguradora[] | undefined, showActions: 'facturar' | 'pagar' | null) => {
    if (!items?.length) {
      return (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No hay servicios en este estado</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Servicio</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Póliza</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Factura</TableHead>
            <TableHead>Fecha</TableHead>
            {showActions && <TableHead>Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((servicio) => (
            <TableRow key={servicio.id} data-testid={`row-service-${servicio.id}`}>
              <TableCell>
                <div>
                  <p className="font-medium">{servicio.servicio?.tipoServicio}</p>
                  <p className="text-xs text-muted-foreground">#{servicio.servicioId?.slice(-8)}</p>
                </div>
              </TableCell>
              <TableCell>
                {servicio.servicio?.cliente?.nombre} {servicio.servicio?.cliente?.apellido}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{servicio.numeroPoliza}</Badge>
              </TableCell>
              <TableCell className="font-semibold">
                {formatCurrency(servicio.montoAprobado)}
              </TableCell>
              <TableCell>{servicio.numeroFactura || '-'}</TableCell>
              <TableCell>
                {showActions === 'pagar' && servicio.fechaFactura
                  ? new Date(servicio.fechaFactura).toLocaleDateString('es-DO')
                  : servicio.fechaPago
                    ? new Date(servicio.fechaPago).toLocaleDateString('es-DO')
                    : servicio.fechaAprobacion
                      ? new Date(servicio.fechaAprobacion).toLocaleDateString('es-DO')
                      : '-'}
              </TableCell>
              {showActions && (
                <TableCell>
                  {showActions === 'facturar' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedServicio(servicio);
                        setShowFacturarDialog(true);
                      }}
                      data-testid={`button-facturar-${servicio.id}`}
                    >
                      <Receipt className="h-4 w-4 mr-1" />
                      Facturar
                    </Button>
                  )}
                  {showActions === 'pagar' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedServicio(servicio);
                        setShowPagarDialog(true);
                      }}
                      data-testid={`button-pagar-${servicio.id}`}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Registrar Pago
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const totalPendiente = pendientesFactura?.reduce((sum, s) => sum + parseFloat(s.montoAprobado || '0'), 0) || 0;
  const totalFacturado = facturados?.reduce((sum, s) => sum + parseFloat(s.montoAprobado || '0'), 0) || 0;
  const totalPagado = pagados?.reduce((sum, s) => sum + parseFloat(s.montoAprobado || '0'), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Facturación
        </h2>
        <p className="text-muted-foreground">
          Gestiona la facturación y pagos de servicios aprobados
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-stat-pending-invoice">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente Factura</CardTitle>
            <Receipt className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-invoice-amount">{formatCurrency(totalPendiente)}</div>
            <p className="text-xs text-muted-foreground">{pendientesFactura?.length || 0} servicios</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-invoiced">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturado</CardTitle>
            <FileText className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-invoiced-amount">{formatCurrency(totalFacturado)}</div>
            <p className="text-xs text-muted-foreground">{facturados?.length || 0} servicios</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-paid">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagado</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-paid-amount">{formatCurrency(totalPagado)}</div>
            <p className="text-xs text-muted-foreground">{pagados?.length || 0} servicios</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="pendientes">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pendientes" data-testid="tab-pendientes">
                Pendientes ({pendientesFactura?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="facturados" data-testid="tab-facturados">
                Facturados ({facturados?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="pagados" data-testid="tab-pagados">
                Pagados ({pagados?.length || 0})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pendientes" className="mt-4">
              {renderTable(pendientesFactura, 'facturar')}
            </TabsContent>
            <TabsContent value="facturados" className="mt-4">
              {renderTable(facturados, 'pagar')}
            </TabsContent>
            <TabsContent value="pagados" className="mt-4">
              {renderTable(pagados, null)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showFacturarDialog} onOpenChange={setShowFacturarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Factura</DialogTitle>
            <DialogDescription>
              Ingresa el número de factura para este servicio.
            </DialogDescription>
          </DialogHeader>
          
          {selectedServicio && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Servicio</p>
                    <p className="font-medium">{selectedServicio.servicio?.tipoServicio}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monto</p>
                    <p className="font-medium">{formatCurrency(selectedServicio.montoAprobado)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Número de Factura</label>
                <Input
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="Ej: FAC-2024-001"
                  data-testid="input-numero-factura"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFacturarDialog(false)} data-testid="button-cancel-facturar">
              Cancelar
            </Button>
            <Button
              onClick={handleFacturar}
              disabled={!numeroFactura || facturarMutation.isPending}
              data-testid="button-confirm-facturar"
            >
              {facturarMutation.isPending ? 'Guardando...' : 'Registrar Factura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPagarDialog} onOpenChange={setShowPagarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Confirma que el pago de este servicio ha sido recibido.
            </DialogDescription>
          </DialogHeader>
          
          {selectedServicio && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Factura</p>
                  <p className="font-medium">{selectedServicio.numeroFactura}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="font-medium">{formatCurrency(selectedServicio.montoAprobado)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagarDialog(false)} data-testid="button-cancel-pagar">
              Cancelar
            </Button>
            <Button
              onClick={handlePagar}
              disabled={pagarMutation.isPending}
              data-testid="button-confirm-pagar"
            >
              {pagarMutation.isPending ? 'Guardando...' : 'Confirmar Pago Recibido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AseguradoraFacturacion() {
  return (
    <AseguradoraLayout>
      <FacturacionContent />
    </AseguradoraLayout>
  );
}
