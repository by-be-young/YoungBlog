<template>
  <div class="toc-root">
    <div
      class="toc-rail"
      :class="{
        'toc-collapsed': collapsed,
        'is-short-article': isShortArticle && !isCompact,
      }"
    >
      <nav
        id="blog-toc-panel"
        ref="navRef"
        class="blog-toc"
        :class="{
          'toc-collapsed': collapsed,
          'toc-compact': isCompact,
          'in-overlay': isCompact,
          'is-open': overlayOpen,
        }"
        :aria-label="i18n.get('toc')"
        :role="isCompact && overlayOpen ? 'dialog' : undefined"
        :aria-modal="isCompact && overlayOpen ? 'true' : undefined"
        :aria-hidden="isCompact && !overlayOpen ? 'true' : undefined"
        :inert="isCompact && !overlayOpen ? true : null"
      >
        <div class="toc-header">
          <div class="toc-title">{{ i18n.currentTranslations.toc }}</div>
          <div class="toc-header-right">
            <div class="toc-progress" :title="`${Math.round(progress)}%`">
              {{ Math.round(progress) }}%
            </div>
            <button
              v-if="isCompact"
              type="button"
              class="toc-inline-close"
              :aria-label="i18n.get('toc_close')"
              @click="closeOverlay()"
            >
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div ref="listWrapRef" class="toc-list-wrap">
          <div ref="indicatorRef" class="toc-h2-active-indicator"></div>
          <div ref="bugRef" class="toc-bug" :class="{ idle: !activeLeafId }">
            <img :src="resolveUrl('/assets/images/task/correct.png')" alt="" />
          </div>

          <p v-if="showEmpty" class="toc-empty">{{ i18n.get('toc_empty') }}</p>

          <ul v-else ref="tocListRef" class="toc-list">
            <li
              v-for="root in tree"
              :key="root.id"
              class="toc-section"
              :class="{ 'is-section': activeRootId === root.id }"
              :data-node-id="root.id"
            >
              <div class="toc-root-row">
                <button
                  v-if="root.children.length"
                  type="button"
                  class="toc-toggle"
                  :aria-expanded="openRootId === root.id ? 'true' : 'false'"
                  :aria-controls="branchId(root.id)"
                  :aria-label="toggleLabel(root)"
                  @click.stop="toggleRoot(root)"
                >{{ openRootId === root.id ? '▼' : '▶' }}</button>
                <span v-else class="toc-toggle-spacer" aria-hidden="true"></span>

                <a
                  :href="sectionHref(root)"
                  class="toc-link toc-link--root"
                  :class="{ 'has-star-marker': root.star }"
                  :aria-current="activeNodeId === root.id ? 'location' : undefined"
                  @click="selectNode($event, root)"
                >
                  <span class="toc-item-label">{{ root.text }}</span>
                  <span v-if="root.star" class="toc-star-marker" aria-hidden="true">★</span>
                </a>
              </div>

              <div
                v-if="root.children.length"
                :id="branchId(root.id)"
                class="toc-children"
                :class="{ 'is-open': openRootId === root.id }"
                :aria-hidden="openRootId === root.id ? undefined : 'true'"
                :inert="openRootId === root.id ? null : true"
              >
                <ul class="toc-sub-list">
                  <li
                    v-for="child in root.children"
                    :key="child.id"
                    class="toc-node"
                    :class="{
                      'is-active': activeChildId === child.id,
                      'is-current': activeNodeId === child.id,
                      'is-h3': child.level > 2,
                    }"
                    :data-node-id="child.id"
                  >
                    <a
                      :href="sectionHref(child)"
                      class="toc-link toc-link--child"
                      :class="{ 'has-star-marker': child.star }"
                      :aria-current="activeNodeId === child.id ? 'location' : undefined"
                      @click="selectNode($event, child)"
                    >
                      <span class="toc-item-label">{{ child.text }}</span>
                      <span v-if="child.star" class="toc-star-marker" aria-hidden="true">★</span>
                    </a>

                    <div
                      v-if="activeChildId === child.id && child.children.length"
                      class="toc-leaf-box"
                    >
                      <ul class="toc-sub-list toc-leaf-list">
                        <li
                          v-for="leaf in child.children"
                          :key="leaf.id"
                          class="toc-leaf"
                          :class="{ 'is-current': activeNodeId === leaf.id }"
                          :data-node-id="leaf.id"
                        >
                          <a
                            :href="sectionHref(leaf)"
                            class="toc-link toc-link--leaf"
                            :class="{ 'has-star-marker': leaf.star }"
                            :aria-current="activeNodeId === leaf.id ? 'location' : undefined"
                            @click="selectNode($event, leaf)"
                          >
                            <span class="toc-item-label">{{ leaf.text }}</span>
                            <span
                              v-if="leaf.star"
                              class="toc-star-marker"
                              aria-hidden="true"
                            >★</span>
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
    </div>

    <div
      v-if="isCompact"
      class="toc-overlay"
      :class="{ 'is-active': overlayOpen }"
      @click.self="closeOverlay()"
    ></div>

    <Teleport v-if="isCompact && teleportTarget" :to="teleportTarget">
      <button
        type="button"
        class="toc-fab floating-btn"
        :title="i18n.get(overlayOpen ? 'toc_close' : 'toc_open')"
        aria-controls="blog-toc-panel"
        :aria-expanded="overlayOpen ? 'true' : 'false'"
        :aria-label="i18n.get(overlayOpen ? 'toc_close' : 'toc_open')"
        @click="toggleOverlay($event)"
      >
        <i :class="overlayOpen ? 'fas fa-times' : 'fas fa-list-ul'" aria-hidden="true"></i>
      </button>
    </Teleport>
  </div>
</template>

<script setup>
/**
 * 博客目录视图
 *
 * 数据、滚动追踪、短文章布局交给 useBlogToc；
 * 本组件只负责渲染、移动端弹层、焦点管理与悬浮球位置。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogToc } from '@/features/blog-detail/composables/useBlogToc'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { resolveUrl } from '@/shared/utils/url'

const props = defineProps({
  /** 文章 HTML；变化时重建目录 */
  contentHtml: { type: String, default: '' },
  /** 正文容器 id；与 BlogContent 的 content-id 对齐 */
  contentId: { type: String, default: 'article-content' },
  /** 整个目录是否折叠 */
  collapsed: { type: Boolean, default: false },
  /** 移动端目录球要注入的悬浮球容器 */
  fabTarget: { type: Object, default: null },
})

const i18n = useI18nStore()
const route = useRoute()
const router = useRouter()

const COMPACT_QUERY = '(max-width: 1024px)'
const initialCompact =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(COMPACT_QUERY).matches
    : false

const isCompact = ref(initialCompact)
const overlayOpen = ref(false)
const fallbackFabTarget = ref(null)
const hydrated = ref(false)
const navRef = ref(null)

const {
  tree,
  progress,
  openRootId,
  activeNodeId,
  activeRootId,
  activeChildId,
  activeLeafId,
  isShortArticle,
  listWrapRef,
  tocListRef,
  indicatorRef,
  bugRef,
  toggleRoot,
  scrollToNode,
  refresh,
  findNode,
} = useBlogToc({
  contentHtml: () => props.contentHtml,
  contentId: () => props.contentId,
  isCompact,
})

const teleportTarget = computed(() => props.fabTarget || fallbackFabTarget.value)
const showEmpty = computed(() => hydrated.value && tree.value.length === 0)

const branchId = (id) => `toc-branch-${id}`
const hrefCache = new Map()

function sectionHref(node) {
  const key = `${route.fullPath}\u0000${node.id}`
  if (hrefCache.has(key)) return hrefCache.get(key)

  try {
    const href = router.resolve({
      path: route.path,
      query: { ...route.query, section: node.id },
    }).href
    hrefCache.set(key, href)
    return href
  } catch {
    return `#/blog/${route.params.id || ''}`
  }
}

function toggleLabel(node) {
  const key = openRootId.value === node.id ? 'toc_collapse' : 'toc_expand'
  return `${i18n.get(key)} · ${node.text}`
}

function selectNode(event, node) {
  // 允许 Ctrl / Cmd / Shift / 中键走浏览器原生行为（新标签打开深链）。
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return
  }

  event.preventDefault()
  scrollToNode(node)
  closeOverlay()
}

let compactQuery = null
let bodyOverflowBeforeLock = ''
let bodyOverflowLocked = false
let previousFocus = null
let lastSectionKey = ''

function focusableItems() {
  const nav = navRef.value
  if (!nav) return []
  return Array.from(nav.querySelectorAll('a[href], button:not([disabled])')).filter(
    (el) =>
      el.getClientRects().length > 0 &&
      el.tabIndex !== -1 &&
      !el.closest('[inert]'),
  )
}

function focusInitialItem() {
  const nav = navRef.value
  if (!nav) return
  const current =
    nav.querySelector('a[aria-current="location"]') || nav.querySelector('.toc-link')
  current?.focus({ preventScroll: true })
}

function trapFocus(event) {
  const items = focusableItems()
  if (!items.length) return

  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement

  if (!active || !items.includes(active)) {
    event.preventDefault()
    first.focus({ preventScroll: true })
    return
  }

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus({ preventScroll: true })
    return
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus({ preventScroll: true })
  }
}

function onOverlayKeyDown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeOverlay()
    return
  }

  if (event.key === 'Tab') trapFocus(event)
}

function openOverlay(trigger = null) {
  if (overlayOpen.value) return

  previousFocus = trigger || document.activeElement
  overlayOpen.value = true
  bodyOverflowBeforeLock = document.body.style.overflow
  bodyOverflowLocked = true
  document.body.style.overflow = 'hidden'
  document.body.classList.add('toc-overlay-open')
  window.addEventListener('keydown', onOverlayKeyDown)

  nextTick(() => {
    refresh()
    focusInitialItem()
  })
}

function closeOverlay({ restoreFocus = true } = {}) {
  const wasOpen = overlayOpen.value
  overlayOpen.value = false

  if (bodyOverflowLocked) {
    document.body.style.overflow = bodyOverflowBeforeLock
    bodyOverflowBeforeLock = ''
    bodyOverflowLocked = false
  }

  document.body.classList.remove('toc-overlay-open')
  window.removeEventListener('keydown', onOverlayKeyDown)

  const trigger =
    previousFocus?.closest?.('.toc-fab') ||
    document.querySelector('.toc-fab') ||
    previousFocus
  previousFocus = null

  if (wasOpen && restoreFocus && trigger?.focus) {
    nextTick(() => {
      if (trigger.isConnected) trigger.focus({ preventScroll: true })
    })
  }
}

function toggleOverlay(event) {
  if (overlayOpen.value) closeOverlay()
  else openOverlay(event?.currentTarget || null)
}

function onCompactMediaChange(event) {
  isCompact.value = event.matches
  if (!event.matches) closeOverlay({ restoreFocus: false })
}

function placeFab() {
  const group = teleportTarget.value
  if (!group) return

  const fab = group.querySelector('.toc-fab')
  const control = group.querySelector('.control-btn')
  if (!fab) return

  if (control) {
    if (fab.nextElementSibling !== control) group.insertBefore(fab, control)
    return
  }

  if (fab.parentElement !== group) group.appendChild(fab)
}

function applySectionFromRoute() {
  const section = typeof route.query.section === 'string' ? route.query.section : ''
  if (!section) {
    lastSectionKey = ''
    return
  }

  const key = `${route.fullPath}|${section}`
  if (key === lastSectionKey) return

  const node = findNode(section)
  if (!node) return

  lastSectionKey = key
  nextTick(() => scrollToNode(node, { instant: true }))
}

watch(
  () => route.fullPath,
  async () => {
    closeOverlay({ restoreFocus: false })
    lastSectionKey = ''
    await nextTick()
    applySectionFromRoute()
  },
)

watch(tree, async () => {
  await nextTick()
  hydrated.value = true
  applySectionFromRoute()
})

watch([isCompact, teleportTarget], async () => {
  await nextTick()
  placeFab()
})

onMounted(async () => {
  if (typeof window.matchMedia === 'function') {
    compactQuery = window.matchMedia(COMPACT_QUERY)
    isCompact.value = compactQuery.matches
    compactQuery.addEventListener('change', onCompactMediaChange)
  }

  if (!props.fabTarget) {
    fallbackFabTarget.value = document.getElementById('floating-controls')
  }

  await nextTick()
  hydrated.value = true
  placeFab()
  applySectionFromRoute()
})

onUnmounted(() => {
  compactQuery?.removeEventListener('change', onCompactMediaChange)
  compactQuery = null
  closeOverlay({ restoreFocus: false })
  window.removeEventListener('keydown', onOverlayKeyDown)
})
</script>

<style scoped>
/* ==================== 布局轨道 ==================== */
.toc-root {
  display: contents;
}

.toc-rail {
  position: relative;
  flex: 0 0 300px;
  width: 300px;
  min-width: 0;
  align-self: stretch;
  transition:
    width 0.25s ease,
    flex-basis 0.25s ease;
}

.toc-rail.toc-collapsed {
  flex-basis: 0;
  width: 0;
  overflow: hidden;
}

/* ==================== 整体容器 ==================== */
.blog-toc {
  position: sticky;
  top: 100px;
  width: 100%;
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

/* 正文很短、整页不需要滚动时，固定高度会从容器顶部溢出。
   此时让目录按内容高度收起，并在视口中垂直居中。 */
.toc-rail.is-short-article .blog-toc {
  position: fixed;
  top: 50%;
  left: auto;
  right: auto;
  width: 300px;
  height: auto;
  max-height: calc(100vh - 180px);
  margin: 0;
  transform: translateY(-50%);
  z-index: 3;
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

.toc-empty {
  margin: 14px 0 0;
  color: rgba(23, 34, 47, 0.45);
  font-size: 0.92rem;
}

/* ==================== 底部 ==================== */
.toc-footer {
  flex: 0 0 auto;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(23, 34, 47, 0.08);
}

/* ==================== 根节点 ==================== */
.toc-section {
  position: relative;
}

.toc-root-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toc-root-row .toc-link {
  min-width: 0;
  font-weight: bold;
  font-size: 1.08rem;
  color: rgba(23, 34, 47, 0.82);
}

.toc-section.is-section .toc-link {
  color: #376657;
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

.toc-leaf-box {
  overflow: hidden;
}

.toc-leaf-list {
  padding-left: 18px;
}

/* ==================== 二级节点 ==================== */
.toc-node {
  position: relative;
}

.toc-node .toc-link {
  position: relative;
  z-index: 1;
  display: inline-block;
  margin-left: 12px;
  font-size: 1rem;
  color: rgba(23, 34, 47, 0.56);
}

.toc-node.is-h3 .toc-link {
  font-size: 0.95rem;
  color: rgba(124, 90, 41, 0.78);
}

.toc-node.is-active .toc-link,
.toc-node.is-current .toc-link {
  color: #376657;
  font-weight: 600;
}

.toc-node.is-h3.is-active .toc-link,
.toc-node.is-h3.is-current .toc-link {
  color: #7c5a29;
}

/* ==================== 三级节点 ==================== */
.toc-leaf {
  position: relative;
}

.toc-leaf .toc-link {
  position: relative;
  z-index: 1;
  display: inline-block;
  margin-left: 12px;
  font-size: 0.95rem;
  color: rgba(124, 90, 41, 0.78);
}

.toc-leaf .toc-link:hover {
  color: #7c5a29;
}

.toc-leaf.is-current .toc-link {
  color: #7c5a29;
  font-weight: 600;
}

/* ==================== 链接通用 ==================== */
.toc-link {
  position: relative;
  text-decoration: none;
  transition: color 0.2s ease;
}

.toc-list a:hover {
  text-decoration: underline;
}

.toc-link:focus-visible {
  outline: 2px solid rgba(0, 172, 255, 0.45);
  outline-offset: 2px;
  border-radius: 4px;
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

/* ==================== 二级活动指示器 ==================== */
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

/* ==================== 三级小虫 ==================== */
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
  overflow: hidden;
  opacity: 0;
  transition:
    width 0.28s ease,
    opacity 0.28s ease,
    padding 0.28s ease;
}

/* ==================== 紧凑模式与弹层 ==================== */
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
  pointer-events: none !important;
  transform: translateY(18px) scale(0.96) !important;
}

/* App.vue 里还有一组全局快捷控制，弹层打开时同样隐藏，避免压住目录 */
:global(body.toc-overlay-open .floating-controls-container) {
  opacity: 0 !important;
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
  .toc-rail {
    display: contents;
  }

  .toc-inline-close {
    display: inline-flex;
  }

  .blog-toc.in-overlay {
    position: fixed;
    top: auto;
    left: 50%;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
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

  .blog-toc.in-overlay .toc-root-row .toc-link {
    font-size: 1.16rem;
  }

  .blog-toc.in-overlay .toc-node .toc-link {
    font-size: 1.08rem;
  }

  .blog-toc.in-overlay .toc-leaf .toc-link {
    font-size: 1.02rem;
  }

  .blog-toc.in-overlay .toc-root-row .toc-link,
  .blog-toc.in-overlay .toc-node .toc-link,
  .blog-toc.in-overlay .toc-leaf .toc-link {
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
  .toc-children,
  .toc-rail {
    transition: none !important;
  }

  .toc-bug.idle {
    animation: none !important;
  }
}
</style>
