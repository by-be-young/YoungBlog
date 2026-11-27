/**
 * 注册 Service Worker，让站点具备「添加到主屏幕 + 离线打开」的能力。
 *
 * - 只在生产构建里注册：vite dev 会直接托管 public/，把 sw.js 注册起来会让开发期的
 *   热更新被缓存拦住。
 * - 路径来自 import.meta.env.BASE_URL，根路径部署与 /YoungBlog/ 子路径部署共用。
 * - 注册失败只影响离线能力，不阻塞页面，因此记录 warning 后继续。
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`

    navigator.serviceWorker.register(swUrl).catch((error) => {
      console.warn('[pwa] Service Worker 注册失败，站点将无法离线打开', error)
    })
  })
}
