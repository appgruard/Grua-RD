import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, getApiUrl } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FileUpload } from '@/components/FileUpload';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Upload, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Trash2,
  Plus,
  FileText,
  Building2,
  Car
} from 'lucide-react';

interface InsuranceDocument {
  id: string;
  tipo: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  nombreArchivo: string;
  motivoRechazo?: string;
  validoHasta?: string;
  createdAt: string;
}

interface InsuranceStatus {
  hasApprovedInsurance: boolean;
  insuranceDocuments: InsuranceDocument[];
  totalDocuments: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

const insuranceCompanies = [
  'Seguros Reservas',
  'Mapfre BHD',
  'La Colonial',
  'SEMMA',
  'Universal de Seguros',
  'Seguros Patria',
  'Atlantic Insurance',
  'Banreservas Seguros',
  'Otra',
];

export default function ClientInsuranceManager() {
  const { toast } = useToast();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aseguradoraNombre, setAseguradoraNombre] = useState('');
  const [numeroPoliza, setNumeroPoliza] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [vehiculoDescripcion, setVehiculoDescripcion] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const { data: insuranceStatus, isLoading } = useQuery<InsuranceStatus>({
    queryKey: ['/api/client/insurance/status'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(getApiUrl('/api/client/insurance'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al subir documento');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/insurance/status'] });
      setIsUploadDialogOpen(false);
      resetForm();
      toast({
        title: 'Documento subido',
        description: 'Tu documento de seguro ha sido enviado para revision.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await apiRequest('DELETE', `/api/client/insurance/${documentId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al eliminar documento');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/insurance/status'] });
      setDocumentToDelete(null);
      toast({
        title: 'Documento eliminado',
        description: 'Tu documento de seguro ha sido eliminado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setAseguradoraNombre('');
    setNumeroPoliza('');
    setFechaVencimiento('');
    setVehiculoDescripcion('');
  };

  const handleSubmit = () => {
    if (!selectedFile || !aseguradoraNombre || !numeroPoliza) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('aseguradoraNombre', aseguradoraNombre);
    formData.append('numeroPoliza', numeroPoliza);
    if (fechaVencimiento) {
      formData.append('fechaVencimiento', fechaVencimiento);
    }
    if (vehiculoDescripcion) {
      formData.append('vehiculoDescripcion', vehiculoDescripcion);
    }

    uploadMutation.mutate(formData);
  };

  const getStatusBadge = (estado: string | null) => {
    switch (estado) {
      case 'aprobado':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprobado
          </Badge>
        );
      case 'pendiente':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            En revision
          </Badge>
        );
      case 'rechazado':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  const documents = insuranceStatus?.insuranceDocuments || [];
  const hasDocuments = documents.length > 0;

  return (
    <>
      <Card className="p-4 sm:p-6" data-testid="card-client-insurance">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h3 className="text-base sm:text-lg font-semibold">Mis Seguros</h3>
          </div>
          {hasDocuments && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {insuranceStatus && insuranceStatus.approvedCount > 0 && (
                <Badge variant="default" className="bg-green-500 text-xs">
                  {insuranceStatus.approvedCount} aprobado{insuranceStatus.approvedCount > 1 ? 's' : ''}
                </Badge>
              )}
              {insuranceStatus && insuranceStatus.pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {insuranceStatus.pendingCount} pendiente{insuranceStatus.pendingCount > 1 ? 's' : ''}
                </Badge>
              )}
              {insuranceStatus && insuranceStatus.rejectedCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {insuranceStatus.rejectedCount} rechazado{insuranceStatus.rejectedCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>

        {!hasDocuments ? (
          <div className="text-center py-4 sm:py-6 px-2">
            <Building2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
            <p className="text-sm sm:text-base text-muted-foreground mb-3">
              No tienes documentos de seguro registrados.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Sube tu poliza de seguro con cobertura de asistencia vial para poder usar "Aseguradora" como metodo de pago.
            </p>
            <Button 
              onClick={() => setIsUploadDialogOpen(true)} 
              className="w-full sm:w-auto"
              data-testid="button-add-insurance"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Seguro
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                className="p-3 sm:p-4 bg-muted/50 rounded-lg"
                data-testid={`card-insurance-${doc.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex-shrink-0">
                    <Car className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm sm:text-base truncate" data-testid={`text-insurance-name-${doc.id}`}>
                          {doc.nombreArchivo}
                        </p>
                        <div className="flex-shrink-0">
                          {getStatusBadge(doc.estado)}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Subido el {new Date(doc.createdAt).toLocaleDateString('es-DO')}
                      </p>
                      {doc.validoHasta && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Valido hasta: {new Date(doc.validoHasta).toLocaleDateString('es-DO')}
                        </p>
                      )}
                    </div>

                    {doc.estado === 'rechazado' && doc.motivoRechazo && (
                      <div className="p-2 sm:p-3 bg-destructive/10 rounded-md border border-destructive/20">
                        <p className="text-xs sm:text-sm font-medium text-destructive mb-1">Motivo del rechazo:</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{doc.motivoRechazo}</p>
                      </div>
                    )}

                    {doc.estado === 'aprobado' && (
                      <div className="p-2 sm:p-3 bg-green-500/10 rounded-md border border-green-500/20">
                        <p className="text-xs sm:text-sm text-green-700 dark:text-green-400">
                          Este seguro esta aprobado y puedes usarlo como metodo de pago.
                        </p>
                      </div>
                    )}

                    {doc.estado === 'pendiente' && (
                      <div className="p-2 sm:p-3 bg-yellow-500/10 rounded-md border border-yellow-500/20">
                        <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400">
                          Este documento esta siendo revisado. Te notificaremos cuando sea aprobado.
                        </p>
                      </div>
                    )}

                    <div className="pt-1">
                      <AlertDialog open={documentToDelete === doc.id} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive h-8 px-2 text-xs sm:text-sm" 
                            onClick={() => setDocumentToDelete(doc.id)}
                            data-testid={`button-delete-insurance-${doc.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-base sm:text-lg">Eliminar documento de seguro?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              Esta accion no se puede deshacer. El documento sera eliminado permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(doc.id)}
                              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-insurance-${doc.id}`}
                            >
                              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-3 border-t">
              <Button 
                onClick={() => setIsUploadDialogOpen(true)} 
                className="w-full sm:w-auto"
                data-testid="button-add-more-insurance"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Otro Seguro
              </Button>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Puedes agregar seguros adicionales para otros vehiculos.
              </p>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg">Subir Documento de Seguro</DialogTitle>
            <DialogDescription className="text-sm">
              Sube tu poliza de seguro con cobertura de asistencia vial/remolque.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="vehiculo" className="text-sm font-medium">Descripcion del Vehiculo (opcional)</Label>
              <Input
                id="vehiculo"
                value={vehiculoDescripcion}
                onChange={(e) => setVehiculoDescripcion(e.target.value)}
                placeholder="Ej: Toyota Corolla 2020"
                className="h-11"
                data-testid="input-vehicle-description"
              />
              <p className="text-xs text-muted-foreground">
                Ayuda a identificar a que vehiculo corresponde este seguro.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aseguradora" className="text-sm font-medium">Aseguradora *</Label>
              <Select value={aseguradoraNombre} onValueChange={setAseguradoraNombre}>
                <SelectTrigger id="aseguradora" className="h-11" data-testid="select-insurance-company">
                  <SelectValue placeholder="Selecciona tu aseguradora" />
                </SelectTrigger>
                <SelectContent>
                  {insuranceCompanies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="poliza" className="text-sm font-medium">Numero de Poliza *</Label>
              <Input
                id="poliza"
                value={numeroPoliza}
                onChange={(e) => setNumeroPoliza(e.target.value)}
                placeholder="Ej: POL-12345678"
                className="h-11"
                data-testid="input-policy-number"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vencimiento" className="text-sm font-medium">Fecha de Vencimiento (opcional)</Label>
              <Input
                id="vencimiento"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="h-11"
                data-testid="input-expiry-date"
              />
            </div>

            <FileUpload
              label="Documento de Poliza *"
              helperText="Sube tu documento de poliza (imagen o PDF)"
              onFileSelect={setSelectedFile}
              onFileRemove={() => setSelectedFile(null)}
              maxSizeMB={5}
            />
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setIsUploadDialogOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={uploadMutation.isPending || !selectedFile || !aseguradoraNombre || !numeroPoliza}
              data-testid="button-submit-insurance"
            >
              {uploadMutation.isPending ? 'Subiendo...' : 'Subir Documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
