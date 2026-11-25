<template>
  <main class="categories-page">
    <section class="categories-section">
      <header class="cat-masthead" :class="{ 'is-muted': filterOpen }" aria-label="分类页标题">
        <span class="cat-masthead__eyebrow">CATEGORIES · 02</span>
        <h1 class="cat-masthead__title">{{ t('categories') }}</h1>
        <p class="cat-masthead__meta">
          <b>{{ filteredBlogs.length }}</b>
          <span>{{ t('posts') }}</span>
        </p>
      </header>

      <div class="cat-shell" :inert="filterOpen ? true : undefined">
        <!--
          卡片堆：窗口大小固定（选中卡 + 前后各若干张），间距与方向都不随卡片总数变化，
          选中卡永远钉在舞台正中且完整可见；窗口之外的卡片直接隐藏。
        -->
        <div ref="wallRef" class="cat-wall" :class="{ 'is-empty': filteredBlogs.length === 0 }"
          :data-dim="filterOpen ? 'true' : 'false'" @wheel.prevent="handleWallWheel">
          <p v-if="filteredBlogs.length === 0" class="cat-empty">{{ t('categories_no_blogs') }}</p>
          <article v-for="(blog, index) in filteredBlogs" :key="`${filterKey}-${blog.id}`" class="cat-card" :class="{
            'is-open': index === selectedIndex,
            'is-out': !inWindow(index),
          }" :data-index="index" :style="cardStyle(index, blog)">
            <!-- 实体厚度：背面往左下错开 --depth，露出来就是板厚 -->
            <span class="cat-card__edge" aria-hidden="true"></span>
            <div class="cat-card__slab">
              <span class="cat-card__spine" aria-hidden="true"></span>
              <span class="cat-card__sheen" aria-hidden="true"></span>
              <!-- 露在外面的这一条：点它就把这张卡换到正中间 -->
              <header class="cat-card__head">
                <button type="button" class="cat-card__toggle"
                  :aria-current="index === selectedIndex ? 'true' : undefined"
                  :aria-controls="`cat-card-body-${blog.id}`" @click="selectCard(index)">
                  <span class="cat-card__no">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span class="cat-card__title">{{ blog.title }}</span>
                </button>
              </header>
              <!-- 被上面那张盖住的部分：没露出来的时候整段 inert，连 Tab 都进不来 -->
              <div :id="`cat-card-body-${blog.id}`" class="cat-card__body"
                :inert="index === selectedIndex || index === tailIndex ? undefined : true">
                <p class="cat-card__excerpt">{{ blog.excerpt || '' }}</p>
                <div class="cat-card__foot">
                  <div class="cat-card__meta">
                    <span v-if="blog.type" class="cat-card__type">{{ blog.type }}</span>
                    <span v-if="blog.date" class="cat-card__date">{{ blog.date }}</span>
                  </div>
                  <div v-if="blog.tags?.length" class="cat-card__tags">
                    <button v-for="(tag, idx) in blog.tags" :key="idx" type="button" class="cat-card__tag"
                      @click="handleTagClick(blog.tags, idx)">
                      {{ tag }}
                    </button>
                  </div>
                  <router-link class="cat-card__read" :to="`/blog/${blog.id}`">
                    <span>{{ t('immersive_read') }}</span>
                    <i class="fas fa-arrow-right" aria-hidden="true"></i>
                  </router-link>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- 左下角：当前筛选路径（点任意一级回跳），避开站点自己的左下载浮按钮 -->
    <nav class="cat-crumb cat-crumb--float" :aria-label="t('categories_filter_title').value"
      :inert="filterOpen ? true : undefined">
      <span v-if="!tagPath.length" class="cat-crumb__item is-current" aria-current="true">
        {{ t('filter_all') }}
      </span>
      <template v-else>
        <button type="button" class="cat-crumb__item" @click="jumpTo(0)">
          {{ t('filter_all') }}
        </button>
        <template v-for="(tag, i) in tagPath" :key="`float-${i}-${tag}`">
          <i class="fas fa-chevron-right cat-crumb__sep" aria-hidden="true"></i>
          <span v-if="i === tagPath.length - 1" class="cat-crumb__item is-current" aria-current="true">{{ tag }}</span>
          <button v-else type="button" class="cat-crumb__item" @click="jumpTo(i + 1)">
            {{ tag }}
          </button>
        </template>
      </template>
      <span class="cat-crumb__count">{{ filteredBlogs.length }}</span>
    </nav>

    <!-- 右上角：圆形入口，点开整屏云图 -->
    <button ref="fabRef" type="button" class="cat-fab" :class="{ 'is-atlas-open': filterOpen }"
      :aria-label="t('categories_filter_title').value" :title="t('categories_filter_title').value"
      :inert="filterOpen ? true : undefined" @click="openFilter">
      <i class="fas fa-cloud" aria-hidden="true"></i>
    </button>

    <!-- 云图筛选：全新独立组件，Canvas 云海 + 严格逐级选择 -->
    <CloudAtlas :open="filterOpen" :tags="atlasTags" :ancestors="atlasAncestors" :active-level="activeLevel"
      :max-levels="MAX_LEVELS" :level-label="levelLabels[activeLevel]" :level-labels="levelLabels" :path="tagPath"
      :pending-label="atlasPendingLabel" :total="filteredBlogs.length" :types="atlasTypes"
      :current-type="currentFilter" :title="t('categories_filter_title').value"
      :all-label="t('filter_all').value" :close-label="t('close').value" @close="closeFilter"
      @select="handleAtlasSelect" @jump="jumpTo" @type="setFilter" />
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { useBlogStore } from '@/shared/stores/blogStore'
import { getBlogTypeStyle } from '@/shared/utils/blogTypeTone'
import CloudAtlas from './CloudAtlas.vue'

const { t } = useI18nStore()
const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()

// ==================== 配置常量 ====================
const MAX_LEVELS = 3
/**
 * 卡堆窗口：选中那张 + 前后各若干张，其余隐藏。
 * 数量写死，卡片间距、方向、轴方向就都不随卡片总数变化。
 */
const VISIBLE_BEFORE = 4
const VISIBLE_AFTER = 3

// ==================== 响应式状态 ====================
const currentFilter = ref('all')
const selectedTags = ref([])
const filterOpen = ref(false)
/** 当前选中的那张卡片，永远有一张（找不到就退回第一张） */
const selectedId = ref(null)
const wallRef = ref(null)
const fabRef = ref(null)

// ==================== 配置 ====================
const filterOptions = [
  { key: 'learning', labelKey: 'archive_filter_learning' },
  { key: 'all', labelKey: 'archive_filter_all' },
  { key: 'non-learning', labelKey: 'archive_filter_non_learning' },
]

const levelLabels = computed(() => [
  t('label_domain').value || '领域',
  t('label_subject').value || '科目',
  t('label_topic').value || '主题',
])

/** 筛选指纹：变化时让卡片重挂载，重播瀑布入场 */
const filterKey = computed(() => `${currentFilter.value}|${JSON.stringify(selectedTags.value)}`)

// ==================== 环境探测 ====================
const motionQuery =
  typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null
const reducedMotion = ref(Boolean(motionQuery?.matches))

// ==================== 工具函数 ====================
const isLearningBlog = (blog) => {
  if (blog?.category?.trim()) {
    const normalized = blog.category.trim()
    if (normalized === '学习') return true
    if (normalized === '娱乐') return false
  }
  const tags = Array.isArray(blog?.tags) ? blog.tags : []
  const firstTag = typeof tags[0] === 'string' ? tags[0].trim() : ''
  return firstTag === '二上' || firstTag === '二下'
}

// ==================== 标签树构建 ====================
const getBaseBlogs = () => {
  const blogs = blogStore.blogs || []
  if (currentFilter.value === 'learning') {
    return blogs.filter((b) => isLearningBlog(b))
  }
  if (currentFilter.value === 'non-learning') {
    return blogs.filter((b) => !isLearningBlog(b))
  }
  return blogs
}

const TAG_POSTS = Symbol('tagPosts')

const tagTree = computed(() => {
  const tree = {}
  const blogs = getBaseBlogs()

  blogs.forEach((blog) => {
    const tags = Array.isArray(blog.tags) ? blog.tags.slice(0, MAX_LEVELS) : []
    if (!tags.length) return

    let node = tree
    tags.forEach((tag, i) => {
      // 同一个标签既可能是终点，也可能还有下一层：统一用对象承载，
      // 直达文章放在 Symbol 里，既不干扰子标签枚举，又不会丢计数
      let child = node[tag]
      if (!child || Array.isArray(child)) {
        const posts = Array.isArray(child) ? child : []
        child = { [TAG_POSTS]: posts }
        node[tag] = child
      }
      node = child
      if (i === tags.length - 1) node[TAG_POSTS].push(blog)
    })
  })
  return tree
})

const getTagsForLevel = (level) => {
  if (level === 0) {
    return [null, ...Object.keys(tagTree.value)]
  }

  let node = tagTree.value
  for (let i = 0; i < level; i++) {
    const key = selectedTags.value[i]
    if (!key || !node[key] || Array.isArray(node[key])) {
      return [null]
    }
    node = node[key]
  }

  if (typeof node === 'object' && !Array.isArray(node)) {
    return [null, ...Object.keys(node)]
  }
  return [null]
}

/** 叶节点是数组，「全部」（null）在该层代表整个可达子树 */
const isTagSelected = (level, tag) => {
  if (tag === null) return !selectedTags.value[level]
  return selectedTags.value[level] === tag
}

const countLeaves = (node) => {
  if (Array.isArray(node)) return node.length
  if (!node || typeof node !== 'object') return 0
  const own = node[TAG_POSTS]?.length || 0
  return Object.values(node).reduce((sum, child) => sum + countLeaves(child), own)
}

const countFor = (level, tag) => {
  const path =
    tag === null ? selectedTags.value.slice(0, level) : [...selectedTags.value.slice(0, level), tag]
  let node = tagTree.value
  for (const key of path) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return 0
    node = node[key]
  }
  return countLeaves(node)
}

// ==================== 层深与钻取 ====================
/**
 * 只在 tagTree 里真实可达的前导路径，碰到未知标签或叶子就停。
 * 直接数 selectedTags 的前导长度会被陈旧地址坑到：?tags=["三上","xxx"]
 * 会把「主题」层顶到最前，而那一层因为走不下去只剩一个点不动的「全部」。
 * 注意 filteredBlogs / selectTag / updateUrl 仍然吃原始 selectedTags，
 * 所以筛选结果和以前逐位一致（陈旧路径照旧筛出空列表），只是界面不再卡死。
 */
const tagPath = computed(() => {
  const path = []
  let node = tagTree.value
  for (const tag of selectedTags.value) {
    if (path.length >= MAX_LEVELS) break
    if (!tag || typeof node !== 'object' || Array.isArray(node)) break
    const next = node[tag]
    if (!next) break
    path.push(tag)
    // 叶子也要收进路径（面包屑要显示到它），但它不再往下开一层
    if (Array.isArray(next)) break
    node = next
  }
  return path
})

/** 叶子不推进层级，所以层号要另外夹一次 */
const activeLevel = computed(() => Math.min(tagPath.value.length, MAX_LEVELS - 1))

/**
 * 当前这一层还没挑标签时，告诉用户该挑什么（「科目」「主题」），
 * 挑完了就不再提示；已经在最底层或者这一层只剩「全部」也不提示。
 */
const pendingLevel = computed(() => {
  const level = activeLevel.value
  if (level === 0 || tagPath.value.length > level) return null
  return getTagsForLevel(level).length > 1 ? level : null
})

const selectTag = (level, tag) => {
  const current = selectedTags.value[level]
  if (current === tag) return

  const newTags = selectedTags.value.slice(0, level)
  if (tag !== null) {
    newTags[level] = tag
  }
  selectedTags.value = newTags

  updateUrl()
}

/** 面包屑回跳：回到第 keep 层的选择器（丢弃该层及其后的选择） */
const jumpTo = (keep) => {
  if (!selectedTags.value.slice(keep).length) return
  selectedTags.value = selectedTags.value.slice(0, keep)
  updateUrl()
}

// ==================== 云图数据（交给独立 Canvas 云图组件） ====================
const atlasTags = computed(() => {
  const level = activeLevel.value
  return getTagsForLevel(level).map((tag) => ({
    tag,
    // 「全部」对齐页面总篇数；具体标签按标签树里可归类的文章数
    count: tag === null ? filteredBlogs.value.length : countFor(level, tag),
    selected: isTagSelected(level, tag),
  }))
})

const atlasAncestors = computed(() =>
  selectedTags.value
    .slice(0, activeLevel.value)
    .filter(Boolean)
    .map((tag, level) => ({ tag, level, count: countFor(level, tag) })),
)

const atlasTypes = computed(() =>
  filterOptions.map((filter) => ({ key: filter.key, label: t(filter.labelKey).value })),
)

const atlasPendingLabel = computed(() =>
  pendingLevel.value === null ? '' : levelLabels.value[pendingLevel.value] || '',
)

const handleAtlasSelect = (tag) => {
  const level = activeLevel.value
  selectTag(level, tag)

  if (isFinalPick(level, tag)) {
    autoCloseTimer = window.setTimeout(() => {
      closeFilter()
    }, 460)
  } else if (autoCloseTimer) {
    window.clearTimeout(autoCloseTimer)
    autoCloseTimer = 0
  }
}

// ==================== 云朵点击与自动收起 ====================
/** 选中的这一级还有更细的层可钻吗？没有就是「最后一级」 */
const isFinalPick = (level, tag) => {
  if (tag === null) return false
  const next = level + 1
  if (next >= MAX_LEVELS) return true
  // 下一层只剩一个「全部」= 没有可选的子标签
  return getTagsForLevel(next).length <= 1
}

let autoCloseTimer = 0

// ==================== 卡片选中与窗口 ====================
/**
 * 选中卡永远钉在舞台正中，其余卡片围着它沿「左上—右下」排开：
 * 位置 = 选中卡 + (序号差 × 步长)，所以间距、方向、轴方向都只跟步长有关，
 * 跟卡片总数完全无关 —— 卡片再多也只是多出一些看不见的。
 */
const selectedIndex = computed(() => {
  const list = filteredBlogs.value
  if (!list.length) return -1
  const found = list.findIndex((b) => b.id === selectedId.value)
  // 选中的那张被筛掉了就退回第一张：永远有一张被选中
  return found >= 0 ? found : 0
})

/** 卡堆定位变量 + 按 type 生成的类型色变量 */
const cardStyle = (index, blog) => {
  const d = index - selectedIndex.value
  return {
    '--d': d,
    '--ad': Math.abs(d),
    '--shift': d > 0 ? 1 : 0,
    ...getBlogTypeStyle(blog.type),
  }
}

const selectCard = (index) => {
  const blog = filteredBlogs.value[index]
  if (blog) selectedId.value = blog.id
}

/**
 * 堆尾那张的序号：窗口里最后一张。它后面没有卡片可盖，正文会露出来；
 * 正文露出来的那张就不该是 inert，按钮要能点。
 */
const tailIndex = computed(() => {
  const list = filteredBlogs.value
  if (!list.length) return -1
  return Math.min(selectedIndex.value + VISIBLE_AFTER, list.length - 1)
})

/** 把选中卡对到视口正中：它在堆里的位置是固定的，所以只在布局变化时动一次 */
let centeredOnce = false
const centerStage = (smooth) => {
  const card = wallRef.value?.querySelector('.cat-card.is-open')
  if (!card) return
  // 选中卡的斜切方框本来就关于自身中心对称，直接量它的中心最稳
  const rect = card.getBoundingClientRect()
  const target = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2
  if (Math.abs(target - window.scrollY) < 4) return
  window.scrollTo({
    top: Math.max(0, target),
    // 头一次（进场）直接就位，之后换筛选才滑过去
    behavior: smooth && centeredOnce && !reducedMotion.value ? 'smooth' : 'auto',
  })
  centeredOnce = true
}

/**
 * 滚轮换选中卡：滚一格 = 换一张，换到谁谁就落到正中。
 * 触控板会连发一串小 delta，所以先攒够一格再走，并留一点冷却时间。
 */
const WHEEL_STEP = 24
const WHEEL_COOLDOWN = 280
let wheelBurst = 0
let wheelReadyAt = 0

const handleWallWheel = (event) => {
  // 云图开着的时候滚轮留给云海
  if (filterOpen.value) return
  const now = Date.now()
  if (now < wheelReadyAt) return
  wheelBurst += event.deltaY
  if (Math.abs(wheelBurst) < WHEEL_STEP) return
  const direction = wheelBurst > 0 ? 1 : -1
  wheelBurst = 0
  wheelReadyAt = now + WHEEL_COOLDOWN
  selectCard(selectedIndex.value + direction)
}

/** 窗口之外的卡片直接隐藏 */
const inWindow = (index) => {
  const distance = index - selectedIndex.value
  return distance >= -VISIBLE_BEFORE && distance <= VISIBLE_AFTER
}

// ==================== 类型筛选 ====================
const setFilter = (key) => {
  if (currentFilter.value === key) return
  currentFilter.value = key
  // 换类型等于把标签路径清空，地址栏要跟着改，否则刷新会和界面对不上
  selectedTags.value = []
  updateUrl()
}

// ==================== 标签点击跳转 ====================
const handleTagClick = (tags, level) => {
  selectedTags.value = tags.slice(0, level + 1)
  updateUrl()
}

// ==================== URL 同步 ====================
const updateUrl = () => {
  const query = { ...route.query }
  if (selectedTags.value.length > 0 && selectedTags.value.some((t) => t !== null)) {
    query.tags = JSON.stringify(selectedTags.value)
  } else {
    delete query.tags
  }
  router.replace({ query })
}

// ==================== 筛选博客 ====================
const filteredBlogs = computed(() => {
  let blogs = getBaseBlogs()

  for (let i = 0; i < selectedTags.value.length; i++) {
    const tag = selectedTags.value[i]
    if (tag) {
      blogs = blogs.filter((b) => b.tags && b.tags[i] === tag)
    }
  }

  return blogs
})

// ==================== 云图筛选层 ====================
const lockBodyScroll = (locked) => {
  document.body.classList.toggle('cat-sheet-lock', locked)
}

/** 焦点落到当前层的 Tab 停靠点（选中那朵云）：重挂载后焦点不会掉回 body */
const openFilter = () => {
  if (filterOpen.value) return
  // 打开云图是「接着调」，不是「清空重来」：保留当前类型筛选与已选层级
  filterOpen.value = true
  lockBodyScroll(true)
}

const closeFilter = () => {
  if (!filterOpen.value) return
  filterOpen.value = false
  lockBodyScroll(false)
  // 收起后按钮才解除 inert，焦点得等模板更新完再还回去
  nextTick(() => fabRef.value?.focus({ preventScroll: true }))
}

// ==================== 环境变化 ====================
const handleMotionChange = (event) => {
  reducedMotion.value = event.matches
}

// ==================== 初始化 ====================
/** 「?tags=["三上","编译"]」→ 数组；坏了就当没带 */
const parseTagsParam = (value) => {
  if (!value) return []
  try {
    const tags = JSON.parse(decodeURIComponent(String(value)))
    return Array.isArray(tags) ? tags : []
  } catch {
    return []
  }
}

const initFromUrl = () => {
  selectedTags.value = parseTagsParam(route.query.tags)
}

// 前进/后退、手改地址栏也要跟着回到对应的筛选（只同步 tags，别的 query 不动）
watch(
  () => route.query.tags,
  () => {
    const next = parseTagsParam(route.query.tags)
    if (JSON.stringify(next) !== JSON.stringify(selectedTags.value)) {
      selectedTags.value = next
    }
  },
)

// 换了一批卡片：选中那张多半已经不在了，交回给 selectedIndex 退回第一张；
// 堆的高度也跟着变，再把选中卡对回视口正中
watch(
  [filterKey, () => blogStore.blogs?.length],
  () => {
    selectedId.value = null
    nextTick(() => centerStage(true))
  },
  { flush: 'post' },
)

let centerFrame = 0
const scheduleCenter = () => {
  if (centerFrame) return
  centerFrame = requestAnimationFrame(() => {
    centerFrame = 0
    centerStage(false)
  })
}

onMounted(() => {
  if (!blogStore.blogs || blogStore.blogs.length === 0) {
    blogStore.fetchBlogs()
  }

  initFromUrl()

  motionQuery?.addEventListener?.('change', handleMotionChange)
  window.addEventListener('resize', scheduleCenter)
  nextTick(() => centerStage(false))
})

onUnmounted(() => {
  motionQuery?.removeEventListener?.('change', handleMotionChange)
  window.removeEventListener('resize', scheduleCenter)
  if (centerFrame) cancelAnimationFrame(centerFrame)
  if (autoCloseTimer) window.clearTimeout(autoCloseTimer)
  // 路由切走时不能把 body 的滚动锁留在页面上
  lockBodyScroll(false)
})
</script>

<style scoped>
/* ===== 页面框架 ===== */
.categories-page {
  --cat-ink: #17222f;
  --cat-ink-soft: rgba(23, 34, 47, 0.62);
  --cat-ink-faint: rgba(23, 34, 47, 0.42);
  --cat-rose: #e85d84;
  --cat-sky: #6fc5ff;
  --cat-mint: #58d8b2;
  --cat-iris: #a08cff;
  --cat-amber: #ffd38a;
  --cat-line: rgba(255, 255, 255, 0.64);
  --cat-glass: rgba(255, 255, 255, 0.62);
  --cat-glass-strong: rgba(255, 255, 255, 0.82);
  --cat-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  color: var(--cat-ink);
}

.categories-section {
  padding: 72px 20px 96px;
  position: relative;
  min-height: calc(100vh - 60px);
  /* 卡片斜切 / 阴影会探出容器，裁掉横向溢出但别制造滚动容器 */
  overflow-x: clip;
}

.cat-shell {
  max-width: 1560px;
  margin: 0 auto;
  position: relative;
  isolation: isolate;
  padding: clamp(12px, 1.8vw, 22px);
  border: 1px solid var(--cat-line);
  border-radius: 34px;
  background:
    radial-gradient(120% 70% at 10% -6%, rgba(255, 182, 201, 0.13), transparent 58%),
    radial-gradient(80% 62% at 96% 12%, rgba(154, 215, 255, 0.17), transparent 62%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(245, 250, 255, 0.5));
  box-shadow:
    0 34px 86px -46px rgba(23, 34, 47, 0.56),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(24px) saturate(1.14);
  -webkit-backdrop-filter: blur(24px) saturate(1.14);
}

/* 顶光与底部薄雾：玻璃板不是一块死白，卡片也不会悬空 */
.cat-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(60% 40% at 50% 0%, rgba(255, 255, 255, 0.34), transparent 72%),
    radial-gradient(80% 46% at 50% 100%, rgba(154, 215, 255, 0.08), transparent 78%);
}

.cat-shell > * {
  position: relative;
  z-index: 1;
}

/* 页头：左上角的大字报头，给满屏卡堆一个叙事起点 */
.cat-masthead {
  position: absolute;
  top: 104px;
  left: max(24px, calc((100vw - 1240px) / 2));
  z-index: 6;
  pointer-events: none;
  transition: opacity 260ms ease, transform 260ms ease;
}

.cat-masthead.is-muted {
  opacity: 0;
  transform: translateY(-8px);
}

.cat-masthead__eyebrow {
  display: block;
  margin-bottom: 8px;
  font-family: var(--font-ui);
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  color: rgba(23, 34, 47, 0.42);
}

.cat-masthead__title {
  margin: 0;
  font-size: clamp(2.2rem, 4.4vw, 3.3rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.01em;
  background: linear-gradient(100deg, #c84070 0%, #a08cff 52%, #58d8b2 100%);
  background-size: 180% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 12px 26px rgba(23, 34, 47, 0.1));
}

.cat-masthead__meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 10px 0 0;
  font-family: var(--font-ui);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  color: rgba(23, 34, 47, 0.46);
}

.cat-masthead__meta b {
  font-size: 1.2rem;
  font-weight: 800;
  color: rgba(23, 34, 47, 0.82);
}

/* 左下角：当前路径（避开站点自己的左下载浮按钮，让到它们右边） */
.cat-crumb--float {
  position: fixed;
  left: 92px;
  bottom: 24px;
  z-index: 80;
  max-width: min(620px, calc(100vw - 150px));
  padding: 7px 12px 7px 8px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  background: rgba(255, 255, 255, 0.56);
  backdrop-filter: blur(18px) saturate(1.12);
  -webkit-backdrop-filter: blur(18px) saturate(1.12);
  box-shadow:
    0 16px 30px -22px rgba(38, 56, 86, 0.66),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.cat-crumb__count {
  flex: none;
  margin-left: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(154, 215, 255, 0.24);
  color: #3c5a78;
  font-size: 0.75rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* 右上角：圆形云图入口 */
.cat-fab {
  position: fixed;
  right: 24px;
  top: 84px;
  z-index: 80;
  width: 76px;
  height: 76px;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(222, 240, 255, 0.72));
  color: #21364b;
  font-size: 1.875rem;
  cursor: pointer;
  box-shadow:
    0 22px 40px -20px rgba(38, 56, 86, 0.72),
    0 0 30px -12px rgba(232, 93, 132, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(18px) saturate(1.16);
  -webkit-backdrop-filter: blur(18px) saturate(1.16);
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 260ms ease,
    border-color 260ms ease;
}

.cat-fab i {
  filter: drop-shadow(0 5px 10px rgba(88, 128, 165, 0.28));
}

.cat-fab::before {
  content: '';
  position: absolute;
  inset: -7px;
  border: 1px solid rgba(232, 93, 132, 0.28);
  border-radius: 28px;
  pointer-events: none;
  animation: cat-fab-halo 3.4s ease-in-out infinite;
}

@keyframes cat-fab-halo {
  0%,
  100% {
    opacity: 0.38;
    transform: scale(0.96);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.05);
  }
}

.cat-fab::after {
  content: '';
  position: absolute;
  inset: 9px;
  border: 1px solid rgba(232, 93, 132, 0.18);
  border-radius: 16px;
  pointer-events: none;
}

.cat-fab:hover {
  border-color: rgba(232, 93, 132, 0.36);
  transform: translateY(-3px) rotate(-4deg) scale(1.03);
  box-shadow:
    0 26px 44px -18px rgba(38, 56, 86, 0.78),
    0 0 36px -8px rgba(232, 93, 132, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
}

.cat-fab:focus-visible {
  outline: 2px solid rgba(232, 93, 132, 0.48);
  outline-offset: 3px;
}

.cat-fab.is-atlas-open {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.82);
}

/* 云图是整屏界面，打开时让全局浮动按钮退到幕后，避免压住面包屑与层级提示 */
:global(body.cat-sheet-lock .fab-btn) {
  display: none !important;
}

/* 只隐藏按钮会留下玻璃容器本身，整组一起让位 */
:global(body.cat-sheet-lock .floating-controls-container) {
  display: none !important;
}

:global(body.cat-sheet-lock .cat-crumb--float) {
  display: none !important;
}

:global(body.cat-sheet-lock .cat-fab) {
  visibility: hidden;
}

/* ===== 卡片堆：固定窗口，选中那张永远在舞台正中 ===== */
.cat-wall {
  /* 步长写死：不随卡片总数变化，于是方向、轴方向、间距永远一致 */
  --step-x: 46px;
  --step-y: 52px;
  /* 直线的斜率 --step-x / --step-y */
  --slope: 0.885;
  /*
   * 卡片形状走等距（斜投影）：左右两条纵边保持竖直，上下横边向右上抬 --tilt。
   * CSS 算不出 tan，就把正切值和角度写在一起，下面两处要用。
   */
  --tilt: -10deg;
  --shear: 0.1763;
  /* 标题栏高度 = 下一条横带压不到的那一段 = step-y + step-x * tan */
  --strip: calc(var(--step-y) + var(--step-x) * var(--shear) + 2px);
  --card-w: min(560px, 100%);
  /* 斜切会把方框撑高，这里用不带宽度的宽度令牌算，免得高度依赖百分比变成循环 */
  --shear-w: 560px;
  --card-h: 224px;
  --depth: 15px;
  /*
   * 让位距离：斜切会把「让开一个卡高」折算成 (1 + slope * tan) 倍，
   * 反解出屏幕上的位移，正文才会完整露出来。
   */
  --gap: calc(var(--card-h) / (1 + var(--slope) * var(--shear)) + 12px);
  /* 窗口里前后各露几张，必须跟脚本里的 VISIBLE_BEFORE / VISIBLE_AFTER 对上 */
  --before: 4;
  --after: 3;
  /* 斜切后一张卡占的方框，比卡本身高一截 */
  --bbox-h: calc(var(--card-h) + var(--shear-w) * var(--shear));
  /* 上下各留一点余量，给入场动画和投影，别在边界上切到卡片 */
  --above: calc(var(--before) * var(--step-y) + var(--bbox-h) / 2 + 28px);
  --below: calc(var(--after) * var(--step-y) + var(--gap) + var(--bbox-h) / 2 + 28px);
  position: relative;
  /*
   * 高度按内容给足（前后各 --before / --after 张 + 尾板），所以这里裁不到任何东西；
   * overflow 只是把窗口外那些停在远处的卡片挡掉，免得它们把整页撑长。
   */
  height: calc(var(--above) + var(--below));
  overflow: hidden;
  transition:
    opacity 320ms ease,
    filter 320ms ease;
}

/* 云图打开时卡片整体退场 */
.cat-wall[data-dim='true'] {
  opacity: 0;
  filter: blur(8px);
  pointer-events: none;
}

.cat-wall.is-empty {
  height: auto;
  min-height: 320px;
}

.cat-empty {
  padding: 96px 0;
  text-align: center;
  color: #5b6d81;
  font-weight: 700;
}

/*
 * 位置 = 选中卡 + (序号差 --d × 步长)，所以每张只比前一张多走一个步长，
 * 方向一致 ⇒ 中心永远共线，且选中卡永远落在 50% / 50%。
 * 序号差为正（排在选中卡后面）的那几张再让开一个 --gap，
 * 让位同样沿着这条直线走 ⇒ 让位过程中这条线也不会歪。
 * skewY 是仿射变换，不产生透视，所以「后一张盖住前一张」在斜切之后依然精确。
 */
.cat-card {
  position: absolute;
  top: var(--above);
  left: 50%;
  width: var(--card-w);
  height: var(--card-h);
  margin: calc(var(--card-h) / -2) 0 0 calc(var(--card-w) / -2);
  z-index: calc(200 + var(--d, 0));
  transform:
    translate3d(calc(var(--d, 0) * var(--step-x) + var(--shift, 0) * var(--gap) * var(--slope)),
      calc(var(--d, 0) * var(--step-y) + var(--shift, 0) * var(--gap)),
      0) skewY(var(--tilt));
  transition:
    transform 620ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 320ms ease,
    visibility 0s linear;
  animation: cat-card-in 620ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(min(var(--ad, 0), 6) * 55ms);
}

/* 窗口之外：隐藏，但留在 DOM 里，进窗时还能滑进来 */
.cat-card.is-out {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    transform 620ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 320ms ease,
    visibility 0s linear 320ms;
}

/*
 * 堆尾那张后面没有卡片盖它，正文会露在外面 —— 这是有意的，
 * 它跟选中卡一样可以点按钮进博客。
 */

/* 入场：从选中卡向外一层层落位 */
@keyframes cat-card-in {
  from {
    opacity: 0;
    filter: blur(5px);
    transform:
      translate3d(calc(var(--d, 0) * var(--step-x) + var(--shift, 0) * var(--gap) * var(--slope)),
        calc(var(--d, 0) * var(--step-y) + var(--shift, 0) * var(--gap) - 18px),
        0) skewY(var(--tilt));
  }
}

/* 露在外面的标题栏：高度 = 斜切后「下一条横带」压不到的那一段 */
.cat-card__head {
  flex: none;
  height: var(--strip);
  border-bottom: 1px solid rgba(255, 255, 255, 0.28);
}

.cat-card__toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 0 24px;
  border: none;
  border-radius: 16px 16px 0 0;
  background: none;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.cat-card__toggle:focus-visible {
  outline: 2px solid var(--type-line, rgba(200, 64, 112, 0.5));
  outline-offset: -3px;
}

.cat-card__no {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--type-line, rgba(23, 34, 47, 0.12));
  border-radius: 9px;
  background: var(--type-soft, rgba(255, 255, 255, 0.34));
  color: var(--type-ink, rgba(23, 34, 47, 0.46));
  font-size: 0.65625rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  transition:
    background 260ms ease,
    border-color 260ms ease,
    color 260ms ease,
    box-shadow 260ms ease;
}

.cat-card.is-open .cat-card__no {
  border-color: transparent;
  background: var(--type-ink, #c84070);
  box-shadow: 0 0 0 3px var(--type-soft, rgba(200, 64, 112, 0.2));
  color: #fff;
}

.cat-card__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #17222f;
  font-size: clamp(0.84375rem, 1.15vw, 0.96875rem);
  font-weight: 780;
  letter-spacing: -0.012em;
  line-height: 1.3;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: color 240ms ease;
}

.cat-card.is-open .cat-card__title {
  color: var(--type-ink, #c84070);
}

/* 板面 */
.cat-card__slab {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 18px;
  background-color: #f7fbff;
  background-image:
    linear-gradient(155deg, rgba(255, 255, 255, 0.94) 0%, rgba(250, 253, 255, 0.86) 55%, var(--type-soft, rgba(23, 34, 47, 0.06)) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 0 0 1px rgba(255, 255, 255, 0.32),
    inset 0 -22px 34px -28px rgba(38, 62, 92, 0.24),
    -1px 2px 3px -1px rgba(23, 34, 47, 0.08),
    -8px 18px 30px -18px rgba(36, 58, 88, 0.3),
    -20px 42px 64px -32px rgba(23, 34, 47, 0.4);
  transition:
    box-shadow 340ms var(--cat-ease),
    border-color 340ms ease,
    background 340ms ease;
}

/* 实体厚度：背面往下（并略往左）错开 --depth，露出来的那道就是板厚 */
.cat-card__edge {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 18px;
  background: linear-gradient(158deg, rgba(214, 228, 245, 0.62), rgba(170, 192, 217, 0.42));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.58),
    -8px 18px 22px -18px rgba(23, 34, 47, 0.38);
  transform: translate3d(calc(var(--depth) * -0.5), var(--depth), 0);
}

/* 板子的书脊，顺着直线看过去就是一条彩色棱；颜色跟着文章 type 走 */
.cat-card__spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 2;
  width: 6px;
  overflow: hidden;
  background: var(--type-bar, linear-gradient(180deg, #ffb6c9, #c7b6ff 52%, #a7f3d0));
  box-shadow: 0 0 18px -4px var(--type-glow, rgba(160, 140, 255, 0.3));
  transition: box-shadow 340ms ease;
}

.cat-card__spine::after {
  content: '';
  position: absolute;
  inset: -20% 0 auto;
  height: 45%;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.62), transparent);
  opacity: 0;
  transform: translateY(-100%);
}

.cat-card:hover .cat-card__spine::after,
.cat-card.is-open .cat-card__spine::after {
  animation: cat-spine-sweep 1.15s var(--cat-ease) 1;
}

@keyframes cat-spine-sweep {
  0% {
    opacity: 0;
    transform: translateY(-100%);
  }

  36% {
    opacity: 0.72;
  }

  100% {
    opacity: 0;
    transform: translateY(310%);
  }
}

.cat-card__sheen {
  position: absolute;
  top: -60%;
  bottom: -60%;
  left: -30%;
  width: 45%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.8), transparent);
  transform: rotate(18deg) translateX(-160%);
  transition: transform 950ms cubic-bezier(0.2, 0.72, 0.2, 1);
  pointer-events: none;
}

.cat-card:hover .cat-card__sheen,
.cat-card.is-open .cat-card__sheen {
  transform: rotate(18deg) translateX(420%);
}

.cat-card:hover .cat-card__title {
  color: var(--type-ink, #17222f);
}

.cat-card:hover .cat-card__slab {
  border-color: var(--type-line, rgba(255, 255, 255, 0.7));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 0 0 0 1px rgba(255, 255, 255, 0.36),
    inset 0 -22px 34px -28px rgba(38, 62, 92, 0.2),
    -1px 2px 3px -1px rgba(23, 34, 47, 0.08),
    -8px 18px 30px -16px rgba(36, 58, 88, 0.3),
    -20px 42px 64px -30px rgba(23, 34, 47, 0.4),
    0 0 26px -10px var(--type-glow, rgba(160, 140, 255, 0.2));
}

/* 正中间那张：正文整个露出来，边缘亮起来，影子也压得更实 */
.cat-card.is-open .cat-card__slab {
  border-color: var(--type-line, rgba(200, 64, 112, 0.35));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.99),
    inset 0 0 0 1px rgba(255, 255, 255, 0.34),
    inset 0 -24px 34px -28px rgba(38, 62, 92, 0.2),
    0 0 0 2px var(--type-line, rgba(200, 64, 112, 0.35)),
    0 0 32px -8px var(--type-glow, rgba(200, 64, 112, 0.24)),
    -2px 3px 4px -2px rgba(23, 34, 47, 0.1),
    -10px 20px 30px -16px rgba(23, 34, 47, 0.34),
    -22px 46px 68px -30px rgba(23, 34, 47, 0.46);
}

.cat-card.is-open .cat-card__spine {
  box-shadow:
    0 0 14px -2px var(--type-glow, rgba(200, 64, 112, 0.24)),
    0 0 26px -6px var(--type-glow, rgba(200, 64, 112, 0.24));
  animation: cat-spine-breathe 4.2s ease-in-out infinite;
}

@keyframes cat-spine-breathe {
  0%,
  100% {
    opacity: 0.86;
  }

  50% {
    opacity: 1;
  }
}

/* 被盖住的正文：缩进到 step-x 之后，才整段落在下一张的盖板里 */
.cat-card__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 24px 18px calc(var(--step-x) + 24px);
}

.cat-card__excerpt {
  margin: 0;
  color: rgba(23, 34, 47, 0.62);
  font-size: 0.84375rem;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.cat-card__foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
}

.cat-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cat-card__type {
  display: inline-flex;
  align-items: center;
  padding: 4px 11px;
  border: 1px solid var(--type-line, rgba(255, 210, 166, 0.42));
  border-radius: 999px;
  background: var(--type-soft, rgba(255, 210, 166, 0.42));
  color: var(--type-ink, #8a5a1f);
  font-size: 0.65625rem;
  font-weight: 800;
  font-style: normal;
  letter-spacing: 0.04em;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.cat-card__type::before {
  content: '';
  flex: 0 0 auto;
  width: 5px;
  height: 5px;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--type-ink, #8a5a1f);
  opacity: 0.8;
}

.cat-card__date {
  color: rgba(23, 34, 47, 0.46);
  font-size: 0.71875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.cat-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cat-card__tag {
  padding: 4px 12px 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.44);
  color: rgba(23, 34, 47, 0.64);
  font-family: inherit;
  font-size: 0.71875rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.46);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition:
    background 220ms ease,
    border-color 220ms ease,
    color 220ms ease,
    box-shadow 220ms ease;
}

.cat-card__tag:hover,
.cat-card__tag:focus-visible {
  border-color: var(--type-line, rgba(200, 64, 112, 0.4));
  background: var(--type-soft, rgba(200, 64, 112, 0.16));
  color: var(--type-ink, #c84070);
  outline: none;
}

.cat-card__tag:focus-visible {
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.9),
    0 0 0 4px var(--type-line, rgba(200, 64, 112, 0.3));
}

/* 进博客只能走这个按钮：点卡片本身不跳转，只展开 */
.cat-card__read {
  flex: none;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 15px 9px 17px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: linear-gradient(135deg, var(--type-ink, #35435a), #253447 72%);
  color: #fbfdff;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-decoration: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 12px 22px -14px var(--type-glow, rgba(23, 34, 47, 0.6)),
    0 3px 8px -4px rgba(23, 34, 47, 0.4);
  transition:
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 240ms ease,
    filter 240ms ease;
}

.cat-card__read i {
  font-size: 0.625rem;
  opacity: 0.76;
  transition: transform 240ms var(--cat-ease);
}

.cat-card__read:hover {
  transform: translateY(-2px);
  filter: brightness(1.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 18px 30px -14px var(--type-glow, rgba(23, 34, 47, 0.6)),
    0 4px 10px -4px rgba(23, 34, 47, 0.4);
}

.cat-card__read:hover i {
  transform: translateX(3px);
}

.cat-card__read:focus-visible {
  outline: 2px solid var(--type-line, rgba(200, 64, 112, 0.35));
  outline-offset: 3px;
}

.cat-card__read i {
  font-size: 0.6875rem;
  transition: transform 240ms ease;
}

.cat-card__read:hover i {
  transform: translateX(3px);
}

.cat-card__read:focus-visible {
  outline: 2px solid #55c8ff;
  outline-offset: 3px;
}

/* ===== 窄屏 ===== */
@media (max-width: 1100px) {
  .cat-crumb--float {
    max-width: min(38%, 280px);
  }
}

@media (max-width: 948px) {
  .categories-section {
    padding: 68px 16px 96px;
  }

  .cat-shell {
    padding: 12px;
    border-radius: 28px;
  }

  /* 左下路径：窄屏下贴着站点浮动按钮右边，能滚就滚 */
  .cat-crumb--float {
    left: 88px;
    bottom: 20px;
    max-width: calc(100vw - 108px);
  }

  .cat-fab {
    right: 16px;
    top: 76px;
    width: 62px;
    height: 62px;
    border-radius: 18px;
    font-size: 1.5rem;
  }

  .cat-fab::before {
    inset: -5px;
    border-radius: 23px;
  }

  .cat-fab::after {
    inset: 7px;
    border-radius: 13px;
  }

  /* 卡片窄一些、步长小一些，斜切角与「固定窗口」的规矩不变 */
  .cat-wall {
    --step-x: 28px;
    --step-y: 44px;
    --slope: 0.636;
    --card-w: min(100%, 420px);
    --shear-w: 420px;
    --card-h: 190px;
    --depth: 12px;
  }

  .cat-card__toggle {
    padding: 0 16px;
    gap: 8px;
  }

  .cat-card__body {
    padding-right: 16px;
    padding-bottom: 14px;
    padding-left: calc(var(--step-x) + 16px);
  }

  .cat-card__no {
    display: none;
  }

  .cat-stack {
    perspective: 1100px;
  }
}

/* 再窄就把顶栏折起来：标题 + 关闭一行，类型筛选与路径各占一行 */
@media (max-width: 720px) {
  .categories-section {
    padding: 64px 10px 88px;
  }

  .cat-shell {
    padding: 8px;
    border-radius: 24px;
  }

  .cat-masthead {
    top: 76px;
    left: 16px;
  }

  .cat-masthead__title {
    font-size: 1.9rem;
  }

  .cat-masthead__meta b {
    font-size: 1.05rem;
  }

  /* 移动端把卡堆收进屏幕：更窄的卡、更小的步距与更缓的斜切 */
  .cat-wall {
    --card-w: min(390px, 82vw);
    --shear-w: 390px;
    --card-h: 192px;
    --step-x: 6px;
    --step-y: 34px;
    --tilt: -5deg;
    --shear: 0.0875;
    --slope: 0.18;
  }

  .cat-card__slab {
    border-radius: 16px;
  }

  .cat-card__edge {
    border-radius: 16px;
  }

  .cat-card__body {
    gap: 7px;
    padding-right: 12px;
    padding-bottom: 12px;
    padding-left: calc(var(--step-x) + 12px);
  }

  .cat-card__excerpt {
    font-size: 0.75rem;
    line-height: 1.6;
  }

  .cat-card__foot {
    gap: 6px;
  }

  .cat-card__type {
    padding: 3px 8px;
    font-size: 0.59375rem;
  }

  .cat-card__date {
    font-size: 0.65625rem;
  }

  .cat-card__tag {
    padding: 3px 9px;
    font-size: 0.65625rem;
  }

  .cat-card__read {
    gap: 7px;
    padding: 8px 12px 8px 13px;
    font-size: 0.6875rem;
  }
}

/* ===== 降低动态效果 ===== */
@media (prefers-reduced-motion: reduce) {
  .cat-card,
  .cat-stack__stage {
    animation: none !important;
    transition-duration: 1ms !important;
  }

  .cat-card__read:hover,
  .cat-card__read:hover i {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cat-fab::before {
    animation: none;
  }
}
</style>

<style>
/* 云图打开时锁住页面滚动（与站内 body.search-modal-open 等惯例一致） */
body.cat-sheet-lock {
  overflow: hidden;
}
</style>

