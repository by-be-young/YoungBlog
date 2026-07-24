/**
 * 路径解析工具
 *
 * 自动添加 Vite 的 BASE_URL 前缀，确保在 GitHub Pages 子路径部署下
 * （如 /YoungBlog/）时，fetch 等请求能够正确指向资源。
 *
 * 用法：
 *   fetch(resolveUrl('/data/blogs.json'))
 *   fetch(resolveUrl('blogs/xxx.md'))
 */
export function resolveUrl(path) {
  if (!path) return path
  // 已经是完整 URL 或 data: URI，不处理
  if (/^(https?:|data:|blob:|javascript:)/i.test(path)) return path

  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : base + '/'

  // 去除 path 开头的 /
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path

  return normalizedBase + normalizedPath
}
