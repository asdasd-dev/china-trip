const VERSION = '20260422-2242';
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
];

// Файлы модели на GitHub Releases (доступен в Китае, в отличие от HuggingFace)
const MODEL_RELEASE = 'https://github.com/asdasd-dev/china-trip/releases/download/model-v1/';

// Маппинг: transformers.js просит huggingface.co → мы отдаём с GitHub
function toGithubUrl(hfUrl) {
    const filename = hfUrl.pathname.split('/').pop();
    return MODEL_RELEASE + filename;
}

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(PRECACHE))
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

    // Не кэшируем Firebase, version.txt и не-GET запросы
    if (url.hostname.includes('firebasedatabase') || url.pathname.endsWith('version.txt') || e.request.method !== 'GET') return;

    // Запросы к HuggingFace → перехватываем, кэшируем в MODEL_CACHE
    // transformers.js обращается к hf за файлами модели — редиректим на GitHub
    if (url.hostname.includes('huggingface.co')) {
        e.respondWith(
            caches.open(MODEL_CACHE).then(cache =>
                cache.match(e.request).then(cached => {
                    if (cached) return cached;
                    const githubUrl = toGithubUrl(url);
                    return fetch(githubUrl).then(r => {
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
