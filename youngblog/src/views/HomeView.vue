<template>
  <main>
    <!-- Hero 区域 -->
    <section class="hero-section">
      <div class="hero-content">
        <!-- 直接使用 currentTranslations，用 v-html 渲染换行 -->
        <h1 class="welcome-text" v-html="i18n.currentTranslations.welcome_text.replace(/\n/g, '<br>')"></h1>
        <p class="subtitle">{{ i18n.currentTranslations.beihang }}</p>
      </div>
      <div class="scroll-down" @click="scrollToContent">
        <p class="music-tip">{{ i18n.currentTranslations.settings_music_hint }}</p>
        <i class="fas fa-chevron-down bounce"></i>
      </div>
    </section>

    <section class="content-section">
      <div class="container">
        <div class="content-wrapper">
          <aside class="sidebar">
            <ProfileCard />
          </aside>

          <div class="main-content">
            <div class="blog-grid" id="blogGrid">
              <RecentUpdatesCard v-if="recentBlogs.length" :blogs="recentBlogs" />
              
              <div class="recommended-blogs-card" style="grid-column: 1 / -1;">
                <span class="recommended-title">{{ i18n.currentTranslations.home_recommended_blogs }}</span>
              </div>

              <BlogCard 
                v-for="blog in recommendedBlogs" 
                :key="blog.id"
                :blog="blog"
              />

              <BlogPlaceholder v-if="recommendedBlogs.length % 2 !== 0" />
            </div>

            <div class="view-more-wrap">
              <button class="view-more-btn" @click="$router.push('/archive')">
                {{ i18n.currentTranslations.view_more }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'
import ProfileCard from '@/components/home/ProfileCard.vue'
import BlogCard from '@/components/home/BlogCard.vue'
import RecentUpdatesCard from '@/components/home/RecentUpdatesCard.vue'
import BlogPlaceholder from '@/components/home/BlogPlaceholder.vue'

const i18n = useI18nStore()
const blogStore = useBlogStore()

const recentBlogs = computed(() => {
  return blogStore.getRecentUpdates()
})

const recommendedBlogs = computed(() => {
  return blogStore.recommendedBlogs
})

const scrollToContent = () => {
  document.querySelector('.content-section')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  if (!blogStore.blogs.length) {
    blogStore.fetchBlogs()
  }
})
</script>

<style scoped>
/* ========== Hero 区域 ========== */
.hero-section {
  height: 100vh;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.hero-section::before {
  content: '';
  position: absolute;
  left: 48.2%;
  top: 50%;
  width: clamp(784px, 77vw, 1344px);
  aspect-ratio: 1536 / 863;
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
  background: url('@/assets/images/welcome.png') center / contain no-repeat;
  opacity: var(--home-welcome-bg-opacity, 0.9);
  will-change: transform;
  animation: home-welcome-cloud-sway 8.6s ease-in-out infinite;
}

@keyframes home-welcome-cloud-sway {
  0% { transform: translate(-50%, -50%) rotate(-0.4deg); }
  25% { transform: translate(calc(-50% - 10px), calc(-50% - 4px)) rotate(-0.15deg); }
  50% { transform: translate(calc(-50% + 8px), calc(-50% + 3px)) rotate(0.25deg); }
  75% { transform: translate(calc(-50% - 6px), calc(-50% + 2px)) rotate(0.1deg); }
  100% { transform: translate(-50%, -50%) rotate(-0.4deg); }
}

@media (max-width: 720px) {
  .hero-section::before {
    width: clamp(368px, 110vw, 784px);
    animation-duration: 9.8s;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-section::before {
    animation: none;
  }
}

.hero-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 2;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  isolation: isolate;
}

.hero-content .welcome-text,
.hero-content .subtitle {
  position: relative;
  z-index: 2;
}

.welcome-text {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  animation: fadeInUp 1s ease;
  color: #ff5f8a;
  text-shadow: 0 2px 0 rgba(140, 140, 140, 0.40),
    0 12px 24px rgba(255, 95, 138, 0.30);
  word-spacing: 0.6em;
  letter-spacing: 0.01em;
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .welcome-text {
    display: inline-block;
    background: linear-gradient(90deg, #ff5f8a 0%, #ffd2a6 35%, #a7f3d0 68%, #55c8ff 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 2px 0 rgba(140, 140, 140, 0.38)) drop-shadow(0 12px 24px rgba(255, 95, 138, 0.24));
  }
}

.subtitle {
  font-size: 1.5rem;
  opacity: 0.9;
  animation: fadeInUp 1s ease 0.3s both;
}

.scroll-down {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 2rem;
  animation: fadeIn 1s ease 1s both;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.bounce {
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-20px); }
  60% { transform: translateY(-10px); }
}

.music-tip {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin: 8px 0 6px 0;
  text-align: center;
  font-weight: 300;
  letter-spacing: 0.4px;
}

/* ========== 内容区域 ========== */
.content-section {
  position: relative;
  background: linear-gradient(135deg,
    rgba(255, 182, 201, 0.22) 0%,
    rgba(167, 243, 208, 0.22) 45%,
    rgba(199, 182, 255, 0.22) 100%);
  backdrop-filter: blur(8px) saturate(1.06);
  -webkit-backdrop-filter: blur(8px) saturate(1.06);
  min-height: 100vh;
  z-index: 1;
}

.content-section::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 12% 12%, rgba(255, 255, 255, 0.2), transparent 42%),
    radial-gradient(circle at 86% 20%, rgba(255, 255, 255, 0.14), transparent 38%),
    linear-gradient(120deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.1));
}

.content-wrapper {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 40px;
}

@media (max-width: 720px) {
  .content-wrapper {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (max-width: 600px) {
  .welcome-text {
    font-size: 2rem;
    line-height: 1.2;
    white-space: pre-line;
    word-break: break-word;
    margin-bottom: 0.6rem;
  }
}

/* ========== 博客网格 ========== */
.blog-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

@media (max-width: 720px) {
  .blog-grid {
    grid-template-columns: 1fr;
  }
}

/* 推荐卡片 */
.recommended-blogs-card {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  min-height: 82px;
  padding: 18px 20px;
  box-shadow: var(--shadow);
  overflow: hidden;
  border: var(--card-border-w, 5px) solid transparent;
  background:
    var(--card-fill-blog, linear-gradient(135deg, rgba(255, 182, 201, 0.22) 0%, rgba(199, 182, 255, 0.20) 55%, rgba(255, 182, 201, 0.16) 100%)) padding-box,
    linear-gradient(135deg, #ffb6c9, #a7f3d0, #c7b6ff) border-box;
  backdrop-filter: blur(12px) saturate(1.06);
  -webkit-backdrop-filter: blur(12px) saturate(1.06);
}

.recommended-blogs-card .recommended-title {
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #2c3e50;
  text-align: center;
  line-height: 1.15;
  text-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
  filter: saturate(1.1) contrast(1.06);
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .recommended-blogs-card .recommended-title {
    background: linear-gradient(120deg, #ef75a8, #ffb179, #43c8a0, #8f83eb, #ef75a8);
    background-size: 240% 240%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: recommended-title-macaron-flow 6s ease-in-out infinite;
  }
}

@keyframes recommended-title-macaron-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 查看更多 */
.view-more-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin: 18px 0 6px 0;
}

.view-more-btn {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: linear-gradient(135deg, #ebf8ff 0%, #e1fcf2 54%, #f0f6ff 100%);
  color: #365660;
  border: none;
  padding: 13px 20px;
  font-size: 1.06rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  border-radius: 12px;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.66);
  box-shadow: 0 8px 20px rgba(118, 88, 210, 0.08);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.14s;
  width: 100%;
  max-width: 860px;
}

.view-more-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(110deg,
    rgba(194, 233, 255, 0.92) 0%,
    rgba(180, 229, 255, 0.91) 22%,
    rgba(188, 247, 226, 0.91) 50%,
    rgba(175, 240, 215, 0.91) 76%,
    rgba(200, 236, 255, 0.92) 100%);
  background-size: 240% 240%;
  background-position: 0% 50%;
  transition: filter 0.2s ease, opacity 0.2s ease;
}

.view-more-btn:hover {
  transform: translateY(-2px) scale(1.004);
  box-shadow: 0 12px 26px rgba(118, 88, 210, 0.12);
}

.view-more-btn:hover::before {
  animation: view-more-flow 2.1s ease-in-out infinite alternate;
  filter: saturate(1.08) brightness(1.02);
}

@keyframes view-more-flow {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .view-more-btn:hover {
    transform: none;
  }
  .view-more-btn:hover::before {
    animation: none;
  }
}

@media (prefers-color-scheme: dark) {
  .view-more-btn {
    color: #f7f3ff;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.32);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.42);
  }
  .view-more-btn::before {
    background: linear-gradient(110deg,
      rgba(90, 66, 104, 0.98) 0%,
      rgba(71, 86, 115, 0.98) 24%,
      rgba(50, 111, 106, 0.98) 49%,
      rgba(69, 90, 129, 0.98) 74%,
      rgba(87, 72, 122, 0.98) 100%);
  }
}
</style>