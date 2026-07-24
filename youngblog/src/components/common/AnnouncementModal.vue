<!-- AnnouncementModal.vue -->
<template>
  <Teleport to="body">
    <Transition
      name="announcement-modal-transition"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="isOpen"
        class="announcement-modal"
        :class="{ 'is-open': isOpen }"
        @click="handleBackdropClick"
      >
        <div class="announcement-modal-card" role="dialog" aria-modal="true">
          <button class="announcement-modal-close" @click="closeModal">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
          <div
            class="announcement-banner announcement-banner--modal"
            :class="{ 'announcement-banner--recent': isRecent }"
          >
            <div class="announcement-left">
              <div class="announcement-icon" aria-hidden="true">
                <i class="fas fa-bullhorn"></i>
              </div>
              <div>
                <div class="announcement-kicker" id="announcement-modal-title">
                  <span>{{ i18n.currentTranslations.announcement_banner_title }}</span>
                  <span class="announcement-date">{{ latestDate }}</span>
                </div>
                <div class="announcement-message" v-html="parsedMessage"></div>
              </div>
            </div>
            <a class="announcement-btn" href="#/announcements">
              <span>{{ i18n.currentTranslations.announcement_view_all }}</span>
              <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'

const i18n = useI18nStore()
const isOpen = ref(false)
const announcementData = ref(null)

const latestDate = computed(() => announcementData.value?.date || '')

const isRecent = computed(() => {
  const dateStr = announcementData.value?.date
  if (!dateStr) return false
  const target = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const diffDays = Math.abs(Math.round((today - targetDay) / 86400000))
  return diffDays <= 3
})

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, (c) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
    return map[c]
  })
}

const parsedMessage = computed(() => {
  const msg = announcementData.value?.message || ''
  const lines = String(msg).split(/\r?\n/)
  return lines
    .map((line, index) => {
      const trimmed = line.trim()
      let classes = 'ann-line'
      if (!trimmed) classes += ' ann-line--blank'
      else if (index === 0) classes += ' ann-line--headline'
      else if (line.includes('>>')) classes += ' ann-line--section'
      return `<div class="${classes}">${escapeHtml(line)}</div>`
    })
    .join('')
})

const fetchAnnouncements = async () => {
  try {
    const res = await fetch('/data/announcements.json')
    const data = await res.json()
    const list = Array.isArray(data) ? data : []
    if (list.length === 0) {
      announcementData.value = { message: i18n.currentTranslations.announcements_empty }
      return
    }
    list.sort((a, b) => new Date(b.date) - new Date(a.date))
    announcementData.value = list[0]
  } catch (e) {
    announcementData.value = { message: i18n.currentTranslations.announcements_empty }
  }
}

const openModal = () => {
  isOpen.value = true
  document.body.classList.add('announcement-modal-open')
  fetchAnnouncements()
}

const closeModal = () => {
  isOpen.value = false
  document.body.classList.remove('announcement-modal-open')
}

const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget) closeModal()
}

const handleKeydown = (e) => {
  if (e.key === 'Escape' && isOpen.value) closeModal()
}

const checkFirstVisit = () => {
  const key = 'homeAnnouncementModalShown_v1'
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, '1')
    setTimeout(openModal, 500)
  }
}

const onEnter = (el) => { el.offsetHeight }
const onLeave = (el) => { el.offsetHeight }

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('toggle-announcement', openModal)
  checkFirstVisit()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('toggle-announcement', openModal)
})
</script>

<style>
/* ==================================================
   公告弹窗 - 完全复制原版 style-controls.css
   ================================================== */

.announcement-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.28s ease, visibility 0.28s ease;
}

.announcement-modal.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

/* 弹窗卡片 */
.announcement-modal-card {
  position: relative;
  width: min(900px, calc(100vw - 28px));
  max-height: min(82vh, 720px);
  padding: 18px;
  border-radius: 14px;
  background: transparent;
  backdrop-filter: none;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.18);
  overflow: auto;
  transform-origin: left bottom;
  transform: translate(-22px, 22px) scale(0.76);
  opacity: 0;
  filter: grayscale(1) saturate(0.2);
  transition: transform 0.32s cubic-bezier(0.2, 0.7, 0.25, 1),
    opacity 0.28s ease,
    filter 0.28s ease;
  will-change: transform, opacity, filter;
}

.announcement-modal.is-open .announcement-modal-card {
  transform: translate(0, 0) scale(1);
  opacity: 1;
  filter: grayscale(0) saturate(1);
}

.announcement-modal-close {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 10;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.86);
  color: rgba(0, 0, 0, 0.65);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease, background-color 0.12s ease;
}

.announcement-modal-close:hover {
  transform: rotate(90deg);
  background: rgba(255, 255, 255, 0.95);
}

/* 弹窗内的横幅 */
.announcement-modal .announcement-banner--modal {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 0;
  min-height: 190px;
  padding: 20px 24px;
  border-radius: 12px;
  background:
    linear-gradient(135deg,
      rgba(255, 232, 130, 0.94) 0%,
      rgba(210, 242, 146, 0.94) 50%,
      rgba(255, 220, 148, 0.94) 100%) padding-box,
    linear-gradient(135deg,
      rgba(255, 224, 126, 0.90),
      rgba(206, 238, 140, 0.90),
      rgba(255, 214, 138, 0.90)) border-box;
  border: 5px solid transparent;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.announcement-modal .announcement-banner--modal .announcement-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.announcement-modal .announcement-banner--modal .announcement-icon {
  font-size: 2.4rem;
  color: #b57b00;
  flex-shrink: 0;
}

.announcement-modal .announcement-banner--modal .announcement-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
  font-size: 1.1rem;
  color: #b57b00;
}

.announcement-modal .announcement-banner--modal .announcement-date {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 400;
}

/* ---- 消息样式 ---- */
.announcement-modal .announcement-banner--modal .announcement-message {
  color: rgba(0, 0, 0, 0.72);
  line-height: 1.7;
  font-size: 1rem;
  max-height: 360px;
  overflow-y: auto;
  margin-top: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.announcement-modal .announcement-banner--modal .announcement-message::-webkit-scrollbar {
  display: none;
}

.announcement-modal .announcement-banner--modal .announcement-message .ann-line {
  display: block;
}
.announcement-modal .announcement-banner--modal .announcement-message .ann-line--blank {
  line-height: 1;
  min-height: 0.8em;
}
.announcement-modal .announcement-banner--modal .announcement-message .ann-line--headline {
  text-align: center;
  font-size: 1.16em;
  font-weight: 900;
  color: #6b2b4a;
  letter-spacing: 0.02em;
  margin-bottom: 0.08em;
}
.announcement-modal .announcement-banner--modal .announcement-message .ann-line--section {
  color: #ff6f91;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.4em;
}
.announcement-modal .announcement-banner--modal .announcement-message .ann-line--section::after {
  content: "～～～～～～～～～～～～～～～～～～";
  color: #ff97ad;
  letter-spacing: -0.08em;
  white-space: nowrap;
  overflow: hidden;
  flex: 1 1 auto;
}

/* ---- 按钮 ---- */
.announcement-modal .announcement-banner--modal .announcement-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #ffd6e8;
  color: #6b2b4a;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.announcement-modal .announcement-banner--modal .announcement-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(107, 43, 74, 0.12);
}

/* 近期公告偏橙色 */
.announcement-modal .announcement-banner--modal.announcement-banner--recent .announcement-btn {
  background: linear-gradient(135deg, rgba(255, 210, 170, 1), rgba(255, 185, 120, 1));
}

/* ---- 近期公告特殊动画 ---- */
.announcement-modal .announcement-banner--modal.announcement-banner--recent {
  background-size: 240% 240%, 240% 240%;
  background:
    linear-gradient(135deg, rgba(255, 217, 179, 0.96), rgba(255, 183, 128, 0.96), rgba(255, 231, 176, 0.96)),
    linear-gradient(135deg, rgba(255, 204, 153, 0.90), rgba(255, 179, 102, 0.88), rgba(255, 205, 140, 0.90));
  will-change: background-position, transform, box-shadow;
  animation:
    announcement-recent-gradient-flow 2.8s linear infinite,
    announcement-recent-attention-pulse 1.35s ease-in-out infinite;
}
.announcement-modal .announcement-banner--modal.announcement-banner--recent .announcement-icon {
  will-change: transform;
  animation: announcement-recent-icon-pop 0.9s ease-in-out infinite;
}

@keyframes announcement-recent-gradient-flow {
  0% { background-position: 0% 45%, 100% 55%; }
  50% { background-position: 100% 55%, 0% 45%; }
  100% { background-position: 0% 45%, 100% 55%; }
}
@keyframes announcement-recent-attention-pulse {
  0% { transform: translateY(0); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  50% { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(181, 138, 0, 0.22); }
  100% { transform: translateY(0); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
}
@keyframes announcement-recent-icon-pop {
  0% { transform: scale(1) rotate(0deg); }
  45% { transform: scale(1.08) rotate(-5deg); }
  100% { transform: scale(1) rotate(0deg); }
}

body.announcement-modal-open {
  overflow: hidden;
}

/* ---- 响应式适配 ---- */
@media (max-width: 720px) {
  .announcement-modal {
    align-items: flex-end;
    padding: 10px;
  }
  .announcement-modal-card {
    width: 100%;
    max-height: 86vh;
    padding: 14px;
    border-radius: 12px;
    transform-origin: center bottom;
  }
  .announcement-modal .announcement-banner--modal {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px 18px;
    min-height: auto;
  }
  .announcement-modal .announcement-banner--modal .announcement-left {
    width: 100%;
  }
  .announcement-modal .announcement-banner--modal .announcement-icon {
    font-size: 1.8rem;
  }
  .announcement-modal .announcement-banner--modal .announcement-kicker {
    font-size: 0.95rem;
    flex-wrap: wrap;
  }
  .announcement-modal .announcement-banner--modal .announcement-message {
    max-height: 50vh;
  }
  .announcement-modal .announcement-banner--modal .announcement-btn {
    align-self: flex-start;
    margin-top: 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .announcement-modal,
  .announcement-modal-card {
    transition: none !important;
  }
  .announcement-modal .announcement-banner--modal.announcement-banner--recent {
    animation: none;
  }
  .announcement-modal .announcement-banner--modal.announcement-banner--recent .announcement-icon {
    animation: none;
  }
}
</style>