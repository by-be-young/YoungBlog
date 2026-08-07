<template>
  <div v-if="isOpen" id="exportModal" class="settings-modal export-modal" @click.self="close">
      <div class="settings-modal-card export-modal-card" role="dialog" aria-modal="true"
        aria-labelledby="export-modal-title">
        <button id="exportModalClose" class="settings-modal-close export-modal-close" :aria-label="i18n.t('export_modal_close')" @click="close">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
        <div class="settings-modal-content export-modal-content">
          <section class="settings-section active export-section" id="export-section">
            <h3 id="export-modal-title" data-i18n="export_modal_title">
              {{ i18n.t('export_modal_title') }}
            </h3>
            <div class="export-option-group">
              <p class="export-option-label" data-i18n="export_method_label">
                {{ i18n.t('export_method_label') }}
              </p>
              <div class="export-option-list" role="radiogroup" :aria-label="i18n.t('export_method_radiogroup')">
                <label class="export-option-item">
                  <input type="radio" name="export-method" value="download" v-model="exportMethod" />
                  <i class="fas fa-download" aria-hidden="true"></i>
                  <span data-i18n="export_method_download">
                    {{ i18n.t('export_method_download') }}
                  </span>
                </label>
                <label class="export-option-item">
                  <input type="radio" name="export-method" value="copy" v-model="exportMethod" />
                  <i class="fas fa-copy" aria-hidden="true"></i>
                  <span data-i18n="export_method_copy">
                    {{ i18n.t('export_method_copy') }}
                  </span>
                </label>
              </div>
            </div>
            <div class="export-option-group">
              <p class="export-option-label" data-i18n="export_exercise_label">
                {{ i18n.t('export_exercise_label') }}
              </p>
              <div class="export-option-list" role="radiogroup" :aria-label="i18n.t('export_exercise_radiogroup')">
                <label class="export-option-item">
                  <input type="radio" name="exercise-mode" value="exclude" v-model="exerciseMode" />
                  <span data-i18n="export_exercise_exclude">
                    {{ i18n.t('export_exercise_exclude') }}
                  </span>
                </label>
                <label class="export-option-item">
                  <input type="radio" name="exercise-mode" value="normal" v-model="exerciseMode" />
                  <span data-i18n="export_exercise_normal">
                    {{ i18n.t('export_exercise_normal') }}
                  </span>
                </label>
                <label class="export-option-item">
                  <input type="radio" name="exercise-mode" value="source" v-model="exerciseMode" />
                  <span data-i18n="export_exercise_source">
                    {{ i18n.t('export_exercise_source') }}
                  </span>
                </label>
              </div>
            </div>
            <div class="export-actions">
              <button id="exportModalConfirm" class="music-btn export-confirm-btn" type="button" @click="handleExport">
                <i :class="exportIconClass" aria-hidden="true"></i>
                <span data-i18n="export_confirm">
                  {{ exportButtonText }}
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'

const props = defineProps({
  markdownContent: {
    type: String,
    default: ''
  },
  mdSourcePath: {
    type: String,
    default: ''
  },
  articleTitle: {
    type: String,
    default: 'post'
  }
})

const emit = defineEmits(['export-done', 'export-error'])

const i18n = useI18nStore()
const isOpen = ref(false)
const exportMethod = ref('download')
const exerciseMode = ref('normal')
const exportButtonText = ref(i18n.get('export_confirm'))
const exportIconClass = ref('fas fa-file-export')

// 导出相关工具函数
function stripFrontMatter(md) {
  if (!md) return md
  const s = md.trimStart()
  if (s.startsWith('---')) {
    const idx = s.indexOf('\n---', 3)
    if (idx !== -1) return s.slice(idx + 4).replace(/^\n+/, '')
  }
  return md
}

function normalizeExerciseMarkers(md) {
  if (!md) return md
  let normalized = md
    .replace(/\[task\]/gi, '例题：')
    .replace(/\[answer\]/gi, '答案：')
    .replace(/\[analysis\]/gi, '解析：')
  normalized = normalized
    .replace(/\[(?:\\|\/)?(?:task|answer|analysis|question|options)\]/gi, '')
  return normalized
}

function removeExerciseBlocks(md) {
  if (!md) return md
  let cleaned = md
    .replace(/\[task\][\s\S]*?\[\\task\]/gi, '')
    .replace(/\[(answer|analysis|question|options)\][\s\S]*?\[\\\1\]/gi, '')
    .replace(/^\s*\[(?:\\|\/)?(?:task|answer|analysis|question|options)\]\s*$/gim, '')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  return cleaned.trim()
}

function getExportMarkdownContent(mode) {
  const raw = props.markdownContent || ''
  if (!raw) return ''

  if (mode === 'source') {
    return raw
  }

  const clean = stripFrontMatter(raw)

  if (mode === 'exclude') {
    return normalizeExerciseMarkers(removeExerciseBlocks(clean))
  }

  return normalizeExerciseMarkers(clean)
}

function getSourceFilename(titleFallback) {
  try {
    const sourcePath = (props.mdSourcePath || '').toString().replace(/\\/g, '/')
    const sourceName = sourcePath.split('/').pop()
    if (sourceName && /\.md$/i.test(sourceName)) return sourceName
  } catch (_) {
    // ignore
  }
  return titleFallback + '.md'
}

function downloadMarkdown(content, mode) {
  try {
    const clean = String(content || '')
    if (!clean.trim()) return false
    const title = props.articleTitle || 'post'
    const safeTitle = title.replace(/[^a-z0-9\u4e00-\u9fa5_-]/ig, '_') || 'post'
    const filename = mode === 'source' ? getSourceFilename(safeTitle) : (safeTitle + '.md')
    const blob = new Blob([clean], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return true
  } catch (e) {
    console.error('export markdown failed', e)
    return false
  }
}

async function copyMarkdown(content) {
  const clean = String(content || '')
  if (!clean) return false
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(clean)
    return true
  }

  const ta = document.createElement('textarea')
  ta.value = clean
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  ta.style.pointerEvents = 'none'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } finally {
    ta.remove()
  }
  return copied
}

function showActionResult(message, isSuccess = true) {
  exportButtonText.value = message
  exportIconClass.value = isSuccess ? 'fas fa-check' : 'fas fa-circle-exclamation'
  setTimeout(() => {
    exportButtonText.value = i18n.get('export_confirm')
    exportIconClass.value = 'fas fa-file-export'
  }, 1200)
}

async function handleExport() {
  const content = getExportMarkdownContent(exerciseMode.value)

  if (!content || !String(content).trim()) {
    const emptyText = i18n.get('export_no_content')
    showActionResult(emptyText, false)
    emit('export-error', new Error('No content to export'))
    return
  }

  if (exportMethod.value === 'download') {
    const ok = downloadMarkdown(content, exerciseMode.value)
    if (ok) {
      const doneText = i18n.get('export_done_download')
      showActionResult(doneText, true)
      emit('export-done', { method: 'download', exerciseMode: exerciseMode.value })
      setTimeout(close, 220)
    }
    return
  }

  let copied = false
  let msg = ''
  try {
    copied = await copyMarkdown(content)
    msg = copied
      ? (i18n.get('export_done_copy'))
      : (i18n.get('export_copy_failed'))
  } catch (err) {
    console.error('copy markdown failed', err)
    copied = false
    msg = i18n.get('export_copy_failed')
  }
  showActionResult(msg, copied)
  if (copied) {
    emit('export-done', { method: 'copy', exerciseMode: exerciseMode.value })
    setTimeout(close, 220)
  }
}

function open() {
  isOpen.value = true
  // 重置按钮文本与图标
  exportButtonText.value = i18n.get('export_confirm')
  exportIconClass.value = 'fas fa-file-export'
  document.body.classList.add('export-modal-open')
}

function close() {
  isOpen.value = false
  document.body.classList.remove('export-modal-open')
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
   SECTION: 导出弹窗 (Export Modal) 专用样式
   ================================================== */

.settings-modal.export-modal {
  z-index: 1210;
  animation: export-modal-appear 0.28s ease;
}
@keyframes export-modal-appear {
  from { opacity: 0; }
  to { opacity: 1; }
}

.export-modal-card {
  width: min(620px, calc(100vw - 28px));
  max-height: min(82vh, 700px);
}

.export-modal-content {
  min-height: 0;
  display: block;
}

.export-section {
  position: relative;
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.export-section h3 {
  margin: 0 0 14px;
  color: #b57b00;
}

.export-option-group {
  margin-bottom: 16px;
}

.export-option-label {
  margin: 0 0 8px;
  font-weight: 700;
  color: #6f5300;
}

.export-option-list {
  display: grid;
  gap: 8px;
}

.export-option-item {
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

.export-option-item:hover {
  border-color: rgba(181, 123, 0, 0.4);
  background: rgba(255, 255, 255, 0.5);
}

.export-option-item input[type="radio"] {
  accent-color: #b57b00;
}

.export-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}

.export-confirm-btn {
  min-width: 136px;
}

body.export-modal-open {
  overflow: hidden;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .export-modal-card {
    width: min(620px, 100%);
    height: auto;
    max-height: min(86vh, 720px);
  }

  .export-modal-content {
    padding: 14px;
  }

  .export-option-item {
    align-items: flex-start;
  }

  .export-actions {
    justify-content: stretch;
  }

  .export-confirm-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 460px) {
  .export-option-item {
    padding: 10px;
    font-size: 0.95rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .export-option-item {
    transition: none;
  }
}
</style>
