export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  distanceText: string;
  durationText: string;
  geometry?: RouteGeometry;
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

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es`
    );
    if (!response.ok) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    const data = await response.json();
    return data.features?.[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}
