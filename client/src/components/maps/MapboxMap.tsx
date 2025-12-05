import { useEffect, useRef, useState, useCallback, memo } from 'react';
import Map, { Marker, GeolocateControl, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import { Loader2, MapPin, Car, Flag, Wrench, CircleOff } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import watermarkLogo from '@assets/20251129_191904_0001_1764458415723.png';
import type { RouteGeometry } from '@/lib/maps';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type MarkerType = 'origin' | 'destination' | 'driver' | 'driver_inactive' | 'service' | 'default';

function CraneIcon({ className, isActive = true }: { className?: string; isActive?: boolean }) {
  const mainColor = isActive ? "currentColor" : "#64748b";
  const detailColor = isActive ? "#0F2947" : "#475569";
  
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Crane boom/arm */}
      <path
        d="M6 24L22 8"
        stroke={mainColor}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={isActive ? 1 : 0.6}
      />
      {/* Crane tower/mast */}
      <path
        d="M6 24V10"
        stroke={mainColor}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={isActive ? 1 : 0.6}
      />
      {/* Hook cable */}
      <path
        d="M22 8V18"
        stroke={mainColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={isActive ? 1 : 0.6}
      />
      {/* Hook */}
      <path
        d="M22 18C22 18 24 19 24 21C24 23 22 24 20 24C18 24 20 22 20 21"
        stroke={mainColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={isActive ? 1 : 0.6}
      />
      {/* Truck cabin */}
      <rect
        x="2"
        y="22"
        width="12"
        height="6"
        rx="1"
        fill={mainColor}
        opacity={isActive ? 1 : 0.5}
      />
      {/* Cabin window */}
      <rect
        x="4"
        y="23.5"
        width="4"
        height="2.5"
        rx="0.5"
        fill={detailColor}
        opacity={isActive ? 0.8 : 0.4}
      />
      {/* Front wheel */}
      <circle cx="5" cy="28" r="2.5" fill={mainColor} opacity={isActive ? 1 : 0.6} />
      <circle cx="5" cy="28" r="1" fill={isActive ? "#fff" : "#94a3b8"} />
      {/* Rear wheel */}
      <circle cx="11" cy="28" r="2.5" fill={mainColor} opacity={isActive ? 1 : 0.6} />
      <circle cx="11" cy="28" r="1" fill={isActive ? "#fff" : "#94a3b8"} />
      {/* Support struts */}
      <path
        d="M6 16L10 24"
        stroke={mainColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={isActive ? 0.7 : 0.4}
      />
      {!isActive && (
        <line
          x1="4"
          y1="4"
          x2="28"
          y2="28"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

interface MapboxMapProps {
  center: Coordinates;
  zoom?: number;
  markers?: Array<{
    position: Coordinates;
    title?: string;
    icon?: string;
    color?: string;
    type?: MarkerType;
  }>;
  onMapClick?: (coordinates: Coordinates) => void;
  onAddressChange?: (address: string) => void;
  className?: string;
  showHeatmap?: boolean;
  heatmapData?: Array<{ lat: number; lng: number; weight: number }>;
  routeGeometry?: RouteGeometry | null;
  focusOnOrigin?: boolean;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const MAP_STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12';

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
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

function MarkerIcon({ type, className }: { type: MarkerType; className?: string }) {
  const iconClass = className || "w-3.5 h-3.5 text-white";
  
  switch (type) {
    case 'origin':
      return <Car className={iconClass} />;
    case 'destination':
      return <Flag className={iconClass} />;
    case 'driver':
      return <CraneIcon className={iconClass} isActive={true} />;
    case 'driver_inactive':
      return <CraneIcon className={iconClass} isActive={false} />;
    case 'service':
      return <Wrench className={iconClass} />;
    default:
      return <MapPin className={iconClass} />;
  }
}

export function MapboxMap({ 
  center, 
  zoom = 13, 
  markers = [], 
  onMapClick,
  onAddressChange,
  className = 'w-full h-full',
  showHeatmap = false,
  heatmapData = [],
  routeGeometry = null,
  focusOnOrigin = false
}: MapboxMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: center.lng,
    latitude: center.lat,
    zoom: zoom
  });

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
      const address = await reverseGeocode(coords.lat, coords.lng);
      onAddressChange(address);
    }
  }, [onMapClick, onAddressChange]);

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

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`relative ${className} flex items-center justify-center bg-muted rounded-lg`}>
        <div className="text-center p-4">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Mapbox no está configurado</p>
          <p className="text-sm text-muted-foreground mt-2">
            Configure VITE_MAPBOX_ACCESS_TOKEN para habilitar el mapa.
          </p>
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

  return (
    <div className={`relative ${className}`} style={{ minHeight: '300px' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        onLoad={handleLoad}
        onError={(e) => {
          console.error('Map error:', e);
          setError('Error al cargar el mapa');
          setLoading(false);
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%', minHeight: '300px' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
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
          const isDriverMarker = markerType === 'driver';
          const isInactiveDriver = markerType === 'driver_inactive';
          const isDriverType = isDriverMarker || isInactiveDriver;
          
          return (
            <Marker
              key={`${marker.position.lat}-${marker.position.lng}-${index}`}
              longitude={marker.position.lng}
              latitude={marker.position.lat}
              anchor="bottom"
            >
              {isDriverType ? (
                <div 
                  className={`relative flex items-end justify-center ${isDriverMarker ? 'animate-pulse' : ''}`}
                  title={marker.title}
                  style={{ 
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3)) drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
                  }}
                >
                  <CraneIcon 
                    className={`w-10 h-10 ${isDriverMarker ? 'text-primary' : 'text-slate-400'}`}
                    isActive={isDriverMarker}
                  />
                  {isInactiveDriver && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-slate-500 rounded-full flex items-center justify-center border border-white shadow-sm">
                      <CircleOff className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                  style={{ backgroundColor: getMarkerColor(marker.icon, marker.color, markerType) }}
                  title={marker.title}
                >
                  <MarkerIcon 
                    type={markerType} 
                    className="w-4 h-4 text-white" 
                  />
                </div>
              )}
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
  const center = data.length > 0 
    ? { lat: data[0].lat, lng: data[0].lng }
    : { lat: 18.4861, lng: -69.9312 };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center p-4">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Mapbox no está configurado</p>
          <p className="text-sm text-muted-foreground mt-2">
            Configure VITE_MAPBOX_ACCESS_TOKEN para habilitar el mapa de calor.
          </p>
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
