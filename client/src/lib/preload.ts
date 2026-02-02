import { queryClient } from './queryClient';
import { fetchMapboxToken } from '@/hooks/use-public-config';

const VITE_MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const preloadedModules = new Set<string>();
const addedPreconnects = new Set<string>();
const prefetchedData = new Set<string>();
let mapboxModulePromise: Promise<any> | null = null;

type IdleCallbackFn = (callback: () => void, options?: { timeout: number }) => void;

const scheduleIdleTask: IdleCallbackFn = (callback, options) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: IdleCallbackFn }).requestIdleCallback(callback, options);
  } else {
    setTimeout(callback, options?.timeout ? Math.min(options.timeout / 10, 100) : 100);
  }
};

// High priority immediate execution for critical resources
const scheduleImmediateTask = (callback: () => void) => {
  if (typeof queueMicrotask !== 'undefined') {
    queueMicrotask(callback);
  } else {
    Promise.resolve().then(callback);
  }
};

function addPreconnect(href: string) {
  if (addedPreconnects.has(href)) return;
  addedPreconnects.add(href);
  
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  document.head.appendChild(link);
}

// Add DNS prefetch for even faster initial connection
function addDnsPrefetch(href: string) {
  const key = `dns_${href}`;
  if (addedPreconnects.has(key)) return;
  addedPreconnects.add(key);
  
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = href;
  document.head.appendChild(link);
}

export async function preloadMapboxResources() {
  // Add DNS prefetch and preconnect first (doesn't need token)
  addDnsPrefetch('https://api.mapbox.com');
  addDnsPrefetch('https://tiles.mapbox.com');
  addPreconnect('https://api.mapbox.com');
  addPreconnect('https://tiles.mapbox.com');
  addPreconnect('https://events.mapbox.com');

  // Fetch token and prefetch style JSON for faster map initialization
  const token = VITE_MAPBOX_TOKEN || await fetchMapboxToken();
  if (token) {
    const styleUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${token}`;
    fetch(styleUrl, { method: 'GET', mode: 'cors', priority: 'high' as any }).catch(() => {});
  }
}

// Preload the Mapbox module immediately (high priority)
export function preloadMapboxModule() {
  if (!mapboxModulePromise && !preloadedModules.has('mapbox_module')) {
    preloadedModules.add('mapbox_module');
    mapboxModulePromise = import('@/components/maps/MapboxMap').catch(() => null);
  }
  return mapboxModulePromise;
}

export function preloadCriticalModules() {
  const criticalModules = [
    () => import('@/pages/client/home'),
    () => import('@/pages/auth/login'),
    () => import('@/components/maps/MapboxMap'),
    () => import('@/components/ServiceCategorySelector'),
    () => import('@/components/ServiceSubtypeSelector'),
  ];

  criticalModules.forEach((loadModule, index) => {
    const key = `module_${index}`;
    if (!preloadedModules.has(key)) {
      preloadedModules.add(key);
      scheduleIdleTask(() => {
        loadModule().catch(() => {});
      }, { timeout: 2000 });
    }
  });
}

export function preloadDriverModules() {
  // Immediately start loading the MapboxMap module (critical for dashboard)
  preloadMapboxModule();
  
  const driverModules = [
    () => import('@/pages/driver/dashboard'),
    () => import('@/pages/driver/profile'),
  ];

  // Load driver modules immediately without waiting for idle
  driverModules.forEach((loadModule, index) => {
    const key = `driver_${index}`;
    if (!preloadedModules.has(key)) {
      preloadedModules.add(key);
      // Use immediate scheduling for faster loading
      scheduleImmediateTask(() => {
        loadModule().catch(() => {});
      });
    }
  });
}

export function prefetchDriverData() {
  // Only prefetch the consolidated init endpoint - it contains all needed data
  const driverEndpoints = [
    '/api/drivers/init',
  ];

  driverEndpoints.forEach((endpoint) => {
    if (!prefetchedData.has(endpoint)) {
      prefetchedData.add(endpoint);
      queryClient.prefetchQuery({
        queryKey: [endpoint],
        staleTime: 1000 * 30, // 30 seconds - matches dashboard query
      }).catch(() => {});
    }
  });
}

export function preloadDriverResourcesOnLogin() {
  // Execute all preloading immediately in parallel
  preloadMapboxResources();
  preloadMapboxModule();
  preloadDriverModules();
  prefetchDriverData();
}

export function prefetchUserData(userType?: 'cliente' | 'conductor' | 'admin' | 'empresa') {
  const endpoints = ['/api/auth/me'];
  
  // Only prefetch driver data if user is a driver
  if (userType === 'conductor') {
    endpoints.push('/api/drivers/me');
  }

  endpoints.forEach((endpoint) => {
    if (!prefetchedData.has(endpoint)) {
      prefetchedData.add(endpoint);
      queryClient.prefetchQuery({
        queryKey: [endpoint],
        staleTime: 1000 * 60 * 5,
      }).catch(() => {});
    }
  });
}

export function preloadAdminModules() {
  const adminModules = [
    () => import('@/pages/admin/dashboard'),
    () => import('@/pages/admin/analytics'),
  ];

  adminModules.forEach((loadModule, index) => {
    const key = `admin_${index}`;
    if (!preloadedModules.has(key)) {
      preloadedModules.add(key);
      scheduleIdleTask(() => {
        loadModule().catch(() => {});
      }, { timeout: 1000 });
    }
  });
}

export function preloadClientModules() {
  preloadMapboxModule();
  
  const clientModules = [
    () => import('@/pages/client/home'),
    () => import('@/pages/client/tracking'),
    () => import('@/components/ServiceCategorySelector'),
  ];

  clientModules.forEach((loadModule, index) => {
    const key = `client_${index}`;
    if (!preloadedModules.has(key)) {
      preloadedModules.add(key);
      scheduleIdleTask(() => {
        loadModule().catch(() => {});
      }, { timeout: 1000 });
    }
  });
}

export function preloadSocioModules() {
  const socioModules = [
    () => import('@/pages/socio/dashboard'),
  ];

  socioModules.forEach((loadModule, index) => {
    const key = `socio_${index}`;
    if (!preloadedModules.has(key)) {
      preloadedModules.add(key);
      scheduleIdleTask(() => {
        loadModule().catch(() => {});
      }, { timeout: 1000 });
    }
  });
}

export function preloadByUserType(userType: string) {
  const moduleLoaders: Record<string, () => void> = {
    cliente: () => {
      preloadMapboxResources();
      preloadClientModules();
    },
    conductor: () => {
      preloadMapboxResources();
      preloadDriverModules();
      prefetchDriverData();
    },
    admin: () => {
      preloadAdminModules();
    },
    socio: () => {
      preloadSocioModules();
    },
  };

  const loader = moduleLoaders[userType];
  if (loader) {
    loader();
  }

  // Store user type for next session preload hint
  try {
    localStorage.setItem('lastUserType', userType);
  } catch {
    // Ignore localStorage errors
  }
}

export function preloadFromLastSession() {
  try {
    const lastUserType = localStorage.getItem('lastUserType');
    if (lastUserType) {
      scheduleIdleTask(() => {
        preloadByUserType(lastUserType);
      }, { timeout: 2000 });
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function initializePreloading() {
  if (typeof window === 'undefined') return;

  // Start Mapbox preconnections immediately
  preloadMapboxResources();

  // Preload based on last session if available
  preloadFromLastSession();

  scheduleIdleTask(() => {
    preloadCriticalModules();
  }, { timeout: 1000 });

  scheduleIdleTask(() => {
    // Get user type from localStorage to prefetch appropriate data
    try {
      const lastUserType = localStorage.getItem('lastUserType') as 'cliente' | 'conductor' | 'admin' | 'empresa' | null;
      prefetchUserData(lastUserType || undefined);
    } catch {
      prefetchUserData();
    }
  }, { timeout: 1500 });
}
