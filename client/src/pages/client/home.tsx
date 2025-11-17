import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { calculateRoute, type Coordinates } from '@/lib/maps';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';

export default function ClientHome() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<Coordinates>({ lat: 18.4861, lng: -69.9312 }); // Santo Domingo
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [step, setStep] = useState<'origin' | 'destination' | 'confirm'>('origin');
  const distanceRef = useRef<number | null>(null);

  const calculatePricingMutation = useMutation({
    mutationFn: async (distanceKm: number) => {
      const res = await apiRequest('POST', '/api/pricing/calculate', { distanceKm });
      if (!res.ok) throw new Error('Failed to calculate pricing');
      return res.json();
    },
    onSuccess: (data) => {
      setCost(data.total);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo calcular el costo. Puedes continuar sin precio o reintentar.',
        variant: 'destructive',
      });
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/services/request', data);
      if (!res.ok) throw new Error('Failed to create service');
      return res.json();
    },
    onSuccess: (service) => {
      queryClient.invalidateQueries({ queryKey: ['/api/services/my-services'] });
      toast({
        title: 'Solicitud enviada',
        description: 'Esperando que un conductor acepte',
      });
      setLocation(`/client/tracking/${service.id}`);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo crear la solicitud',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (origin && destination) {
      calculateRouteAndCost();
    }
  }, [origin, destination]);

  const calculateRouteAndCost = async () => {
    if (!origin || !destination) return;

    try {
      const route = await calculateRoute(origin, destination);
      distanceRef.current = route.distanceKm;
      setDistance(route.distanceKm);
      calculatePricingMutation.mutate(route.distanceKm);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo calcular la ruta',
        variant: 'destructive',
      });
    }
  };

  const handleMapClick = (coords: Coordinates) => {
    if (step === 'origin') {
      setOrigin(coords);
      setStep('destination');
      toast({
        title: 'Origen establecido',
        description: 'Ahora selecciona el destino',
      });
    } else if (step === 'destination') {
      setDestination(coords);
      setStep('confirm');
    }
  };

  const handleConfirmRequest = () => {
    if (!origin || !destination) return;
    
    const currentDistance = distanceRef.current || distance;
    if (!currentDistance) return;

    const DEFAULT_MIN_COST = 100;
    const finalCost = cost || DEFAULT_MIN_COST;

    createServiceMutation.mutate({
      origenLat: origin.lat,
      origenLng: origin.lng,
      origenDireccion: `${origin.lat}, ${origin.lng}`,
      destinoLat: destination.lat,
      destinoLng: destination.lng,
      destinoDireccion: `${destination.lat}, ${destination.lng}`,
      distanciaKm: Number(currentDistance.toFixed(2)),
      costoTotal: Number(finalCost.toFixed(2)),
      metodoPago: 'efectivo',
    });

    if (!cost) {
      toast({
        title: 'Servicio solicitado',
        description: 'Se usó un costo mínimo de RD$ 100. El conductor puede ajustarlo.',
      });
    }
  };

  const reset = () => {
    setOrigin(null);
    setDestination(null);
    setDistance(null);
    setCost(null);
    setStep('origin');
  };

  const markers = [
    origin && { position: origin, title: 'Origen', icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' },
    destination && { position: destination, title: 'Destino', icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' },
  ].filter(Boolean) as any[];

  return (
    <div className="relative h-full">
      <GoogleMap
        center={currentLocation}
        markers={markers}
        onMapClick={step !== 'confirm' ? handleMapClick : undefined}
        className="absolute inset-0"
      />

      <div className="absolute bottom-4 left-4 right-4">
        <Card className="p-4">
          {step === 'origin' && (
            <div className="text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Selecciona el origen</h3>
              <p className="text-sm text-muted-foreground">Toca en el mapa donde se encuentra tu vehículo</p>
            </div>
          )}

          {step === 'destination' && (
            <div className="text-center">
              <Navigation className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <h3 className="font-semibold mb-1">Selecciona el destino</h3>
              <p className="text-sm text-muted-foreground">Toca en el mapa donde quieres que lleven tu vehículo</p>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="mt-2"
                data-testid="button-reset"
              >
                Cambiar origen
              </Button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold mb-2">Confirmar Solicitud</h3>
                {distance ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Distancia</p>
                        <p className="text-xl font-bold" data-testid="text-distance">{distance.toFixed(1)} km</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Costo</p>
                        {calculatePricingMutation.isPending ? (
                          <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                        ) : cost ? (
                          <p className="text-xl font-bold" data-testid="text-cost">RD$ {cost.toFixed(2)}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground" data-testid="text-cost-unavailable">RD$ 100 (mínimo)</p>
                        )}
                      </div>
                    </div>
                    {!cost && !calculatePricingMutation.isPending && (
                      <div className="text-center py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => distance && calculatePricingMutation.mutate(distance)}
                          disabled={calculatePricingMutation.isPending}
                          data-testid="button-retry-pricing"
                        >
                          Reintentar cálculo de costo
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Calculando ruta...</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="flex-1"
                  disabled={createServiceMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmRequest}
                  disabled={!distance || createServiceMutation.isPending}
                  className="flex-1"
                  data-testid="button-confirm"
                >
                  {createServiceMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : cost ? (
                    'Confirmar'
                  ) : (
                    'Confirmar sin precio'
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
