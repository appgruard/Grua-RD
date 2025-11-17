import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { GoogleMap } from '@/components/maps/GoogleMap';
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
import { MapPin, Navigation, DollarSign, Loader2, MessageCircle, Play, CheckCircle } from 'lucide-react';
import type { Servicio, Conductor, ServicioWithDetails } from '@shared/schema';
import type { Coordinates } from '@/lib/maps';

export default function DriverDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<Coordinates>({ lat: 18.4861, lng: -69.9312 });
  const [chatOpen, setChatOpen] = useState(false);

  const { data: driverData } = useQuery<Conductor>({
    queryKey: ['/api/drivers/me'],
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
      if (!res.ok) throw new Error('Failed to update availability');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/me'] });
      toast({
        title: driverData?.disponible ? 'Ahora estás inactivo' : 'Ahora estás disponible',
        description: driverData?.disponible ? 'No recibirás nuevas solicitudes' : 'Puedes recibir solicitudes',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado de disponibilidad',
        variant: 'destructive',
      });
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
        description: 'El servicio está en progreso',
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
    <div className="relative h-full">
      <GoogleMap
        center={currentLocation}
        markers={nearbyRequests?.map(req => ({
          position: {
            lat: parseFloat(req.origenLat as string),
            lng: parseFloat(req.origenLng as string),
          },
          title: 'Solicitud',
        })) || []}
        className="absolute inset-0"
      />

      <div className="absolute top-4 left-4 right-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="availability" className="text-lg font-semibold">
                Estado
              </Label>
              <p className="text-sm text-muted-foreground">
                {driverData?.disponible ? 'Disponible para servicios' : 'No disponible'}
              </p>
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
        <div className="absolute bottom-4 left-4 right-4">
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Servicio Activo</h3>
                <Badge variant="default">{activeService.estado}</Badge>
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
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="w-4 h-4 text-destructive mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Destino</p>
                    <p className="text-sm truncate">{activeService.destinoDireccion}</p>
                  </div>
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
                  onClick={() => startService.mutate(activeService.id)}
                  disabled={startService.isPending}
                  data-testid="button-start-service"
                >
                  {startService.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Iniciar Servicio
                </Button>
              )}

              {activeService.estado === 'en_progreso' && (
                <Button 
                  className="w-full" 
                  onClick={() => completeService.mutate(activeService.id)}
                  disabled={completeService.isPending}
                  data-testid="button-complete-service"
                >
                  {completeService.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Completar Servicio
                </Button>
              )}
            </div>
          </Card>
        </div>
      ) : driverData?.disponible && nearbyRequests && nearbyRequests.length > 0 ? (
        <div className="absolute bottom-4 left-4 right-4 max-h-80 overflow-y-auto space-y-3">
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
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
