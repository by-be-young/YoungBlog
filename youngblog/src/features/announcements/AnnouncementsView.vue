<!-- AnnouncementsView.vue - 公告列表（发布记录式阅读页） -->
<template>
  <main class="announcements-page">
    <section class="announcements-section">
      <div class="container">
        <header class="ann-masthead">
          <p class="ann-masthead__eyebrow">
            <span>NOTICE BOARD</span>
            <span v-if="sortedAnnouncements.length" class="ann-masthead__count">
              {{ String(sortedAnnouncements.length).padStart(2, '0') }}
            </span>
          </p>
          <h1 class="announcements-title">{{ i18n.currentTranslations.announcements_title }}</h1>
        </header>

        <div v-if="isLoading" class="announcements-status">
          <LoadingDots :label="i18n.currentTranslations.announcements_empty" />
        </div>
        <div v-else-if="sortedAnnouncements.length === 0" class="announcements-status">
          {{ i18n.currentTranslations.announcements_empty }}
        </div>

        <div v-else class="announcements-list">
          <article
            v-for="(item, index) in sortedAnnouncements"
            :key="item.id || index"
            class="ann-entry"
          >
            <aside class="ann-entry__date">
              <time :datetime="item.date">
                <span class="ann-entry__day">{{ dateParts(item.date).day }}</span>
                <span class="ann-entry__month">{{ dateParts(item.date).monthYear }}</span>
              </time>
            </aside>

            <div class="ann-entry__card">
              <div
                class="ann-entry__body"
                :class="{ 'is-collapsed': isCollapsible(item) && !isExpanded(item) }"
              >
                <AnnouncementContent :announcement="item" variant="card" />
              </div>

              <div v-if="isCollapsible(item)" class="ann-entry__foot">
                <button type="button" class="ann-entry__toggle" @click="toggle(item)">
                  <span>{{ isExpanded(item) ? i18n.currentTranslations.announcements_collapse : i18n.currentTranslations.announcements_expand }}</span>
                  <i :class="isExpanded(item) ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { resolveUrl } from '@/shared/utils/url'
import AnnouncementContent from '@/shared/components/AnnouncementContent.vue'
import LoadingDots from '@/shared/components/LoadingDots.vue'

const i18n = useI18nStore()

// ===== 数据 =====
const isLoading = ref(false)
const announcements = ref([])
const expanded = ref({})

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
const dateParts = (dateStr) => {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return { day: '', monthYear: '' }
  return {
    day: String(date.getDate()).padStart(2, '0'),
    monthYear: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`,
  }
}

/** 长公告才提供展开/收起，短公告直接铺开 */
const isCollapsible = (item) => String(item?.message || '').length > 260

const itemKey = (item) => item?.id ?? item?.date ?? item?.message

const isExpanded = (item) => expanded.value[itemKey(item)] === true

const toggle = (item) => {
  const key = itemKey(item)
  expanded.value = { ...expanded.value, [key]: !isExpanded(item) }
}

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
onMounted(fetchAnnouncements)
</script>

<style scoped>
/* ==================================================
   公告页：发布记录式列表，纸面 + 黄绿主题
   ================================================== */

.announcements-page {
  position: relative;
  padding: 6.5rem 0 5rem;
}

.announcements-section {
  padding: 0 1.5rem;
}

.container {
  width: 100%;
  max-width: 62rem;
  margin: 0 auto;
  padding: 0;
}

/* ---------- 报头 ---------- */
.ann-masthead {
  position: relative;
  margin: 0 0 1.6rem;
  padding: 1.35rem 1.6rem 1.2rem;
  border-radius: 1.15rem;
  border: 1px solid var(--notice-line);
  background:
    radial-gradient(110% 120% at 100% 0%, var(--notice-accent-wash), transparent 60%),
    var(--notice-paper-solid);
  box-shadow:
    var(--notice-shadow-soft),
    0 1px 0 var(--notice-inset) inset;
  overflow: hidden;
}

.ann-masthead::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--notice-gold), var(--notice-accent) 56%, var(--notice-accent-strong));
}

.ann-masthead__eyebrow {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0 0 0.5rem;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', 'PingFang SC', sans-serif);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: var(--notice-ink-faint);
}

.ann-masthead__count {
  padding: 0.12rem 0.4rem;
  border-radius: 0.35rem;
  border: 1px solid var(--notice-accent-veil);
  background: var(--notice-accent-wash);
  color: var(--notice-accent-deep);
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
}

.announcements-title {
  margin: 0;
  font-size: clamp(2.4rem, 4.4vw, 3.2rem);
  font-weight: 900;
  line-height: 1.04;
  letter-spacing: -0.01em;
  background: linear-gradient(100deg, var(--notice-accent-deep) 0%, var(--notice-accent-strong) 58%, var(--notice-accent) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 12px 26px rgba(23, 34, 47, 0.08));
}

.announcements-status {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 12rem;
  color: var(--notice-ink-soft);
  font-size: 0.95rem;
}

/* ---------- 列表 ---------- */
.announcements-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-left: 0.25rem;
}

.ann-entry {
  display: grid;
  grid-template-columns: 4.6rem minmax(0, 1fr);
  gap: 1.1rem;
  align-items: start;
}

/* ---------- 日期列 ---------- */
.ann-entry__date {
  position: sticky;
  top: 6rem;
  display: flex;
  justify-content: flex-end;
  padding: 0.65rem 0.55rem 0 0;
}

.ann-entry__date time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.05rem;
  min-width: 3.3rem;
  padding: 0.5rem 0.55rem 0.55rem;
  text-align: right;
  border-radius: 0.68rem;
  border: 1px solid var(--notice-line);
  background: var(--notice-paper-solid);
  box-shadow:
    var(--notice-shadow-soft),
    0 1px 0 var(--notice-inset) inset;
}

.ann-entry__day {
  font-family: var(--font-ui, -apple-system, 'Segoe UI', 'PingFang SC', sans-serif);
  font-size: 1.32rem;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--notice-accent-deep);
}

.ann-entry__month {
  font-family: var(--font-ui, -apple-system, 'Segoe UI', 'PingFang SC', sans-serif);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--notice-ink-faint);
}

/* ---------- 卡片 ---------- */
.ann-entry__card {
  position: relative;
  padding: 1.15rem 1.35rem;
  border-radius: 1.1rem;
  border: 1px solid var(--notice-line);
  background:
    radial-gradient(120% 70% at 100% 0%, var(--notice-accent-wash), transparent 62%),
    var(--notice-paper-solid);
  box-shadow:
    var(--notice-shadow-soft),
    0 1px 0 var(--notice-inset) inset;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.ann-entry__card:hover {
  border-color: var(--notice-accent-veil);
  transform: translateY(-1px);
}

.ann-entry__body {
  position: relative;
  overflow: hidden;
  transition: max-height 0.32s ease;
  max-height: none;
}

.ann-entry__body.is-collapsed {
  max-height: 17rem;
}

.ann-entry__body.is-collapsed::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4rem;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 0%, var(--notice-paper-solid) 74%);
}

.ann-entry__foot {
  display: flex;
  justify-content: center;
  margin-top: 0.6rem;
  padding-top: 0.7rem;
  border-top: 1px dashed var(--notice-line);
}

.ann-entry__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--notice-accent-veil);
  background: var(--notice-accent-wash);
  color: var(--notice-accent-deep);
  font-family: var(--font-ui, -apple-system, 'Segoe UI', 'PingFang SC', sans-serif);
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.ann-entry__toggle:hover {
  background: var(--notice-accent-200);
  box-shadow: 0 6px 14px var(--notice-glow);
}

.ann-entry__toggle:focus-visible {
  outline: 2px solid var(--notice-accent-strong);
  outline-offset: 2px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 880px) {
  .announcements-page {
    padding: 5.5rem 0 7rem;
  }

  .announcements-section {
    padding: 0 1rem;
  }

  .ann-masthead {
    margin-bottom: 1.4rem;
  }

  .announcements-title {
    font-size: 2rem;
  }

  .ann-entry {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.45rem;
  }

  .ann-entry__date {
    position: static;
    padding: 0;
    justify-content: flex-start;
  }

  .ann-entry__date time {
    flex-direction: row;
    align-items: baseline;
    gap: 0.4rem;
    min-width: 0;
    padding: 0.32rem 0.6rem;
    text-align: left;
  }

  .ann-entry__day {
    font-size: 1.05rem;
  }

  .ann-entry__month {
    font-size: 0.68rem;
  }

  .ann-entry__card {
    padding: 0.95rem 1rem;
    border-radius: 0.95rem;
  }

  .ann-entry__body.is-collapsed {
    max-height: 17rem;
  }

  .ann-entry__body.is-collapsed::after {
    height: 3.2rem;
    background: linear-gradient(180deg, transparent 0%, var(--notice-paper-solid) 78%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ann-entry__card,
  .ann-entry__body,
  .ann-entry__toggle {
    transition: none;
  }
}
</style>
