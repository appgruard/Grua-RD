import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, getApiUrl } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Filter,
  FileText,
  MapPin,
  Car,
  Building2,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Servicio, Documento } from '@shared/schema';

interface ServicioWithDetails extends Servicio {
  cliente?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    phone?: string;
    cedula?: string;
  };
}

type StatusFilter = 'all' | 'pendiente' | 'aprobado' | 'rechazado';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  licencia: 'Licencia de Conducir',
  poliza: 'Póliza de Seguro',
  foto_perfil: 'Foto de Perfil',
  cedula_frontal: 'Cédula (Frente)',
  cedula_trasera: 'Cédula (Reverso)',
  seguro_cliente: 'Seguro del Cliente',
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  carro: 'Carro',
  motor: 'Motor',
  jeep: 'Jeep',
  camion: 'Camión',
};

export default function AdminInsurance() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedService, setSelectedService] = useState<ServicioWithDetails | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null);

  const { data: pendingServices = [], isLoading: loadingPending } = useQuery<ServicioWithDetails[]>({
    queryKey: ['/api/admin/servicios/pendientes-aseguradora'],
  });

  const { data: allInsuranceServices = [], isLoading: loadingAll } = useQuery<ServicioWithDetails[]>({
    queryKey: ['/api/admin/servicios/aseguradora/all'],
  });

  const { data: serviceDocuments = [], isLoading: loadingDocs, refetch: refetchDocs } = useQuery<Documento[]>({
    queryKey: ['/api/admin/servicios', selectedService?.id, 'documentos'],
    enabled: !!selectedService && isReviewOpen,
  });

  // Refetch documents when selected service changes
  useEffect(() => {
    if (selectedService && isReviewOpen) {
      refetchDocs();
    }
  }, [selectedService?.id, isReviewOpen]);

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/admin/servicios/${id}/aseguradora/aprobar`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servicios/pendientes-aseguradora'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servicios/aseguradora/all'] });
      toast({
        title: 'Solicitud aprobada',
        description: 'La póliza de seguro ha sido aprobada. El cliente ha sido notificado.',
      });
      setIsReviewOpen(false);
      setSelectedService(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo aprobar la solicitud',
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, motivoRechazo }: { id: string; motivoRechazo: string }) => {
      return apiRequest('POST', `/api/admin/servicios/${id}/aseguradora/rechazar`, { motivoRechazo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servicios/pendientes-aseguradora'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servicios/aseguradora/all'] });
      toast({
        title: 'Solicitud rechazada',
        description: 'La póliza de seguro ha sido rechazada. El cliente ha sido notificado.',
      });
      setIsRejectDialogOpen(false);
      setIsReviewOpen(false);
      setRejectReason('');
      setSelectedService(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo rechazar la solicitud',
        variant: 'destructive',
      });
    },
  });

  const handleReview = (service: ServicioWithDetails) => {
    setSelectedService(service);
    setIsReviewOpen(true);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  const handlePreviewDocument = async (doc: Documento) => {
    try {
      const response = await fetch(getApiUrl(`/api/documents/download/${doc.id}`), {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewDoc(doc);
      } else {
        toast({
          title: 'Error al cargar preview',
          description: 'No se pudo cargar la vista previa del documento',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: 'Error al cargar preview',
        description: 'No se pudo cargar la vista previa del documento',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = () => {
    if (!selectedService) return;
    approveMutation.mutate(selectedService.id);
  };

  const handleReject = () => {
    if (!selectedService || !rejectReason.trim()) {
      toast({
        title: 'Error',
        description: 'Debes proporcionar un motivo de rechazo',
        variant: 'destructive',
      });
      return;
    }
    rejectMutation.mutate({
      id: selectedService.id,
      motivoRechazo: rejectReason,
    });
  };

  const combinedServices = statusFilter === 'pendiente' 
    ? pendingServices 
    : statusFilter === 'all' 
      ? allInsuranceServices 
      : allInsuranceServices.filter(s => s.aseguradoraEstado === statusFilter);

  const filteredServices = combinedServices.filter((service) => {
    const matchesSearch =
      !searchTerm ||
      service.cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.cliente?.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.aseguradoraNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.aseguradoraPoliza?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: allInsuranceServices.length,
    pendiente: allInsuranceServices.filter((s) => s.aseguradoraEstado === 'pendiente').length,
    aprobado: allInsuranceServices.filter((s) => s.aseguradoraEstado === 'aprobado').length,
    rechazado: allInsuranceServices.filter((s) => s.aseguradoraEstado === 'rechazado').length,
  };

  const getStatusBadge = (estado: string | null) => {
    switch (estado) {
      case 'aprobado':
        return (
          <Badge variant="default" className="gap-1" data-testid="badge-aprobado">
            <CheckCircle className="w-3 h-3" />
            Aprobado
          </Badge>
        );
      case 'rechazado':
        return (
          <Badge variant="destructive" className="gap-1" data-testid="badge-rechazado">
            <XCircle className="w-3 h-3" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1" data-testid="badge-pendiente">
            <Clock className="w-3 h-3" />
            Pendiente
          </Badge>
        );
    }
  };

  const isLoading = loadingPending || loadingAll;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Validación de Aseguradoras</h1>
        <p className="text-muted-foreground">
          Revisa y aprueba las solicitudes de servicio con pólizas de seguro
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold" data-testid="stat-total">
                {stats.total}
              </p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="stat-pendiente">
                {stats.pendiente}
              </p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="stat-aprobado">
                {stats.aprobado}
              </p>
              <p className="text-sm text-muted-foreground">Aprobados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="stat-rechazado">
                {stats.rechazado}
              </p>
              <p className="text-sm text-muted-foreground">Rechazados</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, aseguradora o póliza..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="aprobado">Aprobados</SelectItem>
              <SelectItem value="rechazado">Rechazados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No se encontraron solicitudes de aseguradora</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Aseguradora</TableHead>
                  <TableHead>Póliza</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {service.cliente?.nombre} {service.cliente?.apellido}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {service.cliente?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <p className="font-medium">{service.aseguradoraNombre || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-sm">{service.aseguradoraPoliza || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-muted-foreground" />
                        <p>{service.tipoVehiculo ? VEHICLE_TYPE_LABELS[service.tipoVehiculo] : '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(service.aseguradoraEstado)}</TableCell>
                    <TableCell>
                      {format(new Date(service.createdAt), 'dd MMM yyyy, HH:mm', {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReview(service)}
                        data-testid={`button-review-${service.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Revisión de Solicitud con Aseguradora
            </DialogTitle>
            <DialogDescription>
              Revisa los datos del servicio y los documentos asociados antes de aprobar o rechazar
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Datos del Cliente
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Nombre:</span> {selectedService.cliente?.nombre} {selectedService.cliente?.apellido}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedService.cliente?.email}</p>
                    {selectedService.cliente?.phone && (
                      <p><span className="text-muted-foreground">Teléfono:</span> {selectedService.cliente.phone}</p>
                    )}
                    {selectedService.cliente?.cedula && (
                      <p><span className="text-muted-foreground">Cédula:</span> {selectedService.cliente.cedula}</p>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Datos de Aseguradora
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Aseguradora:</span> {selectedService.aseguradoraNombre || '-'}</p>
                    <p><span className="text-muted-foreground">No. Póliza:</span> {selectedService.aseguradoraPoliza || '-'}</p>
                    <p><span className="text-muted-foreground">Estado:</span> {getStatusBadge(selectedService.aseguradoraEstado)}</p>
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Detalles del Servicio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Origen:</p>
                    <p>{selectedService.origenDireccion}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Destino:</p>
                    <p>{selectedService.destinoDireccion}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Tipo de Vehículo:</p>
                    <p>{selectedService.tipoVehiculo ? VEHICLE_TYPE_LABELS[selectedService.tipoVehiculo] : '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Distancia:</p>
                    <p>{selectedService.distanciaKm} km</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Costo Estimado:</p>
                    <p className="font-bold text-primary">RD$ {parseFloat(selectedService.costoTotal).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Fecha de Solicitud:</p>
                    <p>{format(new Date(selectedService.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documentos Asociados
                </h3>
                {loadingDocs ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : serviceDocuments.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No hay documentos asociados a este servicio
                  </p>
                ) : (
                  <div className="space-y-2">
                    {serviceDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                        data-testid={`doc-item-${doc.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{DOCUMENT_TYPE_LABELS[doc.tipo] || doc.tipo}</p>
                            <p className="text-sm text-muted-foreground">{doc.nombreArchivo}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewDocument(doc)}
                          data-testid={`button-preview-doc-${doc.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {previewUrl && previewDoc && (
                  <div className="mt-4 p-4 border rounded-md bg-muted">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium">{DOCUMENT_TYPE_LABELS[previewDoc.tipo] || previewDoc.tipo}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPreviewUrl(null);
                          setPreviewDoc(null);
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                    {previewDoc.nombreArchivo.toLowerCase().endsWith('.pdf') ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-[400px] border rounded"
                        title="Document preview"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Document preview"
                        className="w-full h-auto max-h-[400px] object-contain rounded"
                      />
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedService?.aseguradoraEstado === 'pendiente' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setIsRejectDialogOpen(true)}
                  disabled={rejectMutation.isPending || approveMutation.isPending}
                  data-testid="button-reject"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  variant="default"
                  onClick={handleApprove}
                  disabled={rejectMutation.isPending || approveMutation.isPending}
                  data-testid="button-approve"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud de Aseguradora</DialogTitle>
            <DialogDescription>
              Proporciona un motivo por el cual estás rechazando esta solicitud.
              El cliente recibirá esta información y podrá realizar una nueva solicitud.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Ejemplo: La póliza no cubre servicios de grúa, el número de póliza es inválido..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            data-testid="textarea-reject-reason"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
