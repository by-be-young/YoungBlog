/**
 * 公告文本解析。
 *
 * 公告仍以纯文本存于 `public/data/announcements.json`，这里把既有的书写习惯
 * 还原成结构化文档，供弹窗与公告页渲染。**只做结构识别，不改动任何文字**。
 *
 * 识别规则（与历史公告的写法一致）：
 * - 第一条非空行：`「制作者通讯·4.1“云海寻书任雨流”版本更新」`，拆成
 *   栏目名 / 期号 / 副标题 / 后缀；
 * - `xxx>>`：章节标题；
 * - `【xxx】`：章节内的小分组；
 * - `·` / `•` / `・`：列表项；
 * - 其余非空行：段落；
 * - 末章节结尾的段落（通常是「感谢大家的支持…」）归为文末寄语。
 *
 * 解析不失败：无法识别的行一律降级为段落，原文顺序与文字保持不变。
 */

/** 章节标题：以两个以上的 `>` 收尾 */
const SECTION_RE = />{2,}\s*$/

/** 小分组：整行被【】包裹 */
const GROUP_RE = /^【\s*(.+?)\s*】\s*[：:]?$/

/** 列表项前缀 */
const BULLET_RE = /^[·•・]\s*/

/** 首行书名号 */
const HEADLINE_QUOTE_RE = /^[「『]\s*(.*?)\s*[」』]$/

/** 「栏目·期号“副标题”后缀」 */
const HEADLINE_PART_RE = /^(.*?)·\s*(\d+(?:\.\d+)*)\s*[“"「]\s*(.+?)\s*[”"」]\s*(.*)$/

/** 拆分首行，失败时整行当成标题 */
function parseHeadline(line) {
  const trimmed = String(line || '').trim()
  const quoted = trimmed.match(HEADLINE_QUOTE_RE)
  const content = quoted ? quoted[1] : trimmed.replace(/^[「『]/, '').replace(/[」』]$/, '')
  const parts = content.match(HEADLINE_PART_RE)

  if (!parts) {
    return {
      series: '',
      version: '',
      codename: '',
      suffix: '',
      title: content,
      raw: trimmed,
    }
  }

  return {
    series: parts[1].trim(),
    version: parts[2].trim(),
    codename: parts[3].trim(),
    suffix: parts[4].trim(),
    title: content,
    raw: trimmed,
  }
}

/** 把连续的列表项合并成一个 list 块 */
function groupBullets(blocks) {
  const result = []
  let pending = null

  blocks.forEach((block) => {
    if (block.type === 'bullet') {
      if (!pending) {
        pending = { type: 'list', items: [] }
        result.push(pending)
      }
      pending.items.push(block.text)
      return
    }
    pending = null
    result.push(block)
  })

  return result
}

/**
 * 解析一条公告。
 * @param {string} message 公告原文
 * @returns {{
 *   headline: { series: string, version: string, codename: string, suffix: string, title: string, raw: string },
 *   intro: Array<object>,
 *   sections: Array<{ title: string, blocks: Array<object> }>,
 *   outro: string[],
 *   hasStructure: boolean
 * }}
 */
export function parseAnnouncement(message) {
  const lines = String(message ?? '').split(/\r?\n/)
  const firstIndex = lines.findIndex((line) => line.trim())
  const headline = parseHeadline(firstIndex >= 0 ? lines[firstIndex] : '')

  const introBlocks = []
  const sections = []
  const outro = []
  let currentSection = null

  const pushBlock = (block) => {
    if (currentSection) {
      currentSection.blocks.push(block)
      return
    }
    introBlocks.push(block)
  }

  for (let index = firstIndex + 1; index < lines.length; index += 1) {
    const raw = lines[index]
    const line = raw.trim()
    if (!line) continue

    if (SECTION_RE.test(line)) {
      const title = line.replace(SECTION_RE, '').trim()
      currentSection = { title: title || '更新', blocks: [] }
      sections.push(currentSection)
      continue
    }

    const group = line.match(GROUP_RE)
    if (group) {
      pushBlock({ type: 'group', title: group[1] })
      continue
    }

    if (BULLET_RE.test(line)) {
      pushBlock({ type: 'bullet', text: line.replace(BULLET_RE, '').trim() })
      continue
    }

    pushBlock({ type: 'text', text: line })
  }

  // 末章节结尾的段落（致谢、后续说明）从章节里提出来，统一放在文末
  if (sections.length) {
    const last = sections[sections.length - 1]
    while (last.blocks.length && last.blocks[last.blocks.length - 1].type === 'text') {
      outro.unshift(last.blocks.pop().text)
    }
  }

  return {
    headline,
    intro: groupBullets(introBlocks),
    sections: sections.map((section) => ({
      title: section.title,
      blocks: groupBullets(section.blocks),
    })),
    outro,
    hasStructure: Boolean(sections.length || headline.codename),
  }
}

/** 公告是否在最近 n 天内（用于「最新」标记） */
export function isRecentAnnouncement(dateStr, days = 3) {
  if (!dateStr) return false
  const target = new Date(dateStr)
  if (Number.isNaN(target.getTime())) return false
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const diffDays = Math.abs(Math.round((today - targetDay) / 86400000))
  return diffDays <= days
}
