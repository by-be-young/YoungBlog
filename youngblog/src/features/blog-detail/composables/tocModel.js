/**
 * 目录树与滚动定位的纯函数模型
 *
 * 这一层不依赖 Vue、也不碰 DOM：
 * - `createTocModel` 把「标题列表」整理成树，并保证 id 唯一；
 * - `pickActiveNode` / `resolveActivePath` 负责当前位置判定；
 * - `computeReadingProgress` 负责阅读进度。
 *
 * 目录的 DOM 读取、事件绑定留在 `useBlogToc.js`，
 * 这样模型可以用大量用例直接测试，不需要挂载组件或浏览器。
 */

/** 标题末尾的「星标」标记：`【!】`、`[!]`、`［!］`（全角/半角感叹号均可） */
export const STAR_MARKER_RE = /(?:【\s*[!！]\s*】|\[\s*[!！]\s*\]|［\s*[!！]\s*］)\s*$/u

/** 只有标记、没有文字的标题仍然会保留一个兜底文本 */
const FALLBACK_TEXT = '未命名标题'

function collapseWhitespace(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\r\n]+/g, ' ')
    .trim()
}

/**
 * 解析标题文字：去掉末尾星标、标记是否带星。
 * @param {string} raw 原始标题文字
 * @param {boolean} explicitStar 渲染阶段已确认的星标（`data-star-marked`）
 * @returns {{ text: string, star: boolean }}
 */
export function normalizeHeadingLabel(raw, explicitStar = false) {
  const clean = collapseWhitespace(raw)
  const marked = STAR_MARKER_RE.test(clean)
  const text = marked ? collapseWhitespace(clean.replace(STAR_MARKER_RE, '')) : clean
  return {
    text: text || clean || FALLBACK_TEXT,
    star: Boolean(explicitStar) || marked,
  }
}

function isHeadingLevel(level, minLevel, maxLevel) {
  return Number.isInteger(level) && level >= minLevel && level <= maxLevel
}

/**
 * 生成目录树。
 *
 * 规则：
 * - 只接受 `minLevel..maxLevel`（默认 1..3）的标题；
 * - 空标题、显式隐藏的标题会被跳过；
 * - 父节点是「前一个层级更小的标题」，因此跳级（h1 → h3）不会丢节点；
 * - 没有父节点的标题成为根节点，允许 h2 / h3 出现在文章开头；
 * - 重复或缺失的 id 会被就地改成稳定、唯一的 id，调用方负责写回 DOM。
 *
 * @param {Array<{id?: string, level: number, text?: string, star?: boolean, el?: HTMLElement|null, hidden?: boolean}>} headings
 * @param {{ minLevel?: number, maxLevel?: number }} options
 * @returns {{ tree: object[], flat: object[], byId: Map<string, object>, skipped: number }}
 */
export function createTocModel(headings, options = {}) {
  const minLevel = options.minLevel ?? 1
  const maxLevel = options.maxLevel ?? 3
  const items = []
  const usedIds = new Set()
  let skipped = 0

  ;(Array.isArray(headings) ? headings : []).forEach((heading, index) => {
    if (!heading || heading.hidden) {
      skipped += 1
      return
    }

    const level = Number(heading.level)
    if (!isHeadingLevel(level, minLevel, maxLevel)) {
      skipped += 1
      return
    }

    const label = normalizeHeadingLabel(heading.text, heading.star)
    const plainText = collapseWhitespace(
      collapseWhitespace(heading.text).replace(STAR_MARKER_RE, ''),
    )
    if (!plainText) {
      skipped += 1
      return
    }

    const baseId = collapseWhitespace(heading.id) || `toc-auto-h${level}-${items.length + 1}`
    let id = baseId
    let suffix = 2
    while (usedIds.has(id)) {
      id = `${baseId}--${suffix}`
      suffix += 1
    }
    usedIds.add(id)

    items.push({
      id,
      level,
      text: label.text,
      star: label.star,
      order: index,
      el: heading.el ?? null,
      parentId: '',
      children: [],
      depth: 0,
      path: [id],
    })
  })

  const roots = []
  const stack = []

  items.forEach((item) => {
    while (stack.length && stack[stack.length - 1].level >= item.level) stack.pop()
    const parent = stack[stack.length - 1] || null

    if (parent) {
      item.parentId = parent.id
      item.path = [...parent.path, item.id]
      parent.children.push(item)
    } else {
      roots.push(item)
    }

    stack.push(item)
  })

  const flat = []
  const byId = new Map()

  const walk = (node, depth) => {
    node.depth = depth
    flat.push(node)
    byId.set(node.id, node)
    node.children.forEach((child) => walk(child, depth + 1))
  }

  roots.forEach((root) => walk(root, 0))

  return { tree: roots, flat, byId, skipped }
}

/**
 * 根据一条「当前标题」记录得到根 / 子 / 叶三级 id。
 * 模板只关心当前链路，而不是整棵树。
 * @param {object|null} node
 * @returns {{ nodeId: string, rootId: string, childId: string, leafId: string }}
 */
export function resolveActivePath(node) {
  if (!node) {
    return { nodeId: '', rootId: '', childId: '', leafId: '' }
  }
  return {
    nodeId: node.id || '',
    rootId: node.path?.[0] || '',
    childId: node.path?.[1] || '',
    leafId: node.path?.[2] || '',
  }
}

/**
 * 找到「最后一个落在判定线之上的标题」。
 *
 * 测量记录已经缓存了标题的文档绝对位置，滚动时只需读一次 scrollY，
 * 不再对每个标题调用 getBoundingClientRect。
 *
 * @param {Array<{ node: object, top: number }>} measurements 按 DOM 顺序排列的测量结果
 * @param {number} line 判定线（文档绝对坐标）
 * @returns {object|null}
 */
export function pickActiveNode(measurements, line) {
  if (!Number.isFinite(line)) return null
  let best = null

  ;(Array.isArray(measurements) ? measurements : []).forEach((entry) => {
    if (!entry || !entry.node || !Number.isFinite(entry.top)) return
    if (entry.top > line) return
    // 同一位置时后出现的标题优先（例如折叠块里的重叠标题）
    if (!best || entry.top >= best.top) best = entry
  })

  return best ? best.node : null
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * 阅读进度：以正文容器为尺子，扣除顶部导航与判定线后的可视区间。
 *
 * @param {{ rootTop: number, rootHeight: number, viewportHeight: number, navHeight: number, gap?: number }} input
 * @returns {number} 0..100
 */
export function computeReadingProgress({
  rootTop,
  rootHeight,
  viewportHeight,
  navHeight,
  gap = 20,
}) {
  const viewport = Math.max(Number(viewportHeight) || 0, 1)
  const height = Number(rootHeight) || 0
  const top = Number(rootTop) || 0

  if (height <= 0) return 0

  const offset = Math.max(Number(navHeight) || 0, 0) + gap
  const usable = Math.max(viewport - offset, 1)

  if (height <= usable) {
    // 整篇文章一屏放得下：内容进入视口即视为读完
    return top < viewport ? 100 : 0
  }

  const passed = Math.max(0, offset - top)
  const total = Math.max(height - usable, 1)
  return clamp((passed / total) * 100, 0, 100)
}
