/**
 * 站点入场加载器
 * ------------------------------------------------------------------
 * 在「入场加载屏」显示期间，真实地预加载首页所需的一切资源：
 *   1. 渲染引擎初始化（Vue 挂载 + 两帧渲染）
 *   2. 字体与样式（最多等 300ms，字体继续在后台加载）
 *   3. 站点数据（blogs / announcements / series / quick-links / background-images）
 *   4. 首屏关键图像（只等背景首图、欢迎图与头像，最多 1s）
 *   5. 首页视图构建（只等一帧，不再扫描全页所有图片）
 *   6. 收尾校准（保证最小展示时长，避免闪烁）
 *
 * 进度按「阶段权重」加权计算，并使用 rAF 做缓动插值，
 * 因此进度条永远是平滑爬升的，不会跳变。
 */
import { computed, nextTick, ref } from 'vue'
import { resolveUrl } from '@/shared/utils/url'
import { useBlogStore } from '@/shared/stores/blogStore'

/** 加载阶段定义（weight 为权重，总和 100） */
export const ENTRY_STAGES = [
  {
    key: 'engine',
    weight: 6,
    label: {
      zh: '初始化渲染引擎',
      en: 'Booting render engine',
      ja: 'レンダリングエンジン起動',
    },
    tip: {
      zh: '唤醒沉睡的节点…',
      en: 'Waking up the sleeping nodes…',
      ja: '眠れるノードを呼び覚ます…',
    },
  },
  {
    key: 'fonts',
    weight: 8,
    label: {
      zh: '装载字体与样式',
      en: 'Loading fonts & styles',
      ja: 'フォントとスタイルを読込',
    },
    tip: {
      zh: '描摹字里行间的笔锋…',
      en: 'Tracing every brush stroke…',
      ja: '文字の筆致をなぞる…',
    },
  },
  {
    key: 'data',
    weight: 18,
    label: {
      zh: '读取站点数据',
      en: 'Fetching site data',
      ja: 'サイトデータを取得',
    },
    tip: {
      zh: '打捞博客、公告与友链…',
      en: 'Salvaging posts, notices & links…',
      ja: '記事・お知らせ・リンクを収集…',
    },
  },
  {
    key: 'assets',
    weight: 46,
    label: {
      zh: '预热图像资源',
      en: 'Preheating image assets',
      ja: '画像アセットを先読み',
    },
    tip: {
      zh: '点亮背景与灯笼…',
      en: 'Lighting up the backdrop…',
      ja: '背景と灯籠を灯す…',
    },
  },
  {
    key: 'home',
    weight: 12,
    label: {
      zh: '构建首页视图',
      en: 'Building the home view',
      ja: 'ホーム画面を構築',
    },
    tip: {
      zh: '拼合首页的每一块光斑…',
      en: 'Assembling every patch of light…',
      ja: '光の断片を組み上げる…',
    },
  },
  {
    key: 'finale',
    weight: 10,
    label: {
      zh: '校准色彩与光效',
      en: 'Calibrating color & glow',
      ja: '色彩とグローを調整',
    },
    tip: {
      zh: '为夜空补上最后一抹极光…',
      en: 'Adding the final aurora…',
      ja: '最後のオーロラを添える…',
    },
  },
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

/**
 * 默认背景轮播图（与 App.vue 共用，JSON 为空时使用）
 */
export const DEFAULT_BACKGROUND_IMAGES = [
  resolveUrl('/assets/images/background/bg1.webp'),
  resolveUrl('/assets/images/background/bg2.webp'),
  resolveUrl('/assets/images/background/bg3.webp'),
]

/** 将 background-images.json 的内容解析为图片列表（为空时回退默认图） */
export function resolveBackgroundImages(data) {
  const list = Array.isArray(data) ? data : data?.images || []
  return list.length > 0 ? list.map((src) => resolveUrl(src)) : [...DEFAULT_BACKGROUND_IMAGES]
}

/**
 * 首页首屏真正需要的图片。
 * 资料卡信息背景不在入场阶段等待，进入首页后由页面自行加载，
 * 避免一张非首屏图片拖住整个加载屏。
 */
const HOME_IMAGE_PATHS = [
  '/assets/images/welcome.webp', // Hero 云朵主视觉
  '/assets/avatar.webp', // 导航栏 / 资料卡头像
]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const frames = async (count = 2) => {
  for (let i = 0; i < count; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await frame()
  }
}

/**
 * 图片预载结果缓存：同一个 URL 在本次页面生命周期内只加载一次。
 * 这既保证兜底校验不会重复下载大图，也让多次调用可以共享同一个 Promise。
 */
const imageTasks = new Map()

/**
 * 图片预载（含强制解码）。
 * 仅等 onload 只代表「下载完成」，浏览器仍可能在揭幕后才解码绘制，
 * 大图（如 4096×2048 的欢迎图）尤其明显；因此这里再调用 decode()
 * 把解码结果预热到图片缓存中，避免进入首页后图片才逐张出现。
 */
const preloadImage = (src) => {
  if (!src) return Promise.resolve(null)
  if (imageTasks.has(src)) return imageTasks.get(src)

  const task = new Promise((resolve) => {
    const img = new Image()
    const finish = async () => {
      try {
        if (img.decode) await img.decode()
      } catch (e) {
        /* 解码失败也不阻塞入场 */
      }
      resolve(src)
    }
    img.onload = finish
    img.onerror = () => resolve(null)
    try {
      img.fetchPriority = 'high'
    } catch (e) {
      /* 忽略 */
    }
    img.src = src
  })

  imageTasks.set(src, task)
  return task
}

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
  } catch {
    /* 忽略 */
  }
  try {
    jobs.push(document.fonts.ready)
  } catch {
    /* 忽略 */
  }
  // 字体继续在后台加载；加载屏最多被它占用 300ms。
  await Promise.race([Promise.allSettled(jobs), wait(300)])
}

/**
 * 入场加载器
 * @param {object} options
 * @param {() => string} options.lang 语言取值函数（响应式）
 * @param {number} options.minDuration 最短展示时长（ms）
 * @param {number} options.maxDuration 最长加载时长（ms），超时后强制进入首页
 */
export function useEntryLoader(options = {}) {
  // maxDuration 仅作为防止永久卡死的安全绳，设置得很宽松：
  // 图片（尤以首屏大图为主）没真正加载完之前不应当揭幕
  const { lang = () => 'zh', minDuration = 600, maxDuration = 2500 } = options

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
    // 超时放行后，后台任务仍可能回调；不要让阶段回退。
    if (safeIndex < stageIndex.value) return
    stageIndex.value = safeIndex
    const weighted =
      completedWeight + ENTRY_STAGES[safeIndex].weight * Math.max(0, Math.min(1, ratio))
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
  const waitForDisplay = async (index, maxMs = 80) => {
    // 上限 0.98：rawTarget 最高只会到 0.985，避免在最后一个阶段死等
    const boundary = Math.min(displayBoundary(index) - 0.008, 0.98)
    const deadline = performance.now() + maxMs
    while (
      !stopped &&
      !rawDone &&
      percent.value < boundary &&
      performance.now() < deadline
    ) {
      // eslint-disable-next-line no-await-in-loop
      await wait(24)
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
      }),
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
    await Promise.race([
      runTasks(2, [
        () => blogStore.fetchBlogs(),
        () => fetchJSON('/data/announcements.json'),
        () => fetchJSON('/data/series.json'),
        () => fetchJSON('/data/quick-links.json'),
        async () => {
          backgroundData = await fetchJSON('/data/background-images.json')
        },
      ]),
      wait(1000),
    ])
    await completeStage(2)

    // 4. 首屏关键图像：只等真正会出现在第一屏的 3 张图，且最多等 1s。
    //    背景轮播的第 2/3 张、资料卡背景等交给首页按需加载，
    //    不再让所有图片排队阻塞揭幕。
    setStage(3, 0.02)
    const bgImages = resolveBackgroundImages(backgroundData)
    const criticalImages = [
      ...new Set([bgImages[0], ...HOME_IMAGE_PATHS.map((path) => resolveUrl(path))]),
    ].filter(Boolean)
    await Promise.race([
      Promise.all(criticalImages.map((src) => preloadImage(src))),
      wait(1000),
    ])
    setStage(3, 1)
    await completeStage(3)

    // 5. 首页视图构建：只等首帧，确认 Vue 已经完成首轮渲染即可。
    setStage(4, 0.2)
    await nextTick()
    await frames(1)
    await wait(80)
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
        // 后台标签页或页面被遮挡时 rAF 可能被节流；
        // 不能让加载屏因此永远停在半路，给一个定时兜底。
        setTimeout(() => {
          if (!isSettled.value) {
            percent.value = 1
            isSettled.value = true
            stopLoop()
          }
        }, 120)
      },
      () => {
        rawDone = true
      },
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
    dispose,
  }
}