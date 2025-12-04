import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { NegotiationChatBox } from '@/components/chat/NegotiationChatBox';
import { MapboxMap } from '@/components/maps/MapboxMap';
import { ArrowLeft, MapPin, AlertTriangle, Car, DollarSign, Loader2, MessageCircle, Camera, Send } from 'lucide-react';
import type { ServicioWithDetails, Conductor } from '@shared/schema';
import { cn } from '@/lib/utils';

const extractionSubtypeLabels: Record<string, string> = {
  zanja: "Vehiculo en zanja",
  lodo: "Vehiculo atascado en lodo",
  volcado: "Vehiculo volcado",
  accidente: "Vehiculo accidentado",
  dificil: "Acceso dificil"
};

const vehicleTypeLabels: Record<string, string> = {
  carro: "Carro",
  motor: "Motocicleta",
  jeep: "Jeep/SUV",
  camion: "Camion"
};

const getExtractionSubtypeLabel = (subtype: string | null | undefined): string => {
  if (!subtype) return "Extraccion";
  return extractionSubtypeLabels[subtype] || subtype;
};

const getVehicleTypeLabel = (type: string | null | undefined): string => {
  if (!type) return "No especificado";
  return vehicleTypeLabels[type] || type;
};

const getNegotiationStatusLabel = (status: string | null | undefined): string => {
  switch (status) {
    case 'pendiente_evaluacion': return 'Pendiente de evaluacion';
    case 'propuesto': return 'Propuesta enviada';
    case 'confirmado': return 'Confirmado por cliente';
    case 'aceptado': return 'Aceptado';
    case 'rechazado': return 'Rechazado';
    default: return 'Sin estado';
  }
};

const getNegotiationStatusColor = (status: string | null | undefined): string => {
  switch (status) {
    case 'pendiente_evaluacion': return 'bg-amber-500/10 text-amber-600 border-amber-500';
    case 'propuesto': return 'bg-blue-500/10 text-blue-600 border-blue-500';
    case 'confirmado': return 'bg-green-500/10 text-green-600 border-green-500';
    case 'aceptado': return 'bg-green-500/10 text-green-600 border-green-500';
    case 'rechazado': return 'bg-red-500/10 text-red-600 border-red-500';
    default: return 'bg-muted text-muted-foreground border-muted';
  }
};

export default function ExtractionEvaluation() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/driver/extraction-evaluation/:id');
  const serviceId = params?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showChat, setShowChat] = useState(false);
  const [proposedAmount, setProposedAmount] = useState('');

  const { data: driverData } = useQuery<Conductor>({
    queryKey: ['/api/drivers/me'],
  });

  const { data: service, isLoading: serviceLoading } = useQuery<ServicioWithDetails>({
    queryKey: ['/api/services', serviceId],
    enabled: !!serviceId,
    refetchInterval: 5000,
  });

  const acceptAndPropose = useMutation({
    mutationFn: async () => {
      if (!serviceId || !proposedAmount) return;
      const amount = parseFloat(proposedAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Monto invalido');
      }
      await apiRequest('POST', `/api/services/${serviceId}/accept`);
      await apiRequest('POST', `/api/negotiation/${serviceId}/propose`, { monto: amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/active-service'] });
      toast({
        title: 'Propuesta enviada',
        description: 'Has aceptado el servicio y enviado tu propuesta de precio',
      });
      setLocation('/driver');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (!authLoading && (!user || user.userType !== 'conductor')) {
      setLocation('/login');
    }
  }, [user, authLoading, setLocation]);

  if (authLoading || serviceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Servicio no encontrado</h2>
        <p className="text-muted-foreground mb-4">El servicio que buscas no existe o ya no esta disponible</p>
        <Button onClick={() => setLocation('/driver')} data-testid="button-back-dashboard">
          Volver al Dashboard
        </Button>
      </div>
    );
  }

  if (!service.requiereNegociacion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Este servicio no requiere negociacion</h2>
        <p className="text-muted-foreground mb-4">Puedes aceptar este servicio directamente desde el dashboard</p>
        <Button onClick={() => setLocation('/driver')} data-testid="button-back-dashboard">
          Volver al Dashboard
        </Button>
      </div>
    );
  }

  const originLat = typeof service.origenLat === 'string' ? parseFloat(service.origenLat) : service.origenLat;
  const originLng = typeof service.origenLng === 'string' ? parseFloat(service.origenLng) : service.origenLng;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur-sm">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => setLocation('/driver')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Evaluacion de Extraccion</h1>
          <p className="text-xs text-muted-foreground">
            {getExtractionSubtypeLabel(service.servicioSubtipo)}
          </p>
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-xs", getNegotiationStatusColor(service.estadoNegociacion))}
          data-testid="badge-negotiation-status"
        >
          {getNegotiationStatusLabel(service.estadoNegociacion)}
        </Badge>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!showChat ? (
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="h-32 sm:h-40 rounded-lg overflow-hidden">
              <MapboxMap
                center={{ lat: originLat, lng: originLng }}
                zoom={15}
                markers={[{
                  position: { lat: originLat, lng: originLng },
                  title: 'Ubicacion del vehiculo',
                  color: '#F5A623',
                  type: 'service',
                }]}
                className="w-full h-full"
              />
            </div>

            <Card className="p-3 sm:p-4">
              <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                Ubicacion
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{service.origenDireccion}</p>
            </Card>

            <Card className="p-3 sm:p-4">
              <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
                <Car className="w-4 h-4 text-primary flex-shrink-0" />
                Vehiculo del Cliente
              </h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getVehicleTypeLabel(service.tipoVehiculo)}
                </Badge>
                {service.servicioSubtipo && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                    {getExtractionSubtypeLabel(service.servicioSubtipo)}
                  </Badge>
                )}
              </div>
            </Card>

            <Card className="p-3 sm:p-4 bg-amber-500/5 border-amber-500/30">
              <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Descripcion de la Situacion
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                {service.descripcionSituacion || 'El cliente no proporciono una descripcion detallada.'}
              </p>
            </Card>

            {service.cliente && (
              <Card className="p-3 sm:p-4">
                <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Cliente</h3>
                <p className="text-xs sm:text-sm">
                  {service.cliente.nombre} {service.cliente.apellido}
                </p>
              </Card>
            )}

            {service.estadoNegociacion === 'pendiente_evaluacion' && !service.conductorId && (
              <Card className="p-3 sm:p-4">
                <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary flex-shrink-0" />
                  Proponer Precio
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Evalua la situacion y proporciona un precio justo para el servicio de extraccion.
                </p>
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="amount" className="text-xs sm:text-sm">Monto propuesto (RD$)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Ej: 5000"
                      value={proposedAmount}
                      onChange={(e) => setProposedAmount(e.target.value)}
                      className="text-base sm:text-lg"
                      data-testid="input-proposed-amount"
                    />
                  </div>
                  <Button
                    className="w-full h-11 sm:h-12 text-sm sm:text-base"
                    onClick={() => acceptAndPropose.mutate()}
                    disabled={!proposedAmount || acceptAndPropose.isPending}
                    data-testid="button-accept-and-propose"
                  >
                    {acceptAndPropose.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Aceptar y Enviar Propuesta
                  </Button>
                </div>
              </Card>
            )}

            {service.montoNegociado && (
              <Card className="p-3 sm:p-4 bg-green-500/10 border-green-500/30">
                <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2 text-green-600 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 flex-shrink-0" />
                  Monto Acordado
                </h3>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  RD$ {parseFloat(service.montoNegociado as string).toFixed(2)}
                </p>
              </Card>
            )}

            {service.conductorId && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowChat(true)}
                data-testid="button-open-chat"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Abrir Chat de Negociacion
              </Button>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChat(false)}
                data-testid="button-close-chat"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a detalles
              </Button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              {user && (
                <NegotiationChatBox
                  servicioId={serviceId!}
                  servicio={service}
                  currentUserId={user.id}
                  currentUserNombre={user.nombre}
                  currentUserApellido={user.apellido}
                  userType="conductor"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
