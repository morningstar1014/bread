// 「早饭吃什么」Service Worker —— 让页面在服务器被停掉（403/断网）时也能打开
// 策略：
//   · 页面（导航请求）：网络优先，服务器挂了就用上次缓存的那份 → 照样能记账
//   · /api/ 数据请求：一律走网络，不缓存（数据同步由页面自己负责）
// 版本号 1788881790 由 build.py 每次构建时写入，保证更新代码后缓存会跟着换
// 兼容两种部署位置：站点根目录（沙箱）和子目录（GitHub Pages /bread/）
const BASE = new URL('./', self.location).href;              // .../bread/
const PAGE = new URL('./index.html', self.location).href;    // .../bread/index.html

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.add(PAGE).catch(() => c.add(BASE).catch(() => {})))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  // 数据接口不碰，交给页面（页面有 localStorage 兜底 + 恢复后自动补传）
  if (url.pathname.indexOf('/api/') === 0) return;
  // 跨域请求（api.github.com 读 Gist 数据）一律放行，绝不进缓存
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' || url.href === BASE || url.href === PAGE;

  if (isPage) {
    // 网络优先：拿到新的就顺手更新缓存；403 / 断网 → 用缓存里的旧页面顶上
    e.respondWith(
      fetch(req).then((res) => {
        if (!res || !res.ok) throw new Error('bad response');
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(PAGE, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(PAGE).then((r) => r || caches.match(BASE)))
    );
    return;
  }

  // 其它静态资源：缓存优先
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
