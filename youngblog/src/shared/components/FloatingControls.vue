<!-- FloatingControls.vue - 完整修复 -->
<template>
  <div class="floating-controls-container" :class="{ 'is-open': mobileOpen }">
    <button class="fab-btn fab-toggle" :class="{ 'has-unread': hasUnread }" type="button" @click="mobileOpen = !mobileOpen" aria-label="展开快捷控制">
      <i class="fas fa-sliders"></i>
    </button>

    <!-- 公告悬浮球 -->
    <button class="fab-btn fab-announcement" :class="{ 'has-unread': hasUnread }" @click="openAnnouncement" aria-label="打开公告">
      <i class="fas fa-bullhorn"></i>
    </button>

    <!-- 设置悬浮球 -->
    <button class="fab-btn fab-settings" @click="openSettings" aria-label="打开设置">
      <i class="fas fa-cog"></i>
    </button>

    <!-- 音乐悬浮球 — 从 store 读取播放状态 -->
    <button class="fab-btn fab-music" :class="{ 'is-visible': showMusicFab, 'is-paused': !musicStore.isPlaying }" @click="toggleMusic" aria-label="音乐控制">
      <i :class="musicStore.isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useMusicStore } from '@/shared/stores/musicStore'

const musicStore = useMusicStore()
const hasUnread = ref(false)
const showMusicFab = ref(false)
const mobileOpen = ref(false)

let hideTimer = null

const openSettings = () => {
  mobileOpen.value = false
  window.dispatchEvent(new CustomEvent('toggle-settings'))
}

const openAnnouncement = () => {
  mobileOpen.value = false
  window.dispatchEvent(new CustomEvent('toggle-announcement'))
}

/** 点击音乐悬浮球 → 切换播放/暂停 */
const toggleMusic = () => {
  musicStore.togglePlay()
  mobileOpen.value = false
  // 用户主动点击，立即展示并取消自动隐藏
  showMusicFab.value = true
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

/** 音乐初始化后展示悬浮球 */
watch(() => musicStore.isInitialized, (val) => {
  if (val) showMusicFab.value = true
})

/** 播放/暂停状态变化 → 控制自动隐藏
 *  - 播放中：始终展示
 *  - 暂停后：3 秒后隐藏
 */
watch(() => musicStore.isPlaying, (playing) => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (playing) {
    showMusicFab.value = true
  } else if (musicStore.isInitialized) {
    // 暂停后 3s 自动隐藏悬浮球
    hideTimer = setTimeout(() => {
      showMusicFab.value = false
    }, 3000)
  }
})

onMounted(() => {
  const key = 'homeAnnouncementModalShown_v1'
  hasUnread.value = !localStorage.getItem(key)
})

onUnmounted(() => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
})
</script>

<style>
/* ==================================================
   SECTION: 浮动控制按钮 - 使用独立类名避免冲突
   ================================================== */

.floating-controls-container {
  position: fixed !important;
  left: 22px !important;
  bottom: 22px !important;
  z-index: 9999 !important;
  display: flex !important;
  flex-direction: column-reverse !important;
  align-items: center !important;
  gap: 12px !important;
}

/* ===== 基础 FAB 样式 ===== */
.floating-controls-container .fab-btn {
  width: 52px !important;
  height: 52px !important;
  border: 2px solid transparent !important;
  border-radius: 50% !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 20px !important;
  cursor: pointer !important;
  transition: transform 0.14s ease, box-shadow 0.14s ease, opacity 0.18s ease, visibility 0.18s ease !important;
  box-shadow: 0 10px 24px rgba(23, 34, 47, 0.12) !important;
  background:
    linear-gradient(180deg, #fffdf9 0%, #fdf6ec 100%) padding-box,
    linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(199, 182, 255, 0.9) 52%, rgba(167, 243, 208, 0.95)) border-box !important;
  color: #17324f !important;
  outline: none !important;
  user-select: none !important;
}

.floating-controls-container .fab-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 16px 32px rgba(23, 34, 47, 0.18) !important;
}

.floating-controls-container .fab-btn:active {
  transform: translateY(0) !important;
}

.floating-controls-container .fab-toggle {
  display: none !important;
}

/* ===== 公告按钮 ===== */
.floating-controls-container .fab-announcement {
  color: #c84070 !important;
}

.floating-controls-container .fab-announcement.has-unread {
  background:
    linear-gradient(180deg, #fff5f8 0%, #ffe9ef 100%) padding-box,
    linear-gradient(135deg, rgba(255, 166, 192, 0.98), rgba(255, 214, 166, 0.92)) border-box !important;
  color: #b83760 !important;
  box-shadow: 0 12px 30px rgba(200, 64, 112, 0.18) !important;
}

.floating-controls-container .fab-announcement.has-unread i {
  animation: fab-shake 4s ease-in-out infinite;
}

@keyframes fab-shake {
  0%, 72%, 100% { transform: rotate(0deg) scale(1); }
  75% { transform: rotate(-14deg) scale(1.04); }
  78% { transform: rotate(13deg) scale(1.04); }
  81% { transform: rotate(-11deg) scale(1.03); }
  84% { transform: rotate(10deg) scale(1.03); }
  87% { transform: rotate(-7deg) scale(1.02); }
  90% { transform: rotate(0deg) scale(1); }
}

/* ===== 设置按钮 ===== */
.floating-controls-container .fab-settings {
  color: #7b6bd6 !important;
}

/* ===== 音乐按钮 ===== */
.floating-controls-container .fab-music {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(8px) !important;
  color: #2f9e7f !important;
}

.floating-controls-container .fab-music.is-visible {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transform: translateY(0) !important;
}

.floating-controls-container .fab-music.is-paused {
  color: rgba(23, 34, 47, 0.55) !important;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .floating-controls-container {
    left: 14px !important;
    bottom: 14px !important;
    gap: 10px !important;
  }

  .floating-controls-container .fab-btn {
    width: 44px !important;
    height: 44px !important;
    font-size: 17px !important;
    border-width: 4px !important;
  }
}

@media (max-width: 720px) {
  .floating-controls-container {
    left: 14px !important;
    bottom: 14px !important;
    gap: 10px !important;
  }
  
  .floating-controls-container .fab-btn {
    width: 44px !important;
    height: 44px !important;
    font-size: 17px !important;
  }
}

@media (max-width: 480px) {
  .floating-controls-container {
    left: 10px !important;
    bottom: 10px !important;
    gap: 8px !important;
  }
  
  .floating-controls-container .fab-btn {
    width: 44px !important;
    height: 44px !important;
    font-size: 17px !important;
    border-width: 4px !important;
  }
}

@media (max-width: 720px) {
  /* 移动端把三颗竖排圆按钮收成一枚横向玻璃胶囊，降低对正文的遮挡 */
  .floating-controls-container {
    right: auto !important;
    left: 14px !important;
    bottom: 12px !important;
    flex-direction: row !important;
    gap: 1px !important;
    padding: 4px !important;
    border: 1px solid rgba(255, 255, 255, 0.7) !important;
    border-radius: 999px !important;
    background: rgba(253, 249, 242, 0.78) !important;
    box-shadow:
      0 12px 30px rgba(23, 34, 47, 0.14),
      0 1px 0 rgba(255, 255, 255, 0.65) inset !important;
    backdrop-filter: blur(16px) saturate(1.12) !important;
    -webkit-backdrop-filter: blur(16px) saturate(1.12) !important;
  }

  .floating-controls-container .fab-btn {
    width: 38px !important;
    height: 38px !important;
    border: 0 !important;
    border-radius: 50% !important;
    background: transparent !important;
    box-shadow: none !important;
    font-size: 14px !important;
  }

  .floating-controls-container .fab-btn:hover {
    transform: none !important;
    background: rgba(255, 255, 255, 0.62) !important;
    box-shadow: none !important;
  }

  .floating-controls-container .fab-announcement.has-unread {
    background: linear-gradient(135deg, rgba(255, 232, 239, 0.96), rgba(255, 241, 220, 0.96)) !important;
    box-shadow: 0 4px 12px rgba(200, 64, 112, 0.16) !important;
  }

  /* 移动端默认只露出一枚玻璃圆钮，点开后再展开三项控制 */
  .floating-controls-container .fab-toggle {
    position: relative !important;
    display: inline-flex !important;
  }

  .floating-controls-container .fab-toggle.has-unread::after {
    content: '';
    position: absolute;
    top: 5px;
    right: 5px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c84070;
    box-shadow: 0 0 0 2px rgba(253, 249, 242, 0.9);
  }

  .floating-controls-container .fab-announcement,
  .floating-controls-container .fab-settings {
    display: none !important;
  }

  .floating-controls-container .fab-music {
    display: none !important;
  }

  .floating-controls-container.is-open .fab-announcement,
  .floating-controls-container.is-open .fab-settings {
    display: inline-flex !important;
  }

  .floating-controls-container.is-open .fab-music.is-visible {
    display: inline-flex !important;
  }

  .floating-controls-container.is-open .fab-toggle {
    background: rgba(255, 255, 255, 0.62) !important;
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .floating-controls-container .fab-announcement.has-unread i {
    animation: none !important;
  }
}
</style>