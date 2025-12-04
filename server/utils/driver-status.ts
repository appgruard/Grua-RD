import { calculateHaversineDistance, type Coordinates } from './geo';

export type DriverStatusType = 
  | 'en_camino' 
  | 'llegando' 
  | 'trabajando' 
  | 'en_ruta_destino' 
  | 'llegando_destino';

export interface DriverStatusResult {
  status: DriverStatusType;
  message: string;
  distanceToTarget: number;
}

export interface ServiceLocation {
  origenLat: number;
  origenLng: number;
  destinoLat: number;
  destinoLng: number;
  estado: string;
}

export function calculateDriverStatus(
  driverLocation: Coordinates,
  service: ServiceLocation,
  speedKmh: number = 0
): DriverStatusResult {
  const origin: Coordinates = {
    lat: Number(service.origenLat),
    lng: Number(service.origenLng)
  };
  
  const destination: Coordinates = {
    lat: Number(service.destinoLat),
    lng: Number(service.destinoLng)
  };
  
  const distanceToOrigin = calculateHaversineDistance(driverLocation, origin);
  const distanceToDestination = calculateHaversineDistance(driverLocation, destination);
  
  if (service.estado === 'aceptado') {
    if (distanceToOrigin < 100 && speedKmh < 5) {
      return {
        status: 'llegando',
        message: 'El operador está llegando',
        distanceToTarget: distanceToOrigin
      };
    }
    return {
      status: 'en_camino',
      message: 'El operador viene en camino',
      distanceToTarget: distanceToOrigin
    };
  }
  
  if (service.estado === 'conductor_en_sitio' || service.estado === 'cargando') {
    if (distanceToOrigin < 80 && speedKmh < 3) {
      return {
        status: 'trabajando',
        message: 'El operador está trabajando',
        distanceToTarget: distanceToOrigin
      };
    }
    return {
      status: 'trabajando',
      message: 'El operador está en el sitio',
      distanceToTarget: distanceToOrigin
    };
  }
  
  if (service.estado === 'en_progreso') {
    if (distanceToDestination < 200) {
      return {
        status: 'llegando_destino',
        message: 'Llegando al destino',
        distanceToTarget: distanceToDestination
      };
    }
    return {
      status: 'en_ruta_destino',
      message: 'Llevando tu vehículo al destino',
      distanceToTarget: distanceToDestination
    };
  }
  
  return {
    status: 'en_camino',
    message: 'En servicio',
    distanceToTarget: distanceToOrigin
  };
}

export function getStatusLabel(estado: string): string {
  const labels: Record<string, string> = {
    'pendiente': 'Buscando operador',
    'aceptado': 'Operador en camino',
    'conductor_en_sitio': 'Operador en sitio',
    'cargando': 'Cargando vehículo',
    'en_progreso': 'En ruta al destino',
    'completado': 'Servicio completado',
    'cancelado': 'Servicio cancelado'
  };
  return labels[estado] || estado;
}
