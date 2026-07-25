<!-- SettingsModal.vue - 蒙版淡入淡出 + 卡片缩放 -->
<template>
  <Teleport to="body">
    <Transition
      name="settings-modal-transition"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="isOpen"
        class="settings-modal"
        @click="handleBackdropClick"
      >
        <div class="settings-modal-card" role="dialog" aria-modal="true">
          <button class="settings-modal-close" @click="closeModal">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
          <div class="settings-modal-content">
            <!-- 左侧标签页 -->
            <div class="settings-sidebar">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                class="settings-tab"
                :class="{ active: activeTab === tab.key }"
                @click="activeTab = tab.key"
              >
                {{ i18n.currentTranslations[tab.labelKey] }}
              </button>
            </div>
            <!-- 右侧面板 -->
            <div class="settings-panel">
              <!-- 语言设置 -->
              <div v-show="activeTab === 'language'" class="settings-section active" id="language-section">
                <h3>{{ i18n.currentTranslations.settings_language_title }}</h3>
                <p class="language-note">{{ i18n.currentTranslations.settings_language_note }}</p>
                <div class="language-options">
                  <label v-for="lang in languages" :key="lang.value">
                    <input
                      type="radio"
                      name="language"
                      :value="lang.value"
                      :checked="i18n.getLang() === lang.value"
                      @change="i18n.setLang(lang.value)"
                    />
                    <span>{{ i18n.currentTranslations[lang.labelKey] }}</span>
                  </label>
                </div>
              </div>
              <!-- 音乐设置 -->
              <div v-show="activeTab === 'music'" class="settings-section active" id="music-section">
                <h3>{{ i18n.currentTranslations.settings_music_title }}</h3>
                <p class="music-hint">{{ i18n.currentTranslations.settings_music_hint }}</p>
                <p class="music-original-note">{{ i18n.currentTranslations.settings_music_original }}</p>
                <div class="music-controls">
                  <div class="music-track">
                    <label for="music-select">{{ i18n.currentTranslations.settings_track_label }}</label>
                    <select id="music-select" :value="musicStore.currentTrack" @change="onTrackChange">
                      <option value="">{{ i18n.currentTranslations.settings_track_none }}</option>
                      <option value="抹不去的记忆.mp3">{{ i18n.currentTranslations.settings_track_memory }}</option>
                      <option value="澎湃.mp3">{{ i18n.currentTranslations.settings_track_passion }}</option>
                      <option value="谎画.mp3">{{ i18n.currentTranslations.settings_track_liepaint }}</option>
                    </select>
                  </div>
                  <div class="music-playback">
                    <button class="music-btn" @click="playSelectedTrack">
                      <i :class="musicStore.isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
                      <span>{{ musicStore.isPlaying ? i18n.currentTranslations.settings_pause : i18n.currentTranslations.settings_play }}</span>
                    </button>
                    <button class="music-btn" @click="musicStore.stop()">
                      <i class="fas fa-stop"></i>
                      <span>{{ i18n.currentTranslations.settings_stop }}</span>
                    </button>
                  </div>
                  <div class="music-progress">
                    <label for="progress-slider">{{ i18n.currentTranslations.settings_progress_label }}</label>
                    <input type="range" id="progress-slider" min="0" max="100" step="0.1" :value="musicStore.progress" @input="onSeek" />
                    <span id="progress-value">{{ musicStore.formatTime(musicStore.currentTime) }} / {{ musicStore.formatTime(musicStore.duration) }}</span>
                  </div>
                  <div class="music-volume">
                    <label for="volume-slider">{{ i18n.currentTranslations.settings_volume_label }}</label>
                    <input type="range" id="volume-slider" min="0" max="1" step="0.05" :value="musicStore.volume" @input="onVolumeChange" />
                    <span id="volume-value">{{ Math.round(musicStore.volume * 100) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useMusicStore } from '@/stores/musicStore'

const i18n = useI18nStore()
const musicStore = useMusicStore()

const isOpen = ref(false)
const activeTab = ref('language')

const tabs = [
  { key: 'language', labelKey: 'settings_tab_language' },
  { key: 'music', labelKey: 'settings_tab_music' }
]

const languages = [
  { value: 'zh', labelKey: 'settings_language_zh' },
  { value: 'en', labelKey: 'settings_language_en' },
  { value: 'ja', labelKey: 'settings_language_ja' }
]

// ============ 弹窗控制 ============

const openModal = () => {
  isOpen.value = true
  document.body.classList.add('settings-modal-open')
}

const closeModal = () => {
  isOpen.value = false
  document.body.classList.remove('settings-modal-open')
}

const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget) closeModal()
}

const handleKeydown = (e) => {
  if (e.key === 'Escape' && isOpen.value) closeModal()
}

// ============ 音乐控制 ============

/** 切换曲目选择 */
const onTrackChange = (e) => {
  musicStore.setTrack(e.target.value)
}

/** 播放/暂停当前选中曲目（SettingsModal 的播放按钮） */
const playSelectedTrack = () => {
  musicStore.togglePlay(musicStore.currentTrack)
}

/** 进度拖动 */
const onSeek = (e) => {
  musicStore.seek(parseFloat(e.target.value))
}

/** 音量调整 */
const onVolumeChange = (e) => {
  musicStore.setVolume(parseFloat(e.target.value))
}

/** 首次用户手势初始化音频（满足浏览器自动播放策略） */
const enableMusic = () => {
  musicStore.initAudio()
}

// Transition 钩子 - 确保背景过渡正常工作
const onEnter = (el) => {
  el.offsetHeight
}

const onLeave = (el) => {
  el.offsetHeight
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  // 首次用户交互时初始化音频（一次性）
  window.addEventListener('click', enableMusic, { once: true })
  window.addEventListener('keydown', enableMusic, { once: true })
  window.addEventListener('toggle-settings', openModal)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('toggle-settings', openModal)
})
</script>

<style>
/* ==================================================
   设置弹窗 - 蒙版淡入淡出 + 卡片缩放
   ================================================== */

/* ---- 背景遮罩（整体容器淡入淡出） ---- */
.settings-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.35);
  /* 整个容器透明度过渡，实现蒙版淡入淡出 */
  transition: opacity 0.28s ease;
}

/* 进入/离开的透明度状态 */
.settings-modal-transition-enter-from,
.settings-modal-transition-leave-to {
  opacity: 0;
}

.settings-modal-transition-enter-to,
.settings-modal-transition-leave-from {
  opacity: 1;
}

/* ---- 卡片容器（独立缩放、透明度、滤镜） ---- */
.settings-modal-card {
  position: relative;
  width: min(900px, calc(100vw - 28px));
  max-height: min(82vh, 720px);
  padding: 18px;
  border-radius: 14px;
  background: transparent;
  backdrop-filter: none;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.18);
  overflow: auto;
  /* 正常状态（最终状态） */
  transform: translate(0, 0) scale(1);
  opacity: 1;
  filter: grayscale(0) saturate(1);
  /* 卡片独立过渡，比背景稍快或同步均可 */
  transition: transform 0.32s cubic-bezier(0.2, 0.7, 0.25, 1),
    opacity 0.28s ease,
    filter 0.28s ease;
  will-change: transform, opacity, filter;
}

/* 进入初始状态 & 离开结束状态（缩放 + 透明 + 灰度） */
.settings-modal-transition-enter-from .settings-modal-card,
.settings-modal-transition-leave-to .settings-modal-card {
  transform: translate(-22px, 22px) scale(0.76);
  opacity: 0;
  filter: grayscale(1) saturate(0.2);
}

/* ---- 其余样式（与原始文件完全一致，未修改） ---- */

.settings-modal-close {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.86);
  color: rgba(0, 0, 0, 0.65);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease, background-color 0.12s ease;
  z-index: 10;
}

.settings-modal-close:hover {
  transform: rotate(90deg);
  background: rgba(255, 255, 255, 0.95);
}

/* 设置弹窗内容布局 */
.settings-modal-content {
  display: flex;
  min-height: 400px;
  background:
    linear-gradient(135deg,
      rgba(255, 232, 130, 0.94) 0%,
      rgba(210, 242, 146, 0.94) 50%,
      rgba(255, 220, 148, 0.94) 100%) padding-box,
    linear-gradient(135deg,
      rgba(255, 224, 126, 0.90),
      rgba(206, 238, 140, 0.90),
      rgba(255, 214, 138, 0.90)) border-box;
  border: 5px solid transparent;
  border-radius: 8px;
  padding: 20px;
}

.settings-sidebar {
  width: 150px;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  padding-right: 20px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.settings-tab {
  padding: 12px 16px;
  margin-bottom: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-align: left;
  font-family: inherit;
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
}

.settings-tab.active {
  background: rgba(255, 255, 255, 0.4);
  color: #b57b00;
}

.settings-tab:hover {
  background: rgba(255, 255, 255, 0.3);
}

.settings-panel {
  flex: 1;
  padding-left: 20px;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

.settings-section {
  display: block;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  height: 0;
  overflow: hidden;
  transition: none;
}

.settings-section.active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  height: auto;
  overflow-y: auto;
  max-height: 100%;
  padding-bottom: 8px;
}

.settings-section h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #6b2b4a;
  font-size: 1.2rem;
}

.language-note {
  margin: -6px 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed rgba(181, 123, 0, 0.35);
  background: rgba(255, 255, 255, 0.22);
  color: rgba(76, 57, 0, 0.92);
  font-size: 13px;
  line-height: 1.6;
}

.language-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.language-options label {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.language-options label:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.language-options label input[type="radio"] {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.language-options label input[type="radio"]:checked {
  background: #b57b00;
  border-color: #b57b00;
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.9);
}

.language-options label:has(input[type="radio"]:checked) {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
  color: #b57b00;
  font-weight: 600;
}

.music-hint {
  margin: -6px 0 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed rgba(181, 123, 0, 0.35);
  background: rgba(255, 255, 255, 0.22);
  color: rgba(76, 57, 0, 0.92);
  font-size: 13px;
  line-height: 1.6;
}

.music-original-note {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(181, 123, 0, 0.45);
  background: linear-gradient(135deg, rgba(255, 237, 171, 0.56), rgba(255, 221, 144, 0.46));
  color: #7b5b00;
  font-size: 14px;
  font-weight: 700;
}

.music-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.music-track {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
}

.music-track label {
  flex-shrink: 0;
  font-weight: 600;
  color: rgba(52, 52, 52, 0.9);
}

.music-track select {
  flex: 1;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.88);
  color: #3a3a3a;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
}

.music-playback {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
}

.music-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.84);
  color: #6e5100;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 600;
  font-family: inherit;
  font-size: 0.95rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.music-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(181, 123, 0, 0.18);
}

.music-progress,
.music-volume {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
}

.music-progress label,
.music-volume label {
  flex-shrink: 0;
  font-weight: 600;
  color: rgba(52, 52, 52, 0.9);
}

.music-progress input[type="range"],
.music-volume input[type="range"] {
  flex: 1;
  height: 6px;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(181, 123, 0, 0.5), rgba(255, 255, 255, 0.9));
  outline: none;
}

.music-progress input[type="range"]::-webkit-slider-thumb,
.music-volume input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: #b57b00;
  cursor: pointer;
}

.music-progress input[type="range"]::-moz-range-thumb,
.music-volume input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: #b57b00;
  cursor: pointer;
}

#progress-value {
  min-width: 110px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: #7b5b00;
  font-weight: 600;
}

#volume-value {
  min-width: 42px;
  text-align: right;
  color: #7b5b00;
  font-weight: 600;
}

body.settings-modal-open {
  overflow: hidden;
}

/* 响应式 */
@media (max-width: 720px) {
  .settings-modal {
    align-items: center;
    justify-content: center;
    padding: 12px;
    overflow: hidden;
  }

  .settings-modal-card {
    width: min(680px, 100%);
    height: min(86vh, 720px);
    max-height: none;
    padding: 12px;
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* 移动端缩放起点改为从底部中心 */
    transform-origin: center bottom;
  }

  /* 覆盖卡片的进入/离开初始状态，适配移动端 */
  .settings-modal-transition-enter-from .settings-modal-card,
  .settings-modal-transition-leave-to .settings-modal-card {
    transform: translateY(24px) scale(0.96);
    opacity: 0;
    filter: grayscale(1) saturate(0.2);
  }

  .settings-modal-content {
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 14px;
    gap: 14px;
    overflow: hidden;
  }

  .settings-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding-right: 0;
    padding-bottom: 12px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .settings-tab {
    margin-bottom: 0;
    text-align: center;
    padding: 10px 12px;
  }

  .settings-panel {
    padding-left: 0;
    min-height: 0;
    flex: 1;
    overflow: hidden;
  }

  .settings-section.active {
    max-height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .music-track {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .music-volume,
  .music-progress {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .music-playback {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 460px) {
  .settings-modal-card {
    height: min(88vh, 760px);
  }
  .music-playback {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-modal,
  .settings-modal-card {
    transition: none !important;
  }
  .settings-modal-transition-enter-from .settings-modal-card,
  .settings-modal-transition-leave-to .settings-modal-card {
    transform: none !important;
    opacity: 1 !important;
    filter: none !important;
  }
}
</style>