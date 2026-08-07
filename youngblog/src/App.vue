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
import { useBackgroundStore } from '@/stores/backgroundStore'
import { useMusicStore } from '@/stores/musicStore'
import { resolveUrl } from '@/utils/url'

const route = useRoute()
const router = useRouter()
const bgStore = useBackgroundStore()

const backgroundImages = ref([])
const currentBgIndex = ref(0)
const routeLoading = ref(false)
let loadingTimer = null

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

// 默认背景图（JSON 缺失或列表为空时使用）
const defaultBackgrounds = () => [
  resolveUrl('/assets/images/background/bg1.png'),
  resolveUrl('/assets/images/background/bg2.png'),
  resolveUrl('/assets/images/background/bg3.png')
]

// 加载背景图
const loadBackgrounds = async () => {
  try {
    const res = await fetch(resolveUrl('/data/background-images.json'))
    const data = await res.json()
    const images = Array.isArray(data) ? data : data?.images || []
    backgroundImages.value = images.length > 0 ? images : defaultBackgrounds()
  } catch (e) {
    backgroundImages.value = defaultBackgrounds()
  }
  bgStore.setImages(backgroundImages.value)
}

// 轮播定时器
let bgInterval = null

onMounted(() => {
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
</style>
