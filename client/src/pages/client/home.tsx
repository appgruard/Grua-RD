import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { calculateRoute, type Coordinates } from '@/lib/maps';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function ClientHome() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<Coordinates>({ lat: 18.4861, lng: -69.9312 }); // Santo Domingo
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'origin' | 'destination' | 'confirm'>('origin');

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

    setLoading(true);
    try {
      const route = await calculateRoute(origin, destination);
      setDistance(route.distanceKm);

      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distanceKm: route.distanceKm }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCost(data.total);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo calcular la ruta',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  const handleConfirmRequest = async () => {
    if (!origin || !destination || !distance || !cost) return;

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/services/request', {
        origenLat: origin.lat,
        origenLng: origin.lng,
        origenDireccion: `${origin.lat}, ${origin.lng}`,
        destinoLat: destination.lat,
        destinoLng: destination.lng,
        destinoDireccion: `${destination.lat}, ${destination.lng}`,
        distanciaKm: distance,
        costoTotal: cost,
        metodoPago: 'efectivo',
      });

      if (response.ok) {
        const service = await response.json();
        toast({
          title: 'Solicitud enviada',
          description: 'Esperando que un conductor acepte',
        });
        setLocation(`/client/tracking/${service.id}`);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la solicitud',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

          {step === 'confirm' && distance && cost && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold mb-2">Confirmar Solicitud</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Distancia</p>
                    <p className="text-xl font-bold" data-testid="text-distance">{distance.toFixed(1)} km</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Costo</p>
                    <p className="text-xl font-bold" data-testid="text-cost">RD$ {cost.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmRequest}
                  disabled={loading}
                  className="flex-1"
                  data-testid="button-confirm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Confirmar'
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
