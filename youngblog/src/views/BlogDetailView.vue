<template>
  <main class="blog-detail">
    <div class="container" style="display: flex; gap: 32px;">
      <!-- 目录 -->
      <nav class="blog-toc" id="blog-toc">
        <div class="toc-title">{{ i18n.t('toc') }}</div>
        <div class="toc-progress" id="toc-progress">0</div>
        <ul class="toc-list" id="toc-list">
          <li v-for="heading in tocItems" :key="heading.id">
            <a :href="`#${heading.id}`" @click.prevent="scrollToHeading(heading.id)">
              {{ heading.text }}
            </a>
          </li>
        </ul>
      </nav>

      <!-- 文章内容 -->
      <article class="blog-article" style="flex:1;">
        <header class="article-header">
          <h1 class="article-title" id="article-title">{{ blog?.title || '加载中...' }}</h1>
          <div class="article-meta">
            <span class="date">{{ blog ? formatDate(blog.date) : '' }}</span>
            <div class="article-metrics">
              <span class="article-metric-item">
                <i class="far fa-file-lines"></i>
                <span>{{ wordCount }}</span>
              </span>
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

        <div class="article-content" v-html="renderedHtml"></div>
      </article>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'
import { useMarkdown } from '@/composables/useMarkdown'

const route = useRoute()
const router = useRouter()
const i18n = useI18nStore()
const blogStore = useBlogStore()
const { renderMarkdown, stripFrontMatter, isLoading } = useMarkdown()

const blog = ref(null)
const renderedHtml = ref('')
const wordCount = ref(0)
const tocItems = ref([])

// 加载文章
const loadBlog = async () => {
  const id = route.params.id
  const found = blogStore.getBlogById(id)
  
  if (!found) {
    // 如果没找到，尝试重新加载数据
    await blogStore.fetchBlogs()
    const refound = blogStore.getBlogById(id)
    if (!refound) {
      router.push('/')
      return
    }
    blog.value = refound
  } else {
    blog.value = found
  }
  
  // 加载 Markdown
  if (blog.value?.contentFile) {
    try {
      const res = await fetch(blog.value.contentFile)
      const text = await res.text()
      const cleaned = stripFrontMatter(text)
      
      // 统计字数
      const cleanText = cleaned.replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#>*~\-]/g, ' ')
        .replace(/\s+/g, '')
      wordCount.value = cleanText.length
      
      renderedHtml.value = await renderMarkdown(cleaned)
      
      // 生成目录
      generateToc(renderedHtml.value)
      
      document.title = blog.value.title || '博客详情'
    } catch (e) {
      console.error('[BlogDetail] 加载失败:', e)
      renderedHtml.value = '<p>文章加载失败</p>'
    }
  }
}

// 生成目录
const generateToc = (html) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const headings = doc.querySelectorAll('h1, h2, h3')
  
  tocItems.value = Array.from(headings).map(h => ({
    id: h.id || `heading-${Math.random().toString(36).slice(2)}`,
    text: h.textContent || '',
    level: parseInt(h.tagName[1])
  }))
}

// 滚动到标题
const scrollToHeading = (id) => {
  const el = document.getElementById(id)
  if (el) {
    const nav = document.querySelector('.navbar')
    const offset = nav ? nav.offsetHeight : 60
    const y = el.getBoundingClientRect().top + window.scrollY - offset - 10
    window.scrollTo({ top: y, behavior: 'smooth' })
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const lang = i18n.getLang()
  try {
    if (lang === 'en') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    if (lang === 'ja') {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    }
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

// 路由变化时重新加载
watch(() => route.params.id, loadBlog)
</script>