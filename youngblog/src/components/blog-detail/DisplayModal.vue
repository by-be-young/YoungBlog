<template>
  <div v-if="isOpen" id="displayModal" class="settings-modal display-modal" @click.self="close">
      <div class="settings-modal-card display-modal-card" role="dialog" aria-modal="true" aria-labelledby="display-modal-title">
        <button class="settings-modal-close" @click="close" :aria-label="i18n.t('display_modal_close')"><i class="fas fa-times" aria-hidden="true"></i></button>
        <div class="settings-modal-content display-modal-content">
          <section class="settings-section active display-section">
            <h3 id="display-modal-title">{{ i18n.t('display_modal_title') }}</h3>
            <div class="display-option-group">
              <p class="display-option-label">{{ i18n.t('display_exercise_label') }}</p>
              <div class="display-option-list" role="radiogroup" :aria-label="i18n.t('display_exercise_radiogroup')">
                <label class="display-option-item"><input type="radio" name="display-exercise" value="hide" v-model="exerciseMode"> {{ i18n.t('display_exercise_hide') }}</label>
                <label class="display-option-item"><input type="radio" name="display-exercise" value="collapse" v-model="exerciseMode"> {{ i18n.t('display_exercise_collapse') }}</label>
                <label class="display-option-item"><input type="radio" name="display-exercise" value="practice" v-model="exerciseMode"> {{ i18n.t('display_exercise_practice') }}</label>
                <label class="display-option-item"><input type="radio" name="display-exercise" value="expand" v-model="exerciseMode"> {{ i18n.t('display_exercise_expand') }}</label>
              </div>
            </div>
            <div class="display-option-group">
              <p class="display-option-label">{{ i18n.t('display_code_label') }}</p>
              <div class="display-option-list" role="radiogroup" :aria-label="i18n.t('display_code_radiogroup')">
                <label class="display-option-item"><input type="radio" name="display-code" value="collapse" v-model="codeMode"> {{ i18n.t('display_code_collapse') }}</label>
                <label class="display-option-item"><input type="radio" name="display-code" value="expand" v-model="codeMode"> {{ i18n.t('display_code_expand') }}</label>
              </div>
            </div>
            <div class="display-actions">
              <button class="music-btn display-confirm-btn" @click="apply">
                <i :class="displayIconClass"></i> {{ displayButtonText }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useSettingsStore } from '@/stores/settingsStore'

const i18n = useI18nStore()
const settings = useSettingsStore()
const isOpen = ref(false)
const exerciseMode = ref(settings.exerciseMode)
const codeMode = ref(settings.codeMode)
const displayButtonText = ref(i18n.get('display_apply'))
const displayIconClass = ref('fas fa-check')

function open() {
  isOpen.value = true
  // 同步当前设置值
  exerciseMode.value = settings.exerciseMode
  codeMode.value = settings.codeMode
  // 重置按钮文本与图标
  displayButtonText.value = i18n.get('display_apply')
  displayIconClass.value = 'fas fa-check'
  document.body.classList.add('display-modal-open')
}

function close() {
  isOpen.value = false
  document.body.classList.remove('display-modal-open')
}

function apply() {
  settings.setExerciseMode(exerciseMode.value)
  settings.setCodeMode(codeMode.value)

  // 显示"已应用"反馈
  displayButtonText.value = i18n.get('display_applied')
  displayIconClass.value = 'fas fa-check-circle'

  setTimeout(close, 800)
}

function onKeyDown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})

defineExpose({ open, close })
</script>

<style>
/* ==================================================
   SECTION: 显示弹窗 (Display Modal) 专用样式
   ================================================== */

.settings-modal.display-modal {
  z-index: 1210;
  animation: display-modal-appear 0.28s ease;
}
@keyframes display-modal-appear {
  from { opacity: 0; }
  to { opacity: 1; }
}

.display-modal-card {
  width: min(620px, calc(100vw - 28px));
  max-height: min(82vh, 700px);
}

.display-modal-content {
  min-height: 0;
  display: block;
}

.display-section {
  position: relative;
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.display-section h3 {
  margin: 0 0 14px;
  color: #b57b00;
}

.display-option-group {
  margin-bottom: 16px;
}

.display-option-label {
  margin: 0 0 8px;
  font-weight: 700;
  color: #6f5300;
}

.display-option-list {
  display: grid;
  gap: 8px;
}

.display-option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(181, 123, 0, 0.22);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.34);
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.display-option-item:hover {
  border-color: rgba(181, 123, 0, 0.4);
  background: rgba(255, 255, 255, 0.5);
}

.display-option-item input[type="radio"] {
  accent-color: #b57b00;
}

.display-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}

.display-confirm-btn {
  min-width: 136px;
}

body.display-modal-open {
  overflow: hidden;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .display-modal-card {
    width: min(620px, 100%);
    height: auto;
    max-height: min(86vh, 720px);
  }

  .display-modal-content {
    padding: 14px;
  }

  .display-option-item {
    align-items: flex-start;
  }

  .display-actions {
    justify-content: stretch;
  }

  .display-confirm-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 460px) {
  .display-option-item {
    padding: 10px;
    font-size: 0.95rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .display-option-item {
    transition: none;
  }
}
</style>