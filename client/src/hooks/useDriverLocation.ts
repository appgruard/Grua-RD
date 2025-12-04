import { useEffect, useRef, useCallback, useState } from 'react';

interface LocationData {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number;
  timestamp: number;
}

interface UseDriverLocationOptions {
  intervalMs?: number;
  enableHighAccuracy?: boolean;
}

interface UseDriverLocationReturn {
  currentLocation: LocationData | null;
  isTracking: boolean;
  error: string | null;
  distanceToTarget: number | null;
  startTracking: () => void;
  stopTracking: () => void;
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function useDriverLocation(
  serviceId: string | null,
  conductorId: string | null,
  targetLocation: { lat: number; lng: number } | null,
  sendMessage: (message: { type: string; payload: any }) => void,
  options: UseDriverLocationOptions = {}
): UseDriverLocationReturn {
  const { intervalMs = 3000, enableHighAccuracy = true } = options;
  
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  const calculateSpeed = useCallback((
    newLat: number,
    newLng: number,
    timestamp: number
  ): number => {
    if (!lastPositionRef.current) return 0;
    
    const distance = calculateDistance(
      lastPositionRef.current.lat,
      lastPositionRef.current.lng,
      newLat,
      newLng
    );
    
    const timeDiff = (timestamp - lastPositionRef.current.timestamp) / 1000;
    if (timeDiff <= 0) return 0;
    
    return (distance / timeDiff) * 3.6;
  }, []);

  const sendLocationUpdate = useCallback((position: GeolocationPosition) => {
    if (!serviceId || !conductorId) return;
    
    const now = Date.now();
    if (now - lastSentRef.current < intervalMs) return;
    
    const coords = position.coords;
    let speed = coords.speed ? coords.speed * 3.6 : null;
    
    if (speed === null) {
      speed = calculateSpeed(coords.latitude, coords.longitude, position.timestamp);
    }
    
    const locationData: LocationData = {
      lat: coords.latitude,
      lng: coords.longitude,
      speed,
      heading: coords.heading,
      accuracy: coords.accuracy,
      timestamp: position.timestamp
    };
    
    setCurrentLocation(locationData);
    
    if (targetLocation) {
      const distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        targetLocation.lat,
        targetLocation.lng
      );
      setDistanceToTarget(distance);
    }
    
    sendMessage({
      type: 'update_location',
      payload: {
        servicioId: serviceId,
        conductorId,
        lat: coords.latitude,
        lng: coords.longitude,
        speed: speed || 0,
        heading: coords.heading || 0,
        accuracy: coords.accuracy
      }
    });
    
    lastSentRef.current = now;
    lastPositionRef.current = {
      lat: coords.latitude,
      lng: coords.longitude,
      timestamp: position.timestamp
    };
  }, [serviceId, conductorId, targetLocation, sendMessage, intervalMs, calculateSpeed]);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage = 'Error al obtener ubicación';
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = 'Permiso de ubicación denegado';
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = 'Ubicación no disponible';
        break;
      case err.TIMEOUT:
        errorMessage = 'Tiempo de espera agotado';
        break;
    }
    setError(errorMessage);
    console.error('Geolocation error:', errorMessage);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada');
      return;
    }
    
    setIsTracking(true);
    setError(null);
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocationUpdate,
      handleError,
      {
        enableHighAccuracy,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [sendLocationUpdate, handleError, enableHighAccuracy]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    if (serviceId && conductorId) {
      startTracking();
    } else {
      stopTracking();
    }
    
    return () => {
      stopTracking();
    };
  }, [serviceId, conductorId]);

  return {
    currentLocation,
    isTracking,
    error,
    distanceToTarget,
    startTracking,
    stopTracking
  };
}
