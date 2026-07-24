<template>
  <nav class="navbar">
    <div class="nav-container">
      <!-- 品牌区 -->
      <div class="nav-brand">
        <router-link class="nav-avatar" to="/about">
          <img :src="resolveUrl('/assets/avatar.png')" alt="头像">
        </router-link>
        <router-link class="nav-brand-link" to="/">
          <span>{{ i18n.currentTranslations.brand }}</span>
        </router-link>
      </div>

      <!-- 导航菜单 -->
      <ul class="nav-menu" :class="{ active: isMenuOpen, offcanvas: isMobile }">
        <li v-for="item in menuItems" :key="item.path">
          <router-link :to="item.path" :class="{ active: route.path === item.path }">
            <i :class="item.icon"></i>
            <span>{{ i18n.currentTranslations[item.key] }}</span>
          </router-link>
        </li>
      </ul>

      <!-- 右侧操作区 -->
      <div class="nav-actions">
        <button class="nav-search-btn" @click="openSearch">
          <i class="fas fa-search"></i>
          <span>{{ i18n.currentTranslations.search }}</span>
        </button>
        <div class="nav-toggle" @click="toggleMenu">
          <i class="fas fa-bars"></i>
        </div>
      </div>

      <!-- 移动端遮罩 -->
      <div v-if="isMenuOpen" class="offcanvas-backdrop" @click="closeMenu"></div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18nStore'
import { resolveUrl } from '@/utils/url'

const route = useRoute()
const i18n = useI18nStore()
const isMenuOpen = ref(false)
const isMobile = ref(window.innerWidth <= 1100)

const menuItems = [
  { path: '/', key: 'home', icon: 'fas fa-home' },
  { path: '/archive', key: 'archive', icon: 'fas fa-archive' },
  { path: '/categories', key: 'categories', icon: 'fas fa-tags' },
  { path: '/series', key: 'series', icon: 'fas fa-layer-group' },
  { path: '/quick-links', key: 'quicklinks', icon: 'fas fa-link' }
]

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
  document.body.classList.toggle('offcanvas-open', isMenuOpen.value)
}

const closeMenu = () => {
  isMenuOpen.value = false
  document.body.classList.remove('offcanvas-open')
}

const openSearch = () => {
  window.dispatchEvent(new CustomEvent('toggle-search'))
}

const handleResize = () => {
  isMobile.value = window.innerWidth <= 1100
  if (!isMobile.value) closeMenu()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>