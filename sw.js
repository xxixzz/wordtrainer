/* EnglishTrainer Service Worker
   Снижает нагрузку на сервер и даёт офлайн-работу:
   - статика (css/js/данные) — cache-first (повторные визиты не бьют по серверу);
   - HTML — network-first (всегда свежая оболочка, с откатом в кэш офлайн).
   При обновлении файлов поднимите версию CACHE, чтобы старый кэш очистился. */
var CACHE = "EnglishTrainer-v2";
var ASSETS = [
  "./", "./ru/", "./en/", "./ru/about/", "./en/about/",
  "./css/style.css", "./js/app.js", "./js/theme.js",
  "./data/a1.js", "./data/a2.js", "./data/b1.js", "./data/b2.js", "./data/c1.js",
  "./manifest.json"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS).catch(function () {}); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var accept = req.headers.get("accept") || "";
  var isHTML = req.mode === "navigate" || accept.indexOf("text/html") !== -1;

  if (isHTML) {
    // network-first: свежая страница онлайн, кэш — офлайн
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match("./ru/"); });
      })
    );
  } else {
    // cache-first: статика отдаётся из кэша, мимо сервера
    e.respondWith(
      caches.match(req).then(function (cached) {
        return cached || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        });
      })
    );
  }
});
