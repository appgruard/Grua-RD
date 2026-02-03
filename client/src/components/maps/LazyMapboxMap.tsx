import { lazy, Suspense, useState, useEffect, memo, useRef, useCallback } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import type { Coordinates, MarkerType, MapMarker } from './MapboxMap';
import type { RouteGeometry } from '@/lib/maps';

const MapboxMapLazy = lazy(() => import('./MapboxMap').then(module => ({ default: module.MapboxMap })));

interface LazyMapboxMapProps {
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
  deferLoad?: boolean;
  loadDelay?: number;
}

function MapPlaceholder({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <div className={`relative ${className} flex items-center justify-center bg-muted/50 rounded-lg`} style={{ minHeight: '300px' }}>
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <MapPin className="w-8 h-8 animate-pulse" />
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Cargando mapa...</span>
        </div>
      </div>
    </div>
  );
}

function LazyMapboxMapInner({
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
  focusOnOrigin = false,
  deferLoad = false,
  loadDelay = 100
}: LazyMapboxMapProps) {
  const [shouldLoad, setShouldLoad] = useState(!deferLoad);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (deferLoad) {
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, loadDelay);
      return () => clearTimeout(timer);
    }
  }, [deferLoad, loadDelay]);

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    containerRef.current = node;

    if (node && shouldLoad && !isVisible) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current?.disconnect();
            observerRef.current = null;
          }
        },
        { threshold: 0.1, rootMargin: '50px' }
      );
      observerRef.current.observe(node);
    }
  }, [shouldLoad, isVisible]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  if (!shouldLoad || !isVisible) {
    return (
      <div ref={setContainerRef} className={className} style={{ minHeight: '300px' }}>
        <MapPlaceholder className={className} />
      </div>
    );
  }

  return (
    <Suspense fallback={<MapPlaceholder className={className} />}>
      <MapboxMapLazy
        center={center}
        zoom={zoom}
        markers={markers}
        onMapClick={onMapClick}
        onAddressChange={onAddressChange}
        onMarkerDragEnd={onMarkerDragEnd}
        className={className}
        showHeatmap={showHeatmap}
        heatmapData={heatmapData}
        routeGeometry={routeGeometry}
        focusOnOrigin={focusOnOrigin}
      />
    </Suspense>
  );
}

export const LazyMapboxMap = memo(LazyMapboxMapInner);

export function MapboxMapWithFastLoad(props: Omit<LazyMapboxMapProps, 'deferLoad' | 'loadDelay'>) {
  return (
    <Suspense fallback={<MapPlaceholder className={props.className} />}>
      <MapboxMapLazy {...props} />
    </Suspense>
  );
}
