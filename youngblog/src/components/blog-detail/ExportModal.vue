<template>
  <div id="exportModal" class="settings-modal export-modal" :class="{ 'is-open': isOpen }" @click.self="close">
    <div class="settings-modal-card export-modal-card" role="dialog" aria-modal="true">
      <button class="settings-modal-close" @click="close"><i class="fas fa-times"></i></button>
      <div class="settings-modal-content">
        <h3>{{ i18n.t('export_modal_title') }}</h3>
        <div class="export-option-group">
          <p>{{ i18n.t('export_method_label') }}</p>
          <label><input type="radio" name="export-method" value="download" checked> {{ i18n.t('export_method_download') }}</label>
          <label><input type="radio" name="export-method" value="copy"> {{ i18n.t('export_method_copy') }}</label>
        </div>
        <div class="export-option-group">
          <p>{{ i18n.t('export_exercise_label') }}</p>
          <label><input type="radio" name="exercise-mode" value="exclude"> {{ i18n.t('export_exercise_exclude') }}</label>
          <label><input type="radio" name="exercise-mode" value="normal" checked> {{ i18n.t('export_exercise_normal') }}</label>
          <label><input type="radio" name="exercise-mode" value="source"> {{ i18n.t('export_exercise_source') }}</label>
        </div>
        <button class="music-btn export-confirm-btn" @click="exportContent">
          <i class="fas fa-file-export"></i> {{ i18n.t('export_confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'

const props = defineProps({
  content: String
})
const i18n = useI18nStore()
const isOpen = ref(false)

function open() { isOpen.value = true }
function close() { isOpen.value = false }

function exportContent() {
  // 实现导出逻辑（与原实现相同）
  // 根据选中的 radio 决定导出方式和习题模式
  // 然后调用下载或复制
  // 完成后可显示反馈
  // 此处省略具体实现，可参考原 blog-detail.js 中的逻辑
}

defineExpose({ open, close })
</script>

<style scoped>
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
.export-option-group {
  margin-bottom: 18px;
}
.export-option-group p {
  font-weight: 600;
  margin-bottom: 8px;
  color: #4a5568;
}
.export-option-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
  font-size: 0.96rem;
  color: #2d3748;
}
.export-option-group input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: #55c8ff;
  flex-shrink: 0;
}
.export-confirm-btn {
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
.export-confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 172, 255, 0.3);
}
.export-confirm-btn:active {
  transform: scale(0.98);
}
@media (max-width: 480px) {
  .settings-modal-card {
    padding: 20px 16px;
  }
}
</style>