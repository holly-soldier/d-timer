const CACHE_NAME = 'danchaku-timer-v7'; // バージョン名（変更すると強制更新のトリガーになります）
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// インストール時に古い待機中Service Workerをスキップして即座に有効化
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// アクティベート時に古いバージョンのキャッシュをお掃除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// キャッシュを返しつつ、裏でネットワークから最新版を取得して上書き（Stale-While-Revalidate）
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        // 裏でネットワークから最新データを取得する処理
        const fetchedResponse = fetch(event.request).then(networkResponse => {
          // 正常に取得できたらキャッシュを最新に更新
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // 電波がない・機内モード等の場合は何もしない（エラーを出さない）
        });

        // キャッシュがあれば即座にそれを返す（爆速起動）。初回などキャッシュがない時はネットワーク完了を待つ。
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
