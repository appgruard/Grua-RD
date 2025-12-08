import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AseguradoraLayout } from '@/components/layout/AseguradoraLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Car,
  MapPin,
  User,
  FileText,
} from 'lucide-react';

interface ServicioAseguradora {
  id: string;
  servicioId: string;
  aseguradoraId: string;
  numeroPoliza: string;
  montoSolicitado: string;
  createdAt: string;
  servicio?: {
    id: string;
    tipoServicio: string;
    origenDireccion: string;
    destinoDireccion: string;
    vehiculoTipo: string;
    vehiculoMarca: string;
    vehiculoModelo: string;
    vehiculoPlaca: string;
    costoTotal: string;
    cliente?: {
      nombre: string;
      apellido: string;
      telefono: string;
    };
  };
}

function PendientesContent() {
  const { toast } = useToast();
  const [selectedServicio, setSelectedServicio] = useState<ServicioAseguradora | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [montoAprobado, setMontoAprobado] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const { data: servicios, isLoading } = useQuery<ServicioAseguradora[]>({
    queryKey: ['/api/aseguradora/servicios/pendientes'],
  });

  const aprobarMutation = useMutation({
    mutationFn: async ({ id, montoAprobado }: { id: string; montoAprobado: string }) => {
      return apiRequest('POST', `/api/aseguradora/servicios/${id}/aprobar`, { montoAprobado });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aseguradora/servicios/pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aseguradora/dashboard'] });
      toast({
        title: 'Servicio aprobado',
        description: 'El servicio ha sido aprobado exitosamente.',
      });
      setShowApproveDialog(false);
      setSelectedServicio(null);
      setMontoAprobado('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo aprobar el servicio.',
        variant: 'destructive',
      });
    },
  });

  const rechazarMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      return apiRequest('POST', `/api/aseguradora/servicios/${id}/rechazar`, { motivo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aseguradora/servicios/pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aseguradora/dashboard'] });
      toast({
        title: 'Servicio rechazado',
        description: 'El servicio ha sido rechazado.',
      });
      setShowRejectDialog(false);
      setSelectedServicio(null);
      setMotivoRechazo('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo rechazar el servicio.',
        variant: 'destructive',
      });
    },
  });

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const handleOpenApprove = (servicio: ServicioAseguradora) => {
    setSelectedServicio(servicio);
    setMontoAprobado(servicio.montoSolicitado || servicio.servicio?.costoTotal || '');
    setShowApproveDialog(true);
  };

  const handleOpenReject = (servicio: ServicioAseguradora) => {
    setSelectedServicio(servicio);
    setShowRejectDialog(true);
  };

  const handleApprove = () => {
    if (!selectedServicio || !montoAprobado) return;
    aprobarMutation.mutate({ id: selectedServicio.id, montoAprobado });
  };

  const handleReject = () => {
    if (!selectedServicio || !motivoRechazo) return;
    rechazarMutation.mutate({ id: selectedServicio.id, motivo: motivoRechazo });
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
          Servicios Pendientes
        </h2>
        <p className="text-muted-foreground">
          Servicios que requieren tu aprobación o rechazo
        </p>
      </div>

      {servicios?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">No hay servicios pendientes</p>
            <p className="text-sm text-muted-foreground">
              Todos los servicios han sido procesados
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {servicios?.length} Servicio{servicios?.length !== 1 ? 's' : ''} Pendiente{servicios?.length !== 1 ? 's' : ''}
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
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicios?.map((servicio) => (
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
                      <div>
                        <p className="font-medium">
                          {servicio.servicio?.cliente?.nombre} {servicio.servicio?.cliente?.apellido}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {servicio.servicio?.cliente?.telefono}
                        </p>
                      </div>
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
                    <TableCell className="font-semibold">
                      {formatCurrency(servicio.montoSolicitado || servicio.servicio?.costoTotal || '0')}
                    </TableCell>
                    <TableCell>
                      {new Date(servicio.createdAt).toLocaleDateString('es-DO')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleOpenApprove(servicio)}
                          data-testid={`button-approve-${servicio.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleOpenReject(servicio)}
                          data-testid={`button-reject-${servicio.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Servicio</DialogTitle>
            <DialogDescription>
              Confirma el monto aprobado para este servicio de grúa.
            </DialogDescription>
          </DialogHeader>
          
          {selectedServicio && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Servicio</p>
                  <p className="font-medium">{selectedServicio.servicio?.tipoServicio}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Póliza</p>
                  <p className="font-medium">{selectedServicio.numeroPoliza}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehículo</p>
                  <p className="font-medium">
                    {selectedServicio.servicio?.vehiculoMarca} {selectedServicio.servicio?.vehiculoModelo}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Solicitado</p>
                  <p className="font-medium">
                    {formatCurrency(selectedServicio.montoSolicitado || selectedServicio.servicio?.costoTotal || '0')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Monto Aprobado (DOP)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={montoAprobado}
                  onChange={(e) => setMontoAprobado(e.target.value)}
                  placeholder="Ingrese el monto aprobado"
                  data-testid="input-monto-aprobado"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} data-testid="button-cancel-approve">
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!montoAprobado || aprobarMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {aprobarMutation.isPending ? 'Aprobando...' : 'Confirmar Aprobación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Servicio</DialogTitle>
            <DialogDescription>
              Indica el motivo por el cual rechazas este servicio.
            </DialogDescription>
          </DialogHeader>
          
          {selectedServicio && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Servicio</p>
                  <p className="font-medium">{selectedServicio.servicio?.tipoServicio}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Póliza</p>
                  <p className="font-medium">{selectedServicio.numeroPoliza}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo del Rechazo</label>
                <Textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Describe el motivo del rechazo..."
                  rows={4}
                  data-testid="input-motivo-rechazo"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} data-testid="button-cancel-reject">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!motivoRechazo || rechazarMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rechazarMutation.isPending ? 'Rechazando...' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AseguradoraPendientes() {
  return (
    <AseguradoraLayout>
      <PendientesContent />
    </AseguradoraLayout>
  );
}
