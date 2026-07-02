/* Service Worker per "1000 Finestre"
   - Robusto: un file mancante NON blocca l'installazione.
   - Navigazione "prima la rete" (così gli aggiornamenti si vedono subito),
     con fallback alla cache quando si è offline.
   NOTA: se aggiorni index.html, cambia la versione qui sotto (v2 -> v3)
   per forzare il refresh della cache. */
const CACHE = "finestre-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // aggiungi singolarmente: se un file manca, l'installazione continua lo stesso
    await Promise.all(ASSETS.map((u) => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // La pagina stessa: prima la rete, poi la cache (evita pagine "vuote" bloccate)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { caches.open(CACHE).then((c) => c.put(req, r.clone())).catch(() => {}); return r; })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Altri file: prima la cache, poi la rete
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => cached)
    )
  );
});
