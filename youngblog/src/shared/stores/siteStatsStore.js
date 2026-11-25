/**
 * 站点统计 Store
 *
 * 总字数是一个跨页面共享的派生数据：首页资料卡、页脚和关于页都要用。
 * 旧实现让三个组件各自串行 fetch 全部 Markdown，既慢又重复。
 * 现在统一收敛到这里：
 * - 优先读取 `blogs.json` 中构建期预计算的 `wordCount`，命中时零请求；
 * - 缺失字段时按并发上限补齐，避免 100+ 个请求同时打满连接池；
 * - 组件通过 `status` 展示加载动效，不会先渲染一个 0.0k 的假值。
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useBlogStore } from '@/shared/stores/blogStore'
import { resolveUrl } from '@/shared/utils/url'
import { countReadableChars } from '@/shared/utils/textStats'

const FETCH_CONCURRENCY = 6

/**
 * 并发受限地处理一组异步任务
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
async function mapWithConcurrency(items, limit, worker) {
  const results = Array.from({ length: items.length })
  let cursor = 0

  const run = async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index)
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, run)
  await Promise.all(runners)
  return results
}

export const useSiteStatsStore = defineStore('siteStats', () => {
  /** idle | loading | ready | error */
  const status = ref('idle')
  /** 全站可读字符数 */
  const totalChars = ref(0)
  /** 加载失败时的错误信息，仅用于调试与可选展示 */
  const error = ref(null)

  let inflight = null

  const isLoading = computed(() => status.value === 'loading')
  const isReady = computed(() => status.value === 'ready')

  async function computeTotal(blogs) {
    const missingFiles = []
    let total = 0

    blogs.forEach((blog) => {
      if (Number.isFinite(blog?.wordCount)) {
        total += Number(blog.wordCount)
      } else if (blog?.contentFile) {
        missingFiles.push(blog.contentFile)
      }
    })

    if (missingFiles.length) {
      const counts = await mapWithConcurrency(
        missingFiles,
        FETCH_CONCURRENCY,
        async (file) => {
          const response = await fetch(resolveUrl(file))
          if (!response.ok) throw new Error(`无法读取 ${file}（HTTP ${response.status}）`)
          return countReadableChars(await response.text())
        },
      )
      total += counts.reduce((sum, value) => sum + value, 0)
    }

    return total
  }

  /**
   * 确保总字数已就绪；重复调用会复用同一个 Promise
   * @returns {Promise<number>}
   */
  function ensureLoaded() {
    if (status.value === 'ready') return Promise.resolve(totalChars.value)
    if (inflight) return inflight

    status.value = 'loading'
    error.value = null

    inflight = (async () => {
      try {
        const blogStore = useBlogStore()
        if (!blogStore.blogs.length) await blogStore.fetchBlogs()
        if (blogStore.error) throw new Error(blogStore.error)
        totalChars.value = await computeTotal(blogStore.blogs)
        status.value = 'ready'
        return totalChars.value
      } catch (err) {
        console.error('[siteStats] 计算总字数失败', err)
        error.value = err
        status.value = 'error'
        return 0
      } finally {
        inflight = null
      }
    })()

    return inflight
  }

  /** 失败后允许重新尝试（例如网络恢复） */
  function retry() {
    if (status.value === 'error') status.value = 'idle'
    return ensureLoaded()
  }

  return {
    status,
    totalChars,
    error,
    isLoading,
    isReady,
    ensureLoaded,
    retry,
  }
})
