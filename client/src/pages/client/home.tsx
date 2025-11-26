import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { calculateRoute, type Coordinates } from '@/lib/maps';
import { MapPin, Loader2, Navigation, ArrowLeft, CheckCircle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { VehicleTypeSelector } from '@/components/VehicleTypeSelector';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { InsuranceForm } from '@/components/InsuranceForm';
import { Separator } from '@/components/ui/separator';

type Step = 'vehicleType' | 'origin' | 'destination' | 'payment' | 'confirm';

export default function ClientHome() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<Coordinates>({ lat: 18.4861, lng: -69.9312 }); // Santo Domingo
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [origenDireccion, setOrigenDireccion] = useState<string>('');
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinoDireccion, setDestinoDireccion] = useState<string>('');
  const [distance, setDistance] = useState<number | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [step, setStep] = useState<Step>('vehicleType');
  const [tipoVehiculo, setTipoVehiculo] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState<string>('efectivo');
  const [aseguradoraNombre, setAseguradoraNombre] = useState<string>('');
  const [aseguradoraPoliza, setAseguradoraPoliza] = useState<string>('');
  const distanceRef = useRef<number | null>(null);

  const { data: insuranceStatus } = useQuery<{
    hasApprovedInsurance: boolean;
    insuranceStatus: 'pendiente' | 'aprobado' | 'rechazado' | null;
  }>({
    queryKey: ['/api/client/insurance/status'],
  });

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
    } else if (step === 'destination') {
      setDestination(coords);
    }
  };

  const handleAddressChange = (address: string) => {
    if (step === 'origin') {
      setOrigenDireccion(address);
    } else if (step === 'destination') {
      setDestinoDireccion(address);
    }
  };

  const handleNextStep = () => {
    if (step === 'vehicleType') {
      if (!tipoVehiculo) {
        toast({
          title: 'Seleccione tipo de vehículo',
          description: 'Debe seleccionar un tipo de vehículo para continuar',
          variant: 'destructive',
        });
        return;
      }
      setStep('origin');
    } else if (step === 'origin') {
      if (!origin) {
        toast({
          title: 'Seleccione origen',
          description: 'Debe seleccionar la ubicación de origen',
          variant: 'destructive',
        });
        return;
      }
      setStep('destination');
      toast({
        title: 'Origen establecido',
        description: 'Ahora selecciona el destino',
      });
    } else if (step === 'destination') {
      if (!destination) {
        toast({
          title: 'Seleccione destino',
          description: 'Debe seleccionar la ubicación de destino',
          variant: 'destructive',
        });
        return;
      }
      setStep('payment');
    } else if (step === 'payment') {
      if (metodoPago === 'aseguradora') {
        if (!aseguradoraNombre || !aseguradoraPoliza) {
          toast({
            title: 'Información de aseguradora incompleta',
            description: 'Debe completar el nombre de aseguradora y número de póliza',
            variant: 'destructive',
          });
          return;
        }
      }
      setStep('confirm');
    }
  };

  const handlePrevStep = () => {
    if (step === 'origin') {
      setStep('vehicleType');
    } else if (step === 'destination') {
      setStep('origin');
    } else if (step === 'payment') {
      setStep('destination');
    } else if (step === 'confirm') {
      setStep('payment');
    }
  };

  const handleConfirmRequest = () => {
    if (!origin || !destination || !tipoVehiculo) return;
    
    const currentDistance = distanceRef.current || distance;
    if (!currentDistance) return;

    const DEFAULT_MIN_COST = 100;
    const finalCost = cost || DEFAULT_MIN_COST;

    const serviceData: any = {
      origenLat: origin.lat,
      origenLng: origin.lng,
      origenDireccion: origenDireccion || `${origin.lat}, ${origin.lng}`,
      destinoLat: destination.lat,
      destinoLng: destination.lng,
      destinoDireccion: destinoDireccion || `${destination.lat}, ${destination.lng}`,
      distanciaKm: Number(currentDistance.toFixed(2)),
      costoTotal: Number(finalCost.toFixed(2)),
      metodoPago,
      tipoVehiculo,
    };

    if (metodoPago === 'aseguradora') {
      serviceData.aseguradoraNombre = aseguradoraNombre;
      serviceData.aseguradoraPoliza = aseguradoraPoliza;
    }

    createServiceMutation.mutate(serviceData);

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
    setOrigenDireccion('');
    setDestinoDireccion('');
    setDistance(null);
    setCost(null);
    setTipoVehiculo(null);
    setMetodoPago('efectivo');
    setAseguradoraNombre('');
    setAseguradoraPoliza('');
    setStep('vehicleType');
  };

  const markers = [
    origin && { position: origin, title: 'Origen', icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' },
    destination && { position: destination, title: 'Destino', icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' },
  ].filter(Boolean) as any[];

  const showMap = step === 'origin' || step === 'destination';

  return (
    <div className="relative h-full">
      {showMap && (
        <GoogleMap
          center={currentLocation}
          markers={markers}
          onMapClick={handleMapClick}
          onAddressChange={handleAddressChange}
          className="absolute inset-0"
        />
      )}

      <div className="absolute bottom-4 left-4 right-4 max-h-[80vh] overflow-y-auto">
        <Card className="p-6">
          {step === 'vehicleType' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold mb-1">Tipo de Vehículo</h3>
                <p className="text-sm text-muted-foreground">Selecciona el tipo de vehículo a remolcar</p>
              </div>
              <VehicleTypeSelector value={tipoVehiculo} onChange={setTipoVehiculo} />
              <Button
                onClick={handleNextStep}
                className="w-full"
                data-testid="button-next"
              >
                Continuar
              </Button>
            </div>
          )}

          {step === 'origin' && (
            <div className="space-y-4">
              <div className="text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Selecciona el Origen</h3>
                <p className="text-sm text-muted-foreground">Toca en el mapa donde se encuentra tu vehículo</p>
                {origenDireccion && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                    {origenDireccion}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  className="flex-1"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atrás
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={!origin}
                  className="flex-1"
                  data-testid="button-next"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 'destination' && (
            <div className="space-y-4">
              <div className="text-center">
                <Navigation className="w-8 h-8 mx-auto mb-2 text-destructive" />
                <h3 className="font-semibold mb-1">Selecciona el Destino</h3>
                <p className="text-sm text-muted-foreground">Toca en el mapa donde quieres que lleven tu vehículo</p>
                {destinoDireccion && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                    {destinoDireccion}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  className="flex-1"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atrás
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={!destination}
                  className="flex-1"
                  data-testid="button-next"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold mb-1">Método de Pago</h3>
                <p className="text-sm text-muted-foreground">Selecciona cómo deseas pagar el servicio</p>
              </div>
              <PaymentMethodSelector value={metodoPago} onChange={setMetodoPago} insuranceStatus={insuranceStatus} />
              
              {metodoPago === 'aseguradora' && (
                <div className="mt-4">
                  <Separator className="my-4" />
                  <h4 className="text-sm font-semibold mb-3">Información de Aseguradora</h4>
                  <InsuranceForm
                    aseguradoraNombre={aseguradoraNombre}
                    aseguradoraPoliza={aseguradoraPoliza}
                    onChange={(data) => {
                      setAseguradoraNombre(data.aseguradoraNombre);
                      setAseguradoraPoliza(data.aseguradoraPoliza);
                    }}
                  />
                </div>
              )}
              
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  className="flex-1"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atrás
                </Button>
                <Button
                  onClick={handleNextStep}
                  className="flex-1"
                  data-testid="button-next"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-primary" />
                <h3 className="text-lg font-bold mb-2">Confirmar Solicitud</h3>
              </div>

              <div className="space-y-3">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Tipo de Vehículo</p>
                  <p className="font-semibold capitalize">{tipoVehiculo}</p>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Origen</p>
                  <p className="text-sm">{origenDireccion || `${origin?.lat.toFixed(4)}, ${origin?.lng.toFixed(4)}`}</p>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Destino</p>
                  <p className="text-sm">{destinoDireccion || `${destination?.lat.toFixed(4)}, ${destination?.lng.toFixed(4)}`}</p>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Método de Pago</p>
                  <p className="font-semibold capitalize">{metodoPago}</p>
                  {metodoPago === 'aseguradora' && (
                    <div className="mt-2 text-sm">
                      <p>Aseguradora: {aseguradoraNombre}</p>
                      <p>Póliza: {aseguradoraPoliza}</p>
                    </div>
                  )}
                </div>

                {distance ? (
                  <div className="grid grid-cols-2 gap-4">
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
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Calculando ruta...</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  className="flex-1"
                  disabled={createServiceMutation.isPending}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atrás
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
                  ) : (
                    'Confirmar Solicitud'
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
