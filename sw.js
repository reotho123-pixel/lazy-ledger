/* Lazy Ledger - Service Worker
 * 更新应用内容后请把 CACHE 版本号 +1（v40 -> v41 ...）
 *
 * Strategy:
 *   - index.html / page navigations = network-first (always latest online, cache offline)
 *   - icons and static assets       = cache-first (rarely change)
 *   - GitHub API / raw content      = network only, never cached
 * Pages use network-first because cache-first makes users stay on stale versions,
 * especially on iOS home-screen apps where the SW update check rarely fires.
 */
var CACHE = 'lazy-ledger-v44';
/* 只清自己这一族的缓存。本 App 与「熊记」(lazy-ledger/xiongji/) 同源，
   无差别清 keys 会把邻居的离线副本一起删掉。 */
var CACHE_PREFIX = 'lazy-ledger-';
/* 安装期只预缓存"小且必用"的资源（图标 + 贴纸）。
   分类图标和漫画图体积大（合计约 1.4MB），走 cache-first 的按需缓存：
   打开某个页面时自然被缓存，装不上也不会拖垮 SW 安装。 */
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './stickers/goku-3.png',
  './stickers/goku-4.png',
  './stickers/goku-black-side.png',
  './stickers/acct-face.jpg',
  './stickers/acct-bg.jpg',
  './stickers/manga-04.jpg',
  './stickers/manga-06.jpg',
  './stickers/manga-wide-01.jpg',
  './stickers/manga-wide-02.jpg',
  './stickers/px-happy.png',
  './stickers/px-smile.png',
  './stickers/px-trunks.png',
  './stickers/px-angry.png',
  './stickers/px-goku-black.png',
  './stickers/px-tab2.png',
  './stickers/px-tab3.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* 逐项 add 并吞掉单项失败：一个大图在弱网下失败不该拖垮整个 SW 安装，
         否则新版本永远激活不了，App 会一直停在旧缓存。 */
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isDocRequest(req, url) {
  if (req.mode === 'navigate') return true;
  if (req.destination === 'document') return true;
  var p = url.pathname;
  return p.endsWith('/') || p.endsWith('/index.html');
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') return;

  if (isDocRequest(e.request, url)) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok && url.origin === location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
          return hit || caches.match('./index.html') || caches.match('./');
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok && url.origin === location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
