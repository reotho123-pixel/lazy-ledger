/* 懒人记账 - Service Worker
 * 更新了应用内容请把 CACHE 版本号 +1（v28 -> v29 ...）
 *
 * 策略：
 *   - index.html / 页面导航 = 网络优先（联网时永远拿最新的，离线才回退缓存）
 *   - 图标等静态资源     = 缓存优先（很少变，省流量）
 *   - GitHub API / raw   = 直接走网络，绝不缓存
 * 之所以页面用「网络优先」：cache-first 会让用户一直看到旧版，
 * 尤其 iOS 加到主屏幕后很少触发 SW 更新检查。
 */
var CACHE = 'lazy-ledger-v28';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 逐个 add，单个失败不影响整体
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
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
  // GitHub API / raw 内容永远走网络，不缓存
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') return;

  // 页面：网络优先，离线回退缓存
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

  // 其他静态资源：缓存优先，后台顺带刷新
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

// 支持页面主动要求更新
self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
