const CACHE_NAME = 'ai-tutor-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/pustakam-logo.png',
  '/manifest.json'
  // Removed references to non-existent files
];

// Install event - cache resources with error handling
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return Promise.resolve(); // Continue even if one fails
            })
          )
        );
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Skip external API requests and chrome extensions
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    event.request.url.includes('googleapis.com') || 
    event.request.url.includes('bigmodel.cn') ||
    event.request.url.includes('api.mistral.ai') ||
    event.request.url.includes('chrome-extension')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        
        return fetch(event.request).then(fetchResponse => {
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }

          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache).catch(err => {
              console.warn('Failed to cache:', event.request.url, err);
            });
          });

          return fetchResponse;
        });
      })
      .catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});
