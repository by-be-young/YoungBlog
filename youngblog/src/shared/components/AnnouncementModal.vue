<!-- AnnouncementModal.vue - 站点公告（结构化阅读弹窗） -->
<template>
  <Teleport to="body">
    <Transition name="ann-modal">
      <div
        v-if="isOpen"
        class="announcement-modal"
        :class="{ 'is-recent': isRecent }"
        @click="handleBackdropClick"
      >
        <div
          ref="cardRef"
          class="announcement-modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-modal-title"
          tabindex="-1"
        >
          <span class="ann-modal-grip" aria-hidden="true"></span>

          <header class="ann-modal-top">
            <div class="ann-modal-brand">
              <span class="ann-modal-badge" aria-hidden="true">
                <i class="fas fa-bullhorn"></i>
              </span>
              <div class="ann-modal-brand-text">
                <p class="ann-modal-eyebrow">
                  <span id="announcement-modal-title">{{ i18n.currentTranslations.announcement_notice }}</span>
                  <span v-if="latestDate" class="ann-modal-sep" aria-hidden="true"></span>
                  <span v-if="latestDate" class="ann-modal-date">{{ latestDate }}</span>
                  <span v-if="isRecent" class="ann-modal-latest">
                    {{ i18n.currentTranslations.announcements_latest }}
                  </span>
                </p>
              </div>
            </div>
            <button ref="closeBtn" class="ann-modal-close" type="button" @click="closeModal">
              <i class="fas fa-times" aria-hidden="true"></i>
              <span class="visually-hidden">关闭</span>
            </button>
          </header>

          <nav v-if="sectionTitles.length > 1" class="ann-modal-index" aria-label="公告章节">
            <button
              v-for="(title, index) in sectionTitles"
              :key="index"
              type="button"
              class="ann-index-chip"
              :class="{ 'is-active': activeSection === index }"
              @click="jumpTo(index)"
            >
              <span class="ann-index-num">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="ann-index-text">{{ title }}</span>
            </button>
          </nav>

          <div ref="bodyRef" class="ann-modal-body" @scroll.passive="handleScroll">
            <div v-if="isLoading" class="ann-modal-status">
              <LoadingDots />
            </div>
            <div v-else-if="!announcementData" class="ann-modal-status">
              {{ i18n.currentTranslations.announcements_empty }}
            </div>
            <AnnouncementContent v-else :announcement="announcementData" variant="modal" />
          </div>

          <footer class="ann-modal-foot">
            <span class="ann-modal-updated">
              {{ i18n.currentTranslations.announcement_updated }}
              <span v-if="latestDate">{{ latestDate }}</span>
            </span>
            <a class="ann-modal-cta" href="#/announcements" @click="closeModal">
              <span>{{ i18n.currentTranslations.announcement_view_all }}</span>
              <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </a>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { resolveUrl } from '@/shared/utils/url'
import { parseAnnouncement, isRecentAnnouncement } from '@/shared/utils/announcement'
import AnnouncementContent from '@/shared/components/AnnouncementContent.vue'
import LoadingDots from '@/shared/components/LoadingDots.vue'

const i18n = useI18nStore()
const isOpen = ref(false)
const isLoading = ref(false)
const announcementData = ref(null)

const cardRef = ref(null)
const closeBtn = ref(null)
const bodyRef = ref(null)
const activeSection = ref(0)

const latestDate = computed(() => (announcementData.value?.date ? formatDate(announcementData.value.date) : ''))

const isRecent = computed(() => isRecentAnnouncement(announcementData.value?.date))

const parsed = computed(() => parseAnnouncement(announcementData.value?.message || ''))
const sectionTitles = computed(() => parsed.value.sections.map((section) => section.title))

function formatDate(dateStr) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
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

const fetchAnnouncements = async () => {
  isLoading.value = true
  try {
    const res = await fetch(resolveUrl('/data/announcements.json'))
    const data = await res.json()
    const list = Array.isArray(data) ? data : []
    if (list.length === 0) {
      announcementData.value = null
      return
    }
    list.sort((a, b) => new Date(b.date) - new Date(a.date))
    announcementData.value = list[0]
  } catch {
    announcementData.value = null
  } finally {
    isLoading.value = false
  }
}

const openModal = async () => {
  isOpen.value = true
  document.body.classList.add('announcement-modal-open')
  activeSection.value = 0
  await fetchAnnouncements()
  await nextTick()
  if (bodyRef.value) bodyRef.value.scrollTop = 0
  cardRef.value?.focus({ preventScroll: true })
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

/** 章节锚点跳转：按容器内的相对坐标滚动，避免带动页面 */
const jumpTo = (index) => {
  const body = bodyRef.value
  const target = body?.querySelector(`[data-ann-section="${index}"]`)
  if (!body || !target) return
  const delta = target.getBoundingClientRect().top - body.getBoundingClientRect().top
  body.scrollTo({ top: body.scrollTop + delta - 12, behavior: 'smooth' })
  activeSection.value = index
}

const handleScroll = () => {
  const body = bodyRef.value
  if (!body) return
  const sections = body.querySelectorAll('[data-ann-section]')
  if (!sections.length) return
  const bodyRect = body.getBoundingClientRect()
  let current = 0
  sections.forEach((el, index) => {
    const offset = el.getBoundingClientRect().top - bodyRect.top + body.scrollTop
    if (offset <= body.scrollTop + 24) current = index
  })
  activeSection.value = current
}

const checkFirstVisit = () => {
  const key = 'homeAnnouncementModalShown_v1'
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, '1')
    setTimeout(openModal, 500)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('toggle-announcement', openModal)
  checkFirstVisit()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('toggle-announcement', openModal)
  document.body.classList.remove('announcement-modal-open')
})
</script>

<style scoped>
/* ==================================================
   公告弹窗：纸面 + 黄绿主题，色值统一走 --notice-*
   ================================================== */

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.announcement-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: var(--notice-scrim);
  backdrop-filter: blur(6px) saturate(1.05);
  -webkit-backdrop-filter: blur(6px) saturate(1.05);
}

.announcement-modal-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(880px, calc(100vw - 2rem));
  max-height: min(88vh, 780px);
  overflow: hidden;
  border-radius: 1.3rem;
  outline: none;
  background:
    radial-gradient(120% 60% at 100% 0%, var(--notice-accent-wash), transparent 70%),
    var(--notice-paper-solid);
  border: 1px solid var(--notice-line);
  box-shadow:
    var(--notice-shadow),
    0 1px 0 var(--notice-inset) inset;
}

/* 顶部色带 */
.announcement-modal-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, var(--notice-gold), var(--notice-accent) 55%, var(--notice-accent-strong));
  z-index: 2;
}

.ann-modal-grip {
  display: none;
}

/* ---------- 顶栏 ---------- */
.ann-modal-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem 1.5rem 1rem;
  background: linear-gradient(125deg, var(--notice-gold-soft) 0%, var(--notice-accent-200) 52%, var(--notice-accent-100) 100%);
  background-size: 180% 100%;
  border-bottom: 1px solid var(--notice-line);
}

.announcement-modal.is-recent .ann-modal-top {
  animation: ann-topbar-flow 9s ease-in-out infinite;
}

@keyframes ann-topbar-flow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.ann-modal-brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.ann-modal-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 0.85rem;
  background: linear-gradient(150deg, var(--notice-accent) 0%, var(--notice-accent-strong) 100%);
  color: var(--notice-on-accent);
  font-size: 1.05rem;
  box-shadow:
    0 8px 18px var(--notice-glow),
    0 1px 0 var(--notice-inset) inset;
}

.ann-modal-brand-text {
  min-width: 0;
}

.ann-modal-eyebrow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', 'PingFang SC', sans-serif);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--notice-accent-deep);
}

.ann-modal-sep {
  width: 1px;
  height: 0.62rem;
  background: var(--notice-line-strong);
}

.ann-modal-date {
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--notice-ink-faint);
  text-transform: none;
}

.ann-modal-latest {
  padding: 0.14rem 0.5rem;
  border-radius: 999px;
  background: var(--notice-accent-strong);
  color: var(--notice-accent-100);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
}

.ann-modal-close {
  flex-shrink: 0;
  width: 2.2rem;
  height: 2.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--notice-line);
  background: var(--notice-paper);
  color: var(--notice-ink-soft);
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.18s ease, color 0.18s ease, background-color 0.18s ease;
}

.ann-modal-close:hover {
  transform: rotate(90deg);
  color: var(--notice-accent-deep);
  background: var(--notice-paper-solid);
}

.ann-modal-close:focus-visible {
  outline: 2px solid var(--notice-accent);
  outline-offset: 2px;
}

/* ---------- 章节索引 ---------- */
.ann-modal-index {
  display: flex;
  gap: 0.45rem;
  padding: 0.7rem 1.5rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--notice-line);
  background: var(--notice-paper);
  scrollbar-width: none;
}

.ann-modal-index::-webkit-scrollbar {
  display: none;
}

.ann-index-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
  padding: 0.34rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--notice-line);
  background: transparent;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--notice-ink-soft);
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.ann-index-chip:hover {
  background: var(--notice-accent-wash);
  color: var(--notice-accent-deep);
}

.ann-index-chip.is-active {
  background: var(--notice-accent-200);
  border-color: var(--notice-accent-veil);
  color: var(--notice-accent-deep);
}

.ann-index-num {
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  color: var(--notice-accent-strong);
}

.ann-index-chip.is-active .ann-index-num {
  color: var(--notice-accent-deep);
}

/* ---------- 正文滚动区 ---------- */
.ann-modal-body {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1.25rem 1.5rem 1.35rem;
  scrollbar-width: thin;
  scrollbar-color: var(--notice-accent-veil) transparent;
}

.ann-modal-body::-webkit-scrollbar {
  width: 6px;
}

.ann-modal-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--notice-accent-veil);
}

.ann-modal-status {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 9rem;
  color: var(--notice-ink-soft);
  font-size: 0.9rem;
}

/* ---------- 底栏 ---------- */
.ann-modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.5rem 1rem;
  border-top: 1px solid var(--notice-line);
  background: linear-gradient(180deg, transparent, var(--notice-accent-wash));
}

.ann-modal-updated {
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: var(--notice-ink-faint);
}

.ann-modal-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.58rem 1.05rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--notice-accent) 0%, var(--notice-accent-strong) 100%);
  color: var(--notice-on-accent);
  font-family: var(--font-ui, -apple-system, 'Segoe UI', 'PingFang SC', sans-serif);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 8px 18px var(--notice-glow);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.ann-modal-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px var(--notice-glow);
}

.ann-modal-cta:focus-visible {
  outline: 2px solid var(--notice-accent-strong);
  outline-offset: 2px;
}

/* ---------- 过渡 ---------- */
.ann-modal-enter-active,
.ann-modal-leave-active {
  transition: opacity 0.26s ease;
}

.ann-modal-enter-from,
.ann-modal-leave-to {
  opacity: 0;
}

.ann-modal-enter-active .announcement-modal-card,
.ann-modal-leave-active .announcement-modal-card {
  transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.25, 1), opacity 0.26s ease;
}

.ann-modal-enter-from .announcement-modal-card,
.ann-modal-leave-to .announcement-modal-card {
  opacity: 0;
  transform: translateY(14px) scale(0.965);
}

body.announcement-modal-open {
  overflow: hidden;
}

/* ---------- 移动端：底部纸片 ---------- */
@media (max-width: 720px) {
  .announcement-modal {
    align-items: flex-end;
    padding: 0;
  }

  .announcement-modal-card {
    width: 100%;
    max-height: 92vh;
    border-radius: 1.35rem 1.35rem 0 0;
    border-bottom: none;
  }

  .ann-modal-grip {
    display: block;
    width: 2.4rem;
    height: 0.28rem;
    margin: 0.55rem auto 0.15rem;
    border-radius: 999px;
    background: var(--notice-line-strong);
    flex-shrink: 0;
  }

  .ann-modal-top {
    padding: 0.75rem 1.1rem 0.85rem;
  }

  .ann-modal-badge {
    width: 2.2rem;
    height: 2.2rem;
    font-size: 0.92rem;
  }

  .ann-modal-index {
    padding: 0.6rem 1.1rem;
  }

  .ann-modal-body {
    padding: 1rem 1.1rem 1.15rem;
  }

  .ann-modal-foot {
    padding: 0.7rem 1.1rem 0.9rem;
  }

  .ann-modal-updated {
    display: none;
  }

  .ann-modal-cta {
    width: 100%;
    justify-content: center;
  }

  .ann-modal-enter-from .announcement-modal-card,
  .ann-modal-leave-to .announcement-modal-card {
    transform: translateY(100%) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ann-modal-enter-active,
  .ann-modal-leave-active,
  .ann-modal-enter-active .announcement-modal-card,
  .ann-modal-leave-active .announcement-modal-card {
    transition: none;
  }

  .announcement-modal.is-recent .ann-modal-top {
    animation: none;
  }

  .ann-modal-enter-from .announcement-modal-card,
  .ann-modal-leave-to .announcement-modal-card {
    transform: none;
  }
}
</style>
