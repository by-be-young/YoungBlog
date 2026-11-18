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
      <EntrySplash v-if="showEntry" @reveal="onEntryReveal" @finished="onEntryFinished" />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNavbar from '@/shared/layout/AppNavbar.vue'
import AppFooter from '@/shared/layout/AppFooter.vue'
import Fireflies from '@/shared/components/Fireflies.vue'
import SearchPanel from '@/shared/components/SearchPanel.vue'
import SettingsModal from '@/shared/components/SettingsModal.vue'
import AnnouncementModal from '@/shared/components/AnnouncementModal.vue'
import FloatingControls from '@/shared/components/FloatingControls.vue'
import EntrySplash from '@/shared/components/EntrySplash.vue'
import { useBackgroundStore } from '@/shared/stores/backgroundStore'
import { useMusicStore } from '@/shared/stores/musicStore'
import {
  prefersReducedMotion,
  DEFAULT_BACKGROUND_IMAGES,
  resolveBackgroundImages,
} from '@/shared/composables/useEntryLoader'
import { resolveUrl } from '@/shared/utils/url'

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

// 背景蒙版：分类/链接页毛玻璃，系列页强蒙版；归档页保留首页的清晰照片
const slideshowClass = computed(() => {
  const name = route.name?.toLowerCase()
  if (name === 'categories' || name === 'quicklinks') return 'is-frosted'
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

// 同步页面标记到 <body>：CSS 依赖 body.home 区分首页布局（侧栏折叠、栅格列数等）
const syncBodyRouteClass = (name) => {
  document.body.classList.toggle('home', String(name || '').toLowerCase() === 'home')
}

watch(
  () => route.name,
  (name) => syncBodyRouteClass(name),
  { immediate: true },
)

// 加载背景图（默认列表与入场加载器共用，保证预载的图片与实际渲染一致）
const loadBackgrounds = async () => {
  try {
    const res = await fetch(resolveUrl('/data/background-images.json'))
    const data = await res.json()
    backgroundImages.value = resolveBackgroundImages(data)
  } catch {
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
.route-loader {
  position: fixed;
  top: 60px;
  left: 0;
  width: 0;
  height: 3px;
  z-index: 9999;
  background: linear-gradient(90deg, #ffb6c9 0%, #a7f3d0 30%, #9ad7ff 60%, #c7b6ff 100%);
  background-size: 200% 100%;
  border-radius: 0 2px 2px 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.route-loader.is-loading {
  opacity: 1;
  animation:
    route-loader-progress 0.8s ease-out forwards,
    route-loader-shimmer 1.2s ease-in-out infinite;
}

@keyframes route-loader-progress {
  0% {
    width: 0%;
  }
  30% {
    width: 45%;
  }
  60% {
    width: 70%;
  }
  100% {
    width: 85%;
  }
}

@keyframes route-loader-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
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
html.entry-loading .hero-eyebrow,
html.entry-loading .hero-actions,
html.entry-loading .hero-sound,
html.entry-loading .scroll-down {
  animation-play-state: paused;
}

/* 揭幕：整页淡入 */
html.entry-revealed #app {
  animation: entry-page-rise 0.92s cubic-bezier(0.22, 0.9, 0.25, 1) both;
}

@keyframes entry-page-rise {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  html.entry-revealed #app {
    animation: none;
  }
}
</style>
