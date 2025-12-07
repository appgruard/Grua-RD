import { useEffect, useState, useRef, useMemo } from 'react';
import { useRoute, useSearch } from 'wouter';
import { MapboxMapWithFastLoad } from '@/components/maps/LazyMapboxMap';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, MessageCircle, Loader2, Star, Truck, Car, AlertTriangle, DollarSign, Navigation, Clock, CreditCard, CheckCircle, XCircle } from 'lucide-react';
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
import type { Coordinates } from '@/lib/maps';

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
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [paymentConfirmationOpen, setPaymentConfirmationOpen] = useState(false);
  const [hasShownCompletionFlow, setHasShownCompletionFlow] = useState(false);
  const [paymentStatusShown, setPaymentStatusShown] = useState(false);
  const lastRouteCalcRef = useRef<number>(0);
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

  const createPaymentMutation = useMutation({
    mutationFn: async (servicioId: string) => {
      const res = await apiRequest('POST', '/api/pagadito/create-payment', { servicioId });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al crear pago');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo iniciar el pago',
        variant: 'destructive',
      });
    },
  });

  const handlePayNow = () => {
    if (serviceId) {
      createPaymentMutation.mutate(serviceId);
    }
  };

  const { data: service, isLoading } = useQuery<ServicioWithDetails>({
    queryKey: ['/api/services', serviceId],
    enabled: !!serviceId,
  });

  const { data: existingRating, isLoading: isLoadingRating, isFetched: isRatingFetched } = useQuery<Calificacion | null>({
    queryKey: ['/api/services', serviceId, 'calificacion'],
    enabled: !!serviceId && service?.estado === 'completado',
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
      setDriverLocation({
        lat: payload.lat,
        lng: payload.lng,
      });
      setDriverInfo({
        speed: payload.speed,
        statusMessage: payload.statusMessage,
        distanceRemaining: payload.distanceRemaining,
        lastUpdate: payload.timestamp || Date.now(),
      });
      
      const now = Date.now();
      if (now - lastRouteCalcRef.current > 30000 && service) {
        lastRouteCalcRef.current = now;
        const target = service.estado === 'en_progreso' 
          ? { lat: parseFloat(service.destinoLat as string), lng: parseFloat(service.destinoLng as string) }
          : { lat: parseFloat(service.origenLat as string), lng: parseFloat(service.origenLng as string) };
        
        getDirections({ lat: payload.lat, lng: payload.lng }, target).then(result => {
          if (result.geometry) {
            setRouteGeometry(result.geometry);
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
      queryClient.invalidateQueries({ queryKey: ['/api/services', serviceId] });
      if (message.payload.estado === 'completado' && !hasShownCompletionFlow && isRatingFetched && existingRating === null) {
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

  const origin = useMemo(() => {
    if (!service) return { lat: 0, lng: 0 };
    return { lat: parseFloat(service.origenLat as string), lng: parseFloat(service.origenLng as string) };
  }, [service?.origenLat, service?.origenLng]);

  const destination = useMemo(() => {
    if (!service) return { lat: 0, lng: 0 };
    return { lat: parseFloat(service.destinoLat as string), lng: parseFloat(service.destinoLng as string) };
  }, [service?.destinoLat, service?.destinoLng]);

  const markers = useMemo(() => {
    if (!service) return [];
    return [
      { position: origin, title: 'Origen', color: '#22c55e', type: 'origin' as const },
      { position: destination, title: 'Destino', color: '#ef4444', type: 'destination' as const },
      driverLocation && { position: driverLocation, title: 'Operador', color: '#3b82f6', type: 'driver' as const },
    ].filter(Boolean) as any[];
  }, [origin, destination, driverLocation, service]);

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

        {service.metodoPago === 'tarjeta' && service.pagaditoStatus === 'pending_payment' && service.estado === 'aceptado' && (
          <Card className="p-4 border-primary/50 bg-primary/5" data-testid="card-payment-pending">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Pago pendiente</p>
                <p className="text-sm text-muted-foreground">
                  Completa el pago para continuar con el servicio
                </p>
              </div>
              <Button
                onClick={handlePayNow}
                disabled={createPaymentMutation.isPending}
                data-testid="button-pay-now"
              >
                {createPaymentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Pagar ahora
              </Button>
            </div>
          </Card>
        )}

        {service.metodoPago === 'tarjeta' && service.pagaditoStatus === 'COMPLETED' && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600 dark:text-green-400 text-sm">
              Pago completado exitosamente
            </AlertDescription>
          </Alert>
        )}

        {service.metodoPago === 'tarjeta' && service.pagaditoStatus === 'VERIFYING' && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <Clock className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
              Tu pago esta siendo verificado. Puede tomar hasta 72 horas.
            </AlertDescription>
          </Alert>
        )}

        {service.metodoPago === 'tarjeta' && ['FAILED', 'CANCELED', 'EXPIRED', 'REVOKED'].includes(service.pagaditoStatus || '') && (
          <Card className="p-4 border-destructive/50 bg-destructive/5" data-testid="card-payment-failed">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/20">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive">Pago fallido</p>
                <p className="text-sm text-muted-foreground">
                  Hubo un error con tu pago. Intenta de nuevo.
                </p>
              </div>
              <Button
                onClick={handlePayNow}
                disabled={createPaymentMutation.isPending}
                data-testid="button-retry-payment"
              >
                {createPaymentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Reintentar
              </Button>
            </div>
          </Card>
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
