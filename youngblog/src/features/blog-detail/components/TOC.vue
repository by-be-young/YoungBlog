<template>
  <div class="toc-root">
    <nav
      class="blog-toc"
      :class="{
        'toc-collapsed': collapsed,
        'toc-compact': isCompact,
        'in-overlay': isCompact,
        'is-open': overlayOpen,
      }"
      :aria-label="i18n.get('toc')"
    >
      <div class="toc-header">
        <div class="toc-title">{{ i18n.currentTranslations.toc }}</div>
        <div class="toc-header-right">
          <div class="toc-progress">{{ Math.round(progress) }}%</div>
          <button
            v-if="isCompact"
            type="button"
            class="toc-inline-close"
            :aria-label="i18n.get('toc_close')"
            @click="closeOverlay"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div ref="listWrapRef" class="toc-list-wrap">
        <div ref="indicatorRef" class="toc-h2-active-indicator"></div>
        <div ref="bugRef" class="toc-bug" :class="{ idle: !activeH3Id }">
          <img :src="resolveUrl('/assets/images/task/correct.png')" alt="" />
        </div>

        <ul ref="tocListRef" class="toc-list">
          <li
            v-for="h1 in tree"
            :key="h1.id"
            class="toc-h1"
            :data-node-id="h1.id"
          >
            <div class="toc-h1-row">
              <button
                v-if="h1.children.length"
                type="button"
                class="toc-toggle"
                :aria-expanded="openIds.has(h1.id) ? 'true' : 'false'"
                @click="toggleH1(h1)"
              >{{ openIds.has(h1.id) ? '▼' : '▶' }}</button>
              <span v-else class="toc-toggle-spacer" aria-hidden="true"></span>

              <a
                :href="`#${h1.id}`"
                :class="{ 'has-star-marker': h1.star }"
                @click.prevent="scrollToHeader(h1)"
              >
                <span class="toc-item-label">{{ h1.text }}</span>
                <span v-if="h1.star" class="toc-star-marker" aria-hidden="true">★</span>
              </a>
            </div>

            <div
              v-if="h1.children.length"
              class="toc-children"
              :class="{ 'is-open': openIds.has(h1.id) }"
            >
              <ul class="toc-sub-list">
                <li
                  v-for="h2 in h1.children"
                  :key="h2.id"
                  class="toc-h2"
                  :data-node-id="h2.id"
                  :class="{ 'is-active': activeH2Id === h2.id }"
                >
                  <a
                    :href="`#${h2.id}`"
                    :class="{ 'has-star-marker': h2.star }"
                    @click.prevent="scrollToHeader(h2)"
                  >
                    <span class="toc-item-label">{{ h2.text }}</span>
                    <span v-if="h2.star" class="toc-star-marker" aria-hidden="true">★</span>
                  </a>

                  <div v-if="activeH2Id === h2.id && h2.children.length" class="toc-h3-box">
                    <ul class="toc-sub-list toc-h3-sub-list">
                      <li
                        v-for="h3 in h2.children"
                        :key="h3.id"
                        class="toc-h3"
                        :data-node-id="h3.id"
                        :class="{ 'is-active': activeH3Id === h3.id }"
                      >
                        <a
                          :href="`#${h3.id}`"
                          :class="{ 'has-star-marker': h3.star }"
                          @click.prevent="scrollToHeader(h3)"
                        >
                          <span class="toc-item-label">{{ h3.text }}</span>
                          <span v-if="h3.star" class="toc-star-marker" aria-hidden="true">★</span>
                        </a>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="$slots.footer" class="toc-footer">
        <slot name="footer" />
      </div>
    </nav>

    <div
      v-if="isCompact"
      class="toc-overlay"
      :class="{ 'is-active': overlayOpen }"
      @click.self="closeOverlay"
    ></div>

    <Teleport v-if="isCompact && teleportTarget" :to="teleportTarget">
      <button
        type="button"
        class="toc-fab floating-btn"
        :title="i18n.get(overlayOpen ? 'toc_close' : 'toc_open')"
        :aria-expanded="overlayOpen ? 'true' : 'false'"
        :aria-label="i18n.get(overlayOpen ? 'toc_close' : 'toc_open')"
        @click="toggleOverlay"
      >
        <i :class="overlayOpen ? 'fas fa-times' : 'fas fa-list-ul'" aria-hidden="true"></i>
      </button>
    </Teleport>
  </div>
</template>

<script setup>
/**
 * 博客目录
 *
 * 与旧实现相比，本版重写了目录的定位方式：
 * - 目录项与正文标题通过 heading id 一一对应，彻底避免「同名标题只能定位到第一个」
 *   以及把标题文本拼进 CSS 属性选择器导致的引号/特殊字符失效；
 * - 滚动追踪改为「一次遍历所有标题」，不再反复在兄弟节点间爬取，H2/H3 高亮不会互相清除；
 * - 展开态用 `grid-template-rows` 动画，不再手写 max-height 与一串 setTimeout；
 * - 移动端弹层的 body 滚动锁、键盘监听、断点监听都有对称的清理逻辑。
 */
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { resolveUrl } from '@/shared/utils/url'

const props = defineProps({
  /** 文章 HTML；变化时重建目录 */
  contentHtml: { type: String, default: '' },
  /** 正文容器 id；与 BlogContent 的 content-id 对齐 */
  contentId: { type: String, default: 'article-content' },
  /** 整个目录是否折叠 */
  collapsed: { type: Boolean, default: false },
  /** 移动端目录球要注入的悬浮球容器（由父组件在 FloatingControls ready 后传入） */
  fabTarget: { type: Object, default: null },
})

const i18n = useI18nStore()
const route = useRoute()

/* ---------------- 常量 ---------------- */
const COMPACT_QUERY = '(max-width: 1024px)'
const SCROLL_LOCK_MIN_MS = 650
const SCROLL_LOCK_MAX_MS = 2200

/* ---------------- 模板引用 ---------------- */
const listWrapRef = ref(null)
const tocListRef = ref(null)
const indicatorRef = ref(null)
const bugRef = ref(null)

/* ---------------- 目录数据 ---------------- */
const tree = ref([])
const flatNodes = ref([])
const nodeMap = new Map()
const openIds = reactive(new Set())

const progress = ref(0)
const activeH1Id = ref('')
const activeH2Id = ref('')
const activeH3Id = ref('')

let highlightedH2 = null
let highlightedH3 = null
let activeLockUntil = 0
let scrollRaf = 0
let centerRaf = 0
let rebuildTimer = null

/* ---------------- 工具函数 ---------------- */
function contentRoot() {
  const byId = props.contentId ? document.getElementById(props.contentId) : null
  return byId || document.querySelector('.article-content')
}

function parseStar(raw) {
  const text = String(raw || '').trim()
  const starPattern = /(?:【\s*[!！]\s*】|\[\s*[!！]\s*\]|［\s*[!！]\s*］)\s*$/
  return {
    text: text.replace(starPattern, '').trim(),
    star: starPattern.test(text),
  }
}

function getOffsetTop() {
  const nav = document.querySelector('.navbar')
  return (nav?.offsetHeight || 60) + 20
}

function findAncestor(node, level) {
  let current = node
  while (current) {
    if (current.level === level) return current
    current = current.parentId ? nodeMap.get(current.parentId) : null
  }
  return null
}

/* ---------------- 目录生成 ---------------- */
function buildTree() {
  const root = contentRoot()
  if (!root) {
    tree.value = []
    flatNodes.value = []
    nodeMap.clear()
    return
  }

  const result = []
  const flat = []
  const counters = { 1: 0, 2: 0, 3: 0 }
  let currentH1 = null
  let currentH2 = null

  nodeMap.clear()

  root.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const rawText = (heading.textContent || '').trim()
    if (!rawText) return

    const level = Number(heading.tagName[1])
    const parsed = parseStar(rawText)
    const text = heading.dataset.headingPlainText || parsed.text
    const star = heading.dataset.starMarked === '1' || parsed.star

    counters[level] += 1

    let id = (heading.id || '').trim()
    if (!id) {
      id = `toc-h${level}-${counters[level]}`
      heading.id = id
    }

    const node = {
      id,
      level,
      text,
      star,
      el: heading,
      children: [],
      parentId: null,
    }
    flat.push(node)
    nodeMap.set(id, node)

    if (level === 1) {
      currentH1 = node
      currentH2 = null
      result.push(node)
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

  tree.value = result
  flatNodes.value = flat
}

function resetActive() {
  activeH1Id.value = ''
  activeH2Id.value = ''
  activeH3Id.value = ''
  openIds.clear()
  syncHeadingHighlight('h2', null)
  syncHeadingHighlight('h3', null)
  hidePieces()
}

function hidePieces() {
  if (indicatorRef.value) indicatorRef.value.style.opacity = '0'
  if (bugRef.value) bugRef.value.style.opacity = '0'
}

/* ---------------- 展开 / 折叠 ---------------- */
function toggleH1(node) {
  const wasOpen = openIds.has(node.id)
  openIds.clear()
  if (!wasOpen) openIds.add(node.id)
  nextTick(() => {
    positionPieces()
    if (wasOpen) return
    scheduleCenter(node.id)
  })
}

function openH1(id) {
  if (!id) return
  if (!openIds.has(id)) {
    openIds.clear()
    openIds.add(id)
  }
}

/* ---------------- 激活状态 ---------------- */
function syncHeadingHighlight(level, node) {
  const previous = level === 'h2' ? highlightedH2 : highlightedH3
  if (previous?.el) previous.el.classList.remove('is-toc-active')

  if (node?.el) node.el.classList.add('is-toc-active')

  if (level === 'h2') highlightedH2 = node || null
  else highlightedH3 = node || null
}

function applyActive(h1Node, h2Node, h3Node) {
  const nextH2Id = h2Node?.id || ''
  const nextH3Id = h3Node?.id || ''
  const h2Changed = nextH2Id !== activeH2Id.value
  const h3Changed = nextH3Id !== activeH3Id.value

  if (h1Node) openH1(h1Node.id)
  activeH1Id.value = h1Node?.id || ''
  activeH2Id.value = nextH2Id
  activeH3Id.value = nextH3Id

  if (h2Changed) syncHeadingHighlight('h2', h2Node || null)
  if (h3Changed || h2Changed) syncHeadingHighlight('h3', h3Node || null)

  if (!h2Changed && !h3Changed) return

  nextTick(() => {
    positionPieces()
    if (h2Node) scheduleCenter(h2Node.id)
    else scheduleCenter(h3Node?.id)
  })
}

function clearActiveIfNeeded() {
  if (!activeH1Id.value && !activeH2Id.value && !activeH3Id.value) return
  activeH1Id.value = ''
  activeH2Id.value = ''
  activeH3Id.value = ''
  syncHeadingHighlight('h2', null)
  syncHeadingHighlight('h3', null)
  hidePieces()
}

/* ---------------- 滚动追踪 ---------------- */
function updateProgress() {
  const root = contentRoot()
  if (!root) return

  const rect = root.getBoundingClientRect()
  const offset = getOffsetTop()
  const viewport = Math.max(window.innerHeight - offset, 1)

  if (rect.height <= viewport) {
    progress.value = rect.top < window.innerHeight ? 100 : 0
    return
  }

  const passed = Math.max(0, offset - rect.top)
  const total = Math.max(rect.height - viewport, 1)
  progress.value = Math.min(100, Math.max(0, (passed / total) * 100))
}

function updateActiveFromScroll() {
  if (Date.now() < activeLockUntil) return

  const nodes = flatNodes.value
  if (!nodes.length) {
    clearActiveIfNeeded()
    return
  }

  // 点击定位会把标题落在 offset 附近；追踪阈值放宽 28px，
  // 避免平滑滚动停在上方几像素时，刚点过的标题反而不被判定为当前章节。
  const offset = getOffsetTop() + 28
  let current = null

  for (const node of nodes) {
    if (node.el.getBoundingClientRect().top <= offset) current = node
    else break
  }

  if (!current) {
    clearActiveIfNeeded()
    return
  }

  let h1Node
  let h2Node = null
  let h3Node = null

  if (current.level === 1) {
    h1Node = current
  } else if (current.level === 2) {
    h2Node = current
    h1Node = findAncestor(current, 1)
  } else {
    h3Node = current
    h2Node = findAncestor(current, 2)
    h1Node = h2Node ? findAncestor(h2Node, 1) : null
  }

  applyActive(h1Node, h2Node, h3Node)
}

function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    updateProgress()
    updateActiveFromScroll()
  })
}

/* ---------------- 指示器与滚动居中 ---------------- */
function positionPieces() {
  const wrap = listWrapRef.value
  const list = tocListRef.value
  const indicator = indicatorRef.value
  const bug = bugRef.value
  if (!wrap || !list) return

  const activeH2Node = activeH2Id.value ? nodeMap.get(activeH2Id.value) : null
  const h2Visible = Boolean(activeH2Node && openIds.has(activeH2Node.parentId))

  if (activeH2Id.value && indicator && h2Visible) {
    const anchor = list.querySelector(`.toc-h2[data-node-id="${activeH2Id.value}"] > a`)
    if (anchor?.isConnected) {
      const wrapRect = wrap.getBoundingClientRect()
      const anchorRect = anchor.getBoundingClientRect()
      const left = Math.round(anchorRect.left - wrapRect.left - 10)
      const top = Math.round(anchorRect.top - wrapRect.top + wrap.scrollTop - 4)
      const width = Math.max(0, Math.round(wrapRect.width - left - 6))
      const height = Math.round(anchorRect.height + 8)

      if ([left, top, width, height].every(Number.isFinite)) {
        indicator.style.left = `${left}px`
        indicator.style.top = `${top}px`
        indicator.style.width = `${width}px`
        indicator.style.height = `${height}px`
        indicator.style.opacity = '1'
      }
    } else {
      indicator.style.opacity = '0'
    }
  } else if (indicator) {
    indicator.style.opacity = '0'
  }

  if (activeH3Id.value && bug && h2Visible) {
    const anchor = list.querySelector(`.toc-h3[data-node-id="${activeH3Id.value}"] > a`)
    if (anchor?.isConnected) {
      const wrapRect = wrap.getBoundingClientRect()
      const anchorRect = anchor.getBoundingClientRect()
      const left = Math.round(anchorRect.left - wrapRect.left - 26)
      const top = Math.round(
        anchorRect.top - wrapRect.top + wrap.scrollTop + (anchorRect.height - 18) / 2,
      )
      bug.style.left = `${left}px`
      bug.style.top = `${top}px`
      bug.style.opacity = '1'
    } else {
      bug.style.opacity = '0'
    }
  } else if (bug) {
    bug.style.opacity = '0'
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

    const anchor = list.querySelector(`li[data-node-id="${id}"] > a`)
    if (!anchor || !anchor.isConnected || !anchor.getClientRects().length) return

    const wrapRect = wrap.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const itemTop = anchorRect.top - wrapRect.top + wrap.scrollTop
    const desired = itemTop - (wrap.clientHeight - anchorRect.height) / 2
    const max = Math.max(0, wrap.scrollHeight - wrap.clientHeight)
    const next = Math.max(0, Math.min(desired, max))

    if (Math.abs(wrap.scrollTop - next) < 2) return
    wrap.scrollTo({ top: next, behavior: 'smooth' })
  })
}

/* ---------------- 点击跳转 ---------------- */
function scrollToHeader(node) {
  if (!node?.el) return

  const offset = getOffsetTop() + 10
  const y = node.el.getBoundingClientRect().top + window.scrollY - offset
  const distance = Math.abs(y - window.scrollY)
  activeLockUntil =
    Date.now() +
    Math.max(SCROLL_LOCK_MIN_MS, Math.min(Math.round(distance * 0.9), SCROLL_LOCK_MAX_MS))

  if (node.level === 1) {
    applyActive(node, null, null)
  } else if (node.level === 2) {
    applyActive(findAncestor(node, 1), node, null)
  } else {
    const h2Node = findAncestor(node, 2)
    applyActive(h2Node ? findAncestor(h2Node, 1) : null, h2Node, node)
  }

  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
  closeOverlay()
}

/* ---------------- 紧凑模式与弹层 ---------------- */
const isCompact = ref(false)
const overlayOpen = ref(false)
const fallbackFabTarget = ref(null)

const teleportTarget = computed(() => props.fabTarget || fallbackFabTarget.value)

let compactQuery = null
let bodyOverflowBeforeLock = ''
let bodyOverflowLocked = false

const onCompactMediaChange = (event) => {
  isCompact.value = event.matches
  if (!event.matches) closeOverlay()
}

function openOverlay() {
  if (overlayOpen.value) return
  overlayOpen.value = true
  bodyOverflowBeforeLock = document.body.style.overflow
  bodyOverflowLocked = true
  document.body.style.overflow = 'hidden'
  document.body.classList.add('toc-overlay-open')
  window.addEventListener('keydown', onOverlayKeyDown)
}

function closeOverlay() {
  overlayOpen.value = false
  if (bodyOverflowLocked) {
    document.body.style.overflow = bodyOverflowBeforeLock
    bodyOverflowBeforeLock = ''
    bodyOverflowLocked = false
  }
  document.body.classList.remove('toc-overlay-open')
  window.removeEventListener('keydown', onOverlayKeyDown)
}

function toggleOverlay() {
  if (overlayOpen.value) closeOverlay()
  else openOverlay()
}

function onOverlayKeyDown(event) {
  if (event.key === 'Escape') closeOverlay()
}

watch(() => route.fullPath, closeOverlay)

/* ---------------- 目录球定位 ---------------- */
function placeFab() {
  const group = teleportTarget.value
  if (!group) return
  const fab = group.querySelector('.toc-fab')
  const control = group.querySelector('.control-btn')
  if (!fab || !control) return
  if (fab.nextElementSibling !== control) group.insertBefore(fab, control)
}

watch([isCompact, teleportTarget], async () => {
  await nextTick()
  placeFab()
})

/* ---------------- 重建调度 ---------------- */
function scheduleRebuild() {
  clearTimeout(rebuildTimer)
  rebuildTimer = setTimeout(async () => {
    buildTree()
    resetActive()
    await nextTick()
    updateProgress()
    updateActiveFromScroll()
  }, 80)
}

watch(() => [props.contentHtml, props.contentId], scheduleRebuild, { flush: 'post' })

/* ---------------- 生命周期 ---------------- */
function onResize() {
  positionPieces()
  updateProgress()
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)

  if (typeof window.matchMedia === 'function') {
    compactQuery = window.matchMedia(COMPACT_QUERY)
    isCompact.value = compactQuery.matches
    compactQuery.addEventListener('change', onCompactMediaChange)
  }

  if (!props.fabTarget) {
    fallbackFabTarget.value = document.getElementById('floating-controls')
  }

  await nextTick()
  buildTree()
  resetActive()
  updateProgress()
  updateActiveFromScroll()
  positionPieces()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  compactQuery?.removeEventListener('change', onCompactMediaChange)
  compactQuery = null
  closeOverlay()
  clearTimeout(rebuildTimer)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  if (centerRaf) cancelAnimationFrame(centerRaf)
  scrollRaf = 0
  centerRaf = 0
})
</script>

<style scoped>
/* ==================== 整体容器 ==================== */
.blog-toc {
  position: sticky;
  top: 100px;
  align-self: flex-start;
  width: 300px;
  flex: 0 0 300px;
  height: calc(100vh - 140px);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  font-size: 1.08rem;
  border-radius: 24px;
  border: 2px solid transparent;
  box-shadow: var(--detail-shadow, 0 18px 44px rgba(23, 34, 47, 0.12));
  transition: width 0.25s;
  background:
    linear-gradient(rgba(253, 249, 242, 0.92), rgba(253, 247, 238, 0.88)) padding-box,
    var(
      --detail-border,
      linear-gradient(
        135deg,
        rgba(255, 182, 201, 0.95),
        rgba(199, 182, 255, 0.9),
        rgba(167, 243, 208, 0.92)
      )
    )
      border-box;
}

/* ==================== 头部 ==================== */
.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.toc-title {
  font-weight: bold;
  font-size: 1.08rem;
  color: var(--detail-text, #17222f);
}

.toc-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toc-inline-close {
  display: none;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid rgba(23, 34, 47, 0.1);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  color: #6b7785;
  font-size: 0.82rem;
  line-height: 1;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.toc-inline-close:focus-visible {
  outline: 2px solid rgba(0, 172, 255, 0.55);
  outline-offset: 2px;
}

.toc-progress {
  font-weight: 700;
  font-size: 1rem;
  line-height: 1;
  color: #c84070;
  font-variant-numeric: tabular-nums;
}

/* ==================== 列表滚动区 ==================== */
.toc-list-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.toc-list-wrap::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.toc-list {
  position: relative;
  z-index: 1;
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-list li {
  margin-bottom: 7px;
}

/* ==================== 底部 ==================== */
.toc-footer {
  flex: 0 0 auto;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(23, 34, 47, 0.08);
}

/* ==================== H1 ==================== */
.toc-h1 {
  position: relative;
}

.toc-h1-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toc-h1-row > a {
  min-width: 0;
  font-weight: bold;
  font-size: 1.08rem;
  color: rgba(23, 34, 47, 0.82);
}

/* ==================== 展开 / 折叠 ==================== */
.toc-toggle {
  flex: 0 0 16px;
  width: 16px;
  height: 24px;
  padding: 0;
  border: 0;
  background: none;
  color: #9aa4b2;
  font-family: inherit;
  font-size: 0.82em;
  line-height: 24px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.toc-toggle:hover {
  color: #2d8cf0;
}

.toc-toggle:focus-visible {
  outline: 2px solid rgba(0, 172, 255, 0.5);
  outline-offset: 1px;
  border-radius: 4px;
}

.toc-toggle-spacer {
  flex: 0 0 16px;
  width: 16px;
}

.toc-children {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.22s ease;
}

.toc-children.is-open {
  grid-template-rows: 1fr;
}

.toc-children > .toc-sub-list {
  min-height: 0;
  overflow: hidden;
}

/* ==================== 子列表 ==================== */
.toc-sub-list {
  list-style: none;
  padding-left: 18px;
  margin: 0;
}

.toc-h3-box {
  overflow: hidden;
}

.toc-h3-sub-list {
  padding-left: 18px;
}

/* ==================== H2 ==================== */
.toc-h2 {
  position: relative;
}

.toc-h2 > a {
  position: relative;
  z-index: 1;
  display: inline-block;
  margin-left: 12px;
  font-size: 1rem;
  color: rgba(23, 34, 47, 0.56);
}

.toc-h2.is-active > a {
  color: #376657;
  font-weight: 600;
}

/* ==================== H3 ==================== */
.toc-h3 {
  position: relative;
}

.toc-h3 > a {
  position: relative;
  z-index: 1;
  display: inline-block;
  margin-left: 12px;
  font-size: 0.95rem;
  color: rgba(124, 90, 41, 0.78);
}

.toc-h3 > a:hover {
  color: #7c5a29;
}

.toc-h3.is-active > a {
  color: #7c5a29;
  font-weight: 600;
}

/* ==================== 链接通用 ==================== */
.toc-list a {
  text-decoration: none;
  transition: color 0.2s ease;
}

.toc-list a:hover {
  text-decoration: underline;
}

.toc-list .toc-h3 > a:hover {
  color: #7c5a29;
}

/* ==================== 星标 ==================== */
.toc-list a.has-star-marker {
  display: inline-block;
  padding-right: 22px;
}

.toc-item-label {
  min-width: 0;
}

.toc-star-marker {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #c9a35a;
  font-size: 0.95em;
  line-height: 1;
  text-shadow: 0 0 8px rgba(201, 163, 90, 0.18);
}

/* ==================== H2 活动指示器 ==================== */
.toc-h2-active-indicator {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  z-index: 0;
  background: rgba(145, 200, 176, 0.34);
  border-radius: 10px;
  pointer-events: none;
  opacity: 0;
  transform: translateY(0);
  transition:
    transform 0.18s ease,
    left 0.18s ease,
    width 0.18s ease,
    height 0.18s ease,
    opacity 0.16s ease;
}

/* ==================== H3 小虫 ==================== */
.toc-bug {
  position: absolute;
  left: 0;
  top: 0;
  width: 18px;
  height: 18px;
  z-index: 3;
  pointer-events: none;
  opacity: 0;
  transform-origin: center center;
  transition:
    left 0.2s cubic-bezier(0.2, 0.9, 0.2, 1),
    top 0.2s cubic-bezier(0.2, 0.9, 0.2, 1),
    opacity 0.16s ease,
    transform 0.6s ease;
}

.toc-bug img {
  display: block;
  width: 100%;
  height: 100%;
}

@keyframes toc-bug-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-4px);
  }
}

.toc-bug.idle {
  animation: toc-bug-float 3s ease-in-out infinite;
}

/* ==================== 折叠状态 ==================== */
.blog-toc.toc-collapsed {
  width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  min-width: 0 !important;
  flex: 0 0 0 !important;
  overflow: hidden;
  opacity: 0;
  transition:
    width 0.28s ease,
    opacity 0.28s ease,
    padding 0.28s ease,
    flex 0.28s ease;
}

/* ==================== 紧凑模式与弹层 ==================== */
.toc-root {
  display: contents;
}

.toc-overlay {
  position: fixed;
  inset: 0;
  z-index: 1098;
  background: rgba(24, 40, 52, 0.42);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.26s ease;
}

.toc-overlay.is-active {
  opacity: 1;
  pointer-events: auto;
}

/* 弹层打开时隐藏右侧悬浮工具组，避免按钮压住底部分页 */
:global(body.toc-overlay-open #floating-controls) {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(18px) scale(0.96) !important;
}

#floating-controls .toc-fab {
  width: var(--fab-size, 48px);
  height: var(--fab-size, 48px);
  padding: 0;
  font-size: var(--fab-icon-size, 1.2rem);
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .toc-inline-close {
    display: inline-flex;
  }

  .blog-toc.in-overlay {
    position: fixed;
    top: auto;
    left: 50%;
    bottom: max(12px, env(safe-area-inset-bottom, 0px));
    align-self: center;
    width: min(92vw, 420px);
    max-width: 92vw;
    height: auto;
    max-height: min(72vh, 640px);
    max-height: min(72dvh, 640px);
    margin: 0;
    padding: 16px calc(18px + env(safe-area-inset-right, 0px))
      calc(16px + env(safe-area-inset-bottom, 0px)) calc(18px + env(safe-area-inset-left, 0px));
    z-index: 1099;
    overflow: hidden;
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, 24px) scale(0.98);
    transform-origin: 50% 100%;
    will-change: transform, opacity;
    transition:
      transform 0.3s cubic-bezier(0.2, 0.82, 0.22, 1),
      opacity 0.22s ease;
  }

  .blog-toc.in-overlay.is-open {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, 0) scale(1);
  }

  .blog-toc.in-overlay .toc-list-wrap {
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    min-height: min(120px, 22vh);
    min-height: min(120px, 22dvh);
  }

  .blog-toc.in-overlay .toc-footer {
    max-height: 30vh;
    max-height: 30dvh;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
}

@media (max-width: 1024px) and (orientation: landscape) and (max-height: 560px) {
  .blog-toc.in-overlay {
    top: 50%;
    bottom: auto;
    max-height: min(84vh, 640px);
    max-height: min(84dvh, 640px);
    transform: translate(-50%, -50%) scale(0.94);
    transform-origin: 50% 50%;
  }

  .blog-toc.in-overlay.is-open {
    transform: translate(-50%, -50%) scale(1);
  }
}

@media (min-width: 721px) and (max-width: 1024px) {
  .blog-toc.in-overlay {
    top: 50%;
    bottom: auto;
    width: min(560px, 78vw);
    max-width: 78vw;
    max-height: min(84vh, 640px);
    max-height: min(84dvh, 640px);
    padding: 18px 22px;
    transform: translate(-50%, -50%) scale(0.94);
    transform-origin: 50% 50%;
  }

  .blog-toc.in-overlay.is-open {
    transform: translate(-50%, -50%) scale(1);
  }

  .blog-toc.in-overlay .toc-h1-row > a {
    font-size: 1.16rem;
  }

  .blog-toc.in-overlay .toc-h2 > a {
    font-size: 1.08rem;
  }

  .blog-toc.in-overlay .toc-h3 > a {
    font-size: 1.02rem;
  }

  .blog-toc.in-overlay .toc-h1-row > a,
  .blog-toc.in-overlay .toc-h2 > a,
  .blog-toc.in-overlay .toc-h3 > a {
    line-height: 40px;
  }

  .blog-toc.in-overlay .toc-toggle {
    flex-basis: 32px;
    width: 32px;
    min-width: 32px;
    min-height: 32px;
    padding: 4px;
    line-height: 24px;
  }
}

/* 沉浸模式兜底：弹层已打开时仍允许显示 */
.blog-detail-page.immersive-reading-active:not(.immersive-mobile-mode) .toc-fab {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.blog-detail-page.immersive-reading-active .blog-toc.in-overlay.is-open {
  display: flex;
}

@media (prefers-reduced-motion: reduce) {
  .toc-overlay,
  .blog-toc.in-overlay,
  .toc-children {
    transition: none !important;
  }

  .toc-bug.idle {
    animation: none;
  }
}
</style>
