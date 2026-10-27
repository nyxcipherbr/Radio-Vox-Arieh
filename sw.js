/**
 * RÁDIO VOX ARIEH - SERVICE WORKER (PWA)
 * Cache inteligente do App Shell e suporte a execução contínua
 */

const CACHE_NAME = 'vox-arieh-cache-v6.0';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css?v=6.0',
  './app.js?v=6.0',
  './config.js?v=6.0',
  './manifest.json',
  './assets/lion_logo.jpg',
  './assets/evangelista_alexandra.jpg',
  './assets/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW] Aviso no precache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NUNCA cachear transmissão de áudio ao vivo, requisições de API ou Spotify
  if (
    url.pathname.includes('/listen/') ||
    url.hostname.includes('stream') ||
    url.hostname.includes('spotify') ||
    url.pathname.startsWith('/api/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // data.json: Estratégia Network-First (sempre busca o mais recente do servidor)
  if (url.pathname.endsWith('data.json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Demais arquivos (App Shell): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
