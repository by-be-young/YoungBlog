<template>
  <div
    :id="contentId"
    ref="contentEl"
    class="article-content"
    :style="contentStyle"
    v-html="html"
  ></div>
</template>

<script setup>
/**
 * 文章正文渲染容器
 *
 * 负责把 useMarkdown 产出的 HTML 接入各类增强能力（代码块、Mermaid、图片查看器、
 * 习题交互、清单持久化、显示设置）。本版重写要点：
 * - 增强流程统一放进 `runEnhancements`，每步独立 try-catch，一个失败不会中断后续；
 * - HTML 与 articleId 同时变化时重新执行，避免切换到新文章后清单仍绑定旧 id；
 * - 用递增 token 丢弃过期的异步 Mermaid 渲染，防止旧文章的回调写入新 DOM；
 * - resize 监听、定时器、token 在卸载时完整清理。
 */
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { useSettingsStore } from '@/shared/stores/settingsStore'
import { resolveUrl } from '@/shared/utils/url'
import { useMarkdown } from '@/shared/composables/useMarkdown'
import { useAnswer } from '@/shared/composables/useAnswer'
import { useChecklist } from '@/shared/composables/useChecklist'
import { useCodeBlock } from '@/shared/composables/useCodeBlock'
import { useMermaid } from '@/shared/composables/useMermaid'
import { useImageViewer } from '@/shared/composables/useImageViewer'
import { useSettings } from '@/shared/composables/useSettings'

const props = defineProps({
  html: { type: String, default: '' },
  /** 文章 id：用于复选框清单的勾选状态持久化 */
  articleId: { type: [String, Number], default: '' },
  /** 正文容器 id：供目录组件精确定位，避免全局 `.article-content` 查询 */
  contentId: { type: String, default: 'article-content' },
})

const contentEl = ref(null)

const questionIcon = `url("${resolveUrl('/assets/images/task/question.png')}")`
const correctIcon = `url("${resolveUrl('/assets/images/task/correct.png')}")`
const wrongIcon = `url("${resolveUrl('/assets/images/task/wrong.png')}")`

const contentStyle = {
  '--md-question-icon': questionIcon,
  '--md-correct-icon': correctIcon,
  '--md-wrong-icon': wrongIcon,
}

const i18n = useI18nStore()
const settingsStore = useSettingsStore()
const { apply: applySettings } = useSettings()
const { enhance: enhanceCodeBlocks } = useCodeBlock()
const { render: renderMermaid } = useMermaid()
const { init: initImageViewer } = useImageViewer()
const { bindAll: bindAnswers } = useAnswer()
const { enhance: enhanceChecklist } = useChecklist()
const { annotateTaskLabels, markWideMath } = useMarkdown()

let enhanceToken = 0
let wideMathTimer = null

function translateI18n(root) {
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n')
    if (!key) return
    const text = i18n.get(key)
    if (text && text !== key) element.textContent = text
  })

  root.querySelectorAll('.md-task').forEach((task) => {
    task.dataset.taskLabelText = i18n.get('task_label')
  })
}

function safeStep(name, fn) {
  try {
    fn()
  } catch (error) {
    console.warn(`[BlogContent] ${name}:`, error)
  }
}

async function safeAsyncStep(name, fn) {
  try {
    await fn()
  } catch (error) {
    console.warn(`[BlogContent] ${name}:`, error)
  }
}

async function runEnhancements() {
  await nextTick()
  const root = contentEl.value
  if (!root || !props.html) return

  const token = ++enhanceToken

  safeStep('applyI18n', () => translateI18n(root))
  safeStep('enhanceCodeBlocks', () => enhanceCodeBlocks(root))
  await safeAsyncStep('renderMermaid', () => renderMermaid(root))
  if (token !== enhanceToken) return
  safeStep('initImageViewer', () => initImageViewer(root))
  safeStep('bindAnswers', () => bindAnswers(root))
  safeStep('enhanceChecklist', () =>
    enhanceChecklist(root, props.articleId ? String(props.articleId) : ''),
  )
  safeStep('annotateTaskLabels', () => annotateTaskLabels(root))
  safeStep('applySettings', () => applySettings(root))
  safeStep('markWideMath', () => markWideMath(root))
}

watch(
  () => [props.html, props.articleId, props.contentId],
  () => runEnhancements(),
  { flush: 'post' },
)

watch(
  () => i18n.lang,
  () => {
    if (!contentEl.value) return
    safeStep('applyI18n', () => translateI18n(contentEl.value))
  },
)

watch(
  () => [settingsStore.exerciseMode, settingsStore.codeMode],
  () => {
    if (!contentEl.value) return
    safeStep('applySettings', () => applySettings(contentEl.value))
  },
)

function onViewportResize() {
  clearTimeout(wideMathTimer)
  wideMathTimer = setTimeout(() => {
    if (!contentEl.value) return
    safeStep('markWideMath', () => markWideMath(contentEl.value))
  }, 180)
}

onMounted(() => {
  window.addEventListener('resize', onViewportResize)
  runEnhancements()
})

onUnmounted(() => {
  enhanceToken += 1
  window.removeEventListener('resize', onViewportResize)
  clearTimeout(wideMathTimer)
  wideMathTimer = null
})
</script>

<style scoped src="./blog-content.css"></style>
