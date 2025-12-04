export interface Coordinates {
  lat: number;
  lng: number;
}

export function calculateHaversineDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371000;
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function isWithinRadius(
  point: Coordinates,
  center: Coordinates,
  radiusMeters: number
): boolean {
  const distance = calculateHaversineDistance(point, center);
  return distance <= radiusMeters;
}

export function calculateSpeed(
  point1: Coordinates,
  point2: Coordinates,
  timeDifferenceMs: number
): number {
  if (timeDifferenceMs <= 0) return 0;
  
  const distanceMeters = calculateHaversineDistance(point1, point2);
  const timeHours = timeDifferenceMs / (1000 * 60 * 60);
  const distanceKm = distanceMeters / 1000;
  
  return distanceKm / timeHours;
}

export function calculateBearing(
  point1: Coordinates,
  point2: Coordinates
): number {
  const dLng = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);
  
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
  let bearing = Math.atan2(y, x);
  bearing = bearing * (180 / Math.PI);
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

export const GEOFENCE_RADIUS_METERS = 60;
