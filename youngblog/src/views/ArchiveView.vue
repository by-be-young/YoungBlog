<template>
  <main class="archive-page">
    <section class="archive-section">
      <div class="archive-layout">
        <!-- 主时间轴 -->
        <div class="archive-main">
          <div
            class="archive-timeline"
            :class="{ drum: isDesktopDrum }"
            ref="timelineRef"
            @scroll="onTimelineScroll"
          >
            <!-- 标题头 -->
            <div class="timeline-item timeline-header">
              <div class="timeline-header-content" data-i18n="archive_timeline_title">
                {{ i18n.currentTranslations.archive_timeline_title }}
              </div>
            </div>

            <!-- 动态生成年份、月份、博客条目 -->
            <template v-for="(group, index) in timelineGroups" :key="index">
              <!-- 年份分隔 -->
              <div
                v-if="group.type === 'year'"
                class="timeline-item timeline-separator timeline-separator-year"
              >
                <div class="timeline-separator-content">
                  <span class="timeline-separator-pattern">✦ ✦ ✦</span>
                  <span class="timeline-separator-label">{{ group.label }}</span>
                  <span class="timeline-separator-pattern">✦ ✦ ✦</span>
                </div>
              </div>

              <!-- 月份分隔 -->
              <div
                v-else-if="group.type === 'month'"
                class="timeline-item timeline-separator timeline-separator-month"
              >
                <div class="timeline-separator-content">
                  <span class="timeline-separator-pattern">✦ ✦ ✦</span>
                  <span class="timeline-separator-label">{{ group.label }}</span>
                  <span class="timeline-separator-pattern">✦ ✦ ✦</span>
                </div>
              </div>

              <!-- 博客条目 -->
              <div
                v-else
                class="timeline-item"
                :data-date="group.blog.date"
                :class="{ 'timeline-item-enter': shouldAnimate }"
                :style="{ '--timeline-enter-delay': `${index * 120}ms` }"
              >
                <a class="timeline-link" :href="`#/blog/${group.blog.id}`">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <div class="timeline-badge" aria-hidden="true"></div>
                    <div class="timeline-left">
                      <div class="timeline-title">
                        <span class="title-text">{{ group.blog.title }}</span>
                        <span v-if="group.blog.type" class="blog-type">{{ group.blog.type }}</span>
                      </div>
                      <div class="timeline-excerpt">{{ group.blog.excerpt || '' }}</div>
                    </div>
                    <div class="timeline-right">
                      <div class="timeline-date date" :data-date="group.blog.date">
                        {{ formatDate(group.blog.date) }}
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            </template>
          </div>
        </div>

        <!-- 侧边栏 -->
        <aside class="archive-sidebar" aria-label="归档日历">
          <div class="calendar-card" id="calendarCard">
            <div class="calendar-top">
              <div class="calendar-top-row">
                <div class="calendar-view-toggle" role="tablist" ref="viewToggleRef">
                  <button
                    class="calendar-toggle-btn"
                    :class="{ active: calendarView === 'month' }"
                    type="button"
                    data-view="month"
                    role="tab"
                    :aria-selected="calendarView === 'month'"
                    @click="setCalendarView('month')"
                  >
                    {{ i18n.currentTranslations.view_month }}
                  </button>
                  <button
                    class="calendar-toggle-btn"
                    :class="{ active: calendarView === 'year' }"
                    type="button"
                    data-view="year"
                    role="tab"
                    :aria-selected="calendarView === 'year'"
                    @click="setCalendarView('year')"
                  >
                    {{ i18n.currentTranslations.view_year }}
                  </button>
                </div>
                <button class="calendar-today-btn" type="button" id="calToday" @click="goToToday">
                  <i class="fas fa-location-crosshairs"></i>
                  <span>{{ i18n.currentTranslations.locate_today }}</span>
                </button>
              </div>
            </div>

            <div class="calendar-nav">
              <button class="calendar-nav-btn" type="button" id="calPrev" @click="prevPeriod">
                <i class="fas fa-chevron-left"></i>
              </button>
              <div class="calendar-nav-label" id="calLabel" ref="calLabelRef">{{ calendarLabel }}</div>
              <button class="calendar-nav-btn" type="button" id="calNext" @click="nextPeriod">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>

            <div class="calendar-body" id="calendarBody" ref="calendarBodyRef" v-html="calendarHtml"></div>
          </div>

          <div class="archive-filter-panel" id="archiveFilterPanel">
            <div class="archive-filter-toggle" id="archiveFilterToggle" ref="filterToggleRef" role="radiogroup">
              <button
                v-for="filter in filters"
                :key="filter.key"
                class="archive-filter-btn"
                :class="{ active: currentFilter === filter.key }"
                type="button"
                :data-filter="filter.key"
                role="radio"
                :aria-checked="currentFilter === filter.key"
                @click="setFilter(filter.key)"
              >
                {{ i18n.currentTranslations[filter.labelKey] }}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <!-- 移动端悬浮按钮 -->
    <button id="calendarFab" class="calendar-fab" @click="openCalendarModal" aria-label="打开日历" aria-hidden="true">
      <i class="fas fa-calendar-alt" aria-hidden="true"></i>
    </button>

    <!-- 移动端模态框 -->
    <div
      id="calendarModal"
      class="calendar-modal"
      :class="{ open: isModalOpen, 'open-prep': isModalPreparing, closing: isModalClosing }"
      aria-hidden="true"
    >
      <div class="calendar-modal-backdrop" data-role="backdrop" @click="closeCalendarModal"></div>
      <div class="calendar-modal-inner" role="dialog" aria-modal="true">
        <button class="calendar-modal-close" @click="closeCalendarModal" aria-label="关闭日历">
          <i class="fas fa-times"></i>
        </button>
        <div class="calendar-modal-body" ref="modalBodyRef"></div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'

const i18n = useI18nStore()
const blogStore = useBlogStore()

// DOM refs
const timelineRef = ref(null)
const calendarBodyRef = ref(null)
const calLabelRef = ref(null)
const modalBodyRef = ref(null)
const viewToggleRef = ref(null)
const filterToggleRef = ref(null)

// 状态
const currentFilter = ref('all')
const calendarView = ref('month')
const cursorDate = ref(new Date())
const isDesktopDrum = ref(window.innerWidth > 900)
const isModalOpen = ref(false)
const isModalPreparing = ref(false)
const isModalClosing = ref(false)
const shouldAnimate = ref(true)
let scrollTimer = null

const filters = [
  { key: 'learning', labelKey: 'archive_filter_learning' },
  { key: 'all', labelKey: 'archive_filter_all' },
  { key: 'non-learning', labelKey: 'archive_filter_non_learning' }
]

// ================== 计算属性 ==================

const filteredBlogs = computed(() => {
  let blogs = blogStore.blogs.slice()
  if (currentFilter.value === 'learning') {
    blogs = blogs.filter(b => blogStore.isLearningBlog(b))
  } else if (currentFilter.value === 'non-learning') {
    blogs = blogs.filter(b => !blogStore.isLearningBlog(b))
  }
  return blogs.sort((a, b) => new Date(b.date) - new Date(a.date))
})

const timelineGroups = computed(() => {
  const groups = []
  let lastYear = ''
  let lastMonth = ''

  filteredBlogs.value.forEach((blog) => {
    const date = new Date(blog.date)
    if (isNaN(date)) return
    const year = String(date.getFullYear())
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const yearMonth = `${year}-${month}`

    if (year !== lastYear) {
      groups.push({ type: 'year', label: `${year}年` })
      lastYear = year
    }
    if (yearMonth !== lastMonth) {
      const lang = i18n.getLang()
      let monthLabel = ''
      if (lang === 'en') {
        monthLabel = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(date)
      } else if (lang === 'ja') {
        monthLabel = `${year}年${month}月`
      } else {
        monthLabel = `${year}年${month}月`
      }
      groups.push({ type: 'month', label: monthLabel })
      lastMonth = yearMonth
    }

    groups.push({ type: 'blog', blog })
  })

  return groups
})

// 日期统计
const dateCountMap = computed(() => {
  const map = new Map()
  filteredBlogs.value.forEach(blog => {
    const d = new Date(blog.date)
    if (!isNaN(d)) {
      const key = d.toISOString().slice(0, 10)
      map.set(key, (map.get(key) || 0) + 1)
    }
  })
  return map
})

const monthCountMap = computed(() => {
  const map = new Map()
  filteredBlogs.value.forEach(blog => {
    const d = new Date(blog.date)
    if (!isNaN(d)) {
      const key = d.toISOString().slice(0, 7)
      map.set(key, (map.get(key) || 0) + 1)
    }
  })
  return map
})

const monthMaxDateMap = computed(() => {
  const map = new Map()
  filteredBlogs.value.forEach(blog => {
    const d = new Date(blog.date)
    if (!isNaN(d)) {
      const key = d.toISOString().slice(0, 7)
      const current = map.get(key)
      if (!current || d > current) map.set(key, d)
    }
  })
  return map
})

// 热力等级
const heatLevel = (count) => {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 4) return 2
  return 3
}
const monthHeatLevel = (count) => {
  if (count <= 0) return 0
  if (count <= 10) return 1
  if (count <= 20) return 2
  return 3
}

// 日历标签
const calendarLabel = computed(() => {
  const y = cursorDate.value.getFullYear()
  const m = cursorDate.value.getMonth()
  const lang = i18n.getLang()
  if (calendarView.value === 'year') {
    if (lang === 'ja' && y >= 2019) {
      const reiwa = y - 2018
      const era = reiwa === 1 ? '（令和元年）' : `（令和${reiwa}年）`
      return `${y}年 ${era}`
    }
    return `${y}年`
  }
  try {
    const locale = lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US'
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(new Date(y, m, 1))
  } catch {
    return `${y}年${m+1}月`
  }
})

// 渲染日历 HTML（完全照搬老代码的字符串拼接）
function renderMonthView(year, month, weekStart, lang) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  let weekdays = ['一', '二', '三', '四', '五', '六', '日']
  if (lang === 'en') {
    weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  } else if (lang === 'ja') {
    weekdays = ['月', '火', '水', '木', '金', '土', '日']
  }
  if (weekStart === 0) {
    weekdays = [weekdays[6], ...weekdays.slice(0, 6)]
  }

  let html = '<div class="cal-grid">'
  weekdays.forEach(w => {
    html += `<div class="cal-weekday">${w}</div>`
  })

  const offset = (firstDay + 7 - (weekStart || 0)) % 7
  for (let i = 0; i < offset; i++) {
    html += '<div class="cal-cell muted"></div>'
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d)
    const key = dateObj.toISOString().slice(0, 10)
    const count = dateCountMap.value.get(key) || 0
    const has = count > 0
    const level = heatLevel(count)
    const cls = has ? `cal-cell has-posts heat-${level}` : 'cal-cell'
    const tip = has ? ` data-tip="${count} 篇"` : ''
    const target = has ? ` data-target-date="${key}"` : ''
    html += `<div class="${cls}"${tip}${target}><span>${d}</span></div>`
  }
  html += '</div>'
  return html
}

function renderYearView(year, lang) {
  let html = '<div class="cal-year-grid">'
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m+1).padStart(2,'0')}`
    const count = monthCountMap.value.get(key) || 0
    const has = count > 0
    const level = monthHeatLevel(count)
    const cls = has ? `cal-month has-posts heat-${level}` : 'cal-month'
    const tip = has ? ` data-tip="${count} 篇"` : ''
    const target = has ? ` data-target-month="${key}"` : ''
    let label = `${m+1}月`
    if (lang === 'en') {
      try {
        label = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(year, m, 1))
      } catch {}
    }
    html += `<div class="${cls}"${tip}${target}><span>${label}</span></div>`
  }
  html += '</div>'
  return html
}

const calendarHtml = computed(() => {
  const y = cursorDate.value.getFullYear()
  const m = cursorDate.value.getMonth()
  const lang = i18n.getLang()
  const weekStart = lang === 'zh' ? 1 : 0

  if (calendarView.value === 'year') {
    return renderYearView(y, lang)
  } else {
    return renderMonthView(y, m, weekStart, lang)
  }
})

// 日历导航
function prevPeriod() {
  const d = new Date(cursorDate.value)
  if (calendarView.value === 'year') d.setFullYear(d.getFullYear() - 1)
  else d.setMonth(d.getMonth() - 1)
  cursorDate.value = d
}
function nextPeriod() {
  const d = new Date(cursorDate.value)
  if (calendarView.value === 'year') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  cursorDate.value = d
}
function goToToday() {
  cursorDate.value = new Date()
}
function setCalendarView(view) {
  calendarView.value = view
  nextTick(updateToggleBackground)
}

// 日历点击跳转
function handleCalendarClick(e) {
  const dayEl = e.target.closest?.('.cal-cell.has-posts')
  if (dayEl?.dataset?.targetDate) {
    jumpToDate(dayEl.dataset.targetDate)
    return
  }
  const monthEl = e.target.closest?.('.cal-month.has-posts')
  if (monthEl?.dataset?.targetMonth) {
    const ym = monthEl.dataset.targetMonth
    const maxDate = monthMaxDateMap.value.get(ym)
    if (maxDate) {
      const key = maxDate.toISOString().slice(0, 10)
      jumpToDate(key)
    }
  }
}

function jumpToDate(ymd) {
  const timeline = timelineRef.value
  if (!timeline) return
  const el = timeline.querySelector(`.timeline-item[data-date="${ymd}"]`)
  if (!el) return

  const block = isDesktopDrum.value ? 'center' : 'start'
  el.scrollIntoView({ behavior: 'smooth', block })
  el.classList.add('flash')
  setTimeout(() => el.classList.remove('flash'), 900)

  if (isDesktopDrum.value) {
    requestAnimationFrame(() => updateDrum())
    setTimeout(() => updateDrum(), 220)
  }
}

// 滚筒效果
function updateDrum() {
  const timeline = timelineRef.value
  if (!timeline || !isDesktopDrum.value) return
  const rect = timeline.getBoundingClientRect()
  const centerY = rect.top + rect.height / 2
  const denom = Math.max(1, rect.height / 2)

  const items = timeline.querySelectorAll('.timeline-item .timeline-content')
  items.forEach((content) => {
    const r = content.getBoundingClientRect()
    const itemCenter = r.top + r.height / 2
    let d = (itemCenter - centerY) / denom
    d = Math.max(-1.25, Math.min(1.25, d))
    const ad = Math.abs(d)
    content.style.setProperty('--d', d.toFixed(3))
    content.style.setProperty('--ad', ad.toFixed(3))
  })
}

function onTimelineScroll() {
  if (!isDesktopDrum.value) return
  if (scrollTimer) cancelAnimationFrame(scrollTimer)
  scrollTimer = requestAnimationFrame(() => {
    updateDrum()
    scrollTimer = null
  })
}

function computeDrumPadding() {
  const timeline = timelineRef.value
  if (!timeline || !isDesktopDrum.value) return
  const rect = timeline.getBoundingClientRect()
  const h = rect.height
  if (!h) return
  const contents = timeline.querySelectorAll('.timeline-item .timeline-content')
  if (contents.length === 0) return
  let maxH = 0
  contents.forEach(el => {
    const r = el.getBoundingClientRect()
    if (r.height > maxH) maxH = r.height
  })
  const pad = Math.max(0, h / 2 - maxH / 2)
  timeline.style.setProperty('--drum-pad', `${Math.round(pad)}px`)
}

// 筛选
function setFilter(key) {
  currentFilter.value = key
  shouldAnimate.value = false
  nextTick(() => {
    shouldAnimate.value = true
    const timeline = timelineRef.value
    if (timeline) timeline.scrollTop = 0
    if (isDesktopDrum.value) {
      setTimeout(() => {
        updateDrum()
        computeDrumPadding()
      }, 100)
    }
    updateFilterBackground()
  })
}

// 更新筛选高亮背景
function updateFilterBackground() {
  const toggle = filterToggleRef.value
  if (!toggle) return
  const activeBtn = toggle.querySelector('.archive-filter-btn.active')
  if (!activeBtn) return
  const containerRect = toggle.getBoundingClientRect()
  const btnRect = activeBtn.getBoundingClientRect()
  const top = btnRect.top - containerRect.top
  const height = btnRect.height
  toggle.style.setProperty('--filter-bg-top', top + 'px')
  toggle.style.setProperty('--filter-bg-height', height + 'px')
}

// 更新日历切换背景
function updateToggleBackground() {
  const toggle = viewToggleRef.value
  if (!toggle) return
  const activeBtn = toggle.querySelector('.calendar-toggle-btn.active')
  if (!activeBtn) return
  const containerRect = toggle.getBoundingClientRect()
  const btnRect = activeBtn.getBoundingClientRect()
  const left = btnRect.left - containerRect.left
  const width = btnRect.width
  toggle.style.setProperty('--bg-left', left + 'px')
  toggle.style.setProperty('--bg-width', width + 'px')
}

// 模态框
function openCalendarModal() {
  if (isModalOpen.value || isModalPreparing.value || isModalClosing.value) return
  const sidebar = document.querySelector('.archive-sidebar')
  const calendarCard = document.getElementById('calendarCard')
  const filterPanel = document.getElementById('archiveFilterPanel')
  if (modalBodyRef.value && calendarCard && filterPanel) {
    modalBodyRef.value.innerHTML = ''
    modalBodyRef.value.appendChild(calendarCard.cloneNode(true))
    modalBodyRef.value.appendChild(filterPanel.cloneNode(true))
  }

  isModalPreparing.value = true
  document.body.style.overflow = 'hidden'
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      isModalPreparing.value = false
      isModalOpen.value = true
    })
  })
}

function closeCalendarModal() {
  if (!isModalOpen.value && !isModalPreparing.value) return
  isModalOpen.value = false
  isModalClosing.value = true
  setTimeout(() => {
    isModalClosing.value = false
    document.body.style.overflow = ''
  }, 300)
}

// 工具
function formatDate(dateStr) {
  const date = new Date(dateStr)
  if (isNaN(date)) return dateStr
  const lang = i18n.getLang()
  try {
    if (lang === 'en') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    if (lang === 'ja') {
      const y = date.getFullYear()
      const m = date.getMonth() + 1
      const d = date.getDate()
      let era = ''
      if (y >= 2019) {
        const reiwa = y - 2018
        era = reiwa === 1 ? '（令和元年）' : `（令和${reiwa}年）`
      }
      return `${y}年${m}月${d}日 ${era}`
    }
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

// ================== 生命周期 ==================
onMounted(() => {
  if (!blogStore.blogs.length) {
    blogStore.fetchBlogs()
  }

  const handleResize = () => {
    const wasDrum = isDesktopDrum.value
    isDesktopDrum.value = window.innerWidth > 900
    if (isDesktopDrum.value && !wasDrum) {
      nextTick(() => {
        computeDrumPadding()
        updateDrum()
      })
    } else if (!isDesktopDrum.value && wasDrum) {
      const timeline = timelineRef.value
      if (timeline) {
        timeline.style.removeProperty('--drum-pad')
        timeline.querySelectorAll('.timeline-content').forEach(el => {
          el.style.removeProperty('--d')
          el.style.removeProperty('--ad')
        })
      }
    }
    nextTick(() => {
      updateToggleBackground()
      updateFilterBackground()
    })
  }

  window.addEventListener('resize', handleResize)

  const calendarBody = calendarBodyRef.value
  if (calendarBody) {
    calendarBody.addEventListener('click', handleCalendarClick)
  }

  const langHandler = () => {
    nextTick(() => {
      updateToggleBackground()
      updateFilterBackground()
    })
  }
  window.addEventListener('site:languageChanged', langHandler)

  nextTick(() => {
    if (isDesktopDrum.value) {
      computeDrumPadding()
      updateDrum()
    }
    const timeline = timelineRef.value
    if (timeline) {
      const firstItem = timeline.querySelector('.timeline-item[data-date]')
      if (firstItem) {
        const block = isDesktopDrum.value ? 'center' : 'start'
        firstItem.scrollIntoView({ behavior: 'auto', block })
        if (isDesktopDrum.value) {
          setTimeout(updateDrum, 200)
        }
      }
    }
    updateToggleBackground()
    updateFilterBackground()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('site:languageChanged', langHandler)
    if (calendarBody) calendarBody.removeEventListener('click', handleCalendarClick)
    if (scrollTimer) cancelAnimationFrame(scrollTimer)
  })
})

watch(calendarView, () => {
  nextTick(updateToggleBackground)
})

watch(filteredBlogs, () => {
  nextTick(() => {
    if (isDesktopDrum.value) {
      computeDrumPadding()
      updateDrum()
    }
  })
})
</script>

<style>
/* ==================================================
   完全复制 archive.css，仅外层包裹 .archive-page
   不做任何修改
   ================================================== */

.archive-page {
  --archive-pink: #ffb6c9;
  --archive-peach: #ffd2a6;
  --archive-mint: #a7f3d0;
  --archive-sky: #9ad7ff;
  --archive-text: #2b3440;
  --archive-muted: #5f6b7a;
  --archive-card-shadow: 0 16px 34px rgba(44, 62, 80, 0.14);
  --archive-border: linear-gradient(135deg, var(--archive-pink), var(--archive-mint), rgba(199, 182, 255, 0.9));
}

.archive-page .archive-section {
  padding-top: 80px;
  padding-bottom: 40px;
  padding-left: 20px;
  padding-right: 20px;
}
.archive-page .archive-layout {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 22px;
  align-items: flex-start;
}
.archive-page .archive-main {
  flex: 1;
  min-width: 0;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: none;
  border-radius: 0;
  padding: 14px;
  background:
    linear-gradient(to bottom,
      rgba(255, 182, 201, 0) 0%,
      rgba(255, 182, 201, 0.2) 24%,
      rgba(154, 215, 255, 0.28) 50%,
      rgba(167, 243, 208, 0.2) 76%,
      rgba(167, 243, 208, 0) 100%) padding-box,
    linear-gradient(to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.08) 50%,
      rgba(255, 255, 255, 0) 100%);
  box-shadow: none;
}
.archive-page .archive-main::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  pointer-events: none;
  z-index: 0;
  background:
    linear-gradient(to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.12) 50%,
      rgba(255, 255, 255, 0) 100%);
  backdrop-filter: blur(12px) saturate(1.06);
  -webkit-backdrop-filter: blur(12px) saturate(1.06);
  -webkit-mask-image: linear-gradient(to bottom,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0) 16%,
      rgba(0, 0, 0, 1) 38%,
      rgba(0, 0, 0, 1) 62%,
      rgba(0, 0, 0, 0) 84%,
      rgba(0, 0, 0, 0) 100%);
  mask-image: linear-gradient(to bottom,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0) 16%,
      rgba(0, 0, 0, 1) 38%,
      rgba(0, 0, 0, 1) 62%,
      rgba(0, 0, 0, 0) 84%,
      rgba(0, 0, 0, 0) 100%);
}
.archive-page .archive-main::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    linear-gradient(180deg,
      rgba(255, 182, 201, 0.34),
      rgba(154, 215, 255, 0.42),
      rgba(167, 243, 208, 0.34)) left center / 4px 100% no-repeat,
    linear-gradient(180deg,
      rgba(255, 182, 201, 0.34),
      rgba(154, 215, 255, 0.42),
      rgba(167, 243, 208, 0.34)) right center / 4px 100% no-repeat;
  -webkit-mask-image: linear-gradient(to bottom,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0) 16%,
      rgba(0, 0, 0, 1) 38%,
      rgba(0, 0, 0, 1) 62%,
      rgba(0, 0, 0, 0) 84%,
      rgba(0, 0, 0, 0) 100%);
  mask-image: linear-gradient(to bottom,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0) 16%,
      rgba(0, 0, 0, 1) 38%,
      rgba(0, 0, 0, 1) 62%,
      rgba(0, 0, 0, 0) 84%,
      rgba(0, 0, 0, 0) 100%);
}
.archive-page .archive-main>* {
  position: relative;
  z-index: 1;
}
.archive-page .archive-sidebar {
  width: 340px;
  flex: 0 0 340px;
  position: sticky;
  top: 88px;
}
.archive-page .archive-timeline {
  position: relative;
  margin: 0;
  padding: 22px 0 22px 42px;
  max-width: none;
  border-radius: 18px;
  box-shadow: var(--shadow);
}
.archive-page .timeline-item {
  position: relative;
  margin-bottom: 40px;
}
.archive-page .timeline-header {
  margin: 0;
  padding: 80px 0 90px 0;
  display: flex;
  justify-content: center;
  scroll-snap-align: start;
}
.archive-page .timeline-header .timeline-header-content {
  width: min(1100px, 100%);
  text-align: center;
  font-size: 4.2rem;
  font-weight: 900;
  line-height: 1.02;
  padding: 16px 0 22px 0;
  background: linear-gradient(90deg, #b83b66 0%, #2f6fa9 52%, #1f7a5e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 14px 30px rgba(44, 62, 80, 0.26), 0 4px 10px rgba(255, 255, 255, 0.32);
  filter: drop-shadow(0 14px 36px rgba(44, 62, 80, 0.14));
}
.archive-page .timeline-separator {
  margin: 0;
  padding: 8px 0;
}
.archive-page .timeline-separator .timeline-separator-content {
  width: min(820px, 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 6px 4px;
  border: none;
  background: transparent;
  box-shadow: none;
}
.archive-page .timeline-separator .timeline-separator-pattern {
  color: rgba(109, 138, 191, 0.68);
  font-size: 0.86rem;
  letter-spacing: 0.12em;
  white-space: nowrap;
}
.archive-page .timeline-separator .timeline-separator-label {
  color: #4c6da3;
  font-weight: 900;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.archive-page .timeline-separator-year .timeline-separator-content {
  gap: 10px;
}
.archive-page .timeline-separator-year .timeline-separator-label {
  font-size: 1.02rem;
  background: linear-gradient(90deg, #c45a84 0%, #5688c2 52%, #3e9b80 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}
.archive-page .timeline-separator-month .timeline-separator-content {
  gap: 8px;
}
.archive-page .timeline-separator-month .timeline-separator-label {
  font-size: 0.95rem;
  color: #6e86ae;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.archive-page .timeline-separator-month .timeline-separator-pattern {
  font-size: 0;
  width: 56px;
  height: 1px;
  letter-spacing: 0;
  background: linear-gradient(90deg, rgba(196, 90, 132, 0.28), rgba(86, 136, 194, 0.42), rgba(196, 90, 132, 0.28));
  border-radius: 999px;
}
.archive-page .timeline-link {
  display: block;
  position: relative;
  color: inherit;
  text-decoration: none;
}
.archive-page .timeline-content {
  position: relative;
  margin-left: 24px;
  padding: 16px 24px;
  background: rgba(236, 240, 241, 0.86);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: var(--transition);
  --timeline-card-height: 140px;
  height: var(--timeline-card-height);
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 18px;
}
.archive-page .timeline-content:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
}
.archive-page .timeline-dot {
  position: absolute;
  left: -14px;
  top: 0;
  width: 20px;
  height: 20px;
  background: #fff;
  border: 4px solid var(--primary-color);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.12);
  z-index: 2;
}
.archive-page .timeline-badge {
  position: absolute;
  top: -12px;
  left: -12px;
  width: 52px;
  height: 52px;
  border-radius: 10px 10px 25px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 110, 155, 0.3) 0%, rgba(255, 110, 155, 0.3) 53%, rgba(128, 128, 128, 0.5) 55%, rgba(72, 219, 187, 0.3) 58%, rgba(206, 255, 225, 0.4) 75%, rgba(72, 219, 187, 0.3) 100%);
  color: #fff;
  font-size: 18px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  z-index: 6;
  border: 2px solid rgba(255, 255, 255, 0.85);
}
.archive-page .timeline-left {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding-left: 12px;
}
.archive-page .timeline-right {
  flex: 0 0 140px;
  text-align: right;
}
.archive-page .timeline-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: #ff5f8a;
  margin: 0 0 6px 0;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.archive-page .title-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.archive-page .timeline-date {
  font-size: 0.95em;
  color: var(--primary-color);
  font-weight: bold;
  margin-bottom: 6px;
}
.archive-page .timeline-right .timeline-date {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--primary-color);
  margin: 0;
}
.archive-page .timeline-excerpt {
  color: #666;
  font-size: 1rem;
  margin: 0;
  display: -webkit-box;
  /*-webkit-line-clamp: 2;*/
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (min-width: 901px) {
  .archive-page .timeline-item.timeline-item-enter {
    opacity: 0;
    transform: translateY(-14px);
    animation: archive-timeline-enter 760ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
    animation-delay: var(--timeline-enter-delay, 0ms);
  }
}
@keyframes archive-timeline-enter {
  from { opacity: 0; transform: translateY(-14px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .archive-page .timeline-item.timeline-item-enter {
    opacity: 1;
    transform: none;
    animation: none;
  }
}
.archive-page .calendar-card {
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(14px);
  border-radius: 18px;
  box-shadow: var(--shadow);
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: visible;
  position: relative;
  isolation: isolate;
  border: 4px solid transparent;
  background:
    linear-gradient(rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.42)) padding-box,
    linear-gradient(135deg, rgba(255, 182, 201, 0.62), rgba(167, 243, 208, 0.62), rgba(154, 215, 255, 0.62)) border-box;
  box-shadow: var(--archive-card-shadow);
}
.archive-page .calendar-card::before {
  content: '';
  position: absolute;
  inset: -18px;
  border-radius: inherit;
  background-size: cover;
  opacity: 0.28;
  pointer-events: none;
  z-index: 0;
  transform-origin: center center;
  will-change: transform;
}
.archive-page .calendar-card:hover::before {
  animation: archive-calendar-bg-sway 6.2s ease-in-out infinite;
}
@keyframes archive-calendar-bg-sway {
  0% { transform: translate3d(0,0,0) rotate(0deg); }
  25% { transform: translate3d(3.4px,-2.6px,0) rotate(0.42deg); }
  50% { transform: translate3d(-3.2px,2.8px,0) rotate(-0.44deg); }
  75% { transform: translate3d(2.8px,2.4px,0) rotate(0.38deg); }
  100% { transform: translate3d(0,0,0) rotate(0deg); }
}
.archive-page .calendar-card>* {
  position: relative;
  z-index: 1;
}
.archive-page .calendar-top {
  padding: 16px 16px 10px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.archive-page .calendar-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.archive-page .calendar-today-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.75);
  color: var(--dark-color);
  cursor: pointer;
  transition: var(--transition);
  font-weight: 700;
  font-size: 0.92rem;
  white-space: nowrap;
}
.archive-page .calendar-today-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
.archive-page .calendar-view-toggle {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(236, 240, 241, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.06);
  position: relative;
}
.archive-page .calendar-view-toggle::before {
  content: '';
  position: absolute;
  top: 6px;
  left: var(--bg-left, 6px);
  width: var(--bg-width, calc(50% - 10px));
  height: calc(100% - 12px);
  background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
  border-radius: 999px;
  transition: all 0.3s ease;
  z-index: 0;
}
.archive-page .calendar-toggle-btn {
  border: none;
  background: transparent;
  padding: 8px 12px;
  border-radius: 999px;
  color: var(--dark-color);
  cursor: pointer;
  transition: var(--transition);
  font-weight: 600;
  font-size: 0.95rem;
  position: relative;
  z-index: 1;
}
.archive-page .calendar-toggle-btn.active {
  color: #fff;
}
.archive-page .calendar-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.8);
}
.archive-page .calendar-nav {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.archive-page .calendar-nav-label {
  flex: 1;
  text-align: center;
  font-weight: 800;
  color: var(--dark-color);
  letter-spacing: 0.5px;
}
.archive-page .calendar-nav-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: var(--transition);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dark-color);
}
.archive-page .calendar-nav-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
.archive-page .calendar-body {
  padding: 8px 12px 14px 12px;
  overflow: visible;
}
.archive-page .cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  overflow: visible;
}
.archive-page .cal-weekday {
  text-align: center;
  font-size: 0.85rem;
  color: var(--gray-color);
  padding: 6px 0;
  font-weight: 700;
}
.archive-page .cal-cell {
  position: relative;
  z-index: 0;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--dark-color);
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.55);
  overflow: visible;
}
.archive-page .cal-cell.has-posts,
.archive-page .cal-month.has-posts {
  cursor: pointer;
}
.archive-page .cal-cell.has-posts:hover,
.archive-page .cal-month.has-posts:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
.archive-page .cal-cell[data-tip]::after,
.archive-page .cal-month[data-tip]::after {
  content: attr(data-tip);
  position: absolute;
  left: 50%;
  top: -10px;
  transform: translate(-50%, -100%);
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  color: var(--dark-color);
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  box-shadow: var(--shadow);
  transition: var(--transition);
  z-index: 20;
}
.archive-page .cal-cell[data-tip]:hover::after,
.archive-page .cal-month[data-tip]:hover::after {
  opacity: 1;
}
.archive-page .cal-cell.muted {
  border-color: transparent;
  background: transparent;
}
.archive-page .cal-cell.has-posts::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--secondary-color);
  border-radius: inherit;
}
.archive-page .cal-cell.has-posts.heat-1::before { opacity: 0.45; }
.archive-page .cal-cell.has-posts.heat-2::before { opacity: 0.65; }
.archive-page .cal-cell.has-posts.heat-3::before { opacity: 0.90; }
.archive-page .cal-cell>span {
  position: relative;
  z-index: 2;
}
.archive-page .cal-year-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  overflow: visible;
}
.archive-page .cal-month {
  position: relative;
  z-index: 0;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: var(--dark-color);
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.55);
  overflow: visible;
}
.archive-page .cal-month.has-posts::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--secondary-color);
  border-radius: inherit;
}
.archive-page .cal-month.has-posts.heat-1::before { opacity: 0.30; }
.archive-page .cal-month.has-posts.heat-2::before { opacity: 0.60; }
.archive-page .cal-month.has-posts.heat-3::before { opacity: 0.92; }
.archive-page .cal-month>span {
  position: relative;
  z-index: 2;
}
.archive-page .archive-filter-panel {
  margin-top: 12px;
  width: 100%;
}
.archive-page .archive-filter-toggle {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  --filter-bg-top: 8px;
  --filter-bg-height: 40px;
}
.archive-page .archive-filter-toggle::before {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  top: var(--filter-bg-top);
  height: var(--filter-bg-height);
  border-radius: 12px;
  background: linear-gradient(135deg, #6ee7b7, #34d399);
  box-shadow:
    0 4px 12px rgba(52, 211, 153, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transition: top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
              height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 0;
}
.archive-page .archive-filter-toggle::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}
.archive-page .archive-filter-btn {
  position: relative;
  z-index: 1;
  width: 100%;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(75, 85, 99, 0.7);
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.4;
  padding: 10px 14px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s ease;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
}
.archive-page .archive-filter-btn:hover {
  color: rgba(55, 65, 81, 0.9);
  transform: scale(1.02);
}
.archive-page .archive-filter-btn:active {
  transform: scale(0.98);
}
.archive-page .archive-filter-btn.active {
  color: #0a3d2e;
  font-weight: 700;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}
.archive-page .archive-filter-btn.active::before {
  content: '✦';
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: rgb(255, 234, 3);
  animation: sparkle 2s ease-in-out infinite;
}
@keyframes sparkle {
  0%, 100% { opacity: 0.4; transform: translateY(-50%) scale(1); }
  50% { opacity: 0.8; transform: translateY(-50%) scale(1.2); }
}
.archive-page .archive-timeline.drum {
  padding-top: var(--drum-pad, 38vh);
  padding-bottom: var(--drum-pad, 38vh);
  max-height: calc(100vh - 170px);
  overflow-y: auto;
  overflow-x: hidden;
  scroll-snap-type: y mandatory;
  scroll-padding-top: var(--drum-pad, 38vh);
  scroll-padding-bottom: var(--drum-pad, 38vh);
  perspective: 900px;
  -webkit-overflow-scrolling: touch;
  mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
}
.archive-page .archive-timeline.drum:focus {
  outline: none;
}
.archive-page .archive-timeline.drum .timeline-item {
  margin: 0;
  padding: 16px 0;
  scroll-snap-align: center;
  display: flex;
  justify-content: center;
}
.archive-page .archive-timeline.drum .timeline-dot {
  display: none;
}
.archive-page .archive-timeline.drum .timeline-content {
  margin-left: 0;
  width: 700px;
  transform-style: preserve-3d;
  transform:
    translateZ(calc((1 - var(--ad, 0)) * 40px)) rotateX(calc(var(--d, 0) * -24deg)) scale(clamp(0.86, calc(1 - var(--ad, 0) * 0.14), 1));
  opacity: clamp(0.35, calc(1 - var(--ad, 0) * 0.55), 1);
  filter: saturate(clamp(0.72, calc(1 - var(--ad, 0) * 0.25), 1));
  will-change: transform, opacity;
}
.archive-page .archive-timeline.drum::-webkit-scrollbar {
  width: 0;
  height: 0;
}
.archive-page .archive-timeline.drum {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.archive-page .timeline-item.flash .timeline-content {
  box-shadow: 0 0 0 3px rgba(255, 182, 201, 0.30), 0 14px 28px rgba(44, 62, 80, 0.16);
}
.archive-page .calendar-fab {
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: #fff;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24);
  z-index: 1600;
  border: none;
  cursor: pointer;
}
.archive-page .calendar-fab i {
  font-size: 20px;
}
.archive-page .calendar-modal {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1650;
  pointer-events: none;
}
.archive-page .calendar-modal.open,
.archive-page .calendar-modal.open-prep,
.archive-page .calendar-modal.closing {
  display: flex;
}
.archive-page .calendar-modal.open {
  pointer-events: auto;
}
.archive-page .calendar-modal .calendar-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
  opacity: 0;
  transition: opacity 240ms ease;
}
.archive-page .calendar-modal.open .calendar-modal-backdrop {
  opacity: 1;
}
.archive-page .calendar-modal.closing .calendar-modal-backdrop {
  opacity: 0;
}
.archive-page .calendar-modal .calendar-modal-inner {
  position: relative;
  width: min(92%, 420px);
  max-height: 86vh;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
  transform-origin: right bottom;
  transform: translate3d(72px, 72px, 0) scale(0.72);
  opacity: 0;
  transition: transform 300ms cubic-bezier(.2, .9, .25, 1), opacity 240ms ease;
  overflow: auto;
}
.archive-page .calendar-modal.open .calendar-modal-inner {
  transform: translate3d(0, 0, 0) scale(1);
  opacity: 1;
}
.archive-page .calendar-modal.closing .calendar-modal-inner {
  transform: translate3d(72px, 72px, 0) scale(0.72);
  opacity: 0;
}
.archive-page .calendar-modal .calendar-modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  border: none;
  background: transparent;
  color: var(--dark-color);
  font-size: 18px;
  cursor: pointer;
}
.archive-page .calendar-modal .calendar-modal-body {
  padding: 16px;
}

@media (max-width: 900px) {
  .archive-page .archive-main {
    border: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    isolation: auto;
    overflow: visible;
  }
  .archive-page .archive-main::before,
  .archive-page .archive-main::after {
    content: none !important;
    display: none !important;
  }
  .archive-page .archive-sidebar {
    display: none !important;
  }
  .archive-page .calendar-fab {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
  }
  .archive-page .archive-timeline {
    padding-left: 12px;
    padding-right: 12px;
  }
  .archive-page .archive-timeline .timeline-link,
  .archive-page .archive-timeline .timeline-content {
    max-width: none;
    width: 100%;
  }
  .archive-page .archive-timeline .timeline-content {
    margin-left: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .archive-page .archive-timeline .timeline-right {
    flex: 0 0 auto;
    width: 100%;
    text-align: left;
    margin-top: 2px;
  }
  .archive-page .archive-timeline .timeline-left {
    width: 100%;
    padding-left: 6px;
  }
  .archive-page .archive-timeline .timeline-title {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--archive-type-col-width, 96px);
    align-items: center;
    column-gap: 8px;
    width: 100%;
    overflow: hidden;
  }
  .archive-page .archive-timeline .timeline-title .title-text {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .archive-page .archive-timeline .timeline-right .timeline-date {
    font-size: 1rem;
    line-height: 1.25;
  }
  .archive-page .archive-timeline.drum {
    max-height: calc(100vh - 160px);
  }
  .archive-page .archive-timeline.drum .timeline-content {
    transform: none;
    opacity: 1;
    filter: none;
    will-change: auto;
  }
  .archive-page .archive-timeline .timeline-separator .timeline-separator-content {
    width: min(94vw, 820px);
    gap: 6px;
    padding: 4px 2px;
  }
  .archive-page .archive-timeline .timeline-separator .timeline-separator-pattern {
    font-size: 0.74rem;
  }
  .archive-page .archive-timeline .timeline-separator-year .timeline-separator-label {
    font-size: 0.94rem;
  }
  .archive-page .archive-timeline .timeline-separator-month .timeline-separator-label {
    font-size: 0.86rem;
  }
  .archive-page .archive-timeline .timeline-separator-month .timeline-separator-pattern {
    font-size: 0;
    color: transparent;
    width: 36px;
  }
}
@media (max-width: 600px) {
  .archive-page .archive-layout {
    flex-direction: column;
    gap: 16px;
  }
  .archive-page .archive-sidebar {
    width: 100%;
    flex: 0 0 auto;
    position: static;
  }
  .archive-page .archive-timeline {
    padding-left: 18px;
    border-left-width: 3px;
  }
  .archive-page .archive-timeline .timeline-dot {
    left: -12px;
    width: 18px;
    height: 18px;
  }
  .archive-page .archive-timeline .timeline-content {
    margin-left: 16px;
    padding: 12px 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .archive-page .timeline-item.timeline-item-enter {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .archive-page .calendar-card::before {
    animation: none;
  }
}
</style>