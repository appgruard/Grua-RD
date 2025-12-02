import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { MapboxMap } from '@/components/maps/MapboxMap';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/lib/websocket';
import { ChatBox } from '@/components/chat/ChatBox';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useLocationTracking } from '@/hooks/useLocation';
import { MapPin, Navigation, DollarSign, Loader2, MessageCircle, Play, CheckCircle, AlertCircle, CheckCircle2, ChevronUp, ChevronDown, Car, ShieldAlert } from 'lucide-react';
import { SiWaze } from 'react-icons/si';
import type { Servicio, Conductor, ServicioWithDetails, Documento } from '@shared/schema';
import type { Coordinates } from '@/lib/maps';
import { getNavigationUrl } from '@/lib/maps';
import { cn } from '@/lib/utils';

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

  const { data: driverData } = useQuery<Conductor>({
    queryKey: ['/api/drivers/me'],
  });

  const { data: driverDocuments } = useQuery<Documento[]>({
    queryKey: ['/api/documents/my-documents'],
    enabled: !!driverData?.id,
  });

  const { data: nearbyRequests } = useQuery<Servicio[]>({
    queryKey: ['/api/drivers/nearby-requests'],
    enabled: driverData?.disponible || false,
    refetchInterval: 5000,
  });

  const { data: activeService } = useQuery<ServicioWithDetails | null>({
    queryKey: ['/api/drivers/active-service'],
    enabled: !!driverData,
    refetchInterval: 10000,
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
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me'] });
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

  const arrivedService = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await apiRequest('POST', `/api/services/${serviceId}/arrived`, {});
      if (!res.ok) throw new Error('Failed to update service');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/active-service'] });
      toast({
        title: 'Llegada confirmada',
        description: 'El cliente ha sido notificado',
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
    
    const requiredTypes = ['licencia', 'matricula', 'seguro_grua', 'foto_vehiculo', 'cedula_frontal', 'cedula_trasera'];
    let missingCount = 0;
    
    for (const requiredType of requiredTypes) {
      const doc = driverDocuments.find(d => d.tipo === requiredType);
      if (!doc || doc.estado !== 'aprobado') {
        missingCount++;
      }
    }
    
    return { complete: missingCount === 0, missing: missingCount };
  };

  const handleLocationUpdate = useCallback((location: Coordinates) => {
    setCurrentLocation(location);
    apiRequest('PUT', '/api/drivers/location', location);
  }, []);

  useLocationTracking(
    handleLocationUpdate,
    driverData?.disponible || false,
    { interval: 5000, minDistance: 10 }
  );

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

  const needsVerification = user && (!user.cedulaVerificada || !user.telefonoVerificado);

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
      
      <div className="flex-1 relative min-h-0">
        <MapboxMap
          center={currentLocation}
          markers={nearbyRequests?.map(req => ({
            position: {
              lat: parseFloat(req.origenLat as string),
              lng: parseFloat(req.origenLng as string),
            },
            title: 'Solicitud de servicio',
            color: '#F5A623',
            type: 'service' as const,
          })) || []}
          className="absolute inset-0"
        />
      </div>

      <div className="absolute top-3 left-3 right-3 z-10">
        <Card className="p-3 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
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
          </div>
        </Card>
      </div>

      {activeService && (
        <div 
          className={cn(
            "bg-background border-t border-border transition-all duration-300 safe-area-inset-bottom",
            showExpandedCard ? "max-h-[65vh]" : "max-h-14"
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
            "overflow-y-auto transition-all duration-300 px-4 pb-4",
            showExpandedCard ? "max-h-[calc(65vh-56px)]" : "max-h-0 overflow-hidden"
          )}>
            <div className="space-y-4">
              {activeService.cliente && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-semibold truncate">
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

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <div className="w-0.5 h-8 bg-border" />
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Origen</p>
                      <p className="text-sm font-medium">{activeService.origenDireccion}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Destino</p>
                      <p className="text-sm font-medium">{activeService.destinoDireccion}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {(activeService.estado === 'aceptado' || activeService.estado === 'conductor_en_sitio') && (() => {
                    const navUrl = getNavigationUrl(activeService.origenLat, activeService.origenLng);
                    if (!navUrl) return null;
                    return (
                      <a href={navUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full gap-2" data-testid="button-waze-origin">
                          <SiWaze className="w-4 h-4 text-[#33CCFF]" />
                          Ir al origen
                        </Button>
                      </a>
                    );
                  })()}
                  {(activeService.estado === 'cargando' || activeService.estado === 'en_progreso') && (() => {
                    const navUrl = getNavigationUrl(activeService.destinoLat, activeService.destinoLng);
                    if (!navUrl) return null;
                    return (
                      <a href={navUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full gap-2" data-testid="button-waze-destination">
                          <SiWaze className="w-4 h-4 text-[#33CCFF]" />
                          Ir al destino
                        </Button>
                      </a>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Distancia</p>
                  <p className="text-lg font-bold">
                    {parseFloat(activeService.distanciaKm as string).toFixed(1)} km
                  </p>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Ganancia</p>
                  <p className="text-lg font-bold text-primary">
                    RD$ {parseFloat(activeService.costoTotal as string).toFixed(2)}
                  </p>
                </div>
              </div>

              {activeService.estado === 'aceptado' && (
                <Button 
                  className="w-full h-12" 
                  onClick={() => arrivedService.mutate(activeService.id)}
                  disabled={arrivedService.isPending}
                  data-testid="button-arrived"
                >
                  {arrivedService.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2" />
                  )}
                  He Llegado al Punto
                </Button>
              )}

              {activeService.estado === 'conductor_en_sitio' && (
                <Button 
                  className="w-full h-12" 
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
                  className="w-full h-12" 
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
                  className="w-full h-12" 
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
            showExpandedCard ? "max-h-[60vh]" : "max-h-14"
          )}
        >
          <button 
            className="w-full flex items-center justify-between px-4 py-2 text-muted-foreground"
            onClick={() => setShowExpandedCard(!showExpandedCard)}
            data-testid="button-toggle-requests"
          >
            <span className="text-sm font-semibold">
              {nearbyRequests.length} solicitud{nearbyRequests.length !== 1 ? 'es' : ''} cercana{nearbyRequests.length !== 1 ? 's' : ''}
            </span>
            {showExpandedCard ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <div className={cn(
            "overflow-y-auto transition-all duration-300 px-4 pb-4 space-y-3",
            showExpandedCard ? "max-h-[calc(60vh-56px)]" : "max-h-0 overflow-hidden"
          )}>
            {nearbyRequests.map((request) => (
              <Card key={request.id} className="p-4" data-testid={`request-${request.id}`}>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <div className="w-0.5 h-8 bg-border" />
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{request.origenDireccion}</p>
                      <p className="text-sm text-muted-foreground truncate">{request.destinoDireccion}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="font-bold text-primary">
                        RD$ {parseFloat(request.costoTotal as string).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {parseFloat(request.distanciaKm as string).toFixed(1)} km
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-10"
                      data-testid={`button-reject-${request.id}`}
                    >
                      Rechazar
                    </Button>
                    <Button
                      className="flex-1 h-10"
                      onClick={() => acceptService.mutate(request.id)}
                      disabled={acceptService.isPending}
                      data-testid={`button-accept-${request.id}`}
                    >
                      {acceptService.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Aceptar'
                      )}
                    </Button>
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
            <DrawerTitle>Chat con el Cliente</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden px-4 pb-4">
            {user && activeService && (
              <ChatBox
                servicioId={activeService.id}
                currentUserId={user.id}
                currentUserNombre={user.nombre}
                currentUserApellido={user.apellido}
                otherUserName={activeService.cliente ? `${activeService.cliente.nombre} ${activeService.cliente.apellido}` : 'Cliente'}
                userType="conductor"
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title="Completar Servicio"
        description="¿Estás seguro de que deseas marcar este servicio como completado? Esta acción no se puede deshacer."
        confirmText="Completar"
        onConfirm={handleConfirmAction}
        isLoading={completeService.isPending}
      />
    </div>
  );
}
