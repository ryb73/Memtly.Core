// Bump this whenever primeShellCache()'s asset-collection logic or the
// service worker's fetch handling changes in a way that makes previously
// cached shell entries wrong/incomplete - activate() only evicts caches
// under a *different* name, so a stale entry under an unchanged name
// otherwise lingers until something happens to overwrite that exact URL.
export const SHELL_CACHE_NAME = "memtly-shell-v5";

// The service worker's fetch handler only caches a navigation once it is
// active and *controlling* the page, which is never true for the very first
// visit (the SW installs after the HTML has already loaded). Priming the
// cache directly from page JS on every gallery page load means a single
// online visit is enough for that gallery to be reopenable offline later,
// rather than requiring a second visit/reload first.
export async function primeShellCache() {
  console.info(`primeShellCache`);
  if (!("caches" in window)) return;

  const path = window.location.pathname.toLowerCase();
  if (!path.startsWith("/gallery")) return;

  try {
    const cache = await caches.open(SHELL_CACHE_NAME);

    const assetUrls = [
      ...document.querySelectorAll('script[src], link[rel="stylesheet"][href]'),
    ]
      .map((el) => el.src || el.href)
      .filter((url) => url && url.includes("/_content/Memtly.Core/dist/"));

    console.info(`primeShellCache: caching urls`, assetUrls);

    await cache.add(window.location.href);
    await Promise.all(assetUrls.map((url) => cache.add(url).catch(() => {})));
  } catch (error) {
    console.warn("Failed to prime offline shell cache", error);
  }
}
