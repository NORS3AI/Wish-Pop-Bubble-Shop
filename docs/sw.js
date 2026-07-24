/* Wish Pop service worker.
   Purpose: make the game installable ("Add to Home Screen") and keep it working
   offline. It is network-FIRST — online, you always get the freshest version;
   the cache is only a fallback when there's no connection.

   NOTE: this worker has NO push/notification code, on purpose. Installing the
   game to your home screen will never send you notifications. */
const CACHE = "wishpop-cache-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        // stash a copy for offline use
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
