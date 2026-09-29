<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="search-panel"
      :class="[{ active: isOpen, 'right-sidebar': isDetailPage, 'search-card': !isDetailPage }]"
      @click="handleBackdropClick"
    >
      <div class="search-wrap" role="dialog" aria-label="site-search">
        <!-- 关闭按钮 -->
        <button class="search-close-btn" @click="closeSearch">
          <span class="sr-only">{{ i18n.currentTranslations.search_close }}</span>
        </button>

        <div class="search-modal-content">
          <!-- 站内搜索标题栏（详情页为侧边卡片，不需要） -->
          <div v-if="!isDetailPage" class="search-head">
            <span class="search-head-icon" aria-hidden="true"><i class="fas fa-magnifying-glass"></i></span>
            <span class="search-head-title">{{ i18n.currentTranslations.search }}</span>
            <span class="search-head-hint">{{ i18n.currentTranslations.search_close_hint }}</span>
          </div>
          <!-- 搜索输入 -->
          <div class="search-row">
            <div class="search-input">
              <i class="fas fa-magnifying-glass search-input-icon" aria-hidden="true"></i>
              <input 
                ref="inputRef"
                type="search" 
                :placeholder="isDetailPage ? i18n.currentTranslations.search_article_placeholder : i18n.currentTranslations.search_placeholder"
                v-model="keyword"
                @input="onSearch"
                @keydown.enter="onSearch"
                aria-label="搜索输入"
              />
            </div>
          </div>

          <!-- 搜索选项（详情页为「篇内搜索」，无需正文开关） -->
          <div class="search-options" role="group" aria-label="search-options" v-if="!isDetailPage">
            <label class="search-option-item">
              <input type="checkbox" v-model="includeBody" />
              <span>{{ i18n.currentTranslations.search_include_body }}</span>
            </label>
          </div>

          <!-- 搜索结果 -->
          <div class="search-results" id="search-results" role="list">
            <div v-if="!keyword" class="search-empty-hint">
              {{ isDetailPage ? i18n.currentTranslations.search_article_idle : i18n.currentTranslations.search_idle_hint }}
            </div>
            <div v-else-if="isLoading" class="search-loading">
              {{ i18n.currentTranslations.search_body_loading }}
            </div>
            <div v-else-if="results.length === 0" class="search-empty">
              {{ isDetailPage ? i18n.currentTranslations.search_article_no_results : i18n.currentTranslations.search_no_results }}
            </div>
            <div 
              v-for="(result, index) in results" 
              :key="index"
              class="search-item"
              :class="{ 'detail-search-item': !!result.el }"
              @click="onResultClick(result)"
            >
              <!-- 详情页：序号 + 命中内容所在的一/二级标题 + 段落摘要 -->
              <template v-if="result.el">
                <div class="result-index">{{ index + 1 }}</div>
                <div class="result-main">
                  <div class="result-headings">
                    <div v-if="result.h1" class="result-h1" :title="result.h1">{{ result.h1 }}</div>
                    <div v-if="result.h2" class="result-h2" :title="result.h2">{{ result.h2 }}</div>
                  </div>
                  <div class="result-paragraph" v-html="result.snippet"></div>
                </div>
              </template>
              <!-- 其它页面：站内文章搜索 -->
              <template v-else>
                <div class="title">
                  <span class="title-text" v-html="highlightText(result.blog?.title, keyword)"></span>
                  <span v-if="result.blog?.type" class="blog-type">{{ result.blog.type }}</span>
                </div>
                <div class="snippet" v-html="highlightText(result.blog?.excerpt || '', keyword)"></div>
                <div v-if="result.blog?.tags" class="meta-tags">
                  <span v-for="tag in result.blog.tags" :key="tag" class="meta-tag" v-html="highlightText(tag, keyword)"></span>
                </div>
              </template>
            </div>
          </div>

          <!-- 站内搜索底部状态栏 -->
          <div v-if="!isDetailPage && keyword && results.length" class="search-foot">
            <span class="search-foot-count">
              {{ i18n.currentTranslations.search_results_count.replace('{n}', String(results.length)) }}
            </span>
            <span class="search-foot-deco" aria-hidden="true"></span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'
import { resolveUrl } from '@/utils/url'

const router = useRouter()
const route = useRoute()
const i18n = useI18nStore()
const blogStore = useBlogStore()

const isOpen = ref(false)
const keyword = ref('')
const includeBody = ref(false)
const isLoading = ref(false)
const results = ref([])
const inputRef = ref(null)

const isDetailPage = computed(() => route.name === 'BlogDetail')

// 打开搜索
const openSearch = () => {
  isOpen.value = true
  // 详情页为「篇内搜索」侧边卡片，保留页面滚动（点击结果需要滚动定位）
  if (!isDetailPage.value) {
    document.body.classList.add('search-modal-open')
  }
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// 关闭搜索
const closeSearch = () => {
  isOpen.value = false
  document.body.classList.remove('search-modal-open')
  keyword.value = ''
  results.value = []
}

// 点击背景关闭
const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget && !isDetailPage.value) {
    closeSearch()
  }
}

// 执行搜索
const onSearch = async () => {
  const q = keyword.value.trim()
  if (!q) {
    results.value = []
    return
  }

  // 详情页：仅搜索当前文章内容，不检索其它博客
  if (isDetailPage.value) {
    results.value = searchInArticle(q)
    return
  }

  isLoading.value = true
  
  try {
    const blogs = blogStore.blogs
    const matches = []

    for (const blog of blogs) {
      let score = 0
      const title = (blog.title || '').toLowerCase()
      const excerpt = (blog.excerpt || '').toLowerCase()
      const tags = (blog.tags || []).join(' ').toLowerCase()
      const series = (blog.series || '').toLowerCase()

      if (title.includes(q)) score += 10
      if (excerpt.includes(q)) score += 6
      if (tags.includes(q)) score += 8
      if (series.includes(q)) score += 12

      // 正文搜索
      if (includeBody.value && blog.contentFile) {
        try {
          const res = await fetch(resolveUrl(blog.contentFile))
          const text = await res.text()
          if (text.toLowerCase().includes(q)) score += 5
        } catch {
          // 忽略加载错误
        }
      }

      if (score > 0) {
        matches.push({ blog, score })
      }
    }

    matches.sort((a, b) => b.score - a.score)
    results.value = matches
  } catch (e) {
    console.error('[Search] 搜索失败:', e)
  } finally {
    isLoading.value = false
  }
}

/* ==================== 详情页：篇内搜索 ==================== */

/** 参与搜索的块级元素（只取最内层，避免父子重复命中） */
const ARTICLE_BLOCK_SELECTOR = 'h1, h2, h3, h4, p, li, td, th, pre'

function escapeHtml(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(value).replace(/[&<>"']/g, ch => map[ch])
}

/** 把命中的关键词包成 <mark>（用于站内搜索结果的标题、摘要与标签） */
function highlightText(text, query) {
  const raw = String(text ?? '')
  const q = String(query || '').trim()
  if (!q) return escapeHtml(raw)
  const lowerRaw = raw.toLowerCase()
  const lowerQ = q.toLowerCase()
  let out = ''
  let from = 0
  let at = lowerRaw.indexOf(lowerQ)
  while (at >= 0) {
    out += escapeHtml(raw.slice(from, at))
    out += `<mark class="match-highlight">${escapeHtml(raw.slice(at, at + q.length))}</mark>`
    from = at + q.length
    at = lowerRaw.indexOf(lowerQ, from)
  }
  return out + escapeHtml(raw.slice(from))
}

/** 生成带关键词高亮的摘要（截取命中位置前后的上下文） */
function buildSnippet(text, index, length) {
  const start = Math.max(0, index - 24)
  const end = Math.min(text.length, index + length + 56)
  const before = escapeHtml(text.slice(start, index))
  const hit = escapeHtml(text.slice(index, index + length))
  const after = escapeHtml(text.slice(index + length, end))
  return `${start > 0 ? '…' : ''}${before}<mark class="match-highlight">${hit}</mark>${after}${end < text.length ? '…' : ''}`
}

/**
 * 在当前文章内容中搜索关键词
 * @param {string} query - 关键词
 * @returns {Array<{el: HTMLElement, index: number, h1: string, h2: string, snippet: string}>}
 */
function searchInArticle(query) {
  const root = document.querySelector('.article-content')
  if (!root) return []
  const lower = query.toLowerCase()
  const all = Array.from(root.querySelectorAll(ARTICLE_BLOCK_SELECTOR))
  const blocks = all.filter(el =>
    !el.querySelector(ARTICLE_BLOCK_SELECTOR) &&
    !el.classList.contains('codeblock__gutter')   // 排除代码块行号
  )
  const out = []
  let h1 = ''
  let h2 = ''

  blocks.forEach(el => {
    const tag = el.tagName.toLowerCase()
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
    // 记录当前所在的一级、二级标题（标题自身命中时即为自身）
    if (tag === 'h1') { h1 = text; h2 = '' }
    else if (tag === 'h2') { h2 = text }
    if (!text || el.closest('[hidden]')) return
    const at = text.toLowerCase().indexOf(lower)
    if (at < 0) return
    out.push({ el, index: out.length + 1, h1, h2, snippet: buildSnippet(text, at, query.length) })
  })

  return out
}

/** 点击结果：篇内结果滚动定位，站内结果跳转文章 */
function onResultClick(result) {
  if (result?.el) {
    goToArticleMatch(result)
    return
  }
  if (result?.blog) navigateToBlog(result.blog.id, keyword.value)
}

/** 滚动到命中段落并短暂高亮 */
function goToArticleMatch(result) {
  const el = result?.el
  if (!el || !document.body.contains(el)) return
  const nav = document.querySelector('.navbar')
  const offset = (nav?.offsetHeight || 0) + 14
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' })

  el.classList.remove('search-target-flash')
  void el.offsetWidth
  el.classList.add('search-target-flash')
  setTimeout(() => el.classList.remove('search-target-flash'), 1800)

  // 移动端面板遮挡面积较大，点击后自动收起
  if (window.matchMedia('(max-width: 720px)').matches) closeSearch()
}

// 跳转到文章
const navigateToBlog = (id, keyword) => {
  closeSearch()
  router.push(`/blog/${id}?q=${encodeURIComponent(keyword)}`)
}

// 详情页 ↔ 其它页面切换时重置搜索，避免篇内结果与站内结果混用
watch(isDetailPage, () => {
  results.value = []
  keyword.value = ''
})

// 监听键盘事件
const handleKeydown = (e) => {
  if (e.key === 'Escape' && isOpen.value) {
    closeSearch()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    if (isOpen.value) {
      closeSearch()
    } else {
      openSearch()
    }
  }
}

// 监听全局事件
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('toggle-search', openSearch)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('toggle-search', openSearch)
})
</script>

<style scoped>
/* ==================================================
   SECTION: 搜索面板 (Search Panel)
   来自 search.css
   ================================================== */

/* ========== 变量 ========== */
:root {
  --macaron-bg: #fff7fb;
  --macaron-accent: #ffd6e8;
  --macaron-mint: #e8fff4;
  --macaron-lavender: #f3e9ff;
  --search-z: 1200;
}

/* ========== 全屏搜索面板 ========== */
.search-panel:not(.right-sidebar) {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.28s ease, visibility 0.28s ease;
}

.search-panel:not(.right-sidebar).active {
  display: flex;
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

/* 搜索容器 */
.search-panel:not(.right-sidebar) .search-wrap {
  position: relative;
  width: min(900px, calc(100vw - 28px));
  height: min(74vh, 520px);
  margin: 0;
  padding: 18px;
  border-radius: 14px;
  background: transparent;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  transform-origin: left bottom;
  transform: translate(-22px, 22px) scale(0.76);
  opacity: 0;
  filter: grayscale(1) saturate(0.2);
  transition: transform 0.32s cubic-bezier(0.2, 0.7, 0.25, 1),
    opacity 0.28s ease,
    filter 0.28s ease;
  will-change: transform, opacity, filter;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-panel:not(.right-sidebar).active .search-wrap {
  transform: translate(0, 0) scale(1);
  opacity: 1;
  filter: grayscale(0) saturate(1);
}

/* 搜索内容 */
.search-panel:not(.right-sidebar) .search-modal-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 8px;
  padding: 18px;
  background:
    linear-gradient(135deg,
      rgba(255, 232, 130, 0.94) 0%,
      rgba(210, 242, 146, 0.94) 50%,
      rgba(255, 220, 148, 0.94) 100%) padding-box,
    linear-gradient(135deg,
      rgba(255, 224, 126, 0.90),
      rgba(206, 238, 140, 0.90),
      rgba(255, 214, 138, 0.90)) border-box;
  border: var(--card-border-w, 2px) solid transparent;
}

/* 关闭按钮（全屏模式） */
.search-panel:not(.right-sidebar) .search-close-btn {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.86);
  color: rgba(0, 0, 0, 0.65);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease, background-color 0.12s ease;
  font-size: 0;
  z-index: 3;
}

.search-panel:not(.right-sidebar) .search-close-btn::before {
  content: '\00d7';
  font-size: 20px;
  line-height: 1;
  font-weight: 600;
}

.search-panel:not(.right-sidebar) .search-close-btn:hover {
  transform: rotate(90deg);
  background: rgba(255, 255, 255, 0.95);
}

.search-panel:not(.right-sidebar) .search-close-btn:active {
  transform: rotate(90deg) scale(0.98);
}

/* 搜索行 */
.search-panel:not(.right-sidebar) .search-row {
  display: flex;
  gap: 12px;
  align-items: center;
  border-radius: 8px;
  padding: 0;
  margin-top: 0;
}

.search-panel:not(.right-sidebar) .search-input {
  flex: 1;
}

.search-panel:not(.right-sidebar) input[type="search"] {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.88);
  padding: 12px 14px;
  border-radius: 10px;
  color: #4a3610;
  outline: none;
  font-size: 1rem;
  box-sizing: border-box;
}

.search-panel:not(.right-sidebar) input[type="search"]:focus {
  box-shadow: 0 0 0 3px rgba(255, 224, 126, 0.3);
}

/* 搜索选项 */
.search-panel:not(.right-sidebar) .search-options {
  padding: 8px 10px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255, 214, 232, 0.36), rgba(232, 255, 244, 0.42));
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.search-panel:not(.right-sidebar) .search-option-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #5f3650;
  font-weight: 600;
  cursor: pointer;
}

.search-panel:not(.right-sidebar) .search-option-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #55c8ff;
  cursor: pointer;
}

/* 搜索结果 */
.search-panel:not(.right-sidebar) .search-results {
  background: rgba(255, 255, 255, 0.76);
  border-radius: 8px;
  box-shadow: none;
  flex: 1 1 auto;
  max-height: none;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.08);
  margin-top: 2px;
  padding: 0;
}

.search-panel:not(.right-sidebar) .search-results::-webkit-scrollbar {
  width: 4px;
}

.search-panel:not(.right-sidebar) .search-results::-webkit-scrollbar-track {
  background: transparent;
}

.search-panel:not(.right-sidebar) .search-results::-webkit-scrollbar-thumb {
  background: rgba(255, 182, 201, 0.5);
  border-radius: 999px;
}

/* 空状态 */
.search-panel:not(.right-sidebar) .search-empty-hint {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 18px;
  color: #7a6a4a;
  font-size: 0.95rem;
}

.search-loading,
.search-empty {
  text-align: center;
  padding: 40px 20px;
  color: rgba(44, 62, 80, 0.5);
  font-size: 0.95rem;
}

.search-loading {
  color: rgba(44, 62, 80, 0.7);
}

/* 搜索结果项 */
.search-panel:not(.right-sidebar) .search-item {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "title tags"
    "snippet tags";
  align-items: start;
  column-gap: 10px;
  row-gap: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
  position: relative;
}

.search-panel:not(.right-sidebar) .search-item:last-child {
  border-bottom: none;
}

.search-panel:not(.right-sidebar) .search-item::before {
  content: '';
  width: 4px;
  height: 100%;
  background: linear-gradient(45deg, #ffb6c9, #a7f3d0, #9ad7ff, #c7b6ff);
  border-radius: 2px;
  position: absolute;
  left: 0;
  top: 0;
}

.search-panel:not(.right-sidebar) .search-item:hover {
  background: rgba(232, 255, 244, 0.3);
}

.search-panel:not(.right-sidebar) .search-item .title {
  grid-area: title;
  font-weight: 700;
  font-size: 1.08rem;
  line-height: 1.4;
  color: #6b2b4a;
  margin-left: 16px;
}

.search-panel:not(.right-sidebar) .search-item .title .blog-type {
  font-size: 0.75rem;
  font-weight: 500;
  color: #ff6f91;
  background: rgba(255, 111, 145, 0.12);
  padding: 1px 10px;
  border-radius: 999px;
  margin-left: 8px;
}

.search-panel:not(.right-sidebar) .search-item .snippet {
  grid-area: snippet;
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.72);
  margin-left: 16px;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.search-panel:not(.right-sidebar) .search-item .meta-tags {
  grid-area: tags;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  justify-self: end;
  align-self: start;
  margin-left: 8px;
}

.search-panel:not(.right-sidebar) .search-item .meta-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #0b7285;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.35;
}


/* ==================================================
   SECTION: 右侧边栏模式（详情页）
   ================================================== */

.search-panel.right-sidebar {
  position: fixed;
  left: auto;
  right: 18px;
  top: 80px;
  width: 360px;
  max-width: calc(100% - 36px);
  z-index: var(--search-z);
  display: block;
  transform: translateX(420px);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.26s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.18s ease;
}

.search-panel.right-sidebar.active {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.search-panel.right-sidebar .search-wrap {
  max-width: 100%;
  margin: 0;
  height: 100%;
  box-sizing: border-box;
  padding: 12px;
  display: flex;
  flex-direction: column;
  background: var(--macaron-bg, #fff7fb);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 6px 28px rgba(34, 34, 34, 0.12);
}

.search-panel.right-sidebar .search-modal-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.search-panel.right-sidebar .search-row {
  width: 100%;
}

.search-panel.right-sidebar .search-input input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: transparent;
  outline: none;
  font-size: 1rem;
  box-sizing: border-box;
}

.search-panel.right-sidebar .search-options {
  margin-top: 2px;
  padding: 8px 10px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255, 214, 232, 0.36), rgba(232, 255, 244, 0.42));
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.search-panel.right-sidebar .search-option-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #5f3650;
  font-weight: 600;
  cursor: pointer;
}

.search-panel.right-sidebar .search-option-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #55c8ff;
  cursor: pointer;
}

.search-panel.right-sidebar .search-close-btn {
  position: absolute;
  top: 8px;
  right: 12px;
  background: transparent;
  border: none;
  color: #6b2b4a;
  font-weight: 700;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.search-panel.right-sidebar .search-close-btn .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.search-panel.right-sidebar .search-close-btn::after {
  content: '✕';
  font-size: 18px;
}

.search-panel.right-sidebar .search-results {
  margin-top: 10px;
  overflow: auto;
  flex: 1 1 auto;
  max-height: none;
  padding-top: 6px;
}

.search-panel.right-sidebar .search-results::-webkit-scrollbar {
  width: 4px;
}

.search-panel.right-sidebar .search-results::-webkit-scrollbar-track {
  background: transparent;
}

.search-panel.right-sidebar .search-results::-webkit-scrollbar-thumb {
  background: rgba(255, 182, 201, 0.5);
  border-radius: 999px;
}

.search-panel.right-sidebar .search-item {
  padding: 10px 12px;
  border-radius: 8px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "title tags"
    "snippet tags";
  gap: 6px;
  column-gap: 10px;
  align-items: start;
  cursor: pointer;
  transition: background 0.2s ease;
}

.search-panel.right-sidebar .search-item:hover {
  background: rgba(232, 255, 244, 0.3);
}

.search-panel.right-sidebar .search-item .title {
  grid-area: title;
  font-weight: 700;
  color: #c9184a !important;
  font-size: 0.95rem;
  line-height: 1.4;
}

.search-panel.right-sidebar .search-item .title .blog-type {
  display: none !important;
}

.search-panel.right-sidebar .search-item .snippet {
  grid-area: snippet;
  font-size: 0.9rem;
  color: #059669 !important;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.search-panel.right-sidebar .search-item .meta-tags {
  grid-area: tags;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
  justify-self: end;
  align-self: start;
}

.search-panel.right-sidebar .search-item .meta-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(159, 232, 201, 0.3);
  font-size: 0.8rem;
  line-height: 1.35;
  color: #0b7285;
}


/* ==================================================
   SECTION: 响应式适配
   ================================================== */

@media (max-width: 768px) {
  .search-panel:not(.right-sidebar) {
    padding: 14px;
  }

  .search-panel:not(.right-sidebar) .search-wrap {
    width: min(100%, calc(100vw - 20px));
    height: min(72vh, 560px);
    padding: 14px;
  }

  .search-panel:not(.right-sidebar) .search-modal-content {
    padding: 14px;
  }

  .search-panel:not(.right-sidebar) .search-row {
    margin-top: 0;
  }

  .search-panel.right-sidebar {
    right: 10px;
    width: 320px;
    max-width: calc(100% - 20px);
    top: 70px;
  }

  .search-panel.right-sidebar .search-wrap {
    padding: 10px;
  }
}

@media (max-width: 480px) {
  .search-panel:not(.right-sidebar) .search-wrap {
    height: min(80vh, 480px);
    padding: 10px;
  }

  .search-panel:not(.right-sidebar) .search-modal-content {
    padding: 10px;
  }

  .search-panel:not(.right-sidebar) input[type="search"] {
    padding: 10px 12px;
    font-size: 0.95rem;
  }

  .search-panel:not(.right-sidebar) .search-item {
    padding: 10px 12px;
  }

  .search-panel:not(.right-sidebar) .search-item .title {
    font-size: 0.95rem;
  }

  .search-panel:not(.right-sidebar) .search-item .snippet {
    font-size: 0.82rem;
  }

  .search-panel.right-sidebar {
    right: 6px;
    width: calc(100% - 12px);
    max-width: 100%;
    top: 60px;
  }
}

/* ========== 全局 body 锁定滚动 ========== */
body.search-modal-open {
  overflow: hidden;
}

/* ========== 减少动画偏好（无障碍） ========== */
@media (prefers-reduced-motion: reduce) {
  .search-panel:not(.right-sidebar) .search-wrap {
    transform: none;
    transition: none;
  }

  .search-panel:not(.right-sidebar).active .search-wrap {
    transform: none;
  }

  .search-panel.right-sidebar {
    transition: none;
  }

  .search-item {
    transition: none !important;
  }
}

/* ==================================================
   SECTION: 详情页篇内搜索（序号 + 命中的一/二级标题 + 摘要）
   ================================================== */

.search-panel.right-sidebar .search-results .search-item.detail-search-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(3, 105, 161, 0.08);
  background: rgba(255, 255, 255, 0.75);
}

.search-panel.right-sidebar .search-results .search-item.detail-search-item .result-index {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1d4ed8;
  background: rgba(191, 219, 254, 0.35);
  border-radius: 8px;
}

.search-panel.right-sidebar .search-results .search-item.detail-search-item .result-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.search-panel.right-sidebar .search-results .search-item.detail-search-item .result-headings {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.search-panel.right-sidebar .search-results .search-item.detail-search-item .result-h1,
.search-panel.right-sidebar .search-results .search-item.detail-search-item .result-h2 {
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-panel.right-sidebar .search-results .search-item.detail-search-item .result-h1 {
  font-size: 0.92rem;
  font-weight: 700;
  color: #00acff;
}

.search-panel.right-sidebar .search-results .search-item.detail-search-item .result-h2 {
  font-size: 0.86rem;
  font-weight: 600;
  color: #13d18a;
}

.search-panel.right-sidebar .search-results .search-item.detail-search-item .result-paragraph {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.88rem;
  line-height: 1.55;
  color: #047857;
}

/* 移动端：详情页搜索改为顶部整宽卡片，点击结果后自动收起 */
@media (max-width: 720px) {
  .search-panel.right-sidebar {
    left: 8px;
    right: 8px;
    top: 66px;
    width: auto;
    max-width: none;
    max-height: calc(100vh - 150px);
  }

  .search-panel.right-sidebar .search-wrap {
    height: auto;
    max-height: inherit;
    padding: 10px;
  }

  .search-panel.right-sidebar .search-results {
    max-height: min(56vh, 460px);
    -webkit-overflow-scrolling: touch;
  }

  .search-panel.right-sidebar .search-results .search-item.detail-search-item {
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 8px;
    padding: 9px 10px;
  }

  .search-panel.right-sidebar .search-results .search-item.detail-search-item .result-index {
    font-size: 0.86rem;
  }

  .search-panel.right-sidebar .search-results .search-item.detail-search-item .result-h1 {
    font-size: 0.86rem;
  }

  .search-panel.right-sidebar .search-results .search-item.detail-search-item .result-h2 {
    font-size: 0.8rem;
  }

  .search-panel.right-sidebar .search-results .search-item.detail-search-item .result-paragraph {
    font-size: 0.82rem;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
}

/* ==================================================
   SECTION: 详情页侧边卡片——结果列表内部滚动
   （滚轮悬停在列表上时只滚动列表，不再带动整页）
   ================================================== */

.search-panel.right-sidebar {
  max-height: calc(100vh - 100px);
}

.search-panel.right-sidebar .search-results {
  min-height: 0;
  max-height: min(56vh, 520px);
  overscroll-behavior: contain;
}

@media (max-width: 720px) {
  .search-panel.right-sidebar .search-results {
    max-height: min(50vh, 420px);
    -webkit-overflow-scrolling: touch;
  }
}

/* 侧边卡片输入框：同样内嵌放大镜图标 */
.search-panel.right-sidebar .search-input {
  position: relative;
  display: flex;
  align-items: center;
}

.search-panel.right-sidebar .search-input-icon {
  position: absolute;
  left: 12px;
  font-size: 0.9rem;
  color: rgba(0, 172, 255, 0.7);
  pointer-events: none;
}

.search-panel.right-sidebar .search-input input {
  padding-left: 34px;
}

/* ==================================================
   SECTION: 站内搜索弹窗样式优化（非详情页）
   ================================================== */

.search-panel.search-card {
  background: rgba(24, 40, 52, 0.42);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}

.search-panel.search-card .search-wrap {
  width: min(860px, calc(100vw - 28px));
  height: min(72vh, 560px);
  padding: 0;
  border-radius: 18px;
  background: transparent;
  box-shadow: 0 24px 60px rgba(24, 40, 52, 0.28);
}

/* 卡片：白底 + 马卡龙渐变描边（与详情页文章卡片一致） */
.search-panel.search-card .search-modal-content {
  gap: 12px;
  padding: 16px 18px 14px;
  border-radius: 18px;
  border: 3px solid transparent;
  background:
    linear-gradient(rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.96)) padding-box,
    linear-gradient(135deg,
      rgba(255, 182, 201, 0.95),
      rgba(154, 215, 255, 0.92),
      rgba(167, 243, 208, 0.92)) border-box;
}

/* 标题栏 */
.search-panel.search-card .search-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 42px;
}

.search-panel.search-card .search-head-icon {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.86rem;
  color: #ffffff;
  background: linear-gradient(135deg, #9ad7ff 0%, #a7f3d0 100%);
  box-shadow: 0 6px 14px rgba(72, 219, 187, 0.22);
}

.search-panel.search-card .search-head-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #2b3440;
  letter-spacing: 0.02em;
}

.search-panel.search-card .search-head-hint {
  margin-left: auto;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.76rem;
  color: #7b8794;
  background: rgba(154, 215, 255, 0.14);
}

/* 输入框：内嵌放大镜图标 */
.search-panel.search-card .search-input {
  position: relative;
  display: flex;
  align-items: center;
}

.search-panel.search-card .search-input-icon {
  position: absolute;
  left: 14px;
  font-size: 0.95rem;
  color: rgba(0, 172, 255, 0.75);
  pointer-events: none;
}

.search-panel.search-card input[type="search"] {
  padding: 12px 14px 12px 40px;
  border-radius: 12px;
  border: 1px solid rgba(154, 215, 255, 0.45);
  background: rgba(255, 255, 255, 0.95);
  color: #2b3440;
  font-size: 1rem;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.search-panel.search-card input[type="search"]:focus {
  border-color: rgba(0, 172, 255, 0.55);
  box-shadow: 0 0 0 4px rgba(154, 215, 255, 0.22);
}

/* 选项做成轻量胶囊 */
.search-panel.search-card .search-options {
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px dashed rgba(19, 209, 138, 0.35);
  background: rgba(167, 243, 208, 0.18);
}

.search-panel.search-card .search-option-item {
  gap: 7px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #3f6b57;
}

/* 结果区与结果卡片 */
.search-panel.search-card .search-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 0;
  padding: 6px;
  border-radius: 14px;
  border: 1px solid rgba(24, 49, 58, 0.08);
  background: rgba(255, 255, 255, 0.72);
  overscroll-behavior: contain;
}

.search-panel.search-card .search-empty-hint {
  flex: 1 1 auto;
  color: #7b8794;
}

.search-panel.search-card .search-results .search-item {
  padding: 11px 12px;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 10px;
  background: transparent;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}

/* 去掉左侧渐变竖条与小横线装饰 */
.search-panel.search-card .search-results .search-item::before {
  content: none;
}

.search-panel.search-card .search-results .search-item:hover {
  background: rgba(154, 215, 255, 0.14);
  border-color: rgba(154, 215, 255, 0.35);
  transform: translateY(-1px);
}

.search-panel.search-card .search-results .search-item .title {
  margin-left: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.45;
  color: #1f3b57;
}

.search-panel.search-card .search-results .search-item .title .blog-type {
  color: #0b7285;
  background: rgba(167, 243, 208, 0.32);
}

.search-panel.search-card .search-results .search-item .snippet {
  margin-left: 0;
  margin-top: 2px;
  font-size: 0.92rem;
  line-height: 1.6;
  color: #5f6b7a;
}

.search-panel.search-card .search-results .search-item .meta-tag {
  background: rgba(167, 243, 208, 0.34);
  color: #0b7285;
}

/* 底部状态栏 */
.search-panel.search-card .search-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 4px;
  font-size: 0.8rem;
  color: #7b8794;
}

.search-panel.search-card .search-foot-count {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.search-panel.search-card .search-foot-deco {
  flex: 1 1 auto;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg,
    rgba(255, 182, 201, 0.55),
    rgba(154, 215, 255, 0.55),
    rgba(167, 243, 208, 0.55));
}

.search-panel.search-card .search-close-btn {
  top: 14px;
  right: 14px;
}

/* 弹窗移动端适配 */
@media (max-width: 720px) {
  .search-panel.search-card {
    padding: 10px;
  }

  .search-panel.search-card .search-wrap {
    width: calc(100vw - 20px);
    height: min(78vh, 620px);
    border-radius: 16px;
  }

  .search-panel.search-card .search-modal-content {
    gap: 10px;
    padding: 14px 12px 12px;
    border-width: 2px;
  }

  .search-panel.search-card .search-head {
    padding-right: 38px;
  }

  .search-panel.search-card .search-head-title {
    font-size: 0.98rem;
  }

  .search-panel.search-card .search-head-hint {
    display: none;
  }

  .search-panel.search-card .search-results {
    padding: 4px;
  }

  .search-panel.search-card .search-results .search-item {
    padding: 10px;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "title"
      "snippet";
  }

  .search-panel.search-card .search-results .search-item .meta-tags {
    display: none;
  }

  .search-panel.search-card .search-results .search-item .title {
    font-size: 0.95rem;
  }

  .search-panel.search-card .search-results .search-item .snippet {
    font-size: 0.86rem;
  }
}
</style>