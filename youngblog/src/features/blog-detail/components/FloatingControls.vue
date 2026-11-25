<template>
  <div
    id="floating-controls"
    ref="rootEl"
    class="floating-controls"
    :class="{ 'is-open': mobileOpen }"
    role="region"
    :aria-label="i18n.get('settings')"
  >
    <button
      class="floating-btn mobile-fab-toggle"
      type="button"
      :aria-expanded="mobileOpen ? 'true' : 'false'"
      :aria-label="i18n.get('settings')"
      @click.stop="toggleMobile"
    >
      <i class="fas fa-sliders" aria-hidden="true"></i>
    </button>

    <button
      v-show="showTop"
      class="floating-btn back-to-top-btn"
      type="button"
      :title="i18n.get('back_to_top')"
      :aria-label="i18n.get('back_to_top')"
      @click="scrollToTop"
    >
      <i class="fas fa-arrow-up" aria-hidden="true"></i>
    </button>

    <button
      class="floating-btn control-btn"
      type="button"
      :title="i18n.get('settings')"
      :aria-label="i18n.get('settings')"
      :aria-expanded="subVisible ? 'true' : 'false'"
      aria-haspopup="true"
      aria-controls="sub-btns-wrapper"
      @click.stop="toggleSubMenu"
    >
      <i class="fas fa-cog" aria-hidden="true"></i>
    </button>

    <div
      id="sub-btns-wrapper"
      class="sub-btns-wrapper"
      :class="{ 'is-visible': subVisible }"
      role="group"
      :aria-label="i18n.get('settings')"
    >
      <button
        class="floating-btn sub-btn"
        type="button"
        :title="i18n.get('immersive_read')"
        :aria-label="i18n.get('immersive_read')"
        @click="handleImmersive"
      >
        <i class="fas fa-expand" aria-hidden="true"></i>
      </button>

      <button
        class="floating-btn sub-btn"
        type="button"
        :title="i18n.get('export_action')"
        :aria-label="i18n.get('export_action')"
        @click="handleExport"
      >
        <i class="fas fa-download" aria-hidden="true"></i>
      </button>

      <button
        class="floating-btn sub-btn"
        type="button"
        :title="i18n.get('display_manage')"
        :aria-label="i18n.get('display_manage')"
        @click="handleDisplay"
      >
        <i class="fas fa-eye" aria-hidden="true"></i>
      </button>

      <button
        v-if="showBack"
        class="floating-btn sub-btn"
        type="button"
        :title="i18n.get('back_to_previous')"
        :aria-label="i18n.get('back_to_previous')"
        @click="handleBack"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path
            d="M10 7L5 12l5 5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M6 12h8.5a4.5 4.5 0 1 1 0 9H13"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * 详情页右下方阅读工具组
 *
 * - 桌面端：设置球常驻，子菜单向上展开，回到顶部球按滚动距离出现；
 * - 移动端（≤900px）：默认只露一个总开关，点开后展示目录/回到顶部/设置/子菜单；
 * - 组件挂载后通过 `ready` 事件把根元素交给 TOC，避免 TOC 用 document.querySelector
 *   在兄弟组件尚未挂载时拿到 null；
 * - 点击外部与 Escape 都会收起子菜单，卸载时移除全部监听。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18nStore } from '@/shared/stores/i18nStore'

defineProps({
  showBack: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-immersive', 'open-export', 'open-display', 'back', 'ready'])

const i18n = useI18nStore()
const rootEl = ref(null)
const subVisible = ref(false)
const mobileOpen = ref(false)
const showTop = ref(false)

function closeSubMenu() {
  subVisible.value = false
  document.removeEventListener('click', handleClickOutside)
}

function toggleSubMenu() {
  if (subVisible.value) {
    closeSubMenu()
    return
  }
  subVisible.value = true
  // 延后注册，避免本次点击冒泡立刻触发 outside 关闭
  setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
}

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
  if (!mobileOpen.value) closeSubMenu()
}

function handleClickOutside(event) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (rootEl.value?.contains(target)) return
  closeSubMenu()
  mobileOpen.value = false
}

function handleImmersive() {
  emit('toggle-immersive')
  closeSubMenu()
  mobileOpen.value = false
}

function handleExport() {
  emit('open-export')
  closeSubMenu()
  mobileOpen.value = false
}

function handleDisplay() {
  emit('open-display')
  closeSubMenu()
  mobileOpen.value = false
}

function handleBack() {
  emit('back')
  closeSubMenu()
  mobileOpen.value = false
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onScroll() {
  showTop.value = window.scrollY > 300
}

function onKeyDown(event) {
  if (event.key === 'Escape') closeSubMenu()
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('keydown', onKeyDown)
  onScroll()
  emit('ready', rootEl.value)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
#floating-controls {
  --fab-size: 48px;
  --fab-icon-size: 1.2rem;
  --fab-gap: 10px;
  --fab-step: calc(var(--fab-size) + var(--fab-gap));
  --fab-reserved: calc(var(--fab-step) + var(--fab-step) + var(--fab-step) + 12px);
  --fab-offset-bottom: calc(40px + env(safe-area-inset-bottom, 0px));
  --fab-offset-right: calc(32px + env(safe-area-inset-right, 0px));

  position: fixed;
  bottom: var(--fab-offset-bottom);
  right: var(--fab-offset-right);
  display: flex;
  flex-direction: column-reverse;
  gap: var(--fab-gap);
  z-index: 1000;
  align-items: flex-end;
}

.floating-btn {
  width: var(--fab-size);
  height: var(--fab-size);
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #00acff, #48dbbb, #ff6e9b);
  color: #fff;
  font-size: var(--fab-icon-size);
  box-shadow: 0 2px 12px rgba(52, 152, 219, 0.25);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.floating-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.35);
}

.floating-btn:active {
  transform: scale(0.95);
}

.floating-btn:focus-visible {
  outline: 3px solid rgba(0, 172, 255, 0.9);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sub-btns-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--fab-gap);
  align-items: flex-end;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.sub-btns-wrapper.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.sub-btn {
  opacity: 0;
  transform: translateX(8px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.sub-btns-wrapper.is-visible .sub-btn {
  opacity: 1;
  transform: translateX(0);
}

.sub-btn:nth-child(1) {
  transition-delay: 0.04s;
}

.sub-btn:nth-child(2) {
  transition-delay: 0.08s;
}

.sub-btn:nth-child(3) {
  transition-delay: 0.12s;
}

.sub-btn:nth-child(4) {
  transition-delay: 0.16s;
}

@media (hover: none), (pointer: coarse) {
  .sub-btn {
    border: 1px solid rgba(255, 255, 255, 0.55);
    box-shadow: 0 4px 16px rgba(52, 152, 219, 0.3);
  }
}

.mobile-fab-toggle {
  display: none;
}

@media (max-width: 900px) {
  #floating-controls {
    flex-direction: column-reverse;
    gap: 8px;
  }

  #floating-controls .mobile-fab-toggle {
    display: inline-flex;
  }

  #floating-controls:not(.is-open) > .back-to-top-btn,
  #floating-controls:not(.is-open) > .control-btn,
  #floating-controls:not(.is-open) > .sub-btns-wrapper {
    display: none !important;
  }

  :global(#floating-controls:not(.is-open) > .toc-fab) {
    display: none !important;
  }

  #floating-controls.is-open > .toc-fab {
    display: inline-flex !important;
  }
}

@media (max-width: 480px) {
  #floating-controls {
    --fab-size: 44px;
    --fab-icon-size: 1rem;
    --fab-gap: 8px;
    --fab-offset-bottom: calc(18px + env(safe-area-inset-bottom, 0px));
    --fab-offset-right: calc(14px + env(safe-area-inset-right, 0px));
  }
}

@media (min-width: 481px) and (max-width: 900px) {
  #floating-controls {
    --fab-size: 46px;
    --fab-offset-bottom: calc(28px + env(safe-area-inset-bottom, 0px));
    --fab-offset-right: calc(20px + env(safe-area-inset-right, 0px));
  }
}

@media (min-width: 901px) and (max-width: 1100px) {
  #floating-controls {
    --fab-size: 48px;
    --fab-offset-bottom: calc(36px + env(safe-area-inset-bottom, 0px));
    --fab-offset-right: calc(24px + env(safe-area-inset-right, 0px));
  }
}

@media (max-width: 900px) {
  .sub-btns-wrapper {
    max-height: calc(100vh - var(--fab-offset-bottom) - var(--fab-reserved));
    max-height: calc(100dvh - var(--fab-offset-bottom) - var(--fab-reserved));
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px;
    margin-right: -6px;
    scrollbar-width: none;
  }

  .sub-btns-wrapper::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .floating-btn,
  .sub-btn,
  .sub-btns-wrapper {
    transition: none;
  }
}
</style>
