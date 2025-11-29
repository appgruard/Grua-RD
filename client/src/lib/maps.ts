export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  distanceText: string;
  durationText: string;
}

export async function calculateRoute(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteResult> {
  const response = await fetch('/api/maps/calculate-route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to calculate route');
  }

  return response.json();
}

export async function geocodeAddress(address: string): Promise<Coordinates> {
  const response = await fetch('/api/maps/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to geocode address');
  }

  return response.json();
}

export function generateWazeNavigationUrl(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return null;
  }
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export function generateGoogleMapsNavigationUrl(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return null;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function getNavigationUrl(lat: number | string | null | undefined, lng: number | string | null | undefined): string | null {
  const parsedLat = typeof lat === 'string' ? parseFloat(lat) : lat;
  const parsedLng = typeof lng === 'string' ? parseFloat(lng) : lng;
  
  const wazeUrl = generateWazeNavigationUrl(parsedLat, parsedLng);
  if (wazeUrl) return wazeUrl;
  
  const googleUrl = generateGoogleMapsNavigationUrl(parsedLat, parsedLng);
  return googleUrl;
}
