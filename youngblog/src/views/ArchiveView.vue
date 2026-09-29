<template>
    <main class="archive-page">
        <section class="archive-section">
            <div class="archive-layout">
                <!-- 主时间轴 -->
                <div class="archive-main">
                    <div class="archive-timeline" :class="{ drum: isDesktopDrum }" ref="timelineRef"
                        @scroll="onTimelineScroll">
                        <!-- 标题头 -->
                        <div class="timeline-item timeline-header">
                            <div class="timeline-header-inner">
                                <h1 class="timeline-header-content" data-i18n="archive_timeline_title">
                                    {{ i18n.currentTranslations.archive_timeline_title }}
                                </h1>
                                <p class="timeline-header-sub">{{ i18n.currentTranslations.archive_header_subtitle }}
                                </p>
                                <div class="timeline-header-stats">
                                    <span class="arc-stat">
                                        <b>{{ filteredBlogs.length }}</b>
                                        <em>{{ i18n.currentTranslations.posts }}</em>
                                    </span>
                                    <span v-if="yearSpan" class="arc-stat">
                                        <b>{{ yearSpan }}</b>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- 动态生成年份、月份、博客条目 -->
                        <template v-for="(group, index) in timelineGroups" :key="index">
                            <!-- 年份分隔 -->
                            <div v-if="group.type === 'year'"
                                class="timeline-item timeline-separator timeline-separator-year">
                                <div class="timeline-separator-content">
                                    <span class="timeline-separator-pattern" aria-hidden="true"></span>
                                    <span class="timeline-separator-label">{{ group.label }}</span>
                                    <span class="timeline-separator-pattern" aria-hidden="true"></span>
                                </div>
                            </div>

                            <!-- 月份分隔 -->
                            <div v-else-if="group.type === 'month'"
                                class="timeline-item timeline-separator timeline-separator-month">
                                <div class="timeline-separator-content">
                                    <span class="timeline-separator-pattern" aria-hidden="true"></span>
                                    <span class="timeline-separator-label">{{ group.label }}</span>
                                    <span class="timeline-separator-pattern" aria-hidden="true"></span>
                                </div>
                            </div>

                            <!-- 博客条目 -->
                            <div v-else class="timeline-item" :data-date="group.blog.date"
                                :class="{ 'timeline-item-enter': shouldAnimate }"
                                :style="{ '--timeline-enter-delay': enterDelay(index) }">
                                <a class="timeline-link" :href="`#/blog/${group.blog.id}`">
                                    <div class="timeline-dot"></div>
                                    <div class="timeline-content">
                                        <div class="timeline-badge" aria-hidden="true"></div>
                                        <div class="timeline-left">
                                            <div class="timeline-title">
                                                <span class="title-text">{{ group.blog.title }}</span>
                                                <span v-if="group.blog.type" class="blog-type">{{ group.blog.type
                                                }}</span>
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
                <button class="calendar-modal-close" @click="closeCalendarModal" aria-label="关闭日历">
                    <i class="fas fa-times"></i>
                </button>
                <div class="calendar-modal-body" id="archiveModalBody" ref="modalBodyRef"></div>
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
const isDesktopDrum = ref(window.innerWidth > 900)
const isModalOpen = ref(false)
const isModalPreparing = ref(false)
const isModalClosing = ref(false)
const shouldAnimate = ref(true)
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

const timelineGroups = computed(() => {
    const groups = []
    let lastYear = ''
    let lastMonth = ''

    filteredBlogs.value.forEach((blog) => {
        const date = parseDate(blog.date)
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
            let monthLabel
            if (lang === 'en') {
                monthLabel = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(date)
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
        isDesktopDrum.value = window.innerWidth > 900
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
    --arc-ink: #2a3142;
    --arc-ink-strong: #1b2231;
    --arc-ink-soft: rgba(42, 49, 66, 0.64);
    --arc-ink-faint: rgba(42, 49, 66, 0.4);

    /* ---- 强调色 ---- */
    --arc-rose: #ff9fb6;
    --arc-peach: #ffc38f;
    --arc-gold: #ffd971;
    --arc-mint: #74e2bb;
    --arc-sky: #8ecbff;
    --arc-lilac: #c3b4ff;
    --arc-grad: linear-gradient(120deg, #ff9fb6 0%, #ffd971 34%, #74e2bb 66%, #8ecbff 100%);
    --arc-grad-soft: linear-gradient(135deg,
            rgba(255, 159, 182, 0.62),
            rgba(255, 217, 113, 0.5) 34%,
            rgba(116, 226, 187, 0.5) 68%,
            rgba(142, 203, 255, 0.62));

    /* ---- 石英玻璃表面 ---- */
    --arc-glass: rgba(255, 255, 255, 0.74);
    --arc-glass-strong: rgba(255, 255, 255, 0.92);
    --arc-glass-soft: rgba(255, 255, 255, 0.52);
    --arc-line: rgba(122, 142, 178, 0.18);
    --arc-line-strong: rgba(122, 142, 178, 0.32);

    /* ---- 阴影 / 圆角 / 缓动 ---- */
    --arc-shadow-sm: 0 2px 10px rgba(38, 52, 84, 0.07);
    --arc-shadow-md: 0 14px 34px rgba(38, 52, 84, 0.12);
    --arc-shadow-lg: 0 28px 64px rgba(38, 52, 84, 0.18);
    --arc-radius: 24px;
    --arc-radius-sm: 16px;
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
            rgba(255, 255, 255, 0.72) 0%,
            rgba(255, 255, 255, 0.48) 46%,
            rgba(255, 255, 255, 0.66) 100%) padding-box,
        linear-gradient(150deg,
            rgba(255, 159, 182, 0.55),
            rgba(255, 217, 113, 0.45) 34%,
            rgba(116, 226, 187, 0.45) 68%,
            rgba(142, 203, 255, 0.55)) border-box;
    backdrop-filter: blur(18px) saturate(1.12);
    -webkit-backdrop-filter: blur(18px) saturate(1.12);
    box-shadow: var(--arc-shadow-md);
    overflow: hidden;
}

/* 顶部柔光 + 中心聚光，让内容从背景中“浮”起来 */
.archive-page .archive-main::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
        radial-gradient(120% 60% at 50% -12%, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0) 62%),
        radial-gradient(70% 46% at 50% 52%, rgba(255, 217, 113, 0.18), rgba(255, 217, 113, 0) 72%);
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
        linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85)) padding-box,
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
    background: radial-gradient(120% 80% at 50% -20%, rgba(255, 217, 113, 0.3), rgba(255, 217, 113, 0) 62%);
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
    background: var(--arc-grad);
    background-size: 170% 100%;
    box-shadow: 0 8px 20px rgba(255, 159, 182, 0.38);
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
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
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
    border-radius: 26px 26px 0 0;
    background: linear-gradient(180deg, #ffffff, #fafdff);
    box-shadow: 0 -18px 60px rgba(20, 26, 38, 0.3);
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
    margin: 10px auto 2px;
    border-radius: 999px;
    background: rgba(122, 142, 178, 0.42);
}

.archive-page .calendar-modal .calendar-modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--arc-line);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    color: var(--arc-ink);
    font-size: 16px;
    cursor: pointer;
    transition: transform 0.3s var(--arc-ease), background 0.3s ease;
}

.archive-page .calendar-modal .calendar-modal-close:hover {
    transform: rotate(90deg);
    background: #fff;
}

.archive-page .calendar-modal .calendar-modal-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 10px 16px calc(24px + env(safe-area-inset-bottom, 0px));
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
</style>