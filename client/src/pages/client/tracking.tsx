import { useEffect, useState, useRef, useMemo } from 'react';
import { useRoute, useSearch } from 'wouter';
import { MapboxMapWithFastLoad } from '@/components/maps/LazyMapboxMap';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, MessageCircle, Loader2, Star, Truck, Car, AlertTriangle, DollarSign, Navigation, Clock, CreditCard, CheckCircle, XCircle, ShieldCheck, ShieldAlert, MoveRight } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useWebSocket } from '@/lib/websocket';
import { useAuth } from '@/lib/auth';
import { ChatBox } from '@/components/chat/ChatBox';
import { NegotiationChatBox } from '@/components/chat/NegotiationChatBox';
import { RatingModal, StarRating } from '@/components/RatingModal';
import { PaymentConfirmationModal } from '@/components/PaymentConfirmationModal';
import { getDirections, formatDuration, formatDistance, formatETATime, calculateETATime } from '@/lib/mapbox-directions';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ServicioWithDetails, Calificacion } from '@shared/schema';
import type { Coordinates, RouteGeometry } from '@/lib/maps';

interface DriverLocationUpdate {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: number;
  driverStatus: string;
  statusMessage: string;
  distanceRemaining: number;
}

interface DriverPublicProfile {
  id: string;
  nombre: string;
  apellido: string;
  fotoUrl?: string;
  calificacionPromedio?: string;
  licenciaCategoria?: string;
  licenciaRestricciones?: string;
  licenciaCategoriaVerificada?: boolean;
  vehiculos?: Array<{
    id: string;
    categoria: string;
    placa: string;
    color: string;
    marca?: string;
    modelo?: string;
    fotoUrl?: string;
  }>;
}

// License category descriptions for Dominican Republic (INTRANT categories - numeric)
const LICENSE_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  '01': 'Motocicletas y Pasolas',
  '02': 'Vehículos Livianos (hasta 5 ton)',
  '03': 'Vehículos Pesados (camiones)',
  '04': 'Transporte Público y Emergencias',
  '05': 'Materiales Peligrosos',
  '06': 'Licencia Profesional',
  '1': 'Motocicletas y Pasolas',
  '2': 'Vehículos Livianos (hasta 5 ton)',
  '3': 'Vehículos Pesados (camiones)',
  '4': 'Transporte Público y Emergencias',
  '5': 'Materiales Peligrosos',
  '6': 'Licencia Profesional',
};

export default function ClientTracking() {
  const [, params] = useRoute('/client/tracking/:id');
  const serviceId = params?.id;
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const { toast } = useToast();
  const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
  const [driverInfo, setDriverInfo] = useState<{
    speed: number;
    statusMessage: string;
    distanceRemaining: number;
    lastUpdate: number;
  } | null>(null);
  const [eta, setEta] = useState<{ minutes: number; arrivalTime: Date } | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [paymentConfirmationOpen, setPaymentConfirmationOpen] = useState(false);
  const [hasShownCompletionFlow, setHasShownCompletionFlow] = useState(false);
  const [paymentStatusShown, setPaymentStatusShown] = useState(false);
  const lastRouteCalcRef = useRef<number>(0);
  const driverLocationRef = useRef<Coordinates | null>(null);
  const { user } = useAuth();

  const searchParams = new URLSearchParams(searchString);
  const paymentStatus = searchParams.get('payment');

  useEffect(() => {
    if (paymentStatus && !paymentStatusShown) {
      setPaymentStatusShown(true);
      // Invalidate query to refresh service data with new payment status
      queryClient.invalidateQueries({ queryKey: ['/api/services', serviceId] });
      
      if (paymentStatus === 'success') {
        toast({
          title: 'Pago exitoso',
          description: 'Tu pago ha sido procesado correctamente',
        });
      } else if (paymentStatus === 'pending') {
        toast({
          title: 'Pago en verificacion',
          description: 'Tu pago esta siendo verificado. Puede tomar hasta 72 horas.',
        });
      } else if (paymentStatus === 'failed') {
        toast({
          title: 'Pago fallido',
          description: 'Hubo un error al procesar tu pago. Por favor intenta de nuevo.',
          variant: 'destructive',
        });
      }
      window.history.replaceState({}, '', `/client/tracking/${serviceId}`);
    }
  }, [paymentStatus, paymentStatusShown, serviceId, toast, queryClient]);

  const { data: service, isLoading } = useQuery<ServicioWithDetails>({
    queryKey: ['/api/services', serviceId],
    enabled: !!serviceId,
  });

  const { data: existingRating, isLoading: isLoadingRating, isFetched: isRatingFetched } = useQuery<Calificacion | null>({
    queryKey: ['/api/services', serviceId, 'calificacion'],
    enabled: !!serviceId && service?.estado === 'completado',
  });

  const { data: driverPublicProfile } = useQuery<DriverPublicProfile>({
    queryKey: ['/api/drivers', service?.conductorId, 'public-profile'],
    enabled: !!service?.conductorId,
  });

  const showCompletionFlow = () => {
    if (service?.metodoPago === 'efectivo') {
      setPaymentConfirmationOpen(true);
    } else {
      setRatingModalOpen(true);
    }
  };

  const handlePaymentConfirmed = () => {
    setPaymentConfirmationOpen(false);
    setTimeout(() => setRatingModalOpen(true), 300);
  };

  const { send } = useWebSocket((message) => {
    if (message.type === 'driver_location_update' && message.payload.servicioId === serviceId) {
      const payload = message.payload as DriverLocationUpdate;
      const newDriverLocation = { lat: payload.lat, lng: payload.lng };
      setDriverLocation(newDriverLocation);
      driverLocationRef.current = newDriverLocation;
      setDriverInfo({
        speed: payload.speed,
        statusMessage: payload.statusMessage,
        distanceRemaining: payload.distanceRemaining,
        lastUpdate: payload.timestamp || Date.now(),
      });
      
      const now = Date.now();
      if (now - lastRouteCalcRef.current > 30000 && service) {
        lastRouteCalcRef.current = now;
        let target: Coordinates;
        if (service.estado === 'en_progreso') {
          if (service.destinoExtendidoLat && service.destinoExtendidoLng) {
            target = { lat: parseFloat(service.destinoExtendidoLat as string), lng: parseFloat(service.destinoExtendidoLng as string) };
          } else {
            target = { lat: parseFloat(service.destinoLat as string), lng: parseFloat(service.destinoLng as string) };
          }
        } else {
          target = { lat: parseFloat(service.origenLat as string), lng: parseFloat(service.origenLng as string) };
        }
        
        getDirections(newDriverLocation, target).then(result => {
          if (result.geometry) {
            setRouteGeometry(result.geometry as RouteGeometry);
          }
          const etaMinutes = Math.ceil(result.duration / 60);
          setEta({
            minutes: etaMinutes,
            arrivalTime: calculateETATime(result.duration)
          });
        }).catch(console.error);
      }
    }
    if (message.type === 'service_status_change' && message.payload.id === serviceId) {
      const updatedService = message.payload;
      
      queryClient.setQueryData(['/api/services', serviceId], updatedService);
      
      const currentDriverLocation = driverLocationRef.current;
      if (updatedService.destinoExtendidoLat && updatedService.destinoExtendidoLng && currentDriverLocation) {
        const target: Coordinates = {
          lat: parseFloat(updatedService.destinoExtendidoLat as string),
          lng: parseFloat(updatedService.destinoExtendidoLng as string)
        };
        lastRouteCalcRef.current = Date.now();
        getDirections(currentDriverLocation, target).then(result => {
          if (result.geometry) {
            setRouteGeometry(result.geometry as RouteGeometry);
          }
          const etaMinutes = Math.ceil(result.duration / 60);
          setEta({
            minutes: etaMinutes,
            arrivalTime: calculateETATime(result.duration)
          });
        }).catch(console.error);
      }
      
      if (updatedService.estado === 'completado' && !hasShownCompletionFlow && isRatingFetched && existingRating === null) {
        setHasShownCompletionFlow(true);
        showCompletionFlow();
      }
    }
  });

  useEffect(() => {
    if (serviceId) {
      send({ type: 'join_service', payload: { serviceId, role: 'client' } });
    }
  }, [serviceId, send]);

  useEffect(() => {
    if (service?.estado === 'completado' && !hasShownCompletionFlow && isRatingFetched && existingRating === null) {
      setHasShownCompletionFlow(true);
      setTimeout(() => showCompletionFlow(), 500);
    }
  }, [service?.estado, hasShownCompletionFlow, existingRating, isRatingFetched, service?.metodoPago]);

  useEffect(() => {
    if (!service || !driverLocation) return;
    if (service.estado !== 'en_progreso') return;
    if (!service.destinoExtendidoLat || !service.destinoExtendidoLng) return;
    
    const target: Coordinates = {
      lat: parseFloat(service.destinoExtendidoLat as string),
      lng: parseFloat(service.destinoExtendidoLng as string)
    };
    
    lastRouteCalcRef.current = Date.now();
    getDirections(driverLocation, target).then(result => {
      if (result.geometry) {
        setRouteGeometry(result.geometry as RouteGeometry);
      }
      const etaMinutes = Math.ceil(result.duration / 60);
      setEta({
        minutes: etaMinutes,
        arrivalTime: calculateETATime(result.duration)
      });
    }).catch(console.error);
  }, [service?.destinoExtendidoLat, service?.destinoExtendidoLng, driverLocation]);

  const origin = useMemo(() => {
    if (!service) return { lat: 0, lng: 0 };
    return { lat: parseFloat(service.origenLat as string), lng: parseFloat(service.origenLng as string) };
  }, [service?.origenLat, service?.origenLng]);

  const destination = useMemo(() => {
    if (!service) return { lat: 0, lng: 0 };
    return { lat: parseFloat(service.destinoLat as string), lng: parseFloat(service.destinoLng as string) };
  }, [service?.destinoLat, service?.destinoLng]);

  const extendedDestination = useMemo(() => {
    if (!service?.destinoExtendidoLat || !service?.destinoExtendidoLng) return null;
    return { 
      lat: parseFloat(service.destinoExtendidoLat as string), 
      lng: parseFloat(service.destinoExtendidoLng as string) 
    };
  }, [service?.destinoExtendidoLat, service?.destinoExtendidoLng]);

  const markers = useMemo(() => {
    if (!service) return [];
    const markersList = [
      { position: origin, title: 'Origen', color: '#22c55e', type: 'origin' as const },
      { position: destination, title: 'Destino original', color: extendedDestination ? '#6b7280' : '#ef4444', type: extendedDestination ? 'default' as const : 'destination' as const },
      driverLocation && { position: driverLocation, title: 'Operador', color: '#3b82f6', type: 'driver' as const },
    ];
    if (extendedDestination) {
      markersList.push({ position: extendedDestination, title: 'Destino extendido', color: '#ef4444', type: 'destination' as const });
    }
    return markersList.filter(Boolean) as any[];
  }, [origin, destination, driverLocation, service, extendedDestination]);

  if (isLoading || !service) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusColors = {
    pendiente: 'secondary',
    aceptado: 'default',
    conductor_en_sitio: 'default',
    cargando: 'default',
    en_progreso: 'default',
    completado: 'default',
    cancelado: 'destructive',
  } as const;

  const statusLabels = {
    pendiente: 'Buscando operador...',
    aceptado: 'Operador en camino',
    conductor_en_sitio: 'Operador en el punto',
    cargando: 'Cargando vehiculo',
    en_progreso: 'En ruta al destino',
    completado: 'Servicio completado',
    cancelado: 'Servicio cancelado',
  };

  const negotiationStatusLabels: Record<string, string> = {
    no_aplica: '',
    pendiente_evaluacion: 'Esperando evaluacion',
    propuesto: 'Precio propuesto',
    confirmado: 'Precio confirmado',
    aceptado: 'Precio aceptado',
    rechazado: 'Precio rechazado',
  };

  const negotiationStatusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    no_aplica: 'secondary',
    pendiente_evaluacion: 'secondary',
    propuesto: 'outline',
    confirmado: 'outline',
    aceptado: 'default',
    rechazado: 'destructive',
  };

  const isNegotiationService = service.requiereNegociacion;
  const showNegotiationStatus = isNegotiationService && service.estadoNegociacion && service.estadoNegociacion !== 'no_aplica';

  const driverName = service.conductor ? `${service.conductor.nombre} ${service.conductor.apellido}` : 'Operador';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative h-[40%] min-h-[180px] flex-shrink-0">
        <MapboxMapWithFastLoad
          center={driverLocation || origin}
          markers={markers}
          className="absolute inset-0"
          routeGeometry={routeGeometry}
        />
        
        <div className="absolute top-3 left-3 right-3 z-10 space-y-2">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold mb-1">Estado del Servicio</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusColors[service.estado]} data-testid="badge-status">
                  {statusLabels[service.estado]}
                </Badge>
                {showNegotiationStatus && (
                  <Badge 
                    variant={negotiationStatusColors[service.estadoNegociacion || 'no_aplica']}
                    className="gap-1"
                    data-testid="badge-negotiation-status"
                  >
                    <DollarSign className="w-3 h-3" />
                    {negotiationStatusLabels[service.estadoNegociacion || 'no_aplica']}
                  </Badge>
                )}
              </div>
            </div>
            {service.conductor && service.estado !== 'completado' && service.estado !== 'cancelado' && (
              <div className="flex gap-2">
                {service.conductor.phone ? (
                  <a 
                    href={`tel:${service.conductor.phone}`}
                    data-testid="button-call"
                  >
                    <Button 
                      size="icon" 
                      variant="outline"
                      type="button"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                ) : (
                  <Button 
                    size="icon" 
                    variant="outline"
                    disabled
                    data-testid="button-call"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  size="icon" 
                  variant="outline" 
                  data-testid="button-message"
                  onClick={() => setChatOpen(true)}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
            {service.estado === 'completado' && !existingRating && (
              <Button
                variant="default"
                onClick={() => setRatingModalOpen(true)}
                data-testid="button-rate-service"
              >
                <Star className="w-4 h-4 mr-2" />
                Calificar
              </Button>
            )}
          </div>
        </Card>

        {driverInfo && ['aceptado', 'conductor_en_sitio', 'cargando', 'en_progreso'].includes(service.estado) && (
          <Card className="p-4" data-testid="card-driver-status">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Truck className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg" data-testid="text-driver-status">
                  {driverInfo.statusMessage}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {eta && (
                    <span className="flex items-center gap-1" data-testid="text-eta">
                      <Clock className="w-4 h-4" />
                      Llega en ~{eta.minutes} min ({formatETATime(eta.arrivalTime)})
                    </span>
                  )}
                  {driverInfo.distanceRemaining > 0 && (
                    <span className="flex items-center gap-1" data-testid="text-distance">
                      <Navigation className="w-4 h-4" />
                      {formatDistance(driverInfo.distanceRemaining)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {isNegotiationService && service.estado === 'pendiente' && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
              Esperando que un operador evalue la situacion y proponga un precio.
            </AlertDescription>
          </Alert>
        )}

        {isNegotiationService && service.estadoNegociacion === 'propuesto' && (
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <DollarSign className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-600 dark:text-blue-400 text-sm">
              El operador ha propuesto un precio. Abre el chat para ver y responder.
            </AlertDescription>
          </Alert>
        )}

        {service.destinoExtendidoLat && service.estado === 'en_progreso' && (
          <Alert className="bg-blue-500/10 border-blue-500/30" data-testid="alert-extended-destination">
            <MoveRight className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-600 dark:text-blue-400 text-sm">
              <span className="font-medium">Destino extendido:</span> {service.destinoExtendidoDireccion}
              {service.distanciaExtensionKm && (
                <span className="block mt-0.5 text-xs">+{parseFloat(service.distanciaExtensionKm as string).toFixed(2)} km adicionales</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-6 space-y-3">
      {service.conductor && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback>
                  {service.conductor.nombre[0]}{service.conductor.apellido[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold" data-testid="text-driver-name">
                  {service.conductor.nombre} {service.conductor.apellido}
                </p>
                <p className="text-sm text-muted-foreground">
                  {service.conductor.calificacionPromedio ? (
                    <StarRating rating={parseFloat(service.conductor.calificacionPromedio as string)} size="sm" showValue />
                  ) : (
                    'Sin calificaciones'
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {isNegotiationService && service.estadoNegociacion !== 'aceptado' ? 'Precio' : 'Total'}
                </p>
                {isNegotiationService && service.estadoNegociacion !== 'aceptado' ? (
                  service.montoNegociado ? (
                    <p className="text-xl font-bold text-amber-600" data-testid="text-total">
                      RD$ {parseFloat(service.montoNegociado as string).toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-amber-600" data-testid="text-total">
                      Por definir
                    </p>
                  )
                ) : (
                  <p className="text-xl font-bold" data-testid="text-total">
                    RD$ {parseFloat(service.montoNegociado as string || service.costoTotal as string).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            
            {driverPublicProfile?.licenciaCategoria && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Licencia:</span>
                    <Badge variant="outline" data-testid="badge-driver-license-category">
                      Cat. {driverPublicProfile.licenciaCategoria}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {LICENSE_CATEGORY_DESCRIPTIONS[driverPublicProfile.licenciaCategoria] || ''}
                    </span>
                  </div>
                  {driverPublicProfile.licenciaCategoriaVerificada && (
                    <Badge variant="default" className="gap-1" data-testid="badge-driver-license-verified">
                      <ShieldCheck className="w-3 h-3" />
                      Verificada
                    </Badge>
                  )}
                </div>
                {driverPublicProfile.licenciaRestricciones && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1" data-testid="text-driver-restrictions">
                    Restricciones: {driverPublicProfile.licenciaRestricciones}
                  </p>
                )}
              </div>
            )}

            {service.vehiculo && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    {service.vehiculo.fotoUrl ? (
                      <img
                        src={service.vehiculo.fotoUrl}
                        alt="Vehículo"
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <Truck className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" data-testid="badge-vehicle-plate">
                        {service.vehiculo.placa}
                      </Badge>
                      <span className="text-sm text-muted-foreground" data-testid="text-vehicle-color">
                        {service.vehiculo.color}
                      </span>
                    </div>
                    {(service.vehiculo.marca || service.vehiculo.modelo) && (
                      <p className="text-sm text-muted-foreground truncate" data-testid="text-vehicle-model">
                        {[service.vehiculo.marca, service.vehiculo.modelo, service.vehiculo.anio].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {existingRating && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Tu calificacion:</p>
                <div className="flex items-center gap-2">
                  <StarRating rating={existingRating.puntuacion} size="md" />
                  {existingRating.comentario && (
                    <span className="text-sm text-muted-foreground">- {existingRating.comentario}</span>
                  )}
                </div>
              </div>
            )}
          </Card>
      )}
      </div>

      <Drawer open={chatOpen} onOpenChange={setChatOpen}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>
              {isNegotiationService ? 'Negociacion con el Operador' : 'Chat con el Operador'}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden px-4 pb-4">
            {user && service && (
              isNegotiationService ? (
                <NegotiationChatBox
                  servicioId={serviceId!}
                  servicio={service}
                  currentUserId={user.id}
                  currentUserNombre={user.nombre}
                  currentUserApellido={user.apellido}
                  userType="cliente"
                />
              ) : (
                <ChatBox
                  servicioId={serviceId!}
                  currentUserId={user.id}
                  currentUserNombre={user.nombre}
                  currentUserApellido={user.apellido}
                  otherUserName={driverName}
                  userType="cliente"
                />
              )
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {service.conductor && (
        <>
          <PaymentConfirmationModal
            isOpen={paymentConfirmationOpen}
            onClose={() => setPaymentConfirmationOpen(false)}
            onConfirmed={handlePaymentConfirmed}
            serviceId={serviceId!}
            expectedAmount={parseFloat(service.costoTotal as string)}
            metodoPago={service.metodoPago}
          />
          <RatingModal
            isOpen={ratingModalOpen}
            onClose={() => setRatingModalOpen(false)}
            serviceId={serviceId!}
            driverName={driverName}
          />
        </>
      )}
    </div>
  );
}
