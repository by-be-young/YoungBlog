/**
 * 构建后脚本：将博客内容文件复制到 dist 目录
 *
 * Vite 构建时只会复制 public/ 目录的内容到 dist/，
 * 但博客 Markdown 文件存放在 blogs/（位于项目根目录），
 * 需要手动复制到 dist/blogs/ 以确保部署后可访问。
 */
import { cpSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const src = resolve(root, 'blogs')
const dest = resolve(root, 'dist', 'blogs')

if (existsSync(src)) {
  console.log(`[postbuild] 复制博客内容: ${src} -> ${dest}`)
  cpSync(src, dest, { recursive: true })
  console.log('[postbuild] 完成')
} else {
  console.warn('[postbuild] 未找到 blogs/ 目录，跳过复制')
}
