import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Get API base URL from environment or use relative path for same-origin requests
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Helper to construct full URL for API requests
function getApiUrl(path: string): string {
  if (API_BASE_URL) {
    // For mobile apps connecting to remote server
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  }
  // For web app on same origin
  return path;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = getApiUrl(url);
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: API_BASE_URL ? "include" : "include",
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
      staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - keep unused data in cache (previously cacheTime)
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch if data exists and not stale
      refetchOnReconnect: 'always', // Always refetch when connection restored
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
