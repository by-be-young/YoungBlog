<template>
  <div id="floating-controls">
    <button
      v-show="subVisible"
      class="floating-btn sub-btn"
      :title="i18n.t('immersive_read')"
      @click="toggleImmersive"
    >
      <i class="fas fa-expand"></i>
    </button>
    <button
      v-show="subVisible"
      class="floating-btn sub-btn"
      :title="i18n.t('export_action')"
      @click="openExport"
    >
      <i class="fas fa-download"></i>
    </button>
    <button
      v-show="subVisible"
      class="floating-btn sub-btn"
      :title="i18n.t('display_manage')"
      @click="openDisplay"
    >
      <i class="fas fa-eye"></i>
    </button>
    <button
      v-show="subVisible && showBack"
      class="floating-btn sub-btn"
      :title="i18n.t('back_to_previous')"
      @click="back"
    >
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M10 7L5 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 12h8.5a4.5 4.5 0 1 1 0 9H13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <button
      class="floating-btn control-btn"
      :title="i18n.t('settings')"
      @click="toggleSubMenu"
      :aria-expanded="subVisible"
    >
      <i class="fas fa-cog"></i>
    </button>
    <button
      class="floating-btn"
      :title="i18n.t('back_to_top')"
      @click="scrollToTop"
      v-show="showTop"
    >
      <i class="fas fa-arrow-up"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useSettingsStore } from '@/stores/settingsStore'

const emit = defineEmits(['toggle-immersive', 'open-export', 'open-display', 'back'])

const i18n = useI18nStore()
const settings = useSettingsStore()
const subVisible = ref(false)
const showTop = ref(false)
const showBack = ref(false) // 由父组件控制

function toggleSubMenu() {
  subVisible.value = !subVisible.value
}

function toggleImmersive() {
  settings.toggleImmersive()
  emit('toggle-immersive')
}

function openExport() {
  emit('open-export')
}

function openDisplay() {
  emit('open-display')
}

function back() {
  emit('back')
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const onScroll = () => {
  showTop.value = window.scrollY > 300
}

onMounted(() => {
  window.addEventListener('scroll', onScroll)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
#floating-controls {
  position: fixed;
  bottom: 40px;
  right: 32px;
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  z-index: 1000;
  align-items: flex-end;
}

.floating-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color, #55c8ff);
  color: #fff;
  font-size: 1.2rem;
  box-shadow: 0 2px 12px rgba(52, 152, 219, 0.25);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  background: linear-gradient(135deg, #00acff, #48dbbb, #ff6e9b);
}

.floating-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.35);
}

.floating-btn:active {
  transform: scale(0.95);
}

.floating-btn .return-from-ref-icon {
  width: 24px;
  height: 24px;
}

.sub-btn {
  opacity: 0;
  transform: translateX(8px);
  transition: opacity 0.18s ease, transform 0.18s ease, display 0.18s ease;
  background: linear-gradient(135deg, #9ad7ff, #a7f3d0);
  width: 40px;
  height: 40px;
  font-size: 1rem;
}

.sub-btn.is-visible {
  opacity: 1;
  transform: translateX(0);
}

.control-btn {
  background: linear-gradient(135deg, #00acff, #48dbbb, #ff6e9b);
}

#back-to-top {
  background: linear-gradient(135deg, rgba(0, 172, 255, 1), rgba(72, 219, 187, 0.98), rgba(255, 110, 155, 0.98));
  box-shadow: 0 10px 22px rgba(44, 62, 80, 0.18);
}

@media (max-width: 720px) {
  #floating-controls {
    bottom: 24px;
    right: 16px;
  }
  .floating-btn {
    width: 42px;
    height: 42px;
    font-size: 1rem;
  }
  .sub-btn {
    width: 36px;
    height: 36px;
    font-size: 0.85rem;
  }
}
</style>