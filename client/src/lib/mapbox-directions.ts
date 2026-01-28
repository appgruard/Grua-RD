import { fetchMapboxToken } from '@/hooks/use-public-config';

export interface DirectionsResult {
  duration: number;
  distance: number;
  geometry: GeoJSON.LineString | null;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export async function getDirections(
  origin: Coordinates,
  destination: Coordinates
): Promise<DirectionsResult> {
  const token = await fetchMapboxToken();
  
  if (!token) {
    console.warn('Mapbox token not configured');
    return {
      duration: estimateDuration(origin, destination),
      distance: estimateDistance(origin, destination),
      geometry: null
    };
  }
  
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${token}&geometries=geojson&overview=full`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      return {
        duration: estimateDuration(origin, destination),
        distance: estimateDistance(origin, destination),
        geometry: null
      };
    }
    
    return {
      duration: data.routes[0].duration,
      distance: data.routes[0].distance,
      geometry: data.routes[0].geometry
    };
  } catch (error) {
    console.error('Error fetching directions:', error);
    return {
      duration: estimateDuration(origin, destination),
      distance: estimateDistance(origin, destination),
      geometry: null
    };
  }
}

function estimateDistance(origin: Coordinates, destination: Coordinates): number {
  const R = 6371000;
  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) * Math.cos(toRad(destination.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1.3;
}

function estimateDuration(origin: Coordinates, destination: Coordinates): number {
  const distance = estimateDistance(origin, destination);
  const averageSpeedMps = 40 * 1000 / 3600;
  return distance / averageSpeedMps;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function calculateETATime(durationSeconds: number): Date {
  return new Date(Date.now() + durationSeconds * 1000);
}

export function formatETATime(date: Date): string {
  return date.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
