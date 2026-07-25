<!-- FloatingControls.vue - 完整修复 -->
<template>
  <div class="floating-controls-container">
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
import { useMusicStore } from '@/stores/musicStore'

const musicStore = useMusicStore()
const hasUnread = ref(false)
const showMusicFab = ref(false)

let hideTimer = null

const openSettings = () => {
  window.dispatchEvent(new CustomEvent('toggle-settings'))
}

const openAnnouncement = () => {
  window.dispatchEvent(new CustomEvent('toggle-announcement'))
}

/** 点击音乐悬浮球 → 切换播放/暂停 */
const toggleMusic = () => {
  musicStore.togglePlay()
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
  width: 56px !important;
  height: 56px !important;
  border: 5px solid transparent !important;
  border-radius: 50% !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 22px !important;
  cursor: pointer !important;
  transition: transform 0.14s ease, box-shadow 0.14s ease, opacity 0.18s ease, visibility 0.18s ease !important;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
  background:
    linear-gradient(135deg, rgba(255, 232, 130, 0.96) 0%, rgba(210, 242, 146, 0.96) 50%, rgba(255, 220, 148, 0.96) 100%) padding-box,
    linear-gradient(135deg, rgba(255, 224, 126, 0.92), rgba(206, 238, 140, 0.92), rgba(255, 214, 138, 0.92)) border-box !important;
  color: #b57b00 !important;
  outline: none !important;
  user-select: none !important;
}

.floating-controls-container .fab-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 14px 30px rgba(181, 138, 0, 0.20) !important;
}

.floating-controls-container .fab-btn:active {
  transform: translateY(0) !important;
}

/* ===== 公告按钮 ===== */
.floating-controls-container .fab-announcement {
  background:
    linear-gradient(135deg, rgba(255, 232, 130, 0.96) 0%, rgba(210, 242, 146, 0.96) 50%, rgba(255, 220, 148, 0.96) 100%) padding-box,
    linear-gradient(135deg, rgba(255, 224, 126, 0.92), rgba(206, 238, 140, 0.92), rgba(255, 214, 138, 0.92)) border-box !important;
  color: #b57b00 !important;
}

.floating-controls-container .fab-announcement.has-unread {
  background:
    linear-gradient(135deg, rgba(255, 220, 170, 0.98) 0%, rgba(255, 190, 120, 0.98) 50%, rgba(255, 225, 160, 0.98) 100%) padding-box,
    linear-gradient(135deg, rgba(255, 200, 140, 0.92), rgba(255, 170, 100, 0.92), rgba(255, 200, 130, 0.92)) border-box !important;
  color: #7b4a00 !important;
  box-shadow: 0 12px 30px rgba(255, 165, 64, 0.12) !important;
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
  background:
    linear-gradient(135deg, rgba(255, 232, 130, 0.96) 0%, rgba(210, 242, 146, 0.96) 50%, rgba(255, 220, 148, 0.96) 100%) padding-box,
    linear-gradient(135deg, rgba(255, 224, 126, 0.92), rgba(206, 238, 140, 0.92), rgba(255, 214, 138, 0.92)) border-box !important;
  color: #b57b00 !important;
}

/* ===== 音乐按钮 ===== */
.floating-controls-container .fab-music {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(8px) !important;
}

.floating-controls-container .fab-music.is-visible {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transform: translateY(0) !important;
}

.floating-controls-container .fab-music.is-paused {
  color: #7b5b00 !important;
}

/* ===== 响应式 ===== */
@media (max-width: 720px) {
  .floating-controls-container {
    left: 14px !important;
    bottom: 14px !important;
    gap: 10px !important;
  }
  
  .floating-controls-container .fab-btn {
    width: 50px !important;
    height: 50px !important;
    font-size: 20px !important;
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

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .floating-controls-container .fab-announcement.has-unread i {
    animation: none !important;
  }
}
</style>