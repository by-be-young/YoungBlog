<template>
  <main class="blog-detail-page">
    <div class="container" style="display:flex;gap:32px;">
      <TOC 
        :items="tocItems" 
        :active-id="activeId" 
        :progress="progress"
        @scroll-to="scrollToHeading"
        class="blog-toc"
      />
      <article class="blog-article" style="flex:1;">
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

        <ArticleContent :html="renderedHtml" @toc-update="onTocUpdate" ref="contentRef" />

        <LicenseNotice :permalink="permalink" />

        <PostNav 
          :prev="prevBlog" 
          :next="nextBlog" 
          :similar="similarBlog"
          @navigate="navigate"
        />
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blogStore'
import { useI18nStore } from '@/stores/i18nStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useMarkdown } from '@/composables/useMarkdown'
import { useToc } from '@/composables/useToc'
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
const { tocItems, activeId, progress, generateToc, scrollToHeading } = useToc()

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

const permalink = computed(() => {
  if (!blog.value) return ''
  return new URL(`/blog-detail?id=${blog.value.id}`, window.location.origin).href
})

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
      const res = await fetch(found.contentFile)
      const text = await res.text()
      rawMarkdown.value = text
      const cleaned = stripFrontMatter(text)
      const cleanText = cleaned.replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#>*~\-]/g, ' ')
        .replace(/\s+/g, '')
      wordCount.value = cleanText.length

      const html = await renderMarkdown(cleaned, found.contentFile)
      renderedHtml.value = html
      generateToc(html)
      document.title = found.title || '博客详情'
    } catch (e) {
      console.error('[BlogDetail] 加载失败', e)
      renderedHtml.value = '<p>文章加载失败</p>'
    }
  }

  // 导航
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

  // 相似
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

function onTocUpdate(html) {
  generateToc(html)
}

function navigate(href) {
  if (window.navigateWithTransition) {
    window.navigateWithTransition(href)
  } else {
    router.push(href)
  }
}

function toggleImmersive() {
  settings.toggleImmersive()
  document.body.classList.toggle('immersive-reading-active', settings.isImmersive)
}

function openExportModal() {
  exportModalRef.value?.open()
}

function openDisplayModal() {
  displayModalRef.value?.open()
}

function backToPrevious() {
  // 实现返回引用位置
}

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

onMounted(() => {
  if (!blogStore.blogs.length) {
    blogStore.fetchBlogs().then(loadBlog)
  } else {
    loadBlog()
  }
})

watch(() => route.params.id, loadBlog)
</script>

<style scoped>
/* 全局导入样式 */
@import '@/css/blog-detail.css';
@import '@/css/blog-detail-toc.css';
@import '@/css/blog-detail-question.css';
@import '@/css/blog-detail-macaron.css';
</style>