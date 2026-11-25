/**
 * 博客详情页目录导航
 *
 * 目录的职责被拆成三层：
 * 1. 数据层：只负责把正文标题整理成 H1 → H2 → H3 的树；
 * 2. 状态层：只维护展开项、当前章节、阅读进度；
 * 3. 视图层：只在 DOM 变化后把 H2 指示器 / H3 小虫放到对应位置。
 *
 * 滚动高亮不依赖标题文本或 CSS 选择器拼接，统一使用标题 id。
 */
import { nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'

const STAR_MARKER_RE = /(?:【\s*[!！]\s*】|\[\s*[!！]\s*\]|［\s*[!！]\s*］)\s*$/
const SCROLL_LOCK_MIN_MS = 650
const SCROLL_LOCK_MAX_MS = 2200
const SHORT_ARTICLE_GAP = 60

function parseHeadingText(element) {
  const raw = String(
    element.dataset.headingPlainText || element.textContent || '',
  ).trim()
  const marked = element.dataset.starMarked === '1'
  return {
    text: raw.replace(STAR_MARKER_RE, '').trim(),
    star: marked || STAR_MARKER_RE.test(raw),
  }
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return String(value).replace(/["\\]/g, '\\$&')
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function navbarHeight() {
  return document.querySelector('.navbar')?.offsetHeight || 60
}

export function useBlogToc(options) {
  const {
    contentHtml,
    contentId,
    isCompact,
  } = options

  const tree = shallowRef([])
  const progress = ref(0)
  const openH1Id = ref('')
  const activeH1Id = ref('')
  const activeH2Id = ref('')
  const activeH3Id = ref('')
  const isShortArticle = ref(false)

  const listWrapRef = ref(null)
  const tocListRef = ref(null)
  const indicatorRef = ref(null)
  const bugRef = ref(null)

  let flatNodes = []
  let nodeById = new Map()
  let highlightedH2 = null
  let highlightedH3 = null
  let activeLockUntil = 0
  let scrollRaf = 0
  let centerRaf = 0
  let layoutRaf = 0
  let rebuildTimer = null
  let layoutTimer = null
  let resizeObserver = null

  function contentRoot() {
    const id = contentId()
    return (id ? document.getElementById(id) : null) || document.querySelector('.article-content')
  }

  function hidePieces() {
    if (indicatorRef.value) indicatorRef.value.style.opacity = '0'
    if (bugRef.value) bugRef.value.style.opacity = '0'
  }

  function clearHeadingHighlight() {
    highlightedH2?.classList.remove('is-toc-active')
    highlightedH3?.classList.remove('is-toc-active')
    highlightedH2 = null
    highlightedH3 = null
  }

  function syncHeadingHighlight(h2Node, h3Node) {
    const nextH2 = h2Node?.el || null
    const nextH3 = h3Node?.el || null

    if (highlightedH2 !== nextH2) {
      highlightedH2?.classList.remove('is-toc-active')
      nextH2?.classList.add('is-toc-active')
      highlightedH2 = nextH2
    }

    if (highlightedH3 !== nextH3) {
      highlightedH3?.classList.remove('is-toc-active')
      nextH3?.classList.add('is-toc-active')
      highlightedH3 = nextH3
    }
  }

  function clearActive() {
    if (!activeH1Id.value && !activeH2Id.value && !activeH3Id.value) return
    activeH1Id.value = ''
    activeH2Id.value = ''
    activeH3Id.value = ''
    clearHeadingHighlight()
    hidePieces()
  }

  function applyActive({ h1 = null, h2 = null, h3 = null }, forceCenter = false) {
    const nextH1Id = h1?.id || ''
    const nextH2Id = h2?.id || ''
    const nextH3Id = h3?.id || ''
    const h1Changed = nextH1Id !== activeH1Id.value
    const h2Changed = nextH2Id !== activeH2Id.value
    const h3Changed = nextH3Id !== activeH3Id.value

    if (h1 && openH1Id.value !== h1.id) openH1Id.value = h1.id
    activeH1Id.value = nextH1Id
    activeH2Id.value = nextH2Id
    activeH3Id.value = nextH3Id

    if (h2Changed || h3Changed) syncHeadingHighlight(h2, h3)
    if (!h1Changed && !h2Changed && !h3Changed && !forceCenter) return

    nextTick(() => {
      syncPieces()
      if (forceCenter || h2Changed || h3Changed) {
        scheduleCenter(h2?.id || h3?.id || '')
      }
    })
  }

  function applyNode(node, forceCenter = false) {
    if (!node) return

    if (node.level === 1) {
      applyActive({ h1: node }, forceCenter)
      return
    }

    if (node.level === 2) {
      applyActive({ h1: nodeById.get(node.parentId), h2: node }, forceCenter)
      return
    }

    const h2 = nodeById.get(node.parentId)
    applyActive({ h1: h2 ? nodeById.get(h2.parentId) : null, h2, h3: node }, forceCenter)
  }

  function buildTree() {
    const root = contentRoot()
    const roots = []
    const flat = []
    const counters = { 1: 0, 2: 0, 3: 0 }
    const ids = new Set()
    let currentH1 = null
    let currentH2 = null

    nodeById = new Map()
    if (!root) {
      tree.value = []
      flatNodes = []
      return
    }

    root.querySelectorAll('h1, h2, h3').forEach((element) => {
      const textContent = String(element.textContent || '').trim()
      if (!textContent) return

      const level = Number(element.tagName.slice(1))
      const { text, star } = parseHeadingText(element)
      counters[level] += 1

      let id = String(element.id || '').trim()
      if (!id || ids.has(id)) {
        id = `toc-auto-h${level}-${counters[level]}`
        while (ids.has(id)) id = `${id}-x`
        element.id = id
      }
      ids.add(id)

      const node = {
        id,
        level,
        text: text || textContent,
        star,
        el: element,
        parentId: '',
        children: [],
      }
      nodeById.set(id, node)
      flat.push(node)

      if (level === 1) {
        currentH1 = node
        currentH2 = null
        roots.push(node)
        return
      }

      if (level === 2) {
        if (!currentH1) return
        node.parentId = currentH1.id
        currentH2 = node
        currentH1.children.push(node)
        return
      }

      if (!currentH2) return
      node.parentId = currentH2.id
      currentH2.children.push(node)
    })

    tree.value = roots
    flatNodes = flat
  }

  function resetState() {
    openH1Id.value = ''
    activeH1Id.value = ''
    activeH2Id.value = ''
    activeH3Id.value = ''
    progress.value = 0
    clearHeadingHighlight()
    hidePieces()
  }

  function scheduleRebuild() {
    clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(async () => {
      rebuildTimer = null
      await nextTick()
      buildTree()
      resetState()
      observeLayout()
      updateProgress()
      updateActiveFromScroll(true)

      if (location.hash) {
        const id = decodeURIComponent(location.hash.slice(1))
        const node = nodeById.get(id)
        if (node) applyNode(node, true)
      }

      measureLayout()
      syncPieces()
    }, 0)
  }

  function updateProgress() {
    const root = contentRoot()
    if (!root) return

    const navHeight = navbarHeight()
    const offset = navHeight + 20
    const viewport = Math.max(window.innerHeight - offset, 1)
    const rect = root.getBoundingClientRect()

    if (rect.height <= viewport) {
      progress.value = rect.top < window.innerHeight ? 100 : 0
      return
    }

    const passed = Math.max(0, offset - rect.top)
    const total = Math.max(rect.height - viewport, 1)
    progress.value = clamp((passed / total) * 100, 0, 100)
  }

  function currentHeading() {
    const line = navbarHeight() + 28
    let current = null

    for (const node of flatNodes) {
      const rect = node.el.getBoundingClientRect()
      if (!node.el.getClientRects().length) continue
      if (rect.top <= line) current = node
    }

    return current
  }

  function updateActiveFromScroll(force = false) {
    if (!force && Date.now() < activeLockUntil) return

    const node = currentHeading()
    if (!node) {
      clearActive()
      return
    }
    applyNode(node)
  }

  function syncPieces() {
    const wrap = listWrapRef.value
    const list = tocListRef.value
    if (!wrap || !list) {
      hidePieces()
      return
    }

    const h2Node = activeH2Id.value ? nodeById.get(activeH2Id.value) : null
    const h3Node = activeH3Id.value ? nodeById.get(activeH3Id.value) : null
    const h2Visible = Boolean(h2Node && openH1Id.value === h2Node.parentId)

    if (h2Node && h2Visible && indicatorRef.value) {
      const anchor = list.querySelector(
        `li[data-node-id="${cssEscape(h2Node.id)}"] > a`,
      )
      const anchorRect = anchor?.getBoundingClientRect()
      const wrapRect = wrap.getBoundingClientRect()
      if (anchorRect && wrapRect) {
        const left = Math.round(anchorRect.left - wrapRect.left - 10)
        const top = Math.round(anchorRect.top - wrapRect.top + wrap.scrollTop - 4)
        const width = Math.max(0, Math.round(wrapRect.width - left - 6))
        const height = Math.round(anchorRect.height + 8)
        if ([left, top, width, height].every(Number.isFinite)) {
          Object.assign(indicatorRef.value.style, {
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            opacity: '1',
          })
        }
      } else if (indicatorRef.value) {
        indicatorRef.value.style.opacity = '0'
      }
    } else if (indicatorRef.value) {
      indicatorRef.value.style.opacity = '0'
    }

    if (h3Node && h2Visible && bugRef.value) {
      const anchor = list.querySelector(
        `li[data-node-id="${cssEscape(h3Node.id)}"] > a`,
      )
      const anchorRect = anchor?.getBoundingClientRect()
      const wrapRect = wrap.getBoundingClientRect()
      if (anchorRect && wrapRect) {
        Object.assign(bugRef.value.style, {
          left: `${Math.round(anchorRect.left - wrapRect.left - 26)}px`,
          top: `${Math.round(
            anchorRect.top - wrapRect.top + wrap.scrollTop + (anchorRect.height - 18) / 2,
          )}px`,
          opacity: '1',
        })
      } else if (bugRef.value) {
        bugRef.value.style.opacity = '0'
      }
    } else if (bugRef.value) {
      bugRef.value.style.opacity = '0'
    }
  }

  function scheduleCenter(id) {
    if (!id) return
    if (centerRaf) cancelAnimationFrame(centerRaf)

    centerRaf = requestAnimationFrame(() => {
      centerRaf = 0
      const wrap = listWrapRef.value
      const list = tocListRef.value
      if (!wrap || !list) return
      if (wrap.scrollHeight <= wrap.clientHeight + 2) return

      const anchor = list.querySelector(`li[data-node-id="${cssEscape(id)}"] > a`)
      if (!anchor || !anchor.getClientRects().length) return

      const wrapRect = wrap.getBoundingClientRect()
      const anchorRect = anchor.getBoundingClientRect()
      const itemTop = anchorRect.top - wrapRect.top + wrap.scrollTop
      const desired = itemTop - (wrap.clientHeight - anchorRect.height) / 2
      const max = Math.max(0, wrap.scrollHeight - wrap.clientHeight)
      const next = clamp(desired, 0, max)
      if (Math.abs(wrap.scrollTop - next) < 2) return
      wrap.scrollTo({ top: next, behavior: 'smooth' })
    })
  }

  function toggleH1(node) {
    const closing = openH1Id.value === node.id
    openH1Id.value = closing ? '' : node.id

    if (closing && activeH2Id.value) {
      const h2 = nodeById.get(activeH2Id.value)
      if (h2?.parentId === node.id) {
        activeH2Id.value = ''
        activeH3Id.value = ''
        syncHeadingHighlight(null, null)
      }
    }

    nextTick(() => {
      syncPieces()
      if (!closing) scheduleCenter(node.id)
    })
  }

  function scrollToNode(node) {
    if (!node?.el) return

    const offset = navbarHeight() + 10
    const top = node.el.getBoundingClientRect().top + window.scrollY - offset
    const distance = Math.abs(top - window.scrollY)
    activeLockUntil =
      Date.now() +
      Math.max(
        SCROLL_LOCK_MIN_MS,
        Math.min(Math.round(distance * 0.9), SCROLL_LOCK_MAX_MS),
      )

    applyNode(node, true)
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })

    try {
      history.replaceState(null, '', `#${node.id}`)
    } catch {
      // 静态托管或受限环境忽略即可
    }
  }

  function measureLayout() {
    if (isCompact.value) {
      isShortArticle.value = false
      return
    }

    const root = contentRoot()
    const article = root?.closest('.blog-article')
    if (!article) {
      isShortArticle.value = false
      return
    }

    const rect = article.getBoundingClientRect()
    const available = window.innerHeight - navbarHeight()
    isShortArticle.value =
      flatNodes.length > 0 &&
      rect.height > 0 &&
      rect.height + SHORT_ARTICLE_GAP <= available
  }

  function scheduleLayout() {
    if (layoutRaf) return
    layoutRaf = requestAnimationFrame(() => {
      layoutRaf = 0
      measureLayout()
      updateProgress()
      syncPieces()
    })
  }

  function observeLayout() {
    resizeObserver?.disconnect()
    resizeObserver = null
    if (typeof ResizeObserver === 'undefined') return

    const root = contentRoot()
    const article = root?.closest('.blog-article')
    if (!root && !article) return

    resizeObserver = new ResizeObserver(scheduleLayout)
    if (root) resizeObserver.observe(root)
    if (article) resizeObserver.observe(article)
  }

  function onScroll() {
    if (scrollRaf) return
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0
      updateProgress()
      updateActiveFromScroll()
    })
  }

  function onResize() {
    scheduleLayout()
    clearTimeout(layoutTimer)
    layoutTimer = setTimeout(() => {
      layoutTimer = null
      measureLayout()
      syncPieces()
    }, 260)
  }

  function onHashChange() {
    if (!location.hash) return
    let id
    try {
      id = decodeURIComponent(location.hash.slice(1))
    } catch {
      return
    }
    const node = nodeById.get(id)
    if (node) applyNode(node, true)
  }

  function refresh() {
    measureLayout()
    updateProgress()
    syncPieces()
    scheduleCenter(activeH2Id.value || activeH3Id.value)
  }

  watch(() => [contentHtml(), contentId()], scheduleRebuild, { flush: 'post' })
  watch(isCompact, () => {
    measureLayout()
    syncPieces()
  })

  onMounted(async () => {
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('hashchange', onHashChange)

    await nextTick()
    buildTree()
    resetState()
    observeLayout()
    updateProgress()
    updateActiveFromScroll(true)
    measureLayout()
    syncPieces()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('hashchange', onHashChange)
    clearTimeout(rebuildTimer)
    clearTimeout(layoutTimer)
    resizeObserver?.disconnect()
    resizeObserver = null
    if (scrollRaf) cancelAnimationFrame(scrollRaf)
    if (centerRaf) cancelAnimationFrame(centerRaf)
    if (layoutRaf) cancelAnimationFrame(layoutRaf)
    scrollRaf = 0
    centerRaf = 0
    layoutRaf = 0
    clearHeadingHighlight()
  })

  return {
    tree,
    progress,
    openH1Id,
    activeH1Id,
    activeH2Id,
    activeH3Id,
    isShortArticle,
    listWrapRef,
    tocListRef,
    indicatorRef,
    bugRef,
    toggleH1,
    scrollToNode,
    refresh,
  }
}
