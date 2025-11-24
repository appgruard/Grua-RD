/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsScript, type Coordinates } from '@/lib/maps';
import { Loader2 } from 'lucide-react';

interface GoogleMapProps {
  center: Coordinates;
  zoom?: number;
  markers?: Array<{
    position: Coordinates;
    title?: string;
    icon?: string;
  }>;
  onMapClick?: (coordinates: Coordinates) => void;
  onAddressChange?: (address: string) => void;
  className?: string;
}

export function GoogleMap({ 
  center, 
  zoom = 13, 
  markers = [], 
  onMapClick,
  onAddressChange,
  className = 'w-full h-full'
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        if (mapRef.current && !map) {
          const newMap = new window.google.maps.Map(mapRef.current, {
            center,
            zoom,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          geocoderRef.current = new window.google.maps.Geocoder();

          if (onMapClick) {
            newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
              if (e.latLng) {
                const coords = {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                };
                onMapClick(coords);

                if (onAddressChange && geocoderRef.current) {
                  geocoderRef.current.geocode(
                    { location: e.latLng },
                    (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
                      if (status === 'OK' && results && results[0]) {
                        onAddressChange(results[0].formatted_address);
                      }
                    }
                  );
                }
              }
            });
          }

          setMap(newMap);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (map) {
      map.setCenter(center);
    }
  }, [map, center]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    markers.forEach(({ position, title, icon }) => {
      const marker = new window.google.maps.Marker({
        position,
        map,
        title,
        icon: icon || undefined,
      });
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
    };
  }, [map, markers]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
