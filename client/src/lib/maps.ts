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

export function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    google: any;
  }
}
