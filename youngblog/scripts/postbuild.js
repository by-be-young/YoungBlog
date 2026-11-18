/**
 * 构建后脚本：将博客内容文件复制到 dist 目录
 *
 * Vite 构建时只会复制 public/ 目录的内容到 dist/，
 * 但博客 Markdown 文件存放在 blogs/（位于项目根目录），
 * 需要手动复制到 dist/blogs/ 以确保部署后可访问。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const src = resolve(root, 'blogs')
const dest = resolve(root, 'dist', 'blogs')

/**
 * 递归复制目录。
 *
 * 不使用 fs.cpSync：在部分 Windows + Node 22 环境下，复制包含中文名的目录
 * （例如 blogs/模板）会以 0xC0000409 崩溃且不产生任何产物。
 * 逐层 readdir + copyFileSync 可稳定完成同样的复制。
 */
function copyDir(from, to) {
  mkdirSync(to, { recursive: true })
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name)
    const target = join(to, entry.name)
    if (entry.isDirectory()) {
      copyDir(source, target)
    } else if (entry.isFile()) {
      copyFileSync(source, target)
    }
  }
}

if (existsSync(src)) {
  console.log(`[postbuild] 复制博客内容: ${src} -> ${dest}`)
  copyDir(src, dest)
  console.log('[postbuild] 完成')
} else {
  console.warn('[postbuild] 未找到 blogs/ 目录，跳过复制')
}
