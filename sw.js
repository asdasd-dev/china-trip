const VERSION = '3.26';
const CACHE = 'china-trip-' + VERSION;
const MODEL_CACHE = 'china-trip-models'; // персистентный, не удаляется при обновлениях

// Только локальные файлы — CDN кэшируется через fetch handler при первом обращении
const PRECACHE = [
    './',
    './plan.md',
    './checklist.md',
    './budget.md',
    './info.md',
    './places.md',
    './manifest.json',
    './js/phrasebook.js',
    './js/search.js',
    './js/app.js',
];

self.addEventListener('message', e => {
    if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', e => {
    // cache: 'reload' — обходим HTTP-кэш браузера, берём свежие файлы прямо с CDN.
    // skipWaiting() — активируемся сразу после установки, без ожидания пользователя.
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            // MODEL_CACHE не трогаем — модель живёт независимо от версии приложения
            .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== MODEL_CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Не кэшируем Firebase, version.txt (нужен свежим для проверки обновлений) и не-GET запросы
    if (url.hostname.includes('firebasedatabase') || url.pathname.endsWith('version.txt') || e.request.method !== 'GET') return;

    // Запросы к HuggingFace (файлы модели) → кэшируем в отдельный MODEL_CACHE
    // Кэш персистентный: переживает обновления приложения, не чистится hardReload
    // До поездки в Китай модель качается с HF и оседает в кэше, в Китае SW отдаёт из кэша
    if (url.hostname.includes('huggingface.co')) {
        e.respondWith(
            caches.open(MODEL_CACHE).then(cache =>
                cache.match(e.request).then(cached => {
                    if (cached) return cached;
                    return fetch(e.request).then(r => {
                        if (r.ok) cache.put(e.request, r.clone());
                        return r;
                    });
                })
            )
        );
        return;
    }

    // Остальное — stale-while-revalidate в основной кэш
    e.respondWith(
        caches.open(CACHE).then(cache =>
            cache.match(e.request).then(cached => {
                const networkFetch = fetch(e.request).then(r => {
                    if (r.ok) cache.put(e.request, r.clone());
                    return r;
                });
                if (cached) {
                    networkFetch.catch(() => {});
                    return cached;
                }
                return networkFetch;
            })
        )
    );
});
