<template>
  <main
    class="blog-detail-page"
    :class="{
      'immersive-reading-active': settings.isImmersive,
      'wide-mode-active': settings.isImmersive,
      'immersive-mobile-mode': settings.isImmersive,
    }"
  >
    <div class="container">
      <TOC
        :content-html="renderedHtml"
        content-id="article-content"
        :fab-target="tocFabTarget"
      >
        <template #footer>
          <PostNav
            :prev="prevBlog"
            :next="nextBlog"
            :similar="similarBlog"
            :in-series="Boolean(blog?.series)"
          />
        </template>
      </TOC>

      <article class="blog-article" :class="{ 'wide-mode': settings.isImmersive }">
        <header class="article-header">
          <h1 class="article-title">{{ blog?.title || i18n.get('article_loading') }}</h1>

          <div class="article-meta">
            <span v-if="blog?.date" class="article-meta-item">
              <i class="far fa-calendar" aria-hidden="true"></i>
              {{ formatDate(blog.date) }}
            </span>

            <span v-if="blog?.lastEditedDate" class="article-meta-item">
              <i class="fas fa-pencil-alt" aria-hidden="true"></i>
              {{ formatDate(blog.lastEditedDate) }}
            </span>

            <div class="article-metrics" aria-live="polite">
              <span class="article-metric-item">
                <i class="far fa-file-lines" aria-hidden="true"></i>
                <template v-if="wordReady">{{ formattedArticleWords }}</template>
                <LoadingDots
                  v-else-if="!articleError"
                  class="metric-loading"
                  :label="i18n.get('word_count_loading')"
                />
              </span>
            </div>

            <div v-if="blog?.tags?.length" class="tags">
              <router-link
                v-for="tag in blog.tags"
                :key="tag"
                class="tag"
                :to="`/categories?tags=${encodeURIComponent(JSON.stringify([tag]))}`"
              >
                {{ tag }}
              </router-link>
            </div>
          </div>
        </header>

        <div v-if="articleError" class="article-error" role="alert">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
          <p>{{ i18n.get('article_load_failed') }}</p>
          <button type="button" class="article-retry-btn" @click="loadBlog()">
            {{ i18n.get('article_retry') }}
          </button>
        </div>

        <div v-else-if="isArticleLoading" class="article-skeleton" aria-hidden="true">
          <span
            v-for="(width, index) in skeletonWidths"
            :key="index"
            class="article-skeleton-line"
            :style="{ width: `${width}%` }"
          ></span>
        </div>

        <template v-else>
          <BlogContent
            content-id="article-content"
            :html="renderedHtml"
            :article-id="blog?.id || ''"
          />
          <LicenseNotice v-if="blog" :permalink="permalink" />
        </template>
      </article>
    </div>

    <FloatingControls
      @ready="tocFabTarget = $event"
      @toggle-immersive="toggleImmersive"
      @open-export="openExportModal"
      @open-display="openDisplayModal"
    />

    <ExportModal
      ref="exportModalRef"
      :markdown-content="rawMarkdown"
      :md-source-path="blog?.contentFile || ''"
      :article-title="blog?.title || 'post'"
    />

    <DisplayModal ref="displayModalRef" />

    <div id="immersive-read-hint" :class="hintClass">
      <span class="immersive-hint-line">
        <span
          v-for="(segment, index) in hintSegments"
          :key="index"
          :class="{ 'immersive-key': segment.highlight }"
        >{{ segment.text }}</span>
      </span>
    </div>

    <button
      v-if="settings.isImmersive"
      type="button"
      class="immersive-exit-fab"
      :class="{ 'is-collapsed': pillCollapsed }"
      :aria-label="i18n.get('immersive_exit')"
      @click="exitImmersive"
    >
      <i class="fas fa-compress-arrows-alt" aria-hidden="true"></i>
      <span class="immersive-exit-fab-text">{{ i18n.get('immersive_exit') }}</span>
    </button>
  </main>
</template>

<script setup>
/**
 * 博客详情页
 *
 * 本次为整页重写，核心约束：
 * - 文章切换使用请求序号隔离，快速点上一篇/下一篇时旧请求不会覆盖新文章；
 * - 字数优先读取构建期 `blogs.json.wordCount`，缺失时才在运行时兜底统计；
 * - 沉浸模式只通过 body class 驱动导航栏与页面样式，不再改写 navbar 的内联样式；
 * - 上一页/下一页/相似推荐在每次加载前全部复位，避免失败时残留旧文章数据。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/shared/stores/blogStore'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { useSettingsStore } from '@/shared/stores/settingsStore'
import { useMarkdown } from '@/shared/composables/useMarkdown'
import { resolveUrl } from '@/shared/utils/url'
import { countReadableChars } from '@/shared/utils/textStats'

import TOC from '@/features/blog-detail/components/TOC.vue'
import BlogContent from '@/features/blog-detail/components/BlogContent.vue'
import PostNav from '@/features/blog-detail/components/PostNav.vue'
import FloatingControls from '@/features/blog-detail/components/FloatingControls.vue'
import ExportModal from '@/features/blog-detail/components/ExportModal.vue'
import DisplayModal from '@/features/blog-detail/components/DisplayModal.vue'
import LicenseNotice from '@/shared/components/LicenseNotice.vue'
import LoadingDots from '@/shared/components/LoadingDots.vue'

const detailBgImg = `url(${resolveUrl('/assets/detail_bg.webp')})`

const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()
const i18n = useI18nStore()
const settings = useSettingsStore()
const { renderMarkdown, stripFrontMatter } = useMarkdown()

/* ---------------- 文章状态 ---------------- */
const blog = ref(null)
const rawMarkdown = ref('')
const renderedHtml = ref('')
const wordCount = ref(null)
const isArticleLoading = ref(false)
const articleError = ref(false)
const tocFabTarget = ref(null)

const prevBlog = ref(null)
const nextBlog = ref(null)
const similarBlog = ref(null)

const exportModalRef = ref(null)
const displayModalRef = ref(null)

let loadToken = 0
let mounted = true

const currentBlogId = computed(() => String(route.params.id || ''))
const wordReady = computed(() => Number.isFinite(wordCount.value))
const formattedArticleWords = computed(() => {
  if (!wordReady.value) return ''
  const lang = i18n.getLang()
  const locale = lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : 'zh-CN'
  return Number(wordCount.value).toLocaleString(locale)
})

const skeletonWidths = [94, 100, 88, 96, 72, 90, 84]

/** 永久链接：Hash 路由下必须保留 `#/blog/:id`，旧实现拼成了不存在的 `/blog-detail?id=` */
const permalink = computed(() => {
  if (!blog.value) return ''
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/blog/${blog.value.id}`
})

/* ---------------- 日期与沉浸提示 ---------------- */
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr

  const lang = i18n.getLang()
  if (lang === 'en') {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  if (lang === 'ja') {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

const isTouchDevice = ref(false)
let touchPointerQuery = null
let narrowViewportQuery = null

const touchPointerMedia = '(hover: none) and (pointer: coarse)'
const narrowViewportMedia = '(max-width: 1100px)'

function refreshTouchDevice() {
  isTouchDevice.value = Boolean(touchPointerQuery?.matches || narrowViewportQuery?.matches)
}

const hintSegments = computed(() => {
  const text = i18n.get(isTouchDevice.value ? 'immersive_hint_touch' : 'immersive_hint_esc')
  const keyword = 'Esc'
  const index = text.indexOf(keyword)
  if (index === -1) return [{ text, highlight: false }]
  return [
    { text: text.slice(0, index), highlight: false },
    { text: keyword, highlight: true },
    { text: text.slice(index + keyword.length), highlight: false },
  ]
})

/* ---------------- 数据加载 ---------------- */
function resetArticleState() {
  blog.value = null
  rawMarkdown.value = ''
  renderedHtml.value = ''
  wordCount.value = null
  isArticleLoading.value = true
  articleError.value = false
  prevBlog.value = null
  nextBlog.value = null
  similarBlog.value = null
}

function computeNavigation(found) {
  const allBlogs = blogStore.blogs
  const series = found.series || ''

  if (series) {
    const sorted = allBlogs
      .filter((item) => item.series === series)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
    const index = sorted.findIndex((item) => String(item.id) === String(found.id))
    if (index > -1) {
      prevBlog.value = sorted[index - 1] || null
      nextBlog.value = sorted[index + 1] || null
    }
  } else {
    const sorted = allBlogs
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    const index = sorted.findIndex((item) => String(item.id) === String(found.id))
    if (index > -1) {
      prevBlog.value = sorted[index - 1] || null
      nextBlog.value = sorted[index + 1] || null
    }
  }

  if (series) return

  const tags = found.tags || []
  const candidates = allBlogs.filter((item) => String(item.id) !== String(found.id))
  const matches = (item, depth) => {
    if (!Array.isArray(item.tags)) return false
    for (let i = 0; i < depth; i += 1) {
      if (item.tags[i] !== tags[i]) return false
    }
    return true
  }

  similarBlog.value =
    (tags.length >= 3 && candidates.find((item) => matches(item, 3))) ||
    (tags.length >= 2 && candidates.find((item) => matches(item, 2))) ||
    (tags.length >= 1 && candidates.find((item) => matches(item, 1))) ||
    null
}

async function loadBlog(id = currentBlogId.value) {
  const token = ++loadToken
  resetArticleState()

  if (!id) {
    router.replace('/')
    return
  }

  try {
    if (!blogStore.blogs.length) await blogStore.fetchBlogs()
    if (!mounted || token !== loadToken) return

    const found = blogStore.getBlogById(id)
    if (!found) {
      router.replace('/')
      return
    }

    blog.value = found
    document.title = `${found.title || '博客详情'} | YoungBlog`
    computeNavigation(found)

    if (Number.isFinite(found.wordCount)) {
      wordCount.value = Number(found.wordCount)
    }

    if (!found.contentFile) {
      return
    }

    const response = await fetch(resolveUrl(found.contentFile))
    if (!mounted || token !== loadToken) return
    if (!response.ok) throw new Error(`文章请求失败（HTTP ${response.status}）`)

    const text = await response.text()
    if (!mounted || token !== loadToken) return

    rawMarkdown.value = text
    const cleaned = stripFrontMatter(text)

    if (!Number.isFinite(found.wordCount)) {
      wordCount.value = countReadableChars(cleaned)
    }

    const html = await renderMarkdown(cleaned, found.contentFile)
    if (!mounted || token !== loadToken) return
    renderedHtml.value = html
  } catch (error) {
    if (!mounted || token !== loadToken) return
    console.error('[BlogDetail] 加载失败', error)
    articleError.value = true
  } finally {
    if (mounted && token === loadToken) {
      isArticleLoading.value = false
    }
  }
}

/* ---------------- 沉浸阅读 ---------------- */
const hintClass = ref('')
let hintTimer = null
let hintFadeTimer = null
let pillCollapseTimer = null
const pillCollapsed = ref(false)

function clearHintTimers() {
  clearTimeout(hintTimer)
  clearTimeout(hintFadeTimer)
  hintTimer = null
  hintFadeTimer = null
}

function showImmersiveHint() {
  clearHintTimers()
  hintClass.value = 'is-visible'
  hintTimer = setTimeout(() => {
    hintClass.value = 'is-fading'
    hintFadeTimer = setTimeout(() => {
      hintClass.value = ''
    }, 350)
  }, 3000)
}

function hideImmersiveHint() {
  clearHintTimers()
  hintClass.value = ''
}

function clearPillTimer() {
  clearTimeout(pillCollapseTimer)
  pillCollapseTimer = null
}

function schedulePillCollapse() {
  clearPillTimer()
  pillCollapsed.value = false
  pillCollapseTimer = setTimeout(() => {
    if (settings.isImmersive) pillCollapsed.value = true
  }, 3200)
}

function applyImmersive(next) {
  settings.isImmersive = next
  document.body.classList.toggle('immersive-reading-active', next)
  document.body.classList.toggle('wide-mode-active', next)

  if (next) {
    showImmersiveHint()
    if (isTouchDevice.value) schedulePillCollapse()
  } else {
    hideImmersiveHint()
    clearPillTimer()
    pillCollapsed.value = false
  }
}

function toggleImmersive() {
  applyImmersive(!settings.isImmersive)
}

function exitImmersive() {
  if (settings.isImmersive) applyImmersive(false)
}

function onGlobalTap() {
  if (!settings.isImmersive || !isTouchDevice.value) return
  schedulePillCollapse()
}

function onKeyDown(event) {
  if (event.key === 'Escape' && settings.isImmersive) {
    applyImmersive(false)
  }
}

function openExportModal() {
  exportModalRef.value?.open()
}

function openDisplayModal() {
  displayModalRef.value?.open()
}

/* ---------------- 生命周期 ---------------- */
function bindMediaListeners() {
  if (typeof window.matchMedia !== 'function') return
  touchPointerQuery = window.matchMedia(touchPointerMedia)
  narrowViewportQuery = window.matchMedia(narrowViewportMedia)
  refreshTouchDevice()
  touchPointerQuery.addEventListener('change', refreshTouchDevice)
  narrowViewportQuery.addEventListener('change', refreshTouchDevice)
}

function unbindMediaListeners() {
  touchPointerQuery?.removeEventListener('change', refreshTouchDevice)
  narrowViewportQuery?.removeEventListener('change', refreshTouchDevice)
  touchPointerQuery = null
  narrowViewportQuery = null
}

onMounted(() => {
  mounted = true
  bindMediaListeners()
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('pointerdown', onGlobalTap, true)
  if (settings.isImmersive) applyImmersive(true)
  loadBlog()
})

watch(
  () => route.params.id,
  (id) => {
    if (!id) return
    exportModalRef.value?.close()
    displayModalRef.value?.close()
    loadBlog(String(id))
  },
)

onUnmounted(() => {
  mounted = false
  loadToken += 1
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('pointerdown', onGlobalTap, true)
  unbindMediaListeners()
  clearHintTimers()
  clearPillTimer()
  exportModalRef.value?.close()
  displayModalRef.value?.close()
  applyImmersive(false)
  settings.isImmersive = false
})
</script>

<style scoped>
/* ===== 页面背景 ===== */
.blog-detail-page {
  --primary-color: #c84070;
  --secondary-color: #58d8b2;
  --detail-pink: #ffb6c9;
  --detail-peach: #ffd2a6;
  --detail-mint: #a7f3d0;
  --detail-sky: #9ad7ff;
  --detail-text: #17222f;
  --detail-muted: rgba(23, 34, 47, 0.58);
  --detail-shadow: 0 18px 44px rgba(23, 34, 47, 0.12);
  --detail-border: linear-gradient(
    135deg,
    rgba(255, 182, 201, 0.95),
    rgba(199, 182, 255, 0.9) 52%,
    rgba(167, 243, 208, 0.92)
  );
  position: relative;
  z-index: 2;
  min-height: 100vh;
  background: none;
}

.blog-detail-page::before {
  content: '';
  position: fixed;
  inset: 0;
  height: 100svh;
  background-image: v-bind(detailBgImg);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  transform: scale(1);
  opacity: 1;
  transition: opacity 1.05s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.05s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 0;
}

.blog-detail-page::after {
  content: '';
  position: fixed;
  inset: 0;
  height: 100svh;
  background: linear-gradient(
    135deg,
    rgba(255, 182, 201, 0.18) 0%,
    rgba(167, 243, 208, 0.18) 45%,
    rgba(199, 182, 255, 0.16) 100%
  );
  opacity: 1;
  transition: opacity 0.95s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.95s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 1;
}

.blog-detail-page.immersive-reading-active::before {
  opacity: 0;
  transform: scale(1.04);
}

.blog-detail-page.immersive-reading-active::after {
  background: rgba(253, 249, 242, 0.96);
}

/* ===== 导航栏显隐：只靠 body class，不再写内联样式 ===== */
:global(.navbar) {
  transition: transform 0.28s ease, opacity 0.22s ease;
}

:global(body.immersive-reading-active .navbar) {
  transform: translateY(calc(-100% - 24px));
  opacity: 0;
  pointer-events: none;
}

/* ===== 容器 ===== */
.container {
  display: flex;
  gap: 32px;
  position: relative;
  z-index: 2;
}

/* ===== 文章卡片 ===== */
.blog-article {
  flex: 1;
  max-width: 900px;
  width: 100%;
  min-width: 0;
  border-radius: 30px;
  box-shadow: var(--detail-shadow);
  padding: 40px 32px 32px;
  margin-top: 40px;
  margin-bottom: 40px;
  border: 2px solid transparent;
  background-image:
    linear-gradient(rgba(253, 249, 242, 0.93), rgba(253, 247, 238, 0.88)),
    var(--detail-border);
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
}

.blog-article.wide-mode {
  max-width: 1200px;
  width: calc(100% - 96px);
  margin-left: auto;
  margin-right: auto;
  transition: max-width 0.28s ease, width 0.28s ease, box-shadow 0.28s ease;
}

/* ===== 文章头部 ===== */
.article-header {
  border-bottom: 1px solid rgba(23, 34, 47, 0.08);
  margin-bottom: 28px;
  padding-bottom: 18px;
}

.article-title {
  font-size: 2.2rem;
  margin-bottom: 10px;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(100deg, #b56a85 0%, #7f9fb2 46%, #6f9f89 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 6px 12px rgba(91, 108, 104, 0.08));
}

.article-meta {
  color: var(--detail-muted);
  font-size: 1rem;
  display: flex;
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 8px;
}

.article-meta-item,
.article-metric-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--detail-muted);
  font-size: 0.96rem;
  font-variant-numeric: tabular-nums;
}

.article-meta-item i,
.article-metric-item i {
  font-size: 0.95rem;
  opacity: 0.88;
}

.article-metrics {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 1.6em;
}

.metric-loading {
  color: rgba(23, 34, 47, 0.5);
}

.tags {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tag {
  background: rgba(255, 214, 226, 0.55);
  color: #8c2f53;
  border-radius: 999px;
  padding: 4px 13px;
  font-size: 0.92rem;
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
  transition: background 160ms ease, transform 120ms ease, color 120ms ease;
  font-weight: 600;
}

.tag:nth-child(3n + 2) {
  background: rgba(205, 246, 233, 0.62);
  color: #1b6a58;
}

.tag:nth-child(3n) {
  background: rgba(226, 220, 255, 0.6);
  color: #5b4aa0;
}

.tag:hover {
  background: rgba(255, 196, 212, 0.7);
  transform: translateY(-2px);
  text-decoration: none;
}

/* ===== 加载与错误状态 ===== */
.article-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 6px 0 10px;
}

.article-skeleton-line {
  height: 14px;
  border-radius: 9px;
  background: linear-gradient(
    90deg,
    rgba(154, 215, 255, 0.16) 0%,
    rgba(255, 255, 255, 0.62) 46%,
    rgba(154, 215, 255, 0.16) 100%
  );
  background-size: 220% 100%;
  animation: article-skeleton-shimmer 1.5s linear infinite;
}

.article-skeleton-line:nth-child(3n + 1) {
  height: 22px;
}

@keyframes article-skeleton-shimmer {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -120% 0;
  }
}

.article-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 42px 16px;
  color: #8c2f53;
  text-align: center;
}

.article-error i {
  font-size: 2rem;
  color: rgba(200, 64, 112, 0.55);
}

.article-error p {
  margin: 0;
  font-size: 1rem;
}

.article-retry-btn {
  border: 1px solid rgba(200, 64, 112, 0.26);
  border-radius: 999px;
  padding: 7px 20px;
  background: rgba(255, 226, 235, 0.7);
  color: #8c2f53;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
}

.article-retry-btn:hover {
  background: rgba(255, 204, 219, 0.9);
  transform: translateY(-1px);
}

/* ===== 沉浸阅读轮廓 ===== */
.blog-detail-page.immersive-reading-active .blog-article,
.blog-detail-page.wide-mode-active .blog-article {
  outline: 3px solid rgba(200, 64, 112, 0.55);
  box-shadow: 0 20px 50px rgba(23, 34, 47, 0.18);
}

.blog-detail-page.immersive-reading-active .container,
.blog-detail-page.wide-mode-active .container {
  justify-content: center;
}

.blog-detail-page.immersive-reading-active :deep(.blog-toc) {
  display: none;
}

/* ===== 悬浮控件过渡与沉浸隐藏 ===== */
#floating-controls {
  transition: transform 0.28s ease, opacity 0.22s ease, visibility 0.22s ease !important;
}

.blog-detail-page :deep(.toc-fab) {
  transition: transform 0.28s ease, opacity 0.22s ease, visibility 0.22s ease !important;
}

.blog-detail-page.immersive-reading-active #floating-controls {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(28px) scale(0.96) !important;
}

.blog-detail-page.immersive-reading-active :deep(.toc-fab) {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(28px) scale(0.96) !important;
}

.blog-detail-page.immersive-reading-active :deep(.toc-overlay) {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* ===== 沉浸提示 ===== */
#immersive-read-hint {
  position: fixed;
  top: calc(14px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translate(-50%, -10px);
  z-index: 1205;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(24, 49, 58, 0.16);
  background: rgba(255, 255, 255, 0.88);
  color: #18313a;
  font-size: 0.92rem;
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(24, 49, 58, 0.12);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.32s ease, visibility 0.3s ease;
  text-align: center;
  line-height: 1.35;
}

#immersive-read-hint.is-visible {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
}

#immersive-read-hint.is-fading {
  opacity: 0;
  transform: translate(-50%, -8px);
}

#immersive-read-hint .immersive-key {
  color: #ff6e9b;
  font-weight: 800;
}

#immersive-read-hint .immersive-hint-line {
  display: block;
}

/* ===== 移动端退出胶囊 ===== */
.immersive-exit-fab {
  display: none;
  position: fixed;
  left: 50%;
  bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  z-index: 1205;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  white-space: nowrap;
  width: max-content;
  max-width: calc(100vw - 24px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 999px;
  background: rgba(35, 47, 58, 0.62);
  color: #fff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 10px 26px rgba(24, 49, 58, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(10px) saturate(1.4);
  -webkit-backdrop-filter: blur(10px) saturate(1.4);
  cursor: pointer;
  opacity: 1;
  transform: translateX(-50%) scale(1);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: opacity 0.28s ease, transform 0.28s ease, background 0.2s ease;
}

.immersive-exit-fab.is-collapsed {
  opacity: 0.62;
  transform: translateX(-50%) scale(0.94);
}

.immersive-exit-fab:active {
  transform: translateX(-50%) scale(0.9);
}

.immersive-exit-fab:focus-visible {
  outline: 3px solid #ff6e9b;
  outline-offset: 3px;
}

.immersive-exit-fab i {
  font-size: 0.95rem;
}

@media (hover: none) and (pointer: coarse), (max-width: 1100px) {
  .immersive-exit-fab {
    display: inline-flex;
  }
}

/* ===== 响应式 ===== */
@media (max-width: 880px) {
  .blog-detail-page .container {
    padding: 52px 14px 24px;
    gap: 0;
  }

  .blog-detail-page.immersive-mobile-mode .container {
    padding-top: calc(16px + env(safe-area-inset-top, 0px));
  }

  .blog-article {
    max-width: 100%;
    margin-top: 8px;
    margin-bottom: 20px;
    padding: 22px 15px 18px;
    border-width: 3px;
    border-radius: 14px;
  }

  .blog-article.wide-mode {
    width: 100%;
    max-width: 100%;
    margin-left: 0;
    margin-right: 0;
  }

  .article-title {
    font-size: 1.6rem;
    line-height: 1.35;
    gap: 6px;
  }

  .article-header {
    margin-bottom: 20px;
    padding-bottom: 14px;
  }

  .blog-detail-page.immersive-reading-active .blog-article,
  .blog-detail-page.wide-mode-active .blog-article {
    outline: none;
  }

  #immersive-read-hint {
    top: calc(10px + env(safe-area-inset-top, 0px));
    padding: 7px 12px;
    font-size: 0.86rem;
    max-width: calc(100vw - 24px);
  }
}

@media (max-width: 720px) {
  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .article-meta > * {
    width: 100%;
  }

  .article-metrics {
    justify-content: flex-start;
  }

  .tags {
    flex-basis: auto;
  }

  .tag {
    font-size: 0.86rem;
    padding: 3px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blog-detail-page::before,
  .blog-detail-page::after,
  :global(.navbar),
  .article-skeleton-line,
  #immersive-read-hint,
  .immersive-exit-fab {
    transition: none !important;
    animation: none !important;
  }
}
</style>
