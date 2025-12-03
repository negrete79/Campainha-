const CACHE_NAME = 'doorvi-cache-v1';
const urlsToCache = [
  '/',
  '/morador.html',
  '/visitante.html',
  '/index.html',
  '/manifest.json',
  'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação do Service Worker
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

// Interceptação de requisições
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

// Manipulação de notificações
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'accept') {
    // Enviar mensagem para a página principal
    self.clients.matchAll({type: 'window'}).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_ACTION',
          action: 'accept'
        });
      });
    });
    
    // Focar na janela se existir
    event.waitUntil(
      clients.openWindow('/morador.html')
    );
  } else if (event.action === 'reject') {
    // Enviar mensagem para a página principal
    self.clients.matchAll({type: 'window'}).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_ACTION',
          action: 'reject'
        });
      });
    });
    
    // Focar na janela se existir
    event.waitUntil(
      clients.openWindow('/morador.html')
    );
  } else {
    // Clique na notificação (não em um botão)
    event.waitUntil(
      clients.openWindow('/morador.html')
    );
  }
});

// Lidar com mensagens da página principal
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SEND_NOTIFICATION') {
    const { title, options } = event.data;
    
    self.registration.showNotification(title, options);
  }
});
