import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Phone, Star, Truck, LogOut, FileText, CheckCircle, XCircle, Clock, CreditCard, ArrowRight, AlertTriangle, Calendar, Pencil, Camera, Loader2, Wrench, Shield, ShieldCheck, ShieldX, ShieldAlert, Edit3, Save, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import { EditProfileModal } from '@/components/EditProfileModal';
import { DocumentExpirationAlerts } from '@/components/DocumentExpirationAlerts';
import { ThemeSettingsCard } from '@/components/ThemeToggle';
import { ServiceCategoryMultiSelect, SERVICE_CATEGORIES, type ServiceSelection } from '@/components/ServiceCategoryMultiSelect';
import { VehicleCategoryForm, type VehicleData } from '@/components/VehicleCategoryForm';
import DLocalOperatorBankAccountManager from '@/components/DLocalOperatorBankAccountManager';
import type { Conductor, Documento, ConductorVehiculo } from '@shared/schema';

interface VerifikValidation {
  cedulaVerificada: boolean;
  validationScore?: number;
  validatedAt?: string;
  validationDetails?: {
    faceMatchScore?: number;
    documentValidity?: boolean;
    livenessCheck?: boolean;
  };
}

const REQUIRED_DOCUMENTS = [
  { tipo: 'foto_perfil', label: 'Foto de Perfil', requiereVencimiento: false, obligatorio: true, descripcion: 'Debe mostrar claramente tu rostro' },
  { tipo: 'licencia', label: 'Licencia de Conducir', requiereVencimiento: true, obligatorio: true },
  { tipo: 'matricula', label: 'Matrícula del Vehículo', requiereVencimiento: true, obligatorio: true },
  { tipo: 'seguro_grua', label: 'Seguro de la Grúa', requiereVencimiento: true, obligatorio: true },
  { tipo: 'foto_vehiculo', label: 'Foto del Vehículo', requiereVencimiento: false, obligatorio: true },
  { tipo: 'cedula_frontal', label: 'Cédula (Frente)', requiereVencimiento: false, obligatorio: true },
  { tipo: 'cedula_trasera', label: 'Cédula (Reverso)', requiereVencimiento: false, obligatorio: true },
];

const DOCUMENTOS_CON_VENCIMIENTO = ['seguro_grua', 'licencia', 'matricula'];

interface PayoutAccountStatus {
  configured: boolean;
  balanceDisponible: string;
  balancePendiente: string;
}

interface DriverFullProfile {
  conductor: Conductor | null;
  documentos: Documento[];
  servicios: { categorias: ServiceSelection[] };
  verifikStatus: VerifikValidation | null;
}

export default function DriverProfile() {
  const { user, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [fechasVencimiento, setFechasVencimiento] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingServices, setEditingServices] = useState(false);
  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);
  const [editingVehicles, setEditingVehicles] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleData[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);

  const { data: fullProfile, isLoading: isLoadingProfile } = useQuery<DriverFullProfile>({
    queryKey: ['/api/drivers/me/full'],
    enabled: !!user,
  });

  const driverData = fullProfile?.conductor;
  const documentos = fullProfile?.documentos || [];
  const driverServices = fullProfile?.servicios;
  const verifikStatus = fullProfile?.verifikStatus;
  const isLoadingServices = isLoadingProfile;

  const { data: payoutStatus, isLoading: isLoadingPayout } = useQuery<PayoutAccountStatus>({
    queryKey: ['/api/drivers/payout-account-status'],
    enabled: !!driverData,
    retry: 2,
  });

  const { data: driverVehicles, isLoading: isLoadingVehicles } = useQuery<ConductorVehiculo[]>({
    queryKey: ['/api/drivers/me/vehiculos'],
    enabled: !!driverData,
  });

  useEffect(() => {
    if (driverServices?.categorias && !editingServices) {
      setSelectedServices(driverServices.categorias);
    }
  }, [driverServices, editingServices]);

  useEffect(() => {
    if (driverVehicles && !editingVehicles) {
      const vehicles: VehicleData[] = driverVehicles.map(v => ({
        categoria: v.categoria,
        placa: v.placa,
        color: v.color,
        capacidad: v.capacidad || '',
        marca: v.marca || '',
        modelo: v.modelo || '',
        anio: v.anio || '',
        detalles: v.detalles || '',
        fotoUrl: v.fotoUrl || undefined,
      }));
      setVehicleData(vehicles);
    }
  }, [driverVehicles, editingVehicles]);

  const saveServicesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', '/api/drivers/me/servicios', { categorias: selectedServices });
      if (!res.ok) throw new Error((await res.json()).message || 'Error al guardar servicios');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me/full'] });
      toast({ title: 'Servicios actualizados', description: 'Tus categorías de servicio han sido guardadas' });
      setEditingServices(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error al guardar servicios', description: error.message, variant: 'destructive' });
    },
  });

  const saveVehiclesMutation = useMutation({
    mutationFn: async () => {
      const promises = vehicleData.map(async (vehicle) => {
        const res = await apiRequest('POST', '/api/drivers/me/vehiculos', vehicle);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Error al guardar vehículo para ${vehicle.categoria}`);
        }
        return res.json();
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me/vehiculos'] });
      toast({ title: 'Vehículos actualizados', description: 'Los datos de tus vehículos han sido guardados' });
      setEditingVehicles(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error al guardar vehículos', description: error.message, variant: 'destructive' });
    },
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
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me/full'] });
      
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

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/users/profile-photo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al subir la foto');
      }

      return response.json();
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me/full'] });
      toast({
        title: 'Foto actualizada',
        description: 'Tu foto de perfil ha sido actualizada y está pendiente de revisión',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al subir foto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getDocumentStatus = (tipo: string) => {
    const doc = documentos.find(d => d.tipo === tipo);
    return doc;
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
    const fechaVencimiento = fechasVencimiento[tipo];
    
    if (!file) return;
    
    if (DOCUMENTOS_CON_VENCIMIENTO.includes(tipo) && !fechaVencimiento) {
      toast({
        title: 'Fecha requerida',
        description: 'La fecha de vencimiento es requerida para este tipo de documento',
        variant: 'destructive',
      });
      return;
    }
    
    if (DOCUMENTOS_CON_VENCIMIENTO.includes(tipo) && fechaVencimiento) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expirationDate = new Date(fechaVencimiento);
      if (expirationDate <= today) {
        toast({
          title: 'Fecha inválida',
          description: 'La fecha de vencimiento debe ser una fecha futura',
          variant: 'destructive',
        });
        return;
      }
    }
    
    setUploadingDoc(tipo);
    uploadMutation.mutate({ file, tipo, fechaVencimiento });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Formato inválido',
          description: 'Solo se permiten imágenes (JPG, PNG)',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Archivo muy grande',
          description: 'El tamaño máximo es 5MB',
          variant: 'destructive',
        });
        return;
      }

      uploadPhotoMutation.mutate(file);
    }
  };

  const isDocumentExpiringSoon = (documento: Documento): boolean => {
    if (!documento.validoHasta) return false;
    const expirationDate = new Date(documento.validoHasta);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expirationDate > now && expirationDate <= thirtyDaysFromNow;
  };

  const isDocumentExpired = (documento: Documento): boolean => {
    if (!documento.validoHasta) return false;
    const expirationDate = new Date(documento.validoHasta);
    return expirationDate < new Date();
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getDaysUntilExpiration = (documento: Documento): number | null => {
    if (!documento.validoHasta) return null;
    const expirationDate = new Date(documento.validoHasta);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const stripeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/drivers/stripe-onboarding', {});
      return response.json() as Promise<{ accountId: string; onboardingUrl: string }>;
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

  const scrollToDocuments = () => {
    documentsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const profilePhotoDoc = documentos.find(d => d.tipo === 'foto_perfil');
  const hasProfilePhoto = !!user.fotoUrl || !!profilePhotoDoc;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setEditModalOpen(true)}
            data-testid="button-edit-profile"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>

        <DocumentExpirationAlerts onNavigateToDocuments={scrollToDocuments} />

        {!hasProfilePhoto && (
          <Alert variant="destructive" data-testid="alert-missing-photo">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Foto de perfil requerida:</strong> Como conductor, es obligatorio que subas una foto de perfil donde se vea tu rostro claramente para poder ser aprobado.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 pb-20">

      <Card className="p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
              {user.fotoUrl ? (
                <AvatarImage src={user.fotoUrl} alt="Foto de perfil" />
              ) : null}
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-semibold">
                {user.nombre[0]}{user.apellido[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 rounded-full shadow-md h-8 w-8"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadPhotoMutation.isPending}
              data-testid="button-change-photo"
            >
              {uploadPhotoMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </Button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handlePhotoSelect}
              className="hidden"
              data-testid="input-profile-photo"
            />
          </div>
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
            {!hasProfilePhoto && (
              <p className="text-xs text-destructive mt-1">
                Sube una foto de perfil
              </p>
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
              <p className="font-medium capitalize">{user.userType === 'conductor' ? 'Conductor' : user.userType}</p>
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
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Servicios Ofrecidos</h3>
              </div>
              {!editingServices ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingServices(true)}
                  data-testid="button-edit-services"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingServices(false);
                      setSelectedServices(driverServices?.categorias || []);
                    }}
                    disabled={saveServicesMutation.isPending}
                    data-testid="button-cancel-services"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveServicesMutation.mutate()}
                    disabled={saveServicesMutation.isPending || selectedServices.length === 0}
                    data-testid="button-save-services"
                  >
                    {saveServicesMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar
                  </Button>
                </div>
              )}
            </div>

            {isLoadingServices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : editingServices ? (
              <div className="max-h-[400px] overflow-y-auto">
                <ServiceCategoryMultiSelect
                  value={selectedServices}
                  onChange={setSelectedServices}
                  disabled={saveServicesMutation.isPending}
                />
              </div>
            ) : driverServices?.categorias && driverServices.categorias.length > 0 ? (
              <div className="space-y-3">
                {driverServices.categorias.map((service) => {
                  const categoryInfo = SERVICE_CATEGORIES.find(c => c.id === service.categoria);
                  return (
                    <div key={service.categoria} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" data-testid={`badge-service-${service.categoria}`}>
                          {categoryInfo?.label || service.categoria}
                        </Badge>
                      </div>
                      {service.subtipos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {service.subtipos.map((subtipo) => (
                            <Badge key={subtipo} variant="secondary" className="text-xs" data-testid={`badge-subtipo-${subtipo}`}>
                              {categoryInfo?.subtipos.find(s => s.id === subtipo)?.label || subtipo}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No has seleccionado ningún servicio aún.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setEditingServices(true)}
                  data-testid="button-add-services"
                >
                  Agregar Servicios
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6 mb-4">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Vehículos por Categoría</h3>
              </div>
              {!editingVehicles ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingVehicles(true)}
                  disabled={!driverServices?.categorias || driverServices.categorias.length === 0}
                  data-testid="button-edit-vehicles"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingVehicles(false);
                      if (driverVehicles) {
                        const vehicles: VehicleData[] = driverVehicles.map(v => ({
                          categoria: v.categoria,
                          placa: v.placa,
                          color: v.color,
                          capacidad: v.capacidad || '',
                          marca: v.marca || '',
                          modelo: v.modelo || '',
                          anio: v.anio || '',
                          detalles: v.detalles || '',
                          fotoUrl: v.fotoUrl || undefined,
                        }));
                        setVehicleData(vehicles);
                      }
                    }}
                    disabled={saveVehiclesMutation.isPending}
                    data-testid="button-cancel-vehicles"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveVehiclesMutation.mutate()}
                    disabled={saveVehiclesMutation.isPending || vehicleData.length === 0}
                    data-testid="button-save-vehicles"
                  >
                    {saveVehiclesMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar
                  </Button>
                </div>
              )}
            </div>

            {isLoadingVehicles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !driverServices?.categorias || driverServices.categorias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Primero selecciona las categorías de servicio que ofreces.</p>
              </div>
            ) : editingVehicles ? (
              <div className="max-h-[450px] overflow-y-auto pr-1">
                <VehicleCategoryForm
                  selectedCategories={driverServices.categorias.map(s => s.categoria)}
                  vehicles={vehicleData}
                  onChange={setVehicleData}
                  disabled={saveVehiclesMutation.isPending}
                />
              </div>
            ) : driverVehicles && driverVehicles.length > 0 ? (
              <div className="space-y-3">
                {driverVehicles.map((vehicle) => {
                  const categoryInfo = SERVICE_CATEGORIES.find(c => c.id === vehicle.categoria);
                  return (
                    <div key={vehicle.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" data-testid={`badge-vehicle-${vehicle.categoria}`}>
                          {categoryInfo?.label || vehicle.categoria}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Placa:</span>{' '}
                          <span className="font-medium">{vehicle.placa}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Color:</span>{' '}
                          <span className="font-medium">{vehicle.color}</span>
                        </div>
                        {vehicle.marca && (
                          <div>
                            <span className="text-muted-foreground">Marca:</span>{' '}
                            <span className="font-medium">{vehicle.marca}</span>
                          </div>
                        )}
                        {vehicle.modelo && (
                          <div>
                            <span className="text-muted-foreground">Modelo:</span>{' '}
                            <span className="font-medium">{vehicle.modelo}</span>
                          </div>
                        )}
                        {vehicle.anio && (
                          <div>
                            <span className="text-muted-foreground">Año:</span>{' '}
                            <span className="font-medium">{vehicle.anio}</span>
                          </div>
                        )}
                        {vehicle.capacidad && (
                          <div>
                            <span className="text-muted-foreground">Capacidad:</span>{' '}
                            <span className="font-medium">{vehicle.capacidad}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No has configurado vehículos para tus categorías aún.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setEditingVehicles(true)}
                  data-testid="button-add-vehicles"
                >
                  Configurar Vehículos
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Verificación de Identidad</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado de Verificación</span>
                {verifikStatus?.cedulaVerificada ? (
                  <Badge variant="default" className="gap-1" data-testid="badge-verifik-verified">
                    <ShieldCheck className="w-3 h-3" />
                    Verificado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1" data-testid="badge-verifik-pending">
                    <ShieldAlert className="w-3 h-3" />
                    Pendiente
                  </Badge>
                )}
              </div>

              {verifikStatus?.validationScore !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Puntuación de Validación</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          verifikStatus.validationScore >= 0.6 ? 'bg-green-500' : 
                          verifikStatus.validationScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(verifikStatus.validationScore * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${
                      verifikStatus.validationScore >= 0.6 ? 'text-green-600 dark:text-green-400' :
                      verifikStatus.validationScore >= 0.4 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                    }`} data-testid="text-verifik-score">
                      {(verifikStatus.validationScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {verifikStatus?.validatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fecha de Verificación</span>
                  <span className="text-sm font-medium" data-testid="text-verifik-date">
                    {formatDate(verifikStatus.validatedAt)}
                  </span>
                </div>
              )}

              {verifikStatus?.validationDetails && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Detalles de Validación</p>
                  <div className="grid grid-cols-2 gap-2">
                    {verifikStatus.validationDetails.faceMatchScore !== undefined && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Coincidencia Facial:</span>
                        <span className="ml-1 font-medium">{(verifikStatus.validationDetails.faceMatchScore * 100).toFixed(0)}%</span>
                      </div>
                    )}
                    {verifikStatus.validationDetails.documentValidity !== undefined && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">Documento:</span>
                        {verifikStatus.validationDetails.documentValidity ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                    )}
                    {verifikStatus.validationDetails.livenessCheck !== undefined && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">Prueba de Vida:</span>
                        {verifikStatus.validationDetails.livenessCheck ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!verifikStatus?.cedulaVerificada && (
                <p className="text-xs text-muted-foreground">
                  Tu identidad será verificada automáticamente durante el proceso de registro.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6 mb-4" ref={documentsRef}>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Documentos</h3>
            </div>

            <div className="space-y-4">
              {REQUIRED_DOCUMENTS.filter(d => d.tipo !== 'foto_perfil').map((docType) => {
                const documento = getDocumentStatus(docType.tipo);
                const isUploading = uploadingDoc === docType.tipo;
                const hasSelectedFile = !!selectedFiles[docType.tipo];
                const expiringSoon = documento ? isDocumentExpiringSoon(documento) : false;
                const expired = documento ? isDocumentExpired(documento) : false;
                const daysLeft = documento ? getDaysUntilExpiration(documento) : null;

                return (
                  <div key={docType.tipo} className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-sm font-medium">
                        {docType.label}
                        {docType.obligatorio && <span className="text-destructive ml-1">*</span>}
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {documento && expired && (
                          <Badge variant="destructive" className="gap-1" data-testid={`badge-expired-${docType.tipo}`}>
                            <XCircle className="w-3 h-3" />
                            Vencido
                          </Badge>
                        )}
                        {documento && expiringSoon && !expired && daysLeft !== null && (
                          <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid={`badge-expiring-${docType.tipo}`}>
                            <AlertTriangle className="w-3 h-3" />
                            Vence en {daysLeft} días
                          </Badge>
                        )}
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
                            data-testid={`badge-status-${docType.tipo}`}
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
                    </div>

                    {documento?.estado === 'rechazado' && documento.motivoRechazo && (
                      <p className="text-sm text-destructive">
                        Motivo: {documento.motivoRechazo}
                      </p>
                    )}

                    {documento?.validoHasta && DOCUMENTOS_CON_VENCIMIENTO.includes(docType.tipo) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`text-expiration-${docType.tipo}`}>
                        <Calendar className="w-4 h-4" />
                        <span>Vence: {formatDate(documento.validoHasta)}</span>
                      </div>
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

                    {hasSelectedFile && DOCUMENTOS_CON_VENCIMIENTO.includes(docType.tipo) && (
                      <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          <span className="truncate">{selectedFiles[docType.tipo]?.name}</span>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`fecha-${docType.tipo}`} className="text-sm">
                            Fecha de vencimiento {DOCUMENTOS_CON_VENCIMIENTO.includes(docType.tipo) && <span className="text-destructive">*</span>}
                          </Label>
                          <Input
                            id={`fecha-${docType.tipo}`}
                            type="date"
                            value={fechasVencimiento[docType.tipo] || ''}
                            onChange={(e) => setFechasVencimiento(prev => ({ ...prev, [docType.tipo]: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            data-testid={`input-expiration-${docType.tipo}`}
                          />
                          {DOCUMENTOS_CON_VENCIMIENTO.includes(docType.tipo) && !fechasVencimiento[docType.tipo] && (
                            <p className="text-xs text-destructive" data-testid={`text-required-${docType.tipo}`}>
                              La fecha de vencimiento es requerida para este documento
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => handleUploadWithExpiration(docType.tipo)}
                          disabled={isUploading || (DOCUMENTOS_CON_VENCIMIENTO.includes(docType.tipo) && !fechasVencimiento[docType.tipo])}
                          className="w-full"
                          data-testid={`button-upload-${docType.tipo}`}
                        >
                          {isUploading ? 'Subiendo...' : 'Subir documento'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <DLocalOperatorBankAccountManager />
        </>
      )}

          <ThemeSettingsCard />

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
      </ScrollArea>

      <EditProfileModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        isDriver={true}
        currentPhotoUrl={user.fotoUrl}
        cedulaVerificada={user.cedulaVerificada || false}
        conductorData={driverData ? {
          licencia: driverData.licencia,
          placaGrua: driverData.placaGrua,
          marcaGrua: driverData.marcaGrua,
          modeloGrua: driverData.modeloGrua,
        } : undefined}
      />
    </div>
  );
}
