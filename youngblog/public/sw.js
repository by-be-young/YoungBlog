/**
 * Service Worker：让站点可以被「添加到主屏幕」后离线打开。
 *
 * 策略按资源性质分流，避免把内容更新卡在旧缓存里：
 * - 页面导航（Hash 路由只有 index.html 一个入口）：network-first，离线回退到缓存的壳
 * - /assets/ 下的构建产物：文件名带哈希、内容不可变，cache-first
 * - 文章 Markdown、data/*.json：内容会更新，network-first
 * - 音乐等大文件：不缓存，直接走网络
 *
 * 全部路径都从 registration.scope 推导，根路径部署与 /YoungBlog/ 子路径部署共用同一份代码。
 */

const VERSION = 'v1'
const SHELL_CACHE = `youngblog-shell-${VERSION}`
const RUNTIME_CACHE = `youngblog-runtime-${VERSION}`
const MAX_RUNTIME_ENTRIES = 80

const SCOPE = new URL(self.registration.scope)
const BASE = SCOPE.pathname
const SHELL_URL = new URL('index.html', SCOPE).href

/** 构建产物目录，文件名带内容哈希 */
const ASSET_PREFIX = `${BASE}assets/`
/** 会随发布变化的内容目录 */
const CONTENT_PREFIXES = [`${BASE}data/`, `${BASE}blogs/`]
/** 体积大且可再生的资源，不写缓存 */
const SKIP_PREFIXES = [`${BASE}music/`]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      // 预缓存入口壳，失败不阻塞安装（首次离线访问靠运行时的缓存兜底）
      await cache.add(new Request(SHELL_URL, { cache: 'reload' })).catch(() => {})
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Range 请求（音乐拖动进度）不介入，交给浏览器直连
  if (request.headers.has('range')) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request))
    return
  }

  if (SKIP_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return

  if (url.pathname.startsWith(ASSET_PREFIX)) {
    event.respondWith(cacheFirst(request))
    return
  }

  const isContent =
    CONTENT_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    url.pathname.endsWith('.md')

  if (isContent) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE))
  }
})

async function handleNavigate(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      // 固定存到壳的 key 上：任何 Hash 路由都复用同一份入口
      await cache.put(SHELL_URL, response.clone())
    }
    return response
  } catch (error) {
    const cached = await cache.match(SHELL_URL)
    if (cached) return cached
    return new Response('离线状态且没有可用缓存，请联网后重试。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response && response.ok) {
    await cache.put(request, response.clone())
    await pruneRuntime(cache)
  }
  return response
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      await cache.put(request, response.clone())
      await pruneRuntime(cache)
    }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

async function pruneRuntime(cache) {
  const keys = await cache.keys()
  if (keys.length <= MAX_RUNTIME_ENTRIES) return
  const overflow = keys.slice(0, keys.length - MAX_RUNTIME_ENTRIES)
  await Promise.all(overflow.map((key) => cache.delete(key)))
}
