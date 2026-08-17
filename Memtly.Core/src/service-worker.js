import { flushQueue } from '@modules/upload-queue/flush';
import { SHELL_CACHE_NAME as CACHE_NAME } from '@modules/offline-shell';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'memtly-upload-queue-flush') {
        event.waitUntil(flushQueue());
    }
});

function isGalleryNavigation(request) {
    return request.mode === 'navigate' && new URL(request.url).pathname.toLowerCase().startsWith('/gallery');
}

function isDistAsset(request) {
    return new URL(request.url).pathname.startsWith('/_content/Memtly.Core/dist/');
}

function isTranslationsRequest(request) {
    return new URL(request.url).pathname === '/Language/GetTranslations';
}

async function networkFirstWithCacheFallback(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);

        // fetch() only rejects on genuine network failures - an HTTP error
        // response (e.g. a Cloudflare Tunnel 530 "origin unreachable" page)
        // resolves normally with response.ok === false. Treat that the same
        // as a network failure so we fall back to cache instead of handing
        // an intermediary's error page back as if it were real content.
        if (!response.ok) {
            throw new Error(`Non-ok response (${response.status}) for ${request.url}`);
        }

        cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    if (isGalleryNavigation(request) || isDistAsset(request) || isTranslationsRequest(request)) {
        event.respondWith(networkFirstWithCacheFallback(request));
    }
});
