/**
 * 文档链接检查脚本
 * ------------------------------------------------------------------
 * 扫描仓库内的 Markdown 文档，校验相对链接与图片路径是否存在。
 *
 * 范围：
 *   - 根目录 *.md
 *   - docs/**\/*.md
 *   - src/**\/README.md
 *   - scripts/README.md
 *   - .github/**\/*.md
 *   - blogs/模板/*.md
 *
 * 不检查：
 *   - 外部链接（http/https/mailto/tel/data）
 *   - 纯锚点（#...）
 *   - 代码块内的示例
 *
 * 用法：
 *   node scripts/check-docs.mjs
 *
 * 退出码：0 = 全部通过；1 = 存在失效链接。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-ssr', 'coverage', '.git', '.obsidian'])
const TARGETS = ['README.md', 'docs', 'scripts', 'src', '.github', join('blogs', '模板')]

/** 递归收集 Markdown 文件 */
function collectMarkdown(dir, files = []) {
  if (!existsSync(dir)) return files
  const stat = statSync(dir)
  if (stat.isFile()) {
    if (extname(dir).toLowerCase() === '.md') files.push(dir)
    return files
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      collectMarkdown(full, files)
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

/** 把围栏代码块替换为等量换行，避免把示例链接当成真实链接 */
function stripCodeFences(text) {
  return text.replace(/^( {0,3})(```+|~~~+)[^\n]*\n[\s\S]*?^\1\2[^\n]*$/gm, (block) =>
    block.replace(/[^\n]/g, ''),
  )
}

/** 去掉行内代码（`...`），避免把语法示例当成真实链接 */
function stripInlineCode(text) {
  return text.replace(/`[^`\n]*`/g, '')
}

/** 判断是否为需要跳过的链接 */
function shouldSkip(target) {
  const value = target.trim()
  if (!value) return true
  if (/^(https?:|mailto:|tel:|data:|ftp:|javascript:|blob:)/i.test(value)) return true
  if (value.startsWith('#')) return true
  return false
}

/** 去掉锚点与查询串，并解码百分号编码 */
function normalizeTarget(target) {
  let value = target.trim()
  if (value.startsWith('<') && value.endsWith('>')) value = value.slice(1, -1)
  value = value.split('#')[0].split('?')[0]
  try {
    value = decodeURIComponent(value)
  } catch {
    // 保留原值
  }
  return value
}

const files = []
for (const target of TARGETS) {
  const abs = join(ROOT, target)
  if (!existsSync(abs)) continue
  if (statSync(abs).isFile()) {
    if (abs.toLowerCase().endsWith('.md')) files.push(abs)
  } else {
    collectMarkdown(abs, files)
  }
}

const uniqueFiles = [...new Set(files)]
const problems = []
let checked = 0

const LINK_RE = /!?\[[^\]]*\]\(([^)]+)\)/g

for (const file of uniqueFiles) {
  let text = readFileSync(file, 'utf8')
  text = stripCodeFences(text)
  text = stripInlineCode(text)
  let match
  LINK_RE.lastIndex = 0
  while ((match = LINK_RE.exec(text)) !== null) {
    const rawTarget = match[1]
    if (shouldSkip(rawTarget)) continue
    const target = normalizeTarget(rawTarget)
    if (!target) continue

    // 去掉 Markdown 标题：`path "title"` 或 `path 'title'`
    const purePath = target.replace(/\s+["'][^"']*["']$/, '').trim()
    if (!purePath || shouldSkip(purePath)) continue

    checked++
    const baseDir = purePath.startsWith('/') ? ROOT : dirname(file)
    const resolved = purePath.startsWith('/')
      ? join(ROOT, purePath.slice(1))
      : resolve(baseDir, purePath)

    if (!existsSync(resolved)) {
      const line = text.slice(0, match.index).split('\n').length
      problems.push({
        file: relative(ROOT, file),
        line,
        target: rawTarget.trim(),
        resolved: relative(ROOT, resolved),
      })
    }
  }
}

const output = problems.map(
  (p) => `  ${p.file}:${p.line}  ->  ${p.target}（解析为 ${p.resolved}）`,
)

console.log(`[check-docs] 扫描文件：${uniqueFiles.length}，检查链接：${checked}`)

if (problems.length) {
  console.error(`[check-docs] 发现 ${problems.length} 个失效链接：`)
  console.error(output.join('\n'))
  process.exitCode = 1
} else {
  console.log('[check-docs] 未发现失效的相对链接')
}
