const CACHE = "self-care-cards-v18";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./cards.json", "./source-decks.json", "./icon.svg"];
const APP_ROOT = new URL("./", self.location.href);
const DATA_FILES = new Set(["cards.json", "source-decks.json"]);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("self-care-cards-") && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
    // Claim existing app windows without forcing a navigation/reload.
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || !requestUrl.pathname.startsWith(APP_ROOT.pathname)) return;

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const freshUrl = new URL(event.request.url);
        freshUrl.searchParams.set("__pwa_refresh", CACHE);
        const response = await fetch(freshUrl.href, { cache: "no-cache" });
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(new URL("./index.html", self.location.href).href, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE);
        return await cache.match(event.request) || await cache.match(new URL("./index.html", self.location.href).href);
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      const fileName = requestUrl.pathname.split("/").pop();
      if (DATA_FILES.has(fileName)) {
        return new Response(JSON.stringify({ error: "offline_data_unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }

      const fallback = await cache.match(new URL("./index.html", self.location.href).href);
      if (fallback) return fallback;
      throw error;
    }
  })());
});
