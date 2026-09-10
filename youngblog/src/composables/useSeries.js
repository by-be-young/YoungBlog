/**
 * 系列数据组合式函数
 *
 * 从 blogStore.blogs 派生「系列 → 章节 → 文章」结构，并补充系列页所需的展示字段
 * （序号、编号、日期区间、简介等）。只做纯数据计算，不涉及任何 DOM / 定时器。
 */
import { computed } from 'vue'
import { useBlogStore } from '@/stores/blogStore'
import { useI18nStore } from '@/stores/i18nStore'

const INTRO_MAX_LENGTH = 140

// ==================== 纯工具函数 ====================

/** 规范化 chapter 字段（去掉空串） */
export const normalizeChapter = (value) => {
    return typeof value === 'string' && value.trim() ? value.trim() : ''
}

/** 解析 "N-标题" 形式的章节；无章节时 hasChapter 为 false，标题由视图按语言渲染 */
export const parseChapter = (value) => {
    const raw = normalizeChapter(value)
    if (!raw) {
        return { raw: '', order: Infinity, title: '', hasChapter: false }
    }
    const match = raw.match(/^(\d+)\s*-\s*(.+)$/)
    if (match) {
        return { raw, order: Number(match[1]), title: match[2].trim(), hasChapter: true }
    }
    return { raw, order: Infinity, title: raw, hasChapter: true }
}

/** 规范化 order 字段（数字或数字字符串 → 整数，其余为 null） */
export const normalizeOrder = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value)
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.trim())
        if (Number.isFinite(parsed)) return Math.trunc(parsed)
    }
    return null
}

/** 系列内文章排序：有章节的在前（按章节序号 → 章节名），其次按 order，最后按日期倒序 */
export const compareSeriesPosts = (a, b) => {
    const aChapter = parseChapter(a?.chapter)
    const bChapter = parseChapter(b?.chapter)

    if (aChapter.hasChapter || bChapter.hasChapter) {
        if (aChapter.hasChapter && !bChapter.hasChapter) return -1
        if (!aChapter.hasChapter && bChapter.hasChapter) return 1
        if (aChapter.order !== bChapter.order) return aChapter.order - bChapter.order
        if (aChapter.title !== bChapter.title)
            return aChapter.title.localeCompare(bChapter.title, 'zh-CN')
    }

    const aHasOrder = Number.isFinite(a?.order)
    const bHasOrder = Number.isFinite(b?.order)

    if (aHasOrder && bHasOrder) {
        if (a.order !== b.order) return a.order - b.order
        return new Date(b.date) - new Date(a.date)
    }
    if (aHasOrder && !bHasOrder) return -1
    if (!aHasOrder && bHasOrder) return 1

    return new Date(b.date) - new Date(a.date)
}

/** 按章节分组（无任何章节信息时返回空数组） */
export const groupPostsByChapter = (posts) => {
    if (!Array.isArray(posts) || posts.length === 0) return []

    const hasAnyChapter = posts.some((post) => parseChapter(post?.chapter).hasChapter)
    if (!hasAnyChapter) return []

    const chapterMap = new Map()

    posts.forEach((post) => {
        if (!post || typeof post !== 'object') return
        const chapterInfo = parseChapter(post.chapter)
        const key = chapterInfo.raw || '__uncategorized__'
        if (!chapterMap.has(key)) {
            chapterMap.set(key, {
                raw: chapterInfo.raw,
                title: chapterInfo.title,
                order: chapterInfo.order,
                hasChapter: chapterInfo.hasChapter,
                posts: [],
            })
        }
        chapterMap.get(key).posts.push(post)
    })

    return Array.from(chapterMap.values())
        .sort((a, b) => {
            if (a.hasChapter || b.hasChapter) {
                if (a.hasChapter && !b.hasChapter) return -1
                if (!a.hasChapter && b.hasChapter) return 1
                if (a.order !== b.order) return a.order - b.order
                if (a.title !== b.title) return a.title.localeCompare(b.title, 'zh-CN')
            }
            return 0
        })
        .map((chapter) => ({
            chapter: chapter.raw,
            title: chapter.title,
            order: chapter.order,
            hasChapter: chapter.hasChapter,
            posts: [...chapter.posts].sort(compareSeriesPosts),
        }))
}

/** 系列最近一次更新的时间戳（用于排序） */
const getLatestSeriesTimestamp = (series) => {
    if (!series) return 0
    const posts = series.posts || []
    let latest = 0
    posts.forEach((post) => {
        const timestamp = new Date(post?.date).getTime()
        if (Number.isFinite(timestamp) && timestamp > latest) {
            latest = timestamp
        }
    })
    return latest
}

/** "YYYY-MM-DD" → "YYYY.MM" */
const formatMonth = (value) => {
    const match = /^(\d{4})-(\d{2})/.exec(String(value || '').trim())
    return match ? `${match[1]}.${match[2]}` : ''
}

/** 文章日期区间：2026.03 — 2026.06（同年同月折叠为单个） */
const formatDateRange = (posts) => {
    const months = (posts || [])
        .map((post) => formatMonth(post?.date))
        .filter(Boolean)
        .sort()
    if (months.length === 0) return ''
    const first = months[0]
    const last = months[months.length - 1]
    return first === last ? first : `${first} — ${last}`
}

/** 简介：取该系列阅读顺序第一篇文章的摘要，缺失时退回标题 */
const buildIntro = (posts) => {
    const first = Array.isArray(posts) ? posts[0] : null
    if (!first) return ''

    const excerpt = String(first.excerpt || '')
        .replace(/\s+/g, ' ')
        .trim()
    const fallback = String(first.title || '').trim()
    const text = excerpt || fallback
    if (!text) return ''

    return text.length > INTRO_MAX_LENGTH ? `${text.slice(0, INTRO_MAX_LENGTH)}…` : text
}

// ==================== 组合式函数 ====================

export function useSeries() {
    const blogStore = useBlogStore()
    const i18n = useI18nStore()

    /** 系列列表（按最近更新时间倒序，附序号、编号、日期区间、简介） */
    const seriesList = computed(() => {
        const blogs = blogStore.blogs || []
        if (blogs.length === 0) return []

        const map = new Map()

        blogs.forEach((blog) => {
            if (!blog || typeof blog !== 'object') return
            const seriesName =
                typeof blog.series === 'string' && blog.series.trim() ? blog.series.trim() : ''
            if (!seriesName) return

            if (!map.has(seriesName)) {
                map.set(seriesName, {
                    title: seriesName,
                    coverImage: 'assets/images/series.png',
                    posts: [],
                })
            }

            const id = Number(blog.id)
            if (!Number.isFinite(id)) return

            map.get(seriesName).posts.push({
                id,
                title: typeof blog.title === 'string' && blog.title.trim() ? blog.title.trim() : '',
                date: typeof blog.date === 'string' ? blog.date : '',
                order: normalizeOrder(blog.order),
                chapter: normalizeChapter(blog.chapter),
                contentFile: typeof blog.contentFile === 'string' ? blog.contentFile : '',
                excerpt: typeof blog.excerpt === 'string' ? blog.excerpt.trim() : '',
                tags: Array.isArray(blog.tags) ? blog.tags : [],
                category: typeof blog.category === 'string' ? blog.category.trim() : '',
            })
        })

        const codeLabel = i18n.currentTranslations.series_code_label || 'SERIES'

        return Array.from(map.values())
            .map((series) => {
                const sortedPosts = [...series.posts].sort(compareSeriesPosts)
                const chapters = groupPostsByChapter(sortedPosts)
                const posts =
                    chapters.length > 0 ? chapters.flatMap((chapter) => chapter.posts) : sortedPosts
                return { ...series, posts, chapters }
            })
            .sort((a, b) => {
                const diff = getLatestSeriesTimestamp(b) - getLatestSeriesTimestamp(a)
                if (diff !== 0) return diff
                return a.title.localeCompare(b.title, 'zh-CN')
            })
            .map((series, index) => {
                const ordinal = String(index + 1).padStart(2, '0')
                const code = `${codeLabel} ${ordinal}`
                const dateLabel = formatDateRange(series.posts)
                return {
                    ...series,
                    ordinal,
                    code,
                    dateLabel,
                    subLabel: [code, dateLabel].filter(Boolean).join(' · '),
                    count: series.posts.length,
                    chapterCount: series.chapters.length,
                    intro: buildIntro(series.posts),
                }
            })
    })

    const isLoading = computed(() => blogStore.isLoading)
    const hasError = computed(() => Boolean(blogStore.error))

    /** 加载博客数据（已加载时会提前返回） */
    const load = () => blogStore.fetchBlogs()

    return { seriesList, isLoading, hasError, load }
}
