<!-- SettingsModal.vue - 设置面板（语言 / 音乐），黄绿主题纸面 -->
<template>
  <Teleport to="body">
    <Transition name="settings-modal-transition">
      <div v-if="isOpen" class="settings-modal" @click="handleBackdropClick">
        <div
          ref="cardRef"
          class="settings-modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          tabindex="-1"
        >
          <span class="settings-grip" aria-hidden="true"></span>

          <header class="settings-head">
            <span class="settings-head__badge" aria-hidden="true">
              <i class="fas fa-sliders"></i>
            </span>
            <div class="settings-head__text">
              <p class="settings-head__eyebrow">
                {{ i18n.currentTranslations.settings_tab_language }}
                <span aria-hidden="true">·</span>
                {{ i18n.currentTranslations.settings_tab_music }}
              </p>
              <h2 id="settings-modal-title" class="settings-head__title">
                {{ i18n.currentTranslations.settings_title }}
              </h2>
            </div>
            <button class="settings-modal-close" type="button" @click="closeModal">
              <i class="fas fa-times" aria-hidden="true"></i>
              <span class="visually-hidden">关闭</span>
            </button>
          </header>

          <div class="settings-modal-content">
            <!-- 左侧标签页 -->
            <nav class="settings-sidebar" aria-label="设置分类">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                class="settings-tab"
                :class="{ active: activeTab === tab.key }"
                @click="activeTab = tab.key"
              >
                <span class="settings-tab__label">{{ i18n.currentTranslations[tab.labelKey] }}</span>
              </button>
            </nav>

            <!-- 右侧面板 -->
            <div class="settings-panel">
              <!-- 语言设置 -->
              <section v-show="activeTab === 'language'" class="settings-section active" id="language-section">
                <header class="settings-section__head">
                  <h3>{{ i18n.currentTranslations.settings_language_title }}</h3>
                  <p class="settings-note">{{ i18n.currentTranslations.settings_language_note }}</p>
                </header>

                <div class="language-options">
                  <label
                    v-for="lang in languages"
                    :key="lang.value"
                    class="settings-option"
                    :class="{ 'is-checked': i18n.getLang() === lang.value }"
                  >
                    <input
                      type="radio"
                      name="language"
                      :value="lang.value"
                      :checked="i18n.getLang() === lang.value"
                      @change="i18n.setLang(lang.value)"
                    />
                    <span class="settings-option__dot" aria-hidden="true"></span>
                    <span class="settings-option__label">{{ i18n.currentTranslations[lang.labelKey] }}</span>
                  </label>
                </div>
              </section>

              <!-- 音乐设置 -->
              <section v-show="activeTab === 'music'" class="settings-section active" id="music-section">
                <header class="settings-section__head">
                  <h3>{{ i18n.currentTranslations.settings_music_title }}</h3>
                  <p class="settings-note">{{ i18n.currentTranslations.settings_music_hint }}</p>
                  <p class="music-original-note">
                    <span>{{ i18n.currentTranslations.settings_music_original }}</span>
                  </p>
                </header>

                <div class="music-controls">
                  <div class="settings-field music-track">
                    <label for="music-select">{{ i18n.currentTranslations.settings_track_label }}</label>
                    <span class="settings-select">
                      <select id="music-select" :value="musicStore.currentTrack" @change="onTrackChange">
                        <option value="">{{ i18n.currentTranslations.settings_track_none }}</option>
                        <option value="抹不去的记忆.mp3">{{ i18n.currentTranslations.settings_track_memory }}</option>
                        <option value="澎湃.mp3">{{ i18n.currentTranslations.settings_track_passion }}</option>
                        <option value="谎画.mp3">{{ i18n.currentTranslations.settings_track_liepaint }}</option>
                      </select>
                      <i class="fas fa-chevron-down" aria-hidden="true"></i>
                    </span>
                  </div>

                  <div class="music-playback">
                    <button class="music-btn music-btn--primary" @click="playSelectedTrack">
                      <i :class="musicStore.isPlaying ? 'fas fa-pause' : 'fas fa-play'" aria-hidden="true"></i>
                      <span>{{ musicStore.isPlaying ? i18n.currentTranslations.settings_pause : i18n.currentTranslations.settings_play }}</span>
                    </button>
                    <button class="music-btn" @click="musicStore.stop()">
                      <i class="fas fa-stop" aria-hidden="true"></i>
                      <span>{{ i18n.currentTranslations.settings_stop }}</span>
                    </button>
                  </div>

                  <div class="settings-field music-progress">
                    <div class="settings-field__row">
                      <label for="progress-slider">{{ i18n.currentTranslations.settings_progress_label }}</label>
                      <span id="progress-value">{{ musicStore.formatTime(musicStore.currentTime) }} / {{ musicStore.formatTime(musicStore.duration) }}</span>
                    </div>
                    <input
                      type="range"
                      id="progress-slider"
                      min="0"
                      max="100"
                      step="0.1"
                      :value="musicStore.progress"
                      @input="onSeek"
                    />
                  </div>

                  <div class="settings-field music-volume">
                    <div class="settings-field__row">
                      <label for="volume-slider">{{ i18n.currentTranslations.settings_volume_label }}</label>
                      <span id="volume-value">{{ Math.round(musicStore.volume * 100) }}%</span>
                    </div>
                    <input
                      type="range"
                      id="volume-slider"
                      min="0"
                      max="1"
                      step="0.05"
                      :value="musicStore.volume"
                      @input="onVolumeChange"
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>

          <footer class="settings-foot">
            <p class="settings-foot__hint">{{ i18n.currentTranslations.settings_foot_hint }}</p>
            <button class="settings-foot__done" type="button" @click="closeModal">
              {{ i18n.currentTranslations.settings_done }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { useMusicStore } from '@/shared/stores/musicStore'

const i18n = useI18nStore()
const musicStore = useMusicStore()

const isOpen = ref(false)
const activeTab = ref('language')
const cardRef = ref(null)

const tabs = [
  { key: 'language', labelKey: 'settings_tab_language' },
  { key: 'music', labelKey: 'settings_tab_music' },
]

const languages = [
  { value: 'zh', labelKey: 'settings_language_zh' },
  { value: 'en', labelKey: 'settings_language_en' },
  { value: 'ja', labelKey: 'settings_language_ja' },
]

// ============ 弹窗控制 ============

const openModal = async () => {
  isOpen.value = true
  document.body.classList.add('settings-modal-open')
  await nextTick()
  cardRef.value?.focus({ preventScroll: true })
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
  document.body.classList.remove('settings-modal-open')
})
</script>

<style scoped>
/* ==================================================
   设置面板：与公告同源的纸面 + 黄绿主题
   ================================================== */

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.settings-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: var(--notice-scrim);
  backdrop-filter: blur(6px) saturate(1.05);
  -webkit-backdrop-filter: blur(6px) saturate(1.05);
  transition: opacity 0.26s ease;
}

.settings-modal-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(820px, calc(100vw - 2rem));
  min-height: 24rem;
  max-height: min(86vh, 720px);
  overflow: hidden;
  border-radius: 1.3rem;
  outline: none;
  background:
    radial-gradient(120% 60% at 100% 0%, var(--notice-accent-wash), transparent 70%),
    var(--notice-paper-solid);
  border: 1px solid var(--notice-line);
  box-shadow:
    var(--notice-shadow),
    0 1px 0 var(--notice-inset) inset;
  transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.25, 1), opacity 0.26s ease;
}

.settings-modal-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, var(--notice-gold), var(--notice-accent) 55%, var(--notice-accent-strong));
  z-index: 2;
}

.settings-grip {
  display: none;
}

/* ---------- 顶栏 ---------- */
.settings-head {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1.35rem 1.5rem 1rem;
  border-bottom: 1px solid var(--notice-line);
  background: linear-gradient(125deg, var(--notice-gold-soft) 0%, var(--notice-accent-200) 52%, var(--notice-accent-100) 100%);
}

.settings-head__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 0.85rem;
  background: linear-gradient(150deg, var(--notice-accent) 0%, var(--notice-accent-strong) 100%);
  color: var(--notice-on-accent);
  font-size: 1rem;
  box-shadow:
    0 8px 18px var(--notice-glow),
    0 1px 0 var(--notice-inset) inset;
}

.settings-head__text {
  flex: 1 1 auto;
  min-width: 0;
}

.settings-head__eyebrow {
  margin: 0 0 0.25rem;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', 'PingFang SC', sans-serif);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--notice-accent-deep);
}

.settings-head__title {
  margin: 0;
  font-size: 1.16rem;
  font-weight: 800;
  color: var(--notice-ink);
}

.settings-modal-close {
  flex-shrink: 0;
  width: 2.2rem;
  height: 2.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--notice-line);
  background: var(--notice-paper);
  color: var(--notice-ink-soft);
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.18s ease, color 0.18s ease, background-color 0.18s ease;
}

.settings-modal-close:hover {
  transform: rotate(90deg);
  color: var(--notice-accent-deep);
  background: var(--notice-paper-solid);
}

.settings-modal-close:focus-visible {
  outline: 2px solid var(--notice-accent);
  outline-offset: 2px;
}

/* ---------- 主体 ---------- */
.settings-modal-content {
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;
  padding: 1.15rem 1.5rem 1.05rem;
  gap: 1.25rem;
}

.settings-sidebar {
  width: 10.5rem;
  flex-shrink: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-right: 1.1rem;
  border-right: 1px solid var(--notice-line);
}

/* ---------- 底部 ---------- */
.settings-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
  padding: 0.7rem 1.5rem 0.85rem;
  border-top: 1px solid var(--notice-line);
  background: linear-gradient(180deg, transparent, var(--notice-accent-wash));
}

.settings-foot__hint {
  margin: 0;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', 'PingFang SC', sans-serif);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--notice-ink-faint);
}

.settings-foot__done {
  flex-shrink: 0;
  padding: 0.42rem 1.15rem;
  border-radius: 999px;
  border: 1px solid var(--notice-accent-veil);
  background: var(--notice-paper-solid);
  color: var(--notice-accent-deep);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.settings-foot__done:hover {
  background: var(--notice-accent-200);
  border-color: var(--notice-accent);
  box-shadow: 0 6px 14px var(--notice-glow);
}

.settings-foot__done:focus-visible {
  outline: 2px solid var(--notice-accent-strong);
  outline-offset: 2px;
}

.settings-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.62rem 0.85rem;
  border: 1px solid transparent;
  border-radius: 0.7rem;
  background: transparent;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
  color: var(--notice-ink-soft);
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.settings-tab:hover {
  background: var(--notice-accent-wash);
  color: var(--notice-accent-deep);
}

.settings-tab.active {
  background: var(--notice-accent-200);
  border-color: var(--notice-accent-veil);
  color: var(--notice-accent-deep);
  font-weight: 700;
}

.settings-tab.active::before {
  content: '';
  position: absolute;
  left: -0.15rem;
  top: 0.55rem;
  bottom: 0.55rem;
  width: 0.2rem;
  border-radius: 0.2rem;
  background: var(--notice-accent-strong);
}

.settings-tab:focus-visible {
  outline: 2px solid var(--notice-accent);
  outline-offset: 2px;
}

.settings-panel {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding-left: 0.15rem;
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
  max-height: 100%;
  overflow-y: auto;
  padding: 0 0.25rem 0.5rem 0;
  scrollbar-width: thin;
  scrollbar-color: var(--notice-accent-veil) transparent;
}

.settings-section.active::-webkit-scrollbar {
  width: 6px;
}

.settings-section.active::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--notice-accent-veil);
}

.settings-section__head {
  margin: 0 0 1rem;
}

.settings-section__head h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.55rem;
  font-size: 1.02rem;
  font-weight: 800;
  color: var(--notice-ink);
}

.settings-section__head h3::before {
  content: '';
  width: 0.2rem;
  height: 0.92rem;
  border-radius: 0.2rem;
  background: linear-gradient(180deg, var(--notice-accent), var(--notice-accent-strong));
}

.settings-note {
  margin: 0;
  padding: 0.6rem 0.8rem;
  border-radius: 0.6rem;
  border-left: 2px solid var(--notice-accent-veil);
  background: var(--notice-accent-wash);
  color: var(--notice-ink-soft);
  font-size: 0.8rem;
  line-height: 1.62;
}

/* ---------- 语言选项 ---------- */
.language-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: 0.6rem;
  margin-top: 0.9rem;
}

.settings-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--notice-line);
  border-radius: 0.72rem;
  background: var(--notice-paper);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--notice-ink);
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.settings-option:hover {
  background: var(--notice-paper-solid);
  border-color: var(--notice-accent-veil);
  transform: translateY(-1px);
}

.settings-option.is-checked {
  border-color: var(--notice-accent);
  background: var(--notice-accent-100);
  color: var(--notice-accent-deep);
}

.settings-option input[type='radio'] {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.settings-option__dot {
  position: relative;
  flex-shrink: 0;
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 50%;
  border: 2px solid var(--notice-line-strong);
  background: var(--notice-paper-solid);
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.settings-option.is-checked .settings-option__dot {
  border-color: var(--notice-accent-strong);
  background: var(--notice-accent);
  box-shadow: inset 0 0 0 3px var(--notice-paper-solid);
}

.settings-option:focus-within {
  outline: 2px solid var(--notice-accent);
  outline-offset: 2px;
}

.settings-option__label {
  min-width: 0;
}

/* ---------- 音乐 ---------- */
.music-original-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.6rem 0 0;
  padding: 0.55rem 0.8rem;
  border-radius: 0.6rem;
  border: 1px solid var(--notice-accent-veil);
  background: linear-gradient(135deg, var(--notice-gold-soft), var(--notice-accent-100));
  color: var(--notice-accent-deep);
  font-size: 0.82rem;
  font-weight: 700;
}

.music-controls {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-top: 1rem;
}

.settings-field {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--notice-line);
  border-radius: 0.72rem;
  background: var(--notice-paper);
}

.settings-field label {
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--notice-ink);
}

.settings-field__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.music-track {
  flex-wrap: wrap;
}

.settings-select {
  position: relative;
  flex: 1 1 10rem;
  min-width: 0;
  display: flex;
  align-items: center;
}

.settings-select select {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 0.7rem;
  border-radius: 0.55rem;
  border: 1px solid var(--notice-line-strong);
  background: var(--notice-paper-solid);
  color: var(--notice-ink);
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.settings-select select:hover,
.settings-select select:focus {
  border-color: var(--notice-accent);
  box-shadow: 0 0 0 3px var(--notice-accent-wash);
  outline: none;
}

.settings-select i {
  position: absolute;
  right: 0.7rem;
  font-size: 0.7rem;
  color: var(--notice-accent-strong);
  pointer-events: none;
}

.music-playback {
  display: flex;
  gap: 0.6rem;
}

.music-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.6rem 0.9rem;
  border-radius: 0.65rem;
  border: 1px solid var(--notice-line-strong);
  background: var(--notice-paper-solid);
  color: var(--notice-ink);
  font-family: inherit;
  font-size: 0.87rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}

.music-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--notice-shadow-soft);
  border-color: var(--notice-accent-veil);
}

.music-btn--primary {
  border-color: transparent;
  background: linear-gradient(135deg, var(--notice-accent) 0%, var(--notice-accent-strong) 100%);
  color: var(--notice-on-accent);
  box-shadow: 0 8px 18px var(--notice-glow);
}

.music-btn--primary:hover {
  border-color: transparent;
  box-shadow: 0 12px 24px var(--notice-glow);
}

.music-btn:focus-visible {
  outline: 2px solid var(--notice-accent);
  outline-offset: 2px;
}

.music-progress,
.music-volume {
  flex-direction: column;
  align-items: stretch;
  gap: 0.55rem;
}

.music-progress input[type='range'],
.music-volume input[type='range'] {
  width: 100%;
  height: 0.32rem;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--notice-accent-strong), var(--notice-accent-300));
  outline: none;
  cursor: pointer;
}

.music-progress input[type='range']::-webkit-slider-thumb,
.music-volume input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid var(--notice-paper-solid);
  background: var(--notice-accent-strong);
  box-shadow: 0 2px 8px var(--notice-glow);
  cursor: pointer;
}

.music-progress input[type='range']::-moz-range-thumb,
.music-volume input[type='range']::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid var(--notice-paper-solid);
  background: var(--notice-accent-strong);
  cursor: pointer;
}

.music-progress input[type='range']:focus-visible,
.music-volume input[type='range']:focus-visible {
  box-shadow: 0 0 0 3px var(--notice-accent-wash);
}

#progress-value,
#volume-value {
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.76rem;
  font-variant-numeric: tabular-nums;
  color: var(--notice-accent-deep);
  font-weight: 600;
}

#progress-value {
  text-align: right;
}

/* ---------- 过渡 ---------- */
.settings-modal-transition-enter-from,
.settings-modal-transition-leave-to {
  opacity: 0;
}

.settings-modal-transition-enter-active,
.settings-modal-transition-leave-active {
  transition: opacity 0.26s ease;
}

.settings-modal-transition-enter-from .settings-modal-card,
.settings-modal-transition-leave-to .settings-modal-card {
  opacity: 0;
  transform: translateY(14px) scale(0.965);
}

body.settings-modal-open {
  overflow: hidden;
}

/* ---------- 响应式 ---------- */
@media (max-width: 720px) {
  .settings-modal {
    align-items: flex-end;
    padding: 0;
  }

  .settings-modal-card {
    width: 100%;
    height: auto;
    max-height: min(92vh, 44rem);
    border-radius: 1.35rem 1.35rem 0 0;
    border-bottom: none;
  }

  .settings-grip {
    display: block;
    width: 2.4rem;
    height: 0.28rem;
    margin: 0.55rem auto 0.15rem;
    border-radius: 999px;
    background: var(--notice-line-strong);
    flex-shrink: 0;
  }

  .settings-head {
    padding: 0.75rem 1.1rem 0.85rem;
  }

  .settings-head__badge {
    width: 2.2rem;
    height: 2.2rem;
    font-size: 0.9rem;
  }

  .settings-modal-content {
    flex-direction: column;
    gap: 0.85rem;
    padding: 1rem 1.1rem 1.15rem;
  }

  .settings-sidebar {
    width: 100%;
    flex-direction: row;
    gap: 0.5rem;
    padding: 0 0 0.85rem;
    border-right: none;
    border-bottom: 1px solid var(--notice-line);
  }

  .settings-tab {
    flex: 1;
    justify-content: center;
    padding: 0.55rem 0.6rem;
  }

  .settings-tab.active::before {
    left: 0.55rem;
    right: 0.55rem;
    top: auto;
    bottom: -0.3rem;
    width: auto;
    height: 0.18rem;
  }

  .settings-panel {
    padding-left: 0;
  }

  .settings-foot {
    padding: 0.65rem 1.1rem calc(0.7rem + env(safe-area-inset-bottom, 0rem));
  }

  .settings-section.active {
    padding-right: 0.15rem;
  }

  .language-options {
    grid-template-columns: 1fr;
  }

  .music-track {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-select {
    flex: 1 1 auto;
  }

  .music-playback {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-modal-transition-enter-from .settings-modal-card,
  .settings-modal-transition-leave-to .settings-modal-card {
    transform: translateY(100%) scale(1);
  }
}

@media (max-width: 420px) {
  .music-playback {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-modal,
  .settings-modal-card,
  .settings-modal-transition-enter-active,
  .settings-modal-transition-leave-active {
    transition: none;
  }

  .settings-modal-transition-enter-from .settings-modal-card,
  .settings-modal-transition-leave-to .settings-modal-card {
    transform: none;
    opacity: 1;
  }

  .settings-option,
  .music-btn {
    transition: none;
  }
}
</style>
