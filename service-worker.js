const CACHE_NAME = "captain-master-academy-deploy-v1";
const APP_SHELL = [
  "./",
  "index.html",
  "quiz.html",
  "exam.html",
  "flashcards.html",
  "statistics.html",
  "css/style.css",
  "js/storage.js",
  "js/sync.js",
  "js/app.js",
  "js/quiz.js",
  "js/exam.js",
  "js/flashcards.js",
  "js/statistics.js",
  "data/questions.json",
  "manifest.json",
  "service-worker.js",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

const INDEX_FALLBACK = "index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" })))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const request = event.request;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match(INDEX_FALLBACK);
          return Response.error();
        })
      )
  );
});
