const CACHE_NAME = 'doorvi-cache-v1';
const urlsToCache = [
  '/', '/index.html', '/morador.html', '/visitante.html', '/qr-impressao.html', '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(cacheNames => {
    return Promise.all(cacheNames.map(cacheName => {
      if (cacheName !== CACHE_NAME) { return caches.delete(cacheName); }
    }));
  }));
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => {
    return response || fetch(event.request);
  }));
});

self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Alguém está na sua porta!',
    icon: 'icons/icon-192x192.png', badge: 'icons/badge-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    data: { dateOfArrival: Date.now(), primaryKey: 1 },
    actions: [{ action: 'accept', title: 'Atender' }, { action: 'reject', title: 'Recusar' }]
  };
  event.waitUntil(self.registration.showNotification('Doorvi - Chamada Recebida', options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'accept' || !event.action) {
    event.waitUntil(clients.openWindow('/'));
  }
});
