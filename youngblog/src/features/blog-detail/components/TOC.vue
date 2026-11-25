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
                  :aria-expanded="openH1Id === h1.id ? 'true' : 'false'"
                  @click.stop="toggleH1(h1)"
                >{{ openH1Id === h1.id ? '▼' : '▶' }}</button>
                <span v-else class="toc-toggle-spacer" aria-hidden="true"></span>

                <a
                  :href="`#${h1.id}`"
                  :class="{ 'has-star-marker': h1.star }"
                  :aria-current="
                    activeH1Id === h1.id && !activeH2Id ? 'location' : undefined
                  "
                  @click.prevent="selectNode(h1)"
                >
                  <span class="toc-item-label">{{ h1.text }}</span>
                  <span v-if="h1.star" class="toc-star-marker" aria-hidden="true">★</span>
                </a>
              </div>

              <div
                v-if="h1.children.length"
                class="toc-children"
                :class="{ 'is-open': openH1Id === h1.id }"
              >
                <ul class="toc-sub-list">
                  <li
                    v-for="h2 in h1.children"
                    :key="h2.id"
                    class="toc-h2"
                    :class="{ 'is-active': activeH2Id === h2.id }"
                    :data-node-id="h2.id"
                  >
                    <a
                      :href="`#${h2.id}`"
                      :class="{ 'has-star-marker': h2.star }"
                      :aria-current="activeH2Id === h2.id ? 'location' : undefined"
                      @click.prevent="selectNode(h2)"
                    >
                      <span class="toc-item-label">{{ h2.text }}</span>
                      <span v-if="h2.star" class="toc-star-marker" aria-hidden="true">★</span>
                    </a>

                    <div
                      v-if="activeH2Id === h2.id && h2.children.length"
                      class="toc-h3-box"
                    >
                      <ul class="toc-sub-list toc-h3-sub-list">
                        <li
                          v-for="h3 in h2.children"
                          :key="h3.id"
                          class="toc-h3"
                          :class="{ 'is-active': activeH3Id === h3.id }"
                          :data-node-id="h3.id"
                        >
                          <a
                            :href="`#${h3.id}`"
                            :class="{ 'has-star-marker': h3.star }"
                            :aria-current="activeH3Id === h3.id ? 'location' : undefined"
                            @click.prevent="selectNode(h3)"
                          >
                            <span class="toc-item-label">{{ h3.text }}</span>
                            <span
                              v-if="h3.star"
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
 * 博客目录视图
 *
 * 目录的数据、滚动追踪、短文章布局都交给 useBlogToc；
 * 本组件只负责渲染、紧凑弹层和悬浮球位置。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
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

const COMPACT_QUERY = '(max-width: 1024px)'

const isCompact = ref(false)
const overlayOpen = ref(false)
const fallbackFabTarget = ref(null)

const {
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
} = useBlogToc({
  contentHtml: () => props.contentHtml,
  contentId: () => props.contentId,
  isCompact,
})

const teleportTarget = computed(() => props.fabTarget || fallbackFabTarget.value)

let compactQuery = null
let bodyOverflowBeforeLock = ''
let bodyOverflowLocked = false

function selectNode(node) {
  scrollToNode(node)
  closeOverlay()
}

function openOverlay() {
  if (overlayOpen.value) return

  overlayOpen.value = true
  bodyOverflowBeforeLock = document.body.style.overflow
  bodyOverflowLocked = true
  document.body.style.overflow = 'hidden'
  document.body.classList.add('toc-overlay-open')
  window.addEventListener('keydown', onOverlayKeyDown)

  nextTick(() => refresh())
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

function onCompactMediaChange(event) {
  isCompact.value = event.matches
  if (!event.matches) closeOverlay()
}

function placeFab() {
  const group = teleportTarget.value
  if (!group) return

  const fab = group.querySelector('.toc-fab')
  const control = group.querySelector('.control-btn')
  if (!fab || !control) return
  if (fab.nextElementSibling !== control) group.insertBefore(fab, control)
}

watch(() => route.fullPath, closeOverlay)

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
  placeFab()
})

onUnmounted(() => {
  compactQuery?.removeEventListener('change', onCompactMediaChange)
  compactQuery = null
  closeOverlay()
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
    bottom: max(12px, env(safe-area-inset-bottom, 0px));
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
  .toc-children,
  .toc-rail {
    transition: none !important;
  }

  .toc-bug.idle {
    animation: none;
  }
}
</style>
