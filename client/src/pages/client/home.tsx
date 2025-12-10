import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { MapboxMapWithFastLoad } from '@/components/maps/LazyMapboxMap';
import { AddressSearchInput } from '@/components/maps/AddressSearchInput';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { calculateRoute, type Coordinates } from '@/lib/maps';
import { MapPin, Loader2, ArrowLeft, CheckCircle, Car, ChevronUp, ChevronDown, Wrench, Truck, AlertTriangle, Info, Clock, Navigation } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { VehicleTypeSelector } from '@/components/VehicleTypeSelector';
import { ServiceCategorySelector, serviceCategories } from '@/components/ServiceCategorySelector';
import { ServiceSubtypeSelector, hasSubtypes, subtypesByCategory } from '@/components/ServiceSubtypeSelector';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { InsuranceForm } from '@/components/InsuranceForm';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Servicio } from '@shared/schema';
import { useServiceRequest } from '@/lib/serviceRequestContext';

const DEFAULT_COORDINATES: Coordinates = { lat: 18.4861, lng: -69.9312 };

const ONSITE_SUBTYPES = [
  'cambio_goma',
  'inflado_neumatico',
  'paso_corriente',
  'cerrajero_automotriz',
  'suministro_combustible',
  'envio_bateria',
  'diagnostico_obd',
];

const ONSITE_SERVICE_PRICES: Record<string, number> = {
  'cambio_goma': 500,
  'inflado_neumatico': 300,
  'paso_corriente': 400,
  'cerrajero_automotriz': 800,
  'suministro_combustible': 350,
  'envio_bateria': 1500,
  'diagnostico_obd': 600,
};

export default function ClientHome() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const {
    step,
    setStep,
    servicioCategoria,
    setServicioCategoria,
    servicioSubtipo,
    setServicioSubtipo,
    tipoVehiculo,
    setTipoVehiculo,
    metodoPago,
    setMetodoPago,
    selectedCardId,
    setSelectedCardId,
    aseguradoraNombre,
    setAseguradoraNombre,
    aseguradoraPoliza,
    setAseguradoraPoliza,
    descripcionSituacion,
    setDescripcionSituacion,
    quiereTransporteExtraccion,
    setQuiereTransporteExtraccion,
    origin,
    setOrigin,
    destination,
    setDestination,
    origenDireccion,
    setOrigenDireccion,
    destinoDireccion,
    setDestinoDireccion,
    distance,
    setDistance,
    duration,
    setDuration,
    cost,
    setCost,
    routeGeometry,
    setRouteGeometry,
    resetServiceRequest,
  } = useServiceRequest();

  // Use persisted origin from context as initial location, or default coordinates
  const [currentLocation, setCurrentLocation] = useState<Coordinates>(() => origin || DEFAULT_COORDINATES);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showExpandedCard, setShowExpandedCard] = useState(true);
  const distanceRef = useRef<number | null>(null);
  const hasInitialLocationRef = useRef(origin !== null);

  const { data: insuranceStatus } = useQuery<{
    hasApprovedInsurance: boolean;
    insuranceStatus: 'pendiente' | 'aprobado' | 'rechazado' | null;
  }>({
    queryKey: ['/api/client/insurance/status'],
  });

  const { data: myServices } = useQuery<Servicio[]>({
    queryKey: ['/api/services/my-services'],
    staleTime: 1000 * 10,
    refetchInterval: 10000,
  });

  const activeService = myServices?.find(
    (service) => 
      service.estado === 'pendiente' || 
      service.estado === 'aceptado' || 
      service.estado === 'conductor_en_sitio' ||
      service.estado === 'cargando' ||
      service.estado === 'en_progreso'
  );

  const getActiveServiceStatusLabel = (estado: string): string => {
    switch (estado) {
      case 'pendiente': return 'Buscando operador...';
      case 'aceptado': return 'Operador en camino';
      case 'conductor_en_sitio': return 'Operador en el punto';
      case 'cargando': return 'Cargando vehiculo';
      case 'en_progreso': return 'En ruta al destino';
      default: return 'En progreso';
    }
  };

  const DEFAULT_PRECIO_BASE = 150;
  const DEFAULT_TARIFA_POR_KM = 20;

  const isOnsiteService = (): boolean => {
    if (servicioCategoria !== 'auxilio_vial') return false;
    if (!servicioSubtipo) return false;
    return ONSITE_SUBTYPES.includes(servicioSubtipo);
  };

  const requiresTransport = (): boolean => {
    return !isOnsiteService();
  };

  const isExtractionService = (): boolean => {
    return servicioCategoria === 'extraccion';
  };

  const requiresNegotiation = (): boolean => {
    return servicioCategoria === 'extraccion';
  };

  const calculatePricingMutation = useMutation({
    mutationFn: async (params: { distanceKm: number; servicioCategoria: string; servicioSubtipo?: string }) => {
      const res = await apiRequest('POST', '/api/pricing/calculate', params);
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
        description: 'Esperando que un operador acepte',
      });
      resetServiceRequest();
      distanceRef.current = null;
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

  // Start ready if we have persisted location
  const [locationReady, setLocationReady] = useState(() => origin !== null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(() => origin === null);

  // Function to fetch current geolocation
  const fetchGeolocation = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setIsLoadingLocation(false);
      setLocationReady(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(coords);
        setLocationReady(true);
        setIsLoadingLocation(false);
        
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}&language=es`
          );
          if (response.ok) {
            const data = await response.json();
            const address = data.features?.[0]?.place_name || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
            setOrigin(coords);
            setOrigenDireccion(address);
          }
        } catch (error) {
          setOrigin(coords);
          setOrigenDireccion(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLoadingLocation(false);
        setLocationReady(true);
      },
      { 
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000
      }
    );
  }, [setOrigin, setOrigenDireccion]);

  // Initial geolocation fetch (skip if we have persisted location, but still update in background)
  useEffect(() => {
    // Always fetch fresh geolocation, but if we have persisted location, don't block the UI
    if (hasInitialLocationRef.current) {
      // We already have a location, so just update in background
      fetchGeolocation();
    } else {
      // No persisted location, need to fetch and wait
      fetchGeolocation();
    }
  }, [fetchGeolocation]);

  // Re-fetch location when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchGeolocation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchGeolocation]);

  useEffect(() => {
    if (origin && destination && servicioCategoria && requiresTransport()) {
      calculateRouteAndCost();
    }
  }, [origin, destination, servicioCategoria, servicioSubtipo]);

  useEffect(() => {
    if (origin && isOnsiteService() && servicioSubtipo && servicioCategoria) {
      const onsitePrice = ONSITE_SERVICE_PRICES[servicioSubtipo] || 500;
      setCost(onsitePrice);
      setDistance(0);
      setDuration(0);
    }
  }, [origin, servicioSubtipo, servicioCategoria]);

  const calculateRouteAndCost = async () => {
    if (!origin || !destination || !servicioCategoria) return;

    setIsCalculating(true);
    try {
      const route = await calculateRoute(origin, destination);
      distanceRef.current = route.distanceKm;
      setDistance(route.distanceKm);
      setDuration(route.durationMinutes);
      if (route.geometry) {
        setRouteGeometry(route.geometry);
      }
      calculatePricingMutation.mutate({
        distanceKm: route.distanceKm,
        servicioCategoria: servicioCategoria,
        servicioSubtipo: servicioSubtipo || undefined,
      });
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

  const requiresVehicleType = (category: string | null): boolean => {
    return category === 'remolque_estandar' || category === 'remolque_especializado';
  };

  const requiresSubtype = (category: string | null): boolean => {
    return category !== null && category !== 'remolque_estandar' && hasSubtypes(category);
  };

  const handleNextStep = () => {
    if (step === 'serviceCategory') {
      if (!servicioCategoria) {
        toast({
          title: 'Seleccione categoria',
          description: 'Debe seleccionar un tipo de servicio',
          variant: 'destructive',
        });
        return;
      }
      if (requiresSubtype(servicioCategoria)) {
        setStep('serviceSubtype');
      } else {
        setStep('location');
      }
    } else if (step === 'serviceSubtype') {
      if (!servicioSubtipo) {
        toast({
          title: 'Seleccione tipo de servicio',
          description: 'Debe seleccionar el tipo especifico de servicio que necesita',
          variant: 'destructive',
        });
        return;
      }
      if (isExtractionService()) {
        setStep('extractionDescription');
      } else {
        setStep('location');
      }
    } else if (step === 'extractionDescription') {
      if (!descripcionSituacion.trim() || descripcionSituacion.trim().length < 10) {
        toast({
          title: 'Descripcion requerida',
          description: 'Por favor describe la situacion del vehiculo (minimo 10 caracteres)',
          variant: 'destructive',
        });
        return;
      }
      setStep('location');
    } else if (step === 'location') {
      if (!origin) {
        toast({
          title: 'Seleccione ubicación',
          description: 'Debe seleccionar la ubicación donde se encuentra',
          variant: 'destructive',
        });
        return;
      }
      if (requiresTransport() && !destination) {
        toast({
          title: 'Seleccione destino',
          description: 'Debe seleccionar el destino para el remolque',
          variant: 'destructive',
        });
        return;
      }
      if (requiresVehicleType(servicioCategoria)) {
        setStep('vehicleType');
      } else {
        setStep('payment');
      }
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
      if (metodoPago === 'tarjeta' && !selectedCardId) {
        toast({
          title: 'Seleccione una tarjeta',
          description: 'Debe seleccionar una tarjeta guardada o agregar una nueva en su perfil',
          variant: 'destructive',
        });
        return;
      }
      setStep('confirm');
    }
  };

  const handlePrevStep = () => {
    if (step === 'serviceSubtype') {
      setStep('serviceCategory');
    } else if (step === 'extractionDescription') {
      setStep('serviceSubtype');
    } else if (step === 'location') {
      if (isExtractionService()) {
        setStep('extractionDescription');
      } else if (requiresSubtype(servicioCategoria)) {
        setStep('serviceSubtype');
      } else {
        setStep('serviceCategory');
      }
    } else if (step === 'vehicleType') {
      setStep('location');
    } else if (step === 'payment') {
      if (requiresVehicleType(servicioCategoria)) {
        setStep('vehicleType');
      } else {
        setStep('location');
      }
    } else if (step === 'confirm') {
      if (isExtractionService()) {
        setStep('location');
      } else {
        setStep('payment');
      }
    }
  };

  const handleCategoryChange = (category: string) => {
    setServicioCategoria(category);
    setServicioSubtipo(null);
    setOrigin(null);
    setDestination(null);
    setOrigenDireccion('');
    setDestinoDireccion('');
    setDistance(null);
    setDuration(null);
    setCost(null);
    setRouteGeometry(null);
    distanceRef.current = null;
    if (!requiresVehicleType(category)) {
      setTipoVehiculo(null);
    }
  };

  const handleSubtypeChange = (subtype: string | null) => {
    setServicioSubtipo(subtype);
    setOrigin(null);
    setDestination(null);
    setOrigenDireccion('');
    setDestinoDireccion('');
    setDistance(null);
    setDuration(null);
    setCost(null);
    setRouteGeometry(null);
    distanceRef.current = null;
  };

  const handleConfirmRequest = () => {
    if (!origin || !servicioCategoria) {
      toast({
        title: 'Datos incompletos',
        description: 'Falta informacion requerida para crear la solicitud',
        variant: 'destructive',
      });
      return;
    }
    
    const isOnsite = isOnsiteService();
    const isExtraction = isExtractionService();
    const extractionWithTransport = isExtraction && quiereTransporteExtraccion;
    
    if (!isOnsite && !isExtraction && !destination) {
      toast({
        title: 'Destino requerido',
        description: 'Para servicios de remolque debe seleccionar un destino',
        variant: 'destructive',
      });
      return;
    }

    if (extractionWithTransport && !destination) {
      toast({
        title: 'Destino requerido',
        description: 'Para transportar el vehiculo debe seleccionar un destino',
        variant: 'destructive',
      });
      return;
    }
    
    if (!isOnsite && !isExtraction && (cost === null || distance === null || distance <= 0)) {
      toast({
        title: 'Error de calculo',
        description: 'No se ha calculado la ruta y costo del servicio. Por favor seleccione las ubicaciones nuevamente.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!isOnsite && !isExtraction && (distanceRef.current === null || distanceRef.current <= 0)) {
      toast({
        title: 'Ruta no calculada',
        description: 'Debe calcular la ruta antes de confirmar. Por favor verifique las ubicaciones.',
        variant: 'destructive',
      });
      return;
    }

    if (isExtraction && (!descripcionSituacion || descripcionSituacion.trim().length < 10)) {
      toast({
        title: 'Descripcion requerida',
        description: 'Por favor describe la situacion del vehiculo',
        variant: 'destructive',
      });
      return;
    }
    
    const extractionWithoutTransport = isExtraction && !quiereTransporteExtraccion;
    const finalDestination = (isOnsite || extractionWithoutTransport) ? origin : destination!;
    const finalDestinoDireccion = (isOnsite || extractionWithoutTransport) ? origenDireccion : destinoDireccion;

    const currentDistance = (isOnsite || extractionWithoutTransport) ? 0 : (distanceRef.current || distance || 0);
    const DEFAULT_MIN_COST = 150;
    const finalCost = isExtraction ? 0 : (cost || (isOnsite ? (ONSITE_SERVICE_PRICES[servicioSubtipo || ''] || DEFAULT_MIN_COST) : DEFAULT_MIN_COST));

    const serviceData: any = {
      origenLat: origin.lat.toString(),
      origenLng: origin.lng.toString(),
      origenDireccion: origenDireccion || `${origin.lat}, ${origin.lng}`,
      destinoLat: finalDestination.lat.toString(),
      destinoLng: finalDestination.lng.toString(),
      destinoDireccion: finalDestinoDireccion || `${finalDestination.lat}, ${finalDestination.lng}`,
      distanciaKm: currentDistance.toFixed(2),
      costoTotal: finalCost.toFixed(2),
      metodoPago: isExtraction ? 'efectivo' : metodoPago,
      servicioCategoria,
    };

    if (servicioSubtipo) {
      serviceData.servicioSubtipo = servicioSubtipo;
    }

    if (tipoVehiculo) {
      serviceData.tipoVehiculo = tipoVehiculo;
    }

    if (metodoPago === 'aseguradora' && !isExtraction) {
      serviceData.aseguradoraNombre = aseguradoraNombre;
      serviceData.aseguradoraPoliza = aseguradoraPoliza;
    }

    if (metodoPago === 'tarjeta' && selectedCardId && !isExtraction) {
      serviceData.paymentMethodId = selectedCardId;
    }

    if (isExtraction) {
      serviceData.requiereNegociacion = true;
      serviceData.estadoNegociacion = 'pendiente_evaluacion';
      serviceData.descripcionSituacion = descripcionSituacion.trim();
    }

    createServiceMutation.mutate(serviceData);
  };

  const reset = () => {
    resetServiceRequest();
    distanceRef.current = null;
  };

  const getCategoryLabel = (categoryId: string | null): string => {
    const category = serviceCategories.find(c => c.id === categoryId);
    return category?.label || '';
  };

  const getSubtypeLabel = (categoryId: string | null, subtypeId: string | null): string => {
    if (!categoryId || !subtypeId) return '';
    const subtypes = subtypesByCategory[categoryId];
    const subtype = subtypes?.find(s => s.id === subtypeId);
    return subtype?.label || '';
  };

  const markers = [
    origin && { 
      position: origin, 
      title: isOnsiteService() ? 'Ubicación del servicio' : (isExtractionService() ? 'Ubicación del vehículo' : 'Origen'), 
      color: '#22c55e', 
      type: 'origin' as const,
      draggable: true,
      id: 'origin'
    },
    destination && (requiresTransport() || (isExtractionService() && quiereTransporteExtraccion)) && { 
      position: destination, 
      title: isExtractionService() ? 'Destino de transporte' : 'Destino', 
      color: '#ef4444', 
      type: 'destination' as const,
      draggable: true,
      id: 'destination'
    },
  ].filter(Boolean) as any[];

  const handleMarkerDragEnd = async (markerId: string, newCoords: Coordinates, address: string) => {
    if (markerId === 'origin') {
      setOrigin(newCoords);
      setOrigenDireccion(address);
      toast({
        title: 'Ubicación actualizada',
        description: 'Se ha actualizado la ubicación de origen',
      });
    } else if (markerId === 'destination') {
      setDestination(newCoords);
      setDestinoDireccion(address);
      toast({
        title: 'Destino actualizado',
        description: 'Se ha actualizado la ubicación de destino',
      });
    }
  };

  const mapCenter = origin || currentLocation;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {activeService && (
        <div className="absolute top-0 left-0 right-0 z-30 p-3 safe-area-inset-top">
          <Card 
            className="p-3 bg-primary/95 backdrop-blur-sm cursor-pointer hover-elevate"
            onClick={() => setLocation(`/client/tracking/${activeService.id}`)}
            data-testid="card-active-service"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                  {activeService.estado === 'pendiente' ? (
                    <Clock className="w-5 h-5 text-white animate-pulse" />
                  ) : (
                    <Navigation className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    Servicio activo
                  </p>
                  <p className="text-xs text-white/80 truncate">
                    {getActiveServiceStatusLabel(activeService.estado)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-white/20 border-white/30 text-white">
                  Ver
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="flex-1 relative min-h-0 z-0">
        <MapboxMapWithFastLoad
          center={mapCenter}
          markers={markers}
          onMarkerDragEnd={handleMarkerDragEnd}
          className="absolute inset-0 z-0"
          routeGeometry={routeGeometry}
          focusOnOrigin={!!origin && !destination}
        />
        
        {(origin || destination) && !activeService && (
          <div className="absolute top-3 left-3 right-3 z-10">
            <Card className="p-3 bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {(requiresTransport() && !isExtractionService()) || (isExtractionService() && quiereTransporteExtraccion) ? (
                  <>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <div className="w-0.5 h-6 bg-border" />
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm truncate font-medium" data-testid="text-origin-summary">
                        {origenDireccion || (isExtractionService() ? 'Ubicacion del vehiculo' : 'Origen no seleccionado')}
                      </p>
                      <p className="text-sm truncate text-muted-foreground" data-testid="text-destination-summary">
                        {destinoDireccion || (isExtractionService() ? 'Destino de transporte' : 'Destino no seleccionado')}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium" data-testid="text-location-summary">
                        {origenDireccion || (isExtractionService() ? 'Ubicacion del vehiculo' : 'Ubicación no seleccionada')}
                      </p>
                    </div>
                  </>
                )}
                {(distance !== null && duration !== null) && ((requiresTransport() && !isExtractionService()) || (isExtractionService() && quiereTransporteExtraccion)) && (
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
          "bg-background border-t border-border transition-all duration-300 flex flex-col overflow-hidden relative z-20 flex-shrink-0",
          showExpandedCard ? "min-h-[45vh] max-h-[60vh]" : "h-14"
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button 
          className="w-full flex items-center justify-center py-2 text-muted-foreground flex-shrink-0"
          onClick={() => setShowExpandedCard(!showExpandedCard)}
          data-testid="button-toggle-card"
        >
          {showExpandedCard ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>

        {showExpandedCard && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {step === 'serviceCategory' && (
            <div className="flex flex-col h-full">
              <div className="text-center px-4 pb-2 flex-shrink-0">
                <h3 className="text-lg font-bold">¿Qué servicio necesitas?</h3>
                <p className="text-sm text-muted-foreground">Selecciona el tipo de asistencia</p>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-4 overflow-x-hidden">
                <div className="pb-2 w-full overflow-hidden">
                  <ServiceCategorySelector 
                    value={servicioCategoria} 
                    onChange={handleCategoryChange} 
                  />
                </div>
              </ScrollArea>

              <div className="px-4 pt-3 pb-2 flex-shrink-0 bg-background">
                <Button
                  onClick={handleNextStep}
                  disabled={!servicioCategoria}
                  className="w-full h-12 text-base"
                  data-testid="button-next"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 'serviceSubtype' && servicioCategoria && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 pb-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevStep}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h3 className="text-lg font-bold">Detalle del Servicio</h3>
                  <p className="text-sm text-muted-foreground">Selecciona el tipo específico</p>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-4 overflow-x-hidden">
                <div className="pb-2 w-full overflow-hidden">
                  <ServiceSubtypeSelector 
                    category={servicioCategoria}
                    value={servicioSubtipo} 
                    onChange={handleSubtypeChange} 
                  />
                </div>
              </ScrollArea>

              <div className="px-4 pt-3 pb-2 flex-shrink-0 bg-background">
                <Button
                  onClick={handleNextStep}
                  disabled={!servicioSubtipo}
                  className="w-full h-12 text-base"
                  data-testid="button-next"
                >
                  {servicioSubtipo ? 'Continuar' : 'Selecciona una opción'}
                </Button>
              </div>
            </div>
          )}

          {step === 'extractionDescription' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 pb-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevStep}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h3 className="text-lg font-bold">Describe la situacion</h3>
                  <p className="text-sm text-muted-foreground">El precio se definira tras evaluar</p>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-4">
                <div className="space-y-4 pb-2">
                  <Alert className="bg-amber-500/10 border-amber-500/30">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
                      Este servicio requiere evaluacion. Un operador revisara tu caso y propondra un precio antes de aceptar.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion-situacion" className="text-sm font-medium">
                      Describe la situacion del vehiculo
                    </Label>
                    <Textarea
                      id="descripcion-situacion"
                      placeholder="Ejemplo: Mi carro cayo en una zanja en la carretera, esta inclinado hacia el lado derecho. Es un SUV mediano..."
                      value={descripcionSituacion}
                      onChange={(e) => setDescripcionSituacion(e.target.value)}
                      className="min-h-[120px] resize-none"
                      data-testid="input-extraction-description"
                    />
                    <p className="text-xs text-muted-foreground">
                      Incluye detalles como: tipo de vehiculo, como quedo atrapado, acceso al lugar, etc.
                    </p>
                  </div>

                  <Alert className="bg-blue-500/10 border-blue-500/30">
                    <Info className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-600 dark:text-blue-400 text-sm">
                      Podras enviar fotos y videos despues de crear la solicitud para que el operador evalue mejor.
                    </AlertDescription>
                  </Alert>
                </div>
              </ScrollArea>

              <div className="px-4 pt-3 pb-2 flex-shrink-0 bg-background">
                <Button
                  onClick={handleNextStep}
                  disabled={!descripcionSituacion.trim() || descripcionSituacion.trim().length < 10}
                  className="w-full h-12 text-base"
                  data-testid="button-next"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 'location' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 pb-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevStep}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h3 className="text-lg font-bold">
                    {(requiresTransport() && !isExtractionService()) ? '¿A donde vamos?' : '¿Donde te encuentras?'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {(requiresTransport() && !isExtractionService())
                      ? 'Ingresa las direcciones de recogida y entrega' 
                      : 'Ingresa la ubicacion donde necesitas el servicio'}
                  </p>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-4">
                <div className="space-y-4 pb-2">
                  {isExtractionService() && !quiereTransporteExtraccion && (
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
                        Indica donde esta el vehiculo. El precio se negociara con el operador.
                      </AlertDescription>
                    </Alert>
                  )}

                  <AddressSearchInput
                    label={(requiresTransport() && !isExtractionService()) ? "Recoger en" : "Ubicacion del vehiculo"}
                    placeholder={(requiresTransport() && !isExtractionService()) ? "¿Donde esta tu vehiculo?" : "¿Donde esta tu vehiculo?"}
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

                  {isExtractionService() && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1 min-w-0 pr-3">
                        <Label htmlFor="transporte-switch" className="text-sm font-medium cursor-pointer">
                          Transportar a otro lugar
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Despues de la extraccion, llevar el vehiculo a otro destino
                        </p>
                      </div>
                      <Switch
                        id="transporte-switch"
                        checked={quiereTransporteExtraccion}
                        onCheckedChange={(checked) => {
                          setQuiereTransporteExtraccion(checked);
                          if (!checked) {
                            setDestination(null);
                            setDestinoDireccion('');
                            setDistance(null);
                            setCost(null);
                          }
                        }}
                        data-testid="switch-transporte-extraccion"
                      />
                    </div>
                  )}

                  {(requiresTransport() && !isExtractionService()) || (isExtractionService() && quiereTransporteExtraccion) ? (
                    <AddressSearchInput
                      label="Llevar a"
                      placeholder="¿A donde lo llevamos?"
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
                  ) : null}

                  {isCalculating && (!isExtractionService() || quiereTransporteExtraccion) && (
                    <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Calculando ruta...</span>
                    </div>
                  )}

                  {cost !== null && !isCalculating && (!isExtractionService() || quiereTransporteExtraccion) && (
                    <Card className="p-4 bg-muted/50">
                      <div className="flex items-center justify-between gap-2">
                        {(requiresTransport() || quiereTransporteExtraccion) && distance !== null ? (
                          <div>
                            <p className="text-sm text-muted-foreground">Distancia estimada</p>
                            <p className="text-lg font-bold">{distance.toFixed(1)} km</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-muted-foreground">Servicio</p>
                            <p className="text-lg font-bold">{getSubtypeLabel(servicioCategoria, servicioSubtipo) || getCategoryLabel(servicioCategoria)}</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{isExtractionService() ? 'Transporte estimado' : 'Costo estimado'}</p>
                          <p className="text-lg font-bold text-primary">RD$ {cost.toFixed(2)}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {isExtractionService() && quiereTransporteExtraccion && (
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                      <Info className="h-4 w-4 text-blue-500" />
                      <AlertDescription className="text-blue-600 dark:text-blue-400 text-sm">
                        El costo de transporte es adicional al precio de extraccion que negociaras con el operador.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </ScrollArea>

              <div className="px-4 pt-3 pb-2 flex-shrink-0 bg-background">
                <Button
                  onClick={() => {
                    if (isExtractionService() && !quiereTransporteExtraccion) {
                      setStep('confirm');
                    } else if (isExtractionService() && quiereTransporteExtraccion) {
                      setStep('confirm');
                    } else {
                      handleNextStep();
                    }
                  }}
                  disabled={
                    !origin || 
                    (requiresTransport() && !isExtractionService() && !destination) || 
                    (isExtractionService() && quiereTransporteExtraccion && !destination) ||
                    (isCalculating && (!isExtractionService() || quiereTransporteExtraccion))
                  }
                  className="w-full h-12 text-base"
                  data-testid="button-next"
                >
                  {isCalculating && (!isExtractionService() || quiereTransporteExtraccion) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Calculando...
                    </>
                  ) : isExtractionService() ? (
                    'Solicitar Evaluacion'
                  ) : (
                    'Continuar'
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'vehicleType' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 pb-2 flex-shrink-0">
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

              <ScrollArea className="flex-1 min-h-0 px-4">
                <VehicleTypeSelector value={tipoVehiculo} onChange={setTipoVehiculo} />
              </ScrollArea>

              <div className="px-4 pt-3 pb-2 flex-shrink-0 bg-background">
                <Button
                  onClick={handleNextStep}
                  disabled={!tipoVehiculo}
                  className="w-full h-12 text-base"
                  data-testid="button-next"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 pb-2 flex-shrink-0">
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

              <ScrollArea className="flex-1 min-h-0 px-4">
                <div className="space-y-4 pb-2">
                  <PaymentMethodSelector 
                    value={metodoPago} 
                    onChange={setMetodoPago} 
                    selectedCardId={selectedCardId}
                    onCardSelect={setSelectedCardId}
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
                </div>
              </ScrollArea>

              <div className="px-4 pt-3 pb-2 flex-shrink-0 bg-background">
                <Button
                  onClick={handleNextStep}
                  className="w-full h-12 text-base"
                  data-testid="button-next"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-3 sm:px-4 pb-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevStep}
                  disabled={createServiceMutation.isPending}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold truncate">
                    {isExtractionService() ? 'Confirmar Evaluacion' : 'Confirmar Solicitud'}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {isExtractionService() ? 'Revisa los detalles antes de enviar' : 'Revisa los detalles de tu servicio'}
                  </p>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-3 sm:px-4">
                <div className="space-y-2 sm:space-y-3 pb-2">
                  {isExtractionService() && (
                    <Alert className="bg-amber-500/10 border-amber-500/30 py-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                        El operador evaluara la situacion y te propondra un precio. Podras aceptar o rechazar su oferta.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-muted rounded-lg">
                    {servicioCategoria === 'auxilio_vial' ? (
                      <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                    ) : servicioCategoria === 'extraccion' ? (
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : servicioCategoria === 'vehiculos_pesados' || servicioCategoria === 'maquinarias' ? (
                      <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                    ) : (
                      <Car className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Servicio</p>
                      <p className="text-sm sm:text-base font-semibold truncate">{getCategoryLabel(servicioCategoria)}</p>
                      {servicioSubtipo && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {getSubtypeLabel(servicioCategoria, servicioSubtipo)}
                        </p>
                      )}
                      {tipoVehiculo && (
                        <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                          Vehiculo: {tipoVehiculo}
                        </p>
                      )}
                    </div>
                  </div>

                  {isExtractionService() && descripcionSituacion && (
                    <div className="p-2 sm:p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Descripcion de la situacion</p>
                      <p className="text-xs sm:text-sm line-clamp-3">{descripcionSituacion}</p>
                    </div>
                  )}

                  <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-muted rounded-lg">
                    {(requiresTransport() && !isExtractionService()) || (isExtractionService() && quiereTransporteExtraccion) ? (
                      <>
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500" />
                          <div className="w-0.5 h-6 sm:h-8 bg-border" />
                          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">{isExtractionService() ? 'Ubicacion del vehiculo' : 'Origen'}</p>
                            <p className="text-xs sm:text-sm font-medium line-clamp-2 break-words">{origenDireccion || `${origin?.lat.toFixed(4)}, ${origin?.lng.toFixed(4)}`}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{isExtractionService() ? 'Transportar a' : 'Destino'}</p>
                            <p className="text-xs sm:text-sm font-medium line-clamp-2 break-words">{destinoDireccion || `${destination?.lat.toFixed(4)}, ${destination?.lng.toFixed(4)}`}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Ubicacion del vehiculo</p>
                          <p className="text-xs sm:text-sm font-medium line-clamp-2 break-words">{origenDireccion || `${origin?.lat.toFixed(4)}, ${origin?.lng.toFixed(4)}`}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {!isExtractionService() && (
                    <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-muted rounded-lg">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Metodo de Pago</p>
                        <p className="text-sm sm:text-base font-semibold capitalize">{metodoPago}</p>
                        {metodoPago === 'aseguradora' && (
                          <div className="mt-1 text-xs sm:text-sm text-muted-foreground">
                            <p className="truncate">{aseguradoraNombre}</p>
                            <p className="truncate">Poliza: {aseguradoraPoliza}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isExtractionService() ? (
                    <div className="space-y-2">
                      <div className="text-center p-3 sm:p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Precio de Extraccion</p>
                        <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
                          Por definir
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          El operador propondra un monto tras evaluar
                        </p>
                      </div>
                      {quiereTransporteExtraccion && distance !== null && cost !== null && (
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Distancia transporte</p>
                            <p className="text-lg sm:text-xl font-bold" data-testid="text-distance">
                              {distance.toFixed(1)} km
                            </p>
                          </div>
                          <div className="text-center p-2 sm:p-3 bg-primary/10 rounded-lg border border-primary/20">
                            <p className="text-xs text-muted-foreground mb-1">Costo transporte</p>
                            <p className="text-lg sm:text-xl font-bold text-primary" data-testid="text-cost">
                              RD$ {cost.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={requiresTransport() ? "grid grid-cols-2 gap-2 sm:gap-3" : ""}>
                      {requiresTransport() && (
                        <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Distancia</p>
                          <p className="text-lg sm:text-xl font-bold" data-testid="text-distance">
                            {distance?.toFixed(1)} km
                          </p>
                        </div>
                      )}
                      <div className="text-center p-2 sm:p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-xs text-muted-foreground mb-1">Costo Total</p>
                        {calculatePricingMutation.isPending ? (
                          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 mx-auto animate-spin text-primary" />
                        ) : (
                          <p className="text-lg sm:text-xl font-bold text-primary" data-testid="text-cost">
                            RD$ {cost?.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="px-3 sm:px-4 pt-2 sm:pt-3 pb-2 flex-shrink-0 bg-background">
                <Button
                  onClick={handleConfirmRequest}
                  disabled={!origin || createServiceMutation.isPending}
                  className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold"
                  data-testid="button-confirm"
                >
                  {createServiceMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                      Enviando solicitud...
                    </>
                  ) : isExtractionService() ? (
                    <>
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Solicitar Evaluacion
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Confirmar Solicitud
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
