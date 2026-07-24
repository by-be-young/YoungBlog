<template>
  <main class="blog-detail-page">
    <div class="container">
      <TOC :content-html="renderedHtml">
        <template #footer>
          <PostNav
            :prev="prevBlog"
            :next="nextBlog"
            :similar="similarBlog"
            @navigate="navigate"
          />
        </template>
      </TOC>

      <!-- 文章主体 -->
      <article class="blog-article">
        <header class="article-header">
          <h1 class="article-title">{{ blog?.title || '加载中...' }}</h1>
          <div class="article-meta">
            <span class="date"><i class="far fa-calendar"></i> {{ blog ? formatDate(blog.date) : '' }}</span>
            <span v-if="blog?.lastEditedDate" class="date"><i class="fas fa-pencil-alt"></i> {{ formatDate(blog.lastEditedDate) }}</span>
            <div class="article-metrics">
              <span class="article-metric-item"><i class="far fa-file-lines"></i> {{ wordCount }}</span>
              <span class="article-metric-item" v-if="pv"><i class="far fa-eye"></i> {{ pv }}</span>
              <span class="article-metric-item" v-if="uv"><i class="far fa-user"></i> {{ uv }}</span>
            </div>
            <div class="tags" v-if="blog?.tags">
              <router-link
                v-for="tag in blog.tags"
                :key="tag"
                class="tag"
                :to="`/categories?tags=${encodeURIComponent(JSON.stringify([tag]))}`"
              >{{ tag }}</router-link>
            </div>
          </div>
        </header>

        <!-- 文章内容组件 -->
        <ArticleContent :html="renderedHtml" />

        <LicenseNotice :permalink="permalink" />
      </article>
    </div>

    <FloatingControls
      @toggle-immersive="toggleImmersive"
      @open-export="openExportModal"
      @open-display="openDisplayModal"
      @back="backToPrevious"
    />

    <ExportModal ref="exportModalRef" :content="rawMarkdown" />
    <DisplayModal ref="displayModalRef" />
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blogStore'
import { useI18nStore } from '@/stores/i18nStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useMarkdown } from '@/composables/useMarkdown'
import { resolveUrl } from '@/utils/url'

// 导入新组件
import TOC from '@/components/blog-detail/TOC.vue'
import ArticleContent from '@/components/blog-detail/ArticleContent.vue'
import LicenseNotice from '@/components/common/LicenseNotice.vue'
import PostNav from '@/components/blog-detail/PostNav.vue'
import FloatingControls from '@/components/blog-detail/FloatingControls.vue'
import ExportModal from '@/components/blog-detail/ExportModal.vue'
import DisplayModal from '@/components/blog-detail/DisplayModal.vue'

const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()
const i18n = useI18nStore()
const settings = useSettingsStore()
const { renderMarkdown, stripFrontMatter } = useMarkdown()
// 响应式数据
const blog = ref(null)
const rawMarkdown = ref('')
const renderedHtml = ref('')
const wordCount = ref(0)
const pv = ref(0)
const uv = ref(0)
const prevBlog = ref(null)
const nextBlog = ref(null)
const similarBlog = ref(null)

const exportModalRef = ref(null)
const displayModalRef = ref(null)

// 永久链接
const permalink = computed(() => {
  if (!blog.value) return ''
  return new URL(`/blog-detail?id=${blog.value.id}`, window.location.origin).href
})

// 格式化日期
function formatDate(dateStr) {
  const date = new Date(dateStr)
  const lang = i18n.lang
  try {
    if (lang === 'en') return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    if (lang === 'ja') return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

// 加载文章
async function loadBlog() {
  const id = route.params.id
  let found = blogStore.getBlogById(id)
  if (!found) {
    await blogStore.fetchBlogs()
    found = blogStore.getBlogById(id)
    if (!found) {
      router.push('/')
      return
    }
  }
  blog.value = found

  if (found.contentFile) {
    try {
      const res = await fetch(resolveUrl(found.contentFile))
      const text = await res.text()
      rawMarkdown.value = text
      const cleaned = stripFrontMatter(text)
      // 字数统计
      const cleanText = cleaned.replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#>*~\-]/g, ' ')
        .replace(/\s+/g, '')
      wordCount.value = cleanText.length

      const html = await renderMarkdown(cleaned, found.contentFile)
      renderedHtml.value = html

      // 等待 DOM 更新后，TOC 组件会自动根据 contentRef 生成目录
      // 但为了保险，可以在 nextTick 中手动触发（如果 TOC 组件监听 contentRef 变化，它会自动处理）
      // 我们不需要手动调用 generate

      document.title = found.title || '博客详情'
    } catch (e) {
      console.error('[BlogDetail] 加载失败', e)
      renderedHtml.value = '<p>文章加载失败</p>'
    }
  }

  // 计算导航文章（与之前相同）
  const allBlogs = blogStore.blogs
  const series = found.series || ''
  let sorted = []
  if (series) {
    sorted = allBlogs.filter(b => b.series === series)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  } else {
    sorted = allBlogs.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
  }
  const idx = sorted.findIndex(b => String(b.id) === String(found.id))
  if (idx > -1) {
    prevBlog.value = sorted[idx - 1] || null
    nextBlog.value = sorted[idx + 1] || null
  }

  // 相似文章
  if (!series) {
    const tags = found.tags || []
    let similar = null
    if (tags.length >= 3) {
      similar = allBlogs.find(b => String(b.id) !== String(found.id) &&
        b.tags && b.tags[0] === tags[0] && b.tags[1] === tags[1] && b.tags[2] === tags[2])
    }
    if (!similar && tags.length >= 2) {
      similar = allBlogs.find(b => String(b.id) !== String(found.id) &&
        b.tags && b.tags[0] === tags[0] && b.tags[1] === tags[1])
    }
    if (!similar && tags.length >= 1) {
      similar = allBlogs.find(b => String(b.id) !== String(found.id) &&
        b.tags && b.tags[0] === tags[0])
    }
    similarBlog.value = similar
  }
}

// 当文章内容渲染完成后，TOC 组件会监听 content-html prop 自动生成目录

// 导航跳转
function navigate(href) {
  if (window.navigateWithTransition) {
    window.navigateWithTransition(href)
  } else {
    router.push(href)
  }
}

// 沉浸模式切换
function toggleImmersive() {
  settings.toggleImmersive()
  document.body.classList.toggle('immersive-reading-active', settings.isImmersive)
}

// 弹窗打开
function openExportModal() {
  exportModalRef.value?.open()
}
function openDisplayModal() {
  displayModalRef.value?.open()
}
function backToPrevious() {
  // 实现返回引用位置（可参考老代码）
  if (window.__internalRefBackState?.available) {
    const state = window.__internalRefBackState
    window.scrollTo({ top: state.scrollY, behavior: 'smooth' })
    if (state.hash) history.replaceState(null, '', state.hash)
    state.available = false
    window.dispatchEvent(new CustomEvent('internal-ref:back-state-change'))
  }
}

// 挂载时加载
onMounted(() => {
  if (!blogStore.blogs.length) {
    blogStore.fetchBlogs().then(loadBlog)
  } else {
    loadBlog()
  }
})

// 路由变化重新加载
watch(() => route.params.id, loadBlog)
</script>


<style scoped>
/* ===== 页面背景（伪元素） ===== */
.blog-detail-page {
  --h3-heading-color: #ff8f9e;
  --primary-color: #55c8ff;
  --secondary-color: #a7f3d0;
  --detail-pink: #ffb6c9;
  --detail-peach: #ffd2a6;
  --detail-mint: #a7f3d0;
  --detail-sky: #9ad7ff;
  --detail-text: #2b3440;
  --detail-muted: #5f6b7a;
  --detail-shadow: 0 16px 34px rgba(44, 62, 80, 0.14);
  --detail-border: linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.92), rgba(167, 243, 208, 0.92));
  position: relative;
  z-index: 2;
  min-height: 100vh;
  background: none;
}

.blog-detail-page::before {
  content: '';
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100vh;
  height: 100svh;
  background-image: url('/assets/detail_bg.png');
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  transform: scale(1);
  opacity: 1;
  transition: opacity 1.05s cubic-bezier(0.22, 1, 0.36, 1), transform 1.05s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 0;
}

.blog-detail-page::after {
  content: '';
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100vh;
  height: 100svh;
  background: linear-gradient(135deg,
      rgba(255, 182, 201, 0.18) 0%,
      rgba(167, 243, 208, 0.18) 45%,
      rgba(199, 182, 255, 0.16) 100%);
  opacity: 1;
  transition: opacity 0.95s cubic-bezier(0.22, 1, 0.36, 1), background 0.95s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 1;
}

/* 沉浸阅读：淡出背景图 */
.blog-detail-page.immersive-reading-active::before {
  opacity: 0;
  transform: scale(1.04);
}

.blog-detail-page.immersive-reading-active::after {
  background: rgba(247, 250, 253, 0.96);
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
  background: rgba(255, 255, 255, 0.78);
  border-radius: 16px;
  box-shadow: var(--detail-shadow);
  padding: 40px 32px 32px 32px;
  margin-top: 40px;
  margin-bottom: 40px;
  border: 5px solid transparent;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.78)),
    var(--detail-border);
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
}

/* 宽屏模式 */
.blog-article.wide-mode {
  max-width: 1200px;
  width: calc(100% - 96px);
  margin-left: auto;
  margin-right: auto;
  transition: max-width 0.28s ease, width 0.28s ease, box-shadow 0.28s ease;
}

/* ===== 文章头部 ===== */
.article-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
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
  background: linear-gradient(90deg, #00acff 0%, #48dbbb 50%, #ff6e9b 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 6px 12px rgba(0, 172, 255, 0.12));
}

.article-meta {
  color: var(--gray-color, #5f6b7a);
  font-size: 1rem;
  display: flex;
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 8px;
}

.article-metrics {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 1.6em;
}

.article-metric-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5f6b7a;
  font-size: 0.96rem;
}

.article-metric-item i {
  font-size: 0.95rem;
  opacity: 0.88;
}

.tags {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tag {
  background: rgba(52, 152, 219, 0.08);
  color: var(--primary-color, #2d8cf0);
  border-radius: 12px;
  padding: 3px 12px;
  font-size: 0.92rem;
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
  transition: background 160ms ease, transform 120ms ease, color 120ms ease;
  color: #18313a;
  font-weight: 600;
}

a.tag:hover {
  background: rgba(52, 152, 219, 0.14);
  transform: translateY(-2px);
  text-decoration: none;
}

/* 沉浸阅读：隐藏导航栏 */
.blog-detail-page.immersive-reading-active .navbar {
  transform: translateY(calc(-100% - 24px));
  opacity: 0;
  pointer-events: none;
}

/* 移动端适配 */
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
  .blog-article {
    padding: 24px 16px 16px 16px;
    margin-top: 16px;
    margin-bottom: 16px;
  }
}
</style>
