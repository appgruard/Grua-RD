import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { MapboxMap } from '@/components/maps/MapboxMap';
import { AddressSearchInput } from '@/components/maps/AddressSearchInput';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { calculateRoute, type Coordinates } from '@/lib/maps';
import { MapPin, Loader2, Navigation, ArrowLeft, CheckCircle, Car, ChevronUp, ChevronDown } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { VehicleTypeSelector } from '@/components/VehicleTypeSelector';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { InsuranceForm } from '@/components/InsuranceForm';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type Step = 'address' | 'vehicleType' | 'payment' | 'confirm';

export default function ClientHome() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<Coordinates>({ lat: 18.4861, lng: -69.9312 });
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [origenDireccion, setOrigenDireccion] = useState<string>('');
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinoDireccion, setDestinoDireccion] = useState<string>('');
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [step, setStep] = useState<Step>('address');
  const [tipoVehiculo, setTipoVehiculo] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState<string>('efectivo');
  const [aseguradoraNombre, setAseguradoraNombre] = useState<string>('');
  const [aseguradoraPoliza, setAseguradoraPoliza] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [showExpandedCard, setShowExpandedCard] = useState(true);
  const distanceRef = useRef<number | null>(null);

  const { data: insuranceStatus } = useQuery<{
    hasApprovedInsurance: boolean;
    insuranceStatus: 'pendiente' | 'aprobado' | 'rechazado' | null;
  }>({
    queryKey: ['/api/client/insurance/status'],
  });

  const DEFAULT_PRECIO_BASE = 150;
  const DEFAULT_TARIFA_POR_KM = 20;

  const calculatePricingMutation = useMutation({
    mutationFn: async (distanceKm: number) => {
      const res = await apiRequest('POST', '/api/pricing/calculate', { distanceKm });
      if (!res.ok) throw new Error('Failed to calculate pricing');
      return res.json();
    },
    onSuccess: (data) => {
      if (data.total && data.total > 0) {
        setCost(data.total);
      } else {
        const currentDist = distanceRef.current || 0;
        setCost(DEFAULT_PRECIO_BASE + (currentDist * DEFAULT_TARIFA_POR_KM));
      }
    },
    onError: () => {
      const currentDist = distanceRef.current || 0;
      setCost(DEFAULT_PRECIO_BASE + (currentDist * DEFAULT_TARIFA_POR_KM));
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

    setIsCalculating(true);
    try {
      const route = await calculateRoute(origin, destination);
      distanceRef.current = route.distanceKm;
      setDistance(route.distanceKm);
      setDuration(route.durationMinutes);
      calculatePricingMutation.mutate(route.distanceKm);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo calcular la ruta',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleOriginChange = (address: string, coords: Coordinates) => {
    setOrigenDireccion(address);
    setOrigin(coords);
  };

  const handleDestinationChange = (address: string, coords: Coordinates) => {
    setDestinoDireccion(address);
    setDestination(coords);
  };

  const handleNextStep = () => {
    if (step === 'address') {
      if (!origin) {
        toast({
          title: 'Seleccione origen',
          description: 'Debe seleccionar la ubicación donde se encuentra tu vehículo',
          variant: 'destructive',
        });
        return;
      }
      if (!destination) {
        toast({
          title: 'Seleccione destino',
          description: 'Debe seleccionar el destino donde llevar tu vehículo',
          variant: 'destructive',
        });
        return;
      }
      setStep('vehicleType');
    } else if (step === 'vehicleType') {
      if (!tipoVehiculo) {
        toast({
          title: 'Seleccione tipo de vehículo',
          description: 'Debe seleccionar un tipo de vehículo para continuar',
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
    if (step === 'vehicleType') {
      setStep('address');
    } else if (step === 'payment') {
      setStep('vehicleType');
    } else if (step === 'confirm') {
      setStep('payment');
    }
  };

  const handleConfirmRequest = () => {
    if (!origin || !destination || !tipoVehiculo) return;
    
    const currentDistance = distanceRef.current || distance;
    if (!currentDistance) return;

    const DEFAULT_MIN_COST = 150;
    const finalCost = cost || DEFAULT_MIN_COST;

    const serviceData: any = {
      origenLat: origin.lat.toString(),
      origenLng: origin.lng.toString(),
      origenDireccion: origenDireccion || `${origin.lat}, ${origin.lng}`,
      destinoLat: destination.lat.toString(),
      destinoLng: destination.lng.toString(),
      destinoDireccion: destinoDireccion || `${destination.lat}, ${destination.lng}`,
      distanciaKm: currentDistance.toFixed(2),
      costoTotal: finalCost.toFixed(2),
      metodoPago,
      tipoVehiculo,
    };

    if (metodoPago === 'aseguradora') {
      serviceData.aseguradoraNombre = aseguradoraNombre;
      serviceData.aseguradoraPoliza = aseguradoraPoliza;
    }

    createServiceMutation.mutate(serviceData);
  };

  const reset = () => {
    setOrigin(null);
    setDestination(null);
    setOrigenDireccion('');
    setDestinoDireccion('');
    setDistance(null);
    setDuration(null);
    setCost(null);
    setTipoVehiculo(null);
    setMetodoPago('efectivo');
    setAseguradoraNombre('');
    setAseguradoraPoliza('');
    setStep('address');
  };

  const markers = [
    origin && { position: origin, title: 'Origen', color: '#22c55e' },
    destination && { position: destination, title: 'Destino', color: '#ef4444' },
  ].filter(Boolean) as any[];

  const mapCenter = origin || currentLocation;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="flex-1 relative min-h-0">
        <MapboxMap
          center={mapCenter}
          markers={markers}
          className="absolute inset-0"
        />
        
        {(origin || destination) && (
          <div className="absolute top-3 left-3 right-3 z-10">
            <Card className="p-3 bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="w-0.5 h-6 bg-border" />
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm truncate font-medium" data-testid="text-origin-summary">
                    {origenDireccion || 'Origen no seleccionado'}
                  </p>
                  <p className="text-sm truncate text-muted-foreground" data-testid="text-destination-summary">
                    {destinoDireccion || 'Destino no seleccionado'}
                  </p>
                </div>
                {(distance && duration) && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold">{distance.toFixed(1)} km</p>
                    <p className="text-xs text-muted-foreground">{Math.round(duration)} min</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      <div 
        className={cn(
          "bg-background border-t border-border transition-all duration-300 safe-area-inset-bottom",
          showExpandedCard ? "max-h-[85vh] md:max-h-[75vh]" : "max-h-16"
        )}
      >
        <button 
          className="w-full flex items-center justify-center py-2 text-muted-foreground"
          onClick={() => setShowExpandedCard(!showExpandedCard)}
          data-testid="button-toggle-card"
        >
          {showExpandedCard ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>

        <div className={cn(
          "transition-all duration-300 px-4 pb-4",
          showExpandedCard ? "max-h-[calc(85vh-48px)] md:max-h-[calc(75vh-48px)] overflow-y-auto" : "max-h-0 overflow-hidden"
        )}>
          {step === 'address' && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold">¿A dónde vamos?</h3>
                <p className="text-sm text-muted-foreground">Ingresa las direcciones de recogida y entrega</p>
              </div>

              <AddressSearchInput
                label="Recoger en"
                placeholder="¿Dónde está tu vehículo?"
                value={origenDireccion}
                coordinates={origin}
                onAddressChange={handleOriginChange}
                onClear={() => {
                  setOrigin(null);
                  setOrigenDireccion('');
                  setDistance(null);
                  setCost(null);
                }}
                currentLocation={currentLocation}
                icon="origin"
                autoFocus
              />

              <AddressSearchInput
                label="Llevar a"
                placeholder="¿A dónde lo llevamos?"
                value={destinoDireccion}
                coordinates={destination}
                onAddressChange={handleDestinationChange}
                onClear={() => {
                  setDestination(null);
                  setDestinoDireccion('');
                  setDistance(null);
                  setCost(null);
                }}
                currentLocation={currentLocation}
                icon="destination"
              />

              {isCalculating && (
                <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Calculando ruta...</span>
                </div>
              )}

              {distance && cost && !isCalculating && (
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Distancia estimada</p>
                      <p className="text-lg font-bold">{distance.toFixed(1)} km</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Costo estimado</p>
                      <p className="text-lg font-bold text-primary">RD$ {cost.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              )}

              <Button
                onClick={handleNextStep}
                disabled={!origin || !destination || isCalculating}
                className="w-full h-12 text-base"
                data-testid="button-next"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>
            </div>
          )}

          {step === 'vehicleType' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevStep}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h3 className="text-lg font-bold">Tipo de Vehículo</h3>
                  <p className="text-sm text-muted-foreground">Selecciona el tipo de vehículo a remolcar</p>
                </div>
              </div>

              <VehicleTypeSelector value={tipoVehiculo} onChange={setTipoVehiculo} />

              <Button
                onClick={handleNextStep}
                disabled={!tipoVehiculo}
                className="w-full h-12 text-base"
                data-testid="button-next"
              >
                Continuar
              </Button>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevStep}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h3 className="text-lg font-bold">Método de Pago</h3>
                  <p className="text-sm text-muted-foreground">Selecciona cómo deseas pagar</p>
                </div>
              </div>

              <PaymentMethodSelector 
                value={metodoPago} 
                onChange={setMetodoPago} 
                insuranceStatus={insuranceStatus} 
              />
              
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

              <Button
                onClick={handleNextStep}
                className="w-full h-12 text-base"
                data-testid="button-next"
              >
                Continuar
              </Button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevStep}
                  disabled={createServiceMutation.isPending}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h3 className="text-lg font-bold">Confirmar Solicitud</h3>
                  <p className="text-sm text-muted-foreground">Revisa los detalles de tu servicio</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Car className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Vehículo</p>
                    <p className="font-semibold capitalize">{tipoVehiculo}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <div className="w-0.5 h-8 bg-border" />
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Origen</p>
                      <p className="text-sm font-medium truncate">{origenDireccion || `${origin?.lat.toFixed(4)}, ${origin?.lng.toFixed(4)}`}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Destino</p>
                      <p className="text-sm font-medium truncate">{destinoDireccion || `${destination?.lat.toFixed(4)}, ${destination?.lng.toFixed(4)}`}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Método de Pago</p>
                    <p className="font-semibold capitalize">{metodoPago}</p>
                    {metodoPago === 'aseguradora' && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        <p>{aseguradoraNombre}</p>
                        <p>Póliza: {aseguradoraPoliza}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Distancia</p>
                    <p className="text-xl font-bold" data-testid="text-distance">
                      {distance?.toFixed(1)} km
                    </p>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Costo Total</p>
                    {calculatePricingMutation.isPending ? (
                      <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                    ) : (
                      <p className="text-xl font-bold text-primary" data-testid="text-cost">
                        RD$ {cost?.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConfirmRequest}
                disabled={!distance || createServiceMutation.isPending}
                className="w-full h-14 text-base font-semibold"
                data-testid="button-confirm"
              >
                {createServiceMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando solicitud...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Confirmar Solicitud
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
