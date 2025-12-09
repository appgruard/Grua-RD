import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { MapboxMapWithFastLoad } from '@/components/maps/LazyMapboxMap';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/lib/websocket';
import { ChatBox } from '@/components/chat/ChatBox';
import { NegotiationChatBox } from '@/components/chat/NegotiationChatBox';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useLocationTracking } from '@/hooks/useLocation';
import { calculateDistance } from '@/hooks/useDriverLocation';
import { WalletAlertBanner, CashServiceConfirmationModal, useWalletStatus } from '@/components/wallet';
import { MapPin, Navigation, DollarSign, Loader2, MessageCircle, Play, CheckCircle, AlertCircle, CheckCircle2, ChevronUp, ChevronDown, Car, ShieldAlert, AlertTriangle } from 'lucide-react';
import { SiWaze, SiGooglemaps } from 'react-icons/si';
import type { Servicio, Conductor, ServicioWithDetails, Documento, WalletWithDetails } from '@shared/schema';
import type { Coordinates, RouteGeometry } from '@/lib/maps';
import { generateWazeNavigationUrl, generateGoogleMapsNavigationUrl } from '@/lib/maps';
import { getDirections } from '@/lib/mapbox-directions';
import { cn } from '@/lib/utils';

interface DriverInitData {
  conductor: Conductor | null;
  documents: Documento[];
  activeService: ServicioWithDetails | null;
  nearbyRequests: Servicio[];
  wallet: WalletWithDetails | null;
}

const serviceCategoryLabels: Record<string, string> = {
  remolque_estandar: "Remolque Estandar",
  remolque_motocicletas: "Remolque de Motocicletas",
  remolque_plataforma: "Plataforma / Flatbed",
  auxilio_vial: "Auxilio Vial",
  extraccion: "Extraccion",
  remolque_especializado: "Remolque Especializado",
  camiones_pesados: "Camiones Pesados",
  vehiculos_pesados: "Vehiculos Pesados",
  maquinarias: "Maquinarias",
  izaje_construccion: "Izaje y Construccion",
  remolque_recreativo: "Remolque Recreativo"
};

const vehicleTypeLabels: Record<string, string> = {
  carro: "Carro",
  motor: "Motocicleta",
  jeep: "Jeep/SUV",
  camion: "Camión"
};

const getServiceCategoryLabel = (category: string | null | undefined): string => {
  if (!category) return "No especificado";
  return serviceCategoryLabels[category] || category;
};

const getVehicleTypeLabel = (type: string | null | undefined): string => {
  if (!type) return "No especificado";
  return vehicleTypeLabels[type] || type;
};

export default function DriverDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<Coordinates>({ lat: 18.4861, lng: -69.9312 });
  const [chatOpen, setChatOpen] = useState(false);
  const [showExpandedCard, setShowExpandedCard] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'complete' | 'start' | null;
    serviceId: string | null;
  }>({ open: false, action: null, serviceId: null });
  const [cashConfirmation, setCashConfirmation] = useState<{
    open: boolean;
    serviceId: string | null;
    serviceAmount: number;
  }>({ open: false, serviceId: null, serviceAmount: 0 });
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const lastRouteCalcRef = useRef<number>(0);
  
  const walletStatus = useWalletStatus();

  // Single consolidated query for all driver data - much faster than multiple queries
  const { data: initData, isLoading: isLoadingDriver } = useQuery<DriverInitData>({
    queryKey: ['/api/drivers/init'],
    staleTime: 1000 * 30,
  });

  // Extract data from the consolidated response
  const driverData = initData?.conductor;
  const driverDocuments = initData?.documents;
  const isLoadingActiveService = isLoadingDriver;

  // Separate queries for data that needs frequent polling
  const { data: nearbyRequests } = useQuery<Servicio[]>({
    queryKey: ['/api/drivers/nearby-requests'],
    enabled: !!driverData?.disponible,
    refetchInterval: 5000,
    staleTime: 1000 * 3,
    initialData: initData?.nearbyRequests,
  });

  const { data: activeService } = useQuery<ServicioWithDetails | null>({
    queryKey: ['/api/drivers/active-service'],
    enabled: !!driverData,
    refetchInterval: 10000,
    staleTime: 1000 * 5,
    initialData: initData?.activeService,
  });

  const { send, connectionId } = useWebSocket(
    (message) => {
      if (message.type === 'new_request') {
        queryClient.invalidateQueries({ queryKey: ['/api/drivers/nearby-requests'] });
        toast({
          title: 'Nueva solicitud',
          description: 'Hay una nueva solicitud de servicio cerca de ti',
        });
      }
    },
    () => {
      if (driverData?.disponible && driverData.id) {
        send({ type: 'register_driver', payload: { driverId: driverData.id } });
      }
    }
  );

  useEffect(() => {
    if (driverData?.disponible && driverData.id) {
      send({ type: 'register_driver', payload: { driverId: driverData.id } });
    }
  }, [driverData?.disponible, driverData?.id, send, connectionId]);


  useEffect(() => {
    if (activeService && driverData?.id && currentLocation) {
      send({
        type: 'update_location',
        payload: {
          servicioId: activeService.id,
          conductorId: driverData.id,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        },
      });
    }
  }, [activeService, driverData?.id, currentLocation, send]);

  useEffect(() => {
    if (!activeService || !locationReady) {
      setRouteGeometry(null);
      return;
    }

    const calculateRoute = async () => {
      const now = Date.now();
      if (now - lastRouteCalcRef.current < 30000 && routeGeometry) {
        return;
      }
      lastRouteCalcRef.current = now;

      const isGoingToOrigin = activeService.estado === 'aceptado' || activeService.estado === 'conductor_en_sitio';
      const isGoingToDestination = activeService.estado === 'cargando' || activeService.estado === 'en_progreso';

      if (!isGoingToOrigin && !isGoingToDestination) {
        setRouteGeometry(null);
        return;
      }

      const target = isGoingToOrigin
        ? {
            lat: parseFloat(activeService.origenLat as string),
            lng: parseFloat(activeService.origenLng as string),
          }
        : {
            lat: parseFloat(activeService.destinoLat as string),
            lng: parseFloat(activeService.destinoLng as string),
          };

      try {
        const result = await getDirections(currentLocation, target);
        if (result.geometry) {
          setRouteGeometry(result.geometry as RouteGeometry);
        }
      } catch (error) {
        console.error('Error calculating route:', error);
      }
    };

    calculateRoute();
  }, [activeService?.id, activeService?.estado, currentLocation, locationReady]);

  const toggleAvailability = useMutation({
    mutationFn: async (disponible: boolean) => {
      const res = await apiRequest('PUT', '/api/drivers/availability', { disponible });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const error = new Error('Failed to update availability') as Error & { response?: any };
        error.response = errorData;
        throw error;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/init'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/nearby-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/active-service'] });
      toast({
        title: driverData?.disponible ? 'Ahora estás inactivo' : 'Ahora estás disponible',
        description: driverData?.disponible ? 'No recibirás nuevas solicitudes' : 'Puedes recibir solicitudes',
      });
    },
    onError: (error: any) => {
      const errorResponse = error?.response;
      
      if (errorResponse?.missingDocuments && errorResponse.missingDocuments.length > 0) {
        const documentsList = errorResponse.missingDocuments.join(', ');
        toast({
          title: 'Documentos incompletos',
          description: `No puedes activar disponibilidad. Necesitas: ${documentsList}`,
          variant: 'destructive',
        });
      } else if (errorResponse?.expiredDocuments && errorResponse.expiredDocuments.length > 0) {
        const documentsList = errorResponse.expiredDocuments.join(', ');
        toast({
          title: 'Documentos vencidos',
          description: `Los siguientes documentos han vencido: ${documentsList}. Por favor, renuévalos.`,
          variant: 'destructive',
        });
      } else if (errorResponse?.message) {
        toast({
          title: 'No se puede activar disponibilidad',
          description: errorResponse.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo cambiar el estado de disponibilidad',
          variant: 'destructive',
        });
      }
    },
  });

  const acceptService = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await apiRequest('POST', `/api/services/${serviceId}/accept`, {});
      if (!res.ok) throw new Error('Failed to accept service');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/nearby-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/active-service'] });
      toast({
        title: 'Servicio aceptado',
        description: 'Dirígete hacia el cliente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo aceptar el servicio',
        variant: 'destructive',
      });
    },
  });

  const dismissService = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await apiRequest('POST', `/api/services/${serviceId}/dismiss`, {});
      if (!res.ok) throw new Error('Failed to dismiss service');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/nearby-requests'] });
      toast({
        title: 'Servicio rechazado',
        description: 'No verás este servicio nuevamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo rechazar el servicio',
        variant: 'destructive',
      });
    },
  });

  const arrivedService = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await apiRequest('POST', `/api/services/${serviceId}/arrived`, {
        lat: currentLocation.lat,
        lng: currentLocation.lng
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Failed to update service') as Error & { response?: any };
        error.response = errorData;
        throw error;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/active-service'] });
      toast({
        title: 'Llegada confirmada',
        description: 'El cliente ha sido notificado',
      });
    },
    onError: (error: any) => {
      const errorResponse = error?.response;
      if (errorResponse?.distancia) {
        toast({
          title: 'Demasiado lejos',
          description: `Debes estar a menos de ${errorResponse.required}m del punto de recogida. Distancia actual: ${errorResponse.distancia}m`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: errorResponse?.message || 'No se pudo actualizar el estado',
          variant: 'destructive',
        });
      }
    },
  });

  const loadingService = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await apiRequest('POST', `/api/services/${serviceId}/loading`, {});
      if (!res.ok) throw new Error('Failed to update service');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/active-service'] });
      toast({
        title: 'Estado actualizado',
        description: 'El cliente ha sido notificado que estás cargando el vehículo',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    },
  });

  const startService = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await apiRequest('POST', `/api/services/${serviceId}/start`, {});
      if (!res.ok) throw new Error('Failed to start service');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/active-service'] });
      toast({
        title: 'Servicio iniciado',
        description: 'En ruta al destino',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el servicio',
        variant: 'destructive',
      });
    },
  });

  const completeService = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await apiRequest('POST', `/api/services/${serviceId}/complete`, {});
      if (!res.ok) throw new Error('Failed to complete service');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/active-service'] });
      setConfirmDialog({ open: false, action: null, serviceId: null });
      toast({
        title: 'Servicio completado',
        description: 'El servicio ha sido marcado como completado',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo completar el servicio',
        variant: 'destructive',
      });
    },
  });

  const handleConfirmAction = async () => {
    if (!confirmDialog.serviceId || !confirmDialog.action) return;
    
    if (confirmDialog.action === 'complete') {
      await completeService.mutateAsync(confirmDialog.serviceId);
    }
  };

  const checkDocumentsComplete = () => {
    if (!driverDocuments) return { complete: false, missing: 0 };
    
    const requiredTypes = ['licencia', 'cedula_frontal', 'cedula_trasera'];
    let missingCount = 0;
    
    for (const requiredType of requiredTypes) {
      if ((requiredType === 'cedula_frontal' || requiredType === 'cedula_trasera') && user?.cedulaVerificada) {
        continue;
      }
      
      const doc = driverDocuments.find(d => d.tipo === requiredType);
      if (!doc || doc.estado !== 'aprobado') {
        missingCount++;
      }
    }
    
    return { complete: missingCount === 0, missing: missingCount };
  };

  const handleLocationUpdate = useCallback((location: Coordinates) => {
    setCurrentLocation(location);
    setLocationReady(true);
    if (driverData?.id) {
      apiRequest('PUT', '/api/drivers/location', location);
    }
  }, [driverData?.id]);

  const trackingOptions = useMemo(() => ({
    interval: activeService ? 8000 : 15000,
    minDistance: activeService ? 30 : 50
  }), [!!activeService]);

  useLocationTracking(
    handleLocationUpdate,
    driverData?.disponible || false,
    trackingOptions
  );

  const mapMarkers = useMemo(() => {
    const markers: Array<{
      position: Coordinates;
      title: string;
      color: string;
      type: 'origin' | 'destination' | 'driver' | 'service' | 'default';
    }> = [];

    if (activeService) {
      markers.push({
        position: currentLocation,
        title: 'Tu ubicacion',
        color: '#3b82f6',
        type: 'driver' as const,
      });

      markers.push({
        position: {
          lat: parseFloat(activeService.origenLat as string),
          lng: parseFloat(activeService.origenLng as string),
        },
        title: 'Origen del cliente',
        color: '#22c55e',
        type: 'origin' as const,
      });

      if (activeService.estado === 'cargando' || activeService.estado === 'en_progreso') {
        markers.push({
          position: {
            lat: parseFloat(activeService.destinoLat as string),
            lng: parseFloat(activeService.destinoLng as string),
          },
          title: 'Destino',
          color: '#ef4444',
          type: 'destination' as const,
        });
      }
    } else if (nearbyRequests) {
      nearbyRequests.forEach(req => {
        markers.push({
          position: {
            lat: parseFloat(req.origenLat as string),
            lng: parseFloat(req.origenLng as string),
          },
          title: 'Solicitud de servicio',
          color: '#F5A623',
          type: 'service' as const,
        });
      });
    }

    return markers;
  }, [activeService, nearbyRequests, currentLocation]);

  const getStatusBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'aceptado': return 'default';
      case 'conductor_en_sitio': return 'secondary';
      case 'cargando': return 'default';
      case 'en_progreso': return 'default';
      case 'completado': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusText = (estado: string) => {
    switch (estado) {
      case 'aceptado': return 'Aceptado';
      case 'conductor_en_sitio': return 'En sitio';
      case 'cargando': return 'Cargando';
      case 'en_progreso': return 'En ruta';
      case 'completado': return 'Completado';
      default: return estado;
    }
  };

  // Either telefonoVerificado OR emailVerificado counts as contact verified
  const contactoVerificado = user?.telefonoVerificado || (user as any)?.emailVerificado;
  const needsVerification = user && (!user.cedulaVerificada || !contactoVerificado);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {needsVerification && (
        <Alert className="m-3 border-amber-500/50 bg-amber-500/10 z-20" data-testid="alert-verification-pending">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-amber-700 dark:text-amber-400">
              Debes completar la verificación de identidad para continuar.
            </span>
            <Button 
              size="sm" 
              onClick={() => setLocation('/verify-pending')}
              data-testid="button-complete-verification"
            >
              Completar verificación
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <WalletAlertBanner className="z-20" />
      
      <div className="flex-1 relative min-h-0">
        <MapboxMapWithFastLoad
          center={currentLocation}
          markers={mapMarkers}
          className="absolute inset-0"
          routeGeometry={routeGeometry}
        />
      </div>

      <div className="absolute top-3 left-3 right-3 z-10">
        <Card className="p-3 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            {isLoadingDriver ? (
              <>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      driverData?.disponible ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                    <Label htmlFor="availability" className="text-base font-semibold truncate">
                      {driverData?.disponible ? 'Disponible' : 'No disponible'}
                    </Label>
                  </div>
                  {driverDocuments && (() => {
                    const { complete, missing } = checkDocumentsComplete();
                    return (
                      <div className="mt-1">
                        {complete ? (
                          <Badge variant="secondary" className="gap-1 text-xs" data-testid="badge-documents-complete">
                            <CheckCircle2 className="w-3 h-3" />
                            Documentos OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1 text-xs" data-testid="badge-documents-pending">
                            <AlertCircle className="w-3 h-3" />
                            {missing} pendiente{missing !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <Switch
                  id="availability"
                  checked={driverData?.disponible || false}
                  onCheckedChange={(checked) => toggleAvailability.mutate(checked)}
                  disabled={toggleAvailability.isPending}
                  data-testid="switch-availability"
                />
              </>
            )}
          </div>
        </Card>
      </div>

      {activeService && (
        <div 
          className={cn(
            "bg-background border-t border-border transition-all duration-300 safe-area-inset-bottom",
            showExpandedCard ? "max-h-[55vh] sm:max-h-[65vh]" : "max-h-14"
          )}
        >
          <button 
            className="w-full flex items-center justify-center py-2 text-muted-foreground"
            onClick={() => setShowExpandedCard(!showExpandedCard)}
            data-testid="button-toggle-active-service"
          >
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(activeService.estado)} className="text-xs">
                {getStatusText(activeService.estado)}
              </Badge>
              {showExpandedCard ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>
          </button>

          <div className={cn(
            "overflow-y-auto transition-all duration-300 px-3 sm:px-4 pb-4",
            showExpandedCard ? "max-h-[calc(55vh-56px)] sm:max-h-[calc(65vh-56px)]" : "max-h-0 overflow-hidden"
          )}>
            <div className="space-y-4">
              {activeService.cliente && (
                <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 bg-muted rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-semibold text-sm sm:text-base truncate">
                      {activeService.cliente.nombre} {activeService.cliente.apellido}
                    </p>
                  </div>
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => setChatOpen(true)}
                    data-testid="button-chat-client"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" data-testid="service-details-info">
                <div className="p-2.5 sm:p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Tipo de Servicio</p>
                  <p className="text-xs sm:text-sm font-semibold" data-testid="text-service-category">
                    {getServiceCategoryLabel(activeService.servicioCategoria)}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Vehículo Cliente</p>
                  <p className="text-xs sm:text-sm font-semibold" data-testid="text-vehicle-type">
                    {getVehicleTypeLabel(activeService.tipoVehiculo)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-muted rounded-lg">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500" />
                    <div className="w-0.5 h-6 sm:h-8 bg-border" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Origen</p>
                      <p className="text-xs sm:text-sm font-medium line-clamp-1">{activeService.origenDireccion}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Destino</p>
                      <p className="text-xs sm:text-sm font-medium line-clamp-1">{activeService.destinoDireccion}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {(activeService.estado === 'aceptado' || activeService.estado === 'conductor_en_sitio') && (() => {
                    const lat = typeof activeService.origenLat === 'string' ? parseFloat(activeService.origenLat) : activeService.origenLat;
                    const lng = typeof activeService.origenLng === 'string' ? parseFloat(activeService.origenLng) : activeService.origenLng;
                    const wazeUrl = generateWazeNavigationUrl(lat, lng);
                    const googleUrl = generateGoogleMapsNavigationUrl(lat, lng);
                    if (!wazeUrl && !googleUrl) return null;
                    return (
                      <>
                        {wazeUrl && (
                          <a href={wazeUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full gap-1 sm:gap-1.5 text-xs h-9 sm:h-10" data-testid="button-waze-origin" aria-label="Ir al origen con Waze">
                              <SiWaze className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#33CCFF] flex-shrink-0" />
                              <span className="truncate">Waze</span>
                            </Button>
                          </a>
                        )}
                        {googleUrl && (
                          <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full gap-1 sm:gap-1.5 text-xs h-9 sm:h-10" data-testid="button-google-origin" aria-label="Ir al origen con Google Maps">
                              <SiGooglemaps className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4285F4] flex-shrink-0" />
                              <span className="truncate">Maps</span>
                            </Button>
                          </a>
                        )}
                      </>
                    );
                  })()}
                  {(activeService.estado === 'cargando' || activeService.estado === 'en_progreso') && (() => {
                    const lat = typeof activeService.destinoLat === 'string' ? parseFloat(activeService.destinoLat) : activeService.destinoLat;
                    const lng = typeof activeService.destinoLng === 'string' ? parseFloat(activeService.destinoLng) : activeService.destinoLng;
                    const wazeUrl = generateWazeNavigationUrl(lat, lng);
                    const googleUrl = generateGoogleMapsNavigationUrl(lat, lng);
                    if (!wazeUrl && !googleUrl) return null;
                    return (
                      <>
                        {wazeUrl && (
                          <a href={wazeUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full gap-1 sm:gap-1.5 text-xs h-9 sm:h-10" data-testid="button-waze-destination" aria-label="Ir al destino con Waze">
                              <SiWaze className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#33CCFF] flex-shrink-0" />
                              <span className="truncate">Waze</span>
                            </Button>
                          </a>
                        )}
                        {googleUrl && (
                          <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full gap-1 sm:gap-1.5 text-xs h-9 sm:h-10" data-testid="button-google-destination" aria-label="Ir al destino con Google Maps">
                              <SiGooglemaps className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4285F4] flex-shrink-0" />
                              <span className="truncate">Maps</span>
                            </Button>
                          </a>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {activeService.requiereNegociacion && (
                <div className="p-2.5 sm:p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-amber-600">Servicio de Extraccion</span>
                  </div>
                  {activeService.descripcionSituacion && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{activeService.descripcionSituacion}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {!activeService.requiereNegociacion && (
                  <div className="text-center p-2.5 sm:p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">Distancia</p>
                    <p className="text-base sm:text-lg font-bold">
                      {parseFloat(activeService.distanciaKm as string).toFixed(1)} km
                    </p>
                  </div>
                )}
                <div className={cn(
                  "text-center p-2.5 sm:p-3 rounded-lg border",
                  activeService.requiereNegociacion 
                    ? "bg-amber-500/10 border-amber-500/20 col-span-2"
                    : "bg-primary/10 border-primary/20"
                )}>
                  <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">
                    {activeService.requiereNegociacion ? 'Monto Negociado' : 'Ganancia'}
                  </p>
                  {activeService.requiereNegociacion ? (
                    activeService.montoNegociado ? (
                      <p className="text-base sm:text-lg font-bold text-amber-600">
                        RD$ {parseFloat(activeService.montoNegociado as string).toFixed(2)}
                      </p>
                    ) : (
                      <p className="text-base sm:text-lg font-bold text-amber-600">Por definir</p>
                    )
                  ) : (
                    <p className="text-base sm:text-lg font-bold text-primary">
                      RD$ {parseFloat(activeService.costoTotal as string).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {activeService.estado === 'aceptado' && (() => {
                const origenLat = typeof activeService.origenLat === 'string' ? parseFloat(activeService.origenLat) : activeService.origenLat;
                const origenLng = typeof activeService.origenLng === 'string' ? parseFloat(activeService.origenLng) : activeService.origenLng;
                const distanceToPickup = calculateDistance(
                  currentLocation.lat,
                  currentLocation.lng,
                  origenLat,
                  origenLng
                );
                const isWithinRange = distanceToPickup <= 60;
                const distanceText = distanceToPickup < 1000 
                  ? `${Math.round(distanceToPickup)}m` 
                  : `${(distanceToPickup / 1000).toFixed(1)}km`;
                
                return (
                  <div className="space-y-1.5 sm:space-y-2">
                    {!isWithinRange && (
                      <div className="text-center text-xs sm:text-sm text-muted-foreground">
                        <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                        Distancia al punto: <span className="font-medium">{distanceText}</span>
                      </div>
                    )}
                    <Button 
                      className="w-full h-11 sm:h-12 text-sm sm:text-base" 
                      onClick={() => arrivedService.mutate(activeService.id)}
                      disabled={arrivedService.isPending || !isWithinRange}
                      data-testid="button-arrived"
                    >
                      {arrivedService.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4 mr-2" />
                      )}
                      {isWithinRange ? 'He Llegado al Punto' : `Acércate (${distanceText})`}
                    </Button>
                  </div>
                );
              })()}

              {activeService.estado === 'conductor_en_sitio' && (
                <Button 
                  className="w-full h-11 sm:h-12 text-sm sm:text-base" 
                  onClick={() => loadingService.mutate(activeService.id)}
                  disabled={loadingService.isPending}
                  data-testid="button-loading"
                >
                  {loadingService.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Cargando Vehículo
                </Button>
              )}

              {activeService.estado === 'cargando' && (
                <Button 
                  className="w-full h-11 sm:h-12 text-sm sm:text-base" 
                  onClick={() => startService.mutate(activeService.id)}
                  disabled={startService.isPending}
                  data-testid="button-start-service"
                >
                  {startService.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4 mr-2" />
                  )}
                  En Ruta al Destino
                </Button>
              )}

              {activeService.estado === 'en_progreso' && (
                <Button 
                  className="w-full h-11 sm:h-12 text-sm sm:text-base" 
                  onClick={() => setConfirmDialog({ open: true, action: 'complete', serviceId: activeService.id })}
                  data-testid="button-complete-service"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completar Servicio
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {!activeService && driverData?.disponible && nearbyRequests && nearbyRequests.length > 0 && (
        <div 
          className={cn(
            "bg-background border-t border-border transition-all duration-300 safe-area-inset-bottom",
            showExpandedCard ? "max-h-[50vh] sm:max-h-[60vh]" : "max-h-14"
          )}
        >
          <button 
            className="w-full flex items-center justify-between px-3 sm:px-4 py-2 text-muted-foreground"
            onClick={() => setShowExpandedCard(!showExpandedCard)}
            data-testid="button-toggle-requests"
          >
            <span className="text-xs sm:text-sm font-semibold">
              {nearbyRequests.length} solicitud{nearbyRequests.length !== 1 ? 'es' : ''} cercana{nearbyRequests.length !== 1 ? 's' : ''}
            </span>
            {showExpandedCard ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <div className={cn(
            "overflow-y-auto transition-all duration-300 px-3 sm:px-4 pb-4 space-y-2 sm:space-y-3",
            showExpandedCard ? "max-h-[calc(50vh-56px)] sm:max-h-[calc(60vh-56px)]" : "max-h-0 overflow-hidden"
          )}>
            {nearbyRequests.map((request) => (
              <Card key={request.id} className="p-3 sm:p-4" data-testid={`request-${request.id}`}>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500" />
                      <div className="w-0.5 h-6 sm:h-8 bg-border" />
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                      <p className="text-xs sm:text-sm font-medium line-clamp-1">{request.origenDireccion}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{request.destinoDireccion}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2" data-testid={`request-details-${request.id}`}>
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-service-category-${request.id}`}>
                      {getServiceCategoryLabel(request.servicioCategoria)}
                    </Badge>
                    <Badge variant="outline" className="text-xs" data-testid={`badge-vehicle-type-${request.id}`}>
                      {getVehicleTypeLabel(request.tipoVehiculo)}
                    </Badge>
                    {request.requiereNegociacion && (
                      <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-500" data-testid={`badge-negotiation-${request.id}`}>
                        <AlertTriangle className="w-3 h-3" />
                        Negociacion
                      </Badge>
                    )}
                  </div>

                  {request.requiereNegociacion && request.descripcionSituacion && (
                    <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-0.5 sm:mb-1">Situacion:</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{request.descripcionSituacion}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1.5 sm:py-2 border-t border-border">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      {request.requiereNegociacion ? (
                        <span className="text-sm sm:text-base font-bold text-amber-600">
                          Por negociar
                        </span>
                      ) : (
                        <span className="text-sm sm:text-base font-bold text-primary">
                          RD$ {parseFloat(request.costoTotal as string).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {!request.requiereNegociacion && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {parseFloat(request.distanciaKm as string).toFixed(1)} km
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                      data-testid={`button-reject-${request.id}`}
                      onClick={() => dismissService.mutate(request.id)}
                      disabled={dismissService.isPending}
                    >
                      {dismissService.isPending ? 'Rechazando...' : 'Rechazar'}
                    </Button>
                    {request.requiereNegociacion ? (
                      <Button
                        className="flex-1 h-9 sm:h-10 text-xs sm:text-sm bg-amber-600 hover:bg-amber-700"
                        onClick={() => setLocation(`/driver/extraction-evaluation/${request.id}`)}
                        data-testid={`button-evaluate-${request.id}`}
                      >
                        Ver y Evaluar
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                        onClick={() => {
                          if (walletStatus.hasDebt || walletStatus.isBlocked) {
                            setCashConfirmation({
                              open: true,
                              serviceId: request.id,
                              serviceAmount: parseFloat(request.costoTotal as string) || 0,
                            });
                          } else {
                            acceptService.mutate(request.id);
                          }
                        }}
                        disabled={acceptService.isPending || cashConfirmation.open}
                        data-testid={`button-accept-${request.id}`}
                      >
                        {acceptService.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Aceptar'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Drawer open={chatOpen} onOpenChange={setChatOpen}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>
              {activeService?.requiereNegociacion ? 'Negociacion con el Cliente' : 'Chat con el Cliente'}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden px-4 pb-4">
            {user && activeService && (
              activeService.requiereNegociacion ? (
                <NegotiationChatBox
                  servicioId={activeService.id}
                  servicio={activeService}
                  currentUserId={user.id}
                  currentUserNombre={user.nombre}
                  currentUserApellido={user.apellido}
                  userType="conductor"
                />
              ) : (
                <ChatBox
                  servicioId={activeService.id}
                  currentUserId={user.id}
                  currentUserNombre={user.nombre}
                  currentUserApellido={user.apellido}
                  otherUserName={activeService.cliente ? `${activeService.cliente.nombre} ${activeService.cliente.apellido}` : 'Cliente'}
                  userType="conductor"
                />
              )
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title="Completar Servicio"
        description="¿Estás seguro de que deseas marcar este servicio como completado? Esta acción no se puede deshacer."
        confirmLabel="Completar"
        onConfirm={handleConfirmAction}
        loading={completeService.isPending}
      />

      <CashServiceConfirmationModal
        open={cashConfirmation.open}
        onOpenChange={(open) => setCashConfirmation({ ...cashConfirmation, open })}
        onConfirm={() => {
          if (cashConfirmation.serviceId) {
            acceptService.mutate(cashConfirmation.serviceId);
            setCashConfirmation({ open: false, serviceId: null, serviceAmount: 0 });
          }
        }}
        onPayDebt={() => {
          setCashConfirmation({ open: false, serviceId: null, serviceAmount: 0 });
          setLocation('/driver/profile');
        }}
        isLoading={acceptService.isPending}
        serviceAmount={cashConfirmation.serviceAmount}
      />
    </div>
  );
}
