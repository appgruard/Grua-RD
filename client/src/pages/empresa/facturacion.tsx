import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  DollarSign, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Factura {
  id: string;
  numeroFactura: string;
  periodo: string;
  fechaEmision: string;
  fechaVencimiento: string;
  totalServicios: number;
  subtotal: string;
  descuento: string;
  itbis: string;
  total: string;
  estado: string;
  fechaPago?: string;
  metodoPago?: string;
}

interface FacturaDetalle extends Factura {
  items?: Array<{
    id: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: string;
    subtotal: string;
  }>;
}

const estadoLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagada',
  vencido: 'Vencida',
  anulado: 'Anulada',
};

const estadoColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendiente: 'secondary',
  pagado: 'outline',
  vencido: 'destructive',
  anulado: 'destructive',
};

export default function EmpresaFacturacion() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFactura, setSelectedFactura] = useState<FacturaDetalle | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: facturas = [], isLoading } = useQuery<Factura[]>({
    queryKey: ['/api/empresa/facturas'],
  });

  const { data: profile } = useQuery({
    queryKey: ['/api/empresa/profile'],
  });

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

  const getPeriodoLabel = (periodo: string) => {
    const [year, month] = periodo.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const filteredFacturas = facturas.filter((f) => {
    const matchesSearch =
      f.numeroFactura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPeriodoLabel(f.periodo).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendientes = filteredFacturas.filter(f => f.estado === 'pendiente' || f.estado === 'vencido');
  const pagadas = filteredFacturas.filter(f => f.estado === 'pagado');

  const totalPendiente = pendientes.reduce((acc, f) => acc + parseFloat(f.total || '0'), 0);
  const totalPagado = pagadas.reduce((acc, f) => acc + parseFloat(f.total || '0'), 0);

  const openDetail = async (factura: Factura) => {
    setSelectedFactura(factura as FacturaDetalle);
    setIsDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-facturacion-title">
          Facturación
        </h1>
        <p className="text-muted-foreground">
          Consulte y gestione las facturas de su empresa
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-pendiente">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Pagar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalPendiente.toString())}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendientes.length} factura(s) pendiente(s)
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-pagado">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPagado.toString())}
            </div>
            <p className="text-xs text-muted-foreground">
              {pagadas.length} factura(s) pagada(s)
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-limite-credito">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Límite de Crédito</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency((profile as any)?.limiteCredito || '0')}
            </div>
            <p className="text-xs text-muted-foreground">
              Días de crédito: {(profile as any)?.diasCredito || 30}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar facturas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-buscar-facturas"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-estado-filter">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="pagado">Pagada</SelectItem>
            <SelectItem value="vencido">Vencida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="todas" className="w-full">
        <TabsList>
          <TabsTrigger value="todas" data-testid="tab-todas">
            Todas ({filteredFacturas.length})
          </TabsTrigger>
          <TabsTrigger value="pendientes" data-testid="tab-pendientes">
            Pendientes ({pendientes.length})
          </TabsTrigger>
          <TabsTrigger value="pagadas" data-testid="tab-pagadas">
            Pagadas ({pagadas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="mt-4">
          <FacturasTable 
            facturas={filteredFacturas} 
            onViewDetail={openDetail}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            getPeriodoLabel={getPeriodoLabel}
          />
        </TabsContent>

        <TabsContent value="pendientes" className="mt-4">
          <FacturasTable 
            facturas={pendientes} 
            onViewDetail={openDetail}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            getPeriodoLabel={getPeriodoLabel}
          />
        </TabsContent>

        <TabsContent value="pagadas" className="mt-4">
          <FacturasTable 
            facturas={pagadas} 
            onViewDetail={openDetail}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            getPeriodoLabel={getPeriodoLabel}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Factura</DialogTitle>
          </DialogHeader>
          {selectedFactura && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Número de Factura</p>
                  <p className="font-medium">{selectedFactura.numeroFactura}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-medium">{getPeriodoLabel(selectedFactura.periodo)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Emisión</p>
                  <p className="font-medium">{formatDate(selectedFactura.fechaEmision)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                  <p className="font-medium">{formatDate(selectedFactura.fechaVencimiento)}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Servicios ({selectedFactura.totalServicios})</span>
                  <span>{formatCurrency(selectedFactura.subtotal)}</span>
                </div>
                {parseFloat(selectedFactura.descuento || '0') > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento</span>
                    <span>-{formatCurrency(selectedFactura.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>ITBIS (18%)</span>
                  <span>{formatCurrency(selectedFactura.itbis)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedFactura.total)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Badge variant={estadoColors[selectedFactura.estado] || 'secondary'}>
                  {estadoLabels[selectedFactura.estado] || selectedFactura.estado}
                </Badge>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>

              {selectedFactura.estado === 'pagado' && selectedFactura.fechaPago && (
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Pagada el {formatDate(selectedFactura.fechaPago)}
                    {selectedFactura.metodoPago && ` vía ${selectedFactura.metodoPago}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FacturasTable({ 
  facturas, 
  onViewDetail,
  formatDate,
  formatCurrency,
  getPeriodoLabel,
}: { 
  facturas: Factura[]; 
  onViewDetail: (f: Factura) => void;
  formatDate: (d: string) => string;
  formatCurrency: (v: string) => string;
  getPeriodoLabel: (p: string) => string;
}) {
  if (facturas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No hay facturas</p>
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
                <TableHead>Factura</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Servicios</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturas.map((factura) => (
                <TableRow key={factura.id} data-testid={`row-factura-${factura.id}`}>
                  <TableCell className="font-medium">
                    {factura.numeroFactura}
                  </TableCell>
                  <TableCell>{getPeriodoLabel(factura.periodo)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(factura.fechaVencimiento)}
                    </div>
                  </TableCell>
                  <TableCell>{factura.totalServicios}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(factura.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={estadoColors[factura.estado] || 'secondary'}>
                      {estadoLabels[factura.estado] || factura.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetail(factura)}
                      data-testid={`button-ver-${factura.id}`}
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
