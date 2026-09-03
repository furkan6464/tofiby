const CACHE = "tofiby-v2";
const PRECACHE = ["/", "/anasayfa", "/takvim", "/hedeflerim", "/gorevler", "/analiz", "/ayarlar"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => cached);
      return cached || networked;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "notify") {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: "/icon-192.png",
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/anasayfa"));
});
