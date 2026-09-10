<template>
  <main class="categories-page">
    <section class="categories-section">
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
          }" :data-index="index" :style="{
            '--d': index - selectedIndex,
            '--ad': Math.abs(index - selectedIndex),
            '--shift': index > selectedIndex ? 1 : 0,
          }">
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
    <button ref="fabRef" type="button" class="cat-fab" :aria-label="t('categories_filter_title').value"
      :title="t('categories_filter_title').value" :inert="filterOpen ? true : undefined" @click="openFilter">
      <i class="fas fa-cloud" aria-hidden="true"></i>
    </button>

    <!-- 云图筛选：占满整屏的一级界面，出现时看不到博客卡片 -->
    <div class="cat-veil" :data-open="filterOpen ? 'true' : 'false'" aria-hidden="true"></div>
    <section ref="panelRef" class="cat-sheet" :data-open="filterOpen ? 'true' : 'false'" role="dialog" aria-modal="true"
      :aria-label="t('categories_filter_title').value" :inert="filterOpen ? undefined : true"
      @keydown="handlePanelKeydown">
      <header class="cat-sheet__head">
        <div class="cat-sheet__bar">
          <span class="cat-sheet__title">{{ t('categories_filter_title') }}</span>

          <!-- 面包屑：回到任意一层；末尾还会补一个「这一层该选什么」的提示 -->
          <nav class="cat-crumb cat-crumb--sheet" :aria-label="t('categories_filter_title').value">
            <span v-if="!tagPath.length" class="cat-crumb__item is-current" aria-current="true">
              {{ t('filter_all') }}
            </span>
            <button v-else type="button" class="cat-crumb__item" @click="jumpTo(0)">
              {{ t('filter_all') }}
            </button>
            <template v-for="(tag, i) in tagPath" :key="`${i}-${tag}`">
              <i class="fas fa-chevron-right cat-crumb__sep" aria-hidden="true"></i>
              <span v-if="i === tagPath.length - 1" class="cat-crumb__item is-current" aria-current="true">
                {{ tag }}
              </span>
              <!-- jumpTo(i + 1)：点「三上」是钻进三上（保留它、进到科目层），不是把它清掉 -->
              <button v-else type="button" class="cat-crumb__item" @click="jumpTo(i + 1)">
                {{ tag }}
              </button>
            </template>
            <template v-if="pendingLevel !== null">
              <i class="fas fa-chevron-right cat-crumb__sep" aria-hidden="true"></i>
              <span class="cat-crumb__item is-ghost">{{ levelLabels[pendingLevel] }}</span>
            </template>
          </nav>

          <!-- 类型筛选 -->
          <div class="cat-type" role="radiogroup" :aria-label="t('categories_filter_title').value"
            :style="{ '--idx': filterIndex }">
            <span class="cat-type__pill" aria-hidden="true"></span>
            <button v-for="filter in filterOptions" :key="filter.key" type="button" class="cat-type__btn"
              :class="{ 'is-active': currentFilter === filter.key }" role="radio"
              :aria-checked="currentFilter === filter.key ? 'true' : 'false'" @click="setFilter(filter.key)">
              {{ t(filter.labelKey) }}
            </button>
          </div>

          <button type="button" class="cat-sheet__close" :aria-label="t('close').value" @click="closeFilter">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      </header>

      <!-- 整屏云海：三层景深不变，各朵云的位置按需随机撒开 -->
      <div ref="stackRef" class="cat-stack">
        <div class="cat-stack__stage" @click.self="closeFilter">
          <section v-for="level in MAX_LEVELS" :key="level - 1" class="cat-layer" :data-level="level - 1"
            :data-depth="depthOf(level - 1)" role="group" :aria-label="levelLabels[level - 1]"
            :inert="depthOf(level - 1) > 0 ? true : undefined">
            <button v-for="(tile, idx) in cloudTiles(level - 1)"
              :key="`${level}-${activeLevel}-${tile.tag ?? '__all__'}`" type="button" class="cat-cloud" :class="{
                'is-active': isTagSelected(level - 1, tile.tag),
                'is-all': tile.tag === null,
              }" :style="{
                '--x': `${tile.x}%`,
                '--y': `${tile.y}%`,
                '--sc': tile.scale,
                '--bob': `${tile.bob}s`,
                '--i': idx,
              }" :tabindex="tileTabIndex(level - 1, tile.tag)"
              :aria-pressed="isTagSelected(level - 1, tile.tag) ? 'true' : 'false'"
              @click="handleTileClick(level - 1, tile.tag)" @keydown="handleTileKeydown(level - 1, idx, $event)">
              <span class="cat-cloud__float">
                <span class="cat-cloud__puff" aria-hidden="true"></span>
                <span class="cat-cloud__label">{{
                  tile.tag === null ? t('filter_all') : tile.tag
                }}</span>
                <span class="cat-cloud__count">{{ countFor(level - 1, tile.tag) }}</span>
              </span>
            </button>
          </section>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'

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
const panelRef = ref(null)
const stackRef = ref(null)
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

const filterIndex = computed(() =>
  Math.max(
    0,
    filterOptions.findIndex((f) => f.key === currentFilter.value),
  ),
)

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

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

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

const tagTree = computed(() => {
  const tree = {}
  const blogs = getBaseBlogs()

  blogs.forEach((blog) => {
    const tags = Array.isArray(blog.tags) ? blog.tags.slice(0, MAX_LEVELS) : []
    if (!tags.length) return

    let node = tree
    tags.forEach((tag, i) => {
      const isLeaf = i === tags.length - 1
      if (!node[tag]) {
        node[tag] = isLeaf ? [] : {}
      }
      if (isLeaf) {
        node[tag].push(blog)
      } else {
        node = node[tag]
      }
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
  return Object.values(node).reduce((sum, child) => sum + countLeaves(child), 0)
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

// ==================== 云图随机布点 ====================
/** 一次会话一个种子：刷新会换一片天，但交互过程中云不会乱跳 */
const cloudSeed = Math.floor(Math.random() * 0xffffffff)

const hash32 = (text) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** xorshift32：同一个标签每次都落回同一朵云的位置 */
const makeRandom = (key) => {
  let state = hash32(`${cloudSeed}|${key}`) || 20240910
  return () => {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 4294967296
  }
}

/**
 * 网格分层 + 格内抖动：位置是随机的，但不会全挤成一团、也不会压到屏幕边。
 * 「全部」不参与掷点，钉死在正中心。
 */
const scatterClouds = (level, tags) => {
  const rest = tags.filter((tag) => tag !== null)
  const count = rest.length
  // 至少分两列：别让某朵云正好落在正中心那颗圆上
  const cols = Math.max(2, Math.round(Math.sqrt(count * 1.7)))
  const rows = Math.max(1, Math.ceil(count / cols))
  const random = makeRandom(`${level}|${tags.join('|')}`)

  // 格子和标签随机配对（Fisher–Yates），免得编号大的标签永远待在右下角
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cells.push([c, r])
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = cells[i]
    cells[i] = cells[j]
    cells[j] = swap
  }

  const cellW = 100 / cols
  const cellH = 100 / rows
  const placed = rest.map((tag, i) => {
    const [c, r] = cells[i % cells.length]
    return {
      tag,
      x: clamp(cellW * (c + 0.5) + (random() - 0.5) * cellW * 0.6, 11, 89),
      y: clamp(cellH * (r + 0.5) + (random() - 0.5) * cellH * 0.6, 14, 86),
      scale: 0.84 + random() * 0.36,
      bob: Number((6 + random() * 4).toFixed(2)),
    }
  })

  return [{ tag: null, x: 50, y: 50, scale: 1.06, bob: 8.6 }, ...placed]
}

/** 三层云图各自的布点，随所在层的标签集合重算 */
const cloudLevels = computed(() => {
  const levels = []
  for (let level = 0; level < MAX_LEVELS; level++) {
    levels.push(scatterClouds(level, getTagsForLevel(level)))
  }
  return levels
})

const cloudTiles = (level) => cloudLevels.value[level] || []

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

/** 0 = 最前，负数 = 已钻过的层（后退），正数 = 尚未到达的层（候场） */
const depthOf = (level) => clamp(level - activeLevel.value, -(MAX_LEVELS - 1), 1)

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

// ==================== 层内键盘与焦点 ====================
const focusTile = (level, index) => {
  const layer = stackRef.value?.querySelector(`.cat-layer[data-level="${level}"]`)
  const tiles = layer?.querySelectorAll('.cat-cloud')
  if (!tiles?.length) return
  tiles[clamp(index, 0, tiles.length - 1)]?.focus({ preventScroll: true })
}

/** 每层只有一个 Tab 停靠点（选中项，没有则第一项），层内用方向键移动 */
const tileTabIndex = (level, tag) => {
  if (depthOf(level) !== 0) return -1
  const tags = getTagsForLevel(level)
  const selected = tags.findIndex((item) => isTagSelected(level, item))
  return tags.indexOf(tag) === (selected >= 0 ? selected : 0) ? 0 : -1
}

const handleTileClick = (level, tag) => {
  // 先记下点的是不是当前这一层：点后退层是「回退」，不算选完
  const fromActiveLevel = depthOf(level) === 0
  selectTag(level, tag)
  nextTick(focusActiveTile)

  // 选完最后一级就自动收起来；留一点时间让选中高亮和层级动画被看到
  if (fromActiveLevel && isFinalPick(level, tag)) {
    autoCloseTimer = window.setTimeout(() => closeFilter(), 420)
  } else if (autoCloseTimer) {
    window.clearTimeout(autoCloseTimer)
    autoCloseTimer = 0
  }
}

const handleTileKeydown = (level, index, event) => {
  const total = getTagsForLevel(level).length
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    focusTile(level, (index + 1) % total)
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    focusTile(level, (index - 1 + total) % total)
  } else if (event.key === 'Home') {
    event.preventDefault()
    focusTile(level, 0)
  } else if (event.key === 'End') {
    event.preventDefault()
    focusTile(level, total - 1)
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
const focusActiveTile = () => {
  const layer = panelRef.value?.querySelector('.cat-layer[data-depth="0"]')
  const target = layer?.querySelector('.cat-cloud[tabindex="0"]') || layer?.querySelector('.cat-cloud')
  target?.focus({ preventScroll: true })
}

const openFilter = () => {
  if (filterOpen.value) return
  // 打开云图是「接着调」，不是「清空重来」：保留当前类型筛选与已选层级
  filterOpen.value = true
  lockBodyScroll(true)
  nextTick(focusActiveTile)
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

/**
 * 只挂在面板上、不挂 window：搜索面板/公告弹窗也吃 Escape，
 * 挂 window 会在关掉它们的同时顺带把分类层级弹掉
 */
const handlePanelKeydown = (event) => {
  if (event.key !== 'Escape') return
  if (filterOpen.value) {
    closeFilter()
    return
  }
  // 先清掉伸出当前层之外的那一级选择，再逐层回退
  if (selectedTags.value.length > activeLevel.value) {
    jumpTo(activeLevel.value)
  } else if (activeLevel.value > 0) {
    jumpTo(activeLevel.value - 1)
  }
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
}

/* 左下角：当前路径（避开站点自己的左下载浮按钮，让到它们右边） */
.cat-crumb--float {
  position: fixed;
  left: 92px;
  bottom: 24px;
  z-index: 80;
  max-width: min(620px, calc(100vw - 150px));
  padding: 6px 12px 6px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(1.08);
  box-shadow: 0 16px 30px -22px rgba(38, 56, 86, 0.75);
}

.cat-crumb__count {
  flex: none;
  margin-left: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(154, 215, 255, 0.24);
  color: #3c5a78;
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* 右上角：圆形云图入口 */
.cat-fab {
  position: fixed;
  right: 24px;
  top: 84px;
  z-index: 80;
  width: 58px;
  height: 58px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 246, 214, 0.98), rgba(206, 231, 255, 0.98));
  color: #2b3440;
  font-size: 21px;
  cursor: pointer;
  box-shadow: 0 14px 26px -16px rgba(38, 56, 86, 0.85);
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 260ms ease;
}

.cat-fab:hover {
  transform: translateY(-3px) rotate(-6deg);
  box-shadow: 0 20px 32px -16px rgba(38, 56, 86, 0.9);
}

.cat-fab:focus-visible {
  outline: 2px solid #55c8ff;
  outline-offset: 3px;
}

/* ===== 蒙版 + 云图筛选层（占满整屏的一级界面，出现时看不到卡片） ===== */
.cat-veil {
  position: fixed;
  inset: 0;
  z-index: 1700;
  background: radial-gradient(120% 100% at 50% 0%,
      rgba(250, 252, 255, 0.94),
      rgba(224, 236, 250, 0.97));
  backdrop-filter: blur(18px) saturate(1.06);
  opacity: 0;
  pointer-events: none;
  transition: opacity 380ms ease;
}

.cat-veil[data-open='true'] {
  opacity: 1;
}

/* 不是弹窗，是整整一屏：云海直接铺满视口 */
.cat-sheet {
  position: fixed;
  inset: 0;
  z-index: 1750;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(120% 82% at 50% -10%, rgba(255, 249, 226, 0.9), rgba(255, 255, 255, 0) 58%),
    linear-gradient(180deg, #fbfdff 0%, #eef5fd 52%, #e4eefb 100%);
  opacity: 0;
  visibility: hidden;
  transform: scale(1.02);
  transition:
    opacity 380ms ease,
    transform 560ms cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s linear 560ms;
}

.cat-sheet[data-open='true'] {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition:
    opacity 380ms ease,
    transform 560ms cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s;
}

/* 顶栏不再是整条横栏，而是浮在云海之上的一枚胶囊 */
.cat-sheet__head {
  position: absolute;
  inset: 0 0 auto;
  z-index: 3;
  padding: 16px clamp(16px, 3vw, 34px);
  /* 只有胶囊自己吃指针，其余位置留给云海（点空白收面板） */
  pointer-events: none;
}

.cat-sheet__bar {
  pointer-events: auto;
  position: relative;
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 10px 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(16px) saturate(1.08);
  box-shadow: 0 20px 38px -26px rgba(38, 56, 86, 0.85);
}

.cat-sheet__title {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #2b3440;
  font-weight: 900;
  font-size: 15px;
  letter-spacing: 0.6px;
  white-space: nowrap;
}

.cat-sheet__title::before {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffe9a8, #9ad7ff, #a7f3d0);
  box-shadow: 0 0 0 4px rgba(255, 214, 128, 0.22);
}

.cat-sheet__close {
  flex: none;
  /* 关闭固定在最右边 */
  margin-left: auto;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 12px;
  background: rgba(43, 52, 64, 0.06);
  color: #4e5d6f;
  font-size: 15px;
  cursor: pointer;
  transition:
    background 200ms ease,
    color 200ms ease,
    transform 200ms ease;
}

.cat-sheet__close:hover {
  background: rgba(255, 226, 184, 0.5);
  color: #2b3440;
  transform: rotate(90deg);
}

/* ===== 面包屑 ===== */
.cat-crumb {
  display: flex;
  align-items: center;
  flex: 1;
  flex-wrap: nowrap;
  gap: 4px;
  min-width: 0;
  min-height: 30px;
  overflow-x: auto;
  scrollbar-width: none;
}

.cat-crumb::-webkit-scrollbar {
  display: none;
}

.cat-crumb--sheet {
  flex: none;
  /* 限宽：中间那排类型筛选是绝对居中的，别被长路径压到 */
  max-width: min(38%, 360px);
}

.cat-crumb__item {
  flex: none;
  padding: 5px 11px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #5b6d81;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 220ms ease,
    color 220ms ease,
    transform 220ms ease;
}

button.cat-crumb__item:hover {
  background: rgba(154, 215, 255, 0.22);
  color: #2b3440;
  transform: translateY(-1px);
}

.cat-crumb__item.is-current {
  background: rgba(85, 200, 255, 0.16);
  color: #1e3146;
  cursor: default;
}

/* 这一层还没挑，先占个虚位提示该挑什么 */
.cat-crumb__item.is-ghost {
  border: 1px dashed rgba(91, 109, 129, 0.35);
  color: rgba(91, 109, 129, 0.75);
  cursor: default;
}

.cat-crumb__sep {
  flex: none;
  font-size: 9px;
  color: rgba(91, 109, 129, 0.5);
}

/* ===== 整屏云海：三层景深保留，云在整块屏幕上随机撒开 ===== */
.cat-stack {
  --sx: 0deg;
  --sy: 0deg;
  position: absolute;
  inset: 0;
  overflow: hidden;
  perspective: 1500px;
}

/* 舞台不再跟手旋转：整片云在指针底下漂移会让人“明明在云上却点不中” */
.cat-stack__stage {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.cat-layer {
  position: absolute;
  inset: 0;
  /* 整层不吃指针，只有当前层的云自己打开指针，点空白处能穿透到舞台 */
  pointer-events: none;
  transform-style: preserve-3d;
  transition:
    transform 640ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 420ms ease,
    filter 420ms ease;
}

.cat-layer[data-depth='0'] {
  opacity: 1;
  z-index: 30;
  transform: none;
}

.cat-layer[data-depth='1'] {
  opacity: 0;
  z-index: 40;
  transform: translateZ(190px) rotateX(-10deg) scale(1.04);
}

.cat-layer[data-depth='-1'] {
  opacity: 0.4;
  z-index: 20;
  filter: blur(3px) saturate(0.85);
  transform: translateZ(-220px) rotateX(8deg) scale(0.94);
}

.cat-layer[data-depth='-2'] {
  opacity: 0.16;
  z-index: 10;
  filter: blur(6px) saturate(0.7);
  transform: translateZ(-420px) rotateX(14deg) scale(0.9);
}

/* ===== 云朵 ===== */
.cat-cloud {
  /* 云的三团轮廓由一条 SVG 路径并集而来，用蒙版上色，接缝处不会有色差 */
  --cloud-mask: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='6%202%20128%2050'%20preserveAspectRatio='none'%3E%3Cpath%20fill='%23000'%20d='M6%2032A18%2018%200%201%201%2042%2032A18%2018%200%201%201%206%2032ZM28%2026A24%2024%200%201%201%2076%2026A24%2024%200%201%201%2028%2026ZM64%2030A20%2020%200%201%201%20104%2030A20%2020%200%201%201%2064%2030ZM102%2034A16%2016%200%201%201%20134%2034A16%2016%200%201%201%20102%2034ZM6%2040H134V52H6Z'/%3E%3C/svg%3E");
  --tone: 214, 232, 252;
  --sc: 1;
  /* 位置由脚本随机掷出来，「全部」会被钉在正中心 */
  position: absolute;
  left: var(--x, 50%);
  top: var(--y, 50%);
  display: inline-flex;
  justify-content: center;
  /*
   * 内边距比云形（puff 的 inset）大一圈：命中框是按钮自己的盒子，
   * 它不跟着 cloud-bob 晃，所以目标比看到的云稳、也略宽容一点。
   */
  padding: 18px 28px;
  border: none;
  background: none;
  color: #2b3440;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  /* 默认不吃指针：只有当前这一层的云是活的，点空白能穿过整层 */
  pointer-events: none;
  transform-origin: 50% 50%;
  transform: translate(-50%, -50%) scale(var(--sc));
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.cat-layer[data-depth='0'] .cat-cloud {
  pointer-events: auto;
}

/*
 * 后退的那两层也能点：点哪朵云就回到那一层（同一层里换一朵就是改选择）。
 * 顺带避免「点在自己看得见的云上，却因为穿透到舞台把面板关掉」。
 */
.cat-layer[data-depth='-1'] .cat-cloud,
.cat-layer[data-depth='-2'] .cat-cloud {
  pointer-events: auto;
}

.cat-cloud__float {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  filter: drop-shadow(0 16px 18px rgba(96, 128, 168, 0.22));
  animation: cloud-bob var(--bob, 7s) ease-in-out infinite;
  /* 负延迟：每朵云从不同相位起飘，避免整片云一起晃 */
  animation-delay: calc(min(var(--i, 0), 18) * -0.7s);
  transition: filter 320ms ease;
}

/* 位置小幅度晃动 */
@keyframes cloud-bob {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }

  25% {
    transform: translate3d(2px, -5px, 0) rotate(0.8deg);
  }

  50% {
    transform: translate3d(-2px, 1px, 0) rotate(-0.6deg);
  }

  75% {
    transform: translate3d(1px, -4px, 0) rotate(0.4deg);
  }

  100% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
}

.cat-cloud__puff {
  position: absolute;
  inset: -14px -22px;
  background: linear-gradient(180deg, #ffffff 6%, rgb(var(--tone)) 172%);
  -webkit-mask: var(--cloud-mask) center / 100% 100% no-repeat;
  mask: var(--cloud-mask) center / 100% 100% no-repeat;
  transition: background 320ms ease;
}

.cat-cloud__label,
.cat-cloud__count {
  position: relative;
  z-index: 1;
}

.cat-cloud__label {
  max-width: 11em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-cloud__count {
  flex: none;
  min-width: 22px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: #5b6d81;
  font-size: 11px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-align: center;
  box-shadow: inset 0 0 0 1px rgba(150, 176, 205, 0.18);
  transition:
    background 260ms ease,
    color 260ms ease;
}

.cat-cloud:nth-child(6n + 1) {
  --tone: 255, 226, 152;
}

.cat-cloud:nth-child(6n + 2) {
  --tone: 178, 216, 252;
}

.cat-cloud:nth-child(6n + 3) {
  --tone: 255, 198, 214;
}

.cat-cloud:nth-child(6n + 4) {
  --tone: 176, 232, 210;
}

.cat-cloud:nth-child(6n + 5) {
  --tone: 206, 196, 252;
}

.cat-cloud:nth-child(6n + 6) {
  --tone: 255, 214, 166;
}

/* 「全部」：正中心的一颗圆 */
.cat-cloud.is-all {
  --tone: 224, 233, 246;
  font-size: 17px;
}

.cat-cloud.is-all .cat-cloud__puff {
  inset: auto;
  left: 50%;
  top: 50%;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  /* clip-path 同时管命中：圆外的四个角点不到，不会抢旁边云的点击 */
  clip-path: circle(50% at 50% 50%);
  background: radial-gradient(circle at 36% 30%, #ffffff 6%, rgb(var(--tone)) 96%);
  -webkit-mask: none;
  mask: none;
  box-shadow:
    0 20px 32px -20px rgba(96, 128, 168, 0.55),
    inset 0 -12px 22px rgba(255, 255, 255, 0.75);
  transform: translate(-50%, -50%);
}

/* 逐个飘入：云随 activeLevel 重挂载，落位后动画释放、交还给 hover 过渡 */
.cat-layer[data-depth='0'] .cat-cloud {
  animation: cat-cloud-in 620ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(min(var(--i), 18) * 36ms);
}

@keyframes cat-cloud-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(calc(var(--sc) * 0.7));
  }
}

.cat-cloud:hover,
.cat-cloud:focus-visible {
  transform: translate(-50%, -50%) scale(calc(var(--sc) * 1.07)) translateY(-4px);
}

.cat-cloud:hover .cat-cloud__float {
  filter: drop-shadow(0 22px 24px rgba(96, 128, 168, 0.3));
}

.cat-cloud.is-active .cat-cloud__puff {
  background: linear-gradient(180deg, #ffffff 6%, rgb(var(--tone)) 104%);
}

.cat-cloud.is-active .cat-cloud__label {
  color: #1e3146;
}

.cat-cloud.is-active .cat-cloud__float {
  filter: drop-shadow(0 18px 20px rgba(96, 128, 168, 0.36));
}

.cat-cloud.is-active .cat-cloud__count {
  background: rgba(255, 255, 255, 0.95);
  color: #2b3440;
}

/* 焦点环走 drop-shadow，才能贴着云的轮廓而不是套一个方块 */
.cat-cloud:focus-visible {
  outline: none;
}

.cat-cloud:focus-visible .cat-cloud__float {
  filter: drop-shadow(0 0 2px rgba(85, 200, 255, 0.95)) drop-shadow(0 0 12px rgba(85, 200, 255, 0.72));
}

/* ===== 类型筛选 ===== */
.cat-type {
  /* 钉在顶栏正中间：绝对定位相对胶囊，和两侧内容多少无关 */
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border-radius: 16px;
  background: rgba(43, 52, 64, 0.06);
}

.cat-type__pill {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 8px - 8px) / 3);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 182, 201, 0.85), rgba(154, 215, 255, 0.85));
  box-shadow: 0 4px 12px rgba(44, 62, 80, 0.14);
  transform: translateX(calc(var(--idx) * (100% + 4px)));
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.cat-type__btn {
  position: relative;
  z-index: 1;
  padding: 9px 6px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #4e5d6f;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  transition: color 260ms ease;
}

.cat-type__btn.is-active {
  color: #1e3146;
}

.cat-type__btn:focus-visible {
  outline: 2px solid #55c8ff;
  outline-offset: 2px;
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
    transform:
      translate3d(calc(var(--d, 0) * var(--step-x) + var(--shift, 0) * var(--gap) * var(--slope)),
        calc(var(--d, 0) * var(--step-y) + var(--shift, 0) * var(--gap) - 26px),
        0) skewY(var(--tilt));
  }
}

/* 露在外面的标题栏：高度 = 斜切后「下一条横带」压不到的那一段 */
.cat-card__head {
  flex: none;
  height: var(--strip);
}

.cat-card__toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 0 22px;
  border: none;
  border-radius: 16px 16px 0 0;
  background: none;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.cat-card__toggle:focus-visible {
  outline: 2px solid #55c8ff;
  outline-offset: -3px;
}

.cat-card__no {
  flex: none;
  width: 22px;
  color: #a9b9cb;
  font-size: 11.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.cat-card__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #1e3146;
  font-size: clamp(13.5px, 1.15vw, 15.5px);
  font-weight: 800;
  line-height: 1.3;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: color 240ms ease;
}

.cat-card.is-open .cat-card__title {
  color: #0f6ea8;
}

/* 板面 */
.cat-card__slab {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: linear-gradient(158deg, #ffffff 0%, #f7fafd 58%, #e9f0f9 100%);
  /*
   * 阴影分三层：贴着纸边的接触影、中景的软影、远景的散影，
   * 整体往左下压一点（光从右上打过来），堆叠的层次才立得住。
   */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 0 0 0 1px rgba(255, 255, 255, 0.72),
    inset 0 -20px 28px -24px rgba(38, 56, 86, 0.3),
    -1px 2px 3px -1px rgba(38, 56, 86, 0.1),
    -6px 12px 20px -14px rgba(38, 56, 86, 0.34),
    -14px 30px 46px -26px rgba(38, 56, 86, 0.42);
  transition: box-shadow 320ms ease;
}

/* 实体厚度：背面往下（并略往左）错开 --depth，露出来的那道就是板厚 */
.cat-card__edge {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(158deg, #d2deed, #b6c7dc);
  /* 厚度自己的落脚影，别用大模糊，不然会和板面的影糊成一片 */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    -6px 14px 18px -14px rgba(38, 56, 86, 0.45);
  transform: translate3d(calc(var(--depth) * -0.5), var(--depth), 0);
}

/* 板子的书脊，顺着直线看过去就是一条彩色棱 */
.cat-card__spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, #ffd98f, #9ad7ff 52%, #a7f3d0);
}

/* 每张板换个色：沿这条直线看过去是一道彩色棱 */
.cat-card:nth-child(5n + 1) .cat-card__spine {
  background: linear-gradient(180deg, #ffd98f, #ffb27a);
}

.cat-card:nth-child(5n + 2) .cat-card__spine {
  background: linear-gradient(180deg, #9ad7ff, #7fc0f5);
}

.cat-card:nth-child(5n + 3) .cat-card__spine {
  background: linear-gradient(180deg, #a7f3d0, #7fd9b4);
}

.cat-card:nth-child(5n + 4) .cat-card__spine {
  background: linear-gradient(180deg, #ffb6c9, #ff9db8);
}

.cat-card:nth-child(5n + 5) .cat-card__spine {
  background: linear-gradient(180deg, #cdc2ff, #b0a2ff);
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

.cat-card:hover .cat-card__slab {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 0 0 0 1px rgba(255, 255, 255, 0.85),
    inset 0 -20px 28px -24px rgba(38, 56, 86, 0.24),
    -1px 2px 3px -1px rgba(38, 56, 86, 0.1),
    -8px 16px 26px -14px rgba(38, 56, 86, 0.38),
    -18px 38px 58px -28px rgba(38, 56, 86, 0.46);
}

/* 正中间那张：正文整个露出来，边缘亮起来，影子也压得更实 */
.cat-card.is-open .cat-card__slab {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.99),
    inset 0 -24px 32px -26px rgba(38, 56, 86, 0.22),
    0 0 0 2px rgba(85, 200, 255, 0.55),
    0 0 22px -6px rgba(85, 200, 255, 0.35),
    -2px 3px 4px -2px rgba(38, 56, 86, 0.12),
    -10px 20px 30px -16px rgba(38, 56, 86, 0.4),
    -22px 46px 68px -30px rgba(38, 56, 86, 0.5);
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
  color: #5b6d81;
  font-size: 13.5px;
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
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 210, 166, 0.42);
  color: #8a5a1f;
  font-size: 11px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 0.4px;
}

.cat-card__date {
  color: #93a4b8;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.cat-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cat-card__tag {
  padding: 3px 12px 3px 10px;
  border: none;
  border-radius: 999px 0 0 999px;
  background: rgba(255, 182, 201, 0.32);
  color: #4e5d6f;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 220ms ease,
    color 220ms ease;
}

.cat-card__tag:nth-child(2) {
  background: rgba(167, 243, 208, 0.42);
}

.cat-card__tag:nth-child(3) {
  background: rgba(255, 210, 166, 0.42);
}

.cat-card__tag:hover {
  background: rgba(85, 200, 255, 0.4);
  color: #1e3146;
}

/* 进博客只能走这个按钮：点卡片本身不跳转，只展开 */
.cat-card__read {
  flex: none;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffeec4, #bfe3ff);
  color: #24405c;
  font-size: 12.5px;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 10px 18px -12px rgba(38, 56, 86, 0.8);
  transition:
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 240ms ease;
}

.cat-card__read:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 22px -12px rgba(38, 56, 86, 0.85);
}

.cat-card__read i {
  font-size: 11px;
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
@media (max-width: 948px) {
  .categories-section {
    padding: 68px 16px 96px;
  }

  /* 左下路径：窄屏下贴着站点浮动按钮右边，能滚就滚 */
  .cat-crumb--float {
    left: 88px;
    bottom: 20px;
    max-width: calc(100vw - 108px);
  }

  .cat-fab {
    right: 16px;
    top: 78px;
    width: 50px;
    height: 50px;
    font-size: 18px;
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

  .cat-cloud {
    padding: 22px 32px 20px;
    font-size: 14px;
  }

  .cat-cloud.is-all .cat-cloud__puff {
    width: 104px;
    height: 104px;
  }
}

/* 再窄就把顶栏折起来：标题 + 关闭一行，类型筛选与路径各占一行 */
@media (max-width: 720px) {
  .cat-sheet__head {
    padding: 10px 12px;
  }

  .cat-sheet__bar {
    flex-wrap: wrap;
    gap: 8px 10px;
    padding: 8px 10px;
    border-radius: 22px;
  }

  .cat-sheet__title {
    order: 1;
  }

  .cat-sheet__close {
    order: 2;
    margin-left: auto;
  }

  .cat-type {
    order: 3;
    position: static;
    transform: none;
    flex: 1 0 100%;
    margin-left: 0;
  }

  .cat-crumb--sheet {
    order: 4;
    flex: 1 0 100%;
    max-width: none;
    margin: 0;
  }
}

@media (max-width: 420px) {
  .cat-cloud__count {
    display: none;
  }
}

/* ===== 降低动态效果 ===== */
@media (prefers-reduced-motion: reduce) {

  .cat-card,
  .cat-cloud,
  .cat-cloud__float,
  .cat-layer,
  .cat-stack__stage,
  .cat-sheet,
  .cat-veil,
  .cat-type__pill {
    animation: none !important;
    transition-duration: 1ms !important;
  }

  .cat-cloud:hover,
  .cat-cloud:focus-visible {
    transform: translate(-50%, -50%) scale(var(--sc));
  }

  .cat-sheet__close:hover {
    transform: none;
  }

  .cat-card__read:hover,
  .cat-card__read:hover i {
    transform: none;
  }
}
</style>

<style>
/* 云图打开时锁住页面滚动（与站内 body.search-modal-open 等惯例一致） */
body.cat-sheet-lock {
  overflow: hidden;
}
</style>
