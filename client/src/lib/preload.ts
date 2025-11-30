import { queryClient } from './queryClient';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const preloadedModules = new Set<string>();
const addedPreconnects = new Set<string>();
const prefetchedData = new Set<string>();

type IdleCallbackFn = (callback: () => void, options?: { timeout: number }) => void;

const scheduleIdleTask: IdleCallbackFn = (callback, options) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: IdleCallbackFn }).requestIdleCallback(callback, options);
  } else {
    setTimeout(callback, options?.timeout ? Math.min(options.timeout / 10, 100) : 100);
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

export function preloadMapboxResources() {
  if (!MAPBOX_TOKEN) return;
  
  addPreconnect('https://api.mapbox.com');
  addPreconnect('https://tiles.mapbox.com');
  addPreconnect('https://events.mapbox.com');

  const styleUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${MAPBOX_TOKEN}`;
  fetch(styleUrl, { method: 'GET', mode: 'cors' }).catch(() => {});
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
  const driverModules = [
    () => import('@/pages/driver/dashboard'),
    () => import('@/pages/driver/profile'),
  ];

  driverModules.forEach((loadModule, index) => {
    const key = `driver_${index}`;
    if (!preloadedModules.has(key)) {
      preloadedModules.add(key);
      scheduleIdleTask(() => {
        loadModule().catch(() => {});
      }, { timeout: 3000 });
    }
  });
}

export function prefetchUserData() {
  const endpoints = [
    '/api/services/my-services',
    '/api/auth/me',
  ];

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

export function initializePreloading() {
  if (typeof window === 'undefined') return;

  preloadMapboxResources();

  scheduleIdleTask(() => {
    preloadCriticalModules();
  }, { timeout: 1000 });

  scheduleIdleTask(() => {
    prefetchUserData();
  }, { timeout: 1500 });
}
