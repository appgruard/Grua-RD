const VERSION = '6.0';
const STATIC_CACHE = `gruard-static-v${VERSION}`;
const DYNAMIC_CACHE = `gruard-dynamic-v${VERSION}`;
const RUNTIME_CACHE = `gruard-runtime-v${VERSION}`;
const ASSETS_CACHE = `gruard-assets-v${VERSION}`;

const CACHE_DURATION = {
  static: 30 * 24 * 60 * 60 * 1000,
  dynamic: 7 * 24 * 60 * 60 * 1000,
  runtime: 24 * 60 * 60 * 1000
};

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE && 
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== RUNTIME_CACHE &&
            cacheName !== ASSETS_CACHE
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activated version', VERSION);
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) {
    return;
  }

  // Stale-while-revalidate strategy for JS/CSS assets (build chunks)
  if (url.origin === location.origin && 
      (request.destination === 'script' || request.destination === 'style') &&
      (url.pathname.includes('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Always fetch in background to revalidate
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          // Return cached response immediately if available, network fetch happens in background
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Cache-first for font files (self-hosted)
  if (url.origin === location.origin && request.destination === 'font') {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  if (url.hostname === 'maps.googleapis.com' || url.hostname === 'maps.gstatic.com') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            const cacheDate = new Date(cachedResponse.headers.get('date') || 0);
            const now = new Date();
            const age = now - cacheDate;
            
            if (age < CACHE_DURATION.runtime) {
              return cachedResponse;
            }
          }

          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            return cachedResponse || new Response('Offline', { status: 503 });
          });
        });
      })
    );
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          return cachedResponse || fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        const cacheDate = new Date(cachedResponse.headers.get('date') || 0);
        const now = new Date();
        const age = now - cacheDate;
        
        if (age < CACHE_DURATION.dynamic) {
          return cachedResponse;
        }
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const shouldCache = 
          url.origin === location.origin &&
          (request.destination === 'script' || 
           request.destination === 'style' ||
           request.destination === 'image' ||
           request.destination === 'font' ||
           request.destination === 'document');

        if (shouldCache) {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return response;
      }).catch(() => {
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Offline', 
            message: 'No hay conexión a internet. Por favor, intenta de nuevo más tarde.' 
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'application/json' })
          }
        );
      });
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: data.data || {},
    tag: data.tag || 'default',
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const data = event.notification.data || {};
      
      let urlToOpen = '/';
      if (data.type === 'service_accepted' || data.type === 'service_started' || data.type === 'service_completed') {
        urlToOpen = `/client/tracking/${data.servicioId}`;
      } else if (data.type === 'new_request') {
        urlToOpen = '/driver/dashboard';
      } else if (data.type === 'new_message') {
        urlToOpen = '/';
      }

      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

const SYNC_QUEUE_KEY = 'gruard-sync-queue';

async function getQueuedRequests() {
  try {
    const cache = await caches.open('gruard-sync');
    const response = await cache.match(SYNC_QUEUE_KEY);
    if (response) {
      return await response.json();
    }
  } catch (e) {
    console.error('[SW] Error getting queued requests:', e);
  }
  return [];
}

async function saveQueuedRequests(requests) {
  try {
    const cache = await caches.open('gruard-sync');
    const response = new Response(JSON.stringify(requests));
    await cache.put(SYNC_QUEUE_KEY, response);
  } catch (e) {
    console.error('[SW] Error saving queued requests:', e);
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-requests') {
    event.waitUntil(processPendingRequests());
  }
});

async function processPendingRequests() {
  const requests = await getQueuedRequests();
  const successfulIds = [];

  for (const request of requests) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        credentials: 'include'
      });

      if (response.ok || response.status === 400) {
        successfulIds.push(request.id);
      }
    } catch (e) {
      console.log('[SW] Request still failing, will retry:', request.url);
    }
  }

  if (successfulIds.length > 0) {
    const remaining = requests.filter(r => !successfulIds.includes(r.id));
    await saveQueuedRequests(remaining);
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'QUEUE_REQUEST') {
    event.waitUntil(
      (async () => {
        const requests = await getQueuedRequests();
        requests.push({
          id: Date.now().toString(),
          url: event.data.request.url,
          method: event.data.request.method,
          headers: event.data.request.headers,
          body: event.data.request.body,
          timestamp: Date.now()
        });
        await saveQueuedRequests(requests);

        if ('sync' in self.registration) {
          try {
            await self.registration.sync.register('sync-pending-requests');
          } catch (e) {
            console.log('[SW] Background sync not available');
          }
        }
      })()
    );
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});
