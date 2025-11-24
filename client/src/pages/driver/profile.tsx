import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Star, Truck, LogOut, FileText, Upload, CheckCircle, XCircle, Clock, CreditCard, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import type { Conductor, Documento } from '@shared/schema';

const REQUIRED_DOCUMENTS = [
  { tipo: 'licencia', label: 'Licencia de Conducir' },
  { tipo: 'matricula', label: 'Matrícula del Vehículo' },
  { tipo: 'seguro_grua', label: 'Seguro de la Grúa' },
  { tipo: 'foto_vehiculo', label: 'Foto del Vehículo' },
  { tipo: 'cedula_frontal', label: 'Cédula (Frente)' },
  { tipo: 'cedula_trasera', label: 'Cédula (Reverso)' },
];

interface StripeAccountStatus {
  configured: boolean;
  accountStatus?: string;
  onboardingComplete?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

export default function DriverProfile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const { data: driverData } = useQuery<Conductor>({
    queryKey: ['/api/drivers/me'],
  });

  const { data: documentos = [] } = useQuery<Documento[]>({
    queryKey: ['/api/documentos/user', user?.id],
    enabled: !!user,
  });

  const { data: stripeStatus, isLoading: isLoadingStripe, error: stripeError } = useQuery<StripeAccountStatus>({
    queryKey: ['/api/drivers/stripe-account-status'],
    enabled: !!driverData,
    retry: 2,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, tipo }: { file: File; tipo: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', tipo);

      // Use fetch directly for FormData (apiRequest expects JSON)
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
    onSuccess: () => {
      // Invalidate both document endpoints for cache consistency
      queryClient.invalidateQueries({ queryKey: ['/api/documentos/user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents/my-documents'] });
      
      toast({
        title: 'Documento subido',
        description: 'El documento se ha subido correctamente y está pendiente de revisión',
      });
      setUploadingDoc(null);
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

  const getDocumentStatus = (tipo: string) => {
    const doc = documentos.find(d => d.tipo === tipo);
    return doc;
  };

  const handleFileSelect = (file: File, tipo: string) => {
    setUploadingDoc(tipo);
    uploadMutation.mutate({ file, tipo });
  };

  const stripeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/drivers/stripe-onboarding', {
        method: 'POST',
      });
      return response as { accountId: string; onboardingUrl: string };
    },
    onSuccess: (data) => {
      window.location.href = data.onboardingUrl;
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al configurar cuenta de pagos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSuccess = urlParams.get('stripe_success');
    const stripeRefresh = urlParams.get('stripe_refresh');

    if (stripeSuccess === 'true') {
      toast({
        title: 'Cuenta configurada',
        description: 'Tu cuenta de pagos se ha configurado correctamente',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/stripe-account-status'] });
      window.history.replaceState({}, '', '/driver/profile');
    } else if (stripeRefresh === 'true') {
      toast({
        title: 'Configuración pendiente',
        description: 'Debes completar la configuración de tu cuenta de pagos',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/driver/profile');
    }
  }, [toast]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>

      <Card className="p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="text-2xl">
              {user.nombre[0]}{user.apellido[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold" data-testid="text-username">
              {user.nombre} {user.apellido}
            </h2>
            {user.calificacionPromedio && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">
                  {parseFloat(user.calificacionPromedio as string).toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Correo</p>
              <p className="font-medium" data-testid="text-email">{user.email}</p>
            </div>
          </div>

          {user.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium" data-testid="text-phone">{user.phone}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Tipo de usuario</p>
              <p className="font-medium capitalize">{user.userType}</p>
            </div>
          </div>
        </div>
      </Card>

      {driverData && (
        <>
          <Card className="p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Información de la Grúa</h3>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Licencia</p>
                <p className="font-medium" data-testid="text-licencia">{driverData.licencia}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Placa</p>
                <p className="font-medium" data-testid="text-placa">{driverData.placaGrua}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-medium" data-testid="text-marca">{driverData.marcaGrua}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-medium" data-testid="text-modelo">{driverData.modeloGrua}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Documentos</h3>
            </div>

            <div className="space-y-4">
              {REQUIRED_DOCUMENTS.map((docType) => {
                const documento = getDocumentStatus(docType.tipo);
                const isUploading = uploadingDoc === docType.tipo;

                return (
                  <div key={docType.tipo} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        {docType.label}
                      </label>
                      {documento && (
                        <Badge
                          variant={
                            documento.estado === 'aprobado'
                              ? 'default'
                              : documento.estado === 'rechazado'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="gap-1"
                        >
                          {documento.estado === 'aprobado' && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {documento.estado === 'rechazado' && (
                            <XCircle className="w-3 h-3" />
                          )}
                          {documento.estado === 'pendiente' && (
                            <Clock className="w-3 h-3" />
                          )}
                          {documento.estado === 'aprobado' ? 'Aprobado' : documento.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                        </Badge>
                      )}
                    </div>

                    {documento?.estado === 'rechazado' && documento.motivoRechazo && (
                      <p className="text-sm text-destructive">
                        Motivo: {documento.motivoRechazo}
                      </p>
                    )}

                    <FileUpload
                      onFileSelect={(file) => handleFileSelect(file, docType.tipo)}
                      disabled={isUploading}
                      label=""
                      helperText={
                        isUploading
                          ? 'Subiendo documento...'
                          : documento
                          ? 'Subir nuevo documento'
                          : 'Arrastra un archivo o haz clic para seleccionar'
                      }
                    />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Cuenta de Pagos</h3>
            </div>

            {isLoadingStripe ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : stripeError ? (
              <div className="text-center py-4">
                <p className="text-sm text-destructive mb-2">Error al cargar información de pagos</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/drivers/stripe-account-status'] })}
                  data-testid="button-retry-stripe-status"
                >
                  Reintentar
                </Button>
              </div>
            ) : !stripeStatus?.configured ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configura tu cuenta de pagos para recibir el 70% de cada servicio completado directamente en tu cuenta bancaria.
                </p>
                <Button
                  className="w-full"
                  onClick={() => stripeOnboardingMutation.mutate()}
                  disabled={stripeOnboardingMutation.isPending}
                  data-testid="button-setup-payments"
                >
                  {stripeOnboardingMutation.isPending ? (
                    'Configurando...'
                  ) : (
                    <>
                      Configurar Cuenta de Pagos
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            ) : stripeStatus.onboardingComplete ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado de la cuenta</span>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Activa
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recibir pagos</span>
                  <Badge variant={stripeStatus.chargesEnabled ? 'default' : 'secondary'}>
                    {stripeStatus.chargesEnabled ? 'Habilitado' : 'Pendiente'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transferencias bancarias</span>
                  <Badge variant={stripeStatus.payoutsEnabled ? 'default' : 'secondary'}>
                    {stripeStatus.payoutsEnabled ? 'Habilitado' : 'Pendiente'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Recibes automáticamente el 70% del costo de cada servicio completado.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="w-3 h-3" />
                    Configuración pendiente
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Debes completar la configuración de tu cuenta para poder recibir pagos.
                </p>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => stripeOnboardingMutation.mutate()}
                  disabled={stripeOnboardingMutation.isPending}
                  data-testid="button-continue-setup"
                >
                  {stripeOnboardingMutation.isPending ? (
                    'Redirigiendo...'
                  ) : (
                    <>
                      Continuar Configuración
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      <Button
        variant="destructive"
        className="w-full"
        onClick={handleLogout}
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Cerrar Sesión
      </Button>
    </div>
  );
}
