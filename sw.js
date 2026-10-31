/**
 * sw.js — Invitation Video Service Worker
 * ─────────────────────────────────────────
 * Caches the invitation video and key assets so that repeat visitors
 * (forwarded invite links opened a second time) experience INSTANT
 * playback regardless of network conditions.
 *
 * Strategy: Cache-first for video/MP4 assets, Network-first for HTML.
 */

const CACHE_NAME = "invitation-v5";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./story.css",
  "./invitation.js",
  "./story.js",
  "./wedding-data.js",
  "./first-frame.jpg",
  "./final-frame.jpg",
  "./assets/invitation/hand-divine.webp",
  "./assets/invitation/hand-bridal.webp",
  "./assets/invitation/mandala-top-retina_lossless.webp",
  "./assets/invitation/mandala-bot-retina_lossless.webp",
  "./assets/invitation/petals/pink_petal_1.webp",
  "./assets/invitation/petals/pink_petal_2.webp",
  "./assets/invitation/petals/pink_petal_3.webp",
  "./assets/invitation/petals/pink_petal_4.webp",
  "./assets/invitation/petals/pink_petal_5.webp",
];

/* ── Install: pre-cache static assets immediately ── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

/* ── Activate: clean old caches ── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: smart cache strategy ── */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isVideo = /\.mp4$/i.test(url.pathname);
  const isAudio = /\.mp3$/i.test(url.pathname);
  const isMediaAsset = isVideo || isAudio;

  if (isMediaAsset) {
    // Cache-first for video/audio: once cached = always instant
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok && response.status === 200) {
            cache.put(event.request, response.clone()).catch(() => {});
          }
          return response;
        } catch {
          return new Response("", { status: 503 });
        }
      })
    );
    return;
  }

  // Network-first with cache fallback for everything else
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          caches
            .open(CACHE_NAME)
            .then((c) => c.put(event.request, response.clone()))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
