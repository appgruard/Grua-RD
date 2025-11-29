import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { MapboxMap } from '@/components/maps/MapboxMap';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/lib/websocket';
import { ChatBox } from '@/components/chat/ChatBox';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MapPin, Navigation, DollarSign, Loader2, MessageCircle, Play, CheckCircle, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { SiWaze } from 'react-icons/si';
import type { Servicio, Conductor, ServicioWithDetails, Documento } from '@shared/schema';
import type { Coordinates } from '@/lib/maps';
import { getNavigationUrl } from '@/lib/maps';

export default function DriverDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<Coordinates>({ lat: 18.4861, lng: -69.9312 });
  const [chatOpen, setChatOpen] = useState(false);
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
          title: 'Documentos pendientes',
          description: `Debes tener todos tus documentos aprobados. Documentos pendientes: ${documentsList}`,
          variant: 'destructive',
        });
      } else if (errorResponse?.message) {
        toast({
          title: 'Error',
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

  useEffect(() => {
    if ('geolocation' in navigator && driverData?.disponible) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);

          apiRequest('PUT', '/api/drivers/location', newLocation);
        },
        (error) => {
          console.error('Error watching location:', error);
        },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [driverData?.disponible]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative min-h-0">
        <MapboxMap
          center={currentLocation}
          markers={nearbyRequests?.map(req => ({
            position: {
              lat: parseFloat(req.origenLat as string),
              lng: parseFloat(req.origenLng as string),
            },
            title: 'Solicitud',
            color: '#F5A623',
          })) || []}
          className="absolute inset-0"
        />
      </div>

      <div className="absolute top-4 left-4 right-4 z-10">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="availability" className="text-lg font-semibold">
                Estado
              </Label>
              <p className="text-sm text-muted-foreground">
                {driverData?.disponible ? 'Disponible para servicios' : 'No disponible'}
              </p>
              {driverDocuments && (() => {
                const { complete, missing } = checkDocumentsComplete();
                return (
                  <div className="mt-2">
                    {complete ? (
                      <Badge variant="secondary" className="gap-1" data-testid="badge-documents-complete">
                        <CheckCircle2 className="w-3 h-3" />
                        Documentos completos
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1" data-testid="badge-documents-pending">
                        <AlertCircle className="w-3 h-3" />
                        {missing} documento{missing !== 1 ? 's' : ''} pendiente{missing !== 1 ? 's' : ''}
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
              data-testid="switch-availability"
            />
          </div>
        </Card>
      </div>

      {activeService ? (
        <div className="absolute bottom-4 left-4 right-4 z-10 max-h-[60vh] overflow-y-auto">
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Servicio Activo</h3>
                <Badge variant="default">
                  {activeService.estado === 'aceptado' && 'Aceptado'}
                  {activeService.estado === 'conductor_en_sitio' && 'En sitio'}
                  {activeService.estado === 'cargando' && 'Cargando'}
                  {activeService.estado === 'en_progreso' && 'En ruta'}
                  {activeService.estado === 'completado' && 'Completado'}
                </Badge>
              </div>

              {activeService.cliente && (
                <div className="flex items-center justify-between pb-2 border-b">
                  <div>
                    <p className="text-sm font-medium">Cliente</p>
                    <p className="text-sm text-muted-foreground">
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

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-600 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Origen</p>
                    <p className="text-sm truncate">{activeService.origenDireccion}</p>
                  </div>
                  {(activeService.estado === 'aceptado' || activeService.estado === 'conductor_en_sitio') && (() => {
                    const navUrl = getNavigationUrl(activeService.origenLat, activeService.origenLng);
                    if (!navUrl) return null;
                    return (
                      <a
                        href={navUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        <Button size="sm" variant="outline" className="gap-1" data-testid="button-waze-origin">
                          <SiWaze className="w-4 h-4 text-[#33CCFF]" />
                          Navegar
                        </Button>
                      </a>
                    );
                  })()}
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="w-4 h-4 text-destructive mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Destino</p>
                    <p className="text-sm truncate">{activeService.destinoDireccion}</p>
                  </div>
                  {(activeService.estado === 'cargando' || activeService.estado === 'en_progreso') && (() => {
                    const navUrl = getNavigationUrl(activeService.destinoLat, activeService.destinoLng);
                    if (!navUrl) return null;
                    return (
                      <a
                        href={navUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        <Button size="sm" variant="outline" className="gap-1" data-testid="button-waze-destination">
                          <SiWaze className="w-4 h-4 text-[#33CCFF]" />
                          Navegar
                        </Button>
                      </a>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold">
                    RD$ {parseFloat(activeService.costoTotal as string).toFixed(2)}
                  </span>
                </div>
                <Badge variant="secondary">
                  {parseFloat(activeService.distanciaKm as string).toFixed(1)} km
                </Badge>
              </div>

              {activeService.estado === 'aceptado' && (
                <Button 
                  className="w-full" 
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
                  className="w-full" 
                  onClick={() => loadingService.mutate(activeService.id)}
                  disabled={loadingService.isPending || arrivedService.isPending}
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
                  className="w-full" 
                  onClick={() => startService.mutate(activeService.id)}
                  disabled={startService.isPending || loadingService.isPending || arrivedService.isPending}
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
                  className="w-full" 
                  onClick={() => setConfirmDialog({ open: true, action: 'complete', serviceId: activeService.id })}
                  data-testid="button-complete-service"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completar Servicio
                </Button>
              )}
            </div>
          </Card>
        </div>
      ) : driverData?.disponible && nearbyRequests && nearbyRequests.length > 0 ? (
        <div className="absolute bottom-4 left-4 right-4 z-10 max-h-[50vh] overflow-y-auto space-y-3">
          <h3 className="text-sm font-semibold text-white bg-black/50 backdrop-blur-sm p-2 rounded-lg">
            Solicitudes Cercanas ({nearbyRequests.length})
          </h3>
          {nearbyRequests.map((request) => (
            <Card key={request.id} className="p-4" data-testid={`request-${request.id}`}>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-600 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Recoger en</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {request.origenDireccion}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="w-4 h-4 text-destructive mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Llevar a</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {request.destinoDireccion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">
                      RD$ {parseFloat(request.costoTotal as string).toFixed(2)}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {parseFloat(request.distanciaKm as string).toFixed(1)} km
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-reject-${request.id}`}
                  >
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
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
      ) : null}

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
        onOpenChange={(open) => setConfirmDialog({ open, action: null, serviceId: null })}
        title={confirmDialog.action === 'complete' ? '¿Completar servicio?' : '¿Iniciar servicio?'}
        description={
          confirmDialog.action === 'complete'
            ? 'Confirma que has llegado al destino y completado el servicio. Esta acción no se puede deshacer.'
            : 'Confirma que estás listo para comenzar el servicio y dirigirte al destino.'
        }
        confirmLabel={confirmDialog.action === 'complete' ? 'Completar' : 'Iniciar'}
        onConfirm={handleConfirmAction}
        loading={completeService.isPending || startService.isPending}
      />
    </div>
  );
}
