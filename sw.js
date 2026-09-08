// 「早饭吃什么」Service Worker —— 自毁版（已停用离线兜底）
//
// 为什么停用：页面现在托管在 GitHub Pages，永不休眠，不再需要离线缓存。
// 而旧版 SW 在网络异常 / 缓存为空时会向浏览器返回 undefined，
// 直接导致 Edge 报「ERR_FAILED 无法访问此页面」。
//
// 这个版本只做一件事：清干净缓存 → 注销自己 → 不再拦截任何请求。
// 老设备上装过的旧 SW 会被它顶掉并自行卸载，之后页面完全走网络。
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const ks = await caches.keys();
      await Promise.all(ks.map((k) => caches.delete(k)));
    } catch (err) { /* 忽略 */ }
    try {
      await self.registration.unregister();
    } catch (err) { /* 忽略 */ }
    try {
      const cs = await self.clients.matchAll({ type: 'window' });
      cs.forEach((c) => c.navigate(c.url));
    } catch (err) { /* 忽略 */ }
  })());
});

// 关键：不再 respondWith 任何东西，所有请求交给浏览器原生处理
self.addEventListener('fetch', () => {});
