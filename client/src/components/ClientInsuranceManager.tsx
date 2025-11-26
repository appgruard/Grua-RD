import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
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
  Building2
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
  insuranceStatus: 'pendiente' | 'aprobado' | 'rechazado' | null;
  insuranceDocument: InsuranceDocument | null;
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

  const { data: insuranceStatus, isLoading } = useQuery<InsuranceStatus>({
    queryKey: ['/api/client/insurance/status'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/client/insurance', {
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
        description: 'Tu documento de seguro ha sido enviado para revisión.',
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
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/client/insurance');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al eliminar documento');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/insurance/status'] });
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
            En revisión
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

  const hasInsurance = insuranceStatus?.insuranceDocument !== null;
  const insuranceDoc = insuranceStatus?.insuranceDocument;

  return (
    <>
      <Card className="p-6" data-testid="card-client-insurance">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold">Mi Seguro</h3>
          </div>
          {hasInsurance && getStatusBadge(insuranceDoc?.estado || null)}
        </div>

        {!hasInsurance ? (
          <div className="text-center py-6">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No tienes un documento de seguro registrado.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Sube tu póliza de seguro con cobertura de asistencia vial para poder usar "Aseguradora" como método de pago.
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)} data-testid="button-add-insurance">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Seguro
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
              <FileText className="w-10 h-10 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" data-testid="text-insurance-name">
                  {insuranceDoc?.nombreArchivo}
                </p>
                <p className="text-sm text-muted-foreground">
                  Subido el {new Date(insuranceDoc?.createdAt || '').toLocaleDateString('es-DO')}
                </p>
                {insuranceDoc?.validoHasta && (
                  <p className="text-sm text-muted-foreground">
                    Válido hasta: {new Date(insuranceDoc.validoHasta).toLocaleDateString('es-DO')}
                  </p>
                )}
              </div>
            </div>

            {insuranceDoc?.estado === 'rechazado' && insuranceDoc?.motivoRechazo && (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-1">Motivo del rechazo:</p>
                <p className="text-sm text-muted-foreground">{insuranceDoc.motivoRechazo}</p>
              </div>
            )}

            {insuranceDoc?.estado === 'aprobado' && (
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-sm text-green-700 dark:text-green-400">
                  Tu seguro está aprobado. Puedes usar "Aseguradora" como método de pago al solicitar una grúa.
                </p>
              </div>
            )}

            {insuranceDoc?.estado === 'pendiente' && (
              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Tu documento está siendo revisado. Te notificaremos cuando sea aprobado.
                </p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setIsUploadDialogOpen(true)}
                data-testid="button-update-insurance"
              >
                <Upload className="w-4 h-4 mr-2" />
                {insuranceDoc?.estado === 'rechazado' ? 'Subir nuevo documento' : 'Actualizar'}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive" data-testid="button-delete-insurance">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar documento de seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Si eliminas tu seguro, no podrás usar "Aseguradora" como método de pago.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-delete-insurance"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Documento de Seguro</DialogTitle>
            <DialogDescription>
              Sube tu póliza de seguro con cobertura de asistencia vial/remolque.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="aseguradora">Aseguradora *</Label>
              <Select value={aseguradoraNombre} onValueChange={setAseguradoraNombre}>
                <SelectTrigger id="aseguradora" data-testid="select-insurance-company">
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

            <div className="space-y-2">
              <Label htmlFor="poliza">Número de Póliza *</Label>
              <Input
                id="poliza"
                value={numeroPoliza}
                onChange={(e) => setNumeroPoliza(e.target.value)}
                placeholder="Ej: POL-12345678"
                data-testid="input-policy-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vencimiento">Fecha de Vencimiento (opcional)</Label>
              <Input
                id="vencimiento"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                data-testid="input-expiry-date"
              />
            </div>

            <FileUpload
              label="Documento de Póliza *"
              helperText="Sube tu documento de póliza (imagen o PDF)"
              onFileSelect={setSelectedFile}
              onFileRemove={() => setSelectedFile(null)}
              maxSizeMB={5}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
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
