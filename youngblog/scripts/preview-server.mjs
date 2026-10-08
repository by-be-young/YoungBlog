/**
 * 本地静态预览服务器（仅用于开发/验证，不参与构建产物）
 *
 * 用途：
 * 站点的路由使用 hash 模式（createWebHashHistory），但博客 Markdown 通过
 * fetch 直接请求 /blogs/**\/*.md，因此需要一个能把项目根目录当作站点根的
 * 静态服务器，才能完整复现线上行为：
 *   - /                 -> dist/index.html（不存在则回退到源码根目录）
 *   - /blogs/xxx.md     -> 直接读取项目根目录下的原始 Markdown
 *   - /assets、/data    -> 交给 dist 目录
 *
 * 用法：
 *   node scripts/preview-server.mjs [--port 4173] [--root .]
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'

const argv = process.argv.slice(2)
const getArg = (name, fallback) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

const PORT = Number(getArg('--port', '4173'))
const ROOT = resolve(getArg('--root', '.'))
// 默认静态产物在 <root>/dist；允许指向别处，便于验证脚本使用「注入探针后的 dist 副本」
const DIST = resolve(getArg('--dist', join(ROOT, 'dist')))

/** 扩展名 -> Content-Type */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

/**
 * 依次在 dist 与项目根目录中查找文件。
 * 先 dist 后根目录：dist 里是构建产物（index.html / assets），
 * 根目录里则是构建时不会拷贝进 dist 的原始资源（blogs/、assets/ 源文件）。
 */
function findFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '')
  if (clean.includes('..')) return null
  const candidates = [join(DIST, clean), join(ROOT, clean)]
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c
  }
  // 目录请求回退到 index.html
  const indexCandidates = [join(DIST, clean, 'index.html'), join(DIST, 'index.html')]
  for (const c of indexCandidates) {
    if (existsSync(c) && statSync(c).isFile()) return c
  }
  return null
}

const server = createServer((req, res) => {
  const file = findFile(req.url || '/')
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 Not Found')
    return
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  createReadStream(file).pipe(res)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[preview] http://127.0.0.1:${PORT}/  root=${ROOT}`)
})
