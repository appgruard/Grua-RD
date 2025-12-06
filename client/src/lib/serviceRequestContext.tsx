import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { Coordinates, RouteGeometry } from '@/lib/maps';
import { useAuth } from '@/lib/auth';

type Step = 'serviceCategory' | 'serviceSubtype' | 'extractionDescription' | 'location' | 'vehicleType' | 'payment' | 'confirm';

interface ServiceRequestState {
  step: Step;
  servicioCategoria: string | null;
  servicioSubtipo: string | null;
  tipoVehiculo: string | null;
  metodoPago: string;
  selectedCardId: string | null;
  aseguradoraNombre: string;
  aseguradoraPoliza: string;
  descripcionSituacion: string;
  quiereTransporteExtraccion: boolean;
  origin: Coordinates | null;
  destination: Coordinates | null;
  origenDireccion: string;
  destinoDireccion: string;
  distance: number | null;
  duration: number | null;
  cost: number | null;
  routeGeometry: RouteGeometry | null;
}

interface ServiceRequestContextType extends ServiceRequestState {
  setStep: (step: Step) => void;
  setServicioCategoria: (categoria: string | null) => void;
  setServicioSubtipo: (subtipo: string | null) => void;
  setTipoVehiculo: (tipo: string | null) => void;
  setMetodoPago: (metodo: string) => void;
  setSelectedCardId: (id: string | null) => void;
  setAseguradoraNombre: (nombre: string) => void;
  setAseguradoraPoliza: (poliza: string) => void;
  setDescripcionSituacion: (descripcion: string) => void;
  setQuiereTransporteExtraccion: (quiere: boolean) => void;
  setOrigin: (origin: Coordinates | null) => void;
  setDestination: (destination: Coordinates | null) => void;
  setOrigenDireccion: (direccion: string) => void;
  setDestinoDireccion: (direccion: string) => void;
  setDistance: (distance: number | null) => void;
  setDuration: (duration: number | null) => void;
  setCost: (cost: number | null) => void;
  setRouteGeometry: (geometry: RouteGeometry | null) => void;
  resetServiceRequest: () => void;
  hasActiveRequest: boolean;
}

const initialState: ServiceRequestState = {
  step: 'serviceCategory',
  servicioCategoria: null,
  servicioSubtipo: null,
  tipoVehiculo: null,
  metodoPago: 'efectivo',
  selectedCardId: null,
  aseguradoraNombre: '',
  aseguradoraPoliza: '',
  descripcionSituacion: '',
  quiereTransporteExtraccion: false,
  origin: null,
  destination: null,
  origenDireccion: '',
  destinoDireccion: '',
  distance: null,
  duration: null,
  cost: null,
  routeGeometry: null,
};

const ServiceRequestContext = createContext<ServiceRequestContextType | null>(null);

export function ServiceRequestProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<ServiceRequestState>(initialState);

  useEffect(() => {
    if (!user || user.userType !== 'cliente') {
      setState(initialState);
    }
  }, [user?.id, user?.userType]);

  const setStep = useCallback((step: Step) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const setServicioCategoria = useCallback((servicioCategoria: string | null) => {
    setState(prev => ({ ...prev, servicioCategoria }));
  }, []);

  const setServicioSubtipo = useCallback((servicioSubtipo: string | null) => {
    setState(prev => ({ ...prev, servicioSubtipo }));
  }, []);

  const setTipoVehiculo = useCallback((tipoVehiculo: string | null) => {
    setState(prev => ({ ...prev, tipoVehiculo }));
  }, []);

  const setMetodoPago = useCallback((metodoPago: string) => {
    setState(prev => ({ ...prev, metodoPago }));
  }, []);

  const setSelectedCardId = useCallback((selectedCardId: string | null) => {
    setState(prev => ({ ...prev, selectedCardId }));
  }, []);

  const setAseguradoraNombre = useCallback((aseguradoraNombre: string) => {
    setState(prev => ({ ...prev, aseguradoraNombre }));
  }, []);

  const setAseguradoraPoliza = useCallback((aseguradoraPoliza: string) => {
    setState(prev => ({ ...prev, aseguradoraPoliza }));
  }, []);

  const setDescripcionSituacion = useCallback((descripcionSituacion: string) => {
    setState(prev => ({ ...prev, descripcionSituacion }));
  }, []);

  const setQuiereTransporteExtraccion = useCallback((quiereTransporteExtraccion: boolean) => {
    setState(prev => ({ ...prev, quiereTransporteExtraccion }));
  }, []);

  const setOrigin = useCallback((origin: Coordinates | null) => {
    setState(prev => ({ ...prev, origin }));
  }, []);

  const setDestination = useCallback((destination: Coordinates | null) => {
    setState(prev => ({ ...prev, destination }));
  }, []);

  const setOrigenDireccion = useCallback((origenDireccion: string) => {
    setState(prev => ({ ...prev, origenDireccion }));
  }, []);

  const setDestinoDireccion = useCallback((destinoDireccion: string) => {
    setState(prev => ({ ...prev, destinoDireccion }));
  }, []);

  const setDistance = useCallback((distance: number | null) => {
    setState(prev => ({ ...prev, distance }));
  }, []);

  const setDuration = useCallback((duration: number | null) => {
    setState(prev => ({ ...prev, duration }));
  }, []);

  const setCost = useCallback((cost: number | null) => {
    setState(prev => ({ ...prev, cost }));
  }, []);

  const setRouteGeometry = useCallback((routeGeometry: RouteGeometry | null) => {
    setState(prev => ({ ...prev, routeGeometry }));
  }, []);

  const resetServiceRequest = useCallback(() => {
    setState(initialState);
  }, []);

  const hasActiveRequest = state.step !== 'serviceCategory' || state.servicioCategoria !== null;

  return (
    <ServiceRequestContext.Provider
      value={{
        ...state,
        setStep,
        setServicioCategoria,
        setServicioSubtipo,
        setTipoVehiculo,
        setMetodoPago,
        setSelectedCardId,
        setAseguradoraNombre,
        setAseguradoraPoliza,
        setDescripcionSituacion,
        setQuiereTransporteExtraccion,
        setOrigin,
        setDestination,
        setOrigenDireccion,
        setDestinoDireccion,
        setDistance,
        setDuration,
        setCost,
        setRouteGeometry,
        resetServiceRequest,
        hasActiveRequest,
      }}
    >
      {children}
    </ServiceRequestContext.Provider>
  );
}

export function useServiceRequest() {
  const context = useContext(ServiceRequestContext);
  if (!context) {
    throw new Error('useServiceRequest must be used within a ServiceRequestProvider');
  }
  return context;
}
