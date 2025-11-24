import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
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
  FileText,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Download,
  Filter,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Documento } from '@shared/schema';

interface ExtendedDocumento extends Documento {
  usuario?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  conductor?: {
    id: string;
    user: {
      id: string;
      nombre: string;
      apellido: string;
      email: string;
    };
  };
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  licencia: 'Licencia de Conducir',
  matricula: 'Matrícula del Vehículo',
  poliza: 'Póliza de Seguro',
  seguro_grua: 'Seguro de la Grúa',
  foto_vehiculo: 'Foto del Vehículo',
  foto_perfil: 'Foto de Perfil',
  cedula_frontal: 'Cédula (Frente)',
  cedula_trasera: 'Cédula (Reverso)',
};

type StatusFilter = 'all' | 'pendiente' | 'aprobado' | 'rechazado';

export default function AdminDocuments() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDoc, setSelectedDoc] = useState<ExtendedDocumento | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: allDocuments = [], isLoading } = useQuery<ExtendedDocumento[]>({
    queryKey: ['/api/admin/documents/all'],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, estado, motivoRechazo }: { id: string; estado: 'aprobado' | 'rechazado'; motivoRechazo?: string }) => {
      return apiRequest('PUT', `/api/documents/${id}/status`, {
        estado,
        motivoRechazo,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents/all'] });
      toast({
        title: variables.estado === 'aprobado' ? 'Documento aprobado' : 'Documento rechazado',
        description: `El documento ha sido ${variables.estado} correctamente`,
      });
      setIsPreviewOpen(false);
      setIsRejectDialogOpen(false);
      setRejectReason('');
      setSelectedDoc(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo procesar la solicitud',
        variant: 'destructive',
      });
    },
  });

  const handlePreview = async (doc: ExtendedDocumento) => {
    setSelectedDoc(doc);
    setIsPreviewOpen(true);
    
    try {
      const response = await fetch(`/api/documents/download/${doc.id}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
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
    if (!selectedDoc) return;
    reviewMutation.mutate({ id: selectedDoc.id, estado: 'aprobado' });
  };

  const handleReject = () => {
    if (!selectedDoc || !rejectReason.trim()) {
      toast({
        title: 'Error',
        description: 'Debes proporcionar un motivo de rechazo',
        variant: 'destructive',
      });
      return;
    }
    reviewMutation.mutate({
      id: selectedDoc.id,
      estado: 'rechazado',
      motivoRechazo: rejectReason,
    });
  };

  const filteredDocuments = allDocuments.filter((doc) => {
    const matchesStatus = statusFilter === 'all' || doc.estado === statusFilter;
    const user = doc.conductor?.user || doc.usuario;
    const matchesSearch =
      !searchTerm ||
      user?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      DOCUMENT_TYPE_LABELS[doc.tipo]?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: allDocuments.length,
    pendiente: allDocuments.filter((d) => d.estado === 'pendiente').length,
    aprobado: allDocuments.filter((d) => d.estado === 'aprobado').length,
    rechazado: allDocuments.filter((d) => d.estado === 'rechazado').length,
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return (
          <Badge variant="default" className="gap-1" data-testid={`badge-aprobado`}>
            <CheckCircle className="w-3 h-3" />
            Aprobado
          </Badge>
        );
      case 'rechazado':
        return (
          <Badge variant="destructive" className="gap-1" data-testid={`badge-rechazado`}>
            <XCircle className="w-3 h-3" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1" data-testid={`badge-pendiente`}>
            <Clock className="w-3 h-3" />
            Pendiente
          </Badge>
        );
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestión de Documentos</h1>
        <p className="text-muted-foreground">
          Revisa y aprueba los documentos subidos por los conductores
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
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
              placeholder="Buscar por nombre, email o tipo de documento..."
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
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No se encontraron documentos</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Tipo de Documento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Subida</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const user = doc.conductor?.user || doc.usuario;
                  return (
                  <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {user?.nombre} {user?.apellido}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {DOCUMENT_TYPE_LABELS[doc.tipo] || doc.tipo}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {doc.nombreArchivo}
                      </p>
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.estado)}</TableCell>
                    <TableCell>
                      {format(new Date(doc.createdAt), 'dd MMM yyyy, HH:mm', {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(doc)}
                        data-testid={`button-preview-${doc.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedDoc && DOCUMENT_TYPE_LABELS[selectedDoc.tipo]}
            </DialogTitle>
            <DialogDescription>
              {selectedDoc && (() => {
                const user = selectedDoc.conductor?.user || selectedDoc.usuario;
                return (
                  <>
                    Subido por {user?.nombre}{' '}
                    {user?.apellido} el{' '}
                    {format(new Date(selectedDoc.createdAt), 'dd MMM yyyy', {
                      locale: es,
                    })}
                  </>
                );
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {selectedDoc?.estado === 'rechazado' && selectedDoc.motivoRechazo && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm font-medium text-destructive mb-1">
                  Motivo de rechazo:
                </p>
                <p className="text-sm text-destructive/90">
                  {selectedDoc.motivoRechazo}
                </p>
              </div>
            )}

            {previewUrl ? (
              <div className="border rounded-md overflow-hidden bg-muted">
                {selectedDoc?.nombreArchivo.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[500px]"
                    title="Document preview"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Document preview"
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-md">
                <p className="text-muted-foreground">Cargando vista previa...</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {selectedDoc?.estado === 'pendiente' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setIsRejectDialogOpen(true)}
                  disabled={reviewMutation.isPending}
                  data-testid="button-reject"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  variant="default"
                  onClick={handleApprove}
                  disabled={reviewMutation.isPending}
                  data-testid="button-approve"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Documento</DialogTitle>
            <DialogDescription>
              Proporciona un motivo por el cual estás rechazando este documento.
              El conductor recibirá esta información.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Ejemplo: La imagen está borrosa, por favor sube una foto más clara..."
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
              disabled={!rejectReason.trim() || reviewMutation.isPending}
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
