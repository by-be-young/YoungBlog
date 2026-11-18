<template>
  <main class="announcements-page">
    <section class="announcements-section">
      <div class="container">
        <header class="ann-masthead">
          <p class="ann-masthead__eyebrow">NOTICE BOARD · 06</p>
          <h1 class="announcements-title">{{ i18n.currentTranslations.announcements_title }}</h1>
        </header>

        <div v-if="isLoading" class="loading-text">加载中...</div>
        <div v-else-if="announcements.length === 0" class="announcements-empty">
          {{ i18n.currentTranslations.announcements_empty }}
        </div>

        <div v-else class="announcements-timeline" id="announcementsTimeline">
          <div
            v-for="(item, index) in sortedAnnouncements"
            :key="item.id || index"
            class="ann-item"
            :class="[
              getItemClass(index),
              { 'is-visible': isItemVisible(index) }
            ]"
            :data-index="index"
          >
            <div class="ann-mid">
              <div class="ann-dot" aria-hidden="true"></div>
              <div class="ann-time">{{ formatDate(item.date) }}</div>
            </div>

            <div class="ann-card">
              <div
                class="ann-message"
                :class="{ 'ann-message--split': hasMultipleLines(item.message) }"
              >
                <template v-if="hasMultipleLines(item.message)">
                  <div class="ann-message-fixed" v-html="renderFirstLine(item.message)"></div>
                  <div class="ann-message-scroll" v-html="renderRestLines(item.message)"></div>
                </template>
                <template v-else>
                  <div v-html="renderMessage(item.message)"></div>
                </template>
              </div>
            </div>

            <div class="ann-spacer" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { resolveUrl } from '@/shared/utils/url'

const i18n = useI18nStore()

// ===== 数据 =====
const isLoading = ref(false)
const announcements = ref([])
const isMobileLayout = ref(window.innerWidth <= 880)

// ===== 可见性 =====
const visibleSet = ref(new Set())

const isItemVisible = (index) => {
  const total = sortedAnnouncements.value.length
  if (index === 0 || index === total - 1) return true
  return visibleSet.value.has(index)
}

// ===== 计算属性 =====
const sortedAnnouncements = computed(() => {
  return [...announcements.value].sort((a, b) => {
    const da = new Date(a?.date || 0).getTime()
    const db = new Date(b?.date || 0).getTime()
    if (db !== da) return db - da
    const ia = Number(a?.id || 0)
    const ib = Number(b?.id || 0)
    return ib - ia
  })
})

// ===== 工具函数 =====
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const lang = i18n.getLang()
  try {
    if (lang === 'en') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    if (lang === 'ja') {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    }
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

const hasMultipleLines = (msg) => msg && String(msg).includes('\n')

const escapeHtml = (str) => {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(str).replace(/[&<>"']/g, (c) => map[c] || c)
}

const renderLine = (line, index) => {
  const text = escapeHtml(line)
  if (!line.trim()) {
    return '<div class="ann-line ann-line--blank">&nbsp;</div>'
  }
  let classes = 'ann-line'
  if (index === 0) classes += ' ann-line--headline'
  if (line.includes('>>')) classes += ' ann-line--section'
  return `<div class="${classes}">${text}</div>`
}

const renderMessage = (msg) => {
  const lines = String(msg || '').split(/\r?\n/)
  return lines.map((line, i) => renderLine(line, i)).join('')
}

const renderFirstLine = (msg) => {
  const lines = String(msg || '').split(/\r?\n/)
  if (lines.length === 0) return ''
  return renderLine(lines[0], 0)
}

const renderRestLines = (msg) => {
  const lines = String(msg || '').split(/\r?\n/)
  if (lines.length <= 1) return ''
  return lines.slice(1).map((line, i) => renderLine(line, i + 1)).join('')
}

const getItemClass = (index) => {
  const total = sortedAnnouncements.value.length
  if (total === 0) return ''
  if (index === 0) return 'ann-item--top'
  if (index === total - 1) return 'ann-item--bottom'
  if (isMobileLayout.value) return 'ann-item--mobile'
  return index % 2 === 1 ? 'ann-item--left' : 'ann-item--right'
}

// ===== IntersectionObserver =====
let observer = null

const setupObserver = () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }

  if (!('IntersectionObserver' in window)) {
    sortedAnnouncements.value.forEach((_, index) => {
      const total = sortedAnnouncements.value.length
      if (index !== 0 && index !== total - 1) {
        visibleSet.value.add(index)
      }
    })
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target
        const index = parseInt(el.dataset.index, 10)
        if (!isNaN(index) && entry.isIntersecting) {
          visibleSet.value.add(index)
        }
      })
    },
    { threshold: 0.12 }
  )

  nextTick(() => {
    document.querySelectorAll('.ann-item[data-index]').forEach((el) => {
      const index = parseInt(el.dataset.index, 10)
      const total = sortedAnnouncements.value.length
      if (index === 0 || index === total - 1) return
      observer.observe(el)
    })
  })
}

// ===== 事件处理 =====
const handleResize = () => {
  const newMobile = window.innerWidth <= 880
  if (newMobile !== isMobileLayout.value) {
    isMobileLayout.value = newMobile
    // 不重置可见性
  }
}

const handleLanguageChange = () => {}

// ===== 加载数据 =====
const fetchAnnouncements = async () => {
  isLoading.value = true
  try {
    const res = await fetch(resolveUrl('/data/announcements.json'))
    const data = await res.json()
    announcements.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('[Announcements] 加载失败:', e)
    announcements.value = []
  } finally {
    isLoading.value = false
  }
}

// ===== 生命周期 =====
onMounted(() => {
  fetchAnnouncements()
  window.addEventListener('resize', handleResize, { passive: true })
  window.addEventListener('site:languageChanged', handleLanguageChange)

  watch(sortedAnnouncements, () => {
    visibleSet.value.clear()
    nextTick(setupObserver)
  }, { immediate: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('site:languageChanged', handleLanguageChange)
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<style>
/* ============================================
   公告页样式 - 完全复制老代码 announcements.css
   并限定在 .announcements-page 下
   ============================================ */

.announcements-page {
  --primary-color: #55c8ff;
  --secondary-color: #a7f3d0;
  --archive-pink: #ffb6c9;
  --archive-peach: #ffd2a6;
  --archive-mint: #a7f3d0;
  --archive-sky: #9ad7ff;
  --archive-text: #2b3440;
  --archive-muted: #5f6b7a;
  --archive-card-shadow: 0 16px 34px rgba(44, 62, 80, 0.14);
  --archive-border: linear-gradient(135deg, var(--archive-pink), var(--archive-mint), rgba(199, 182, 255, 0.9));
}

.announcements-page .announcements-section {
  padding: 44px 0 80px;
}

.announcements-page .announcements-title {
  text-align: center;
  width: min(1100px, 100%);
  margin: 0 auto;
  font-size: 4.2rem;
  font-weight: 900;
  line-height: 1.02;
  padding: 80px 0 90px 0;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, rgba(255, 182, 201, 1), rgba(154, 215, 255, 0.98), rgba(167, 243, 208, 0.98));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 18px 44px rgba(44, 62, 80, 0.22), 0 6px 16px rgba(255, 255, 255, 0.6);
  filter: drop-shadow(0 14px 36px rgba(44, 62, 80, 0.14));
}

.announcements-page .announcements-empty {
  text-align: center;
  color: rgba(0, 0, 0, 0.55);
  padding: 30px 0;
}

.announcements-page .loading-text {
  text-align: center;
  color: rgba(0, 0, 0, 0.5);
  padding: 40px 0;
}

.announcements-page .announcements-timeline {
  position: relative;
  max-width: 980px;
  margin: 0 auto;
  padding: 10px 0 20px;
}

.announcements-page .announcements-timeline::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 4px;
  transform: translateX(-50%);
  background: #f3e9ff;
  border-radius: 999px;
}

.announcements-page .ann-item {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 140px 1fr;
  align-items: center;
  gap: 10px;
  margin: 26px 0;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.45s ease, transform 0.45s ease;
}

.announcements-page .ann-item.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.announcements-page .ann-item.ann-item--top,
.announcements-page .ann-item.ann-item--bottom {
  opacity: 1;
  transform: none;
  transition: none;
}

.announcements-page .ann-mid {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 56px;
}

.announcements-page .ann-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffd6e8;
  border: 3px solid rgba(107, 43, 74, 0.35);
  box-shadow: 0 10px 22px rgba(107, 43, 74, 0.12);
  flex-shrink: 0;
}

.announcements-page .ann-time {
  font-weight: 800;
  color: #6b2b4a;
  text-align: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #e8fff4;
  border: 1px solid rgba(0, 0, 0, 0.06);
  line-height: 1.2;
  max-width: 140px;
  font-size: 0.95rem;
}

.announcements-page .ann-card {
  border: 3px solid transparent;
  background:
    linear-gradient(rgba(255, 255, 255, 0.70), rgba(255, 255, 255, 0.70)) padding-box,
    linear-gradient(135deg, rgba(255, 182, 201, 0.80), rgba(167, 243, 208, 0.78), rgba(154, 215, 255, 0.78)) border-box;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 14px;
  max-height: 340px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 18px 20px;
}

.announcements-page .ann-card .ann-message {
  white-space: pre-wrap;
  word-break: break-word;
  flex: 1 1 auto;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  font-size: 1rem;
  line-height: 1.6;
  font-weight: 700;
}

.announcements-page .ann-card .ann-message.ann-message--split {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.announcements-page .ann-card .ann-message-fixed {
  flex: 0 0 auto;
}

.announcements-page .ann-card .ann-message-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.announcements-page .ann-card .ann-message .ann-line {
  display: block;
}

.announcements-page .ann-card .ann-message .ann-line--blank {
  line-height: 1;
  min-height: 0.8em;
}

.announcements-page .ann-card .ann-message .ann-line--headline {
  text-align: center;
  font-size: 1.22em;
  font-weight: 900;
  color: #6b2b4a;
  letter-spacing: 0.02em;
  margin-bottom: 0.1em;
}

.announcements-page .ann-card .ann-message .ann-line--section {
  color: #ff6f91;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.42em;
}

.announcements-page .ann-card .ann-message .ann-line--section::after {
  content: "～～～～～～～～～～～～～～～～～～～～～";
  color: #ff97ad;
  letter-spacing: -0.08em;
  white-space: nowrap;
  overflow: hidden;
  flex: 1 1 auto;
}

.announcements-page .ann-card .ann-message::-webkit-scrollbar,
.announcements-page .ann-card .ann-message-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.announcements-page .ann-card .ann-message,
.announcements-page .ann-card .ann-message-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.announcements-page .ann-item.ann-item--top,
.announcements-page .ann-item.ann-item--bottom {
  grid-template-columns: 1fr;
}

.announcements-page .ann-item.ann-item--top {
  margin: 8px 0 34px;
}

.announcements-page .ann-item.ann-item--bottom {
  margin: 34px 0 8px;
}

.announcements-page .ann-item.ann-item--top .ann-mid,
.announcements-page .ann-item.ann-item--bottom .ann-mid {
  margin: 0 auto 12px;
}

.announcements-page .ann-item.ann-item--top .ann-card,
.announcements-page .ann-item.ann-item--bottom .ann-card {
  max-width: 720px;
  margin: 0 auto;
  padding: 18px 20px;
  max-height: 480px;
}

.announcements-page .ann-item.ann-item--top .ann-card .ann-message,
.announcements-page .ann-item.ann-item--bottom .ann-card .ann-message {
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.6;
}

.announcements-page .ann-item.ann-item--left .ann-card {
  grid-column: 1;
  justify-self: start;
  text-align: left;
}

.announcements-page .ann-item.ann-item--left .ann-mid {
  grid-column: 2;
}

.announcements-page .ann-item.ann-item--left .ann-spacer {
  grid-column: 3;
}

.announcements-page .ann-item.ann-item--right .ann-spacer {
  grid-column: 1;
}

.announcements-page .ann-item.ann-item--right .ann-mid {
  grid-column: 2;
}

.announcements-page .ann-item.ann-item--right .ann-card {
  grid-column: 3;
  justify-self: start;
  text-align: left;
}

/* ============================================
   响应式设计
   ============================================ */

@media (max-width: 900px) {
  .announcements-page .announcements-title {
    font-size: 2.2rem;
    padding: 40px 0 44px 0;
  }
}

@media (max-width: 880px) {
  .announcements-page .announcements-section {
    padding: 24px 0 44px;
  }

  .announcements-page .announcements-title {
    font-size: 2rem;
    line-height: 1.12;
    padding: 24px 0 26px 0;
  }

  .announcements-page .announcements-timeline {
    max-width: 640px;
    padding: 2px 0 6px;
  }

  .announcements-page .announcements-timeline::before {
    display: none;
  }

  .announcements-page .ann-item,
  .announcements-page .ann-item.ann-item--top,
  .announcements-page .ann-item.ann-item--bottom,
  .announcements-page .ann-item.ann-item--left,
  .announcements-page .ann-item.ann-item--right,
  .announcements-page .ann-item.ann-item--mobile {
    grid-template-columns: 1fr;
    gap: 8px;
    margin: 0 0 16px;
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }

  .announcements-page .ann-item:last-child,
  .announcements-page .ann-item.ann-item--mobile:last-child {
    margin-bottom: 0;
  }

  .announcements-page .ann-item .ann-spacer {
    display: none;
  }

  .announcements-page .ann-mid {
    flex-direction: row;
    justify-content: flex-start;
    gap: 8px;
    min-height: 0;
    padding-left: 0;
  }

  .announcements-page .ann-dot {
    width: 10px;
    height: 10px;
    border-width: 2px;
  }

  .announcements-page .ann-time {
    max-width: none;
    font-size: 0.9rem;
    font-weight: 700;
    padding: 5px 10px;
  }

  .announcements-page .ann-item .ann-card,
  .announcements-page .ann-item.ann-item--top .ann-card,
  .announcements-page .ann-item.ann-item--bottom .ann-card,
  .announcements-page .ann-item.ann-item--left .ann-card,
  .announcements-page .ann-item.ann-item--right .ann-card,
  .announcements-page .ann-item.ann-item--mobile .ann-card {
    grid-column: 1;
    justify-self: stretch;
    text-align: left;
    margin: 0;
    max-width: none;
    padding: 14px 14px;
    border-radius: 12px;
    max-height: 320px;
  }

  .announcements-page .ann-item .ann-card .ann-message {
    font-size: 0.98rem;
    line-height: 1.64;
  }

  .announcements-page .ann-card .ann-message .ann-line--section::after {
    content: none !important;
    display: none !important;
  }

  .announcements-page .ann-item:not(.ann-item--top):not(.ann-item--bottom) {
    opacity: 1 !important;
    transform: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .announcements-page .ann-item {
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}

/* ============================================================
   重构：公告流（报头 + 左侧时间轨 + 暖纸公告卡）
   ============================================================ */
.announcements-page .announcements-section {
  padding: 96px 24px 72px;
}

.announcements-page .container {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  padding: 0;
}

.ann-masthead {
  margin: 0 0 28px;
}

.ann-masthead__eyebrow {
  display: block;
  margin: 0 0 9px;
  font-family: var(--font-ui);
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  color: rgba(23, 34, 47, 0.4);
}

.announcements-page .announcements-title {
  width: auto;
  margin: 0;
  padding: 0;
  text-align: left;
  font-size: clamp(2.4rem, 4.6vw, 3.4rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  background: linear-gradient(100deg, #c84070 0%, #a08cff 52%, #58d8b2 100%);
  background-size: 180% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  filter: drop-shadow(0 12px 26px rgba(23, 34, 47, 0.1));
}

.announcements-page .announcements-timeline {
  max-width: none;
  margin: 0;
  padding: 8px 0 16px 44px;
}

.announcements-page .announcements-timeline::before {
  left: 7px;
  top: 2px;
  bottom: 10px;
  width: 2px;
  transform: none;
  border-radius: 2px;
  background: linear-gradient(180deg, #ffb6c9, #c7b6ff 48%, #a7f3d0);
}

.announcements-page .ann-item {
  display: flex !important;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  margin: 0 0 18px;
}

.announcements-page .ann-item .ann-mid,
.announcements-page .ann-item .ann-card {
  grid-column: 1 !important;
}

.announcements-page .ann-item .ann-spacer {
  display: none !important;
}

.announcements-page .ann-item--top,
.announcements-page .ann-item--bottom,
.announcements-page .ann-item.ann-item--top,
.announcements-page .ann-item.ann-item--bottom {
  grid-template-columns: minmax(0, 1fr) !important;
  margin: 0 0 18px;
}

.announcements-page .ann-item.ann-item--top .ann-card,
.announcements-page .ann-item.ann-item--bottom .ann-card {
  width: 100% !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  overflow: visible !important;
}

.announcements-page .ann-mid {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-height: 0;
  margin: 0 0 7px;
  padding: 0;
}

.announcements-page .ann-item--top .ann-mid,
.announcements-page .ann-item--bottom .ann-mid,
.announcements-page .ann-item.ann-item--top .ann-mid,
.announcements-page .ann-item.ann-item--bottom .ann-mid {
  margin: 0 0 7px !important;
}

.announcements-page .ann-dot {
  position: absolute;
  left: -42px;
  top: 50%;
  width: 10px;
  height: 10px;
  margin-top: -5px;
  border: 2px solid rgba(253, 249, 242, 0.96);
  background: #c84070;
  box-shadow: 0 0 0 1px rgba(200, 64, 112, 0.25);
}

.announcements-page .ann-time {
  max-width: none;
  padding: 0;
  text-align: left;
  border: 0;
  background: none;
  font-family: var(--font-ui);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(23, 34, 47, 0.46);
}

.announcements-page .ann-card,
.announcements-page .ann-item--top .ann-card,
.announcements-page .ann-item--bottom .ann-card,
.announcements-page .ann-item--left .ann-card,
.announcements-page .ann-item--right .ann-card {
  position: relative;
  grid-column: 1;
  width: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 18px 22px 18px 24px;
  overflow: visible;
  border: 0;
  border-radius: 22px;
  background: rgba(253, 249, 242, 0.72);
  box-shadow:
    0 14px 32px rgba(23, 34, 47, 0.1),
    0 1px 0 rgba(255, 255, 255, 0.6) inset;
  backdrop-filter: blur(18px) saturate(1.08);
  -webkit-backdrop-filter: blur(18px) saturate(1.08);
}

.announcements-page .ann-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 18px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #ffb6c9, #c7b6ff 55%, #a7f3d0);
}

.announcements-page .ann-spacer {
  display: none;
}

.announcements-page .ann-card .ann-message,
.announcements-page .ann-item--top .ann-card .ann-message,
.announcements-page .ann-item--bottom .ann-card .ann-message {
  overflow: visible;
  font-size: 0.95rem;
  line-height: 1.72;
  font-weight: 500;
  color: rgba(23, 34, 47, 0.78);
}

.announcements-page .ann-card .ann-message.ann-message--split {
  overflow: visible;
}

.announcements-page .ann-card .ann-message-scroll {
  overflow: visible;
  max-height: none;
}

.announcements-page .ann-card .ann-message .ann-line--headline {
  text-align: left;
  font-size: 1.06em;
  font-weight: 800;
  color: #17222f;
  margin-bottom: 0.16em;
}

.announcements-page .ann-card .ann-message .ann-line--section {
  color: #c84070;
  font-weight: 700;
}

.announcements-page .ann-card .ann-message .ann-line--section::after {
  content: '';
  height: 1px;
  background: linear-gradient(90deg, rgba(200, 64, 112, 0.3), transparent);
}

@media (max-width: 880px) {
  .announcements-page .announcements-section {
    padding: 84px 14px 40px;
  }

  .ann-masthead {
    margin-bottom: 20px;
  }

  .announcements-page .announcements-title {
    padding: 0;
    font-size: 2rem;
  }

  .announcements-page .announcements-timeline {
    padding: 4px 0 8px 26px;
  }

  .announcements-page .announcements-timeline::before {
    left: 4px;
  }

  .announcements-page .ann-dot {
    left: -26px;
  }

  .announcements-page .ann-card,
  .announcements-page .ann-item .ann-card,
  .announcements-page .ann-item--top .ann-card,
  .announcements-page .ann-item--bottom .ann-card {
    padding: 15px 16px 15px 18px;
    border-radius: 18px;
    max-height: none !important;
    overflow: visible;
  }

  .announcements-page .ann-card .ann-message {
    font-size: 0.9rem;
    line-height: 1.68;
  }

  .announcements-page .ann-item {
    margin-bottom: 14px;
  }
}
</style>