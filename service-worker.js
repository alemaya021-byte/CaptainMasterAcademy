const CACHE_NAME = "captain-master-academy-v2-2-ai-captain-tutor-v1";
const APP_SHELL = [
  "./",
  "index.html",
  "quiz.html",
  "exam.html",
  "flashcards.html",
  "search.html",
  "statistics.html",
  "account.html",
  "css/style.css",
  "js/storage.js",
  "js/adaptiveEngine.js",
  "js/sync.js",
  "js/firebase-config.js",
  "js/firebase-config.example.js",
  "js/syncEngine.js",
  "js/app.js",
  "js/quiz.js",
  "js/exam.js",
  "js/flashcards.js",
  "js/search.js",
  "js/statistics.js",
  "js/account.js",
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
