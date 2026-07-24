<template>
  <main class="blog-detail-page about-page">
    <div class="container">
      <div class="content-wrapper">
        <!-- 左侧：个人资料 -->
        <aside class="blog-toc" id="profile-card-aside">
          <div class="profile-card" id="about-profile-card">
            <div class="avatar">
              <img src="/assets/avatar.png" alt="头像">
            </div>
            <h2 class="name">{{ i18n.t('profile_name') }}</h2>
            
            <div class="profile-info">
              <div class="profile-row">
                <span class="profile-label">{{ i18n.t('label_school') }}</span>
                <span class="profile-value">{{ i18n.t('school_name') }}</span>
              </div>
              <div class="profile-row">
                <span class="profile-label">{{ i18n.t('label_degree') }}</span>
                <span class="profile-value">{{ i18n.t('degree_name') }}</span>
              </div>
              <div class="profile-row">
                <span class="profile-label">{{ i18n.t('label_grade') }}</span>
                <span class="profile-value">{{ i18n.t('grade_value') }}</span>
              </div>
              <div class="profile-row">
                <span class="profile-label">{{ i18n.t('label_department') }}</span>
                <span class="profile-value">{{ i18n.t('department_value') }}</span>
              </div>
            </div>

            <div class="profile-interests">
              <div class="interests-label">{{ i18n.t('label_interests') }}</div>
              <div class="interests-list">
                <span class="interest">{{ i18n.t('interest_game') }}</span>
                <span class="interest">{{ i18n.t('interest_literature') }}</span>
                <span class="interest">{{ i18n.t('interest_jpop') }}</span>
                <span class="interest">{{ i18n.t('interest_language') }}</span>
              </div>
            </div>

            <div class="stats">
              <div class="stat">
                <router-link class="stat-link" to="/archive">
                  <span class="count">{{ blogStore.totalPosts }}</span>
                  <span class="label">{{ i18n.t('posts') }}</span>
                </router-link>
              </div>
              <div class="stat">
                <router-link class="stat-link" to="/archive">
                  <span class="count">{{ wordCount }}</span>
                  <span class="label">{{ i18n.t('total_words') }}</span>
                </router-link>
              </div>
              <div class="stat">
                <router-link class="stat-link" to="/categories">
                  <span class="count">{{ blogStore.tags.length }}</span>
                  <span class="label">{{ i18n.t('tags') }}</span>
                </router-link>
              </div>
            </div>

            <div class="social-links contact-links">
              <a href="https://github.com/by-be-young" target="_blank" rel="noopener noreferrer" class="contact-btn">
                <i class="fab fa-github"></i>
              </a>
            </div>
          </div>
        </aside>

        <!-- 右侧：内容 -->
        <article class="blog-article">
          <header class="article-header">
            <h1 class="article-title">About</h1>
          </header>
          <div class="article-content" v-html="renderedHtml"></div>
        </article>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'
import { useMarkdown } from '@/composables/useMarkdown'

const i18n = useI18nStore()
const blogStore = useBlogStore()
const { renderMarkdown, stripFrontMatter, isLoading } = useMarkdown()

const renderedHtml = ref('')
const wordCount = ref('0.0w')

// 加载 About 内容
const loadAbout = async () => {
  const lang = i18n.getLang()
  const paths = [
    `/data/about.${lang}.md`,
    `/data/about.${lang}.markdown`,
    `/data/about.md.${lang}`,
    `/data/about.md`
  ]
  
  for (const path of paths) {
    try {
      const res = await fetch(path)
      if (res.ok) {
        const text = await res.text()
        const cleaned = stripFrontMatter(text)
        renderedHtml.value = await renderMarkdown(cleaned)
        return
      }
    } catch (e) {
      // 继续尝试下一个路径
    }
  }
  
  renderedHtml.value = '<p>内容加载失败，请稍后重试。</p>'
}

// 计算字数
const calculateWordCount = async () => {
  try {
    const files = blogStore.blogs.map(b => b.contentFile).filter(Boolean)
    let total = 0
    for (const file of files) {
      const res = await fetch(file)
      const text = await res.text()
      const clean = text.replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#>*~\-]/g, ' ')
        .replace(/\s+/g, '')
      total += clean.length
    }
    const lang = i18n.getLang()
    wordCount.value = lang === 'zh' ? (total / 10000).toFixed(1) + 'w' : Math.round(total / 1000) + 'k'
  } catch (e) {
    wordCount.value = '0.0w'
  }
}

onMounted(() => {
  loadAbout()
  if (!blogStore.blogs.length) {
    blogStore.fetchBlogs().then(() => calculateWordCount())
  } else {
    calculateWordCount()
  }
})

// 语言切换时重新加载
window.addEventListener('site:languageChanged', loadAbout)
</script>