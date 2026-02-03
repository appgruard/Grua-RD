import { useEffect, useRef, useState, useCallback, memo } from 'react';
import Map, { Marker, GeolocateControl, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import { Loader2, MapPin, CircleOff } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import watermarkLogo from '@assets/20251129_191904_0001_1764458415723.png';
import type { RouteGeometry } from '@/lib/maps';
import { useMapboxToken } from '@/hooks/use-public-config';
import { useTheme } from '@/components/ThemeToggle';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type MarkerType = 'origin' | 'destination' | 'driver' | 'driver_inactive' | 'service' | 'default';

function CarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Car body */}
      <path
        d="M4 14C4 13 4.5 12 6 12L26 12C27.5 12 28 13 28 14L28 17C28 17.5 27.5 18 27 18L5 18C4.5 18 4 17.5 4 17L4 14Z"
        fill="currentColor"
      />
      {/* Car roof/cabin */}
      <path
        d="M8 12L10 7C10.3 6.3 11 6 12 6L20 6C21 6 21.7 6.3 22 7L24 12"
        fill="currentColor"
      />
      {/* Windshield */}
      <path
        d="M10.5 11L12 7.5L20 7.5L21.5 11L10.5 11Z"
        fill="#87CEEB"
        opacity="0.9"
      />
      {/* Headlights */}
      <rect x="26" y="13.5" width="2" height="1.5" rx="0.5" fill="#f59e0b" />
      <rect x="4" y="13.5" width="2" height="1.5" rx="0.5" fill="#ef4444" opacity="0.8" />
      {/* Front wheel */}
      <circle cx="9" cy="18" r="3" fill="currentColor" />
      <circle cx="9" cy="18" r="1.8" fill="#0F2947" opacity="0.8" />
      <circle cx="9" cy="18" r="0.8" fill="#ddd" />
      {/* Rear wheel */}
      <circle cx="23" cy="18" r="3" fill="currentColor" />
      <circle cx="23" cy="18" r="1.8" fill="#0F2947" opacity="0.8" />
      <circle cx="23" cy="18" r="0.8" fill="#ddd" />
    </svg>
  );
}

function DestinationFlagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Flag pole */}
      <rect x="3" y="2" width="2.5" height="28" rx="1" fill="currentColor" />
      {/* Flag */}
      <path
        d="M5.5 3L22 6L22 14L5.5 11Z"
        fill="currentColor"
      />
      {/* Checkered pattern on flag */}
      <rect x="7" y="4.5" width="3" height="2" fill="white" opacity="0.9" />
      <rect x="13" y="4.5" width="3" height="2" fill="white" opacity="0.9" />
      <rect x="10" y="6.5" width="3" height="2" fill="white" opacity="0.9" />
      <rect x="16" y="6.5" width="3" height="2" fill="white" opacity="0.9" />
      <rect x="7" y="8.5" width="3" height="2" fill="white" opacity="0.9" />
      <rect x="13" y="8.5" width="3" height="2" fill="white" opacity="0.9" />
      {/* Base */}
      <ellipse cx="4.25" cy="30" rx="4" ry="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function ServiceIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wrench */}
      <path
        d="M6 22L16 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Wrench head */}
      <path
        d="M16 12C16 12 18 10 20 10C22 10 24 11 24 13C24 15 23 16 21 16C19 16 18 15 17 14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Wrench handle end */}
      <circle cx="5" cy="23" r="2.5" fill="currentColor" />
      {/* Gear/cog behind */}
      <circle cx="20" cy="8" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="20" cy="8" r="2" fill="currentColor" opacity="0.5" />
      {/* Warning triangle accent */}
      <path
        d="M3 8L6 3L9 8Z"
        fill="#f59e0b"
        opacity="0.9"
      />
      <rect x="5.25" y="4.5" width="1.5" height="2" rx="0.5" fill="white" />
      <circle cx="6" cy="7" r="0.6" fill="white" />
    </svg>
  );
}

function LocationPinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pin shape */}
      <path
        d="M12 0C6 0 1 5 1 11C1 19 12 31 12 31C12 31 23 19 23 11C23 5 18 0 12 0Z"
        fill="currentColor"
      />
      {/* Inner circle */}
      <circle cx="12" cy="11" r="5" fill="white" opacity="0.9" />
      <circle cx="12" cy="11" r="2.5" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function TowTruckIcon({ className, isActive = true, customColor }: { className?: string; isActive?: boolean; customColor?: string }) {
  const mainColor = customColor || (isActive ? "currentColor" : "#64748b");
  const detailColor = customColor ? darkenColor(customColor, 0.4) : (isActive ? "#0F2947" : "#475569");
  const windowColor = isActive ? "#87CEEB" : "#94a3b8";
  
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Flatbed/platform */}
      <rect
        x="12"
        y="10"
        width="16"
        height="2.5"
        rx="0.5"
        fill={mainColor}
        opacity={isActive ? 1 : 0.6}
      />
      {/* Inclined ramp at rear */}
      <path
        d="M27 10L31 7L31 10Z"
        fill={mainColor}
        opacity={isActive ? 0.9 : 0.5}
      />
      {/* Lifting arm base */}
      <rect
        x="12"
        y="6"
        width="2.5"
        height="4"
        fill={mainColor}
        opacity={isActive ? 1 : 0.6}
      />
      {/* Lifting arm */}
      <path
        d="M13.5 6L19 2"
        stroke={mainColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={isActive ? 1 : 0.6}
      />
      {/* Hook at end of arm */}
      <path
        d="M19 2C19 2 21 2 21 3.5C21 5 19 5.5 18 4.5"
        stroke={mainColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity={isActive ? 1 : 0.6}
      />
      {/* Truck cabin */}
      <path
        d="M2 8C2 7 2.5 6 4 6L9 6C10.5 6 11 7 11 8.5L11 12.5C11 13 10.5 13.5 10 13.5L2 13.5C1.5 13.5 1 13 1 12.5L1 9C1 8.5 1.5 8 2 8Z"
        fill={mainColor}
        opacity={isActive ? 1 : 0.6}
      />
      {/* Cabin windshield */}
      <path
        d="M2.5 8L4 6.5L8.5 6.5L9.5 8L9.5 11L2.5 11Z"
        fill={windowColor}
        opacity={isActive ? 0.9 : 0.5}
      />
      {/* Cabin-bed connector */}
      <rect
        x="10"
        y="10"
        width="3"
        height="3.5"
        fill={mainColor}
        opacity={isActive ? 1 : 0.6}
      />
      {/* Truck body under flatbed */}
      <rect
        x="12"
        y="12.5"
        width="14"
        height="2.5"
        rx="0.5"
        fill={mainColor}
        opacity={isActive ? 0.85 : 0.5}
      />
      {/* Front wheel */}
      <circle cx="5" cy="16" r="3" fill={mainColor} opacity={isActive ? 1 : 0.6} />
      <circle cx="5" cy="16" r="1.8" fill={detailColor} opacity={isActive ? 0.8 : 0.4} />
      <circle cx="5" cy="16" r="0.8" fill={isActive ? "#ddd" : "#777"} />
      {/* Rear wheel */}
      <circle cx="22" cy="16" r="3" fill={mainColor} opacity={isActive ? 1 : 0.6} />
      <circle cx="22" cy="16" r="1.8" fill={detailColor} opacity={isActive ? 0.8 : 0.4} />
      <circle cx="22" cy="16" r="0.8" fill={isActive ? "#ddd" : "#777"} />
      {/* Warning lights on top */}
      <rect
        x="4"
        y="4.5"
        width="3.5"
        height="1.5"
        rx="0.75"
        fill={isActive ? "#f59e0b" : "#666"}
        opacity={isActive ? 0.9 : 0.4}
      />
      {!isActive && (
        <line
          x1="2"
          y1="2"
          x2="30"
          y2="18"
          stroke="#ef4444"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export interface MapMarker {
  position: Coordinates;
  title?: string;
  icon?: string;
  color?: string;
  type?: MarkerType;
  draggable?: boolean;
  id?: string;
}

interface MapboxMapProps {
  center: Coordinates;
  zoom?: number;
  markers?: MapMarker[];
  onMapClick?: (coordinates: Coordinates) => void;
  onAddressChange?: (address: string) => void;
  onMarkerDragEnd?: (markerId: string, coordinates: Coordinates, address: string) => void;
  className?: string;
  showHeatmap?: boolean;
  heatmapData?: Array<{ lat: number; lng: number; weight: number }>;
  routeGeometry?: RouteGeometry | null;
  focusOnOrigin?: boolean;
}

const MAP_STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12';
const MAP_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';

async function reverseGeocode(lat: number, lng: number, token: string | null): Promise<string> {
  console.log('[GEOCODE] Starting lat:', lat, 'lng:', lng);
  
  if (!token) {
    console.log('[GEOCODE] No token!');
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  
  try {
    const { universalFetch } = await import('@/lib/queryClient');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es`;
    
    const data = await universalFetch(url);
    
    // Aggressive logging to debug iOS
    console.log('[GEOCODE] data type:', typeof data);
    console.log('[GEOCODE] data is null:', data === null);
    console.log('[GEOCODE] data is undefined:', data === undefined);
    if (data) {
      console.log('[GEOCODE] data keys:', Object.keys(data).join(','));
      console.log('[GEOCODE] has features:', 'features' in data);
      if (data.features) {
        console.log('[GEOCODE] features type:', typeof data.features);
        console.log('[GEOCODE] features isArray:', Array.isArray(data.features));
        console.log('[GEOCODE] features length:', data.features.length);
        if (data.features.length > 0) {
          console.log('[GEOCODE] first feature:', JSON.stringify(data.features[0]).substring(0, 300));
        }
      }
    }
    
    if (data && data.features && data.features.length > 0) {
      const placeName = data.features[0].place_name;
      console.log('[GEOCODE] SUCCESS place_name:', placeName);
      return placeName;
    }
    
    console.log('[GEOCODE] No features, returning coords');
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('[GEOCODE] Error:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

function getMarkerColor(icon?: string, color?: string, type?: MarkerType): string {
  if (color) return color;
  if (type === 'origin' || icon?.includes('green')) return '#22c55e';
  if (type === 'destination' || icon?.includes('red')) return '#ef4444';
  if (type === 'driver' || icon?.includes('blue')) return '#0F2947';
  if (type === 'driver_inactive') return '#94a3b8';
  if (type === 'service') return '#f59e0b';
  return '#0F2947';
}

function getMarkerType(title?: string, color?: string, type?: MarkerType): MarkerType {
  if (type) return type;
  
  const lowerTitle = title?.toLowerCase() || '';
  
  if (lowerTitle.includes('origen') || 
      lowerTitle.includes('ubicación') || 
      lowerTitle.includes('location') ||
      lowerTitle.includes('pickup') ||
      lowerTitle.includes('recogida') ||
      color === '#22c55e') {
    return 'origin';
  }
  
  if (lowerTitle.includes('destino') || 
      lowerTitle.includes('destination') ||
      lowerTitle.includes('final') ||
      lowerTitle.includes('entrega') ||
      color === '#ef4444') {
    return 'destination';
  }
  
  if (lowerTitle.includes('inactivo') || 
      lowerTitle.includes('inactive') ||
      lowerTitle.includes('desconectado') ||
      lowerTitle.includes('offline') ||
      color === '#94a3b8') {
    return 'driver_inactive';
  }
  
  if (lowerTitle.includes('conductor') || 
      lowerTitle.includes('driver') || 
      lowerTitle.includes('grúa') ||
      lowerTitle.includes('grua') ||
      lowerTitle.includes('operador') ||
      color === '#0F2947') {
    return 'driver';
  }
  
  if (lowerTitle.includes('servicio') || 
      lowerTitle.includes('service') ||
      lowerTitle.includes('solicitud')) {
    return 'service';
  }
  
  return 'default';
}

function getMarkerIconComponent(type: MarkerType) {
  switch (type) {
    case 'origin':
      return { Component: CarIcon, size: 'w-10 h-8', color: 'text-green-600' };
    case 'destination':
      return { Component: DestinationFlagIcon, size: 'w-8 h-10', color: 'text-red-500' };
    case 'driver':
      return { Component: TowTruckIcon, size: 'w-12 h-8', color: 'text-primary', isActive: true };
    case 'driver_inactive':
      return { Component: TowTruckIcon, size: 'w-12 h-8', color: 'text-slate-400', isActive: false };
    case 'service':
      return { Component: ServiceIcon, size: 'w-9 h-9', color: 'text-amber-500' };
    default:
      return { Component: LocationPinIcon, size: 'w-7 h-9', color: 'text-primary' };
  }
}

export function MapboxMap({ 
  center, 
  zoom = 13, 
  markers = [], 
  onMapClick,
  onAddressChange,
  onMarkerDragEnd,
  className = 'w-full h-full',
  showHeatmap = false,
  heatmapData = [],
  routeGeometry = null,
  focusOnOrigin = false
}: MapboxMapProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapboxToken = useMapboxToken();
  const { theme } = useTheme();
  
  const mapStyle = theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
  
  console.log('[MapboxMap] Token received:', mapboxToken ? `${mapboxToken.substring(0, 20)}...` : 'null');
  
  const [viewState, setViewState] = useState({
    longitude: center.lng,
    latitude: center.lat,
    zoom: zoom
  });

  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [loading]);

  useEffect(() => {
    if (focusOnOrigin && markers.length > 0 && mapRef.current) {
      const originMarker = markers[0];
      mapRef.current.flyTo({
        center: [originMarker.position.lng, originMarker.position.lat],
        zoom: 15,
        duration: 1200,
        essential: true,
        easing: (t) => 1 - Math.pow(1 - t, 3)
      });
    } else if (!focusOnOrigin && mapRef.current) {
      mapRef.current.easeTo({
        center: [center.lng, center.lat],
        duration: 800,
        easing: (t) => t * (2 - t)
      });
    }
  }, [center.lat, center.lng, focusOnOrigin, markers]);

  useEffect(() => {
    if (routeGeometry && mapRef.current && markers.length >= 2) {
      const coords = routeGeometry.coordinates;
      if (coords.length > 0) {
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        
        mapRef.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { 
            padding: 60, 
            duration: 1500,
            easing: (t) => 1 - Math.pow(1 - t, 4)
          }
        );
      }
    }
  }, [routeGeometry, markers.length]);

  const routeGeoJSON = routeGeometry ? {
    type: 'Feature' as const,
    properties: {},
    geometry: routeGeometry
  } : null;

  const handleMapClick = useCallback(async (event: MapMouseEvent) => {
    if (!onMapClick) return;
    
    const coords: Coordinates = {
      lat: event.lngLat.lat,
      lng: event.lngLat.lng
    };
    
    onMapClick(coords);

    if (onAddressChange) {
      const address = await reverseGeocode(coords.lat, coords.lng, mapboxToken);
      onAddressChange(address);
    }
  }, [onMapClick, onAddressChange, mapboxToken]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    
    if (showHeatmap && heatmapData.length > 0 && mapRef.current) {
      const map = mapRef.current.getMap();
      
      const geojsonData = {
        type: 'FeatureCollection' as const,
        features: heatmapData.map(point => ({
          type: 'Feature' as const,
          properties: { weight: point.weight },
          geometry: {
            type: 'Point' as const,
            coordinates: [point.lng, point.lat]
          }
        }))
      };

      if (map.getSource('heatmap-source')) {
        (map.getSource('heatmap-source') as mapboxgl.GeoJSONSource).setData(geojsonData);
      } else {
        map.addSource('heatmap-source', {
          type: 'geojson',
          data: geojsonData
        });

        map.addLayer({
          id: 'heatmap-layer',
          type: 'heatmap',
          source: 'heatmap-source',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': 1,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 255, 255, 0)',
              0.2, 'rgba(0, 255, 255, 1)',
              0.4, 'rgba(0, 127, 255, 1)',
              0.6, 'rgba(0, 0, 255, 1)',
              0.8, 'rgba(127, 0, 63, 1)',
              1, 'rgba(255, 0, 0, 1)'
            ],
            'heatmap-radius': 30,
            'heatmap-opacity': 0.7
          }
        });
      }
    }
  }, [showHeatmap, heatmapData]);

  useEffect(() => {
    if (showHeatmap && mapRef.current && !loading) {
      const map = mapRef.current.getMap();
      
      const geojsonData = {
        type: 'FeatureCollection' as const,
        features: heatmapData.map(point => ({
          type: 'Feature' as const,
          properties: { weight: point.weight },
          geometry: {
            type: 'Point' as const,
            coordinates: [point.lng, point.lat]
          }
        }))
      };

      if (!map.getSource('heatmap-source')) {
        map.addSource('heatmap-source', {
          type: 'geojson',
          data: geojsonData
        });
      } else {
        (map.getSource('heatmap-source') as mapboxgl.GeoJSONSource).setData(geojsonData);
      }
      
      if (!map.getLayer('heatmap-layer')) {
        map.addLayer({
          id: 'heatmap-layer',
          type: 'heatmap',
          source: 'heatmap-source',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': 1,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 255, 255, 0)',
              0.2, 'rgba(0, 255, 255, 1)',
              0.4, 'rgba(0, 127, 255, 1)',
              0.6, 'rgba(0, 0, 255, 1)',
              0.8, 'rgba(127, 0, 63, 1)',
              1, 'rgba(255, 0, 0, 1)'
            ],
            'heatmap-radius': 30,
            'heatmap-opacity': 0.7
          }
        });
      }
      
      map.setLayoutProperty(
        'heatmap-layer', 
        'visibility', 
        heatmapData.length > 0 ? 'visible' : 'none'
      );
    }
  }, [heatmapData, showHeatmap, loading]);

  if (!mapboxToken) {
    return (
      <div className={`relative ${className} flex items-center justify-center bg-muted rounded-lg`}>
        <div className="text-center p-4">
          <Loader2 className="w-12 h-12 mx-auto text-muted-foreground mb-2 animate-spin" />
          <p className="text-muted-foreground">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative ${className} flex items-center justify-center bg-muted rounded-lg`}>
        <div className="text-center p-4">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Only add 'relative' if the caller hasn't already provided a positioning class
  const hasPositioning = /\b(relative|absolute|fixed|sticky)\b/.test(className);
  const containerClassName = hasPositioning ? className : `relative ${className}`;

  return (
    <div ref={containerRef} className={containerClassName} style={{ minHeight: '300px' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        onLoad={handleLoad}
        onError={(e: any) => {
          // Log detailed error info for debugging
          console.error('Map error type:', typeof e);
          console.error('Map error message:', e?.error?.message || e?.message || 'unknown');
          console.error('Map error status:', e?.error?.status || e?.status || 'unknown');
          try {
            console.error('Map error full:', JSON.stringify(e, null, 2));
          } catch {
            console.error('Map error (non-serializable):', e);
          }
          setError('Error al cargar el mapa');
          setLoading(false);
        }}
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%', minHeight: '300px' }}
        mapStyle={mapStyle}
        attributionControl={false}
      >
        <GeolocateControl position="top-right" trackUserLocation />

        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': '#0F2947',
                'line-width': 4,
                'line-opacity': 0.8
              }}
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
            />
          </Source>
        )}

        {markers.map((marker, index) => {
          const markerType = getMarkerType(marker.title, marker.color, marker.type);
          const iconConfig = getMarkerIconComponent(markerType);
          const { Component, size, color } = iconConfig;
          const isActive = 'isActive' in iconConfig ? iconConfig.isActive : true;
          const isInactiveDriver = markerType === 'driver_inactive';
          const hasCustomColor = marker.color && (markerType === 'driver' || markerType === 'driver_inactive');
          const markerId = marker.id || `marker-${index}`;
          const isDraggable = marker.draggable === true;
          
          return (
            <Marker
              key={`${markerId}-${marker.position.lat}-${marker.position.lng}`}
              longitude={marker.position.lng}
              latitude={marker.position.lat}
              anchor="bottom"
              draggable={isDraggable}
              onDragEnd={isDraggable ? async (event) => {
                const newCoords = { lat: event.lngLat.lat, lng: event.lngLat.lng };
                if (onMarkerDragEnd) {
                  const address = await reverseGeocode(newCoords.lat, newCoords.lng, mapboxToken);
                  onMarkerDragEnd(markerId, newCoords, address);
                }
              } : undefined}
            >
              <div 
                className={`relative flex items-end justify-center ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                title={marker.title}
                style={{ 
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35)) drop-shadow(0 1px 2px rgba(0,0,0,0.25))'
                }}
              >
                {markerType === 'driver' || markerType === 'driver_inactive' ? (
                  <TowTruckIcon 
                    className={`${size} ${hasCustomColor ? '' : color}`}
                    isActive={isActive}
                    customColor={hasCustomColor ? marker.color : undefined}
                  />
                ) : (
                  <Component className={`${size} ${color}`} />
                )}
                {isDraggable && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
                Arrastra
                  </div>
                )}
                {isInactiveDriver && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-slate-500 rounded-full flex items-center justify-center border border-white shadow-sm">
                    <CircleOff className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Watermark logo */}
      <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
        <img 
          src={watermarkLogo} 
          alt="GrúaRD" 
          className="w-10 h-10 opacity-70"
        />
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}

export function HeatmapComponent({ 
  data, 
  startDate, 
  endDate 
}: { 
  data: Array<{ lat: number; lng: number; weight: number }>; 
  startDate: string; 
  endDate: string;
}) {
  const mapboxToken = useMapboxToken();
  const center = data.length > 0 
    ? { lat: data[0].lat, lng: data[0].lng }
    : { lat: 18.4861, lng: -69.9312 };

  if (!mapboxToken) {
    return (
      <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center p-4">
          <Loader2 className="w-12 h-12 mx-auto text-muted-foreground mb-2 animate-spin" />
          <p className="text-muted-foreground">Cargando mapa de calor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-80 rounded-lg overflow-hidden">
      <MapboxMap
        center={center}
        zoom={10}
        showHeatmap={true}
        heatmapData={data}
        className="w-full h-full"
      />
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <p className="text-muted-foreground">No hay datos de ubicación para el período seleccionado</p>
        </div>
      )}
    </div>
  );
}
