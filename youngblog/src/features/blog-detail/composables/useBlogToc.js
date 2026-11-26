/**
 * 博客详情页目录导航
 *
 * 职责分层：
 * 1. `tocModel.js`：纯函数，负责建树、位置判定、进度计算（可单测）；
 * 2. 本文件：读取 DOM、缓存标题坐标、维护展开 / 当前节点 / 阅读进度；
 * 3. `TOC.vue`：只负责渲染、移动端弹层与悬浮球。
 *
 * 滚动高亮统一使用标题 id，不拼接标题文字；标题坐标按文档绝对位置缓存，
 * 滚动时每个方向只读一次 scrollY，避免每帧对几十个标题调用布局测量。
 */
import { nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import {
  computeReadingProgress,
  createTocModel,
  pickActiveNode,
  resolveActivePath,
} from './tocModel'

const ACTIVE_LINE_OFFSET = 28
const SCROLL_TOP_OFFSET = 10
const SHORT_ARTICLE_GAP = 60
const GEOMETRY_REFRESH_DELAY = 180
const SCROLL_TARGET_TIMEOUT = 2600
const FALLBACK_NAV_HEIGHT = 60

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return String(value).replace(/["\\]/g, '\\$&')
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useBlogToc(options) {
  const { contentHtml, contentId, isCompact } = options

  const tree = shallowRef([])
  const progress = ref(0)
  const openRootId = ref('')
  const activeNodeId = ref('')
  const activeRootId = ref('')
  const activeChildId = ref('')
  const activeLeafId = ref('')
  const isShortArticle = ref(false)
  const hasHeadings = ref(false)

  const listWrapRef = ref(null)
  const tocListRef = ref(null)
  const indicatorRef = ref(null)
  const bugRef = ref(null)

  /** @type {{ tree: object[], flat: object[], byId: Map<string, object>, skipped: number }} */
  let model = { tree: [], flat: [], byId: new Map(), skipped: 0 }
  let elToNode = new WeakMap()
  let measurements = []
  let rootDocTop = 0
  let rootHeight = 0
  let navHeightCache = FALLBACK_NAV_HEIGHT

  let highlightedChild = null
  let highlightedLeaf = null
  let manualClosedRootId = ''
  let scrollTarget = null

  let scrollRaf = 0
  let centerRaf = 0
  let layoutRaf = 0
  let rebuildToken = 0
  let geometryTimer = null
  let resizeTimer = null
  let resizeObserver = null
  let bodyObserver = null
  let mounted = false

  function contentRoot() {
    const id = contentId()
    return (id ? document.getElementById(id) : null) || document.querySelector('.article-content')
  }

  function articleRoot() {
    return contentRoot()?.closest('.blog-article') || null
  }

  function measureNavHeight() {
    const nav = document.querySelector('.navbar')
    // 沉浸阅读用 transform 把导航栏移出视口，元素仍有布局尺寸，
    // 只看 getClientRects 会把 60px 的空白当成遮挡，必须识别 body 状态。
    const immersive = document.body?.classList.contains('immersive-reading-active')

    if (immersive) {
      navHeightCache = 0
    } else if (!nav) {
      navHeightCache = FALLBACK_NAV_HEIGHT
    } else {
      navHeightCache = nav.getClientRects().length ? nav.offsetHeight : 0
    }
    return navHeightCache
  }

  function scrollTopNow() {
    return window.scrollY || window.pageYOffset || 0
  }

  function activeLine() {
    return scrollTopNow() + navHeightCache + ACTIVE_LINE_OFFSET
  }

  function hidePieces() {
    if (indicatorRef.value) indicatorRef.value.style.opacity = '0'
    if (bugRef.value) bugRef.value.style.opacity = '0'
  }

  function replaceContentHighlight(previous, next, className) {
    if (previous === next) return previous || null
    previous?.classList.remove(className)
    next?.classList.add(className)
    return next || null
  }

  function syncContentHighlight(path) {
    const child = path?.childId ? model.byId.get(path.childId) : null
    const leaf = path?.leafId ? model.byId.get(path.leafId) : null
    highlightedChild = replaceContentHighlight(
      highlightedChild,
      child?.el || null,
      'is-toc-active',
    )
    highlightedLeaf = replaceContentHighlight(
      highlightedLeaf,
      leaf?.el || null,
      'is-toc-active',
    )
  }

  function clearContentHighlight() {
    highlightedChild?.classList.remove('is-toc-active')
    highlightedLeaf?.classList.remove('is-toc-active')
    highlightedChild = null
    highlightedLeaf = null
  }

  function clearActive() {
    if (!activeNodeId.value) return
    activeNodeId.value = ''
    activeRootId.value = ''
    activeChildId.value = ''
    activeLeafId.value = ''
    clearContentHighlight()
    hidePieces()
  }

  function pathChanged(path) {
    return (
      path.nodeId !== activeNodeId.value ||
      path.rootId !== activeRootId.value ||
      path.childId !== activeChildId.value ||
      path.leafId !== activeLeafId.value
    )
  }

  function applyActiveNode(node, { forceCenter = false } = {}) {
    if (!node) {
      clearActive()
      return
    }

    const path = resolveActivePath(node)
    const changed = pathChanged(path)
    const previousRootId = activeRootId.value

    // 换到新的根章节时，解除上一次的手动折叠锁定
    if (path.rootId !== previousRootId) manualClosedRootId = ''

    const rootNode = model.byId.get(path.rootId)
    const canAutoOpen = Boolean(rootNode?.children?.length)
    if (
      canAutoOpen &&
      manualClosedRootId !== rootNode.id &&
      openRootId.value !== rootNode.id
    ) {
      openRootId.value = rootNode.id
    }

    activeNodeId.value = path.nodeId
    activeRootId.value = path.rootId
    activeChildId.value = path.childId
    activeLeafId.value = path.leafId

    if (changed) syncContentHighlight(path)
    if (!changed && !forceCenter) return

    nextTick(() => {
      syncPieces()
      if (forceCenter || changed) scheduleCenter(path.nodeId)
    })
  }

  function buildModel() {
    const root = contentRoot()
    if (!root) {
      model = { tree: [], flat: [], byId: new Map(), skipped: 0 }
      tree.value = []
      hasHeadings.value = false
      measurements = []
      return
    }

    const raw = []
    root.querySelectorAll('h1, h2, h3').forEach((el) => {
      if (el.hasAttribute('data-toc-skip')) return
      if (el.getAttribute('aria-hidden') === 'true') return
      raw.push({
        id: el.id,
        level: Number(el.tagName.charAt(1)),
        text: el.dataset.headingPlainText ?? el.textContent ?? '',
        star: el.dataset.starMarked === '1',
        el,
      })
    })

    model = createTocModel(raw)
    elToNode = new WeakMap()

    model.flat.forEach((node) => {
      if (!node.el) return
      if (node.el.id !== node.id) node.el.id = node.id
      elToNode.set(node.el, node)
    })

    tree.value = model.tree
    hasHeadings.value = model.flat.length > 0
  }

  function resetState() {
    openRootId.value = ''
    manualClosedRootId = ''
    activeNodeId.value = ''
    activeRootId.value = ''
    activeChildId.value = ''
    activeLeafId.value = ''
    progress.value = 0
    scrollTarget = null
    clearContentHighlight()
    hidePieces()
  }

  /**
   * 缓存标题与正文的文档绝对位置。
   * 只在重建、尺寸变化、内容布局变化（习题展开、图片加载等）时调用。
   */
  function measureGeometry() {
    const root = contentRoot()
    if (!root) {
      measurements = []
      rootDocTop = 0
      rootHeight = 0
      return
    }

    const scrollTop = scrollTopNow()
    const rootRect = root.getBoundingClientRect()
    rootDocTop = rootRect.top + scrollTop
    rootHeight = rootRect.height

    const next = []
    model.flat.forEach((node) => {
      const el = node.el
      if (!el || !el.isConnected || !el.getClientRects().length) return
      next.push({ node, top: el.getBoundingClientRect().top + scrollTop })
    })
    measurements = next
  }

  function updateProgress() {
    progress.value = computeReadingProgress({
      rootTop: rootDocTop - scrollTopNow(),
      rootHeight,
      viewportHeight: window.innerHeight,
      navHeight: navHeightCache,
    })
  }

  function measureShortArticle() {
    if (isCompact.value) {
      isShortArticle.value = false
      return
    }

    const article = articleRoot()
    const root = contentRoot()
    if (!article || !root) {
      isShortArticle.value = false
      return
    }

    const rect = article.getBoundingClientRect()
    const available = window.innerHeight - navHeightCache
    isShortArticle.value =
      model.flat.length > 0 &&
      rect.height > 0 &&
      rect.height + SHORT_ARTICLE_GAP <= available
  }

  /**
   * 页面刚打开、还没有任何标题越过判定线时，先把第一个可展开章节打开，
   * 避免移动端目录只剩一排折叠的根节点。
   */
  function ensureDefaultOpen() {
    if (activeNodeId.value || openRootId.value || manualClosedRootId) return
    const first = model.tree.find((node) => node.children?.length)
    if (first) openRootId.value = first.id
  }

  function updateActiveFromScroll(force = false) {
    if (!force && scrollTarget) {
      if (Date.now() > scrollTarget.until) {
        scrollTarget = null
      } else {
        const top = scrollTopNow()
        if (Math.abs(top - scrollTarget.top) <= 2) scrollTarget = null
        else {
          applyActiveNode(scrollTarget.node)
          return
        }
      }
    }

    applyActiveNode(pickActiveNode(measurements, activeLine()))
    ensureDefaultOpen()
  }

  function rowElement(nodeId, selector = '.toc-link') {
    const list = tocListRef.value
    if (!list) return null
    return list.querySelector(`li[data-node-id="${cssEscape(nodeId)}"] ${selector}`)
  }

  function syncPieces() {
    const wrap = listWrapRef.value
    if (!wrap) {
      hidePieces()
      return
    }

    const childNode = activeChildId.value ? model.byId.get(activeChildId.value) : null
    const leafNode = activeLeafId.value ? model.byId.get(activeLeafId.value) : null
    const branchVisible = Boolean(
      childNode && openRootId.value === activeRootId.value,
    )

    if (childNode && branchVisible && indicatorRef.value) {
      const anchor = rowElement(childNode.id)
      const anchorRect = anchor?.getBoundingClientRect()
      const wrapRect = wrap.getBoundingClientRect()
      if (anchorRect && wrapRect) {
        const left = Math.round(anchorRect.left - wrapRect.left - 10)
        const top = Math.round(anchorRect.top - wrapRect.top + wrap.scrollTop - 4)
        const width = Math.max(0, Math.round(wrapRect.width - left - 6))
        const height = Math.round(anchorRect.height + 8)
        Object.assign(indicatorRef.value.style, {
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          opacity: '1',
        })
      } else {
        indicatorRef.value.style.opacity = '0'
      }
    } else if (indicatorRef.value) {
      indicatorRef.value.style.opacity = '0'
    }

    if (leafNode && branchVisible && bugRef.value) {
      const anchor = rowElement(leafNode.id)
      const anchorRect = anchor?.getBoundingClientRect()
      const wrapRect = wrap.getBoundingClientRect()
      if (anchorRect && wrapRect) {
        Object.assign(bugRef.value.style, {
          left: `${Math.max(0, Math.round(anchorRect.left - wrapRect.left - 20))}px`,
          top: `${Math.round(
            anchorRect.top - wrapRect.top + wrap.scrollTop + (anchorRect.height - 18) / 2,
          )}px`,
          opacity: '1',
        })
      } else {
        bugRef.value.style.opacity = '0'
      }
    } else if (bugRef.value) {
      bugRef.value.style.opacity = '0'
    }
  }

  function scheduleCenter(nodeId) {
    if (!nodeId) return
    if (centerRaf) cancelAnimationFrame(centerRaf)

    centerRaf = requestAnimationFrame(() => {
      centerRaf = 0
      const wrap = listWrapRef.value
      if (!wrap || wrap.scrollHeight <= wrap.clientHeight + 2) return

      const anchor = rowElement(nodeId)
      if (!anchor || !anchor.getClientRects().length) return

      const wrapRect = wrap.getBoundingClientRect()
      const anchorRect = anchor.getBoundingClientRect()
      const itemTop = anchorRect.top - wrapRect.top + wrap.scrollTop
      const desired = itemTop - (wrap.clientHeight - anchorRect.height) / 2
      const max = Math.max(0, wrap.scrollHeight - wrap.clientHeight)
      const next = Math.max(0, Math.min(desired, max))
      if (Math.abs(wrap.scrollTop - next) < 2) return
      wrap.scrollTo({
        top: next,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    })
  }

  function toggleRoot(node) {
    if (!node?.children?.length) return

    if (openRootId.value === node.id) {
      openRootId.value = ''
      manualClosedRootId = node.id
    } else {
      openRootId.value = node.id
      manualClosedRootId = ''
    }

    nextTick(() => {
      syncPieces()
      if (openRootId.value === node.id) scheduleCenter(node.id)
    })
  }

  function cancelProgrammaticScroll() {
    scrollTarget = null
  }

  function scrollToNode(node, { instant = false } = {}) {
    if (!node?.el) return

    const top = Math.max(
      0,
      node.el.getBoundingClientRect().top + scrollTopNow() - navHeightCache - SCROLL_TOP_OFFSET,
    )

    scrollTarget = {
      node,
      top,
      until: Date.now() + SCROLL_TARGET_TIMEOUT,
    }

    // 主动跳转时展开目标所在章节，并清掉手动折叠状态
    const rootId = resolveActivePath(node).rootId
    if (rootId) {
      openRootId.value = rootId
      manualClosedRootId = ''
    }

    applyActiveNode(node, { forceCenter: true })

    window.scrollTo({
      top,
      behavior: instant || prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  function refresh() {
    if (!mounted) return
    measureNavHeight()
    measureGeometry()
    measureShortArticle()
    updateProgress()
    updateActiveFromScroll(true)
    syncPieces()
    scheduleCenter(activeLeafId.value || activeChildId.value || activeRootId.value)
  }

  function scheduleGeometryRefresh() {
    clearTimeout(geometryTimer)
    geometryTimer = setTimeout(() => {
      geometryTimer = null
      measureGeometry()
      updateProgress()
      updateActiveFromScroll()
      syncPieces()
    }, GEOMETRY_REFRESH_DELAY)
  }

  function scheduleLayout() {
    if (layoutRaf) return
    layoutRaf = requestAnimationFrame(() => {
      layoutRaf = 0
      measureNavHeight()
      measureGeometry()
      measureShortArticle()
      updateProgress()
      updateActiveFromScroll(true)
      syncPieces()
    })
  }

  function observeLayout() {
    resizeObserver?.disconnect()
    resizeObserver = null
    if (typeof ResizeObserver === 'undefined') return

    const root = contentRoot()
    const article = articleRoot()
    if (!root && !article) return

    resizeObserver = new ResizeObserver(() => scheduleLayout())
    if (root) resizeObserver.observe(root)
    if (article) resizeObserver.observe(article)
  }

  /**
   * 沉浸阅读 / 主题切换只改 body class，不触发 resize，
   * 这里补一个轻量观察器，保证导航高度和判定线能及时更新。
   */
  function observeBodyState() {
    bodyObserver?.disconnect()
    bodyObserver = null
    if (typeof MutationObserver === 'undefined') return

    bodyObserver = new MutationObserver(() => {
      if (mounted) scheduleLayout()
    })
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  function onScroll() {
    if (scrollRaf) return
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0
      updateProgress()
      updateActiveFromScroll()
      scheduleGeometryRefresh()
    })
  }

  function onResize() {
    scrollTarget = null
    scheduleLayout()
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      resizeTimer = null
      measureNavHeight()
      measureShortArticle()
      syncPieces()
    }, 240)
  }

  function onUserScrollIntent(event) {
    if (!scrollTarget) return
    if (event?.type === 'keydown') {
      const key = event.key
      if (
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'PageUp' ||
        key === 'PageDown' ||
        key === 'Home' ||
        key === 'End' ||
        key === ' '
      ) {
        cancelProgrammaticScroll()
      }
      return
    }
    cancelProgrammaticScroll()
  }

  function rebuild() {
    const token = ++rebuildToken
    nextTick(() => {
      if (token !== rebuildToken || !mounted) return
      buildModel()
      resetState()
      observeLayout()
      measureNavHeight()
      measureGeometry()
      measureShortArticle()
      updateProgress()
      updateActiveFromScroll(true)
      syncPieces()
    })
  }

  watch(() => [contentHtml(), contentId()], rebuild, { flush: 'post' })

  watch(isCompact, () => {
    if (!mounted) return
    measureShortArticle()
    syncPieces()
  })

  onMounted(() => {
    mounted = true
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('wheel', onUserScrollIntent, { passive: true })
    window.addEventListener('touchstart', onUserScrollIntent, { passive: true })
    window.addEventListener('keydown', onUserScrollIntent)
    observeBodyState()

    nextTick(() => {
      buildModel()
      resetState()
      observeLayout()
      measureNavHeight()
      measureGeometry()
      measureShortArticle()
      updateProgress()
      updateActiveFromScroll(true)
      syncPieces()
    })
  })

  onUnmounted(() => {
    mounted = false
    rebuildToken += 1
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('wheel', onUserScrollIntent)
    window.removeEventListener('touchstart', onUserScrollIntent)
    window.removeEventListener('keydown', onUserScrollIntent)
    clearTimeout(geometryTimer)
    geometryTimer = null
    clearTimeout(resizeTimer)
    resizeTimer = null
    resizeObserver?.disconnect()
    resizeObserver = null
    bodyObserver?.disconnect()
    bodyObserver = null
    if (scrollRaf) cancelAnimationFrame(scrollRaf)
    if (centerRaf) cancelAnimationFrame(centerRaf)
    if (layoutRaf) cancelAnimationFrame(layoutRaf)
    scrollRaf = 0
    centerRaf = 0
    layoutRaf = 0
    scrollTarget = null
    clearContentHighlight()
  })

  return {
    tree,
    progress,
    openRootId,
    activeNodeId,
    activeRootId,
    activeChildId,
    activeLeafId,
    isShortArticle,
    hasHeadings,
    listWrapRef,
    tocListRef,
    indicatorRef,
    bugRef,
    toggleRoot,
    scrollToNode,
    refresh,
    findNode: (id) => model.byId.get(String(id)) || null,
  }
}
