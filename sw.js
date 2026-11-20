/**
 * RÁDIO VOX ARIEH - SERVICE WORKER (PWA)
 * Atualizações Instantâneas (Network-First) & Suporte a Execução Contínua
 */

const CACHE_NAME = 'vox-arieh-cache-v9.0';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css?v=9.0',
  './app.js?v=9.0',
  './config.js?v=9.0',
  './manifest.json',
  './assets/lion_logo.jpg',
  './assets/biblia_aberta.jpg',
  './assets/estudando_palavra_intro.mp3',
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
            console.log('[SW] Purgando cache antigo:', name);
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

  // Estratégia Network-First para todos os arquivos: Sempre busca o mais recente do servidor
  // Se a rede estiver offline, utiliza o cache local do PWA com segurança
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
