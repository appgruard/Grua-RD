import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { MapboxMap } from '@/components/maps/MapboxMap';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Phone, MessageCircle, Loader2, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/lib/websocket';
import { useAuth } from '@/lib/auth';
import { ChatBox } from '@/components/chat/ChatBox';
import { RatingModal, StarRating } from '@/components/RatingModal';
import { PaymentConfirmationModal } from '@/components/PaymentConfirmationModal';
import type { ServicioWithDetails, Calificacion } from '@shared/schema';
import type { Coordinates } from '@/lib/maps';

export default function ClientTracking() {
  const [, params] = useRoute('/client/tracking/:id');
  const serviceId = params?.id;
  const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [paymentConfirmationOpen, setPaymentConfirmationOpen] = useState(false);
  const [hasShownCompletionFlow, setHasShownCompletionFlow] = useState(false);
  const { user } = useAuth();

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
      setDriverLocation({
        lat: parseFloat(message.payload.lat),
        lng: parseFloat(message.payload.lng),
      });
    }
    if (message.type === 'service_status_change' && message.payload.id === serviceId) {
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

  if (isLoading || !service) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const origin = { lat: parseFloat(service.origenLat as string), lng: parseFloat(service.origenLng as string) };
  const destination = { lat: parseFloat(service.destinoLat as string), lng: parseFloat(service.destinoLng as string) };

  const markers = [
    { position: origin, title: 'Origen', color: '#22c55e', type: 'origin' as const },
    { position: destination, title: 'Destino', color: '#ef4444', type: 'destination' as const },
    driverLocation && { position: driverLocation, title: 'Conductor', color: '#3b82f6', type: 'driver' as const },
  ].filter(Boolean) as any[];

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
    pendiente: 'Buscando conductor...',
    aceptado: 'Conductor en camino',
    conductor_en_sitio: 'Conductor en el punto',
    cargando: 'Cargando vehiculo',
    en_progreso: 'En ruta al destino',
    completado: 'Servicio completado',
    cancelado: 'Servicio cancelado',
  };

  const driverName = service.conductor ? `${service.conductor.nombre} ${service.conductor.apellido}` : 'Conductor';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative min-h-0">
        <MapboxMap
          center={driverLocation || origin}
          markers={markers}
          className="absolute inset-0"
        />
      </div>

      <div className="absolute top-4 left-4 right-4 z-10">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold mb-1">Estado del Servicio</h3>
              <Badge variant={statusColors[service.estado]} data-testid="badge-status">
                {statusLabels[service.estado]}
              </Badge>
            </div>
            {service.conductor && service.estado !== 'completado' && service.estado !== 'cancelado' && (
              <div className="flex gap-2">
                <Button size="icon" variant="outline" data-testid="button-call">
                  <Phone className="w-4 h-4" />
                </Button>
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
      </div>

      {service.conductor && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
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
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold" data-testid="text-total">
                  RD$ {parseFloat(service.costoTotal as string).toFixed(2)}
                </p>
              </div>
            </div>
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
        </div>
      )}

      <Drawer open={chatOpen} onOpenChange={setChatOpen}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>Chat con el Conductor</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden px-4 pb-4">
            {user && service && (
              <ChatBox
                servicioId={serviceId!}
                currentUserId={user.id}
                currentUserNombre={user.nombre}
                currentUserApellido={user.apellido}
                otherUserName={driverName}
                userType="cliente"
              />
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
