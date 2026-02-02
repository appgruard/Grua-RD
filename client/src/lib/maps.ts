import { fetchMapboxToken } from '@/hooks/use-public-config';
import { apiRequest, universalFetch } from '@/lib/queryClient';
import { Capacitor } from '@capacitor/core';

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
  const isNative = Capacitor.isNativePlatform();
  console.log('[calculateRoute] isNative:', isNative, 'origin:', origin, 'destination:', destination);
  
  // For native apps, use Mapbox Directions API directly
  if (isNative) {
    try {
      const token = await fetchMapboxToken();
      if (!token) {
        console.warn('[calculateRoute] No Mapbox token available');
        return estimateRoute(origin, destination);
      }
      
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${token}&geometries=geojson&overview=full`;
      console.log('[calculateRoute] Fetching from Mapbox directly');
      const data = await universalFetch(url);
      
      if (!data.routes || data.routes.length === 0) {
        console.warn('[calculateRoute] No routes found');
        return estimateRoute(origin, destination);
      }
      
      const route = data.routes[0];
      const distanceKm = route.distance / 1000;
      const durationMinutes = route.duration / 60;
      
      return {
        distanceKm,
        durationMinutes,
        distanceText: `${distanceKm.toFixed(1)} km`,
        durationText: `${Math.round(durationMinutes)} min`,
        geometry: route.geometry,
      };
    } catch (error) {
      console.error('[calculateRoute] Native fetch error:', error);
      return estimateRoute(origin, destination);
    }
  }
  
  // For web, use server endpoint
  const response = await apiRequest('POST', '/api/maps/calculate-route', { origin, destination });
  return response.json();
}

function estimateRoute(origin: Coordinates, destination: Coordinates): RouteResult {
  const R = 6371;
  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(origin.lat)) * Math.cos(toRad(destination.lat)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceKm = R * c * 1.3; // Add 30% for road distance
  const durationMinutes = (distanceKm / 40) * 60; // Assume 40 km/h average
  
  return {
    distanceKm,
    durationMinutes,
    distanceText: `${distanceKm.toFixed(1)} km`,
    durationText: `${Math.round(durationMinutes)} min`,
  };
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export async function geocodeAddress(address: string): Promise<Coordinates> {
  const isNative = Capacitor.isNativePlatform();
  
  // For native apps, use Mapbox Geocoding API directly
  if (isNative) {
    const token = await fetchMapboxToken();
    if (!token) {
      throw new Error('No Mapbox token available');
    }
    
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&country=DO&limit=1`;
    const data = await universalFetch(url);
    
    if (!data.features || data.features.length === 0) {
      throw new Error('Address not found');
    }
    
    return {
      lat: data.features[0].center[1],
      lng: data.features[0].center[0],
    };
  }
  
  // For web, use server endpoint
  const response = await apiRequest('POST', '/api/maps/geocode', { address });
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
  console.log('[reverseGeocode] lat:', lat, 'lng:', lng);
  const token = await fetchMapboxToken();
  if (!token) {
    console.warn('[reverseGeocode] No token available');
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es`;
    console.log('[reverseGeocode] Fetching...');
    const data = await universalFetch(url);
    const placeName = data.features?.[0]?.place_name;
    console.log('[reverseGeocode] Result:', placeName ? 'found' : 'not found');
    return placeName || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('[reverseGeocode] Error:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}
