<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="search-panel"
      :class="[{ active: isOpen, 'right-sidebar': isDetailPage }]"
      @click="handleBackdropClick"
    >
      <div class="search-wrap" role="dialog" aria-label="site-search">
        <!-- 关闭按钮 -->
        <button class="search-close-btn" @click="closeSearch">
          <span class="sr-only">{{ i18n.currentTranslations.search_close }}</span>
        </button>

        <div class="search-modal-content">
          <!-- 搜索输入 -->
          <div class="search-row">
            <div class="search-input">
              <input 
                ref="inputRef"
                type="search" 
                :placeholder="i18n.currentTranslations.search_placeholder"
                v-model="keyword"
                @input="onSearch"
                @keydown.enter="onSearch"
                aria-label="搜索输入"
              />
            </div>
          </div>

          <!-- 搜索选项 -->
          <div class="search-options" role="group" aria-label="search-options">
            <label class="search-option-item">
              <input type="checkbox" v-model="includeBody" />
              <span>{{ i18n.currentTranslations.search_include_body }}</span>
            </label>
          </div>

          <!-- 搜索结果 -->
          <div class="search-results" id="search-results" role="list">
            <div v-if="!keyword" class="search-empty-hint">
              {{ i18n.currentTranslations.search_idle_hint }}
            </div>
            <div v-else-if="isLoading" class="search-loading">
              {{ i18n.currentTranslations.search_body_loading }}
            </div>
            <div v-else-if="results.length === 0" class="search-empty">
              {{ i18n.currentTranslations.search_no_results }}
            </div>
            <div 
              v-for="(result, index) in results" 
              :key="index"
              class="search-item"
              @click="navigateToBlog(result.blog.id, keyword)"
            >
              <div class="title">
                {{ result.blog.title }}
                <span v-if="result.blog.type" class="blog-type">{{ result.blog.type }}</span>
              </div>
              <div class="snippet">{{ result.blog.excerpt || '' }}</div>
              <div v-if="result.blog.tags" class="meta-tags">
                <span v-for="tag in result.blog.tags" :key="tag" class="meta-tag">{{ tag }}</span>
              </div>
            </div>
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
  document.body.classList.add('search-modal-open')
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
          const res = await fetch(blog.contentFile)
          const text = await res.text()
          if (text.toLowerCase().includes(q)) score += 5
        } catch (e) {
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

// 跳转到文章
const navigateToBlog = (id, keyword) => {
  closeSearch()
  router.push(`/blog/${id}?q=${encodeURIComponent(keyword)}`)
}

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
</style>