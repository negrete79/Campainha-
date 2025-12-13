const CACHE_NAME = 'doorvi-v2';
const RUNTIME_CACHE = 'doorvi-runtime';

// Arquivos essenciais para cache
const urlsToCache = [
    '/',
    '/index.html',
    '/morador.html',
    '/visitante.html',
    '/manifest.json',
    'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js',
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cache aberto');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[SW] Todos os recursos foram cacheados');
                // Forçar ativação do novo SW
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Erro ao cachear recursos:', error);
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando Service Worker...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[SW] Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Service Worker ativado');
            // Tomar controle de todas as páginas abertas
            return self.clients.claim();
        })
    );
});

// Estratégia de cache: Stale-While-Revalidate
const staleWhileRevalidate = (request) => {
    return caches.open(RUNTIME_CACHE).then(async (cache) => {
        // Tentar obter do cache primeiro
        const cachedResponse = await cache.match(request);
        
        // Fazer requisição de rede em paralelo
        const fetchPromise = fetch(request).then((networkResponse) => {
            // Atualizar cache com resposta mais recente
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        }).catch(() => {
            // Se falhar, retornar resposta do cache se existir
            return cachedResponse;
        });
        
        // Retornar resposta do cache imediatamente, depois atualizar
        return cachedResponse || fetchPromise;
    });
};

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requisições para APIs externas (como PeerJS)
    if (url.origin !== self.location.origin) {
        // Para PeerJS e outras APIs, tentar rede primeiro
        if (request.url.includes('peerjs') || request.url.includes('qrcodejs')) {
            event.respondWith(
                caches.match(request).then((cached) => {
                    return cached || fetch(request);
                })
            );
            return;
        }
        
        // Para outras requisições externas, deixar passar
        return;
    }
    
    // Para requisições de navegação, usar stale-while-revalidate
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                // Sempre tentar buscar a versão mais recente
                const networkFetch = fetch(request).then((response) => {
                    // Cache da nova versão
                    if (response.ok) {
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, response.clone());
                            return response;
                        });
                    }
                    return response;
                }).catch(() => {
                    // Se falhar, usar versão cacheada
                    return cachedResponse;
                });
                
                // Retornar versão cacheada imediatamente
                return cachedResponse || networkFetch;
            })
        );
        return;
    }
    
    // Para outros recursos (CSS, JS, imagens)
    event.respondWith(staleWhileRevalidate(request));
});

// Sincronização em background
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('[SW] Sincronização em background');
        event.waitUntil(
            // Lógica de sincronização aqui
            Promise.resolve()
        );
    }
});

// Notificações push melhoradas
self.addEventListener('push', (event) => {
    console.log('[SW] Notificação push recebida');
    
    let notificationData = {
        title: 'Doorvi - Nova Chamada',
        body: 'Alguém está chamando na sua porta!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        vibrate: [200, 100, 200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'accept',
                title: 'Atender',
                icon: '/icons/icon-96x96.png'
            },
            {
                action: 'reject',
                title: 'Recusar',
                icon: '/icons/icon-96x96.png'
            }
        ],
        requireInteraction: true,
        silent: false
    };
    
    // Se houver dados na notificação
    if (event.data) {
        try {
            const payload = event.data.json();
            notificationData = { ...notificationData, ...payload };
            
            // Personalizar com nome do visitante se disponível
            if (payload.visitorName) {
                notificationData.body = `${payload.visitorName} está na sua porta!`;
            }
        } catch (e) {
            console.error('[SW] Erro ao parsear dados da notificação:', e);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, notificationData)
    );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notificação clicada:', event.action);
    
    event.notification.close();
    
    let urlToOpen = '/morador.html';
    
    // Ações baseadas no clique
    if (event.action === 'accept') {
        console.log('[SW] Ação: Aceitar chamada');
        urlToOpen = '/morador.html';
    } else if (event.action === 'reject') {
        console.log('[SW] Ação: Recusar chamada');
        urlToOpen = '/morador.html';
    } else {
        // Clique padrão na notificação
        console.log('[SW] Clique padrão na notificação');
        urlToOpen = '/morador.html';
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // Se já tiver uma janela aberta, focar nela
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // Se não, abrir nova janela
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Fechamento de notificação
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notificação fechada:', event.notification);
});

// Tratamento de mensagens
self.addEventListener('message', (event) => {
    console.log('[SW] Mensagem recebida:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Limpeza de cache periódica
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'cache-cleanup') {
        event.waitUntil(
            caches.open(RUNTIME_CACHE).then((cache) => {
                // Limpar itens antigos do cache runtime
                return cache.keys().then((requests) => {
                    // Implementar lógica de limpeza se necessário
                    console.log('[SW] Limpeza periódica do cache');
                });
            })
        );
    }
});
