import { flushQueue } from "@modules/upload-queue/flush";
import { SHELL_CACHE_NAME as CACHE_NAME } from "@modules/offline-shell";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "memtly-upload-queue-flush") {
    event.waitUntil(flushQueue());
  }
});

function isGalleryNavigation(request) {
  return (
    request.mode === "navigate" &&
    new URL(request.url).pathname.toLowerCase().startsWith("/gallery")
  );
}

function isDistAsset(request) {
  return new URL(request.url).pathname.startsWith(
    "/_content/Memtly.Core/dist/",
  );
}

function isTranslationsRequest(request) {
  return new URL(request.url).pathname === "/Language/GetTranslations";
}

const NETWORK_TIMEOUT_MS = 5000;

async function networkFirstWithCacheFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  const $cachedResponse = cache.match(request);

  const networkFetch = fetch(request).then((response) => {
    // fetch() only rejects on genuine network failures - an HTTP error
    // response (e.g. a Cloudflare Tunnel 530 "origin unreachable" page)
    // resolves normally with response.ok === false. Treat that the same
    // as a network failure so we fall back to cache instead of handing
    // an intermediary's error page back as if it were real content.
    if (!response.ok) {
      throw new Error(
        `Non-ok response (${response.status}) for ${request.url}`,
      );
    }

    cache.put(request, response.clone());
    return response;
  });

  const cachedResponse = await $cachedResponse;
  if (!cachedResponse) {
    return networkFetch;
  }

  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(cachedResponse), NETWORK_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([networkFetch, timeout]);
    clearTimeout(timeoutId);
    // If the timeout won the race, let the network call keep running in
    // the background (to refresh the cache) without an unhandled rejection.
    networkFetch.catch(() => {});
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    return cachedResponse;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (
    isGalleryNavigation(request) ||
    isDistAsset(request) ||
    isTranslationsRequest(request)
  ) {
    event.respondWith(networkFirstWithCacheFallback(request));
  }
});
