<template>
  <div id="app">
    <!-- 背景轮播 -->
    <div class="slideshow" aria-hidden="true">
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

    <!-- 主内容区域 -->
    <router-view v-slot="{ Component }">
      <transition name="page-transition" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

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
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import Fireflies from '@/components/common/Fireflies.vue'
import SearchPanel from '@/components/common/SearchPanel.vue'
import SettingsModal from '@/components/common/SettingsModal.vue'
import AnnouncementModal from '@/components/common/AnnouncementModal.vue'
import FloatingControls from '@/components/common/FloatingControls.vue'
import { useBackgroundStore } from '@/stores/backgroundStore'
import { resolveUrl } from '@/utils/url'

const route = useRoute()
const bgStore = useBackgroundStore()

const backgroundImages = ref([])
const currentBgIndex = ref(0)

// 显示萤火虫的页面
const showFireflies = computed(() => {
  const pages = ['archive', 'categories', 'quick-links', 'series']
  return pages.includes(route.name?.toLowerCase())
})

// 加载背景图
const loadBackgrounds = async () => {
  try {
    const res = await fetch(resolveUrl('/data/background-images.json'))
    const data = await res.json()
    backgroundImages.value = Array.isArray(data) ? data : data?.images || []
  } catch (e) {
    backgroundImages.value = [
      resolveUrl('/assets/images/background/bg1.png'),
      resolveUrl('/assets/images/background/bg2.png'),
      resolveUrl('/assets/images/background/bg3.png')
    ]
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
})

onUnmounted(() => {
  if (bgInterval) clearInterval(bgInterval)
})
</script>

<style>
/* ===== 页面过渡动画 ===== */
.page-transition-enter-active,
.page-transition-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.page-transition-enter-from,
.page-transition-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>