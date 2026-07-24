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
          <ArticleContent :html="renderedHtml" />
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
import ArticleContent from '@/components/blog-detail/ArticleContent.vue'

const i18n = useI18nStore()
const blogStore = useBlogStore()
const { renderMarkdown, stripFrontMatter } = useMarkdown()

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
        renderedHtml.value = await renderMarkdown(cleaned, path)
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

<style scoped>
/* ============================================================
   页面背景（伪元素）- 与博客详情页保持一致
   ============================================================ */
.about-page {
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

.about-page::before {
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

.about-page::after {
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

/* ============================================================
   容器
   ============================================================ */
.container {
  display: flex;
  gap: 32px;
  position: relative;
  z-index: 2;
}

/* 内容包裹层：实现左右双栏布局 */
.content-wrapper {
  display: flex;
  gap: 32px;
  width: 100%;
  position: relative;
}

/* ============================================================
   左侧：个人资料卡片（替换 TOC 位置）
   ============================================================ */
.blog-toc#profile-card-aside {
  position: sticky;
  top: 100px;
  align-self: flex-start;
  width: 280px;
  flex: 0 0 280px;
}

.profile-card {
  background: rgba(255, 255, 255, 0.78);
  border-radius: 16px;
  box-shadow: var(--detail-shadow);
  padding: 32px 24px;
  border: 5px solid transparent;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.78)),
    var(--detail-border);
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
}

/* -- 头像 -- */
.avatar {
  text-align: center;
  margin-bottom: 16px;
}

.avatar img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid transparent;
  background-image: linear-gradient(135deg, var(--detail-pink), var(--detail-sky), var(--detail-mint));
  background-origin: border-box;
  background-clip: padding-box, border-box;
  box-shadow: 0 4px 14px rgba(44, 62, 80, 0.12);
}

/* -- 用户名 -- */
.name {
  text-align: center;
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 20px;
  background: linear-gradient(90deg, #00acff 0%, #48dbbb 50%, #ff6e9b 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

/* -- 个人信息行 -- */
.profile-info {
  margin-bottom: 20px;
}

.profile-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.profile-row:last-child {
  border-bottom: none;
}

.profile-label {
  color: var(--detail-muted);
  font-size: 0.9rem;
}

.profile-value {
  color: var(--detail-text);
  font-weight: 500;
  font-size: 0.95rem;
}

/* -- 兴趣标签 -- */
.profile-interests {
  margin-bottom: 20px;
}

.interests-label {
  font-size: 0.9rem;
  color: var(--detail-muted);
  margin-bottom: 8px;
}

.interests-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.interest {
  background: rgba(52, 152, 219, 0.08);
  color: #18313a;
  border-radius: 12px;
  padding: 3px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 160ms ease, transform 120ms ease;
}

.interest:hover {
  background: rgba(52, 152, 219, 0.14);
  transform: translateY(-2px);
}

/* -- 统计数字 -- */
.stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
  padding: 16px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.stat {
  text-align: center;
}

.stat-link {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-link:hover {
  text-decoration: none;
}

.stat .count {
  font-size: 1.4rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color), #48dbbb);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.stat .label {
  font-size: 0.8rem;
  color: var(--detail-muted);
}

/* -- 社交链接 -- */
.contact-links {
  text-align: center;
}

.contact-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--detail-pink), var(--detail-sky));
  color: white;
  font-size: 1.3rem;
  transition: transform 200ms ease, box-shadow 200ms ease;
  text-decoration: none;
}

.contact-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(255, 182, 201, 0.3);
  text-decoration: none;
}

/* ============================================================
   右侧：文章区域（与博客详情页一致）
   ============================================================ */
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

/* -- 文章内容排版由 ArticleContent 组件提供 -- */

/* ============================================================
   响应式适配
   ============================================================ */

/* 中屏：侧栏折叠到上方 */
@media (max-width: 960px) {
  .content-wrapper {
    flex-direction: column;
  }

  .blog-toc#profile-card-aside {
    width: 100%;
    flex: none;
    position: static;
    align-self: auto;
  }

  .profile-card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
    padding: 24px 20px;
  }

  .profile-card .avatar {
    margin-bottom: 0;
    flex: 0 0 auto;
  }

  .profile-card .avatar img {
    width: 72px;
    height: 72px;
  }

  .profile-card .name {
    margin-bottom: 0;
    font-size: 1.2rem;
  }

  .profile-card .profile-info {
    flex: 1 1 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    margin-bottom: 8px;
  }

  .profile-card .profile-row {
    border-bottom: none;
    padding: 4px 0;
    flex: 0 0 auto;
  }

  .profile-card .profile-interests {
    flex: 1 1 100%;
    margin-bottom: 8px;
  }

  .profile-card .stats {
    flex: 1 1 100%;
    margin-bottom: 0;
    padding: 12px 0;
  }

  .profile-card .contact-links {
    flex: 0 0 auto;
    margin-left: auto;
  }
}

/* 小屏：移动端精简 */
@media (max-width: 720px) {
  .blog-article {
    padding: 24px 16px 16px 16px;
    margin-top: 16px;
    margin-bottom: 16px;
  }

  .article-title {
    font-size: 1.6rem;
  }

  .profile-card {
    padding: 20px 16px;
  }
}
</style>
