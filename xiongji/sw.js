/* 熊记 Service Worker
 * 改了 app 内容记得把 CACHE 版本号 +1（v1 → v2 …），否则用户会一直跑旧版。
 *
 * 策略：
 *   index.html / 页面导航  = 网络优先（联网时永远最新，断网回退缓存）
 *   icons / 贴纸 / 字体     = 缓存优先（很少变，离线也能用）
 *   GitHub API             = 完全不碰（绝不缓存账目数据）
 *
 * 页面走网络优先是必须的：cache-first 会让用户长期停在旧版本，
 * 尤其是 iOS 主屏 App，SW 的更新检查很少自己触发。
 */
var CACHE = 'bear-journal-v11';
/* 同源并存的其它 App 用不同前缀，activate 时只清自己的，别误删邻居的离线副本。
   另外顺手清掉 'xiongji-' —— 那是本 App 改名前的旧前缀，属于自己家的遗留缓存。 */
var CACHE_PREFIX = 'bear-journal-';
var LEGACY_PREFIXES = ['xiongji-'];

var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './assets/fonts/notosans.css',
  /* tab 栏 */
  './assets/bear/tab-record.png', './assets/bear/tab-ledger.png',
  './assets/bear/tab-stats.png',  './assets/bear/tab-me.png',
  /* 11 个消费类目 */
  './assets/bear/cat-canyin.png', './assets/bear/cat-gouwu.png', './assets/bear/cat-jiaotong.png',
  './assets/bear/cat-juzhu.png',  './assets/bear/cat-other.png', './assets/bear/cat-renqing.png',
  './assets/bear/cat-riyong.png', './assets/bear/cat-tongxun.png', './assets/bear/cat-xuexi.png',
  './assets/bear/cat-yiliao.png', './assets/bear/cat-yule.png',
  /* 页面装饰用到的贴纸 */
  './assets/bear/hero-cash.png',  './assets/bear/hero-think.png', './assets/bear/hero-welcome.png',
  './assets/bear/hero-sleep.png', './assets/bear/hero-read.png',  './assets/bear/hero-load.png',
  './assets/bear/hero-clap.png',  './assets/bear/hero-love.png',  './assets/bear/mark-sparkle.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      // 单个文件失败不影响整体安装（比如某张贴纸被改名）
      return Promise.all(ASSETS.map(function(u){
        return c.add(u).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys
        .filter(function(k){
          // 自己的旧版本
          if (k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE) return true;
          // 改名前的遗留缓存（旧版熊记留在同一台设备上的）
          for (var i = 0; i < LEGACY_PREFIXES.length; i++) {
            if (k.indexOf(LEGACY_PREFIXES[i]) === 0) return true;
          }
          return false;
        })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function isDoc(req, url){
  if (req.mode === 'navigate') return true;
  if (req.destination === 'document') return true;
  var p = url.pathname;
  return p.endsWith('/') || p.endsWith('/index.html');
}

self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);

  // 账目数据一律走网络，绝不缓存
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') return;

  if (isDoc(e.request, url)) {
    e.respondWith(
      fetch(e.request).then(function(res){
        if (res && res.ok && url.origin === location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(e.request, { ignoreSearch:true })
          .then(function(hit){ return hit || caches.match('./index.html') || caches.match('./'); });
      })
    );
    return;
  }

  // 静态资源：缓存优先，后台顺手更新
  e.respondWith(
    caches.match(e.request, { ignoreSearch:true }).then(function(hit){
      var net = fetch(e.request).then(function(res){
        if (res && res.ok && url.origin === location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});

self.addEventListener('message', function(e){
  if (e.data === 'skipWaiting') self.skipWaiting();
});
