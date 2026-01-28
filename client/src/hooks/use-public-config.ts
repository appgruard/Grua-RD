import { useQuery } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';

interface PublicConfig {
  mapboxToken: string | null;
  vapidPublicKey: string | null;
  appVersion: string;
}

const VITE_MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const VITE_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app.gruard.com';

function getPublicConfigUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return `${API_BASE_URL}/public-config`;
  }
  return '/public-config';
}

export function usePublicConfig() {
  const isNative = Capacitor.isNativePlatform();
  
  return useQuery<PublicConfig>({
    queryKey: ['/public-config'],
    queryFn: async () => {
      const url = getPublicConfigUrl();
      console.log('[usePublicConfig] Fetching from:', url, 'isNative:', isNative);
      try {
        const res = await fetch(url);
        console.log('[usePublicConfig] Response status:', res.status);
        if (!res.ok) throw new Error('Failed to fetch public config');
        const data = await res.json();
        console.log('[usePublicConfig] Config received, has token:', !!data.mapboxToken);
        return data;
      } catch (error) {
        console.error('[usePublicConfig] Fetch error:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isNative || !VITE_MAPBOX_TOKEN,
  });
}

export function useMapboxToken(): string | null {
  const { data, isLoading, error } = usePublicConfig();
  const isNative = Capacitor.isNativePlatform();
  
  console.log('[useMapboxToken] isNative:', isNative, 'isLoading:', isLoading, 'hasError:', !!error, 'hasData:', !!data);
  
  if (!isNative && VITE_MAPBOX_TOKEN) {
    console.log('[useMapboxToken] Using VITE token');
    return VITE_MAPBOX_TOKEN;
  }
  
  const token = data?.mapboxToken ?? null;
  console.log('[useMapboxToken] Using server token, has token:', !!token);
  return token;
}

export function getMapboxToken(): string | null {
  if (!Capacitor.isNativePlatform() && VITE_MAPBOX_TOKEN) {
    return VITE_MAPBOX_TOKEN;
  }
  return cachedServerToken || null;
}

let cachedServerToken: string | null = null;
let cachedVapidKey: string | null = null;
let configFetchPromise: Promise<PublicConfig | null> | null = null;

async function fetchPublicConfig(): Promise<PublicConfig | null> {
  if (!configFetchPromise) {
    const url = getPublicConfigUrl();
    configFetchPromise = fetch(url)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null);
  }
  return configFetchPromise;
}

export async function fetchMapboxToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform() && VITE_MAPBOX_TOKEN) {
    return VITE_MAPBOX_TOKEN;
  }
  
  if (cachedServerToken) {
    return cachedServerToken;
  }
  
  try {
    const config = await fetchPublicConfig();
    if (config?.mapboxToken) {
      cachedServerToken = config.mapboxToken;
      return config.mapboxToken;
    }
  } catch (error) {
    console.error('Failed to fetch public config:', error);
  }
  
  return null;
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  if (!Capacitor.isNativePlatform() && VITE_VAPID_KEY) {
    return VITE_VAPID_KEY;
  }
  
  if (cachedVapidKey) {
    return cachedVapidKey;
  }
  
  try {
    const config = await fetchPublicConfig();
    if (config?.vapidPublicKey) {
      cachedVapidKey = config.vapidPublicKey;
      return config.vapidPublicKey;
    }
  } catch (error) {
    console.error('Failed to fetch public config:', error);
  }
  
  return null;
}
