<!-- SeriesView.vue -->
<template>
  <main class="series-page">
    <section class="series-stage" :data-panel="panelOpen ? 'open' : 'closed'">
      <h1 class="series-page-title">{{ t('series_page_title') }}</h1>

      <!-- 主内容区：点击「查看内容」后陈列所选章节下的各节 -->
      <div class="series-stage__main" ref="contentRef">
        <div v-if="!ready" class="series-stage__state">{{ t('series_loading') }}</div>
        <div v-else-if="seriesList.length === 0" class="series-stage__state">
          {{ t('series_empty') }}
        </div>
        <div v-else-if="selectedSeries && contentVisible" class="series-content">
          <header class="series-content__head">
            <h2 class="series-content__title" ref="contentTitleRef" tabindex="-1">
              {{ selectedSeries.title }}
            </h2>
            <p class="series-content__meta">
              <span>{{ formatCount(selectedSeries.count) }}</span>
              <span v-if="selectedSeries.chapterCount">
                {{ formatChapterCount(selectedSeries.chapterCount) }}
              </span>
              <span v-if="selectedSeries.dateLabel">{{ selectedSeries.dateLabel }}</span>
            </p>
          </header>

          <section class="series-chapter">
            <!-- 所属章（系列未分章时不显示） -->
            <div v-if="hasChapters" class="series-chapter__head">
              <span class="series-chapter__title">{{ activeChapterTitle }}</span>
              <span class="series-chapter__count">{{ formatCount(activePosts.length) }}</span>
            </div>

            <ol class="series-post-list">
              <li v-for="post in activePosts" :key="post.id" class="series-post-item">
                <router-link class="series-post-link" :to="`/blog/${post.id}`">
                  <span class="series-post-link__title">{{ post.title }}</span>
                  <span v-if="post.date" class="series-post-link__date">{{ post.date }}</span>
                </router-link>
              </li>
            </ol>
          </section>
        </div>
      </div>

      <!-- 右侧滑出面板：封面 + 选择章 -->
      <aside
        v-if="selectedSeries"
        id="seriesPanel"
        class="series-panel"
        role="tabpanel"
        :aria-labelledby="`series-tab-${selectedIndex}`"
        :aria-hidden="!panelOpen && isDesktopView ? 'true' : 'false'"
        :data-open="panelOpen ? 'true' : 'false'"
      >
        <button
          type="button"
          class="series-panel__close"
          :aria-label="t('series_panel_close').value"
          @click="closePanel"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>

        <div class="series-panel__inner" :key="selectedSeries.title">
          <div class="series-panel__cover">
            <img :src="coverUrl" :alt="selectedSeries.title" loading="lazy" />
          </div>
          <p class="series-panel__code">{{ selectedSeries.code }}</p>
          <div class="series-panel__head">
            <span class="series-panel__num">{{ selectedSeries.ordinal }}</span>
            <h2 class="series-panel__title">{{ selectedSeries.title }}</h2>
          </div>
          <p class="series-panel__count">{{ formatCount(selectedSeries.count) }}</p>
          <p class="series-panel__sub">{{ selectedSeries.subLabel }}</p>

          <!-- 选择章：点击后主内容区陈列该章下的各节 -->
          <div
            v-if="hasChapters"
            class="series-panel__picker"
            role="group"
            :aria-label="t('series_pick_chapter').value"
          >
            <p class="series-panel__picker-label">{{ t('series_pick_chapter') }}</p>
            <div class="series-pick-list">
              <button
                v-for="(chapter, ci) in selectedSeries.chapters"
                :key="ci"
                type="button"
                class="series-pick"
                :class="{ 'is-active': ci === activeChapterIndex }"
                :aria-pressed="ci === activeChapterIndex ? 'true' : 'false'"
                @click="selectChapter(ci)"
              >
                <span class="series-pick__title">{{ chapterTitle(chapter) }}</span>
                <span class="series-pick__count">{{ formatCount(chapter.posts.length) }}</span>
              </button>
            </div>
          </div>

          <div class="series-panel__foot">
            <button type="button" class="series-cta" @click="revealContents">
              <span class="series-cta__inner">
                <span class="series-cta__label">{{ t('series_view_contents') }}</span>
                <i class="fas fa-arrow-right" aria-hidden="true"></i>
              </span>
            </button>
          </div>
        </div>
      </aside>

      <!-- 底部横向时间轴 -->
      <div v-if="seriesList.length" class="series-dock">
        <div
          ref="dockRef"
          class="series-dock__track"
          :class="{ 'is-dragging': dragging }"
          role="tablist"
          aria-orientation="horizontal"
          :aria-label="t('series_page_title').value"
          @wheel="handleWheel"
          @pointerdown="handleDragStart"
          @pointermove="handleDragMove"
          @pointerup="handleDragEnd"
          @pointercancel="handleDragEnd"
          @keydown="handleTrackKeydown"
        >
          <button
            v-for="(series, index) in seriesList"
            :id="`series-tab-${index}`"
            :key="series.title"
            type="button"
            class="series-node"
            :class="{ 'is-active': index === selectedIndex }"
            role="tab"
            aria-controls="seriesPanel"
            :aria-selected="index === selectedIndex ? 'true' : 'false'"
            :tabindex="index === selectedIndex ? 0 : -1"
            @click="handleNodeClick($event, index)"
          >
            <span class="series-node__top">
              <span class="series-node__num">
                {{ series.ordinal }}
                <i class="fas fa-star series-node__star" aria-hidden="true"></i>
              </span>
              <span class="series-node__title">{{ series.title }}</span>
              <span class="series-node__code">{{ series.code }}</span>
            </span>
            <span class="series-node__rule" aria-hidden="true">
              <span class="series-node__dot"></span>
            </span>
            <span class="series-node__date">{{ series.dateLabel }}</span>
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useSeries } from '@/composables/useSeries'
import { resolveUrl } from '@/utils/url'

// ==================== 配置常量 ====================
const BOOT_PANEL_DELAY = 450 // 首屏延迟打开面板，避开路由过渡
const PANEL_REOPEN_DELAY = 420 // 切换系列后面板重新滑入
const CENTER_REPEAT_DELAYS = [0, 220, 420] // 面板滑入过程中重复校准居中
const DRAG_THRESHOLD = 6 // 超过该位移视为拖拽而非点击
const DRAG_SENSITIVITY = 2 // 拖拽灵敏度（与附件一致）
const DESKTOP_QUERY = '(min-width: 901px)'
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

// ==================== 数据 ====================
const i18n = useI18nStore()
const { t } = i18n
const { seriesList, load } = useSeries()

// ==================== 响应式状态 ====================
const selectedTitle = ref('')
const selectedChapterIndex = ref(0)
const panelOpen = ref(false)
const contentVisible = ref(false)
const dragging = ref(false)
const ready = ref(false)

const dockRef = ref(null)
const contentRef = ref(null)
const contentTitleRef = ref(null)

// ==================== 非响应式状态 ====================
let panelTimer = null
let dragState = null
let justDragged = false
let dragResetTimer = null
let desktopQuery = null

// ==================== 环境判断 ====================
// 命令式判断始终取实时值；isDesktopView 供模板绑定（移动端面板不滑出、始终可见）
const isDesktopView = ref(true)
const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches
const prefersReduced = () => window.matchMedia(REDUCED_QUERY).matches
const slideDelay = (delay) => (isDesktop() && !prefersReduced() ? delay : 0)

// ==================== 计算属性 ====================
const selectedIndex = computed(() => {
  const index = seriesList.value.findIndex((series) => series.title === selectedTitle.value)
  return index < 0 ? 0 : index
})

const selectedSeries = computed(() => seriesList.value[selectedIndex.value] || null)

const coverUrl = computed(() =>
  resolveUrl(selectedSeries.value?.coverImage || 'assets/images/series.png'),
)

// ==================== 章节 ====================
const hasChapters = computed(() => Boolean(selectedSeries.value?.chapters.length))

const activeChapterIndex = computed(() => {
  const total = selectedSeries.value?.chapters.length || 0
  return total === 0 ? 0 : Math.min(selectedChapterIndex.value, total - 1)
})

/** 当前章：系列未分章时退化为「全部文章」的单一分组 */
const activeChapter = computed(() => {
  const series = selectedSeries.value
  if (!series) return null
  if (!series.chapters.length) {
    return { hasChapter: false, title: '', posts: series.posts }
  }
  return series.chapters[activeChapterIndex.value] || null
})

const activePosts = computed(() => activeChapter.value?.posts || [])

// ==================== 文案 ====================
const formatCount = (count) => t('series_post_count', { n: count })
const formatChapterCount = (count) => t('series_chapter_count', { n: count })

const chapterTitle = (chapter) => (chapter?.hasChapter ? chapter.title : t('series_uncategorized'))

const activeChapterTitle = computed(() => chapterTitle(activeChapter.value))

// ==================== 定时器 ====================
const clearPanelTimer = () => {
  if (panelTimer) {
    clearTimeout(panelTimer)
    panelTimer = null
  }
}

const openPanelLater = (delay) => {
  clearPanelTimer()
  panelTimer = setTimeout(() => {
    panelTimer = null
    panelOpen.value = true
  }, slideDelay(delay))
}

// ==================== 时间轴居中 ====================
const centerActive = (smooth = true) => {
  if (!isDesktop() || dragging.value) return

  const track = dockRef.value
  if (!track) return

  const node = track.children[selectedIndex.value]
  if (!node) return

  const panel = track.closest('.series-stage')?.querySelector('.series-panel')
  const panelWidth = panel ? panel.getBoundingClientRect().width : 0
  const visibleWidth = Math.max(1, track.clientWidth - panelWidth)

  const target = node.offsetLeft + node.offsetWidth / 2 - visibleWidth / 2
  const max = Math.max(0, track.scrollWidth - track.clientWidth)
  const left = Math.min(max, Math.max(0, target))

  track.scrollTo({
    left,
    behavior: smooth && !prefersReduced() ? 'smooth' : 'auto',
  })
}

const scheduleCentering = () => {
  if (!isDesktop() || prefersReduced()) {
    centerActive(false)
    return
  }
  CENTER_REPEAT_DELAYS.forEach((delay) => {
    if (delay === 0) {
      centerActive(true)
    } else {
      setTimeout(() => centerActive(true), delay)
    }
  })
}

const focusActiveNode = () => {
  dockRef.value?.children[selectedIndex.value]?.focus({ preventScroll: true })
}

// ==================== 选中与展开 ====================
const selectSeries = (index, viaKeyboard = false) => {
  const target = seriesList.value[index]
  if (!target) return

  clearPanelTimer()

  // 已选中：仅重新打开面板（幂等）
  if (target.title === selectedTitle.value) {
    panelOpen.value = true
    nextTick(() => {
      scheduleCentering()
      if (viaKeyboard) focusActiveNode()
    })
    return
  }

  // 切换系列：面板先收，主内容区重置，再滑入新内容
  panelOpen.value = false
  contentVisible.value = false
  selectedTitle.value = target.title
  selectedChapterIndex.value = 0

  nextTick(() => {
    scheduleCentering()
    if (viaKeyboard) focusActiveNode()
  })

  openPanelLater(PANEL_REOPEN_DELAY)
}

const handleNodeClick = (event, index) => {
  if (justDragged || dragging.value) {
    event?.preventDefault?.()
    return
  }
  selectSeries(index)
}

/** 选章：内容已展开时直接切换（面板保持打开，不重播滑入） */
const selectChapter = (index) => {
  if (index === activeChapterIndex.value) return
  selectedChapterIndex.value = index
  if (contentVisible.value) {
    nextTick(() => contentRef.value?.scrollTo({ top: 0, behavior: 'smooth' }))
  }
}

const revealContents = () => {
  if (!selectedSeries.value) return

  contentVisible.value = true

  nextTick(() => {
    const behavior = prefersReduced() ? 'auto' : 'smooth'
    if (isDesktop()) {
      contentRef.value?.scrollTo({ top: 0, behavior })
    } else {
      contentRef.value?.scrollIntoView({ behavior, block: 'start' })
    }
    contentTitleRef.value?.focus?.({ preventScroll: true })
  })
}

const closePanel = () => {
  clearPanelTimer()
  panelOpen.value = false
}

// ==================== 时间轴：键盘 ====================
const handleTrackKeydown = (event) => {
  const count = seriesList.value.length
  if (count === 0) return

  let next
  if (event.key === 'ArrowRight') next = Math.min(count - 1, selectedIndex.value + 1)
  else if (event.key === 'ArrowLeft') next = Math.max(0, selectedIndex.value - 1)
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = count - 1
  else return

  event.preventDefault()
  if (next === selectedIndex.value) {
    focusActiveNode()
    return
  }
  selectSeries(next, true)
}

// ==================== 时间轴：滚轮横滑 ====================
const handleWheel = (event) => {
  if (!isDesktop()) return
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

  const track = dockRef.value
  if (!track) return

  event.preventDefault()
  const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
  track.scrollLeft += delta
}

// ==================== 时间轴：鼠标拖拽 ====================
const handleDragStart = (event) => {
  if (event.pointerType !== 'mouse') return
  const track = dockRef.value
  if (!track) return

  if (dragResetTimer) {
    clearTimeout(dragResetTimer)
    dragResetTimer = null
  }
  justDragged = false

  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startScroll: track.scrollLeft,
    moved: false,
  }
  dragging.value = true
}

const handleDragMove = (event) => {
  if (!dragState || event.pointerId !== dragState.pointerId) return

  const track = dockRef.value
  if (!track) return

  const delta = event.clientX - dragState.startX
  if (!dragState.moved) {
    if (Math.abs(delta) <= DRAG_THRESHOLD) return
    // 越过阈值才捕获指针：一旦捕获，click 会被重定向到轨道，
    // 放在 pointerdown 会连普通点击的选中一起吃掉
    dragState.moved = true
    track.setPointerCapture?.(event.pointerId)
  }

  track.scrollLeft = dragState.startScroll - delta * DRAG_SENSITIVITY
}

const handleDragEnd = () => {
  if (!dragState) return

  const { pointerId, moved } = dragState
  dragState = null
  dragging.value = false

  const track = dockRef.value
  if (track?.hasPointerCapture?.(pointerId)) {
    track.releasePointerCapture(pointerId)
  }

  if (!moved) return

  // 抑制拖拽结束后紧随其后的 click
  justDragged = true
  dragResetTimer = setTimeout(() => {
    justDragged = false
    dragResetTimer = null
  }, 200)
}

// ==================== 全局键盘 ====================
const handleGlobalKeydown = (event) => {
  if (event.key === 'Escape' && panelOpen.value) closePanel()
}

// ==================== 断点变化 ====================
const handleDesktopChange = (event) => {
  isDesktopView.value = event.matches
  // 回到桌面端时重新校准时间轴位置
  if (event.matches) nextTick(() => centerActive(false))
}

// ==================== 生命周期 ====================
watch(
  seriesList,
  (list) => {
    if (list.length === 0) return

    const exists = list.some((series) => series.title === selectedTitle.value)
    if (exists) return

    // 首次加载或数据变化后重新落位
    selectedTitle.value = list[0].title
    selectedChapterIndex.value = 0
    contentVisible.value = false
    nextTick(() => centerActive(false))
    openPanelLater(BOOT_PANEL_DELAY)
  },
  { immediate: true },
)

onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown)

  desktopQuery = window.matchMedia(DESKTOP_QUERY)
  isDesktopView.value = desktopQuery.matches
  desktopQuery.addEventListener('change', handleDesktopChange)

  if (seriesList.value.length === 0) {
    try {
      await load()
    } finally {
      ready.value = true
    }
  } else {
    // 数据已就绪（例如从其它页面返回）：首次渲染前 centerActive 拿不到轨道，这里补一次
    ready.value = true
    nextTick(() => centerActive(false))
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  desktopQuery?.removeEventListener('change', handleDesktopChange)
  desktopQuery = null
  clearPanelTimer()
  if (dragResetTimer) clearTimeout(dragResetTimer)
})
</script>

<style scoped>
/* ==================== 舞台 ==================== */
/* 导航栏固定 60px，整页为它让出顶部空间 */
.series-page {
  padding-top: 60px;
}

.series-stage {
  position: relative;
  height: calc(100vh - 60px);
  height: calc(100dvh - 60px);
  min-height: 560px;
  overflow: hidden;
  --panel-w: clamp(360px, 38%, 560px);
  --dock-h: 228px;
}

.series-page-title {
  position: absolute;
  top: 80px;
  left: clamp(20px, 4vw, 72px);
  z-index: 3;
  margin: 0;
  font-size: clamp(1.5rem, 2.2vw, 2.1rem);
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #2b3440;
  text-shadow: 0 6px 16px rgba(95, 128, 160, 0.18);
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .series-page-title {
    background: linear-gradient(
      90deg,
      rgba(255, 119, 162, 0.98) 0%,
      rgba(255, 176, 120, 0.96) 24%,
      rgba(136, 223, 170, 0.96) 54%,
      rgba(122, 200, 255, 0.98) 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 4px 10px rgba(255, 255, 255, 0.44))
      drop-shadow(0 10px 20px rgba(95, 128, 160, 0.2));
  }
}

/* ==================== 主内容区 ==================== */
.series-stage__main {
  position: absolute;
  top: 140px;
  left: 0;
  right: var(--panel-w);
  bottom: var(--dock-h);
  z-index: 0;
  padding: 8px clamp(20px, 2.6vw, 48px) 24px clamp(20px, 4vw, 72px);
  overflow-x: hidden;
  overflow-y: auto;
  transition: right 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.series-stage[data-panel='closed'] .series-stage__main {
  right: 0;
}

.series-stage__state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  color: #4e5d6f;
  font-size: 1.05rem;
}

.series-content {
  animation: series-content-enter 460ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.series-content__head {
  margin-bottom: 18px;
}

.series-content__title {
  margin: 0 0 8px;
  font-size: clamp(1.4rem, 1.8vw, 1.9rem);
  line-height: 1.3;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #1e3146;
  text-shadow: 0 2px 8px rgba(49, 80, 109, 0.16);
}

.series-content__title:focus-visible {
  outline: 2px solid rgba(85, 200, 255, 0.72);
  outline-offset: 6px;
  border-radius: 8px;
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .series-content__title {
    background: linear-gradient(
      90deg,
      rgba(255, 120, 168, 0.98) 0%,
      rgba(103, 178, 245, 0.98) 58%,
      rgba(76, 198, 159, 0.98) 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 2px 6px rgba(49, 80, 109, 0.16));
  }
}

.series-content__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  color: #4e5d6f;
  font-size: 0.88rem;
  font-weight: 700;
}

/* ==================== 章节与文章列表 ==================== */
.series-chapter {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.series-chapter__head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px 12px 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: linear-gradient(
    135deg,
    rgba(255, 182, 201, 0.16),
    rgba(154, 215, 255, 0.16),
    rgba(167, 243, 208, 0.16)
  );
}

.series-chapter__head::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 50%;
  width: 4px;
  height: 20px;
  border-radius: 999px;
  transform: translateY(-50%);
  background: linear-gradient(
    180deg,
    rgba(255, 182, 201, 0.95),
    rgba(154, 215, 255, 0.95),
    rgba(167, 243, 208, 0.95)
  );
  box-shadow: 0 2px 8px rgba(95, 128, 160, 0.2);
}

.series-chapter__title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #24415b;
  word-break: break-word;
}

.series-chapter__count {
  flex: 0 0 auto;
  font-size: 0.82rem;
  font-weight: 700;
  color: #5b6d81;
}

.series-post-list {
  counter-reset: series-post-index;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.series-post-item {
  min-width: 0;
  counter-increment: series-post-index;
}

.series-post-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 46px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 10px rgba(44, 62, 80, 0.06);
  color: #2a3b50;
  text-decoration: none;
  line-height: 1.45;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease,
    color 180ms ease;
}

.series-post-link::before {
  content: counter(series-post-index);
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.76rem;
  font-weight: 700;
  color: #31506d;
  background: linear-gradient(
    135deg,
    rgba(255, 182, 201, 0.42),
    rgba(154, 215, 255, 0.38),
    rgba(167, 243, 208, 0.4)
  );
  box-shadow: 0 2px 6px rgba(49, 80, 109, 0.18);
}

.series-post-link__title {
  flex: 1 1 auto;
  min-width: 0;
  word-break: break-word;
}

.series-post-link__date {
  flex: 0 0 auto;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #5b6d81;
}

.series-post-link:hover {
  color: #0f4f80;
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(85, 200, 255, 0.38);
  box-shadow: 0 8px 16px rgba(44, 62, 80, 0.12);
  transform: translateY(-1px);
}

.series-post-link:focus-visible {
  outline: 2px solid rgba(85, 200, 255, 0.7);
  outline-offset: 2px;
}

/* ==================== 右侧滑出面板 ==================== */
.series-panel {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  width: var(--panel-w);
  height: 100%;
  border: 3px solid transparent;
  background:
    linear-gradient(
        150deg,
        rgba(255, 244, 248, 0.94),
        rgba(236, 250, 245, 0.9),
        rgba(236, 246, 255, 0.93)
      )
      padding-box,
    linear-gradient(
        150deg,
        rgba(255, 182, 201, 0.75),
        rgba(167, 243, 208, 0.7),
        rgba(154, 215, 255, 0.75)
      )
      border-box;
  backdrop-filter: blur(16px) saturate(1.06);
  -webkit-backdrop-filter: blur(16px) saturate(1.06);
  box-shadow: -24px 0 48px rgba(44, 62, 80, 0.14);
  transform: translateX(100%);
  visibility: hidden;
  will-change: transform;
  transition:
    transform 0.8s cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0s linear 0.8s;
}

.series-panel[data-open='true'] {
  transform: translateX(0);
  visibility: visible;
  transition:
    transform 0.8s cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0s linear 0s;
}

.series-panel::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -72px;
  width: 72px;
  pointer-events: none;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5));
}

.series-panel__inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: clamp(28px, 5vh, 56px) clamp(22px, 2.6vw, 48px) 0 clamp(24px, 3vw, 56px);
  overflow-y: auto;
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 0.5s ease 0.18s,
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.18s;
}

.series-panel[data-open='true'] .series-panel__inner {
  opacity: 1;
  transform: translateY(0);
}

.series-panel__close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(49, 80, 109, 0.12);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  color: #31506d;
  font-size: 0.9rem;
  cursor: pointer;
  transition:
    background 200ms ease,
    transform 200ms ease;
}

.series-panel__close:hover {
  background: #fff;
  transform: scale(1.06);
}

.series-panel__close:focus-visible {
  outline: 2px solid rgba(85, 200, 255, 0.72);
  outline-offset: 2px;
}

.series-panel__cover {
  height: clamp(140px, 20vh, 220px);
  margin-bottom: 22px;
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.85);
  overflow: hidden;
  box-shadow: 0 12px 26px rgba(44, 62, 80, 0.18);
}

.series-panel__cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.series-panel__code {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: #5b6d81;
}

.series-panel__head {
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.series-panel__num {
  font-size: clamp(40px, 4vw, 64px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  color: #1e3146;
  text-shadow: 0 2px 20px rgba(95, 128, 160, 0.22);
}

.series-panel__title {
  margin: 0;
  font-size: clamp(1.6rem, 2.4vw, 2.5rem);
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #1e3146;
  text-shadow: 0 2px 30px rgba(95, 128, 160, 0.24);
  word-break: break-word;
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .series-panel__title {
    background: linear-gradient(
      90deg,
      rgba(255, 120, 168, 0.98) 0%,
      rgba(103, 178, 245, 0.98) 58%,
      rgba(76, 198, 159, 0.98) 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 2px 6px rgba(49, 80, 109, 0.16));
  }
}

.series-panel__count {
  margin: 10px 0 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #2b3440;
  opacity: 0.9;
}

.series-panel__sub {
  position: relative;
  margin: 6px 0 0;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(49, 80, 109, 0.16);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #4e5d6f;
}

.series-panel__sub::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 182, 201, 0.9), rgba(154, 215, 255, 0.9));
}

/* ==================== 选择章 ==================== */
.series-panel__picker {
  margin-top: 22px;
  min-height: 0;
}

.series-panel__picker-label {
  margin: 0 0 10px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: #5b6d81;
}

.series-pick-list {
  display: grid;
  gap: 8px;
  max-height: clamp(140px, 26vh, 260px);
  padding-right: 4px;
  overflow-y: auto;
}

.series-pick {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.6);
  color: #2a3b50;
  font-family: inherit;
  font-size: 0.94rem;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease,
    color 180ms ease;
}

.series-pick:hover {
  color: #0f4f80;
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(85, 200, 255, 0.38);
  box-shadow: 0 8px 16px rgba(44, 62, 80, 0.12);
  transform: translateY(-1px);
}

.series-pick.is-active {
  color: #0f4f80;
  border-color: rgba(85, 200, 255, 0.55);
  background: linear-gradient(
    135deg,
    rgba(255, 182, 201, 0.24),
    rgba(154, 215, 255, 0.24),
    rgba(167, 243, 208, 0.24)
  );
  box-shadow: 0 6px 14px rgba(85, 200, 255, 0.2);
}

.series-pick:focus-visible {
  outline: 2px solid rgba(85, 200, 255, 0.72);
  outline-offset: 2px;
}

.series-pick__title {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 700;
  word-break: break-word;
}

.series-pick__count {
  flex: 0 0 auto;
  font-size: 0.78rem;
  font-weight: 700;
  color: #5b6d81;
}

.series-panel__foot {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding: 24px 0 30px;
}

/* ==================== 「查看内容」按钮 ==================== */
.series-cta {
  --cut: 14px;
  padding: 2px;
  border: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 182, 201, 0.95),
    rgba(154, 215, 255, 0.95) 55%,
    rgba(167, 243, 208, 0.95)
  );
  clip-path: polygon(
    var(--cut) 0,
    100% 0,
    100% calc(100% - var(--cut)),
    calc(100% - var(--cut)) 100%,
    0 100%,
    0 var(--cut)
  );
  filter: drop-shadow(0 10px 22px rgba(85, 200, 255, 0.32));
  cursor: pointer;
  font-family: inherit;
  transition:
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 320ms ease;
}

.series-cta__inner {
  --cut: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 30px;
  background: rgba(255, 255, 255, 0.92);
  clip-path: polygon(
    var(--cut) 0,
    100% 0,
    100% calc(100% - var(--cut)),
    calc(100% - var(--cut)) 100%,
    0 100%,
    0 var(--cut)
  );
  color: #1e3146;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  white-space: nowrap;
}

.series-cta i {
  transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.series-cta:hover {
  transform: translateY(-2px);
  filter: drop-shadow(0 14px 26px rgba(85, 200, 255, 0.4));
}

.series-cta:hover i {
  transform: translateX(4px);
}

.series-cta:active {
  transform: translateY(0) scale(0.98);
}

.series-cta:focus-visible {
  outline: 2px solid rgba(85, 200, 255, 0.72);
  outline-offset: 4px;
}

/* ==================== 底部时间轴 ==================== */
.series-dock {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  height: var(--dock-h);
  padding-bottom: 34px;
  background: linear-gradient(
    to top,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(255, 255, 255, 0.55) 45%,
    rgba(255, 255, 255, 0) 100%
  );
}

.series-dock__track {
  display: flex;
  align-items: stretch;
  height: 100%;
  /* 右侧留白 = 面板宽 + 半屏：保证最后一个节点也能滚到可见区正中；左侧 18% 让开左下角悬浮按钮 */
  padding: 0 calc(var(--panel-w) + 50%) 0 18%;
  overflow-x: auto;
  overflow-y: hidden;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: pan-x;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.series-dock__track::-webkit-scrollbar {
  display: none;
}

.series-dock__track.is-dragging {
  cursor: grabbing;
}

.series-node {
  flex: 0 0 240px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 16px 6px;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transform-origin: bottom center;
  transition:
    opacity 320ms ease,
    filter 320ms ease,
    transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

.series-node:not(.is-active) {
  opacity: 0.42;
  filter: grayscale(0.35);
  transform: scale(0.9);
}

.series-node:not(.is-active):hover {
  opacity: 0.78;
  filter: grayscale(0.1);
  transform: scale(0.95);
}

.series-node:focus-visible {
  outline: 2px solid rgba(85, 200, 255, 0.72);
  outline-offset: 4px;
  border-radius: 12px;
}

.series-node__top {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 6px;
  height: 118px;
}

.series-node__num {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.02em;
  color: #1e3146;
  font-variant-numeric: tabular-nums;
  transition: font-size 320ms ease;
}

.series-node.is-active .series-node__num {
  font-size: 40px;
}

.series-node__star {
  font-size: 0.68rem;
  color: rgba(49, 80, 109, 0.35);
  transition:
    color 320ms ease,
    text-shadow 320ms ease;
}

.series-node.is-active .series-node__star {
  color: #55c8ff;
  text-shadow: 0 0 12px rgba(85, 200, 255, 0.7);
}

.series-node__title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: 0.02em;
  color: #1e3146;
  transition: font-size 320ms ease;
}

.series-node.is-active .series-node__title {
  font-size: 22px;
}

.series-node__code {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: #4e5d6f;
  opacity: 0.8;
}

.series-node__rule {
  position: relative;
  display: block;
  height: 1px;
  margin-top: 14px;
  background: linear-gradient(
    90deg,
    rgba(49, 80, 109, 0.16),
    rgba(49, 80, 109, 0.3) 50%,
    rgba(49, 80, 109, 0.16)
  );
}

.series-node__dot {
  position: absolute;
  left: 50%;
  top: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(49, 80, 109, 0.28);
  transition:
    width 240ms ease,
    height 240ms ease,
    background 240ms ease,
    border-color 240ms ease,
    box-shadow 240ms ease;
}

.series-node:hover .series-node__dot {
  width: 8px;
  height: 8px;
  background: #fff;
}

.series-node.is-active .series-node__dot {
  width: 8px;
  height: 8px;
  background: #55c8ff;
  border-color: rgba(85, 200, 255, 0.9);
  box-shadow:
    0 0 0 4px rgba(85, 200, 255, 0.18),
    0 0 14px rgba(85, 200, 255, 0.6);
}

.series-node__date {
  margin-top: 10px;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: #5b6d81;
  white-space: nowrap;
}

@keyframes series-content-enter {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ==================== 矮屏适配 ==================== */
@media (max-height: 780px) {
  .series-stage {
    --dock-h: 196px;
  }

  .series-stage__main {
    top: 128px;
  }

  .series-page-title {
    top: 70px;
  }

  .series-node__top {
    height: 96px;
  }
}

/* ==================== 移动端：常规流布局 ==================== */
@media (max-width: 900px) {
  .series-stage {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 60px);
    overflow: visible;
    padding-bottom: 12px;
  }

  .series-page-title {
    position: static;
    order: 1;
    margin: 24px 14px 14px;
    text-align: center;
    font-size: clamp(1.9rem, 8vw, 2.6rem);
  }

  .series-dock {
    position: static;
    order: 2;
    height: auto;
    padding: 0;
    margin-bottom: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(255, 255, 255, 0.42);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .series-dock__track {
    height: auto;
    padding: 16px 14px 10px;
    cursor: auto;
    /* 移动端允许在时间轴上纵向滑页，避免手势被困在横滑容器里 */
    touch-action: auto;
    scrollbar-width: thin;
  }

  .series-dock__track::-webkit-scrollbar {
    display: block;
    height: 6px;
  }

  .series-dock__track::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.35);
    border-radius: 99px;
  }

  .series-dock__track::-webkit-scrollbar-thumb {
    background: rgba(113, 150, 180, 0.58);
    border-radius: 99px;
  }

  .series-node {
    flex: 0 0 168px;
    padding: 0 12px 4px;
  }

  .series-node__top {
    height: auto;
    gap: 4px;
  }

  .series-node__num {
    font-size: 22px;
  }

  .series-node.is-active .series-node__num {
    font-size: 26px;
  }

  .series-node__title {
    font-size: 15px;
  }

  .series-node.is-active .series-node__title {
    font-size: 17px;
  }

  .series-node__rule {
    margin-top: 10px;
  }

  .series-panel {
    position: static;
    order: 3;
    width: auto;
    height: auto;
    margin: 0 14px 16px;
    border-radius: 18px;
    transform: none;
    visibility: visible;
    box-shadow: 0 14px 30px rgba(44, 62, 80, 0.14);
    transition: none;
  }

  .series-panel::before {
    display: none;
  }

  .series-panel__inner {
    height: auto;
    padding: 20px 16px 4px;
    overflow: visible;
    opacity: 1;
    transform: none;
    transition: none;
  }

  .series-panel__close {
    display: none;
  }

  .series-panel__cover {
    height: 150px;
    margin-bottom: 16px;
  }

  /* 移动端面板是常规流卡片，章列表不做内嵌滚动 */
  .series-pick-list {
    max-height: none;
    overflow: visible;
  }

  .series-panel__foot {
    padding: 18px 0 16px;
  }

  .series-cta {
    width: 100%;
  }

  .series-cta__inner {
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    padding: 13px 20px;
  }

  .series-stage__main {
    position: static;
    order: 4;
    padding: 0 14px 20px;
    overflow: visible;
    scroll-margin-top: 72px;
    transition: none;
  }

  .series-stage__state {
    min-height: 30vh;
  }
}

/* ==================== 降低动效 ==================== */
@media (prefers-reduced-motion: reduce) {
  .series-stage__main,
  .series-panel,
  .series-panel__inner,
  .series-node,
  .series-node__num,
  .series-node__title,
  .series-node__dot,
  .series-cta {
    transition: none;
  }

  .series-content {
    animation: none;
  }

  .series-node:not(.is-active) {
    transform: none;
    opacity: 0.55;
  }

  .series-node:not(.is-active):hover {
    transform: none;
  }

  .series-cta:hover,
  .series-cta:active {
    transform: none;
  }

  .series-cta:hover i {
    transform: none;
  }
}

/* 降低动效 + 桌面端：面板直接显隐（移动端面板是常规流卡片，不受此影响） */
@media (prefers-reduced-motion: reduce) and (min-width: 901px) {
  .series-panel {
    transform: none;
  }

  .series-panel[data-open='false'] {
    transform: none;
    visibility: hidden;
  }
}
</style>
