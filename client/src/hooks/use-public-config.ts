import { useQuery } from '@tanstack/react-query';

interface PublicConfig {
  mapboxToken: string | null;
  vapidPublicKey: string | null;
  appVersion: string;
}

const VITE_MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const VITE_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePublicConfig() {
  return useQuery<PublicConfig>({
    queryKey: ['/public-config'],
    queryFn: async () => {
      const res = await fetch('/public-config');
      if (!res.ok) throw new Error('Failed to fetch public config');
      return res.json();
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: !VITE_MAPBOX_TOKEN,
  });
}

export function useMapboxToken(): string | null {
  const { data } = usePublicConfig();
  
  if (VITE_MAPBOX_TOKEN) {
    return VITE_MAPBOX_TOKEN;
  }
  
  return data?.mapboxToken ?? null;
}

export function getMapboxToken(): string | null {
  return VITE_MAPBOX_TOKEN || null;
}

let cachedServerToken: string | null = null;

export async function fetchMapboxToken(): Promise<string | null> {
  if (VITE_MAPBOX_TOKEN) {
    return VITE_MAPBOX_TOKEN;
  }
  
  if (cachedServerToken) {
    return cachedServerToken;
  }
  
  try {
    const response = await fetch('/public-config');
    if (response.ok) {
      const config = await response.json();
      cachedServerToken = config.mapboxToken;
      return config.mapboxToken;
    }
  } catch (error) {
    console.error('Failed to fetch public config:', error);
  }
  
  return null;
}
