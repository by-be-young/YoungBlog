/**
 * 文本统计工具
 *
 * 站点总字数、文章字数、构建期 `blogs.json` 的 `wordCount` 字段共用同一套口径：
 * 1. 去掉 YAML front matter；
 * 2. 去掉围栏代码块；
 * 3. 去掉 Markdown 语法字符；
 * 4. 去掉全部空白后统计字符数。
 *
 * 这里保持纯函数，不依赖 Vue / Pinia / 浏览器环境，
 * 便于 `scripts/generate.js` 在 Node 构建阶段直接复用。
 */

/** 去掉文件开头的 YAML front matter（`---` 包裹的元数据） */
export function stripFrontMatter(text) {
  const source = String(text || '')
  const trimmed = source.trimStart()
  if (!trimmed.startsWith('---')) return source

  const end = trimmed.indexOf('\n---', 3)
  if (end === -1) return source

  return trimmed.slice(end + 4).replace(/^\n+/, '')
}

/**
 * 统计可读字符数
 *
 * 注意：这是「字符数」口径，不是英文单词数；中文文章按字符统计更直观，
 * 也与历史实现保持一致，避免站点总字数出现无意义的跳变。
 */
export function countReadableChars(markdown) {
  const body = stripFrontMatter(markdown)
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*~-]/g, ' ')
    .replace(/\s+/g, '')
    .length
}

/**
 * 格式化站点总字数
 * - 中文：按「万」显示，保留 1 位小数
 * - 英文 / 日文：按「千」显示，保留 1 位小数
 */
export function formatWordCount(total, lang = 'zh') {
  const value = Number(total) || 0
  const unit = lang === 'zh' ? 10000 : 1000
  const suffix = lang === 'zh' ? 'w' : 'k'
  return `${(value / unit).toFixed(1)}${suffix}`
}
