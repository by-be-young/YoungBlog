<!-- SeriesView.vue -->
<template>
  <main class="series-page">
    <section class="series-section">
      <h1 class="series-page-title">{{ t('series_page_title') }}</h1>
      <div class="series-layout">
        <div 
          class="series-list" 
          id="seriesList" 
          ref="seriesListRef"
          @wheel="handleWheel"
        >
          <div v-if="isLoading" class="loading-text">{{ t('loading') || '加载中...' }}</div>
          <div v-else-if="seriesList.length === 0" class="series-empty" id="seriesEmpty">
            {{ t('series_empty') }}
          </div>
          <article
            v-else
            v-for="(series, index) in seriesList"
            :key="series.title"
            class="series-card"
            :style="{ '--series-delay': `${index * 70}ms` }"
            :data-open="isOpen === series.title ? 'true' : 'false'"
            :data-phase="isOpen === series.title ? 'revealed' : 'closed'"
            role="button"
            tabindex="0"
            :aria-expanded="isOpen === series.title ? 'true' : 'false'"
            @click="handleCardClick($event, series.title)"
            @keydown="handleCardKeydown($event, series.title)"
            @pointerdown="handlePointerDown($event, series.title)"
            @pointerup="handlePointerUp($event, series.title)"
            @pointercancel="handlePointerCancel($event, series.title)"
            @pointerleave="handlePointerLeave($event, series.title)"
          >
            <div class="series-card-shell">
              <div class="series-card-left">
                <div class="series-cover-wrap">
                  <img 
                    class="series-cover" 
                    :src="series.coverImage" 
                    :alt="series.title"
                    loading="lazy"
                  >
                </div>
                <div class="series-meta">
                  <h2 class="series-name">{{ series.title }}</h2>
                  <p class="series-count">{{ formatSeriesCount(series.posts.length) }}</p>
                </div>
                <span class="series-expand-icon" aria-hidden="true">
                  <i class="fas fa-chevron-right"></i>
                </span>
              </div>
              <div class="series-card-right">
                <!-- 有章节时渲染章节结构 -->
                <template v-if="series.chapters && series.chapters.length > 0">
                  <div class="series-chapters">
                    <section
                      v-for="(chapter, ci) in series.chapters"
                      :key="ci"
                      class="series-chapter"
                      :style="{ '--chapter-delay': `${ci * 50}ms` }"
                      :data-open="isChapterOpen(series.title, ci) ? 'true' : 'false'"
                    >
                      <button 
                        type="button" 
                        class="series-chapter-toggle"
                        @click.stop="toggleChapter(series.title, ci)"
                      >
                        <span class="series-chapter-title">{{ chapter.title }}</span>
                        <span class="series-chapter-count">{{ formatSeriesCount(chapter.posts.length) }}</span>
                        <i class="fas fa-chevron-down" aria-hidden="true"></i>
                      </button>
                      <div 
                        class="series-chapter-body"
                        :style="{
                          maxHeight: isChapterOpen(series.title, ci) ? `${CHAPTER_BODY_HEIGHT}px` : '0px',
                          opacity: isChapterOpen(series.title, ci) ? '1' : '0',
                          overflowY: isChapterOpen(series.title, ci) ? 'auto' : 'hidden'
                        }"
                        ref="chapterBodyRefs"
                      >
                        <ol class="series-post-list">
                          <li
                            v-for="(post, pi) in chapter.posts"
                            :key="post.id"
                            class="series-post-item"
                            :style="{ '--series-item-delay': `${pi * 70}ms` }"
                          >
                            <router-link 
                              class="series-post-link" 
                              :to="`/blog/${post.id}`"
                              @click.stop
                            >
                              {{ post.title }}
                            </router-link>
                          </li>
                        </ol>
                      </div>
                    </section>
                  </div>
                </template>
                <!-- 无章节时直接渲染文章列表 -->
                <ol v-else class="series-post-list series-post-list--flat">
                  <li
                    v-for="(post, pi) in series.posts"
                    :key="post.id"
                    class="series-post-item"
                    :style="{ '--series-item-delay': `${pi * 70}ms` }"
                  >
                    <router-link 
                      class="series-post-link" 
                      :to="`/blog/${post.id}`"
                      @click.stop
                    >
                      {{ post.title }}
                    </router-link>
                  </li>
                </ol>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'

const { t } = useI18nStore()
const blogStore = useBlogStore()

// ==================== 配置常量 ====================
const CHAPTER_BODY_HEIGHT = 260
const EXPAND_REVEAL_DELAY = 380
const CLICK_RESTORE_DELAY = 260
const CHAPTER_OPEN_SCROLL_DELAY = 320

// ==================== 响应式状态 ====================
const isLoading = ref(false)
const isOpen = ref(null) // 当前打开的系列标题
const openChapters = ref({}) // { seriesTitle: Set<chapterIndex> }
const touchHoverCards = ref(new Set())
const revealTimers = ref(new Map())
const clickRestoreTimers = ref(new Map())
const touchHoverTimers = ref(new Map())
const chapterScrollTimers = ref(new Map())
const seriesListRef = ref(null)
const chapterBodyRefs = ref([])

// ==================== 工具函数 ====================
const isDesktopView = () => window.matchMedia('(min-width: 901px)').matches

const formatSeriesCount = (count) => {
  return t('series_post_count', { n: count }) || `${count}篇`
}

const escapeHtml = (value) => {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
  return String(value).replace(/[&<>"]/g, ch => map[ch] || ch)
}

// ==================== 数据规范化 ====================
const normalizeChapter = (value) => {
  return (typeof value === 'string' && value.trim()) ? value.trim() : ''
}

const parseChapter = (value) => {
  const raw = normalizeChapter(value)
  if (!raw) {
    return { raw: '', order: Infinity, title: '未分章', hasChapter: false }
  }
  const match = raw.match(/^(\d+)\s*-\s*(.+)$/)
  if (match) {
    return { raw, order: Number(match[1]), title: match[2].trim(), hasChapter: true }
  }
  return { raw, order: Infinity, title: raw, hasChapter: true }
}

const normalizeOrder = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value)
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }
  return null
}

const compareSeriesPosts = (a, b) => {
  const aChapter = parseChapter(a?.chapter)
  const bChapter = parseChapter(b?.chapter)

  if (aChapter.hasChapter || bChapter.hasChapter) {
    if (aChapter.hasChapter && !bChapter.hasChapter) return -1
    if (!aChapter.hasChapter && bChapter.hasChapter) return 1
    if (aChapter.order !== bChapter.order) return aChapter.order - bChapter.order
    if (aChapter.title !== bChapter.title) return aChapter.title.localeCompare(bChapter.title, 'zh-CN')
  }

  const aHasOrder = Number.isFinite(a?.order)
  const bHasOrder = Number.isFinite(b?.order)

  if (aHasOrder && bHasOrder) {
    if (a.order !== b.order) return a.order - b.order
    return new Date(b.date) - new Date(a.date)
  }
  if (aHasOrder && !bHasOrder) return -1
  if (!aHasOrder && bHasOrder) return 1

  return new Date(b.date) - new Date(a.date)
}

const groupPostsByChapter = (posts) => {
  if (!Array.isArray(posts) || posts.length === 0) return []

  const hasAnyChapter = posts.some(post => parseChapter(post?.chapter).hasChapter)
  if (!hasAnyChapter) return []

  const chapterMap = new Map()

  posts.forEach(post => {
    if (!post || typeof post !== 'object') return
    const chapterInfo = parseChapter(post.chapter)
    const key = chapterInfo.raw || '__uncategorized__'
    if (!chapterMap.has(key)) {
      chapterMap.set(key, {
        raw: chapterInfo.raw,
        title: chapterInfo.title,
        order: chapterInfo.order,
        hasChapter: chapterInfo.hasChapter,
        posts: []
      })
    }
    chapterMap.get(key).posts.push(post)
  })

  return Array.from(chapterMap.values())
    .sort((a, b) => {
      if (a.hasChapter || b.hasChapter) {
        if (a.hasChapter && !b.hasChapter) return -1
        if (!a.hasChapter && b.hasChapter) return 1
        if (a.order !== b.order) return a.order - b.order
        if (a.title !== b.title) return a.title.localeCompare(b.title, 'zh-CN')
      }
      return 0
    })
    .map(chapter => ({
      chapter: chapter.raw,
      title: chapter.title,
      order: chapter.order,
      hasChapter: chapter.hasChapter,
      posts: [...chapter.posts].sort(compareSeriesPosts)
    }))
}

const getLatestSeriesTimestamp = (series) => {
  if (!series) return 0
  const posts = series.posts || []
  let latest = 0
  posts.forEach(post => {
    const timestamp = new Date(post?.date).getTime()
    if (Number.isFinite(timestamp) && timestamp > latest) {
      latest = timestamp
    }
  })
  return latest
}

// ==================== 计算属性 ====================
const seriesList = computed(() => {
  const blogs = blogStore.blogs || []
  if (blogs.length === 0) return []

  const map = new Map()

  blogs.forEach(blog => {
    if (!blog || typeof blog !== 'object') return
    const seriesName = (typeof blog.series === 'string' && blog.series.trim()) ? blog.series.trim() : ''
    if (!seriesName) return

    if (!map.has(seriesName)) {
      map.set(seriesName, {
        title: seriesName,
        coverImage: 'assets/images/series.png',
        posts: []
      })
    }

    const id = Number(blog.id)
    if (!Number.isFinite(id)) return

    map.get(seriesName).posts.push({
      id,
      title: (typeof blog.title === 'string' && blog.title.trim()) ? blog.title.trim() : t('series_untitled_post', '未命名文章'),
      date: typeof blog.date === 'string' ? blog.date : '',
      order: normalizeOrder(blog.order),
      chapter: normalizeChapter(blog.chapter),
      contentFile: typeof blog.contentFile === 'string' ? blog.contentFile : ''
    })
  })

  return Array.from(map.values())
    .map(series => {
      const sortedPosts = [...series.posts].sort(compareSeriesPosts)
      const chapters = groupPostsByChapter(sortedPosts)
      return {
        ...series,
        posts: chapters.length > 0 ? chapters.flatMap(c => c.posts) : sortedPosts,
        chapters
      }
    })
    .sort((a, b) => {
      const diff = getLatestSeriesTimestamp(b) - getLatestSeriesTimestamp(a)
      if (diff !== 0) return diff
      return a.title.localeCompare(b.title, 'zh-CN')
    })
})

// ==================== 交互方法 ====================
const isChapterOpen = (seriesTitle, chapterIndex) => {
  return openChapters.value[seriesTitle]?.has(chapterIndex) || false
}

const toggleChapter = (seriesTitle, chapterIndex) => {
  if (!openChapters.value[seriesTitle]) {
    openChapters.value[seriesTitle] = new Set()
  }

  // 关闭其他章节（只保留当前点击的章节）
  const newSet = new Set()
  if (!openChapters.value[seriesTitle].has(chapterIndex)) {
    newSet.add(chapterIndex)
  }
  openChapters.value[seriesTitle] = newSet

  // 滚动到章节顶部
  nextTick(() => {
    const chapterEl = document.querySelector(
      `.series-card[data-open="true"] .series-chapter[data-open="true"]`
    )
    if (chapterEl) {
      const rightEl = chapterEl.closest('.series-card-right')
      if (rightEl) {
        const chapterRect = chapterEl.getBoundingClientRect()
        const rightRect = rightEl.getBoundingClientRect()
        const paddingTop = parseFloat(getComputedStyle(rightEl).paddingTop || '0') || 0
        const targetTop = rightEl.scrollTop + (chapterRect.top - rightRect.top) - paddingTop
        rightEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
      }
    }
  })
}

const closeCard = (seriesTitle) => {
  if (!seriesTitle) return

  // 清除定时器
  const revealTimer = revealTimers.value.get(seriesTitle)
  if (revealTimer) {
    clearTimeout(revealTimer)
    revealTimers.value.delete(seriesTitle)
  }
  const clickTimer = clickRestoreTimers.value.get(seriesTitle)
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickRestoreTimers.value.delete(seriesTitle)
  }

  // 关闭所有章节
  if (openChapters.value[seriesTitle]) {
    openChapters.value[seriesTitle] = new Set()
  }

  if (isOpen.value === seriesTitle) {
    isOpen.value = null
  }

  // 移除触摸悬停
  touchHoverCards.value.delete(seriesTitle)
}

const toggleSeries = (seriesTitle) => {
  if (isOpen.value === seriesTitle) {
    closeCard(seriesTitle)
    return
  }

  // 关闭其他卡片
  if (isOpen.value) {
    closeCard(isOpen.value)
  }

  // 清除旧的 reveal 定时器
  const oldTimer = revealTimers.value.get(seriesTitle)
  if (oldTimer) {
    clearTimeout(oldTimer)
    revealTimers.value.delete(seriesTitle)
  }

  isOpen.value = seriesTitle
  openChapters.value[seriesTitle] = new Set()

  // 延迟触发 reveal 状态
  const timer = setTimeout(() => {
    if (isOpen.value === seriesTitle) {
      // 状态已更新，无需额外操作
    }
  }, EXPAND_REVEAL_DELAY)
  revealTimers.value.set(seriesTitle, timer)

  // 滚动到卡片中心（桌面端）
  nextTick(() => {
    scheduleCentering(seriesTitle)
  })
}

const handleCardClick = (event, seriesTitle) => {
  // 点击内部链接或章节切换按钮时不触发卡片切换
  if (event.target?.closest?.('.series-post-link') || event.target?.closest?.('.series-chapter-toggle')) {
    return
  }

  // 带恢复动画的切换
  if (isOpen.value === seriesTitle) {
    // 关闭时直接关闭
    closeCard(seriesTitle)
    return
  }

  // 打开时先恢复动画
  const cardEl = event.currentTarget
  cardEl.classList.add('is-restoring')

  const timer = setTimeout(() => {
    cardEl.classList.remove('is-restoring')
    toggleSeries(seriesTitle)
  }, CLICK_RESTORE_DELAY)
  clickRestoreTimers.value.set(seriesTitle, timer)
}

const handleCardKeydown = (event, seriesTitle) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    // 模拟点击
    const cardEl = event.currentTarget
    handleCardClick({ target: cardEl, currentTarget: cardEl }, seriesTitle)
  }
}

// ===== 触摸悬停效果 =====
const handlePointerDown = (event, seriesTitle) => {
  if (event.pointerType !== 'touch') return
  if (isOpen.value === seriesTitle) return

  const timer = touchHoverTimers.value.get(seriesTitle)
  if (timer) {
    clearTimeout(timer)
    touchHoverTimers.value.delete(seriesTitle)
  }
  touchHoverCards.value.add(seriesTitle)
}

const handlePointerUp = (event, seriesTitle) => {
  if (event.pointerType !== 'touch') return
  clearTouchHover(seriesTitle, 120)
}

const handlePointerCancel = (event, seriesTitle) => {
  if (event.pointerType !== 'touch') return
  clearTouchHover(seriesTitle)
}

const handlePointerLeave = (event, seriesTitle) => {
  if (event.pointerType !== 'touch') return
  clearTouchHover(seriesTitle)
}

const clearTouchHover = (seriesTitle, delay = 0) => {
  const timer = touchHoverTimers.value.get(seriesTitle)
  if (timer) {
    clearTimeout(timer)
    touchHoverTimers.value.delete(seriesTitle)
  }

  if (delay > 0) {
    const newTimer = setTimeout(() => {
      touchHoverCards.value.delete(seriesTitle)
      touchHoverTimers.value.delete(seriesTitle)
    }, delay)
    touchHoverTimers.value.set(seriesTitle, newTimer)
  } else {
    touchHoverCards.value.delete(seriesTitle)
  }
}

// ===== 滚动居中 =====
const scheduleCentering = (seriesTitle) => {
  if (!isDesktopView()) return

  const cardEl = document.querySelector(`.series-card[data-open="true"]`)
  if (!cardEl || !seriesListRef.value) return

  const scrollCardIntoCenter = (smooth = true) => {
    const maxScrollLeft = Math.max(0, seriesListRef.value.scrollWidth - seriesListRef.value.clientWidth)
    const target = cardEl.offsetLeft - (seriesListRef.value.clientWidth - cardEl.offsetWidth) / 2
    const clamped = Math.min(maxScrollLeft, Math.max(0, target))
    seriesListRef.value.scrollTo({
      left: clamped,
      behavior: smooth ? 'smooth' : 'auto'
    })
  }

  scrollCardIntoCenter(true)
  requestAnimationFrame(() => scrollCardIntoCenter(true))
  setTimeout(() => scrollCardIntoCenter(true), 220)
  setTimeout(() => scrollCardIntoCenter(true), 420)
}

// ===== 横向滚动（鼠标滚轮） =====
const handleWheel = (event) => {
  if (!isDesktopView()) return
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
  if (event.target?.closest?.('.series-card-right')) return

  event.preventDefault()
  if (seriesListRef.value) {
    seriesListRef.value.scrollBy({ left: event.deltaY, behavior: 'auto' })
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  if (!blogStore.blogs || blogStore.blogs.length === 0) {
    isLoading.value = true
    blogStore.fetchBlogs().finally(() => {
      isLoading.value = false
    })
  }
})

// ==================== 样式辅助 ====================
// 为章节 body 添加 ref 以便在展开时滚动
const setChapterBodyRef = (el) => {
  if (el) {
    chapterBodyRefs.value.push(el)
  }
}
</script>

<style scoped>
/* ==================== 系列页布局与卡片样式 ==================== */
.series-section {
  padding-top: 80px;
  padding-bottom: 36px;
  padding-left: 20px;
  padding-right: 20px;
}

.series-page-title {
  margin: 0 0 18px;
  text-align: center;
  font-size: clamp(2.35rem, 5.2vw, 3.9rem);
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #2b3440;
  text-shadow: 0 6px 16px rgba(95, 128, 160, 0.18);
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .series-page-title {
    background: linear-gradient(90deg,
        rgba(255, 119, 162, 0.98) 0%,
        rgba(255, 176, 120, 0.96) 24%,
        rgba(136, 223, 170, 0.96) 54%,
        rgba(122, 200, 255, 0.98) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 4px 10px rgba(255, 255, 255, 0.44)) drop-shadow(0 10px 20px rgba(95, 128, 160, 0.2));
  }
}

.series-layout {
  max-width: 1240px;
  margin: 0 auto;
  position: relative;
  padding: 14px;
}

.series-layout>* {
  position: relative;
  z-index: 0;
}

.series-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.series-card {
  position: relative;
  border-radius: 20px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 16px 32px rgba(44, 62, 80, 0.14);
  cursor: pointer;
  opacity: 0;
  animation: series-enter 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--series-delay, 0ms);
  overflow: visible;
  transform-origin: left bottom;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms ease;
}

.series-card-shell {
  transition: none;
}

.series-card:not([data-open="true"]):hover,
.series-card:not([data-open="true"]):focus-visible {
  transform: rotate(-2deg);
  box-shadow: 0 20px 34px rgba(44, 62, 80, 0.2);
}

.series-card:not([data-open="true"]).is-touch-hover {
  transform: rotate(-2deg);
  box-shadow: 0 20px 34px rgba(44, 62, 80, 0.2);
}

.series-card.is-restoring,
.series-card.is-restoring:hover,
.series-card.is-restoring:focus-visible {
  transform: rotate(0deg);
  box-shadow: 0 16px 32px rgba(44, 62, 80, 0.14);
}

.series-card.is-restoring::after,
.series-card.is-restoring:hover::after,
.series-card.is-restoring:focus-visible::after {
  opacity: 0;
  transform: translateX(90%);
}

.series-card:focus-visible {
  outline: 2px solid rgba(85, 200, 255, 0.72);
  outline-offset: 2px;
}

.series-card-shell {
  display: flex;
  flex-direction: column;
}

.series-card-left {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  min-width: 0;
  padding: 10px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 182, 201, 0.2), rgba(154, 215, 255, 0.2), rgba(167, 243, 208, 0.2));
  border: 1px solid rgba(255, 255, 255, 0.7);
  position: relative;
}

.series-cover-wrap {
  border-radius: 10px;
  overflow: hidden;
  height: 188px;
  box-shadow: 0 8px 14px rgba(0, 0, 0, 0.16);
}

.series-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.series-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: flex-start;
  gap: 4px;
  padding-right: 34px;
}

.series-name {
  margin: 0;
  position: relative;
  display: inline-block;
  color: #1e3146;
  font-size: clamp(1.08rem, 1.1vw, 1.34rem);
  line-height: 1.32;
  font-weight: 800;
  letter-spacing: 0.02em;
  word-break: break-word;
  text-shadow: 0 2px 8px rgba(49, 80, 109, 0.16);
  padding-bottom: 6px;
}

.series-name::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: min(100%, 160px);
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg,
      rgba(255, 182, 201, 0.92) 0%,
      rgba(154, 215, 255, 0.92) 52%,
      rgba(167, 243, 208, 0.92) 100%);
  box-shadow: 0 2px 8px rgba(95, 128, 160, 0.2);
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .series-name {
    background: linear-gradient(90deg,
        rgba(255, 120, 168, 0.98) 0%,
        rgba(103, 178, 245, 0.98) 58%,
        rgba(76, 198, 159, 0.98) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 2px 6px rgba(49, 80, 109, 0.16));
  }
}

.series-count {
  margin: 0;
  color: #4e5d6f;
  font-weight: 700;
  font-size: 0.88rem;
}

.series-expand-icon {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.66);
  color: #31506d;
  transition: transform 260ms ease;
}

.series-card[data-open="true"] .series-expand-icon {
  transform: rotate(90deg);
}

.series-card-right {
  min-width: 0;
  border-radius: 14px;
  border: 1px solid transparent;
  margin-top: 0;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  padding: 0 14px;
  transform: translateY(-4px);
  transition: max-height 320ms ease, opacity 240ms ease, transform 320ms ease, margin-top 320ms ease, padding-top 320ms ease, padding-bottom 320ms ease;
}

.series-card[data-open="true"] .series-card-right {
  margin-top: 10px;
  max-height: 520px;
  opacity: 1;
  border-color: rgba(0, 0, 0, 0.06);
  padding-top: 12px;
  padding-bottom: 12px;
  transform: translateY(0);
  overflow-y: auto;
}

.series-chapters {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.series-chapter {
  flex: 0 0 auto;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.56);
  overflow: hidden;
}

.series-chapter-toggle {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 0;
  background: linear-gradient(135deg, rgba(255, 182, 201, 0.14), rgba(154, 215, 255, 0.14), rgba(167, 243, 208, 0.14));
  color: #24415b;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
}

.series-chapter-toggle:focus-visible {
  outline: 2px solid rgba(85, 200, 255, 0.7);
  outline-offset: -2px;
}

.series-chapter-title {
  min-width: 0;
  flex: 1 1 auto;
  font-size: 0.98rem;
  font-weight: 800;
  word-break: break-word;
}

.series-chapter-count {
  flex: 0 0 auto;
  font-size: 0.82rem;
  font-weight: 700;
  color: #5b6d81;
}

.series-chapter-toggle i {
  flex: 0 0 auto;
  transition: transform 220ms ease;
  color: #31506d;
}

.series-chapter[data-open="true"] .series-chapter-toggle i {
  transform: rotate(180deg);
}

.series-chapter-body {
  box-sizing: border-box;
  height: 0;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 280ms ease, opacity 220ms ease, padding 280ms ease;
  padding: 0 12px;
}

.series-chapter[data-open="true"] .series-chapter-body {
  padding: 12px;
  height: 260px;
  max-height: 260px;
  opacity: 1;
  overflow-y: auto;
}

.series-post-list {
  counter-reset: series-post-index;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.series-post-item {
  min-width: 0;
  counter-increment: series-post-index;
  opacity: 0;
  transform: translateY(-8px);
}

.series-card[data-phase="revealed"] .series-post-list {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.series-chapter[data-open="false"] .series-post-list {
  pointer-events: none;
}

.series-card[data-phase="revealed"] .series-post-item {
  animation: series-post-enter 280ms ease forwards;
  animation-delay: var(--series-item-delay, 0ms);
}

.series-post-link {
  position: relative;
  display: block;
  padding: 10px 12px 10px 46px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 10px rgba(44, 62, 80, 0.06);
  color: #2a3b50;
  text-decoration: none;
  line-height: 1.45;
  word-break: break-word;
  transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease, color 180ms ease;
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
  background: linear-gradient(135deg, rgba(255, 182, 201, 0.42), rgba(154, 215, 255, 0.38), rgba(167, 243, 208, 0.4));
  box-shadow: 0 2px 6px rgba(49, 80, 109, 0.18);
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

.series-empty {
  margin-top: 12px;
  padding: 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  color: #405469;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.loading-text {
  text-align: center;
  padding: 40px;
  color: #4e5d6f;
  font-size: 1.1rem;
}

@keyframes series-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes series-post-enter {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ==================== PC：横向排布 ==================== */
@media (min-width: 901px) {
  .series-section {
    min-height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-top: 72px;
    padding-bottom: 12px;
  }

  .series-layout {
    width: 100%;
  }

  .series-list {
    flex-direction: row;
    align-items: stretch;
    gap: 14px;
    overflow-x: auto;
    overflow-y: hidden;
    padding-top: 14px;
    padding-bottom: 16px;
    scrollbar-width: thin;
  }

  .series-list::-webkit-scrollbar {
    height: 8px;
  }

  .series-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.35);
    border-radius: 99px;
  }

  .series-list::-webkit-scrollbar-thumb {
    background: rgba(113, 150, 180, 0.58);
    border-radius: 99px;
  }

  .series-card {
    flex: 0 0 auto;
    width: 320px;
    height: 410px;
    transition: width 360ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms ease;
  }

  .series-card[data-open="true"] {
    width: 760px;
  }

  .series-card-shell {
    display: grid;
    grid-template-columns: 296px minmax(0, 1fr);
    gap: 0;
    align-items: stretch;
    height: 100%;
  }

  .series-card-left {
    border-radius: 14px;
    height: 100%;
  }

  .series-cover-wrap {
    height: 236px;
  }

  .series-card[data-open="true"] .series-card-left {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .series-card .series-expand-icon {
    transform: rotate(0deg);
  }

  .series-card[data-open="true"] .series-expand-icon {
    transform: rotate(90deg);
  }

  .series-card-right {
    margin-top: 0;
    margin-left: 0;
    max-height: none;
    height: 100%;
    max-width: 0;
    border: 1px solid transparent;
    border-left: none;
    opacity: 0;
    display: flex;
    flex-direction: column;
    overflow-y: hidden;
    padding: 10px 0;
    transform: translateX(-6px);
    transition: max-width 360ms ease, opacity 240ms ease, transform 360ms ease, padding-left 360ms ease, padding-right 360ms ease, border-color 360ms ease;
    white-space: normal;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .series-card[data-open="true"] .series-card-right {
    margin-top: 0;
    max-width: 100%;
    opacity: 1;
    border-color: rgba(0, 0, 0, 0.06);
    padding: 10px 14px;
    transform: translateX(0);
    overflow-y: auto;
  }

  .series-card-right .series-chapters {
    flex: 1 1 auto;
    min-height: 0;
    padding-right: 4px;
  }

  .series-card-right .series-chapter-body .series-post-list {
    padding-right: 6px;
  }
}

@media (max-width: 900px) {
  .series-section {
    padding-left: 12px;
    padding-right: 12px;
  }

  .series-page-title {
    margin-bottom: 12px;
    letter-spacing: 0.04em;
  }

  .series-layout {
    border-radius: 16px;
    padding: 10px;
  }

  .series-card {
    border-radius: 16px;
  }

  .series-card-left {
    gap: 10px;
  }

  .series-cover-wrap {
    height: 164px;
  }

  .series-meta {
    padding-right: 34px;
  }

  .series-expand-icon {
    right: 10px;
    bottom: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .series-card {
    opacity: 1;
    transform: none;
    animation: none;
    transition: none;
  }

  .series-card-right,
  .series-expand-icon {
    transition: none;
  }

  .series-post-list {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .series-chapter-body {
    transition: none;
  }

  .series-post-item {
    opacity: 1;
    transform: none;
    animation: none;
  }
}

/* ==================== 马卡龙主题 ==================== */
.series-page {
  --primary-color: #55c8ff;
  --secondary-color: #a7f3d0;
  --series-text: #2b3440;
}

:deep(.slideshow)::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    linear-gradient(135deg,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(255, 182, 201, 0.12) 32%,
      rgba(154, 215, 255, 0.14) 64%,
      rgba(167, 243, 208, 0.12) 100%);
  backdrop-filter: blur(14px) saturate(1.08);
  -webkit-backdrop-filter: blur(14px) saturate(1.08);
}

.series-card {
  border: 3px solid transparent;
  background:
    linear-gradient(135deg, rgba(255, 244, 248, 0.92), rgba(236, 250, 245, 0.88), rgba(236, 246, 255, 0.90)) padding-box,
    linear-gradient(135deg, rgba(255, 182, 201, 0.88), rgba(167, 243, 208, 0.86), rgba(154, 215, 255, 0.86)) border-box;
  backdrop-filter: blur(10px);
}

.series-card-right {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
}

/* 触摸悬停状态 */
.series-card:not([data-open="true"]).is-touch-hover {
  transform: rotate(-2deg);
  box-shadow: 0 20px 34px rgba(44, 62, 80, 0.2);
}
</style>