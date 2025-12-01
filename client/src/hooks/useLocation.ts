import { useState, useEffect, useCallback, useRef } from 'react';
import { LocationService, LocationData, isCapacitor, isWeb, TrackingOptions } from '@/lib/capacitor';
import type { Coordinates } from '@/lib/maps';

interface UseLocationOptions {
  enableTracking?: boolean;
  trackingInterval?: number;
  minDistance?: number;
}

interface UseLocationReturn {
  location: Coordinates | null;
  error: string | null;
  isLoading: boolean;
  isTracking: boolean;
  hasPermission: boolean | null;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    enableTracking = false,
    trackingInterval = 5000,
    minDistance = 10,
  } = options;

  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const callbackRef = useRef<((location: LocationData) => void) | null>(null);

  const handleLocationUpdate = useCallback((locationData: LocationData) => {
    setLocation({
      lat: locationData.latitude,
      lng: locationData.longitude,
    });
    setError(null);
  }, []);

  const checkAndRequestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const hasPerms = await LocationService.checkPermissions();
      setHasPermission(hasPerms);
      
      if (!hasPerms) {
        const granted = await LocationService.requestPermissions();
        setHasPermission(granted);
        return granted;
      }
      return true;
    } catch (err) {
      console.error('Error checking permissions:', err);
      setError('Error al verificar permisos de ubicación');
      return false;
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      const locationData = await LocationService.getCurrentPosition();
      setLocation({
        lat: locationData.latitude,
        lng: locationData.longitude,
      });
      setError(null);
    } catch (err) {
      console.error('Error getting current position:', err);
      if (!isCapacitor() || isWeb()) {
        if ('geolocation' in navigator) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              });
            });
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setError(null);
          } catch (fallbackErr) {
            setError('No se pudo obtener la ubicación');
          }
        }
      } else {
        setError('No se pudo obtener la ubicación');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startTracking = useCallback(async () => {
    const permsGranted = await checkAndRequestPermissions();
    if (!permsGranted) {
      setError('Se requieren permisos de ubicación para el seguimiento');
      return;
    }

    try {
      callbackRef.current = handleLocationUpdate;
      await LocationService.startTracking(handleLocationUpdate, {
        interval: trackingInterval,
        minDistance: minDistance,
      });
      setIsTracking(true);
      setError(null);
    } catch (err) {
      console.error('Error starting tracking:', err);
      setError('Error al iniciar el seguimiento de ubicación');
    }
  }, [checkAndRequestPermissions, handleLocationUpdate, trackingInterval, minDistance]);

  const stopTracking = useCallback(async () => {
    try {
      if (callbackRef.current) {
        await LocationService.stopTracking(callbackRef.current);
        callbackRef.current = null;
      }
      setIsTracking(false);
    } catch (err) {
      console.error('Error stopping tracking:', err);
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    return checkAndRequestPermissions();
  }, [checkAndRequestPermissions]);

  useEffect(() => {
    const init = async () => {
      await checkAndRequestPermissions();
      await refreshLocation();
      
      if (enableTracking) {
        await startTracking();
      }
    };

    init();

    return () => {
      if (callbackRef.current) {
        LocationService.stopTracking(callbackRef.current);
        callbackRef.current = null;
      }
    };
  }, [enableTracking]);

  return {
    location,
    error,
    isLoading,
    isTracking,
    hasPermission,
    startTracking,
    stopTracking,
    refreshLocation,
    requestPermissions,
  };
}

export function useLocationTracking(
  onLocationUpdate: (location: Coordinates) => void,
  enabled: boolean = true,
  options?: TrackingOptions
): { isTracking: boolean; error: string | null } {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackRef = useRef<((location: LocationData) => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (callbackRef.current) {
        LocationService.stopTracking(callbackRef.current);
        callbackRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    const callback = (locationData: LocationData) => {
      onLocationUpdate({
        lat: locationData.latitude,
        lng: locationData.longitude,
      });
    };

    callbackRef.current = callback;

    const start = async () => {
      try {
        const hasPerms = await LocationService.checkPermissions();
        if (!hasPerms) {
          const granted = await LocationService.requestPermissions();
          if (!granted) {
            setError('Se requieren permisos de ubicación');
            return;
          }
        }

        await LocationService.startTracking(callback, options);
        setIsTracking(true);
        setError(null);
      } catch (err) {
        console.error('Error starting location tracking:', err);
        setError('Error al iniciar seguimiento');
        if (!isCapacitor() || isWeb()) {
          if ('geolocation' in navigator) {
            const watchId = navigator.geolocation.watchPosition(
              (position) => {
                onLocationUpdate({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
              },
              (err) => console.error('Fallback geolocation error:', err),
              { enableHighAccuracy: true, maximumAge: 5000 }
            );
            setIsTracking(true);
            setError(null);
            
            return () => navigator.geolocation.clearWatch(watchId);
          }
        }
      }
    };

    start();

    return () => {
      if (callbackRef.current) {
        LocationService.stopTracking(callbackRef.current);
        callbackRef.current = null;
      }
      setIsTracking(false);
    };
  }, [enabled, onLocationUpdate, options?.interval, options?.minDistance]);

  return { isTracking, error };
}
