import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app.gruard.com';

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (isNativePlatform()) {
    return `${API_BASE_URL}${cleanPath}`;
  }
  if (API_BASE_URL && !API_BASE_URL.includes('localhost')) {
    return `${API_BASE_URL}${cleanPath}`;
  }
  return cleanPath;
}

async function throwIfResNotOk(res: Response | HttpResponse) {
  const status = 'status' in res ? res.status : 500;
  const ok = status >= 200 && status < 300;
  
  if (!ok) {
    let text = '';
    if ('text' in res && typeof res.text === 'function') {
      text = await (res as Response).text();
    } else if ('data' in res) {
      text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    }
    throw new Error(`${status}: ${text || 'Request failed'}`);
  }
}

async function nativeFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<{ status: number; data: any; headers: Record<string, string> }> {
  const response = await CapacitorHttp.request({
    url,
    method: options.method || 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
    data: options.body ? JSON.parse(options.body) : undefined,
    webFetchExtra: {
      credentials: 'include',
    },
  });
  
  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
  };
}

/**
 * Universal fetch that works on both web and native platforms.
 * Use this for external API calls (Mapbox, etc.) that don't go through our backend.
 * 
 * When CapacitorHttp is enabled in capacitor.config.ts, Capacitor automatically
 * intercepts all fetch() calls and routes them through the native HTTP plugin,
 * which bypasses CORS restrictions.
 */
export async function universalFetch(url: string): Promise<any> {
  const isNative = isNativePlatform();
  const platform = Capacitor.getPlatform();
  console.log('[universalFetch] URL:', url.substring(0, 100), 'isNative:', isNative, 'platform:', platform);
  
  // On iOS, use CapacitorHttp directly (fetch interception may not work reliably)
  if (isNative && platform === 'ios') {
    console.log('[universalFetch] Using CapacitorHttp directly for iOS');
    try {
      const response = await CapacitorHttp.get({
        url,
        headers: { 'Accept': 'application/json' },
      });
      console.log('[universalFetch] iOS CapacitorHttp status:', response.status);
      
      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error('[universalFetch] iOS JSON parse error:', e);
        }
      }
      console.log('[universalFetch] iOS data received, hasFeatures:', !!(data && data.features));
      return data;
    } catch (error) {
      console.error('[universalFetch] iOS CapacitorHttp error:', error);
      throw error;
    }
  }
  
  try {
    // On Android with CapacitorHttp enabled, fetch() is automatically intercepted
    // On web, use standard fetch
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    console.log('[universalFetch] Response status:', response.status, 'ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[universalFetch] Data received, hasFeatures:', !!(data && data.features));
    return data;
  } catch (error) {
    console.error('[universalFetch] Fetch error:', error);
    
    // Fallback: try using CapacitorHttp directly if fetch fails on native Android
    if (isNative && platform === 'android') {
      console.log('[universalFetch] Trying CapacitorHttp fallback for Android...');
      try {
        const response = await CapacitorHttp.get({
          url,
          headers: { 'Accept': 'application/json' },
        });
        console.log('[universalFetch] Android CapacitorHttp fallback status:', response.status);
        
        let data = response.data;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        return data;
      } catch (fallbackError) {
        console.error('[universalFetch] Android CapacitorHttp fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = getApiUrl(url);
  
  if (isNativePlatform()) {
    const response = await nativeFetch(fullUrl, {
      method,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (response.status < 200 || response.status >= 300) {
      const errorText = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);
      throw new Error(`${response.status}: ${errorText}`);
    }
    
    const responseBody = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data);
    
    return new Response(responseBody, {
      status: response.status,
      headers: response.headers,
    });
  }
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  if (queryKey.length === 0) {
    throw new Error('QueryKey cannot be empty');
  }
  
  const basePath = String(queryKey[0]);
  
  if (queryKey.length === 1) {
    return basePath;
  }
  
  const pathSegments: string[] = [basePath];
  const searchParams = new URLSearchParams();
  
  for (let i = 1; i < queryKey.length; i++) {
    const segment = queryKey[i];
    
    if (segment && typeof segment === 'object' && !Array.isArray(segment)) {
      for (const [key, value] of Object.entries(segment as Record<string, unknown>)) {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      }
    } else if (segment !== undefined && segment !== null && segment !== '') {
      pathSegments.push(String(segment));
    }
  }
  
  const path = pathSegments.join('/').replace(/\/+/g, '/');
  const queryString = searchParams.toString();
  
  return queryString ? `${path}?${queryString}` : path;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = buildUrlFromQueryKey(queryKey);
    const fullUrl = getApiUrl(path);
    
    if (isNativePlatform()) {
      const response = await nativeFetch(fullUrl);
      
      if (unauthorizedBehavior === "returnNull" && response.status === 401) {
        return null;
      }
      
      if (response.status < 200 || response.status >= 300) {
        const errorText = typeof response.data === 'string' 
          ? response.data 
          : JSON.stringify(response.data);
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.data;
    }
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: 'always',
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
