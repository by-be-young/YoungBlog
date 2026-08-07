<template>
  <div class="article-content" ref="contentEl" v-html="html"></div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { resolveUrl } from '@/utils/url'
import { useMarkdown } from '@/composables/useMarkdown'
import { useAnswer } from '@/composables/useAnswer'
import { useCodeBlock } from '@/composables/useCodeBlock'
import { useMermaid } from '@/composables/useMermaid'
import { useImageViewer } from '@/composables/useImageViewer'
import { useSettings } from '@/composables/useSettings'

const props = defineProps({
  html: String
})

const contentEl = ref(null)

const questionIcon = `url("${resolveUrl('/assets/images/task/question.png')}")`
const correctIcon = `url("${resolveUrl('/assets/images/task/correct.png')}")`
const wrongIcon = `url("${resolveUrl('/assets/images/task/wrong.png')}")`

const i18n = useI18nStore()
const { enhance: enhanceCodeBlocks } = useCodeBlock()
const { render: renderMermaid } = useMermaid()
const { init: initImageViewer } = useImageViewer()
const { bindAll: bindAnswers } = useAnswer()
const { apply: applySettings } = useSettings()

// 监听语言变化，立即重新翻译文章内的 data-i18n 元素
watch(() => i18n.lang, () => {
  if (contentEl.value) {
    try { applyI18n(contentEl.value) } catch (e) { console.warn('[ArticleContent] applyI18n:', e) }
  }
})

// 监听设置变化，自动重新应用到文章内容
const settingsStore = useSettingsStore()
watch(() => [settingsStore.exerciseMode, settingsStore.codeMode], () => {
  if (contentEl.value) {
    try { applySettings(contentEl.value) } catch (e) { console.warn('[ArticleContent] applySettings:', e) }
  }
})
const { annotateTaskLabels } = useMarkdown()

// 翻译 data-i18n 元素 + 刷新 task 标签文字
function applyI18n(root) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    if (key) {
      const t = i18n.get(key)
      if (t && t !== key) el.textContent = t
    }
  })
  root.querySelectorAll('.md-task').forEach(task => {
    task.dataset.taskLabelText = i18n.get('task_label')
  })
}

watch(() => props.html, async (newHtml) => {
  await nextTick()
  if (!contentEl.value || !newHtml) return
  const el = contentEl.value

  // 后处理（各自 try-catch 防止一个失败阻塞后续）
  try { applyI18n(el) } catch (e) { console.warn('[ArticleContent] applyI18n:', e) }
  try { enhanceCodeBlocks(el) } catch (e) { console.warn('[ArticleContent] enhanceCodeBlocks:', e) }
  try { await renderMermaid(el) } catch (e) { console.warn('[ArticleContent] renderMermaid:', e) }
  try { initImageViewer(el) } catch (e) { console.warn('[ArticleContent] initImageViewer:', e) }
  try { bindAnswers(el) } catch (e) { console.warn('[ArticleContent] bindAnswers:', e) }
  try { annotateTaskLabels(el) } catch (e) { console.warn('[ArticleContent] annotateTaskLabels:', e) }
  try { applySettings(el) } catch (e) { console.warn('[ArticleContent] applySettings:', e) }
}, { immediate: true, flush: 'post' })
</script>

<style scoped>

/* ===== 正文标题 ★ 星标（大、黄色、顺时针旋转） ===== */
.article-content :deep(.heading-star-marker) {
  display: inline-block;
  font-size: 2.4rem;
  color: #f3b51a;
  margin-left: 8px;
  vertical-align: middle;
  line-height: 1;
  animation: heading-star-spin 8s linear infinite;
  filter: drop-shadow(0 0 8px rgba(243, 181, 26, 0.6));
}
@keyframes heading-star-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.article-content :deep(h1) {
  color: #2d8cf0;
  font-size: 2.3rem;
  font-weight: 800;
  margin: 1.4em 0 0.8em 0;
  border-left: 6px solid #2d8cf0;
  padding: 10px 14px;
  background: linear-gradient(90deg, rgba(234, 246, 255, 0.95) 0%, rgba(234, 246, 255, 0.6) 60%);
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(154, 217, 255, 0.28) 0%, rgba(255, 182, 201, 0.10) 60%);
  border-left-color: #00acff;
  color: #00acff;
}

.article-content :deep(h2) {
  color: #19be6b;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 1.2em 0 0.75em 0;
  border-left: 5px solid #19be6b;
  padding: 9px 12px;
  background: linear-gradient(90deg, rgba(234, 255, 243, 0.95) 0%, rgba(234, 255, 243, 0.6) 60%);
  border-radius: 6px;
  position: relative;
  color: #13d18a;
  border-left-color: #13d18a;
  background: linear-gradient(90deg, rgba(167, 243, 208, 0.22) 0%, rgba(255, 210, 166, 0.06) 60%);
}

.article-content :deep(h2.is-toc-active::before) {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(25, 190, 107, 0.06);
  border-radius: 6px;
  z-index: -1;
}

.article-content :deep(h3) {
  color: var(--h3-heading-color, #ff8f9e);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 1.2em 0 0.8em 0;
  border-left: 4px solid var(--h3-heading-color);
  padding: 8px 12px;
  background: linear-gradient(90deg, rgba(255, 251, 230, 0.9) 0%, rgba(255, 251, 230, 0.6) 60%);
  display: block;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
  position: static;
  background: linear-gradient(90deg, rgba(255, 210, 166, 0.16) 0%, rgba(255, 182, 201, 0.06) 60%);
}

.article-content :deep(h4) {
  color: #9b0b74;
  font-size: 1.08rem;
  font-weight: 700;
  margin: 1em 0 0.8em 0;
  background: #f3d7ff;
  border: 2px solid #9b0b74;
  border-radius: 8px;
  padding: 10px 12px;
  color: #ff7696;
  background: rgba(255, 182, 201, 0.12);
  border: 2px solid rgba(255, 182, 201, 0.26);
}

.article-content :deep(p) {
  color: #222;
  margin: 0.7em 0;
  line-height: 2.2;
  font-family: 'Times New Roman', 'KaiTi', '楷体', STKaiti, serif;
  margin: 1em 0 1em 0;
  font-size: 1.18rem;
  color: #444;
  line-height: 2.1;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin: 0.8em 0;
}

.article-content :deep(ul) {
  padding-left: 0;
  list-style-position: inside;
}

.article-content :deep(ol) {
  padding-left: 1.6em;
  list-style-position: outside;
  list-style-type: decimal;
}

.article-content :deep(ul li),
.article-content :deep(ol li) {
  margin-bottom: 0.35em;
  font-family: 'Times New Roman', 'KaiTi', '楷体', STKaiti, serif;
  font-size: 1.18rem;
  line-height: 2.1;
  color: var(--detail-text, #2b3440);
}

.article-content :deep(ul li::marker),
.article-content :deep(ol li::marker) {
  color: var(--macaron-marker-color, #9ad7ff);
  font-family: inherit;
}

.article-content :deep(ul li::marker) {
  content: '● ';
}

.article-content :deep(li > p) {
  display: inline;
  margin: 0;
  padding: 0;
}

.article-content :deep(li > p + p) {
  display: block;
  margin-top: 0.45em;
}

.article-content :deep(blockquote) {
  border-left: 4px solid #2d8cf0;
  background: #f4f8fb;
  color: #666;
  padding: 0.7em 1.2em;
  margin: 1.2em 0;
  font-style: normal;
  font-size: 1.05rem;
  line-height: 2.1;
  position: relative;
  border: none;
  background: #fffbe6;
  color: var(--detail-text, #2b3440);
  padding: 14px 18px;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.03) inset;
  overflow: visible;
}

.article-content :deep(blockquote p) {
  margin: 0.5em 0;
  text-indent: 2em;
}
.article-content :deep(blockquote p:first-child) { margin-top: 0; }
.article-content :deep(blockquote p:last-child) { margin-bottom: 0; }

.article-content :deep(blockquote:before),
.article-content :deep(blockquote:after) {
  content: '';
  position: absolute;
  width: 21px;
  height: 21px;
  background: transparent;
  border-radius: 2px;
  opacity: 0.9;
  transform: none;
  border-color: rgba(196, 154, 72, 0.82);
  border-style: solid;
}
.article-content :deep(blockquote:before) {
  left: 12px;
  top: 10px;
  bottom: auto;
  border-width: 3.8px 0 0 3.8px;
}
.article-content :deep(blockquote:after) {
  left: auto;
  right: 12px;
  top: auto;
  bottom: 10px;
  border-width: 0 3.8px 3.8px 0;
}

.article-content :deep(a) {
  color: #ff6e9b;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.18s ease, background 0.18s ease;
}
.article-content :deep(a:hover) {
  color: #00acff;
  background: rgba(154, 217, 255, 0.08);
}

.article-content :deep(table) {
  width: fit-content;
  min-width: 0;
  max-width: 100%;
  table-layout: auto;
  border-collapse: collapse;
  margin: 18px auto;
  display: block;
  overflow: hidden;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: transparent;
  border-radius: 12px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset, 0 8px 20px rgba(44, 62, 80, 0.06);
  border: 1px solid rgba(155, 135, 207, 0.18);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.75) inset, 0 10px 24px rgba(88, 76, 118, 0.08);
}

.article-content :deep(th),
.article-content :deep(td) {
  border: none;
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  white-space: normal;
  word-break: break-word;
  color: #222;
  font-size: 1.02rem;
  font-family: 'Segoe UI', 'Times New Roman', 'KaiTi', '楷体', STKaiti, serif;
}

.article-content :deep(thead th) {
  background: #9B87CF;
  color: #ffffff;
  font-weight: 700;
}

.article-content :deep(thead th:first-child),
.article-content :deep(thead td:first-child) {
  border-top-left-radius: 12px;
}
.article-content :deep(thead th:last-child),
.article-content :deep(thead td:last-child) {
  border-top-right-radius: 12px;
}
.article-content :deep(tbody tr:last-child td:first-child) {
  border-bottom-left-radius: 12px;
}
.article-content :deep(tbody tr:last-child td:last-child) {
  border-bottom-right-radius: 12px;
}
.article-content :deep(tbody tr:nth-child(odd)) {
  background: #ffffff;
}
.article-content :deep(tbody tr:nth-child(even)) {
  background: #F4EEFF;
}

.article-content :deep(img) {
  display: block;
  box-sizing: border-box;
  max-width: min(100%, 820px);
  max-height: 400px;
  height: auto;
  margin: 18px auto;
  padding: 0;
  border: 14px solid transparent;
  border-radius: 14px;
  background:
    repeating-linear-gradient(45deg,
      #d6b18a 0px, #d6b18a 10px,
      #c79a6b 10px, #c79a6b 20px,
      #b98355 20px, #b98355 28px) border-box;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.60),
    0 10px 22px rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  box-shadow: 0 10px 22px rgba(44, 62, 80, 0.06), 0 0 0 6px rgba(255, 255, 255, 0.6) inset;
}

.article-content :deep(img.md-zoomable-image) {
  cursor: zoom-in;
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.article-content :deep(img.md-zoomable-image:hover) {
  transform: translateY(-1px);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.62),
    0 14px 30px rgba(0, 0, 0, 0.16);
}

/* 代码块样式（由 useCodeBlock 生成） */
.article-content :deep(pre) {
  background: rgba(167, 243, 208, 0.22);
  color: inherit;
  border: 1px solid rgba(24, 49, 58, 0.06);
  border-radius: 10px;
  padding: 18px 16px;
  margin: 18px 0;
  overflow-x: auto;
  font-size: 1.02rem;
  box-shadow:
    inset 0 2px 6px rgba(24, 49, 58, 0.10),
    inset 0 -1px 0 rgba(255, 255, 255, 0.55);
}

.article-content :deep(.codeblock) {
  border: 1px solid rgba(24, 49, 58, 0.10);
  border-radius: 10px;
  max-width: 100%;
  margin: 18px 0;
  box-shadow:
    inset 0 2px 8px rgba(24, 49, 58, 0.14),
    inset 0 -1px 0 rgba(255, 255, 255, 0.40),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.article-content :deep(.codeblock__header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: #d8fff7fa;
  color: rgba(20, 25, 35, 0.92);
  border-bottom: 1px solid rgba(0, 0, 0, 0.10);
  box-shadow:
    inset 0 1px 4px rgba(24, 49, 58, 0.10),
    inset 0 -1px 0 rgba(255, 255, 255, 0.42);
  background: linear-gradient(90deg,
      rgba(255, 182, 201, 0.96) 0%,
      rgba(255, 210, 166, 0.94) 33%,
      rgba(167, 243, 208, 0.94) 66%,
      rgba(154, 215, 255, 0.94) 100%);
  color: #18313a;
  border-bottom: 1px solid rgba(24, 49, 58, 0.06);
  border-left: 1px solid rgba(24, 49, 58, 0.10);
  border-right: 1px solid rgba(24, 49, 58, 0.10);
  border-radius: 10px 10px 0 0;
  box-shadow:
    inset 0 3px 8px rgba(24, 49, 58, 0.20),
    inset 0 -2px 4px rgba(255, 255, 255, 0.50),
    inset 1px 0 0 rgba(255, 255, 255, 0.22),
    inset -1px 0 0 rgba(24, 49, 58, 0.10);
}

.article-content :deep(.codeblock__lang) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.88rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.95;
  color: #18313a;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.article-content :deep(.codeblock__actions) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.article-content :deep(.codeblock__btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.18);
  background: rgba(255, 255, 255, 0.85);
  color: rgba(20, 25, 35, 0.92);
  cursor: pointer;
  transition: var(--transition, 0.2s);
  background: rgba(255, 255, 255, 0.9);
  color: #18313a;
  border-color: rgba(24, 49, 58, 0.08);
}
.article-content :deep(.codeblock__btn:hover) {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.28);
}
.article-content :deep(.codeblock__btn:active) {
  transform: translateY(1px);
}
.article-content :deep(.codeblock__btn.is-copied) {
  border-color: rgba(46, 204, 113, 0.85);
  background: rgba(46, 204, 113, 0.18);
}

.article-content :deep(.codeblock__body) {
  padding: 0;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  transition: height 280ms ease, opacity 220ms ease;
}

.article-content :deep(.codeblock__content) {
  display: flex;
  align-items: stretch;
  max-width: 100%;
  background: rgba(167, 243, 208, 0.22);
  border-radius: 0 0 10px 10px;
  padding: 12px 12px 14px 12px;
  box-shadow:
    inset 0 1px 4px rgba(24, 49, 58, 0.08),
    inset 0 -1px 0 rgba(255, 255, 255, 0.40);
}

.article-content :deep(.codeblock__gutter) {
  flex: 0 0 auto;
  margin: 0;
  padding: 18px 10px 18px 12px;
  color: rgba(24, 49, 58, 0.4);
  text-align: right;
  user-select: none;
  background: transparent;
  border-right: 1px solid rgba(24, 49, 58, 0.06);
  font-size: 1.02rem;
  line-height: 1.7;
  overflow: visible;
}

.article-content :deep(.codeblock__pre) {
  flex: 1 1 auto;
  min-width: 0;
}

.article-content :deep(.codeblock__body pre) {
  margin: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  line-height: 1.7;
  font-family: 'Comic Mono', 'Comic Sans MS', 'Comic Neue', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.article-content :deep(:not(pre) > code) {
  font-size: 1.02rem;
  border-radius: 0;
  background: none;
  color: #563a00;
  border: none;
  padding: 0;
  box-shadow: none;
  font-family: 'Comic Mono', 'Comic Sans MS', 'Comic Neue', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.article-content :deep(pre code) {
  background: transparent;
  color: inherit;
  border: none;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  font-family: 'Comic Mono', 'Comic Sans MS', 'Comic Neue', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

@media (max-width: 720px) {
  .article-content :deep(.codeblock__btn) {
    width: 30px;
    min-width: 30px;
    padding: 0;
    gap: 0;
  }
  .article-content :deep(.codeblock__btn .code-copy-label),
  .article-content :deep(.codeblock__btn .code-toggle-label) {
    display: none;
  }
}

/* Mermaid 样式（由 useMermaid 生成） */
.article-content :deep(.mermaid-block) {
  border-color: rgba(45, 140, 240, 0.2);
}
.article-content :deep(.mermaid-block .codeblock__header) {
  background: linear-gradient(180deg, rgba(219, 247, 255, 0.95) 0%, rgba(216, 255, 247, 0.92) 100%);
}
.article-content :deep(.mermaid-block__body) {
  padding: 0;
}
.article-content :deep(.mermaid-block__diagram-wrap),
.article-content :deep(.mermaid-block__source) {
  max-height: 520px;
  overflow: auto;
  background: rgba(255, 255, 255, 0.9);
}
.article-content :deep(.mermaid-block__diagram-wrap) {
  padding: 12px;
}
.article-content :deep(.mermaid-block__source) {
  padding: 0;
}
.article-content :deep(.mermaid-block__source pre) {
  margin: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: rgba(167, 243, 208, 0.22);
  padding: 14px 16px;
}
.article-content :deep(.mermaid-block .mermaid) {
  margin: 0;
  border: 1px solid rgba(45, 140, 240, 0.14);
  border-radius: 10px;
  background: #fff;
  padding: 8px;
}
.article-content :deep(.mermaid-block .mermaid svg) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  cursor: zoom-in;
}
@media (max-width: 720px) {
  .article-content :deep(.mermaid-block__diagram-wrap),
  .article-content :deep(.mermaid-block__source) {
    max-height: 360px;
  }
}

/* ===== 自定义块样式（完整移植自 blog-detail-question.css） ===== */
.article-content :deep(.md-question) {
  --question-icon-size: 34px;
  display: grid;
  grid-template-columns: var(--question-icon-size) minmax(0, 1fr);
  column-gap: 12px;
  align-items: center;
  padding: 7px 14px;
  margin: 18px 0;
  border-radius: 12px;
  border: 1px solid rgba(200, 170, 255, 0.16);
  background: linear-gradient(90deg, rgba(230, 221, 243, 0.94) 0%, rgba(249, 246, 253, 0.98) 50%, rgba(230, 221, 243, 0.94) 100%);
  box-shadow: 0 8px 20px rgba(154, 215, 255, 0.06);
  transition: background 280ms ease, border-color 280ms ease, box-shadow 280ms ease;
}
.article-content :deep(.md-question > *) {
  min-width: 0;
  grid-column: 2;
}
.article-content :deep(.md-question p) {
  margin-top: 0;
  margin-bottom: 0;
}
.article-content :deep(.md-question p:first-child) {
  margin-top: 10px;
  margin-bottom: 10px;
}
.article-content :deep(.md-question::before) {
  content: "";
  display: block;
  align-self: center;
  width: var(--question-icon-size);
  height: var(--question-icon-size);
  grid-column: 1;
  grid-row: 1 / -1;
  background: v-bind(questionIcon) center / cover no-repeat;
  border-radius: 8px;
  transition: transform 220ms ease, filter 220ms ease;
}
.article-content :deep(.md-question.is-question-correct) {
  background: linear-gradient(90deg, rgba(211, 244, 224, 0.98) 0%, rgba(240, 252, 246, 0.99) 52%, rgba(211, 244, 224, 0.98) 100%);
  border-color: rgba(46, 204, 113, 0.34);
  box-shadow: 0 8px 20px rgba(46, 204, 113, 0.12);
}
.article-content :deep(.md-question.is-question-correct::before) {
  background-image: v-bind(correctIcon);
  animation: task-question-icon-pop 260ms ease;
}
.article-content :deep(.md-question.is-question-wrong) {
  background: linear-gradient(90deg, rgba(247, 221, 228, 0.98) 0%, rgba(255, 241, 244, 0.99) 52%, rgba(247, 221, 228, 0.98) 100%);
  border-color: rgba(255, 99, 132, 0.38);
  box-shadow: 0 8px 20px rgba(255, 99, 132, 0.14);
}
.article-content :deep(.md-question.is-question-wrong::before) {
  background-image: v-bind(wrongIcon);
  animation: task-question-icon-pop 260ms ease;
}
@keyframes task-question-icon-pop {
  0% { transform: scale(0.86); filter: saturate(0.82); }
  55% { transform: scale(1.08); filter: saturate(1.08); }
  100% { transform: scale(1); filter: saturate(1); }
}

.article-content :deep(.md-options) {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 12px 0 6px 0;
}
.article-content :deep(.md-options.is-locked .md-option),
.article-content :deep(.md-option.is-locked) {
  pointer-events: none;
  opacity: 0.72;
}
.article-content :deep(.md-options.is-locked .md-option[aria-disabled="true"]) {
  filter: grayscale(10%);
}

.article-content :deep(.md-option) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(90deg, rgba(233, 227, 246, 0.95) 0%, rgba(250, 247, 254, 0.99) 50%, rgba(233, 227, 246, 0.95) 100%);
  cursor: pointer;
  text-align: left;
  transition: transform 160ms ease, box-shadow 200ms ease, background 180ms ease;
}
.article-content :deep(.md-option:hover) {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(76, 95, 255, 0.06);
}
.article-content :deep(.md-option.is-selected) {
  background: linear-gradient(90deg, rgba(214, 237, 255, 0.96) 0%, rgba(247, 251, 255, 0.99) 50%, rgba(214, 237, 255, 0.96) 100%);
  border-color: rgba(70, 142, 255, 0.28);
  box-shadow: 0 8px 18px rgba(70, 142, 255, 0.08);
}
.article-content :deep(.md-option.is-correct) {
  background: linear-gradient(90deg, rgba(209, 239, 223, 0.95) 0%, rgba(239, 252, 246, 0.99) 50%, rgba(209, 239, 223, 0.95) 100%);
  border-color: rgba(46, 204, 113, 0.35);
  box-shadow: 0 8px 18px rgba(46, 204, 113, 0.08);
}
.article-content :deep(.md-option.is-wrong) {
  background: linear-gradient(90deg, rgba(242, 214, 223, 0.95) 0%, rgba(253, 242, 246, 0.99) 50%, rgba(242, 214, 223, 0.95) 100%);
  border-color: rgba(255, 99, 132, 0.18);
  box-shadow: 0 8px 18px rgba(255, 99, 132, 0.06);
}
.article-content :deep(.md-option .md-option-key) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(154, 215, 255, 0.16);
  font-weight: 800;
  color: #3a2b4a;
  background: linear-gradient(90deg, rgba(227, 217, 241, 0.92) 0%, rgba(246, 241, 252, 0.97) 50%, rgba(227, 217, 241, 0.92) 100%);
}
.article-content :deep(.md-option .md-option-text) {
  color: #2b3440;
  font-size: 1.04rem;
}

.article-content :deep(.md-options.is-multi-choice .md-option-key),
.article-content :deep(.md-task.is-multiple-choice .md-option .md-option-key) {
  width: 32px;
  min-width: 32px;
  height: 28px;
  border-radius: 0;
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}
.article-content :deep(.md-options.is-multi-choice .md-option.is-selected),
.article-content :deep(.md-task.is-multiple-choice .md-option.is-selected) {
  background: linear-gradient(90deg, rgba(214, 237, 255, 0.96) 0%, rgba(247, 251, 255, 0.99) 50%, rgba(214, 237, 255, 0.96) 100%);
  border-color: rgba(70, 142, 255, 0.28);
}

.article-content :deep(.md-task) {
  position: relative;
  padding: 44px 14px 14px;
  margin: 18px 0 24px 0;
  border-radius: 14px;
  border: 1px solid #FFE8D3;
  background: #FFF9F0;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.03);
}
.article-content :deep(.md-task.has-task-stats) {
  padding-top: 52px;
}
.article-content :deep(.md-task .md-task-stats) {
  position: absolute;
  top: 10px;
  left: 98px;
  right: 14px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 18px;
  font-size: 0.88rem;
  line-height: 1.25;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.article-content :deep(.md-task .md-task-stats-main),
.article-content :deep(.md-task .md-task-stats-rate) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.article-content :deep(.md-task .md-task-stats-rate) {
  margin-left: 12px;
}
.article-content :deep(.md-task .md-task-stats-label) {
  color: rgba(122, 90, 46, 0.62);
  font-weight: 500;
}
.article-content :deep(.md-task .md-task-stats-value) {
  color: #7a5a2e;
  font-weight: 700;
}
.article-content :deep(.md-task::before) {
  content: attr(data-task-label-text) attr(data-task-label) attr(data-task-suffix);
  position: absolute;
  top: 10px;
  left: 38px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.2;
  color: #7a5a2e;
  background: none;
  border: none;
  border-radius: 0;
  padding: 0;
}
.article-content :deep(.md-task::after) {
  content: "";
  --task-label-color: #7a5a2e;
  position: absolute;
  top: 10px;
  left: 14px;
  width: 16px;
  height: 16px;
  background-color: var(--task-label-color);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 3h12a1 1 0 0 1 1 1v17l-7-3-7 3V4a1 1 0 0 1 1-1z'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 3h12a1 1 0 0 1 1 1v17l-7-3-7 3V4a1 1 0 0 1 1-1z'/%3E%3C/svg%3E") center / contain no-repeat;
}
.article-content :deep(.md-task .md-question) {
  position: relative;
  margin: 0 0 6px 0;
  padding: 10px 10px 8px;
  overflow: hidden;
  background: #FFFFFF;
  border: 1px solid #FFE4CC;
  border-radius: 10px;
}
.article-content :deep(.md-task .md-question::after) {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #FF8C42;
}
.article-content :deep(.md-task .md-question.is-question-correct),
.article-content :deep(.md-task .md-question.is-question-wrong) {
  background: #FFFFFF;
  border-color: #FFE4CC;
  box-shadow: none;
}
.article-content :deep(.md-task .md-options) {
  margin: 8px 0 10px 0;
}
.article-content :deep(.md-task .md-option) {
  position: relative;
  overflow: hidden;
  background: #FFFFFF;
  border: 1px solid #FFE4CC;
  box-shadow: none;
}
.article-content :deep(.md-task .md-option:hover) {
  background: #FFF0E6;
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(255, 140, 66, 0.10);
}
.article-content :deep(.md-task .md-option.is-selected) {
  background: #E8F3FF;
  border-color: #7BB4FF;
  box-shadow: 0 8px 18px rgba(123, 180, 255, 0.12);
}
.article-content :deep(.md-task .md-option .md-option-key) {
  background: #FFF7F1;
  border: 1px solid #FFE4CC;
}
.article-content :deep(.md-task.is-multiple-choice .md-option .md-option-key),
.article-content :deep(.md-task .md-options.is-multi-choice .md-option .md-option-key) {
  background: #EAF4FF;
  border: 1px solid #B8D7FF;
}
.article-content :deep(.md-task .md-option.is-correct) {
  background: #D4F5E9;
  border-color: #34D399;
  box-shadow: 0 8px 18px rgba(52, 211, 153, 0.12);
  color: #184f2b;
}
.article-content :deep(.md-task .md-option.is-correct::before) {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #34D399;
}
.article-content :deep(.md-task .md-option.is-wrong) {
  background: #FFE4E6;
  border-color: #FB7185;
  box-shadow: 0 8px 18px rgba(251, 113, 133, 0.12);
  color: #6a1a1f;
}
.article-content :deep(.md-task .md-option.is-wrong::before) {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #FB7185;
}

.article-content :deep(.answer-block) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: stretch;
  margin: 1.1em 0;
}
.article-content :deep(.answer-block.is-multiple) {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.article-content :deep(.md-task .answer-block) {
  margin-top: 8px;
}
.article-content :deep(.md-task .answer-block.is-multiple) {
  gap: 10px;
}
.article-content :deep(.answer-actions) {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-start;
  width: 100%;
}
.article-content :deep(.md-task .answer-actions) {
  padding-left: 2px;
}
.article-content :deep(.answer-actions-row) {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.article-content :deep(.answer-type-badge) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(70, 142, 255, 0.18);
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #24528b;
  background: linear-gradient(90deg, rgba(232, 244, 255, 0.96) 0%, rgba(249, 252, 255, 0.99) 50%, rgba(232, 244, 255, 0.96) 100%);
}
.article-content :deep(.md-task .answer-type-badge) {
  border-color: #B9D7FF;
  background: #F2F8FF;
  color: #2A5A9A;
}
.article-content :deep(.answer-submit) {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  min-width: 168px;
  width: 168px;
  margin-left: auto;
  padding: 9px 14px 9px 16px;
  border-radius: 999px;
  border: 1px solid rgba(72, 190, 121, 0.22);
  font-weight: 800;
  color: #1f6b43;
  background: linear-gradient(90deg, rgba(222, 248, 231, 0.98) 0%, rgba(247, 255, 250, 0.99) 50%, rgba(222, 248, 231, 0.98) 100%);
  box-sizing: border-box;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 180ms ease, background 180ms ease;
}
.article-content :deep(.answer-submit:hover) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(72, 190, 121, 0.14);
}
.article-content :deep(.answer-submit:disabled),
.article-content :deep(.answer-submit.is-submitted) {
  cursor: default;
  opacity: 0.78;
  box-shadow: none;
  transform: none;
}
.article-content :deep(.md-task .answer-submit) {
  border: 1px solid #8ed0a7;
  color: #1f6b43;
  background: #eefaf2;
}
.article-content :deep(.md-task .answer-submit:hover) {
  background: #e3f7e8;
  box-shadow: 0 8px 18px rgba(72, 190, 121, 0.14);
}
.article-content :deep(.answer-submit-label) {
  flex: 1 1 auto;
  text-align: left;
}
.article-content :deep(.answer-submit-icon) {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 900;
  line-height: 1;
  color: #1f6b43;
  background: rgba(72, 190, 121, 0.16);
}
.article-content :deep(.md-task .answer-submit-icon) {
  background: rgba(72, 190, 121, 0.14);
  color: #1f6b43;
}
.article-content :deep(.answer-toggle) {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: 1px solid rgba(212, 160, 23, 0.85);
  color: #d4a017;
  width: 100%;
  height: 44px;
  padding: 6px 0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease;
}
.article-content :deep(.answer-toggle:focus-visible) {
  outline: 2px solid rgba(212, 160, 23, 0.18);
  outline-offset: 2px;
}
.article-content :deep(.answer-toggle.is-open) {
  border: 1px solid rgba(212, 160, 23, 0.85);
}
.article-content :deep(.md-task .answer-toggle) {
  border: 1px solid rgba(212, 160, 23, 0.85);
  color: #d4a017;
  background: transparent;
}
.article-content :deep(.md-task .answer-toggle.is-open) {
  border: 1px solid rgba(212, 160, 23, 0.85);
  color: #d4a017;
  background: transparent;
}
.article-content :deep(.md-task .answer-toggle:hover) {
  background: rgba(212, 160, 23, 0.06);
  border-color: rgba(212, 160, 23, 0.95);
}
.article-content :deep(.answer-toggle-icon) {
  display: block;
  width: 22px;
  height: 22px;
  transition: transform 0.26s ease;
  color: inherit;
}
.article-content :deep(.answer-toggle.is-open .answer-toggle-icon) {
  transform: rotate(180deg);
}
.article-content :deep(.answer-content) {
  width: 100%;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 300ms ease, opacity 250ms ease;
}
.article-content :deep(.answer-block.is-open .answer-content) {
  max-height: 3000px;
  opacity: 1;
}
.article-content :deep(.answer-content p) {
  margin: 0.5em 0;
}
.article-content :deep(.answer-block + .answer-block) {
  margin-top: 0.6em;
}
.article-content :deep(.answer-inner) {
  padding: 12px 14px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(231, 224, 245, 0.94) 0%, rgba(249, 246, 253, 0.98) 50%, rgba(231, 224, 245, 0.94) 100%);
  border: 1px solid rgba(200, 170, 255, 0.08);
}
.article-content :deep(.md-task .answer-inner) {
  position: relative;
  overflow: hidden;
  padding-top: 14px;
  background: #FFF0F5;
  border: 1px solid #F5D8EE;
}
.article-content :deep(.md-task .answer-inner::before) {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #C084FC;
}
.article-content :deep(.answer-header) {
  font-weight: 700;
  color: #3a2b4a;
  margin-bottom: 8px;
}
.article-content :deep(.md-task .answer-header) {
  color: #7a5a7a;
}
.article-content :deep(.answer-header .answer-letter),
.article-content :deep(.answer-header .answer-letter *) {
  color: #2f6f5a !important;
}
.article-content :deep(.answer-header p),
.article-content :deep(.answer-header p *) {
  color: #2f6f5a !important;
}
.article-content :deep(.answer-analysis) {
  color: #334049;
  line-height: 1.9;
}
.article-content :deep(.md-task .answer-analysis) {
  color: #4a5960;
}

/* 移动端适配 */
@media (max-width: 720px) {
  .article-content :deep(.md-option) {
    padding: 4px 8px;
    border-radius: 10px;
  }
  .article-content :deep(.md-option .md-option-key) {
    min-width: 26px;
    height: 26px;
    border-radius: 6px;
  }
  .article-content :deep(.md-options.is-multi-choice .md-option-key),
  .article-content :deep(.md-task.is-multiple-choice .md-option .md-option-key) {
    width: 30px;
    min-width: 30px;
    height: 26px;
    border-radius: 0;
  }
  .article-content :deep(.md-task.has-task-stats) {
    padding-top: 58px;
  }
  .article-content :deep(.md-task.has-task-stats.is-rate-hidden) {
    padding-top: 44px;
  }
  .article-content :deep(.md-task .md-task-stats) {
    top: 10px;
    left: 88px;
    right: 10px;
    font-size: 0.74rem;
    gap: 0;
  }
  .article-content :deep(.md-task .md-task-stats-main) {
    display: none;
  }
  .article-content :deep(.md-task .md-task-stats-rate) {
    margin-left: 0;
  }
  .article-content :deep(.md-task .md-task-stats.is-rate-hidden) {
    display: none;
  }
  .article-content :deep(.md-question::before) {
    display: none;
  }
  .article-content :deep(.md-question) {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* 沉浸阅读字号放大 */
.blog-detail-page.immersive-reading-active .article-content :deep(p),
.blog-detail-page.immersive-reading-active .article-content :deep(li),
.blog-detail-page.immersive-reading-active .article-content :deep(blockquote),
.blog-detail-page.immersive-reading-active .article-content :deep(h4) {
  font-size: 1.5rem;
  line-height: 2.4;
}
.blog-detail-page.immersive-reading-active .article-content :deep(h1) {
  font-size: 2.8rem;
}
.blog-detail-page.immersive-reading-active .article-content :deep(h2) {
  font-size: 2.2rem;
}
.blog-detail-page.immersive-reading-active .article-content :deep(h3) {
  font-size: 1.8rem;
}

/* ===== 练习模式：仅显示标题和习题 ===== */
.article-content.practice-mode :deep(> :not(h1):not(h2):not(h3):not(h4):not(h5):not(h6):not(.md-task)) {
  display: none !important;
}
</style>