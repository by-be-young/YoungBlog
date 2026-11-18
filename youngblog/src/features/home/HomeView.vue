<template>
  <main class="home-page">
    <!-- ============ Hero ============ -->
    <section
      ref="heroRef"
      class="hero-section"
      @pointermove="onHeroPointer"
    >
      <div class="hero-aura" aria-hidden="true"></div>
      <div class="hero-plate" aria-hidden="true"></div>
      <div class="hero-scrim" aria-hidden="true"></div>
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="hero-grain" aria-hidden="true"></div>

      <div class="hero-inner">
        <div class="hero-content">
          <p class="hero-eyebrow">
            <span class="eyebrow-line"></span>
            <span>{{ i18n.currentTranslations.home_hero_issue }}</span>
          </p>

          <h1 class="welcome-text">
            <span
              class="title-sheen"
              v-html="i18n.currentTranslations.welcome_text.replace(/\n/g, '<br>')"
            ></span>
          </h1>

          <p class="subtitle">
            <span class="subtitle-rule" aria-hidden="true"></span>
            <span>{{ i18n.currentTranslations.beihang }}</span>
          </p>

          <div class="hero-actions">
            <button type="button" class="hero-btn hero-btn--primary" @click="scrollToContent">
              <span>{{ i18n.currentTranslations.home_hero_enter }}</span>
              <span class="hero-btn-arrow" aria-hidden="true">
                <i class="fas fa-arrow-down"></i>
              </span>
            </button>
            <router-link class="hero-btn hero-btn--ghost" to="/archive">
              <span>{{ i18n.currentTranslations.archive }}</span>
              <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </router-link>
          </div>
        </div>

        <span class="hero-vertical" aria-hidden="true">
          {{ i18n.currentTranslations.home_hero_vertical }}
        </span>

        <div class="hero-sound" aria-hidden="true">
          <span class="eq">
            <i></i><i></i><i></i>
          </span>
          <span class="music-tip">{{ i18n.currentTranslations.settings_music_hint }}</span>
        </div>

        <div class="scroll-down" @click="scrollToContent">
          <span class="scroll-label">{{ i18n.currentTranslations.home_scroll_hint }}</span>
          <span class="scroll-arrow" aria-hidden="true">
            <i class="fas fa-arrow-down"></i>
          </span>
        </div>
      </div>
    </section>

    <!-- ============ 内容 ============ -->
    <section class="content-section">
      <div class="content-topline" aria-hidden="true"></div>
      <div class="content-watermark" aria-hidden="true">逃避行</div>

      <div class="container content-wrapper">
        <aside class="profile-rail reveal-item">
          <ProfileCard />
        </aside>

        <div class="main-content">
          <template v-if="recentBlogs.length">
            <header class="section-head reveal-item">
              <div class="section-head-main">
                <span class="section-index" aria-hidden="true">01</span>
                <div class="section-head-copy">
                  <h2 class="section-title">{{ i18n.currentTranslations.home_recent_updates }}</h2>
                </div>
              </div>
              <router-link class="section-link" to="/archive">
                <span>{{ i18n.currentTranslations.home_all_archive }}</span>
                <i class="fas fa-arrow-right" aria-hidden="true"></i>
              </router-link>
            </header>

            <div class="blog-grid recent-grid">
              <RecentUpdatesCard :blogs="recentBlogs" class="reveal-item" />
            </div>
          </template>

          <header class="section-head reveal-item">
            <div class="section-head-main">
              <span class="section-index" aria-hidden="true">02</span>
              <div class="section-head-copy">
                <h2 class="section-title">{{ i18n.currentTranslations.home_continue_reading }}</h2>
              </div>
            </div>
            <router-link class="section-link" to="/categories">
              <span>{{ i18n.currentTranslations.categories }}</span>
              <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </router-link>
          </header>

          <div class="blog-grid picks-grid" id="blogGrid">
            <BlogCard
              v-for="(blog, index) in continueBlogs"
              :key="blog.id"
              :blog="blog"
              :index="index + 3"
              class="reveal-item"
            />
            <BlogPlaceholder v-if="continueBlogs.length % 2 !== 0" class="reveal-item" />
          </div>

          <div class="view-more-wrap reveal-item">
            <router-link class="archive-cta" to="/archive">
              <span class="cta-sheen" aria-hidden="true"></span>
              <div class="cta-copy">
                <span class="cta-kicker">ARCHIVE · ALL NOTES</span>
                <span class="cta-title">{{ i18n.currentTranslations.home_archive_cta_title }}</span>
              </div>
              <span class="cta-count">
                <strong>{{ blogStore.totalPosts }}</strong>
                <small>{{ i18n.currentTranslations.posts }}</small>
              </span>
              <span class="cta-arrow" aria-hidden="true">
                <i class="fas fa-arrow-right"></i>
              </span>
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { useBlogStore } from '@/shared/stores/blogStore'
import { resolveUrl } from '@/shared/utils/url'
import { prefersReducedMotion } from '@/shared/composables/useEntryLoader'
import ProfileCard from '@/features/home/components/ProfileCard.vue'
import BlogCard from '@/features/home/components/BlogCard.vue'
import RecentUpdatesCard from '@/features/home/components/RecentUpdatesCard.vue'
import BlogPlaceholder from '@/features/home/components/BlogPlaceholder.vue'

const welcomeBgImg = `url(${resolveUrl('/assets/images/welcome.webp')})`

const i18n = useI18nStore()
const blogStore = useBlogStore()

const heroRef = ref(null)
const recentBlogs = computed(() => blogStore.getRecentUpdates())
const continueBlogs = computed(() => {
  const recentIds = new Set(recentBlogs.value.map((blog) => String(blog.id)))
  const pool = [...blogStore.blogs]
    .filter((blog) => !recentIds.has(String(blog.id)))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

  // 学习、娱乐各挑一篇，避免整组卡片同色
  const study = pool.find((blog) => blogStore.isLearningBlog(blog))
  const fun = pool.find((blog) => !blogStore.isLearningBlog(blog))
  return [study, fun].filter(Boolean).slice(0, 2)
})

const scrollToContent = () => {
  document.querySelector('.content-section')?.scrollIntoView({ behavior: 'smooth' })
}

/* ---------- 光标追光 ---------- */
let glowFrame = 0

const onHeroPointer = (event) => {
  if (prefersReducedMotion() || !heroRef.value) return
  const rect = heroRef.value.getBoundingClientRect()
  const x = Math.round(((event.clientX - rect.left) / rect.width) * 1000) / 10
  const y = Math.round(((event.clientY - rect.top) / rect.height) * 1000) / 10
  cancelAnimationFrame(glowFrame)
  glowFrame = requestAnimationFrame(() => {
    heroRef.value?.style.setProperty('--hero-x', `${x}%`)
    heroRef.value?.style.setProperty('--hero-y', `${y}%`)
  })
}

/* ---------- 滚动入场 ---------- */
let observer = null

const setupReveal = () => {
  if (typeof window === 'undefined') return
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return

  document.body.classList.add('reveal-enabled')
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-inview')
        observer?.unobserve(entry.target)
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  )

  nextTick(() => {
    const items = document.querySelectorAll('.home-page .reveal-item')
    items.forEach((el, index) => {
      el.style.setProperty('--reveal-i', String(Math.min(index, 8)))
      observer.observe(el)
    })
  })
}

onMounted(() => {
  if (!blogStore.blogs.length) {
    blogStore.fetchBlogs()
  }
  setupReveal()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(glowFrame)
  observer?.disconnect()
  document.body.classList.remove('reveal-enabled')
})
</script>

<style scoped>
/* ==================================================
   首页视觉变量：马卡龙 × 墨色编辑风
   ================================================== */
.home-page {
  --ink: #17222f;
  --ink-soft: #3d4b5d;
  --ink-mute: #7b8698;
  --paper: #fdf9f2;
  --rose: #ff7fa8;
  --rose-deep: #c84070;
  --mint: #58d8b2;
  --mint-deep: #19846f;
  --iris: #a08cff;
  --sky: #6fc5ff;
  --line: rgba(23, 34, 47, 0.1);
  --line-strong: rgba(23, 34, 47, 0.16);
  --font-ui:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
  position: relative;
}

/* ================= Hero ================= */
.hero-section {
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  overflow: hidden;
  isolation: isolate;
  z-index: 1;
  --hero-x: 62%;
  --hero-y: 46%;
}

/* 左侧纸雾：保证文字可读，同时让右侧背景透出来 */
.hero-scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(
      118% 92% at 6% 42%,
      rgba(253, 249, 242, 0.93) 0%,
      rgba(253, 249, 242, 0.72) 26%,
      rgba(253, 249, 242, 0.32) 54%,
      rgba(253, 249, 242, 0.06) 76%,
      rgba(253, 249, 242, 0) 90%
    ),
    linear-gradient(
      180deg,
      rgba(12, 17, 26, 0.18) 0%,
      rgba(12, 17, 26, 0.02) 20%,
      rgba(12, 17, 26, 0) 58%,
      rgba(253, 249, 242, 0.4) 90%,
      rgba(253, 249, 242, 0.9) 100%
    );
}

/* 冷暖双色极光 */
.hero-aura {
  position: absolute;
  z-index: 0;
  right: -12vw;
  top: -14vh;
  width: 62vw;
  height: 62vw;
  max-width: 1040px;
  max-height: 1040px;
  border-radius: 50%;
  pointer-events: none;
  background: conic-gradient(
    from 0deg,
    rgba(255, 127, 168, 0.5),
    rgba(255, 210, 166, 0.36),
    rgba(167, 243, 208, 0.42),
    rgba(160, 140, 255, 0.42),
    rgba(111, 197, 255, 0.36),
    rgba(255, 127, 168, 0.5)
  );
  filter: blur(80px);
  opacity: 0.55;
  animation: hero-aura-spin 34s linear infinite;
  transform-origin: 50% 50%;
}

/* 玻璃云：沿用站点原有的欢迎图 */
.hero-plate {
  position: absolute;
  z-index: 1;
  right: -6vw;
  top: 50%;
  width: clamp(620px, 64vw, 1160px);
  aspect-ratio: 1536 / 863;
  transform: translateY(-50%);
  background-image: v-bind(welcomeBgImg);
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.4;
  pointer-events: none;
  mask-image: linear-gradient(100deg, transparent 0%, #000 32%, #000 100%);
  -webkit-mask-image: linear-gradient(100deg, transparent 0%, #000 32%, #000 100%);
  animation: hero-plate-drift 11s ease-in-out infinite;
  will-change: transform;
}

/* 光标追光 */
.hero-glow {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(
    300px 300px at var(--hero-x) var(--hero-y),
    rgba(255, 235, 214, 0.36) 0%,
    rgba(255, 214, 232, 0.16) 40%,
    rgba(255, 255, 255, 0) 72%
  );
  mix-blend-mode: screen;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.hero-section:hover .hero-glow {
  opacity: 0.75;
}

/* 细腻噪点，避免大面积渐变过于“塑料” */
.hero-grain {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  opacity: 0.05;
  background-image:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.7) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.5) 0 1px, transparent 1px 4px);
  mix-blend-mode: overlay;
}

.hero-inner {
  position: relative;
  z-index: 4;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 120px 56px 120px;
}

.hero-content {
  max-width: 760px;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(23, 34, 47, 0.58);
  animation: hero-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
}

.eyebrow-line {
  width: 42px;
  height: 1px;
  background: linear-gradient(90deg, var(--rose-deep), rgba(200, 64, 112, 0));
}

.welcome-text {
  margin: 26px 0 20px;
  font-size: clamp(2.7rem, 6.1vw, 5.4rem);
  line-height: 1.14;
  letter-spacing: 0.01em;
  word-spacing: 0.08em;
  color: var(--ink);
  animation: hero-title-in 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both;
  will-change: transform;
}

:global(html[lang='en'] .welcome-text) {
  font-size: clamp(1.55rem, 5.5vw, 4.35rem);
  letter-spacing: -0.01em;
}

:global(html[lang='ja'] .welcome-text) {
  font-size: clamp(1.45rem, 5.2vw, 4.05rem);
  letter-spacing: 0.015em;
}

.title-sheen {
  display: inline-block;
  background: linear-gradient(
    104deg,
    #17222f 0%,
    #2f4359 12%,
    #b23f6b 26%,
    #168a72 40%,
    #17222f 55%,
    #3a2e55 68%,
    #a53a64 80%,
    #168a72 92%,
    #17222f 100%
  );
  background-size: 240% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter:
    drop-shadow(0 2px 8px rgba(255, 253, 248, 0.5))
    drop-shadow(0 18px 38px rgba(23, 34, 47, 0.18));
  animation: title-flow 12s ease-in-out infinite 1.2s;
}

@supports not ((-webkit-background-clip: text) or (background-clip: text)) {
  .title-sheen {
    color: var(--ink);
  }
}

.subtitle {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  font-size: 1.02rem;
  letter-spacing: 0.16em;
  color: #4a586c;
  animation: hero-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.42s both;
}

.subtitle-rule {
  width: 28px;
  height: 1px;
  background: rgba(23, 34, 47, 0.28);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 38px;
  animation: hero-fade-up 1s cubic-bezier(0.16, 1, 0.3, 1) 0.56s both;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  height: 54px;
  padding: 0 24px;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  cursor: pointer;
  text-decoration: none;
  transition:
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.35s ease,
    background 0.35s ease,
    color 0.35s ease;
}

.hero-btn--primary {
  padding: 0 7px 0 26px;
  border: none;
  color: #fff8ef;
  background: var(--ink);
  box-shadow: 0 18px 40px rgba(16, 25, 38, 0.26);
}

.hero-btn-arrow {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  background: linear-gradient(135deg, #ffd6e2, #c9f6e6 60%, #cfe2ff);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-btn--primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 24px 50px rgba(16, 25, 38, 0.32);
}

.hero-btn--primary:hover .hero-btn-arrow {
  transform: translateY(2px) rotate(180deg);
}

.hero-btn--primary:active {
  transform: translateY(0);
}

.hero-btn--ghost {
  border: 1px solid rgba(23, 34, 47, 0.16);
  color: var(--ink);
  background: rgba(255, 253, 248, 0.46);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.hero-btn--ghost i {
  font-size: 0.78rem;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-btn--ghost:hover {
  transform: translateY(-3px);
  border-color: rgba(200, 64, 112, 0.34);
  background: rgba(255, 253, 248, 0.72);
  box-shadow: 0 14px 30px rgba(23, 34, 47, 0.1);
}

.hero-btn--ghost:hover i {
  transform: translateX(4px);
}

/* 右侧竖排小字 */
.hero-vertical {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  font-size: 0.68rem;
  letter-spacing: 0.34em;
  color: rgba(23, 34, 47, 0.58);
  text-shadow: 0 1px 10px rgba(255, 253, 248, 0.7);
  pointer-events: none;
}

/* 底部：音乐提示 + 下滑提示 */
.hero-sound {
  position: absolute;
  left: 100px;
  bottom: 34px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px 9px 13px;
  border-radius: 999px;
  background: rgba(255, 253, 248, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  box-shadow: 0 8px 24px rgba(12, 17, 26, 0.12);
  animation: hero-fade-up 1s ease 0.8s both;
}

.eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.eq i {
  display: block;
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--rose-deep), var(--mint-deep));
  animation: eq-bounce 1.2s ease-in-out infinite;
}

.eq i:nth-child(1) {
  height: 6px;
  animation-delay: 0s;
}

.eq i:nth-child(2) {
  height: 11px;
  animation-delay: 0.18s;
}

.eq i:nth-child(3) {
  height: 8px;
  animation-delay: 0.32s;
}

.music-tip {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: #465468;
  white-space: nowrap;
}

.scroll-down {
  position: absolute;
  right: 44px;
  bottom: 32px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 9px 7px 16px;
  border-radius: 999px;
  cursor: pointer;
  color: #33404f;
  background: rgba(255, 253, 248, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px) saturate(1.15);
  -webkit-backdrop-filter: blur(12px) saturate(1.15);
  box-shadow: 0 8px 24px rgba(12, 17, 26, 0.1);
  animation: hero-fade-up 1s ease 0.9s both;
  transition:
    background 0.3s ease,
    transform 0.3s ease;
}

.scroll-down:hover {
  background: rgba(255, 253, 248, 0.72);
  transform: translateY(-2px);
}

.scroll-label {
  font-family: var(--font-ui);
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.16em;
}

.scroll-arrow {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  color: #fff8ef;
  background: #17222f;
}

.scroll-arrow i {
  animation: scroll-bob 2.2s ease-in-out infinite;
}

@keyframes scroll-bob {
  0%,
  100% {
    transform: translateY(-1px);
  }
  50% {
    transform: translateY(2px);
  }
}

/* ================= 内容区 ================= */
.content-section {
  position: relative;
  z-index: 2;
  margin-top: -84px;
  padding: 66px 0 84px;
  border-radius: 44px 44px 0 0;
  background:
    radial-gradient(120% 70% at 88% 0%, rgba(255, 214, 232, 0.34), rgba(255, 255, 255, 0) 60%),
    radial-gradient(100% 60% at 0% 6%, rgba(201, 246, 230, 0.32), rgba(255, 255, 255, 0) 58%),
    linear-gradient(180deg, rgba(253, 249, 242, 0.97) 0%, rgba(251, 246, 239, 0.95) 46%, rgba(249, 243, 235, 0.95) 100%);
  backdrop-filter: blur(22px) saturate(1.15);
  -webkit-backdrop-filter: blur(22px) saturate(1.15);
  box-shadow:
    0 -30px 70px rgba(10, 16, 24, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.content-topline {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(560px, 62%);
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(200, 64, 112, 0) 0%,
    rgba(200, 64, 112, 0.55) 24%,
    rgba(88, 216, 178, 0.55) 62%,
    rgba(160, 140, 255, 0) 100%
  );
  border-radius: 999px;
}

.content-watermark {
  position: absolute;
  right: 18px;
  top: 70px;
  writing-mode: vertical-rl;
  font-size: clamp(4rem, 7vw, 7.6rem);
  letter-spacing: 0.16em;
  line-height: 1;
  color: rgba(23, 34, 47, 0.045);
  pointer-events: none;
  user-select: none;
}

.content-wrapper {
  position: relative;
  display: grid;
  grid-template-columns: 336px minmax(0, 1fr);
  gap: 42px;
  max-width: 1240px;
}

/* ---------- 区块标题 ---------- */
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 16px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.section-head + .blog-grid {
  margin-bottom: 42px;
}

.section-head-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.section-index {
  font-family: var(--font-ui);
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  color: rgba(23, 34, 47, 0.16);
  transform: translateY(2px);
}

.section-head-copy {
  min-width: 0;
}

.section-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--ink);
  line-height: 1.2;
}

.section-link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding-bottom: 4px;
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--ink-soft);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition:
    color 0.3s ease,
    border-color 0.3s ease;
  white-space: nowrap;
}

.section-link i {
  font-size: 0.62rem;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.section-link:hover {
  color: var(--rose-deep);
  border-bottom-color: rgba(200, 64, 112, 0.3);
}

.section-link:hover i {
  transform: translateX(4px);
}

/* ---------- 网格 ---------- */
.blog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.recent-grid {
  grid-template-columns: minmax(0, 1fr);
}

.picks-grid {
  gap: 26px;
}

/* ---------- 归档 CTA ---------- */
.view-more-wrap {
  margin-top: 38px;
}

.archive-cta {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 26px 28px;
  border-radius: 24px;
  overflow: hidden;
  text-decoration: none;
  color: var(--ink);
  border: 1px solid rgba(255, 255, 255, 0.65);
  background:
    linear-gradient(115deg, rgba(255, 214, 232, 0.82), rgba(255, 246, 236, 0.86) 38%, rgba(205, 246, 233, 0.8) 72%, rgba(219, 228, 255, 0.82));
  box-shadow: 0 20px 44px rgba(45, 35, 48, 0.1);
  transition:
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.4s ease;
}

.archive-cta::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(80% 140% at 12% 0%, rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0) 55%);
}

.cta-sheen {
  position: absolute;
  top: -60%;
  left: -30%;
  width: 34%;
  height: 220%;
  transform: rotate(16deg);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0),
    rgba(255, 255, 255, 0.5),
    rgba(255, 255, 255, 0)
  );
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

.archive-cta:hover .cta-sheen {
  opacity: 1;
  animation: cta-shine 1.1s ease-out;
}

.archive-cta:hover {
  transform: translateY(-4px);
  box-shadow: 0 28px 56px rgba(45, 35, 48, 0.16);
}

.cta-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  flex: 1 1 auto;
}

.cta-kicker {
  font-family: var(--font-ui);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: rgba(23, 34, 47, 0.52);
}

.cta-title {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  line-height: 1.2;
}

.cta-count {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-left: 22px;
  border-left: 1px solid rgba(23, 34, 47, 0.14);
  white-space: nowrap;
}

.cta-count strong {
  font-family: var(--font-ui);
  font-size: 1.9rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
}

.cta-count small {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  color: var(--ink-mute);
}

.cta-arrow {
  position: relative;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(23, 34, 47, 0.9);
  color: #fff8ef;
  transition:
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.4s ease;
}

.archive-cta:hover .cta-arrow {
  transform: translateX(5px) rotate(-8deg);
  background: var(--rose-deep);
}

/* ---------- 滚动入场 ---------- */
body.reveal-enabled .home-page .reveal-item:not(.is-inview) {
  opacity: 0;
  transform: translateY(28px);
}

body.reveal-enabled .home-page .reveal-item {
  transition:
    opacity 0.72s ease,
    transform 0.86s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(var(--reveal-i, 0) * 62ms);
}

/* ================= 动效 keyframes ================= */
@keyframes hero-aura-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes hero-plate-drift {
  0%,
  100% {
    transform: translateY(-50%) translate3d(0, 0, 0) rotate(-0.4deg);
  }
  50% {
    transform: translateY(-49%) translate3d(-14px, -8px, 0) rotate(0.4deg);
  }
}

@keyframes hero-fade-up {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes hero-title-in {
  from {
    opacity: 0;
    transform: translateY(34px);
    filter: blur(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes title-flow {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes eq-bounce {
  0%,
  100% {
    transform: scaleY(0.6);
    opacity: 0.65;
  }
  50% {
    transform: scaleY(1.15);
    opacity: 1;
  }
}

@keyframes cta-shine {
  from {
    transform: translateX(0) rotate(16deg);
  }
  to {
    transform: translateX(420%) rotate(16deg);
  }
}

/* 滚动联动：首页大标题随滚动离场（支持的浏览器生效） */
@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .hero-inner {
      animation: hero-leave linear both;
      animation-timeline: scroll(root);
      animation-range: 0vh 76vh;
    }
  }
}

@keyframes hero-leave {
  to {
    opacity: 0;
    transform: translateY(-5vh) scale(0.985);
    filter: blur(2px);
  }
}

/* ================= 响应式 ================= */
@media (max-width: 1100px) {
  .hero-inner {
    padding: 110px 40px 120px;
  }

  .content-wrapper {
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 30px;
  }

  .profile-rail {
    max-width: 430px;
    margin: 0 auto 4px;
  }

  .content-section {
    margin-top: -64px;
  }

  .hero-plate {
    right: -18vw;
    opacity: 0.45;
  }

  .hero-vertical {
    display: none;
  }
}

@media (max-width: 900px) {
  .content-wrapper {
    grid-template-columns: minmax(0, 1fr);
    gap: 26px;
  }

  .profile-rail {
    position: static;
  }

  .hero-content {
    max-width: 660px;
  }

  .hero-plate {
    right: -26vw;
    top: 42%;
    opacity: 0.36;
  }
}

@media (max-width: 720px) {
  .hero-section {
    align-items: flex-start;
    padding-top: 74px;
  }

  .hero-inner {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: calc(100svh - 74px);
    padding: 24px 22px 150px;
  }

  .welcome-text {
    font-size: clamp(1.9rem, 8.6vw, 2.75rem);
    line-height: 1.18;
    word-spacing: 0.02em;
    margin: 20px 0 16px;
  }

  .title-sheen {
    overflow-wrap: anywhere;
  }

  .hero-eyebrow {
    font-size: 0.64rem;
    letter-spacing: 0.24em;
  }

  .subtitle {
    font-size: 0.92rem;
    letter-spacing: 0.1em;
  }

  .hero-actions {
    margin-top: 28px;
    gap: 10px;
  }

  .hero-btn {
    height: 48px;
    padding: 0 20px;
  }

  .hero-btn--primary {
    padding: 0 6px 0 22px;
  }

  .hero-btn-arrow {
    width: 36px;
    height: 36px;
  }

  .hero-plate {
    right: -38vw;
    top: 38%;
    width: 120vw;
    opacity: 0.3;
  }

  .hero-sound {
    display: none;
  }

  .music-tip {
    display: none;
  }

  .scroll-down {
    display: none;
  }

  .scroll-label {
    font-size: 0.58rem;
  }

  .content-section {
    margin-top: -40px;
    padding: 42px 0 62px;
    border-radius: 30px 30px 0 0;
  }

  .content-wrapper {
    gap: 22px;
  }

  .profile-rail {
    width: 100%;
    max-width: none;
  }

  .content-watermark {
    display: none;
  }

  .section-head {
    padding-bottom: 12px;
    margin-bottom: 18px;
  }

  .section-index {
    font-size: 1.5rem;
  }

  .section-title {
    font-size: 1.24rem;
  }

  .section-link {
    font-size: 0.66rem;
    letter-spacing: 0.1em;
  }

  .blog-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .section-head + .blog-grid {
    margin-bottom: 32px;
  }

  .view-more-wrap {
    margin-top: 28px;
  }

  .archive-cta {
    padding: 20px 20px;
    gap: 16px;
    border-radius: 20px;
  }

  .cta-title {
    font-size: 1.2rem;
  }

  .cta-count {
    display: none;
  }

  .cta-arrow {
    width: 42px;
    height: 42px;
    flex-basis: 42px;
  }
}

@media (max-width: 420px) {
  .hero-plate {
    opacity: 0.24;
  }

  .hero-sound {
    left: 78px;
  }

  .section-link span {
    display: none;
  }

  .section-link i {
    font-size: 0.72rem;
  }
}

/* ================= 无障碍 ================= */
/* ================= 移动端重构：纸面封面 + 横向卡片轨道 ================= */
@media (max-width: 720px) {
  .hero-section {
    align-items: stretch;
    padding-top: 0;
  }

  .hero-inner {
    justify-content: flex-end;
    min-height: 100svh;
    padding: 92px 14px 16px;
  }

  .hero-content {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    max-width: none;
    padding: 26px 20px 64px;
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 28px;
    background:
      linear-gradient(157deg, rgba(255, 253, 248, 0.94) 0%, rgba(253, 246, 236, 0.88) 100%);
    box-shadow:
      0 28px 70px rgba(14, 24, 38, 0.26),
      0 2px 0 rgba(255, 255, 255, 0.5) inset;
    backdrop-filter: blur(22px) saturate(1.12);
    -webkit-backdrop-filter: blur(22px) saturate(1.12);
  }

  .hero-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 24px;
    width: 54px;
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: linear-gradient(90deg, var(--rose-deep), var(--iris), var(--mint));
  }

  .hero-eyebrow {
    gap: 10px;
    font-size: 0.6rem;
    letter-spacing: 0.24em;
    color: rgba(23, 34, 47, 0.5);
  }

  .eyebrow-line {
    width: 26px;
  }

  .welcome-text {
    margin: 14px 0 14px;
    font-size: clamp(2.05rem, 8.6vw, 2.85rem);
    line-height: 1.08;
    letter-spacing: 0;
  }

  :global(html[lang='en'] .welcome-text) {
    font-size: clamp(1.9rem, 8.8vw, 2.9rem);
  }

  :global(html[lang='ja'] .welcome-text) {
    font-size: clamp(1.7rem, 8vw, 2.6rem);
  }

  .subtitle {
    gap: 10px;
    font-size: 0.78rem;
    letter-spacing: 0.12em;
  }

  .subtitle-rule {
    width: 18px;
  }

  .hero-actions {
    margin-top: 22px;
    gap: 8px;
  }

  .hero-btn {
    height: 46px;
    font-size: 0.76rem;
    letter-spacing: 0.08em;
  }

  .hero-btn--primary {
    flex: 1 1 150px;
    padding: 0 6px 0 18px;
    justify-content: space-between;
  }

  .hero-btn--ghost {
    flex: 0 1 auto;
    padding: 0 16px;
    background: rgba(255, 255, 255, 0.54);
  }

  .hero-btn-arrow {
    width: 34px;
    height: 34px;
  }

  .hero-plate {
    top: 34%;
    right: -44vw;
    width: 118vw;
    opacity: 0.26;
  }

  .content-section {
    margin-top: -26px;
    padding-top: 34px;
    border-radius: 34px 34px 0 0;
  }

  /* 01 最近更新：横向滑动，卡片露出下一张的边 */
  .recent-grid {
    margin: 0;
  }

  /* 02 继续阅读：同样的横向轨道，省掉一屏纵向长度 */
  .picks-grid {
    display: flex;
    gap: 14px;
    margin: 0 -18px;
    padding: 4px 18px 14px;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-padding-left: 18px;
    scrollbar-width: none;
  }

  .picks-grid::-webkit-scrollbar {
    display: none;
  }

  .picks-grid > * {
    flex: 0 0 84%;
    scroll-snap-align: center;
  }

  .picks-grid > .blog-placeholder {
    display: none;
  }

  .section-head + .blog-grid {
    margin-bottom: 26px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-aura,
  .hero-plate,
  .title-sheen,
  .eq i,
  .scroll-arrow i,
  .hero-content,
  .hero-eyebrow,
  .welcome-text,
  .subtitle,
  .hero-actions,
  .hero-sound,
  .scroll-down,
  .archive-cta:hover .cta-sheen {
    animation: none !important;
  }

  .hero-btn:hover,
  .hero-btn--primary:hover .hero-btn-arrow,
  .archive-cta:hover,
  .archive-cta:hover .cta-arrow {
    transform: none;
  }

  body.reveal-enabled .home-page .reveal-item:not(.is-inview) {
    opacity: 1;
    transform: none;
  }
}
</style>
