<template>
  <div id="displayModal" class="settings-modal display-modal" :class="{ 'is-open': isOpen }" @click.self="close">
    <div class="settings-modal-card display-modal-card" role="dialog" aria-modal="true">
      <button class="settings-modal-close" @click="close"><i class="fas fa-times"></i></button>
      <div class="settings-modal-content">
        <h3>{{ i18n.t('display_modal_title') }}</h3>
        <div class="display-option-group">
          <p>{{ i18n.t('display_exercise_label') }}</p>
          <label><input type="radio" name="display-exercise" value="hide"> {{ i18n.t('display_exercise_hide') }}</label>
          <label><input type="radio" name="display-exercise" value="collapse" checked> {{ i18n.t('display_exercise_collapse') }}</label>
          <label><input type="radio" name="display-exercise" value="practice"> {{ i18n.t('display_exercise_practice') }}</label>
          <label><input type="radio" name="display-exercise" value="expand"> {{ i18n.t('display_exercise_expand') }}</label>
        </div>
        <div class="display-option-group">
          <p>{{ i18n.t('display_code_label') }}</p>
          <label><input type="radio" name="display-code" value="collapse"> {{ i18n.t('display_code_collapse') }}</label>
          <label><input type="radio" name="display-code" value="expand" checked> {{ i18n.t('display_code_expand') }}</label>
        </div>
        <button class="music-btn display-confirm-btn" @click="apply">
          <i class="fas fa-check"></i> {{ i18n.t('display_apply') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useSettingsStore } from '@/stores/settingsStore'

const i18n = useI18nStore()
const settings = useSettingsStore()
const isOpen = ref(false)

function open() { isOpen.value = true }
function close() { isOpen.value = false }

function apply() {
  const exercise = document.querySelector('input[name="display-exercise"]:checked')
  const code = document.querySelector('input[name="display-code"]:checked')
  if (exercise) settings.setExerciseMode(exercise.value)
  if (code) settings.setCodeMode(code.value)
  // 触发重新应用设置（通过事件或直接调用 useSettings().apply）
  document.dispatchEvent(new CustomEvent('settings:applied'))
  close()
}

defineExpose({ open, close })
</script>

<style scoped>
/* 复用 export-modal 的样式，增加自己的微调 */
.settings-modal {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.26s ease, visibility 0.26s ease;
}
.settings-modal.is-open {
  opacity: 1;
  visibility: visible;
}
.settings-modal-card {
  background: #fff;
  border-radius: 16px;
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px 32px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  position: relative;
  transform: scale(0.96);
  transition: transform 0.26s ease;
}
.settings-modal.is-open .settings-modal-card {
  transform: scale(1);
}
.settings-modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  color: #888;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}
.settings-modal-close:hover {
  background: rgba(0, 0, 0, 0.06);
}
.settings-modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.4rem;
  color: #2b3440;
}
.display-option-group {
  margin-bottom: 18px;
}
.display-option-group p {
  font-weight: 600;
  margin-bottom: 8px;
  color: #4a5568;
}
.display-option-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
  font-size: 0.96rem;
  color: #2d3748;
}
.display-option-group input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: #55c8ff;
  flex-shrink: 0;
}
.display-confirm-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #00acff, #48dbbb);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.display-confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 172, 255, 0.3);
}
.display-confirm-btn:active {
  transform: scale(0.98);
}
@media (max-width: 480px) {
  .settings-modal-card {
    padding: 20px 16px;
  }
}
</style>