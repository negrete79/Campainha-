const CACHE_NAME = 'doorvi-cache-v1';
const urlsToCache = [
  './',
  './morador.html',
  './visitante.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
];

// Instalação do service worker e cache dos arquivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptação de requisições para servir do cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Atualização do cache
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Manipulação de notificações
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'accept') {
    // Enviar mensagem para a página do morador para aceitar a chamada
    event.waitUntil(
      clients.matchAll({type: 'window'})
        .then(windowClients => {
          for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.includes('morador.html') && 'focus' in client) {
              return client.focus()
                .then(client => {
                  // Enviar mensagem para aceitar a chamada
                  client.postMessage({type: 'NOTIFICATION_ACTION', action: 'accept'});
                });
            }
          }
          if (clients.openWindow) {
            return clients.openWindow('./morador.html');
          }
        })
    );
  } else if (event.action === 'reject') {
    // Enviar mensagem para a página do morador para rejeitar a chamada
    event.waitUntil(
      clients.matchAll({type: 'window'})
        .then(windowClients => {
          for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.includes('morador.html') && 'focus' in client) {
              return client.focus()
                .then(client => {
                  // Enviar mensagem para rejeitar a chamada
                  client.postMessage({type: 'NOTIFICATION_ACTION', action: 'reject'});
                });
            }
          }
        })
    );
  }
});

// Manipulação de mensagens
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
