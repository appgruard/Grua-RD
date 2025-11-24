const VERSION = '4.0';
const STATIC_CACHE = `gruard-static-v${VERSION}`;
const DYNAMIC_CACHE = `gruard-dynamic-v${VERSION}`;
const RUNTIME_CACHE = `gruard-runtime-v${VERSION}`;

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
            cacheName !== RUNTIME_CACHE
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
