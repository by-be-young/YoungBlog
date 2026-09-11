<template>
  <div id="app">
    <!-- 背景轮播 -->
    <div class="slideshow" :class="slideshowClass" aria-hidden="true">
      <div
        v-for="(bg, index) in backgroundImages"
        :key="index"
        class="slide"
        :class="{ active: index === currentBgIndex }"
        :style="{ backgroundImage: `url('${bg}')` }"
      ></div>
    </div>

    <!-- 萤火虫效果 -->
    <Fireflies v-if="showFireflies" />

    <!-- 导航栏 -->
    <AppNavbar />

    <!-- 路由切换加载条 -->
    <div class="route-loader" :class="{ 'is-loading': routeLoading }"></div>

    <!-- 主内容区域 -->
    <div class="app-main">
      <router-view />
    </div>

    <!-- 页脚 -->
    <AppFooter />

    <!-- 浮动控制按钮：设置 + 公告 + 音乐 -->
    <FloatingControls />

    <!-- 全局组件 -->
    <SearchPanel />
    <SettingsModal />
    <AnnouncementModal />

    <!-- 入场加载屏（挂到 body，避免与 #app 揭幕动画相互影响） -->
    <Teleport to="body">
      <EntrySplash
        v-if="showEntry"
        @reveal="onEntryReveal"
        @finished="onEntryFinished"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import Fireflies from '@/components/common/Fireflies.vue'
import SearchPanel from '@/components/common/SearchPanel.vue'
import SettingsModal from '@/components/common/SettingsModal.vue'
import AnnouncementModal from '@/components/common/AnnouncementModal.vue'
import FloatingControls from '@/components/common/FloatingControls.vue'
import EntrySplash from '@/components/common/EntrySplash.vue'
import { useBackgroundStore } from '@/stores/backgroundStore'
import { useMusicStore } from '@/stores/musicStore'
import { prefersReducedMotion, DEFAULT_BACKGROUND_IMAGES, resolveBackgroundImages } from '@/composables/useEntryLoader'
import { resolveUrl } from '@/utils/url'

const route = useRoute()
const router = useRouter()
const bgStore = useBackgroundStore()

const backgroundImages = ref([])
const currentBgIndex = ref(0)
const routeLoading = ref(false)
let loadingTimer = null

/* ===== 入场加载屏 ===== */
const showEntry = ref(!prefersReducedMotion())
let revealTimer = null

// 加载完成，开始揭幕：解除首页元素的暂停状态，并触发内容入场动画
const onEntryReveal = () => {
  document.documentElement.classList.remove('entry-loading')
  document.documentElement.classList.add('entry-revealed')
  window.scrollTo({ top: 0, behavior: 'auto' })
  clearTimeout(revealTimer)
  revealTimer = setTimeout(() => {
    document.documentElement.classList.remove('entry-revealed')
  }, 1900)
}

// 退场动画结束，卸载加载屏
const onEntryFinished = () => {
  showEntry.value = false
  clearTimeout(revealTimer)
  document.documentElement.classList.remove('entry-loading')
}

// 显示萤火虫的页面
const showFireflies = computed(() => {
  const pages = ['archive', 'categories', 'quicklinks', 'series']
  return pages.includes(route.name?.toLowerCase())
})

// 背景蒙版：归档/分类/链接页毛玻璃，系列页强蒙版
const slideshowClass = computed(() => {
  const name = route.name?.toLowerCase()
  if (name === 'archive' || name === 'categories' || name === 'quicklinks') return 'is-frosted'
  if (name === 'series') return 'is-series'
  return ''
})

// 监听路由切换显示加载条
router.beforeEach(() => {
  routeLoading.value = true
})
router.afterEach(() => {
  // 确保加载条至少显示一小段时间，避免闪动
  clearTimeout(loadingTimer)
  loadingTimer = setTimeout(() => {
    routeLoading.value = false
  }, 320)
})

// 加载背景图（默认列表与入场加载器共用，保证预载的图片与实际渲染一致）
const loadBackgrounds = async () => {
  try {
    const res = await fetch(resolveUrl('/data/background-images.json'))
    const data = await res.json()
    backgroundImages.value = resolveBackgroundImages(data)
  } catch (e) {
    backgroundImages.value = [...DEFAULT_BACKGROUND_IMAGES]
  }
  bgStore.setImages(backgroundImages.value)
}

// 轮播定时器
let bgInterval = null

onMounted(() => {
  if (!showEntry.value) {
    document.documentElement.classList.remove('entry-loading')
  }

  loadBackgrounds()

  bgInterval = setInterval(() => {
    if (backgroundImages.value.length > 1) {
      currentBgIndex.value = (currentBgIndex.value + 1) % backgroundImages.value.length
    }
  }, 5000)

  // 首次用户交互时初始化音频（满足浏览器自动播放策略）
  const musicStore = useMusicStore()
  const initMusicOnInteraction = () => {
    musicStore.initAudio()
  }
  window.addEventListener('click', initMusicOnInteraction, { once: true })
  window.addEventListener('keydown', initMusicOnInteraction, { once: true })
})

onUnmounted(() => {
  if (bgInterval) clearInterval(bgInterval)
  clearTimeout(loadingTimer)
  clearTimeout(revealTimer)
  document.documentElement.classList.remove('entry-loading', 'entry-revealed')
})
</script>

<style>
/* ===== 路由加载条 ===== */
.route-loader {  position: fixed;
  top: 60px;
  left: 0;
  width: 0;
  height: 3px;
  z-index: 9999;
  background: linear-gradient(90deg,
    #ffb6c9 0%,
    #a7f3d0 30%,
    #9ad7ff 60%,
    #c7b6ff 100%);
  background-size: 200% 100%;
  border-radius: 0 2px 2px 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.route-loader.is-loading {
  opacity: 1;
  animation: route-loader-progress 0.8s ease-out forwards,
             route-loader-shimmer 1.2s ease-in-out infinite;
}

@keyframes route-loader-progress {
  0%   { width: 0%; }
  30%  { width: 45%; }
  60%  { width: 70%; }
  100% { width: 85%; }
}

@keyframes route-loader-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ==================================================
   入场加载：全局联动样式
   ================================================== */

/* 加载期间锁定滚动，避免在加载屏背后滚动页面 */
html.entry-loading,
html.entry-loading body {
  overflow: hidden;
}

/* 加载期间暂停首页 Hero 的入场动画，揭幕后再继续播放 */
html.entry-loading .welcome-text,
html.entry-loading .subtitle,
html.entry-loading .scroll-down {
  animation-play-state: paused;
}

/* 揭幕：整页淡入 */
html.entry-revealed #app {
  animation: entry-page-rise 0.92s cubic-bezier(0.22, 0.9, 0.25, 1) both;
}

@keyframes entry-page-rise {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* 揭幕：首页内容错峰浮入 */
html.entry-revealed .sidebar,
html.entry-revealed .blog-grid > *,
html.entry-revealed .view-more-wrap {
  animation: entry-card-in 0.74s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}

html.entry-revealed .sidebar { animation-delay: 0.05s; }
html.entry-revealed .blog-grid > *:nth-child(1) { animation-delay: 0.10s; }
html.entry-revealed .blog-grid > *:nth-child(2) { animation-delay: 0.18s; }
html.entry-revealed .blog-grid > *:nth-child(3) { animation-delay: 0.26s; }
html.entry-revealed .blog-grid > *:nth-child(4) { animation-delay: 0.34s; }
html.entry-revealed .blog-grid > *:nth-child(5) { animation-delay: 0.42s; }
html.entry-revealed .blog-grid > *:nth-child(6) { animation-delay: 0.50s; }
html.entry-revealed .blog-grid > *:nth-child(7) { animation-delay: 0.58s; }
html.entry-revealed .blog-grid > *:nth-child(n+8) { animation-delay: 0.66s; }
html.entry-revealed .view-more-wrap { animation-delay: 0.72s; }

@keyframes entry-card-in {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  html.entry-revealed #app,
  html.entry-revealed .sidebar,
  html.entry-revealed .blog-grid > *,
  html.entry-revealed .view-more-wrap {
    animation: none;
  }
}
</style>
