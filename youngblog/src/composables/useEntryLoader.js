/**
 * 站点入场加载器
 * ------------------------------------------------------------------
 * 在「入场加载屏」显示期间，真实地预加载首页所需的一切资源：
 *   1. 渲染引擎初始化（Vue 挂载 + 两帧渲染）
 *   2. 字体与样式（document.fonts）
 *   3. 站点数据（blogs / announcements / series / quick-links / background-images）
 *   4. 图像资源（背景图、欢迎图、灯笼图）
 *   5. 首页视图构建（等待渲染帧与数据注入）
 *   6. 收尾校准（保证最小展示时长，避免闪烁）
 *
 * 进度按「阶段权重」加权计算，并使用 rAF 做缓动插值，
 * 因此进度条永远是平滑爬升的，不会跳变。
 */
import { computed, nextTick, ref } from 'vue'
import { resolveUrl } from '@/utils/url'
import { useBlogStore } from '@/stores/blogStore'

/** 加载阶段定义（weight 为权重，总和 100） */
export const ENTRY_STAGES = [
    {
        key: 'engine',
        weight: 10,
        label: {
            zh: '初始化渲染引擎',
            en: 'Booting render engine',
            ja: 'レンダリングエンジン起動'
        },
        tip: {
            zh: '唤醒沉睡的节点…',
            en: 'Waking up the sleeping nodes…',
            ja: '眠れるノードを呼び覚ます…'
        }
    },
    {
        key: 'fonts',
        weight: 14,
        label: {
            zh: '装载字体与样式',
            en: 'Loading fonts & styles',
            ja: 'フォントとスタイルを読込'
        },
        tip: {
            zh: '描摹字里行间的笔锋…',
            en: 'Tracing every brush stroke…',
            ja: '文字の筆致をなぞる…'
        }
    },
    {
        key: 'data',
        weight: 27,
        label: {
            zh: '读取站点数据',
            en: 'Fetching site data',
            ja: 'サイトデータを取得'
        },
        tip: {
            zh: '打捞博客、公告与友链…',
            en: 'Salvaging posts, notices & links…',
            ja: '記事・お知らせ・リンクを収集…'
        }
    },
    {
        key: 'assets',
        weight: 24,
        label: {
            zh: '预热图像资源',
            en: 'Preheating image assets',
            ja: '画像アセットを先読み'
        },
        tip: {
            zh: '点亮背景与灯笼…',
            en: 'Lighting up the backdrop…',
            ja: '背景と灯籠を灯す…'
        }
    },
    {
        key: 'home',
        weight: 15,
        label: {
            zh: '构建首页视图',
            en: 'Building the home view',
            ja: 'ホーム画面を構築'
        },
        tip: {
            zh: '拼合首页的每一块光斑…',
            en: 'Assembling every patch of light…',
            ja: '光の断片を組み上げる…'
        }
    },
    {
        key: 'finale',
        weight: 10,
        label: {
            zh: '校准色彩与光效',
            en: 'Calibrating color & glow',
            ja: '色彩とグローを調整'
        },
        tip: {
            zh: '为夜空补上最后一抹极光…',
            en: 'Adding the final aurora…',
            ja: '最後のオーロラを添える…'
        }
    }
]

const TOTAL_WEIGHT = ENTRY_STAGES.reduce((sum, stage) => sum + stage.weight, 0)

/** 取阶段文案（带语言回退） */
export function stageLabelOf(stage, lang = 'zh') {
    if (!stage) return ''
    return stage.label[lang] || stage.label.zh
}

/** 取阶段提示语（带语言回退） */
export function stageTipOf(stage, lang = 'zh') {
    if (!stage) return ''
    return stage.tip[lang] || stage.tip.zh
}

/** 是否开启了「减少动态效果」 */
export function prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const frames = async (count = 2) => {
    for (let i = 0; i < count; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await frame()
    }
}

/** 图片预载（失败也 resolve，避免阻塞入场） */
const loadImage = (src) =>
    new Promise((resolve) => {
        if (!src) {
            resolve(null)
            return
        }
        const img = new Image()
        const done = () => resolve(src)
        img.onload = done
        img.onerror = done
        try {
            img.decoding = 'async'
        } catch (e) {
            /* 忽略 */
        }
        img.src = src
    })

/** JSON 预载（失败返回 null，由调用方兜底） */
const fetchJSON = async (path) => {
    try {
        const res = await fetch(resolveUrl(path))
        if (!res.ok) return null
        return await res.json()
    } catch (e) {
        return null
    }
}

/** 等待字体就绪（带超时保护） */
const waitForFonts = async () => {
    if (typeof document === 'undefined' || !document.fonts) return
    const jobs = []
    try {
        jobs.push(document.fonts.load('400 1em "仓耳今楷01"'))
    } catch (e) {
        /* 忽略 */
    }
    try {
        jobs.push(document.fonts.load('700 1em "仓耳今楷01"'))
    } catch (e) {
        /* 忽略 */
    }
    try {
        jobs.push(document.fonts.ready)
    } catch (e) {
        /* 忽略 */
    }
    await Promise.race([Promise.allSettled(jobs), wait(2600)])
}

/**
 * 入场加载器
 * @param {object} options
 * @param {() => string} options.lang 语言取值函数（响应式）
 * @param {number} options.minDuration 最短展示时长（ms）
 * @param {number} options.maxDuration 最长加载时长（ms），超时后强制进入首页
 */
export function useEntryLoader(options = {}) {
    const { lang = () => 'zh', minDuration = 2100, maxDuration = 9000 } = options

    const percent = ref(0)
    const stageIndex = ref(0)
    const isSettled = ref(false)
    const skipped = ref(false)

    const percentInt = computed(() => Math.min(100, Math.round(percent.value * 100)))
    const currentStage = computed(() => ENTRY_STAGES[stageIndex.value] || ENTRY_STAGES[0])
    const stageLabel = computed(() => stageLabelOf(currentStage.value, lang()))
    const tip = computed(() => stageTipOf(currentStage.value, lang()))

    let completedWeight = 0
    let rawTarget = 0
    let rawDone = false
    let stopped = false
    let rafId = null
    let startedAt = 0
    let lastTs = 0

    const stopLoop = () => {
        if (rafId) cancelAnimationFrame(rafId)
        rafId = null
        stopped = true
    }

    /**
     * rAF 缓动：让显示进度平滑逼近目标进度。
     * 使用「时间差」而非固定系数，因此即使帧率很低
     * （后台标签页、低端设备）进度条也能在相同时间内追上，
     * 不会出现阶段已到末尾而进度条还停在半路的情况。
     */
    const loop = (timestamp = 0) => {
        const now = timestamp || performance.now()
        const dt = lastTs ? Math.min(120, now - lastTs) : 16
        lastTs = now

        const target = rawDone ? 1 : Math.min(rawTarget, 0.985)
        const diff = target - percent.value

        if (diff <= 0.0025) {
            percent.value = target
        } else {
            // 时间常数：跳过后加速收敛
            const tau = skipped.value ? 90 : 110
            const ease = 1 - Math.exp(-dt / tau)
            percent.value = Math.min(target, percent.value + diff * ease + 0.0002)
        }

        if (rawDone && percent.value >= 0.999) {
            percent.value = 1
            if (!isSettled.value) {
                isSettled.value = true
                stopLoop()
            }
            return
        }

        rafId = requestAnimationFrame(loop)
    }

    /** 更新当前阶段进度（0~1） */
    const setStage = (index, ratio = 0) => {
        if (stopped || rawDone) return
        const safeIndex = Math.max(0, Math.min(index, ENTRY_STAGES.length - 1))
        stageIndex.value = safeIndex
        const weighted = completedWeight + ENTRY_STAGES[safeIndex].weight * Math.max(0, Math.min(1, ratio))
        rawTarget = Math.min(0.985, weighted / TOTAL_WEIGHT)
    }

    /** 某个阶段完成后的进度边界（0~1） */
    const displayBoundary = (index) => {
        let sum = 0
        for (let i = 0; i <= index && i < ENTRY_STAGES.length; i += 1) {
            sum += ENTRY_STAGES[i].weight
        }
        return sum / TOTAL_WEIGHT
    }

    /**
     * 等待「显示进度」追上当前阶段边界。
     * 这样即使资源加载很快（命中缓存），进度条与阶段文案
     * 依然保持同步，不会出现「阶段已到末尾、进度条还在半路」。
     */
    const waitForDisplay = async (index) => {
        // 上限 0.98：rawTarget 最高只会到 0.985，避免在最后一个阶段死等
        const boundary = Math.min(displayBoundary(index) - 0.008, 0.98)
        while (!stopped && !rawDone && percent.value < boundary) {
            // eslint-disable-next-line no-await-in-loop
            await wait(28)
        }
    }

    /** 结束当前阶段（会等待进度条追上） */
    const completeStage = async (index) => {
        if (stopped || rawDone) return
        const safeIndex = Math.max(0, Math.min(index, ENTRY_STAGES.length - 1))
        completedWeight += ENTRY_STAGES[safeIndex].weight
        setStage(Math.min(safeIndex + 1, ENTRY_STAGES.length - 1), 0)
        await waitForDisplay(safeIndex)
    }

    /** 并行执行一组子任务，并按完成数量推进阶段进度 */
    const runTasks = async (index, tasks) => {
        if (!tasks.length) {
            setStage(index, 1)
            return
        }
        let done = 0
        await Promise.all(
            tasks.map(async (task) => {
                try {
                    await task()
                } catch (e) {
                    /* 单个任务失败不影响入场 */
                }
                done += 1
                setStage(index, done / tasks.length)
            })
        )
    }

    /** 完整加载流程 */
    const runPipeline = async () => {
        startedAt = performance.now()

        // 1. 渲染引擎
        setStage(0, 0.35)
        await frames(2)
        await completeStage(0)

        // 2. 字体与样式
        setStage(1, 0.12)
        await waitForFonts()
        await completeStage(1)

        // 3. 站点数据（同时写入 Pinia，首页可直接渲染）
        setStage(2, 0.02)
        const blogStore = useBlogStore()
        let backgroundData = null
        await runTasks(2, [
            () => blogStore.fetchBlogs(),
            () => fetchJSON('/data/announcements.json'),
            () => fetchJSON('/data/series.json'),
            () => fetchJSON('/data/quick-links.json'),
            async () => {
                backgroundData = await fetchJSON('/data/background-images.json')
            }
        ])
        await completeStage(2)

        // 4. 图像资源
        setStage(3, 0.02)
        const bgList = Array.isArray(backgroundData) ? backgroundData : backgroundData?.images || []
        const sources = [
            ...bgList.slice(0, 2).map((src) => resolveUrl(src)),
            resolveUrl('/assets/images/welcome.png'),
            resolveUrl('/assets/images/lantern_festival.png')
        ].filter(Boolean)
        await runTasks(3, sources.map((src) => () => loadImage(src)))
        await completeStage(3)

        // 5. 首页视图构建
        setStage(4, 0.3)
        await nextTick()
        await frames(2)
        await wait(180)
        setStage(4, 1)
        await completeStage(4)

        // 6. 收尾：保证最短展示时长
        setStage(5, 0.4)
        const elapsed = performance.now() - startedAt
        if (elapsed < minDuration) await wait(minDuration - elapsed)
        setStage(5, 1)
        await completeStage(5)

        rawDone = true
    }

    /** 启动加载（幂等） */
    const start = () => {
        if (stopped || isSettled.value || rafId) return
        rafId = requestAnimationFrame(loop)
        Promise.race([runPipeline(), wait(maxDuration)]).then(
            () => {
                rawDone = true
            },
            () => {
                rawDone = true
            }
        )
    }

    /** 用户点击/按键跳过 */
    const requestSkip = () => {
        if (isSettled.value || skipped.value) return
        skipped.value = true
        rawDone = true
    }

    /** 组件卸载时释放 */
    const dispose = () => {
        stopped = true
        if (rafId) cancelAnimationFrame(rafId)
        rafId = null
    }

    return {
        percent,
        percentInt,
        stageIndex,
        stages: ENTRY_STAGES,
        currentStage,
        stageLabel,
        tip,
        isSettled,
        skipped,
        start,
        requestSkip,
        dispose
    }
}
