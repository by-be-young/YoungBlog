import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBlogStore = defineStore('blog', () => {
    const blogs = ref([])
    const isLoading = ref(false)
    const error = ref(null)

    // 首页分类规则（与 main.js 保持一致）
    const HOME_CATEGORY_RULES = {
        learningFirstTags: new Set(['二上', '二下']),
        learningKey: 'home_category_learning',
        entertainmentKey: 'home_category_entertainment'
    }

    // 计算属性
    const totalPosts = computed(() => blogs.value.length)

    const tags = computed(() => {
        const tagSet = new Set()
        blogs.value.forEach(b => {
            if (Array.isArray(b.tags)) b.tags.forEach(t => tagSet.add(t))
        })
        return Array.from(tagSet)
    })

    const seriesList = computed(() => {
        const seriesMap = new Map()
        blogs.value.forEach(b => {
            if (b.series) {
                if (!seriesMap.has(b.series)) seriesMap.set(b.series, [])
                seriesMap.get(b.series).push(b)
            }
        })
        return Array.from(seriesMap.entries()).map(([name, posts]) => ({
            name,
            posts: posts.sort((a, b) => new Date(a.date) - new Date(b.date)),
            count: posts.length
        }))
    })

    const recommendedBlogs = computed(() => {
        return blogs.value.filter(b => b.recommended === true)
    })

    const latestBlogs = computed(() => {
        return [...blogs.value]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 6)
    })

    // 获取首页分类键（与 main.js 逻辑一致）
    const getCategoryKey = (blog) => {
        if (!blog) return HOME_CATEGORY_RULES.entertainmentKey

        if (blog?.category?.trim()) {
            const normalized = blog.category.trim()
            if (normalized === '学习') return HOME_CATEGORY_RULES.learningKey
            if (normalized === '娱乐') return HOME_CATEGORY_RULES.entertainmentKey
        }

        const tags = Array.isArray(blog?.tags) ? blog.tags : []
        const firstTag = typeof tags[0] === 'string' ? tags[0].trim() : ''
        if (HOME_CATEGORY_RULES.learningFirstTags.has(firstTag)) {
            return HOME_CATEGORY_RULES.learningKey
        }
        return HOME_CATEGORY_RULES.entertainmentKey
    }

    const isLearningBlog = (blog) => {
        return getCategoryKey(blog) === HOME_CATEGORY_RULES.learningKey
    }

    // 方法
    const getBlogById = (id) => {
        return blogs.value.find(b => String(b.id) === String(id))
    }

    const getBlogsBySeries = (seriesName) => {
        return blogs.value
            .filter(b => b.series === seriesName)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
    }

    const getBlogsByTags = (tagsArray) => {
        if (!tagsArray || !tagsArray.length) return blogs.value
        return blogs.value.filter(b => {
            return tagsArray.every(tag => b.tags && b.tags.includes(tag))
        })
    }

    // 获取最近更新（学习和娱乐各最新一篇，与 main.js 的 createRecentUpdatesCard 逻辑一致）
    const getRecentUpdates = () => {
        const sorted = [...blogs.value].sort((a, b) => {
            const da = a?.date ? new Date(a.date).getTime() : 0
            const db = b?.date ? new Date(b.date).getTime() : 0
            return db - da
        })

        const latestStudy = sorted.find(blog => getCategoryKey(blog) === HOME_CATEGORY_RULES.learningKey) || null
        const latestEntertainment = sorted.find(blog => getCategoryKey(blog) === HOME_CATEGORY_RULES.entertainmentKey) || null

        return [latestStudy, latestEntertainment].filter(Boolean)
    }

    const fetchBlogs = async () => {
        // 如果已经加载过了，直接返回
        if (blogs.value.length > 0) return

        isLoading.value = true
        error.value = null

        try {
            // 使用 /data/blogs.json 路径（public 目录下的 data 文件夹）
            const response = await fetch('/data/blogs.json')

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()

            if (!Array.isArray(data)) {
                throw new Error('数据格式错误：期望数组')
            }

            blogs.value = data
            console.log('[BlogStore] 成功加载博客数据，共', data.length, '篇')

        } catch (e) {
            error.value = e.message
            console.error('[BlogStore] 加载失败:', e)
            console.error('[BlogStore] 请确认文件存在于: public/data/blogs.json')
            // 设置默认空数组，避免页面崩溃
            blogs.value = []
        } finally {
            isLoading.value = false
        }
    }

    // 重置状态
    const reset = () => {
        blogs.value = []
        isLoading.value = false
        error.value = null
    }

    return {
        blogs,
        isLoading,
        error,
        totalPosts,
        tags,
        seriesList,
        recommendedBlogs,
        latestBlogs,
        getBlogById,
        getBlogsBySeries,
        getBlogsByTags,
        getCategoryKey,
        isLearningBlog,
        getRecentUpdates,
        fetchBlogs,
        reset
    }
})