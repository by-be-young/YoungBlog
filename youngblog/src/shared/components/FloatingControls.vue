<!-- FloatingControls.vue - 左下角快捷控制坞（公告 / 设置 / 音乐） -->
<template>
  <div class="floating-controls-container" :class="{ 'is-open': mobileOpen }">
    <button
      class="fab-btn fab-toggle"
      :class="{ 'has-unread': hasUnread }"
      type="button"
      :aria-label="i18n.currentTranslations.control_controls"
      :aria-expanded="mobileOpen"
      @click="mobileOpen = !mobileOpen"
    >
      <i class="fas fa-sliders" aria-hidden="true"></i>
      <span v-if="hasUnread" class="fab-dot" aria-hidden="true"></span>
    </button>

    <!-- 公告悬浮球 -->
    <button
      class="fab-btn fab-announcement"
      :class="{ 'has-unread': hasUnread }"
      type="button"
      :aria-label="i18n.currentTranslations.control_announcement"
      @click="openAnnouncement"
    >
      <i class="fas fa-bullhorn" aria-hidden="true"></i>
      <span v-if="hasUnread" class="fab-dot" aria-hidden="true"></span>
      <span class="fab-tooltip">{{ i18n.currentTranslations.control_announcement }}</span>
    </button>

    <!-- 设置悬浮球 -->
    <button
      class="fab-btn fab-settings"
      type="button"
      :aria-label="i18n.currentTranslations.control_settings"
      @click="openSettings"
    >
      <i class="fas fa-sliders" aria-hidden="true"></i>
      <span class="fab-tooltip">{{ i18n.currentTranslations.control_settings }}</span>
    </button>

    <!-- 音乐悬浮球 — 从 store 读取播放状态 -->
    <button
      class="fab-btn fab-music"
      :class="{ 'is-visible': showMusicFab, 'is-paused': !musicStore.isPlaying }"
      type="button"
      :aria-label="i18n.currentTranslations.control_music"
      @click="toggleMusic"
    >
      <i :class="musicStore.isPlaying ? 'fas fa-pause' : 'fas fa-play'" aria-hidden="true"></i>
      <span class="fab-tooltip">{{ i18n.currentTranslations.control_music }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useMusicStore } from '@/shared/stores/musicStore'
import { useI18nStore } from '@/shared/stores/i18nStore'

const musicStore = useMusicStore()
const i18n = useI18nStore()
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

<style scoped>
/* ==================================================
   快捷控制坞：纸面玻璃 + 黄绿细描边
   色值统一走 --notice-* 变量
   ================================================== */

.floating-controls-container {
  position: fixed;
  left: 22px;
  bottom: 22px;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 10px;
}

/* ===== 基础 FAB ===== */
.floating-controls-container .fab-btn {
  position: relative;
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--notice-accent-veil);
  background:
    radial-gradient(120% 120% at 30% 18%, var(--notice-inset), transparent 58%),
    var(--notice-paper);
  color: var(--notice-ink-soft);
  font-size: 1.1rem;
  cursor: pointer;
  outline: none;
  user-select: none;
  box-shadow:
    var(--notice-shadow-soft),
    0 1px 0 var(--notice-inset) inset;
  backdrop-filter: blur(10px) saturate(1.1);
  -webkit-backdrop-filter: blur(10px) saturate(1.1);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    opacity 0.2s ease,
    visibility 0.2s ease;
}

.floating-controls-container .fab-btn:hover {
  transform: translateY(-2px);
  color: var(--notice-accent-deep);
  border-color: var(--notice-accent);
  box-shadow:
    0 14px 28px var(--notice-glow),
    0 1px 0 var(--notice-inset) inset;
}

.floating-controls-container .fab-btn:active {
  transform: translateY(0) scale(0.97);
}

.floating-controls-container .fab-btn:focus-visible {
  outline: 2px solid var(--notice-accent-strong);
  outline-offset: 3px;
}

.floating-controls-container .fab-toggle {
  display: none;
}

/* ===== 提示气泡（仅桌面端） ===== */
.floating-controls-container .fab-tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translate(-4px, -50%);
  padding: 0.28rem 0.62rem;
  border-radius: 999px;
  border: 1px solid var(--notice-accent-veil);
  background: var(--notice-paper-solid);
  color: var(--notice-accent-deep);
  font-family: var(--font-ui, -apple-system, 'Segoe UI', 'PingFang SC', sans-serif);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  box-shadow: var(--notice-shadow-soft);
  transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;
}

.floating-controls-container .fab-btn:hover .fab-tooltip,
.floating-controls-container .fab-btn:focus-visible .fab-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translate(0, -50%);
}

/* ===== 未读标记 ===== */
.floating-controls-container .fab-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--notice-accent-strong);
  box-shadow: 0 0 0 2px var(--notice-paper-solid);
}

.floating-controls-container .fab-announcement {
  color: var(--notice-accent-strong);
}

.floating-controls-container .fab-announcement.has-unread {
  border-color: var(--notice-accent-strong);
  background:
    radial-gradient(120% 120% at 30% 18%, var(--notice-inset), transparent 58%),
    linear-gradient(150deg, var(--notice-accent-200), var(--notice-gold-soft));
  color: var(--notice-accent-deep);
  box-shadow:
    0 10px 24px var(--notice-glow),
    0 1px 0 var(--notice-inset) inset;
}

.floating-controls-container .fab-announcement.has-unread::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1px solid var(--notice-accent-veil);
  animation: fab-ring 3.2s ease-out infinite;
  pointer-events: none;
}

@keyframes fab-ring {
  0% { opacity: 0.55; transform: scale(1); }
  70%, 100% { opacity: 0; transform: scale(1.18); }
}

/* ===== 设置 ===== */
.floating-controls-container .fab-settings {
  color: var(--notice-ink-soft);
}

/* ===== 音乐 ===== */
.floating-controls-container .fab-music {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(8px);
  color: var(--notice-accent-deep);
}

.floating-controls-container .fab-music.is-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}

.floating-controls-container .fab-music.is-paused {
  color: var(--notice-ink-faint);
  border-color: var(--notice-line);
}

/* ===== 平板 / 小屏桌面 ===== */
@media (max-width: 900px) {
  .floating-controls-container {
    left: 14px;
    bottom: 14px;
    gap: 8px;
  }

  .floating-controls-container .fab-btn {
    width: 44px;
    height: 44px;
    font-size: 1rem;
  }

  .floating-controls-container .fab-tooltip {
    display: none;
  }
}

/* ===== 移动端：收成一枚玻璃胶囊，展开后横向排布 ===== */
@media (max-width: 720px) {
  .floating-controls-container {
    right: auto;
    left: 14px;
    bottom: 12px;
    flex-direction: row;
    gap: 1px;
    padding: 4px;
    border: 1px solid var(--notice-accent-veil);
    border-radius: 999px;
    background: var(--notice-paper);
    box-shadow:
      var(--notice-shadow-soft),
      0 1px 0 var(--notice-inset) inset;
    backdrop-filter: blur(16px) saturate(1.12);
    -webkit-backdrop-filter: blur(16px) saturate(1.12);
  }

  .floating-controls-container .fab-btn {
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    font-size: 0.9rem;
  }

  .floating-controls-container .fab-btn:hover {
    transform: none;
    background: var(--notice-accent-wash);
    box-shadow: none;
  }

  .floating-controls-container .fab-announcement.has-unread {
    background: var(--notice-accent-200);
    box-shadow: none;
  }

  .floating-controls-container .fab-announcement.has-unread::after {
    display: none;
  }

  .floating-controls-container .fab-dot {
    top: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    box-shadow: 0 0 0 2px var(--notice-paper-solid);
  }

  .floating-controls-container .fab-toggle {
    display: inline-flex;
    color: var(--notice-accent-strong);
  }

  .floating-controls-container .fab-announcement,
  .floating-controls-container .fab-settings,
  .floating-controls-container .fab-music {
    display: none;
  }

  .floating-controls-container.is-open .fab-announcement,
  .floating-controls-container.is-open .fab-settings,
  .floating-controls-container.is-open .fab-music.is-visible {
    display: inline-flex;
  }

  .floating-controls-container.is-open .fab-toggle {
    background: var(--notice-accent-100);
  }
}

@media (prefers-reduced-motion: reduce) {
  .floating-controls-container .fab-btn,
  .floating-controls-container .fab-tooltip {
    transition: none;
  }

  .floating-controls-container .fab-announcement.has-unread::after {
    animation: none;
  }
}
</style>
