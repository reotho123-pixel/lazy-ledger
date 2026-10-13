/* Xiongji (熊记) - Service Worker
 * 更新应用内容后请把 CACHE 版本号 +1（v1 -> v2 ...）
 *
 * Strategy:
 *   - index.html / page navigations = network-first (always latest online, cache offline)
 *   - icons and static assets       = cache-first (rarely change)
 *   - GitHub API / raw content      = network only, never cached
 * Pages use network-first because cache-first makes users stay on stale versions,
 * especially on iOS home-screen apps where the SW update check rarely fires.
 */
var CACHE = 'xiongji-v13';
var BEARS = [
  './bears/b1_faq.png', './bears/b2_info.png', './bears/b3_wave.png', './bears/b4_panda.png',
  './bears/i-canyin.png', './bears/i-gouwu.png', './bears/i-jiaotong.png', './bears/i-juzhu.png',
  './bears/i-other.png', './bears/i-renqing.png', './bears/i-riyong.png', './bears/i-tongxun.png',
  './bears/i-xuexi.png', './bears/i-yiliao.png', './bears/i-yule.png'
];
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
].concat(BEARS);

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

/* Only purge OUR OWN caches: if this app is served from a subdirectory of the
   same origin as another app, deleting every cache would wipe the sibling's
   offline copy too. Match by prefix instead of "anything that is not CACHE". */
var CACHE_PREFIX = 'xiongji-';

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys
        .filter(function (k) { return k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE; })
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
