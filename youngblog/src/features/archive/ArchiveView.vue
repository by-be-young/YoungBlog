<template>
    <main class="archive-page">
        <section class="archive-section">
            <header class="arc-hero">
                <p class="arc-eyebrow">
                    <span>ARCHIVE</span>
                    <i aria-hidden="true"></i>
                    <span>02</span>
                    <i aria-hidden="true"></i>
                    <span>INDEX</span>
                </p>
                <div class="arc-hero-main">
                    <h1 class="arc-title">{{ i18n.currentTranslations.archive_timeline_title }}</h1>
                    <div class="arc-stats">
                        <span class="arc-stat">
                            <b>{{ filteredBlogs.length }}</b>
                            <em>{{ i18n.currentTranslations.posts }}</em>
                        </span>
                        <span v-if="yearSpan" class="arc-stat arc-stat-years">
                            <b>{{ yearSpan }}</b>
                        </span>
                    </div>
                </div>
            </header>

            <div class="arc-command">
                <div class="arc-filter-row" role="group">
                    <button v-for="filter in filters" :key="filter.key" class="arc-filter-btn"
                        :class="{ active: currentFilter === filter.key }" type="button" :data-filter="filter.key"
                        :aria-pressed="currentFilter === filter.key" @click="setFilter(filter.key)">
                        <span>{{ i18n.currentTranslations[filter.labelKey] }}</span>
                        <span class="arc-filter-count">{{ filterCounts[filter.key] }}</span>
                    </button>
                </div>
                <button class="arc-calendar-btn" type="button" @click="openCalendarModal">
                    <i class="fas fa-calendar-alt" aria-hidden="true"></i>
                    <span>{{ i18n.currentTranslations.archive_calendar }}</span>
                </button>
            </div>

            <div class="arc-year-tabs" role="tablist" :aria-label="i18n.currentTranslations.archive_by_year">
                <button v-for="year in archiveYears" :key="year.year" class="arc-year-tab"
                    :class="{ active: activeYear === year.year }" type="button" role="tab"
                    :aria-selected="activeYear === year.year" @click="scrollToYear(year.year)">
                    <span class="arc-year-tab-num">{{ year.year }}</span>
                    <span class="arc-year-tab-count">{{ year.count }}</span>
                </button>
            </div>

            <div class="archive-layout">
                <div class="archive-main">
                    <div class="archive-timeline arc-index" :class="{ drum: isDesktopDrum }" ref="timelineRef"
                        @scroll="onTimelineScroll">
                        <section v-for="yearGroup in archiveYearsData" :key="yearGroup.year" class="arc-year"
                            :data-year="yearGroup.year">
                            <header class="arc-year-head">
                                <span class="arc-year-number">{{ yearGroup.year }}</span>
                                <span class="arc-year-rule" aria-hidden="true"></span>
                                <span class="arc-year-meta">
                                    {{ yearGroup.count }} {{ i18n.currentTranslations.posts }}
                                </span>
                            </header>

                            <div v-for="month in yearGroup.months" :key="month.key" class="arc-month">
                                <header class="arc-month-head">
                                    <span class="arc-month-number">{{ month.month }}</span>
                                    <h2 class="arc-month-label">{{ month.label }}</h2>
                                    <span class="arc-month-count">{{ month.items.length }}</span>
                                </header>

                                <div class="arc-stack">
                                    <a v-for="(item, index) in month.items" :key="item.blog.id"
                                        class="timeline-item arc-row" :class="{ 'timeline-item-enter': shouldAnimate }"
                                        :data-date="item.blog.date" :href="`#/blog/${item.blog.id}`"
                                        :style="{ '--arc-delay': enterDelay(index), '--timeline-enter-delay': enterDelay(index) }">
                                        <div class="timeline-content arc-row-inner">
                                            <div class="arc-row-date">
                                                <span class="arc-row-day">{{ item.day }}</span>
                                                <span class="arc-row-week">{{ item.weekday }}</span>
                                            </div>
                                            <div class="arc-row-body">
                                                <div class="arc-row-meta">
                                                    <span v-if="item.blog.type" class="arc-row-type">{{
                                                        item.blog.type }}</span>
                                                    <span class="arc-row-date-text">{{ formatDate(item.blog.date)
                                                        }}</span>
                                                </div>
                                                <h3 class="arc-row-title">{{ item.blog.title }}</h3>
                                                <p v-if="item.blog.excerpt" class="arc-row-excerpt">{{
                                                    item.blog.excerpt }}</p>
                                            </div>
                                            <span class="arc-row-arrow" aria-hidden="true">
                                                <i class="fas fa-arrow-right"></i>
                                            </span>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </section>

                        <div v-if="archiveYearsData.length === 0" class="arc-empty">
                            {{ i18n.currentTranslations.archive_empty }}
                        </div>
                    </div>
                </div>

                <!-- 侧边栏：移动端打开日历抽屉时，真实节点会被移动到抽屉内（而非克隆），
                     因此按钮交互、日历状态与筛选高亮都能保持同步 -->
                <aside class="archive-sidebar" aria-label="归档日历" ref="sidebarRef">
                    <div class="calendar-card" id="calendarCard">
                        <div class="calendar-top">
                            <div class="calendar-top-row">
                                <div class="calendar-view-toggle" role="tablist" ref="viewToggleRef">
                                    <button class="calendar-toggle-btn" :class="{ active: calendarView === 'month' }"
                                        type="button" data-view="month" role="tab"
                                        :aria-selected="calendarView === 'month'" @click="setCalendarView('month')">
                                        {{ i18n.currentTranslations.view_month }}
                                    </button>
                                    <button class="calendar-toggle-btn" :class="{ active: calendarView === 'year' }"
                                        type="button" data-view="year" role="tab"
                                        :aria-selected="calendarView === 'year'" @click="setCalendarView('year')">
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
                        <div class="archive-filter-toggle" id="archiveFilterToggle" ref="filterToggleRef"
                            role="radiogroup">
                            <button v-for="filter in filters" :key="filter.key" class="archive-filter-btn"
                                :class="{ active: currentFilter === filter.key }" type="button"
                                :data-filter="filter.key" role="radio" :aria-checked="currentFilter === filter.key"
                                @click="setFilter(filter.key)">
                                <span>{{ i18n.currentTranslations[filter.labelKey] }}</span>
                                <span class="arc-filter-count">{{ filterCounts[filter.key] }}</span>
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </section>

        <!-- 移动端悬浮按钮 -->
        <button id="calendarFab" class="calendar-fab" ref="calendarFabRef" @click="openCalendarModal" aria-label="打开日历"
            :aria-expanded="isModalOpen">
            <i class="fas fa-calendar-alt" aria-hidden="true"></i>
        </button>

        <!-- 移动端模态框 -->
        <div id="calendarModal" class="calendar-modal"
            :class="{ open: isModalOpen, 'open-prep': isModalPreparing, closing: isModalClosing }"
            :aria-hidden="!isModalOpen">
            <div class="calendar-modal-backdrop" data-role="backdrop" @click="closeCalendarModal"></div>
            <div class="calendar-modal-inner" role="dialog" aria-modal="true" tabindex="-1" ref="modalInnerRef">
                <span class="calendar-modal-handle" aria-hidden="true"></span>
                <div class="calendar-modal-head">
                    <span class="calendar-modal-title">
                        <span class="calendar-modal-icon" aria-hidden="true">
                            <i class="far fa-calendar-alt"></i>
                        </span>
                        {{ i18n.currentTranslations.archive_calendar }}
                    </span>
                    <button class="calendar-modal-close" @click="closeCalendarModal" aria-label="关闭日历">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="calendar-modal-body" id="archiveModalBody" ref="modalBodyRef"></div>
            </div>
        </div>
    </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { useBlogStore } from '@/shared/stores/blogStore'

const i18n = useI18nStore()
const blogStore = useBlogStore()

// ================== 日期工具 ==================
// 统一按「本地时间」解析与格式化。
// 不能用 toISOString()：它按 UTC 换算，会把本地零点变成前一天
// （例如 UTC+8 下 new Date(2026, 8, 9).toISOString() 会得到 2026-09-08）
function parseDate(value) {
    if (typeof value === 'string') {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
        if (m) return new Date(+m[1], +m[2] - 1, +m[3])
    }
    return new Date(value)
}

function dateKey(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

// DOM refs
const timelineRef = ref(null)
const calendarBodyRef = ref(null)
const calLabelRef = ref(null)
const modalBodyRef = ref(null)
const modalInnerRef = ref(null)
const sidebarRef = ref(null)
const calendarFabRef = ref(null)
const viewToggleRef = ref(null)
const filterToggleRef = ref(null)

// 状态
const currentFilter = ref('all')
const calendarView = ref('month')
const cursorDate = ref(new Date())
const isDesktopDrum = ref(false)
const isModalOpen = ref(false)
const isModalPreparing = ref(false)
const isModalClosing = ref(false)
const shouldAnimate = ref(true)
const activeYear = ref('')
// 侧边栏在“归位”时的原始挂载点（打开抽屉时会被临时移动到抽屉内）
let sidebarHome = null
let scrollTimer = null
const todayKey = dateKey(new Date())

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
    return blogs.sort((a, b) => parseDate(b.date) - parseDate(a.date))
})

// 按年 / 月重组的杂志式索引数据
const archiveYearsData = computed(() => {
    const years = new Map()

    filteredBlogs.value.forEach((blog) => {
        const date = parseDate(blog.date)
        if (isNaN(date)) return
        const lang = i18n.getLang()
        const year = String(date.getFullYear())
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const monthKey = `${year}-${month}`

        let yearGroup = years.get(year)
        if (!yearGroup) {
            yearGroup = { year, count: 0, months: [], monthMap: new Map() }
            years.set(year, yearGroup)
        }

        let monthGroup = yearGroup.monthMap.get(monthKey)
        if (!monthGroup) {
            const label = lang === 'en'
                ? new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date)
                : `${Number(month)}月`
            monthGroup = { key: monthKey, month, label, items: [] }
            yearGroup.monthMap.set(monthKey, monthGroup)
            yearGroup.months.push(monthGroup)
        }

        const weekday = new Intl.DateTimeFormat(
            lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : 'zh-CN',
            { weekday: 'short' }
        ).format(date)

        monthGroup.items.push({
            blog,
            day: String(date.getDate()).padStart(2, '0'),
            weekday
        })
        yearGroup.count += 1
    })

    const result = [...years.values()].sort((a, b) => Number(b.year) - Number(a.year))
    result.forEach((yearGroup) => {
        yearGroup.months.sort((a, b) => b.key.localeCompare(a.key))
    })
    return result
})

const archiveYears = computed(() => (
    archiveYearsData.value.map(group => ({
        year: group.year,
        count: group.count
    }))
))

watch(archiveYears, (years) => {
    if (!years.some(item => item.year === activeYear.value)) {
        activeYear.value = years[0]?.year || ''
    }
}, { immediate: true })

function scrollToYear(year) {
    activeYear.value = year
    const el = timelineRef.value?.querySelector(`.arc-year[data-year="${year}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 各筛选条件下的文章数（用于筛选按钮角标）
const filterCounts = computed(() => {
    const all = blogStore.blogs
    const learning = all.filter(b => blogStore.isLearningBlog(b)).length
    return { all: all.length, learning, 'non-learning': all.length - learning }
})

// 年份跨度（如 2023 – 2026）
const yearSpan = computed(() => {
    const years = filteredBlogs.value
        .map(b => parseDate(b.date).getFullYear())
        .filter(y => !isNaN(y))
    if (!years.length) return ''
    const min = Math.min(...years)
    const max = Math.max(...years)
    const lang = i18n.getLang()
    const suffix = lang === 'zh' || lang === 'ja' ? '年' : ''
    return min === max ? `${min}${suffix}` : `${min} – ${max}`
})

// 入场动画逐个错开的延迟（封顶，避免列表过长时等待过久）
function enterDelay(index) {
    return `${Math.min(index, 12) * 55}ms`
}

// 日期统计
const dateCountMap = computed(() => {
    const map = new Map()
    filteredBlogs.value.forEach(blog => {
        const d = parseDate(blog.date)
        if (!isNaN(d)) {
            const key = dateKey(d)
            map.set(key, (map.get(key) || 0) + 1)
        }
    })
    return map
})

const monthCountMap = computed(() => {
    const map = new Map()
    filteredBlogs.value.forEach(blog => {
        const d = parseDate(blog.date)
        if (!isNaN(d)) {
            const key = dateKey(d).slice(0, 7)
            map.set(key, (map.get(key) || 0) + 1)
        }
    })
    return map
})

const monthMaxDateMap = computed(() => {
    const map = new Map()
    filteredBlogs.value.forEach(blog => {
        const d = parseDate(blog.date)
        if (!isNaN(d)) {
            const key = dateKey(d).slice(0, 7)
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
        return `${y}年${m + 1}月`
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
        const key = dateKey(dateObj)
        const count = dateCountMap.value.get(key) || 0
        const has = count > 0
        const level = heatLevel(count)
        const isToday = key === todayKey
        const cls = [
            'cal-cell',
            has ? 'has-posts' : '',
            has ? `heat-${level}` : '',
            isToday ? 'is-today' : ''
        ].filter(Boolean).join(' ')
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
        const key = `${year}-${String(m + 1).padStart(2, '0')}`
        const count = monthCountMap.value.get(key) || 0
        const has = count > 0
        const level = monthHeatLevel(count)
        const cls = has ? `cal-month has-posts heat-${level}` : 'cal-month'
        const tip = has ? ` data-tip="${count} 篇"` : ''
        const target = has ? ` data-target-month="${key}"` : ''
        let label = `${m + 1}月`
        if (lang === 'en') {
            try {
                label = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(year, m, 1))
            } catch {
                /* 格式化异常时回退到默认的「N月」标签 */
            }
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
            const key = dateKey(maxDate)
            jumpToDate(key)
        }
    }
}

function jumpToDate(ymd) {
    const timeline = timelineRef.value
    if (!timeline) return
    // 移动端从抽屉里点选日期时，先收起抽屉，让用户直接看到跳转结果
    if (isModalOpen.value || isModalPreparing.value) closeCalendarModal()
    const el = timeline.querySelector(`.timeline-item[data-date="${ymd}"]`)
    if (!el) return

    const year = ymd.slice(0, 4)
    if (archiveYears.value.some(item => item.year === year)) activeYear.value = year

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
    const left = btnRect.left - containerRect.left
    const width = btnRect.width
    toggle.style.setProperty('--filter-bg-left', left + 'px')
    toggle.style.setProperty('--filter-bg-width', width + 'px')
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

// 模态框（移动端底部抽屉）
// 说明：直接把侧边栏的真实 DOM 节点搬进抽屉，而不是克隆副本，
// 这样日历按钮、筛选控件都保持原有事件监听与响应式状态。
function openCalendarModal() {
    if (isModalOpen.value || isModalPreparing.value || isModalClosing.value) return
    const sidebar = sidebarRef.value
    const body = modalBodyRef.value
    if (sidebar && body) {
        // 记录原始挂载位置，关闭时原样还原
        sidebarHome = { parent: sidebar.parentElement, next: sidebar.nextSibling }
        body.appendChild(sidebar)
    }
    isModalPreparing.value = true
    document.body.style.overflow = 'hidden'
    // 等节点入位并完成一轮布局后，再播放上滑动效
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            isModalPreparing.value = false
            isModalOpen.value = true
            // 节点尺寸变化后重新测量滑块高亮
            updateToggleBackground()
            updateFilterBackground()
            modalInnerRef.value?.focus?.({ preventScroll: true })
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
        restoreSidebar()
        updateToggleBackground()
        updateFilterBackground()
        calendarFabRef.value?.focus?.({ preventScroll: true })
    }, 300)
}

// 把侧边栏送回原来的布局位置
function restoreSidebar() {
    const sidebar = sidebarRef.value
    if (sidebar && sidebarHome?.parent) {
        sidebarHome.parent.insertBefore(sidebar, sidebarHome.next)
    }
    sidebarHome = null
}

// 工具
function formatDate(dateStr) {
    const date = parseDate(dateStr)
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
        isDesktopDrum.value = false
        // 切回桌面尺寸时，若抽屉还开着则关闭并把侧边栏归位
        if (isDesktopDrum.value) closeCalendarModal()
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
   归档 / 时间轴页面 · Quartz Glass 设计体系
   与全站 macaron 玻璃风格保持统一，整体重写
   ================================================== */

.archive-page {
    /* ---- 文字 ---- */
    --arc-ink: #17222f;
    --arc-ink-strong: #0f1a26;
    --arc-ink-soft: rgba(23, 34, 47, 0.62);
    --arc-ink-faint: rgba(23, 34, 47, 0.4);

    /* ---- 强调色 ---- */
    --arc-rose: #e85d84;
    --arc-peach: #ffb27a;
    --arc-gold: #ffd38a;
    --arc-mint: #58d8b2;
    --arc-sky: #6fc5ff;
    --arc-lilac: #a08cff;
    --arc-grad: linear-gradient(120deg, #e85d84 0%, #ffd38a 34%, #58d8b2 66%, #6fc5ff 100%);
    --arc-grad-soft: linear-gradient(135deg,
            rgba(232, 93, 132, 0.55),
            rgba(255, 211, 138, 0.45) 34%,
            rgba(88, 216, 178, 0.45) 68%,
            rgba(111, 197, 255, 0.55));

    /* ---- 暖纸表面 ---- */
    --arc-glass: rgba(255, 255, 255, 0.82);
    --arc-glass-strong: rgba(255, 255, 255, 0.94);
    --arc-glass-soft: rgba(255, 255, 255, 0.62);
    --arc-line: rgba(23, 34, 47, 0.1);
    --arc-line-strong: rgba(23, 34, 47, 0.2);

    /* ---- 阴影 / 圆角 / 缓动 ---- */
    --arc-shadow-sm: 0 2px 10px rgba(23, 34, 47, 0.06);
    --arc-shadow-md: 0 14px 34px rgba(23, 34, 47, 0.1);
    --arc-shadow-lg: 0 28px 64px rgba(23, 34, 47, 0.15);
    --arc-radius: 30px;
    --arc-radius-sm: 20px;
    --arc-ease: cubic-bezier(0.22, 1, 0.36, 1);
    --arc-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

    color: var(--arc-ink);
}

/* ---------- 页面骨架 ---------- */
.archive-page .archive-section {
    padding: 92px 20px 56px;
}

.archive-page .archive-layout {
    max-width: 1240px;
    margin: 0 auto;
    display: flex;
    gap: 26px;
    align-items: flex-start;
}

/* ---------- 主面板：石英玻璃底板 ---------- */
.archive-page .archive-main {
    position: relative;
    flex: 1;
    min-width: 0;
    isolation: isolate;
    padding: 16px;
    border-radius: var(--arc-radius);
    border: 1.5px solid transparent;
    background:
        linear-gradient(180deg,
            rgba(253, 249, 242, 0.94) 0%,
            rgba(253, 247, 238, 0.86) 46%,
            rgba(253, 249, 242, 0.92) 100%) padding-box,
        linear-gradient(150deg,
            rgba(255, 182, 201, 0.55),
            rgba(255, 211, 138, 0.45) 34%,
            rgba(88, 216, 178, 0.45) 68%,
            rgba(199, 182, 255, 0.55)) border-box;
    backdrop-filter: blur(18px) saturate(1.12);
    -webkit-backdrop-filter: blur(18px) saturate(1.12);
    box-shadow: var(--arc-shadow-md);
    overflow: hidden;
}

/* 顶部柔光 + 中心暖光，让内容从背景中“浮”起来 */
.archive-page .archive-main::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
        radial-gradient(120% 60% at 50% -12%, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0) 62%),
        radial-gradient(70% 46% at 50% 52%, rgba(255, 211, 138, 0.14), rgba(255, 211, 138, 0) 72%);
}

.archive-page .archive-main::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    border-radius: inherit;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.archive-page .archive-main>* {
    position: relative;
    z-index: 1;
}

/* ---------- 侧栏 ---------- */
.archive-page .archive-sidebar {
    width: 336px;
    flex: 0 0 336px;
    position: sticky;
    top: 92px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

/* ---------- 时间轴 ---------- */
.archive-page .archive-timeline {
    position: relative;
    margin: 0;
    padding: 8px 6px 28px 46px;
    max-width: none;
    border-radius: 18px;
}

/* 渐变时间轴导轨 */
.archive-page .archive-timeline:not(.drum)::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 30px;
    bottom: 30px;
    width: 3px;
    border-radius: 999px;
    background: linear-gradient(180deg,
            rgba(255, 159, 182, 0) 0%,
            rgba(255, 159, 182, 0.9) 6%,
            rgba(255, 217, 113, 0.9) 36%,
            rgba(116, 226, 187, 0.9) 68%,
            rgba(142, 203, 255, 0.9) 94%,
            rgba(142, 203, 255, 0) 100%);
    box-shadow: 0 0 14px rgba(255, 217, 113, 0.35);
}

/* 导轨上缓缓流动的高光点 */
.archive-page .archive-timeline:not(.drum)::after {
    content: '';
    position: absolute;
    left: 9px;
    top: 4%;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(255, 217, 113, 0.88) 34%,
            rgba(255, 217, 113, 0) 72%);
    animation: arc-rail-flow 8s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

@keyframes arc-rail-flow {
    0% {
        top: 4%;
        opacity: 0;
    }

    12% {
        opacity: 1;
    }

    88% {
        opacity: 1;
    }

    100% {
        top: 96%;
        opacity: 0;
    }
}

.archive-page .timeline-item {
    position: relative;
    margin-bottom: 30px;
}

.archive-page .timeline-item:last-child {
    margin-bottom: 0;
}

/* ---------- 页头 ---------- */
.archive-page .timeline-header {
    margin: 0 0 20px;
    padding: 34px 0 40px;
    display: flex;
    justify-content: center;
    scroll-snap-align: start;
}

.archive-page .timeline-header-inner {
    width: min(100%, 760px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
}

.archive-page .timeline-header-content {
    margin: 0;
    font-size: clamp(2.3rem, 6.2vw, 4.1rem);
    font-weight: 900;
    line-height: 1.06;
    letter-spacing: 0.01em;
    background: linear-gradient(100deg, #d2547d 0%, #c98a2e 30%, #2f8f6f 62%, #3776b8 100%);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: arc-grad-pan 10s ease-in-out infinite;
    filter: drop-shadow(0 14px 30px rgba(38, 52, 84, 0.18));
}

@keyframes arc-grad-pan {

    0%,
    100% {
        background-position: 0% 50%;
    }

    50% {
        background-position: 100% 50%;
    }
}

.archive-page .timeline-header-sub {
    margin: 0;
    font-size: 0.98rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: var(--arc-ink-soft);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55);
}

.archive-page .timeline-header-stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
}

.archive-page .arc-stat {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 7px 15px;
    border-radius: 999px;
    background: var(--arc-glass-strong);
    border: 1px solid rgba(255, 255, 255, 0.9);
    box-shadow: var(--arc-shadow-sm);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.archive-page .arc-stat b {
    font-size: 1.05rem;
    font-weight: 900;
    letter-spacing: 0.01em;
    background: linear-gradient(120deg, #d2547d, #3776b8);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.archive-page .arc-stat em {
    font-style: normal;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--arc-ink-faint);
}

/* ---------- 年 / 月分隔 ---------- */
.archive-page .timeline-separator {
    margin: 0;
    padding: 10px 0;
}

.archive-page .timeline-separator .timeline-separator-content {
    width: min(100%, 780px);
    display: inline-flex;
    align-items: center;
    gap: 14px;
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
}

.archive-page .timeline-separator .timeline-separator-pattern {
    flex: 1 1 0;
    height: 1px;
    min-width: 20px;
    font-size: 0;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(122, 142, 178, 0), rgba(122, 142, 178, 0.45));
}

.archive-page .timeline-separator .timeline-separator-pattern:last-child {
    background: linear-gradient(90deg, rgba(122, 142, 178, 0.45), rgba(122, 142, 178, 0));
}

.archive-page .timeline-separator .timeline-separator-label {
    white-space: nowrap;
    font-weight: 900;
    letter-spacing: 0.05em;
}

/* 年份：吸顶玻璃胶囊 */
.archive-page .archive-timeline:not(.drum) .timeline-separator-year {
    position: sticky;
    top: 78px;
    z-index: 6;
    margin: 4px 0 14px;
    padding: 0;
}

.archive-page .archive-timeline:not(.drum) .timeline-separator-year .timeline-separator-content {
    padding: 7px 18px;
    border-radius: 999px;
    background: var(--arc-glass);
    border: 1px solid rgba(255, 255, 255, 0.92);
    box-shadow: var(--arc-shadow-sm);
    backdrop-filter: blur(16px) saturate(1.15);
    -webkit-backdrop-filter: blur(16px) saturate(1.15);
}

.archive-page .timeline-separator-year .timeline-separator-content {
    gap: 12px;
}

.archive-page .timeline-separator-year .timeline-separator-label {
    font-size: clamp(1.05rem, 1.6vw, 1.3rem);
    line-height: 1.2;
    background: linear-gradient(100deg, #d2547d, #c98a2e 40%, #2f8f6f 74%, #3776b8);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: arc-grad-pan 12s ease-in-out infinite;
}

.archive-page .timeline-separator-year .timeline-separator-pattern {
    background: linear-gradient(90deg, rgba(210, 84, 125, 0), rgba(210, 84, 125, 0.55));
}

.archive-page .timeline-separator-year .timeline-separator-pattern:last-child {
    background: linear-gradient(90deg, rgba(55, 118, 184, 0.55), rgba(55, 118, 184, 0));
}

.archive-page .timeline-separator-month .timeline-separator-content {
    gap: 10px;
}

.archive-page .timeline-separator-month .timeline-separator-label {
    font-size: 0.9rem;
    color: var(--arc-ink-soft);
    font-weight: 800;
    letter-spacing: 0.03em;
}

.archive-page .timeline-link {
    display: block;
    position: relative;
    color: inherit;
    text-decoration: none;
    border-radius: var(--arc-radius-sm);
}

.archive-page .timeline-link:focus-visible {
    outline: none;
}

.archive-page .timeline-link:focus-visible .timeline-content {
    box-shadow: var(--arc-shadow-md), 0 0 0 3px rgba(142, 203, 255, 0.55);
}

/* ---------- 文章卡片 ---------- */
.archive-page .timeline-content {
    position: relative;
    margin-left: 22px;
    padding: 18px 22px;
    min-height: 116px;
    display: flex;
    align-items: center;
    gap: 18px;
    border-radius: var(--arc-radius-sm);
    border: 1.5px solid transparent;
    background:
        linear-gradient(150deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.82)) padding-box,
        var(--arc-grad-soft) border-box;
    backdrop-filter: blur(14px) saturate(1.15);
    -webkit-backdrop-filter: blur(14px) saturate(1.15);
    box-shadow: var(--arc-shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.92);
    overflow: hidden;
    transition: transform 0.5s var(--arc-ease),
        box-shadow 0.5s var(--arc-ease);
}

/* 悬停时掠过卡片的高光 */
.archive-page .timeline-content::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg,
            rgba(255, 255, 255, 0) 32%,
            rgba(255, 255, 255, 0.72) 47%,
            rgba(255, 255, 255, 0) 62%);
    transform: translateX(-130%);
    transition: transform 0.95s var(--arc-ease);
}

.archive-page .timeline-link:hover .timeline-content,
.archive-page .timeline-link:focus-visible .timeline-content {
    transform: translateY(-4px);
    box-shadow: var(--arc-shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.archive-page .timeline-link:hover .timeline-content::after {
    transform: translateX(130%);
}

/* 左侧渐变强调条 */
.archive-page .timeline-badge {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    border-radius: 0;
    background: var(--arc-grad);
    background-size: 100% 240%;
    opacity: 0.85;
    z-index: 2;
    transition: width 0.45s var(--arc-ease), opacity 0.35s ease;
}

.archive-page .timeline-link:hover .timeline-badge {
    width: 8px;
    opacity: 1;
}

/* 时间轴圆点 */
.archive-page .timeline-dot {
    position: absolute;
    left: -30px;
    top: 50%;
    width: 14px;
    height: 14px;
    margin-top: -7px;
    border-radius: 50%;
    background: #fff;
    border: 3px solid rgba(116, 226, 187, 0.95);
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.72), 0 6px 16px rgba(38, 52, 84, 0.16);
    z-index: 3;
    transition: transform 0.45s var(--arc-spring),
        border-color 0.35s ease, box-shadow 0.35s ease;
}

.archive-page .timeline-link:hover .timeline-dot {
    transform: scale(1.28);
    border-color: var(--arc-rose);
    box-shadow: 0 0 0 7px rgba(255, 159, 182, 0.24), 0 8px 20px rgba(38, 52, 84, 0.18);
}

.archive-page .timeline-left {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding-left: 12px;
}

.archive-page .timeline-right {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
}

.archive-page .timeline-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0;
    font-size: 1.3rem;
    font-weight: 800;
    line-height: 1.25;
    color: var(--arc-ink-strong);
}

.archive-page .title-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.archive-page .blog-type {
    flex: 0 0 auto;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    white-space: nowrap;
    color: #3a6ea8;
    background: linear-gradient(135deg, rgba(142, 203, 255, 0.3), rgba(195, 180, 255, 0.3));
    border: 1px solid rgba(142, 203, 255, 0.45);
}

.archive-page .timeline-date {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: #3a6ea8;
}

.archive-page .timeline-right .timeline-date {
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 0.92rem;
    font-weight: 800;
    white-space: nowrap;
    background: var(--arc-glass-strong);
    border: 1px solid rgba(255, 255, 255, 0.92);
    box-shadow: var(--arc-shadow-sm);
}

.archive-page .timeline-excerpt {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--arc-ink-soft);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* ---------- 卡片入场（逐个错开） ---------- */
@keyframes arc-item-in {
    from {
        opacity: 0;
        transform: translateY(-16px) scale(0.98);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.archive-page .timeline-item.timeline-item-enter {
    animation: arc-item-in 0.72s var(--arc-ease) backwards;
    animation-delay: var(--timeline-enter-delay, 0ms);
}

/* ---------- 滚筒聚焦模式（桌面） ---------- */
.archive-page .archive-timeline.drum {
    padding-top: var(--drum-pad, 38vh);
    padding-bottom: var(--drum-pad, 38vh);
    padding-left: 0;
    padding-right: 0;
    max-height: calc(100vh - 168px);
    overflow-y: auto;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;
    scroll-padding-top: var(--drum-pad, 38vh);
    scroll-padding-bottom: var(--drum-pad, 38vh);
    perspective: 1200px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    mask-image: linear-gradient(to bottom, transparent 0%, #000 13%, #000 87%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 13%, #000 87%, transparent 100%);
}

.archive-page .archive-timeline.drum:focus {
    outline: none;
}

.archive-page .archive-timeline.drum::-webkit-scrollbar {
    width: 0;
    height: 0;
}

.archive-page .archive-timeline.drum .timeline-item {
    margin: 0;
    padding: 12px 0;
    display: flex;
    justify-content: center;
    scroll-snap-align: center;
}

.archive-page .archive-timeline.drum .timeline-dot,
.archive-page .archive-timeline.drum .timeline-badge {
    display: none;
}

/* 卡片宽度统一：宽度由外层链接（弹性项）决定并固定下来，
   否则弹性项会收缩到内容宽度，使卡片宽度随标题/简介长短而参差不齐 */
.archive-page .archive-timeline.drum .timeline-link {
    flex: 0 0 auto;
    width: min(680px, 100%);
}

.archive-page .archive-timeline.drum .timeline-content {
    margin-left: 0;
    width: 100%;
    transform-style: preserve-3d;
    transform:
        translateZ(calc((1 - var(--ad, 0)) * 56px)) rotateX(calc(var(--d, 0) * -18deg)) scale(clamp(0.88, calc(1 - var(--ad, 0) * 0.12), 1));
    opacity: clamp(0.3, calc(1 - var(--ad, 0) * 0.62), 1);
    filter: saturate(clamp(0.7, calc(1 - var(--ad, 0) * 0.3), 1)) blur(calc(var(--ad, 0) * 1.6px));
    will-change: transform, opacity;
}

.archive-page .archive-timeline.drum .timeline-separator {
    display: flex;
    justify-content: center;
}

.archive-page .archive-timeline.drum .timeline-separator-content {
    width: min(680px, 100%);
}

.archive-page .archive-timeline.drum .timeline-header-content,
.archive-page .archive-timeline.drum .timeline-header-sub,
.archive-page .archive-timeline.drum .timeline-header-stats {
    opacity: 1;
}

/* 定位到某天时的闪光提示 */
@keyframes arc-flash-glow {

    0%,
    100% {
        box-shadow: 0 0 0 3px rgba(255, 217, 113, 0.6), var(--arc-shadow-lg);
    }

    50% {
        box-shadow: 0 0 0 9px rgba(255, 217, 113, 0.22), var(--arc-shadow-lg);
    }
}

.archive-page .timeline-item.flash .timeline-content {
    animation: arc-flash-glow 0.95s ease-out 1;
}

/* ---------- 日历卡片 ---------- */
.archive-page .calendar-card {
    position: relative;
    isolation: isolate;
    border-radius: var(--arc-radius);
    border: 1.5px solid transparent;
    background:
        linear-gradient(180deg, rgba(253, 249, 242, 0.97), rgba(253, 247, 238, 0.9)) padding-box,
        var(--arc-grad-soft) border-box;
    backdrop-filter: blur(18px) saturate(1.12);
    -webkit-backdrop-filter: blur(18px) saturate(1.12);
    box-shadow: var(--arc-shadow-md);
    overflow: hidden;
}

.archive-page .calendar-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 0;
    background: radial-gradient(120% 80% at 50% -20%, rgba(255, 211, 138, 0.22), rgba(255, 211, 138, 0) 62%);
}

.archive-page .calendar-card>* {
    position: relative;
    z-index: 1;
}

.archive-page .calendar-top {
    padding: 16px 16px 12px;
    border-bottom: 1px solid var(--arc-line);
}

.archive-page .calendar-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

/* 月 / 年 切换：滑动渐变胶囊 */
.archive-page .calendar-view-toggle {
    position: relative;
    display: inline-flex;
    gap: 4px;
    padding: 5px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.62);
    border: 1px solid var(--arc-line);
    box-shadow: inset 0 1px 2px rgba(38, 52, 84, 0.05);
    --bg-left: 5px;
    --bg-width: 46px;
}

.archive-page .calendar-view-toggle::before {
    content: '';
    position: absolute;
    top: 5px;
    left: var(--bg-left, 5px);
    width: var(--bg-width, 46px);
    height: calc(100% - 10px);
    border-radius: 999px;
    background: var(--arc-grad);
    background-size: 170% 100%;
    box-shadow: 0 6px 16px rgba(255, 159, 182, 0.4);
    transition: left 0.42s var(--arc-spring), width 0.42s var(--arc-spring);
    z-index: 0;
}

.archive-page .calendar-toggle-btn {
    position: relative;
    z-index: 1;
    border: none;
    background: transparent;
    padding: 7px 16px;
    border-radius: 999px;
    color: var(--arc-ink-soft);
    cursor: pointer;
    font-weight: 700;
    font-size: 0.92rem;
    transition: color 0.3s ease;
}

.archive-page .calendar-toggle-btn.active {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

.archive-page .calendar-toggle-btn:hover:not(.active) {
    color: var(--arc-ink-strong);
}

.archive-page .calendar-today-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 13px;
    border-radius: 12px;
    border: 1px solid var(--arc-line);
    background: var(--arc-glass-strong);
    color: var(--arc-ink);
    font-weight: 700;
    font-size: 0.86rem;
    white-space: nowrap;
    cursor: pointer;
    transition: transform 0.35s var(--arc-ease),
        box-shadow 0.35s var(--arc-ease), background 0.3s ease;
}

.archive-page .calendar-today-btn:hover {
    transform: translateY(-2px);
    background: #fff;
    box-shadow: var(--arc-shadow-md);
}

.archive-page .calendar-nav {
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.archive-page .calendar-nav-label {
    flex: 1;
    text-align: center;
    font-weight: 800;
    color: var(--arc-ink-strong);
    letter-spacing: 0.03em;
}

.archive-page .calendar-nav-btn {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    border: 1px solid var(--arc-line);
    background: var(--arc-glass-strong);
    color: var(--arc-ink);
    cursor: pointer;
    transition: transform 0.35s var(--arc-ease),
        box-shadow 0.35s var(--arc-ease), background 0.3s ease;
}

.archive-page .calendar-nav-btn:hover {
    transform: translateY(-2px);
    background: #fff;
    box-shadow: var(--arc-shadow-md);
}

.archive-page .calendar-nav-btn:active {
    transform: scale(0.94);
}

.archive-page .calendar-body {
    padding: 10px 12px 16px;
    overflow: visible;
}

.archive-page .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 7px;
    overflow: visible;
}

.archive-page .cal-weekday {
    text-align: center;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--arc-ink-faint);
    padding: 4px 0 6px;
}

.archive-page .cal-cell {
    position: relative;
    z-index: 0;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--arc-ink);
    background: rgba(255, 255, 255, 0.62);
    border: 1px solid var(--arc-line);
    transition: transform 0.32s var(--arc-spring),
        box-shadow 0.32s var(--arc-ease), border-color 0.3s ease;
}

.archive-page .cal-cell.muted {
    background: transparent;
    border-color: transparent;
}

.archive-page .cal-cell.has-posts,
.archive-page .cal-month.has-posts {
    cursor: pointer;
}

.archive-page .cal-cell.has-posts::before,
.archive-page .cal-month.has-posts::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(140deg, var(--arc-gold), var(--arc-mint));
    z-index: -1;
}

.archive-page .cal-month.has-posts::before {
    background: linear-gradient(140deg, var(--arc-sky), var(--arc-lilac));
}

.archive-page .cal-cell.has-posts.heat-1::before {
    opacity: 0.4;
}

.archive-page .cal-cell.has-posts.heat-2::before {
    opacity: 0.65;
}

.archive-page .cal-cell.has-posts.heat-3::before {
    opacity: 0.92;
}

.archive-page .cal-month.has-posts.heat-1::before {
    opacity: 0.32;
}

.archive-page .cal-month.has-posts.heat-2::before {
    opacity: 0.62;
}

.archive-page .cal-month.has-posts.heat-3::before {
    opacity: 0.92;
}

.archive-page .cal-cell.has-posts:hover,
.archive-page .cal-month.has-posts:hover {
    transform: translateY(-2px) scale(1.045);
    box-shadow: var(--arc-shadow-md);
    z-index: 3;
}

.archive-page .cal-cell>span,
.archive-page .cal-month>span {
    position: relative;
    z-index: 2;
}

/* 今天 */
.archive-page .cal-cell.is-today {
    border-color: rgba(210, 84, 125, 0.6);
    box-shadow: 0 0 0 3px rgba(255, 159, 182, 0.24);
}

/* 悬浮提示 */
.archive-page .cal-cell[data-tip]::after,
.archive-page .cal-month[data-tip]::after {
    content: attr(data-tip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translate(-50%, 4px);
    padding: 6px 10px;
    border-radius: 10px;
    background: rgba(29, 36, 51, 0.93);
    color: #fff;
    font-size: 0.76rem;
    font-weight: 700;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    z-index: 20;
    transition: opacity 0.25s ease, transform 0.25s var(--arc-ease);
}

.archive-page .cal-cell[data-tip]:hover::after,
.archive-page .cal-month[data-tip]:hover::after {
    opacity: 1;
    transform: translate(-50%, 0);
}

.archive-page .cal-year-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 9px;
    overflow: visible;
}

.archive-page .cal-month {
    position: relative;
    z-index: 0;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    font-weight: 800;
    font-size: 0.92rem;
    color: var(--arc-ink);
    background: rgba(255, 255, 255, 0.62);
    border: 1px solid var(--arc-line);
    transition: transform 0.32s var(--arc-spring), box-shadow 0.32s var(--arc-ease);
}

/* ---------- 筛选分段控件 ---------- */
.archive-page .archive-filter-panel {
    width: 100%;
}

.archive-page .archive-filter-toggle {
    position: relative;
    display: flex;
    gap: 4px;
    padding: 6px;
    border-radius: 18px;
    border: 1.5px solid transparent;
    background:
        linear-gradient(var(--arc-glass-strong), var(--arc-glass-strong)) padding-box,
        var(--arc-grad-soft) border-box;
    backdrop-filter: blur(16px) saturate(1.12);
    -webkit-backdrop-filter: blur(16px) saturate(1.12);
    box-shadow: var(--arc-shadow-sm);
    --filter-bg-left: 6px;
    --filter-bg-width: 90px;
}

.archive-page .archive-filter-toggle::before {
    content: '';
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: var(--filter-bg-left, 6px);
    width: var(--filter-bg-width, 90px);
    border-radius: 13px;
    background: linear-gradient(105deg, rgba(255, 182, 201, 0.5), rgba(199, 182, 255, 0.34));
    background-size: 170% 100%;
    box-shadow: 0 8px 20px rgba(255, 159, 182, 0.2);
    transition: left 0.45s var(--arc-spring), width 0.45s var(--arc-spring);
    z-index: 0;
}

.archive-page .archive-filter-toggle::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 18px;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0) 60%);
    z-index: 0;
}

.archive-page .archive-filter-btn {
    position: relative;
    z-index: 1;
    flex: 1 1 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    border-radius: 13px;
    background: transparent;
    color: var(--arc-ink-soft);
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1.4;
    padding: 10px 8px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: color 0.3s ease, transform 0.3s var(--arc-ease);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}

.archive-page .archive-filter-btn:hover:not(.active) {
    color: var(--arc-ink-strong);
    transform: translateY(-1px);
}

.archive-page .archive-filter-btn:active {
    transform: scale(0.98);
}

.archive-page .archive-filter-btn.active {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
}

.archive-page .archive-filter-btn .arc-filter-count {
    font-size: 0.72rem;
    font-weight: 800;
    opacity: 0.7;
}

/* ---------- 移动端悬浮按钮 ---------- */
.archive-page .calendar-fab {
    display: none;
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 58px;
    height: 58px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    color: #fff;
    cursor: pointer;
    z-index: 1600;
    background: var(--arc-grad);
    background-size: 180% 180%;
    box-shadow: 0 16px 34px rgba(38, 52, 84, 0.28);
    animation: arc-fab-flow 9s ease-in-out infinite;
}

.archive-page .calendar-fab::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px solid rgba(255, 217, 113, 0.6);
    pointer-events: none;
    animation: arc-fab-pulse 2.8s ease-out infinite;
}

.archive-page .calendar-fab i {
    position: relative;
    z-index: 1;
    font-size: 20px;
}

@keyframes arc-fab-flow {

    0%,
    100% {
        background-position: 0% 50%;
    }

    50% {
        background-position: 100% 50%;
    }
}

@keyframes arc-fab-pulse {
    0% {
        transform: scale(0.9);
        opacity: 0.85;
    }

    70% {
        transform: scale(1.3);
        opacity: 0;
    }

    100% {
        transform: scale(1.3);
        opacity: 0;
    }
}

/* ---------- 移动端底部抽屉 ---------- */
.archive-page .calendar-modal {
    position: fixed;
    inset: 0;
    display: none;
    align-items: flex-end;
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
    background: rgba(20, 26, 38, 0.44);
    opacity: 0;
    transition: opacity 0.32s ease;
}

.archive-page .calendar-modal.open .calendar-modal-backdrop {
    opacity: 1;
}

.archive-page .calendar-modal.closing .calendar-modal-backdrop {
    opacity: 0;
}

.archive-page .calendar-modal .calendar-modal-inner {
    position: relative;
    width: min(100%, 560px);
    max-height: 88vh;
    overflow: auto;
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 26px 26px 0 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.9));
    box-shadow: 0 -18px 60px rgba(20, 26, 38, 0.24);
    transform: translate3d(0, 100%, 0);
    transition: transform 0.46s var(--arc-ease);
    -webkit-overflow-scrolling: touch;
}

.archive-page .calendar-modal.open .calendar-modal-inner {
    transform: translate3d(0, 0, 0);
}

.archive-page .calendar-modal.closing .calendar-modal-inner {
    transform: translate3d(0, 100%, 0);
}

.archive-page .calendar-modal-handle {
    display: block;
    width: 44px;
    height: 4px;
    margin: 10px auto 0;
    border-radius: 999px;
    background: rgba(122, 142, 178, 0.38);
}

/* 弹窗自己的标题栏：把关闭按钮从日历头部的“今日”按钮上挪开 */
.archive-page .calendar-modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px 8px;
}

.archive-page .calendar-modal-title {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--arc-ink-strong);
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: 0.02em;
}

.archive-page .calendar-modal-icon {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 9px;
    background: linear-gradient(135deg, rgba(255, 182, 201, 0.32), rgba(160, 140, 255, 0.22));
    color: #c84070;
    font-size: 0.72rem;
}

.archive-page .calendar-modal .calendar-modal-close {
    position: static;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(23, 34, 47, 0.12);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.72);
    color: var(--arc-ink);
    font-size: 15px;
    cursor: pointer;
    transition: transform 0.3s var(--arc-ease), background 0.3s ease, border-color 0.3s ease;
}

.archive-page .calendar-modal .calendar-modal-close:hover {
    transform: rotate(90deg);
    border-color: rgba(200, 64, 112, 0.28);
    background: #fff;
}

.archive-page .calendar-modal .calendar-modal-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 16px calc(18px + env(safe-area-inset-bottom, 0px));
}

/* 抽屉内日历用更干净的白色玻璃，不再叠暖纸 */
.archive-page .calendar-modal-body .calendar-card {
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 16px 36px rgba(23, 34, 47, 0.09);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
}

.archive-page .calendar-modal-body .calendar-today-btn,
.archive-page .calendar-modal-body .calendar-nav-btn {
    background: rgba(255, 255, 255, 0.66);
}

/* 弹窗内不再重复页面的筛选分段控件 */
.archive-page .calendar-modal-body .archive-filter-panel {
    display: none;
}

/* 抽屉内复用真实侧栏（打开时由脚本移动到此处）：
   覆盖桌面端的 sticky 定位、固定宽度，以及移动端的 display:none 隐藏 */
.archive-page .calendar-modal-body .archive-sidebar {
    position: static;
    top: auto;
    width: 100%;
    flex: 1 1 auto;
    display: flex;
    gap: 14px;
}

/* 抽屉容器通过脚本获得焦点用于可访问性，无需显示焦点环 */
.archive-page .calendar-modal .calendar-modal-inner:focus {
    outline: none;
}

/* ==================================================
   响应式
   ================================================== */
@media (max-width: 1080px) {
    .archive-page .archive-sidebar {
        width: 302px;
        flex: 0 0 302px;
    }
}

@media (max-width: 900px) {
    /* 移动端页头改成左对齐的杂志式报头，避免整页只剩一条居中线 */
    .archive-page .timeline-header {
        justify-content: flex-start;
        padding: 18px 0 28px;
        margin-bottom: 10px;
    }

    .archive-page .timeline-header-inner {
        align-items: flex-start;
        text-align: left;
        gap: 10px;
    }

    .archive-page .timeline-header-stats {
        justify-content: flex-start;
    }

    .archive-page .archive-section {
        padding: 84px 14px 44px;
    }

    .archive-page .archive-main {
        padding: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        box-shadow: none;
        overflow: visible;
        isolation: auto;
    }

    .archive-page .archive-main::before,
    .archive-page .archive-main::after {
        content: none;
    }

    .archive-page .archive-sidebar {
        display: none;
    }

    .archive-page .calendar-fab {
        display: inline-flex;
    }

    .archive-page .archive-timeline {
        padding: 6px 4px 24px 34px;
    }

    .archive-page .archive-timeline:not(.drum)::before {
        left: 11px;
        top: 24px;
        bottom: 24px;
    }

    .archive-page .archive-timeline:not(.drum)::after {
        left: 5px;
    }

    .archive-page .timeline-dot {
        left: -24px;
    }

    .archive-page .timeline-content {
        margin-left: 14px;
        padding: 16px 18px;
    }

    .archive-page .timeline-left {
        padding-left: 0;
    }

    .archive-page .archive-timeline:not(.drum) .timeline-separator-year {
        top: 70px;
    }

    .archive-page .timeline-header {
        padding: 18px 0 24px;
    }
}

@media (max-width: 640px) {
    .archive-page .timeline-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        min-height: 0;
    }

    .archive-page .timeline-left {
        width: 100%;
    }

    .archive-page .timeline-right {
        width: 100%;
    }

    .archive-page .timeline-title {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        font-size: 1.16rem;
    }

    .archive-page .timeline-right .timeline-date {
        padding: 6px 12px;
        font-size: 0.86rem;
    }
}

@media (max-width: 600px) {
    .archive-page .archive-section {
        padding: 74px 10px 34px;
    }

    .archive-page .timeline-header-content {
        font-size: 2.05rem;
    }

    .archive-page .timeline-header-sub {
        font-size: 0.88rem;
    }

    .archive-page .archive-timeline {
        padding-left: 30px;
    }

    .archive-page .archive-timeline:not(.drum)::before {
        left: 9px;
    }

    .archive-page .archive-timeline:not(.drum)::after {
        left: 3px;
    }

    .archive-page .timeline-dot {
        left: -21px;
        width: 12px;
        height: 12px;
        margin-top: -6px;
    }

    .archive-page .timeline-content {
        margin-left: 12px;
        border-radius: 14px;
    }

    .archive-page .cal-grid {
        gap: 5px;
    }

    .archive-page .cal-cell {
        height: 34px;
        font-size: 0.84rem;
        border-radius: 10px;
    }

    .archive-page .archive-filter-btn {
        font-size: 0.84rem;
        padding: 9px 6px;
    }
}

/* ================= 重构：档案索引（左侧日历 + 右侧编年条目） ================= */
.archive-page .archive-section {
    padding: 96px 24px 64px;
}

.archive-page .archive-layout {
    max-width: 1180px;
    flex-direction: row-reverse;
    gap: 42px;
}

.archive-page .archive-main {
    padding: 0;
    border: none;
    border-radius: 0;
    background: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
    overflow: visible;
    isolation: auto;
}

.archive-page .archive-main::before,
.archive-page .archive-main::after {
    content: none;
}

.archive-page .archive-sidebar {
    width: 300px;
    flex: 0 0 300px;
    top: 88px;
    gap: 12px;
}

.archive-page .calendar-card {
    padding: 14px;
    border-radius: 26px;
    border: 1px solid rgba(255, 255, 255, 0.68);
    background:
        linear-gradient(160deg, rgba(253, 249, 242, 0.9), rgba(253, 246, 236, 0.78));
    box-shadow:
        0 20px 44px rgba(23, 34, 47, 0.12),
        0 1px 0 rgba(255, 255, 255, 0.72) inset;
    backdrop-filter: blur(20px) saturate(1.1);
    -webkit-backdrop-filter: blur(20px) saturate(1.1);
}

.archive-page .archive-filter-toggle {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 5px;
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.64);
    background: rgba(253, 249, 242, 0.78);
    box-shadow: 0 14px 30px rgba(23, 34, 47, 0.1);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
}

.archive-page .archive-filter-btn {
    justify-content: space-between;
    width: 100%;
    min-height: 42px;
    padding: 0 14px;
    border-radius: 16px;
}

.archive-page .archive-filter-btn.active {
    background: linear-gradient(105deg, rgba(200, 64, 112, 0.12), rgba(160, 140, 255, 0.12)) !important;
    color: var(--arc-ink-strong);
}

/* 页头：左对齐的档案报头 */
.archive-page .timeline-header {
    justify-content: flex-start;
    padding: 0 0 18px;
    margin: 0 0 8px;
}

.archive-page .timeline-header-inner {
    width: 100%;
    align-items: flex-start;
    text-align: left;
    gap: 9px;
}

.archive-page .timeline-header-inner::before {
    content: 'ARCHIVE · TIMELINE';
    font-family: var(--font-ui);
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.28em;
    color: rgba(23, 34, 47, 0.42);
}

.archive-page .timeline-header-content {
    font-size: clamp(2.5rem, 5vw, 3.9rem);
    line-height: 1.04;
    background: linear-gradient(100deg, #c84070 0%, #a08cff 52%, #58d8b2 100%);
    background-size: 180% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    filter: drop-shadow(0 12px 26px rgba(23, 34, 47, 0.12));
}

.archive-page .timeline-header-stats {
    justify-content: flex-start;
    gap: 0;
    margin-top: 2px;
}

.archive-page .arc-stat {
    padding: 0 16px 0 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
}

.archive-page .arc-stat + .arc-stat {
    padding-left: 16px;
    border-left: 1px solid rgba(23, 34, 47, 0.16);
}

.archive-page .arc-stat b {
    font-size: 1rem;
    background: none;
    color: var(--arc-ink-strong);
    -webkit-background-clip: initial;
    background-clip: initial;
}

.archive-page .arc-stat em {
    font-size: 0.68rem;
    letter-spacing: 0.12em;
}

.archive-page .archive-timeline {
    padding: 0 0 8px 38px;
}

.archive-page .archive-timeline:not(.drum)::before {
    left: 10px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: linear-gradient(180deg,
            rgba(200, 64, 112, 0.0) 0%,
            rgba(200, 64, 112, 0.55) 8%,
            rgba(160, 140, 255, 0.5) 48%,
            rgba(88, 216, 178, 0.5) 88%,
            rgba(88, 216, 178, 0) 100%);
}

.archive-page .archive-timeline:not(.drum)::after {
    left: 5px;
    width: 12px;
    height: 12px;
    background: radial-gradient(circle,
            rgba(255, 253, 248, 0.98) 0%,
            rgba(200, 64, 112, 0.7) 40%,
            rgba(200, 64, 112, 0) 74%);
}

.archive-page .timeline-separator {
    padding: 20px 0 8px;
}

.archive-page .timeline-separator .timeline-separator-content {
    width: 100%;
    gap: 14px;
    justify-content: flex-start;
}

.archive-page .timeline-separator .timeline-separator-pattern:first-child {
    display: none;
}

.archive-page .archive-timeline:not(.drum) .timeline-separator-year {
    top: 78px;
    margin: 0 0 6px;
}

.archive-page .archive-timeline:not(.drum) .timeline-separator-year .timeline-separator-content {
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
}

.archive-page .timeline-separator-year .timeline-separator-label {
    font-size: clamp(1.8rem, 2.6vw, 2.35rem);
    line-height: 1;
    background: none;
    color: var(--arc-ink-strong);
    -webkit-background-clip: initial;
    background-clip: initial;
    animation: none;
    letter-spacing: -0.02em;
}

.archive-page .timeline-separator-year .timeline-separator-pattern {
    background: linear-gradient(90deg, rgba(200, 64, 112, 0.4), rgba(200, 64, 112, 0));
}

.archive-page .timeline-separator-year .timeline-separator-pattern:last-child {
    background: linear-gradient(90deg, rgba(88, 216, 178, 0.4), rgba(88, 216, 178, 0));
}

.archive-page .timeline-separator-month .timeline-separator-label {
    font-family: var(--font-ui);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: #b23f6b;
}

.archive-page .timeline-item {
    margin-bottom: 0;
}

.archive-page .timeline-content {
    margin-left: 0;
    padding: 15px 12px 15px 16px;
    min-height: 0;
    gap: 14px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.38);
    background: linear-gradient(120deg, rgba(253, 249, 242, 0.78), rgba(250, 242, 246, 0.66));
    box-shadow: 0 8px 22px rgba(23, 34, 47, 0.06);
    backdrop-filter: blur(14px) saturate(1.06);
    -webkit-backdrop-filter: blur(14px) saturate(1.06);
    transform: none;
}

.archive-page .timeline-link:hover .timeline-content,
.archive-page .timeline-link:focus-visible .timeline-content {
    transform: none;
    border-color: rgba(255, 255, 255, 0.72);
    background: rgba(253, 249, 242, 0.86);
    box-shadow:
        0 14px 30px rgba(23, 34, 47, 0.1),
        0 1px 0 rgba(255, 255, 255, 0.7) inset;
}

.archive-page .timeline-content::after {
    display: none;
}

.archive-page .timeline-badge {
    left: 0;
    top: 50%;
    bottom: auto;
    width: 3px;
    height: 26px;
    margin-top: -13px;
    border-radius: 999px;
    background: linear-gradient(180deg, #c84070, #a08cff 55%, #58d8b2);
    opacity: 0.9;
}

.archive-page .timeline-link:hover .timeline-badge {
    width: 3px;
    opacity: 1;
}

.archive-page .timeline-dot {
    left: -32px;
    width: 9px;
    height: 9px;
    margin-top: -4.5px;
    border-width: 2px;
    border-color: rgba(200, 64, 112, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 253, 248, 0.75);
}

.archive-page .timeline-left {
    gap: 5px;
    padding-left: 4px;
}

.archive-page .timeline-title {
    justify-content: flex-start;
    gap: 10px;
    font-size: 1.13rem;
    font-weight: 700;
    line-height: 1.35;
    color: var(--arc-ink-strong);
}

.archive-page .blog-type {
    padding: 2px 8px;
    border: 1px solid rgba(23, 34, 47, 0.12);
    background: transparent;
    color: rgba(23, 34, 47, 0.56);
    font-size: 0.6rem;
    letter-spacing: 0.04em;
}

.archive-page .timeline-excerpt {
    display: -webkit-box;
    overflow: hidden;
    font-size: 0.76rem;
    line-height: 1.6;
    color: rgba(23, 34, 47, 0.5);
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.archive-page .timeline-right {
    width: 106px;
    justify-content: flex-end;
    padding-left: 10px;
    border-left: 1px dashed rgba(23, 34, 47, 0.1);
}

.archive-page .timeline-right .timeline-date {
    padding: 0;
    border: none;
    background: transparent;
    color: rgba(23, 34, 47, 0.56);
    font-family: var(--font-ui);
    font-size: 0.64rem;
    letter-spacing: 0.08em;
    text-align: right;
}

.archive-page .timeline-link:hover .timeline-right .timeline-date {
    color: #b23f6b;
}

/* 移动端保持同一套编年条目，只收窄留白 */
@media (max-width: 900px) {
    .archive-page .archive-section {
        padding: 84px 14px 44px;
    }

    .archive-page .archive-timeline {
        padding: 0 0 8px 32px;
    }

    .archive-page .timeline-header-content {
        font-size: clamp(2rem, 9vw, 2.7rem);
    }

    .archive-page .timeline-content {
        border-radius: 14px;
        background: rgba(253, 249, 242, 0.52);
    }

    .archive-page .timeline-right {
        width: auto;
        padding-left: 0;
        border-left: 0;
    }
}

@media (max-width: 600px) {
    .archive-page .timeline-title {
        font-size: 1.02rem;
    }

    .archive-page .timeline-right .timeline-date {
        font-size: 0.72rem;
    }
}

@media (prefers-reduced-motion: reduce) {
    .archive-page .timeline-item.timeline-item-enter {
        animation: none;
    }

    .archive-page .archive-timeline:not(.drum)::after {
        animation: none;
        opacity: 0;
    }

    .archive-page .timeline-header-content,
    .archive-page .timeline-separator-year .timeline-separator-label,
    .archive-page .calendar-fab,
    .archive-page .calendar-fab::after {
        animation: none;
    }

    .archive-page .timeline-item.flash .timeline-content {
        animation: none;
        box-shadow: 0 0 0 3px rgba(255, 217, 113, 0.6), var(--arc-shadow-lg);
    }

    .archive-page .timeline-content::after {
        display: none;
    }

    .archive-page .calendar-modal .calendar-modal-inner {
        transition: none;
    }
}

/* ==================================================
   ARCHIVE / INDEX · 2026 杂志式年度索引
   全幅报头 + 年份导航 + 按月卡片网格
   ================================================== */

/* 半透明玻璃底：沿用首页上部的清晰照片底，不再铺不透明暖纸 */
.archive-page {
    position: relative;
    min-height: 100vh;
    background:
        radial-gradient(120% 70% at 88% 0%, rgba(255, 214, 232, 0.2), rgba(255, 255, 255, 0) 60%),
        radial-gradient(100% 60% at 0% 6%, rgba(201, 246, 230, 0.18), rgba(255, 255, 255, 0) 58%),
        linear-gradient(180deg,
            rgba(255, 255, 255, 0.58) 0%,
            rgba(255, 255, 255, 0.38) 34%,
            rgba(255, 255, 255, 0.5) 100%);
}

.archive-page .arc-hero,
.archive-page .arc-command,
.archive-page .arc-year-tabs,
.archive-page .archive-layout {
    width: 100%;
    max-width: 1180px;
    margin-left: auto;
    margin-right: auto;
}

.archive-page .archive-section {
    padding: 100px 20px 72px;
}

.archive-page .archive-layout {
    display: block;
    margin-top: 0;
}

.archive-page .archive-main {
    position: relative;
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    overflow: visible;
    isolation: auto;
}

.archive-page .archive-main::before,
.archive-page .archive-main::after {
    content: none;
    display: none;
}

/* ---------- 报头 ---------- */
.archive-page .arc-hero {
    position: relative;
    padding: 8px 0 30px;
}

.archive-page .arc-eyebrow {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    color: rgba(23, 34, 47, 0.58);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.32em;
    text-shadow: 0 1px 10px rgba(255, 255, 255, 0.75);
    line-height: 1;
}

.archive-page .arc-eyebrow i {
    display: block;
    width: 36px;
    height: 1px;
    background: linear-gradient(90deg, rgba(232, 93, 132, 0.65), rgba(160, 140, 255, 0.25));
}

.archive-page .arc-hero-main {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 30px;
    margin-top: 24px;
}

.archive-page .arc-title {
    margin: 0;
    font-size: clamp(3.2rem, 6.2vw, 5.6rem);
    font-weight: 800;
    line-height: 0.94;
    letter-spacing: -0.065em;
    color: #17222f;
    background: linear-gradient(105deg, #17222f 0%, #17324f 54%, #c84070 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.archive-page .arc-stats {
    display: flex;
    align-items: flex-end;
    gap: 26px;
    padding: 0 2px 8px;
}

.archive-page .arc-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    white-space: nowrap;
}

.archive-page .arc-stat b {
    color: #17222f;
    font-size: 1.8rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.04em;
    line-height: 1;
}

.archive-page .arc-stat em {
    color: rgba(23, 34, 47, 0.48);
    font-size: 0.66rem;
    font-style: normal;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
}

.archive-page .arc-stat-years {
    padding-left: 26px;
    border-left: 1px solid rgba(23, 34, 47, 0.14);
}

.archive-page .arc-stat-years b {
    color: rgba(23, 34, 47, 0.72);
    font-size: 1.05rem;
    letter-spacing: 0.02em;
}

/* ---------- 命令条：筛选 + 日历入口 ---------- */
.archive-page .arc-command {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 16px 0 14px;
    border-top: 1px solid rgba(23, 34, 47, 0.12);
}

.archive-page .arc-filter-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0;
}

.archive-page .arc-filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-right: 22px;
    padding: 7px 0 6px;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: none;
    color: rgba(23, 34, 47, 0.66);
    font-size: 0.84rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    text-shadow: 0 1px 10px rgba(255, 255, 255, 0.72);
    cursor: pointer;
    transition: color 0.25s ease, border-color 0.25s ease;
}

.archive-page .arc-filter-btn:hover {
    color: #17222f;
}

.archive-page .arc-filter-btn.active {
    color: #17222f;
    border-bottom-color: #e85d84;
}

.archive-page .arc-filter-count {
    min-width: 18px;
    padding: 2px 5px;
    border-radius: 5px;
    background: rgba(23, 34, 47, 0.07);
    color: rgba(23, 34, 47, 0.58);
    font-size: 0.64rem;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
    text-shadow: 0 1px 8px rgba(255, 255, 255, 0.6);
}

.archive-page .arc-filter-btn.active .arc-filter-count {
    background: rgba(232, 93, 132, 0.12);
    color: #c84070;
}

.archive-page .arc-calendar-btn {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    flex: 0 0 auto;
    padding: 9px 14px;
    border: 1px solid rgba(23, 34, 47, 0.16);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.6);
    color: rgba(23, 34, 47, 0.72);
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease, transform 0.25s ease;
}

.archive-page .arc-calendar-btn:hover {
    color: #17222f;
    border-color: rgba(232, 93, 132, 0.5);
    background: rgba(255, 255, 255, 0.84);
    transform: translateY(-2px);
}

.archive-page .arc-calendar-btn i {
    color: #c84070;
    font-size: 0.84rem;
}

/* ---------- 年份导航 ---------- */
.archive-page .arc-year-tabs {
    display: flex;
    align-items: flex-end;
    gap: 0;
    margin-top: 2px;
    padding: 0;
    border-bottom: 1px solid rgba(23, 34, 47, 0.14);
    overflow-x: auto;
    scrollbar-width: none;
}

.archive-page .arc-year-tabs::-webkit-scrollbar {
    display: none;
}

.archive-page .arc-year-tab {
    position: relative;
    display: inline-flex;
    align-items: flex-end;
    gap: 7px;
    flex: 0 0 auto;
    margin-right: 30px;
    padding: 11px 0 14px;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    color: rgba(23, 34, 47, 0.6);
    font-family: inherit;
    text-shadow: 0 1px 10px rgba(255, 255, 255, 0.72);
    cursor: pointer;
    transition: color 0.25s ease, border-color 0.25s ease;
}

.archive-page .arc-year-tab:hover {
    color: rgba(23, 34, 47, 0.78);
}

.archive-page .arc-year-tab.active {
    color: #17222f;
    border-bottom-color: #e85d84;
}

.archive-page .arc-year-tab-num {
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
}

.archive-page .arc-year-tab-count {
    color: rgba(23, 34, 47, 0.55);
    font-size: 0.64rem;
    font-weight: 600;
    line-height: 1;
    text-shadow: 0 1px 8px rgba(255, 255, 255, 0.65);
    transform: translateY(-2px);
}

.archive-page .arc-year-tab.active .arc-year-tab-count {
    color: #c84070;
}

/* ---------- 年度索引主体 ---------- */
.archive-page .archive-timeline.arc-index {
    margin: 0;
    padding: 32px 0 0;
    border-radius: 0;
}

.archive-page .archive-timeline.arc-index::before,
.archive-page .archive-timeline.arc-index::after {
    content: none;
    display: none;
}

.archive-page .arc-year {
    margin: 0 0 clamp(44px, 5vw, 68px);
    scroll-margin-top: 96px;
}

.archive-page .arc-year-head {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 0 0 16px;
    border-bottom: 1px solid rgba(23, 34, 47, 0.14);
}

.archive-page .arc-year-number {
    color: #17222f;
    font-size: clamp(3.2rem, 6vw, 5.4rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.07em;
    line-height: 0.82;
}

.archive-page .arc-year-rule {
    flex: 1;
    min-width: 40px;
    height: 1px;
    background: linear-gradient(90deg, rgba(232, 93, 132, 0.48), rgba(160, 140, 255, 0.18), transparent);
}

.archive-page .arc-year-meta {
    flex: 0 0 auto;
    color: rgba(23, 34, 47, 0.44);
    font-size: 0.67rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
}

.archive-page .arc-month {
    margin-top: 28px;
}

.archive-page .arc-month-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 0 12px;
}

.archive-page .arc-month-number {
    display: inline-grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 1px solid rgba(232, 93, 132, 0.34);
    color: #c84070;
    font-size: 0.7rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
}

.archive-page .arc-month-label {
    margin: 0;
    color: #17222f;
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    text-shadow: 0 1px 9px rgba(255, 255, 255, 0.72);
}

.archive-page .arc-month-count {
    margin-left: auto;
    color: rgba(23, 34, 47, 0.55);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-shadow: 0 1px 8px rgba(255, 255, 255, 0.62);
}

.archive-page .arc-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

/* ---------- 长条形文章卡片 ---------- */
.archive-page .arc-row {
    display: block;
    position: relative;
    min-width: 0;
    margin: 0 !important;
    color: inherit;
    text-decoration: none;
    outline: none;
    scroll-margin-top: 96px;
}

.archive-page .arc-row-inner {
    position: relative;
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr) 46px;
    align-items: center;
    gap: 22px;
    min-height: 108px;
    padding: 17px 22px 17px 18px;
    overflow: hidden;
    text-align: left;
    border: 1px solid rgba(23, 34, 47, 0.1);
    border-radius: 18px;
    background: linear-gradient(120deg,
            rgba(255, 255, 255, 0.9),
            rgba(248, 251, 255, 0.84) 58%,
            rgba(244, 248, 252, 0.8));
    box-shadow: 0 7px 20px rgba(23, 34, 47, 0.05);
    transition: transform 0.34s var(--arc-ease), border-color 0.34s ease, box-shadow 0.34s ease;
}

/* 左侧色条：悬停时从发丝线长成完整渐变 */
.archive-page .arc-row-inner::before {
    content: '';
    position: absolute;
    left: 0;
    top: 18px;
    bottom: 18px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, #e85d84, #a08cff 52%, #58d8b2);
    opacity: 0.36;
    transition: opacity 0.34s ease, top 0.34s ease, bottom 0.34s ease;
}

.archive-page .arc-row-inner::after {
    content: '';
    position: absolute;
    top: -70px;
    right: -46px;
    width: 190px;
    height: 190px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 182, 201, 0.2), transparent 66%);
    opacity: 0.35;
    pointer-events: none;
    transition: opacity 0.34s ease, transform 0.34s ease;
}

.archive-page .arc-row:hover .arc-row-inner {
    border-color: rgba(232, 93, 132, 0.28);
    box-shadow: 0 16px 36px rgba(23, 34, 47, 0.1);
    transform: translateX(6px);
}

.archive-page .arc-row:hover .arc-row-inner::before {
    top: 0;
    bottom: 0;
    opacity: 1;
}

.archive-page .arc-row:hover .arc-row-inner::after {
    opacity: 0.85;
    transform: scale(1.16);
}

.archive-page .arc-row:focus-visible .arc-row-inner {
    border-color: rgba(232, 93, 132, 0.56);
    box-shadow: 0 0 0 3px rgba(232, 93, 132, 0.18), 0 14px 32px rgba(23, 34, 47, 0.09);
}

/* 日期块 */
.archive-page .arc-row-date {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 4px;
    align-self: stretch;
    padding-right: 20px;
    border-right: 1px solid rgba(23, 34, 47, 0.08);
}

.archive-page .arc-row-day {
    color: #17222f;
    font-size: 2rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.055em;
    line-height: 0.9;
    transition: color 0.3s ease;
}

.archive-page .arc-row-week {
    color: rgba(23, 34, 47, 0.4);
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    line-height: 1.2;
    white-space: nowrap;
}

.archive-page .arc-row:hover .arc-row-day {
    color: #c84070;
}

/* 正文 */
.archive-page .arc-row-body {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
}

.archive-page .arc-row-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.archive-page .arc-row-type {
    flex: 0 0 auto;
    padding: 2px 7px;
    border: 1px solid rgba(160, 140, 255, 0.22);
    border-radius: 4px;
    background: rgba(199, 182, 255, 0.1);
    color: #6d5cc9;
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    line-height: 1.4;
}

.archive-page .arc-row-date-text {
    min-width: 0;
    overflow: hidden;
    color: rgba(23, 34, 47, 0.4);
    font-size: 0.66rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.archive-page .arc-row-title {
    margin: 0;
    overflow: hidden;
    color: #17222f;
    font-size: 1.1rem;
    font-weight: 650;
    letter-spacing: -0.022em;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.archive-page .arc-row-excerpt {
    margin: 0;
    overflow: hidden;
    color: rgba(23, 34, 47, 0.5);
    font-size: 0.76rem;
    line-height: 1.55;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.archive-page .arc-row-arrow {
    display: inline-grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 1px solid rgba(23, 34, 47, 0.1);
    border-radius: 50%;
    color: rgba(23, 34, 47, 0.46);
    font-size: 0.72rem;
    transition: transform 0.34s var(--arc-ease), background 0.34s ease, color 0.34s ease, border-color 0.34s ease;
}

.archive-page .arc-row:hover .arc-row-arrow {
    border-color: #17222f;
    background: #17222f;
    color: #fff;
    transform: translateX(4px);
}

/* 入场与定位高亮 */
@keyframes arc-row-rise {
    from {
        opacity: 0;
        transform: translateY(14px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes arc-row-flash {

    0%,
    100% {
        box-shadow: 0 7px 20px rgba(23, 34, 47, 0.05);
    }

    32% {
        box-shadow: 0 0 0 4px rgba(232, 93, 132, 0.22), 0 16px 34px rgba(23, 34, 47, 0.11);
    }
}

.archive-page .arc-row.timeline-item-enter {
    animation: arc-row-rise 0.55s var(--arc-ease) both;
    animation-delay: var(--arc-delay, 0ms);
}

.archive-page .arc-row.flash .arc-row-inner {
    animation: arc-row-flash 0.9s ease;
}

.archive-page .arc-empty {
    padding: 48px 0 64px;
    color: rgba(23, 34, 47, 0.46);
    font-size: 0.9rem;
    text-align: center;
}

/* ---------- 侧栏降级为日历抽屉的数据源 ---------- */
.archive-page .archive-sidebar {
    position: fixed;
    left: -10000px;
    top: 0;
    width: 336px;
    flex: none;
    visibility: hidden;
    pointer-events: none;
}

.archive-page .calendar-modal-body .archive-sidebar {
    position: static;
    left: auto;
    top: auto;
    width: 100%;
    flex: 1 1 auto;
    display: flex;
    visibility: visible;
    pointer-events: auto;
}

/* 日历入口已移到报头，隐藏移动端重复的悬浮按钮 */
.archive-page .calendar-fab {
    display: none !important;
}

/* 桌面端把日历抽屉改成居中弹窗 */
@media (min-width: 901px) {
    .archive-page .calendar-modal {
        align-items: center;
        padding: 24px;
    }

    .archive-page .calendar-modal .calendar-modal-inner {
        width: min(92vw, 560px);
        max-height: 84vh;
        border-radius: 26px;
        box-shadow: 0 30px 90px rgba(20, 26, 38, 0.3);
        transform: translate3d(0, 24px, 0) scale(0.98);
    }

    .archive-page .calendar-modal.open .calendar-modal-inner {
        transform: translate3d(0, 0, 0) scale(1);
    }

    .archive-page .calendar-modal.closing .calendar-modal-inner {
        transform: translate3d(0, 24px, 0) scale(0.98);
    }

    .archive-page .calendar-modal-handle {
        display: none;
    }
}

/* ---------- 归档页响应式 ---------- */
@media (max-width: 900px) {
    .archive-page .archive-section {
        padding: 82px 14px 46px;
    }

    .archive-page .arc-hero {
        padding: 2px 0 22px;
    }

    .archive-page .arc-hero-main {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        margin-top: 20px;
    }

    .archive-page .arc-title {
        font-size: clamp(2.7rem, 11.5vw, 4rem);
    }

    .archive-page .arc-stats {
        gap: 20px;
        padding: 0;
    }

    .archive-page .arc-stat b {
        font-size: 1.55rem;
    }

    .archive-page .arc-stat-years {
        padding-left: 20px;
    }

    .archive-page .arc-command {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 13px 0 10px;
    }

    .archive-page .arc-filter-row {
        flex-wrap: nowrap;
        margin: 0 -14px;
        padding: 0 14px 2px;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .archive-page .arc-filter-row::-webkit-scrollbar {
        display: none;
    }

    .archive-page .arc-filter-btn {
        flex: 0 0 auto;
    }

    .archive-page .arc-calendar-btn {
        align-self: flex-start;
    }

    .archive-page .arc-year-tab {
        margin-right: 22px;
    }

    .archive-page .arc-year-tab-num {
        font-size: 1.12rem;
    }

    .archive-page .archive-timeline.arc-index {
        padding-top: 24px;
    }

    .archive-page .arc-year {
        margin-bottom: 38px;
        scroll-margin-top: 78px;
    }

    .archive-page .arc-year-head {
        position: sticky;
        top: 60px;
        z-index: 20;
        margin: 0 -14px;
        padding: 12px 14px 10px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.24));
        border-bottom: 1px solid rgba(23, 34, 47, 0.12);
        backdrop-filter: blur(18px) saturate(1.08);
        -webkit-backdrop-filter: blur(18px) saturate(1.08);
    }

    .archive-page .arc-year-number {
        font-size: clamp(2.5rem, 10vw, 3.8rem);
    }

    .archive-page .arc-year-meta {
        font-size: 0.62rem;
        letter-spacing: 0.1em;
    }

    .archive-page .arc-month {
        margin-top: 22px;
    }

    .archive-page .arc-month-head {
        padding-bottom: 10px;
    }

    .archive-page .arc-month-label {
        font-size: 1.05rem;
    }

    .archive-page .arc-stack {
        gap: 9px;
    }

    .archive-page .arc-row-inner {
        grid-template-columns: 74px minmax(0, 1fr) 38px;
        gap: 16px;
        min-height: 96px;
        padding: 14px 16px 14px 15px;
        border-radius: 16px;
    }

    .archive-page .arc-row-date {
        padding-right: 14px;
    }

    .archive-page .arc-row-day {
        font-size: 1.7rem;
    }

    .archive-page .arc-row-title {
        font-size: 1.02rem;
    }

    .archive-page .arc-row-excerpt {
        font-size: 0.72rem;
    }

    .archive-page .arc-row-arrow {
        width: 34px;
        height: 34px;
    }
}

/* 平板区间保持桌面式的横向报头与命令条，避免过早堆叠 */
@media (min-width: 601px) and (max-width: 900px) {
    .archive-page .arc-hero-main {
        flex-direction: row;
        align-items: flex-end;
        gap: 20px;
    }

    .archive-page .arc-title {
        font-size: clamp(2.6rem, 7vw, 4rem);
    }

    .archive-page .arc-stats {
        flex-direction: row;
        align-items: flex-end;
        gap: 18px;
        padding-bottom: 3px;
    }

    .archive-page .arc-command {
        flex-direction: row;
        align-items: center;
        gap: 16px;
        padding: 13px 0 10px;
    }

    .archive-page .arc-filter-row {
        flex-wrap: wrap;
        margin: 0;
        padding: 0;
        overflow: visible;
    }

    .archive-page .arc-calendar-btn {
        align-self: center;
        width: auto;
    }
}

@media (max-width: 600px) {
    .archive-page .archive-section {
        padding: 76px 14px 38px;
    }

    .archive-page .arc-title {
        font-size: clamp(2.5rem, 12.5vw, 3.4rem);
    }

    .archive-page .arc-command {
        border-top: 0;
        padding-top: 4px;
    }

    .archive-page .arc-calendar-btn {
        width: 100%;
        justify-content: center;
    }

    .archive-page .arc-year-tabs {
        margin-top: 0;
    }

    .archive-page .arc-year-tab {
        margin-right: 20px;
    }

    .archive-page .arc-year-head {
        top: 60px;
    }

    .archive-page .arc-stack {
        gap: 8px;
    }

    .archive-page .arc-row-inner {
        grid-template-columns: 50px minmax(0, 1fr) 30px;
        gap: 12px;
        min-height: 82px;
        padding: 11px 12px 11px 14px;
        border-radius: 14px;
    }

    .archive-page .arc-row-date {
        gap: 2px;
        padding-right: 10px;
    }

    .archive-page .arc-row-day {
        font-size: 1.5rem;
    }

    .archive-page .arc-row-week {
        font-size: 0.55rem;
        letter-spacing: 0.04em;
    }

    .archive-page .arc-row-type {
        font-size: 0.56rem;
        padding: 2px 6px;
    }

    .archive-page .arc-row-date-text {
        display: none;
    }

    .archive-page .arc-row-title {
        font-size: 0.94rem;
    }

    .archive-page .arc-row-excerpt {
        display: none;
    }

    .archive-page .arc-row-arrow {
        width: 28px;
        height: 28px;
        font-size: 0.62rem;
    }

    .archive-page .arc-month-count {
        display: none;
    }
}

@media (max-width: 380px) {
    .archive-page .arc-title {
        font-size: 2.35rem;
    }

    .archive-page .arc-year-number {
        font-size: 2.3rem;
    }

    .archive-page .arc-month-number {
        width: 26px;
        height: 26px;
        font-size: 0.64rem;
    }

    .archive-page .arc-row-inner {
        grid-template-columns: 44px minmax(0, 1fr) 26px;
        gap: 10px;
        padding: 10px 10px 10px 12px;
    }

    .archive-page .arc-row-day {
        font-size: 1.35rem;
    }

    .archive-page .arc-row-arrow {
        width: 26px;
        height: 26px;
        font-size: 0.58rem;
    }
}

@media (prefers-reduced-motion: reduce) {
    .archive-page .arc-row,
    .archive-page .arc-row.timeline-item-enter {
        animation: none !important;
        opacity: 1;
        transform: none;
    }

    .archive-page .arc-row:hover .arc-row-inner {
        transform: none;
    }

    .archive-page .arc-row:hover .arc-row-arrow {
        transform: none;
    }

    .archive-page .arc-row.flash .arc-row-inner {
        animation: none;
        box-shadow: 0 0 0 3px rgba(232, 93, 132, 0.24), 0 16px 34px rgba(23, 34, 47, 0.1);
    }
}
</style>