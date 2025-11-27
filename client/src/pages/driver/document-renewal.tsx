import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  RefreshCw,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import type { Documento } from '@shared/schema';

interface DocumentStatusSummary {
  totalDocumentos: number;
  documentosAprobados: number;
  documentosPendientes: number;
  documentosRechazados: number;
  documentosVencidos: number;
  documentosProximosAVencer: number;
  puedeEstarEnLinea: boolean;
  documentos: Documento[];
}

const REQUIRED_DOCUMENTS = [
  { tipo: 'licencia', label: 'Licencia de Conducir', requiereVencimiento: true, descripcion: 'Licencia de conducir vigente' },
  { tipo: 'matricula', label: 'Matrícula del Vehículo', requiereVencimiento: true, descripcion: 'Matrícula de la grúa' },
  { tipo: 'seguro_grua', label: 'Seguro de la Grúa', requiereVencimiento: true, descripcion: 'Póliza de seguro del vehículo' },
  { tipo: 'foto_vehiculo', label: 'Foto del Vehículo', requiereVencimiento: false, descripcion: 'Foto frontal de la grúa' },
  { tipo: 'cedula_frontal', label: 'Cédula (Frente)', requiereVencimiento: false, descripcion: 'Parte frontal de su cédula' },
  { tipo: 'cedula_trasera', label: 'Cédula (Reverso)', requiereVencimiento: false, descripcion: 'Parte trasera de su cédula' },
];

const DOCUMENTOS_CON_VENCIMIENTO = ['seguro_grua', 'licencia', 'matricula'];

export default function DocumentRenewal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [fechasVencimiento, setFechasVencimiento] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

  const { data: documentStatus, isLoading } = useQuery<DocumentStatusSummary>({
    queryKey: ['/api/drivers/me/document-status'],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, tipo, fechaVencimiento }: { file: File; tipo: string; fechaVencimiento?: string }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('tipoDocumento', tipo);
      if (fechaVencimiento) {
        formData.append('fechaVencimiento', fechaVencimiento);
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al subir el documento');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me/document-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents/my-documents'] });
      
      toast({
        title: 'Documento subido',
        description: 'El documento se ha subido correctamente y está pendiente de revisión',
      });
      setUploadingDoc(null);
      setSelectedFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[variables.tipo];
        return newFiles;
      });
      setFechasVencimiento(prev => {
        const newDates = { ...prev };
        delete newDates[variables.tipo];
        return newDates;
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al subir documento',
        description: error.message,
        variant: 'destructive',
      });
      setUploadingDoc(null);
    },
  });

  const getDocumentForType = (tipo: string) => {
    if (!documentStatus?.documentos) return null;
    
    const docsOfType = documentStatus.documentos.filter(d => d.tipo === tipo);
    if (docsOfType.length === 0) return null;
    
    const approved = docsOfType.find(d => d.estado === 'aprobado');
    if (approved) return approved;
    
    const pending = docsOfType.find(d => d.estado === 'pendiente');
    if (pending) return pending;
    
    return docsOfType[0];
  };

  const getDocumentStatusInfo = (doc: Documento | null) => {
    if (!doc) {
      return {
        status: 'missing',
        label: 'No subido',
        variant: 'secondary' as const,
        icon: XCircle,
        canRenew: true,
      };
    }

    const now = new Date();
    const isExpired = doc.validoHasta && new Date(doc.validoHasta) < now;
    const daysUntilExpiry = doc.validoHasta 
      ? Math.ceil((new Date(doc.validoHasta).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

    if (doc.estado === 'pendiente') {
      return {
        status: 'pending',
        label: 'En revisión',
        variant: 'secondary' as const,
        icon: Clock,
        canRenew: false,
      };
    }

    if (doc.estado === 'rechazado') {
      return {
        status: 'rejected',
        label: 'Rechazado',
        variant: 'destructive' as const,
        icon: XCircle,
        canRenew: true,
        reason: doc.motivoRechazo,
      };
    }

    if (isExpired) {
      return {
        status: 'expired',
        label: 'Vencido',
        variant: 'destructive' as const,
        icon: AlertTriangle,
        canRenew: true,
        daysUntilExpiry,
      };
    }

    if (isExpiringSoon) {
      return {
        status: 'expiring',
        label: `Vence en ${daysUntilExpiry} días`,
        variant: 'secondary' as const,
        icon: Calendar,
        canRenew: true,
        daysUntilExpiry,
      };
    }

    return {
      status: 'valid',
      label: 'Vigente',
      variant: 'default' as const,
      icon: CheckCircle,
      canRenew: false,
      expiryDate: doc.validoHasta,
    };
  };

  const handleFileSelect = (file: File, tipo: string) => {
    if (DOCUMENTOS_CON_VENCIMIENTO.includes(tipo)) {
      setSelectedFiles(prev => ({ ...prev, [tipo]: file }));
    } else {
      setUploadingDoc(tipo);
      uploadMutation.mutate({ file, tipo });
    }
  };

  const handleUploadWithExpiration = (tipo: string) => {
    const file = selectedFiles[tipo];
    const fecha = fechasVencimiento[tipo];
    
    if (!file) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un archivo primero',
        variant: 'destructive',
      });
      return;
    }
    
    if (!fecha) {
      toast({
        title: 'Fecha requerida',
        description: 'Por favor ingresa la fecha de vencimiento del documento',
        variant: 'destructive',
      });
      return;
    }

    const expiryDate = new Date(fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (expiryDate <= today) {
      toast({
        title: 'Fecha inválida',
        description: 'La fecha de vencimiento debe ser una fecha futura',
        variant: 'destructive',
      });
      return;
    }

    setUploadingDoc(tipo);
    uploadMutation.mutate({ file, tipo, fechaVencimiento: fecha });
  };

  const getOverallProgress = () => {
    if (!documentStatus) return 0;
    const validDocs = documentStatus.documentosAprobados - documentStatus.documentosVencidos;
    return Math.round((validDocs / REQUIRED_DOCUMENTS.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress = getOverallProgress();

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/driver">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Renovar Documentos</h1>
          <p className="text-sm text-muted-foreground">Mantén tus documentos al día</p>
        </div>
      </div>

      {!documentStatus?.puedeEstarEnLinea && (
        <Alert variant="destructive" data-testid="alert-account-suspended">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cuenta Limitada</AlertTitle>
          <AlertDescription>
            No puedes estar en línea ni recibir servicios hasta que todos tus documentos estén vigentes y aprobados.
            {documentStatus?.documentosVencidos ? ` Tienes ${documentStatus.documentosVencidos} documento(s) vencido(s).` : ''}
          </AlertDescription>
        </Alert>
      )}

      {documentStatus?.documentosProximosAVencer > 0 && (
        <Alert data-testid="alert-expiring-soon">
          <Calendar className="h-4 w-4" />
          <AlertTitle>Documentos por Vencer</AlertTitle>
          <AlertDescription>
            Tienes {documentStatus.documentosProximosAVencer} documento(s) que vencerán en los próximos 30 días.
            Por favor, renuévalos antes de que expiren.
          </AlertDescription>
        </Alert>
      )}

      <Card data-testid="card-document-progress">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Estado de Documentación
            </CardTitle>
            <Badge variant={progress === 100 ? 'default' : 'secondary'}>
              {progress}% Completo
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-2 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div>
              <p className="text-2xl font-bold text-green-600">{documentStatus?.documentosAprobados || 0}</p>
              <p className="text-muted-foreground">Aprobados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{documentStatus?.documentosPendientes || 0}</p>
              <p className="text-muted-foreground">Pendientes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{documentStatus?.documentosVencidos || 0}</p>
              <p className="text-muted-foreground">Vencidos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{documentStatus?.documentosProximosAVencer || 0}</p>
              <p className="text-muted-foreground">Por Vencer</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Tus Documentos</h2>
        
        {REQUIRED_DOCUMENTS.map((docType) => {
          const doc = getDocumentForType(docType.tipo);
          const statusInfo = getDocumentStatusInfo(doc);
          const StatusIcon = statusInfo.icon;
          const hasSelectedFile = !!selectedFiles[docType.tipo];
          const isUploading = uploadingDoc === docType.tipo;

          return (
            <Card key={docType.tipo} data-testid={`card-document-${docType.tipo}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      statusInfo.status === 'valid' ? 'bg-green-100 dark:bg-green-900/30' :
                      statusInfo.status === 'expired' || statusInfo.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' :
                      statusInfo.status === 'expiring' ? 'bg-orange-100 dark:bg-orange-900/30' :
                      'bg-muted'
                    }`}>
                      <FileText className={`h-5 w-5 ${
                        statusInfo.status === 'valid' ? 'text-green-600' :
                        statusInfo.status === 'expired' || statusInfo.status === 'rejected' ? 'text-red-600' :
                        statusInfo.status === 'expiring' ? 'text-orange-600' :
                        'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{docType.label}</h3>
                        <Badge variant={statusInfo.variant}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{docType.descripcion}</p>
                      
                      {statusInfo.status === 'rejected' && statusInfo.reason && (
                        <p className="text-sm text-destructive mt-1">
                          Motivo: {statusInfo.reason}
                        </p>
                      )}
                      
                      {statusInfo.status === 'valid' && doc?.validoHasta && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Válido hasta: {new Date(doc.validoHasta).toLocaleDateString('es-DO')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {statusInfo.canRenew && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="space-y-3">
                      <FileUpload
                        onFileSelect={(file) => handleFileSelect(file, docType.tipo)}
                        accept="image/*,.pdf"
                        maxSize={10 * 1024 * 1024}
                        disabled={isUploading || uploadMutation.isPending}
                      />

                      {docType.requiereVencimiento && hasSelectedFile && (
                        <div className="space-y-2">
                          <Label htmlFor={`fecha-${docType.tipo}`}>
                            Fecha de Vencimiento
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id={`fecha-${docType.tipo}`}
                              type="date"
                              value={fechasVencimiento[docType.tipo] || ''}
                              onChange={(e) => setFechasVencimiento(prev => ({
                                ...prev,
                                [docType.tipo]: e.target.value,
                              }))}
                              min={new Date().toISOString().split('T')[0]}
                              className="flex-1"
                              data-testid={`input-fecha-${docType.tipo}`}
                            />
                            <Button
                              onClick={() => handleUploadWithExpiration(docType.tipo)}
                              disabled={isUploading || !fechasVencimiento[docType.tipo]}
                              data-testid={`button-upload-${docType.tipo}`}
                            >
                              {isUploading ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Subir
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {hasSelectedFile && (
                        <p className="text-sm text-muted-foreground">
                          Archivo seleccionado: {selectedFiles[docType.tipo].name}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium">Mantén tus documentos al día</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Te notificaremos 30, 15 y 7 días antes de que expire cada documento.
                Los documentos vencidos te impedirán recibir nuevos servicios.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
