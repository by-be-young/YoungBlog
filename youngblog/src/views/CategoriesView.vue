<template>
  <main class="categories-page">
    <section class="categories-section">
      <div class="categories-layout">
        <!-- 侧边栏：分类筛选 -->
        <aside class="categories-sidebar" aria-label="分类筛选">
          <div class="categories-container" id="categoriesContainer">
            <!-- 标题（仅宽屏） -->
            <div class="categories-panel-title">{{ t('categories_filter_title') }}</div>

            <!-- 三级滚轮 -->
            <div class="categories-wheel-row">
              <div
                v-for="level in MAX_LEVELS"
                :key="level - 1"
                class="categories-wheel-wrap"
              >
                <div class="categories-wheel-label">
                  {{ wheelLabels[level - 1] }}
                </div>
                <div
                  class="categories-wheel"
                  :data-level="level - 1"
                  :style="wheelStyle"
                  role="listbox"
                  tabindex="0"
                  :aria-label="`${wheelLabels[level - 1]}筛选`"
                  @scroll="handleWheelScroll(level - 1, $event)"
                  @click="handleWheelItemClick(level - 1, $event)"
                  @keydown="handleWheelKeydown(level - 1, $event)"
                >
                  <div
                    v-for="(tag, idx) in getTagsForLevel(level - 1)"
                    :key="idx"
                    class="wheel-item"
                    :class="{
                      'is-selected': isTagSelected(level - 1, tag),
                      'is-center': isTagCenter(level - 1, idx)
                    }"
                    :data-index="idx"
                  >
                    {{ tag === null ? t('filter_all') || '全部' : tag }}
                  </div>
                </div>
              </div>
              <!-- 选中框 -->
              <div class="wheel-selected-frame" aria-hidden="true"></div>
            </div>
          </div>

          <!-- 类型筛选 -->
          <div class="archive-filter-panel" aria-label="博客类型筛选">
            <div class="archive-filter-toggle" role="radiogroup" aria-label="博客类型筛选">
              <button
                v-for="filter in filterOptions"
                :key="filter.key"
                class="archive-filter-btn"
                :class="{ active: currentFilter === filter.key }"
                :data-filter="filter.key"
                role="radio"
                :aria-checked="currentFilter === filter.key ? 'true' : 'false'"
                @click="setFilter(filter.key)"
              >
                {{ t(filter.labelKey) }}
              </button>
            </div>
          </div>
        </aside>

        <!-- 博客列表 -->
        <div class="blog-list" id="blogList" ref="blogListRef">
          <div v-if="filteredBlogs.length === 0" class="empty-text">
            {{ t('categories_no_blogs') }}
          </div>
          <div
            v-for="(blog, index) in filteredBlogs"
            :key="blog.id"
            class="blog-item"
            :class="{ 'blog-item-enter': shouldAnimate }"
            :style="{ '--enter-delay': shouldAnimate ? `${index * BLOG_ITEM_STAGGER_MS}ms` : '0ms' }"
          >
            <router-link class="blog-link" :to="`/blog/${blog.id}`">
              <div class="blog-left">
                <div class="blog-title">
                  <span class="title-text">{{ blog.title }}</span>
                  <span v-if="blog.type" class="blog-type">{{ blog.type }}</span>
                </div>
                <div class="blog-excerpt">{{ blog.excerpt || '' }}</div>
              </div>
              <div class="blog-right">
                <div class="blog-tags">
                  <span
                    v-for="(tag, idx) in (blog.tags || [])"
                    :key="idx"
                    class="blog-tag"
                    :data-level="idx"
                    :data-path="encodeURIComponent(JSON.stringify(blog.tags || []))"
                    @click.stop="handleTagClick(blog.tags || [], idx)"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- 移动端 FAB -->
    <button
      id="categoriesFab"
      class="categories-filter-fab"
      aria-label="打开筛选"
      :aria-hidden="isModalOpen ? 'true' : 'false'"
      @click="openModal"
    >
      <i class="fas fa-sliders" aria-hidden="true"></i>
    </button>

    <!-- 移动端弹窗 -->
    <div
      id="categoriesModal"
      class="categories-filter-modal"
      :class="{
        'open': isModalOpen && !isModalClosing,
        'closing': isModalClosing,
        'open-prep': isModalPrepping
      }"
      :aria-hidden="!isModalOpen"
      @click="handleBackdropClick"
    >
      <div class="categories-filter-modal-backdrop" data-role="backdrop"></div>
      <div class="categories-filter-modal-inner" role="dialog" aria-modal="true">
        <div class="categories-filter-modal-body" ref="modalBodyRef">
          <!-- 内容由复制逻辑填充 -->
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'

const { t } = useI18nStore()
const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()

// ==================== 配置常量 ====================
const MAX_LEVELS = 3
const DESKTOP_ENTRANCE_BREAKPOINT = 948
const BLOG_ITEM_STAGGER_MS = 72
const MODAL_ANIMATION_MS = 320
const WHEEL_SCROLL_FACTOR = 0.55
const WHEEL_SNAP_DELAY_MS = 140
const WHEEL_PROGRAMMATIC_LOCK_MS = 220

// ==================== 响应式状态 ====================
const currentFilter = ref('all')
const selectedTags = ref([])
const isModalOpen = ref(false)
const isModalClosing = ref(false)
const isModalPrepping = ref(false)
const wheelTimers = ref(new Map())
const programmaticUntil = ref(new Map())
const wheelItemCenters = ref(new Map())
const blogListRef = ref(null)
const modalBodyRef = ref(null)
const isDesktop = ref(window.innerWidth > DESKTOP_ENTRANCE_BREAKPOINT)
const resizeTimer = ref(null)

// ==================== 配置 ====================
const filterOptions = [
  { key: 'learning', labelKey: 'archive_filter_learning' },
  { key: 'all', labelKey: 'archive_filter_all' },
  { key: 'non-learning', labelKey: 'archive_filter_non_learning' }
]

const wheelLabels = [
  t('label_domain') || '领域',
  t('label_subject') || '科目',
  t('label_topic') || '主题'
]

const wheelStyle = computed(() => ({
  height: isDesktop.value ? '380px' : '220px',
  '--wheel-overlay-height': isDesktop.value ? '78px' : '42px'
}))

const shouldAnimate = computed(() => {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return isDesktop.value && !reducedMotion
})

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

const throttle = (fn, wait) => {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= wait) {
      last = now
      fn.apply(this, args)
    }
  }
}

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

// ==================== 标签树构建 ====================
const getBaseBlogs = () => {
  const blogs = blogStore.blogs || []
  if (currentFilter.value === 'learning') {
    return blogs.filter(b => isLearningBlog(b))
  }
  if (currentFilter.value === 'non-learning') {
    return blogs.filter(b => !isLearningBlog(b))
  }
  return blogs
}

const tagTree = computed(() => {
  const tree = {}
  const blogs = getBaseBlogs()

  blogs.forEach(blog => {
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

const isTagSelected = (level, tag) => {
  return selectedTags.value[level] === tag
}

const isTagCenter = (level, index) => {
  // 由滚轮滚动时动态设置
  return false
}

// ==================== 滚轮交互 ====================
const getWheelCenterY = (wheelEl) => {
  return wheelEl.scrollTop + wheelEl.clientHeight / 2
}

const findClosestWheelIndex = (wheelEl) => {
  const items = Array.from(wheelEl.querySelectorAll('.wheel-item'))
  if (!items.length) return -1

  const centerY = getWheelCenterY(wheelEl)
  let bestIdx = 0
  let bestDist = Infinity

  items.forEach((it, i) => {
    const itemCenter = it.offsetTop + it.offsetHeight / 2
    const dist = Math.abs(itemCenter - centerY)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  })

  return bestIdx
}

const applyWheelVisuals = (wheelEl) => {
  const items = Array.from(wheelEl.querySelectorAll('.wheel-item'))
  if (!items.length) return

  const centerY = getWheelCenterY(wheelEl)
  const itemH = items[0]?.offsetHeight || 54

  items.forEach((it) => {
    const itemCenter = it.offsetTop + it.offsetHeight / 2
    const d = itemCenter - centerY
    const steps = d / itemH
    const abs = Math.abs(steps)

    const opacity = clamp(1 - abs * 0.28, 0, 1)
    const scale = clamp(1 - abs * 0.08, 0.78, 1)
    const rotateX = clamp(steps * 10, -50, 50)
    const blur = clamp(abs * 0.6, 0, 2.2)

    it.style.opacity = String(opacity)
    it.style.transform = `rotateX(${rotateX}deg) translateZ(${(1 - abs) * 10}px) scale(${scale})`
    it.style.filter = `blur(${blur}px)`
  })

  const idx = findClosestWheelIndex(wheelEl)
  items.forEach((it, i) => {
    it.classList.toggle('is-center', i === idx)
  })

  // 更新选中框
  updateSelectedFrame(wheelEl, itemH)
}

const updateSelectedFrame = (wheelEl, itemH) => {
  try {
    const wheelRow = wheelEl.closest('.categories-wheel-row')
    if (!wheelRow) return

    let frame = wheelRow.querySelector('.wheel-selected-frame')
    if (!frame) {
      frame = document.createElement('div')
      frame.className = 'wheel-selected-frame'
      frame.setAttribute('aria-hidden', 'true')
      wheelRow.appendChild(frame)
    }

    const isInitial = frame.dataset.initial === 'true'
    if (isInitial) frame.style.transition = 'none'

    const getOffsetTopWithin = (node, ancestor) => {
      let top = 0
      let el = node
      while (el && el !== ancestor) {
        top += el.offsetTop || 0
        el = el.offsetParent
      }
      return top
    }

    const centerYInRow = getOffsetTopWithin(wheelEl, wheelRow) + wheelEl.clientHeight / 2
    const extraHeight = 8
    const frameH = Math.round((itemH || 54) + extraHeight)
    const topPx = Math.round(centerYInRow - frameH / 2)

    frame.style.height = `${frameH}px`
    frame.style.top = `${topPx}px`

    if (isInitial) {
      delete frame.dataset.initial
      requestAnimationFrame(() => {
        frame.style.transition = ''
      })
    }
  } catch (e) {
    // ignore
  }
}

const scrollItemIntoCenter = (wheelEl, index, behavior = 'smooth') => {
  const items = Array.from(wheelEl.querySelectorAll('.wheel-item'))
  if (!items.length) return

  const idx = clamp(index, 0, items.length - 1)
  const it = items[idx]
  const target = it.offsetTop + it.offsetHeight / 2 - wheelEl.clientHeight / 2

  programmaticUntil.value.set(wheelEl, Date.now() + WHEEL_PROGRAMMATIC_LOCK_MS)
  wheelEl.scrollTo({ top: Math.max(0, target), behavior })
}

const scheduleSnap = (wheelEl, level) => {
  const prev = wheelTimers.value.get(wheelEl)
  if (prev) clearTimeout(prev)

  wheelTimers.value.set(
    wheelEl,
    setTimeout(() => {
      const idx = findClosestWheelIndex(wheelEl)
      scrollItemIntoCenter(wheelEl, idx, 'smooth')

      const tags = getTagsForLevel(level)
      const tag = tags[idx] ?? null
      selectTag(level, tag)
    }, WHEEL_SNAP_DELAY_MS)
  )
}

const handleWheelScroll = (level, event) => {
  const wheelEl = event.target
  const until = programmaticUntil.value.get(wheelEl) || 0
  applyWheelVisuals(wheelEl)

  if (Date.now() < until) return
  scheduleSnap(wheelEl, level)
}

const handleWheelItemClick = (level, event) => {
  const target = event.target.closest('.wheel-item')
  if (!target) return

  const idx = Number(target.dataset.index)
  if (Number.isNaN(idx)) return

  const wheelEl = event.currentTarget
  scrollItemIntoCenter(wheelEl, idx, 'smooth')

  const tags = getTagsForLevel(level)
  const tag = tags[idx] ?? null
  selectTag(level, tag)

  try {
    wheelEl.focus({ preventScroll: true })
  } catch (e) {
    wheelEl.focus()
  }
}

const handleWheelKeydown = (level, event) => {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  event.preventDefault()

  const wheelEl = event.currentTarget
  const idx = findClosestWheelIndex(wheelEl)
  const next = idx + (event.key === 'ArrowDown' ? 1 : -1)
  const tags = getTagsForLevel(level)

  scrollItemIntoCenter(wheelEl, next, 'smooth')
  const newIdx = clamp(next, 0, tags.length - 1)
  const tag = tags[newIdx] ?? null
  selectTag(level, tag)
}

// ==================== 标签选择 ====================
const selectTag = (level, tag) => {
  const current = selectedTags.value[level]
  if (current === tag) return

  const newTags = selectedTags.value.slice(0, level)
  if (tag !== null) {
    newTags[level] = tag
  }
  selectedTags.value = newTags

  // 更新 URL
  updateUrl()
}

// ==================== 类型筛选 ====================
const setFilter = (key) => {
  if (currentFilter.value === key) return
  currentFilter.value = key
  selectedTags.value = []

  // 更新背景高亮
  updateFilterBackground()
}

const updateFilterBackground = () => {
  nextTick(() => {
    const container = document.querySelector('.archive-filter-toggle')
    const activeBtn = container?.querySelector('.archive-filter-btn.active')
    if (!container || !activeBtn) return

    const top = activeBtn.offsetTop
    const height = activeBtn.offsetHeight
    container.style.setProperty('--filter-bg-top', `${top}px`)
    container.style.setProperty('--filter-bg-height', `${height}px`)
  })
}

// ==================== 标签点击跳转 ====================
const handleTagClick = (tags, level) => {
  const path = tags.slice(0, level + 1)
  selectedTags.value = path
  updateUrl()
}

// ==================== URL 同步 ====================
const updateUrl = () => {
  const query = { ...route.query }
  if (selectedTags.value.length > 0 && selectedTags.value.some(t => t !== null)) {
    query.tags = JSON.stringify(selectedTags.value)
  } else {
    delete query.tags
  }
  router.replace({ query })
}

// ==================== 筛选博客 ====================
const filteredBlogs = computed(() => {
  let blogs = getBaseBlogs()

  // 标签筛选
  for (let i = 0; i < selectedTags.value.length; i++) {
    const tag = selectedTags.value[i]
    if (tag) {
      blogs = blogs.filter(b => b.tags && b.tags[i] === tag)
    }
  }

  return blogs
})

// ==================== 移动端弹窗 ====================
const openModal = () => {
  if (isModalOpen.value || isModalClosing.value) return

  // 重置为"全部博客"
  setFilter('all')

  isModalPrepping.value = true
  isModalOpen.value = true
  document.body.style.overflow = 'hidden'

  // 复制内容到弹窗
  nextTick(() => {
    const sidebar = document.querySelector('.categories-sidebar')
    const container = document.getElementById('categoriesContainer')
    const filterPanel = document.querySelector('.archive-filter-panel')

    if (modalBodyRef.value) {
      modalBodyRef.value.innerHTML = ''
      if (container) modalBodyRef.value.appendChild(container)
      if (filterPanel) modalBodyRef.value.appendChild(filterPanel)
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isModalPrepping.value = false
        isModalClosing.value = false
        // 重新计算滚轮位置
        recalculateWheels()
      })
    })
  })
}

const closeModal = (immediate = false) => {
  if (!isModalOpen.value && !isModalClosing.value) return

  isModalOpen.value = false

  if (immediate) {
    isModalClosing.value = false
    document.body.style.overflow = ''
    restoreSidebarContent()
    return
  }

  isModalClosing.value = true
  setTimeout(() => {
    isModalClosing.value = false
    document.body.style.overflow = ''
    restoreSidebarContent()
  }, MODAL_ANIMATION_MS)
}

const restoreSidebarContent = () => {
  const sidebar = document.querySelector('.categories-sidebar')
  const container = document.getElementById('categoriesContainer')
  const filterPanel = document.querySelector('.archive-filter-panel')

  if (sidebar) {
    if (container) sidebar.prepend(container)
    if (filterPanel) sidebar.appendChild(filterPanel)
  }
}

const handleBackdropClick = (event) => {
  if (event.target?.matches('[data-role="backdrop"]')) {
    closeModal()
  }
}

const recalculateWheels = () => {
  const wheels = document.querySelectorAll('.categories-wheel')
  wheels.forEach((wheel) => {
    adjustWheelPadding(wheel)
    const items = Array.from(wheel.querySelectorAll('.wheel-item'))
    if (!items.length) return

    let selectedIndex = items.findIndex(it => it.classList.contains('is-selected'))
    if (selectedIndex < 0) selectedIndex = findClosestWheelIndex(wheel)
    if (selectedIndex < 0) return

    scrollItemIntoCenter(wheel, selectedIndex, 'auto')
    applyWheelVisuals(wheel)
  })
}

const adjustWheelPadding = (wheelEl) => {
  const first = wheelEl.querySelector('.wheel-item')
  if (!first) return

  const itemH = first.getBoundingClientRect().height || 54
  const wheelH = wheelEl.getBoundingClientRect().height

  let overlayH = isDesktop.value ? 78 : 42
  try {
    const cs = window.getComputedStyle(wheelEl)
    const val = cs.getPropertyValue('--wheel-overlay-height')
    if (val) {
      const px = parseInt(val.trim(), 10)
      if (!Number.isNaN(px)) overlayH = px
    }
  } catch (e) { /* ignore */ }

  const basePad = Math.round(wheelH / 2 - itemH / 2)
  const pad = Math.max(0, Math.max(basePad, overlayH))
  wheelEl.style.paddingTop = `${pad}px`
  wheelEl.style.paddingBottom = `${pad}px`
}

// ==================== 响应式 ====================
const handleResize = throttle(() => {
  const desktop = window.innerWidth > DESKTOP_ENTRANCE_BREAKPOINT
  if (desktop !== isDesktop.value) {
    isDesktop.value = desktop
    if (desktop && isModalOpen.value) {
      closeModal(true)
    }
    // 重新渲染滚轮
    nextTick(() => {
      recalculateWheels()
      updateFilterBackground()
      updateSidebarSticky()
    })
  }
}, 150)

const updateSidebarSticky = () => {
  const sidebar = document.querySelector('.categories-sidebar')
  if (!sidebar) return

  if (!isDesktop.value) {
    sidebar.classList.remove('no-sticky')
    return
  }

  const topOffset = 60 + 12
  const avail = window.innerHeight - topOffset - 24
  const sidebarH = sidebar.getBoundingClientRect().height

  sidebar.classList.toggle('no-sticky', sidebarH > avail)
}

// ==================== 标签可见性自适应 ====================
const adjustTagsVisibility = () => {
  const items = document.querySelectorAll('.blog-item')
  if (!items.length) return

  const defaultThreshold = 520
  let tagW = 90
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--cat-tag-width')
    if (v) {
      const n = parseInt(v, 10)
      if (!Number.isNaN(n) && n > 0) tagW = n
    }
  } catch (e) { /* ignore */ }

  const threshold = Math.max(defaultThreshold, tagW * 3 + 160)

  items.forEach((it) => {
    const right = it.querySelector('.blog-right')
    if (!right) return
    const w = it.getBoundingClientRect().width
    it.classList.toggle('tags-hidden', w <= threshold)
  })
}

// ==================== 初始化 ====================
const initFromUrl = () => {
  const tagsParam = route.query.tags
  if (tagsParam) {
    try {
      const tags = JSON.parse(decodeURIComponent(tagsParam))
      if (Array.isArray(tags)) {
        selectedTags.value = tags
      }
    } catch (e) { /* ignore */ }
  }
}

onMounted(() => {
  if (!blogStore.blogs || blogStore.blogs.length === 0) {
    blogStore.fetchBlogs()
  }

  initFromUrl()

  // 初始化滚轮
  nextTick(() => {
    // 需要等 DOM 渲染完成
    setTimeout(() => {
      const wheels = document.querySelectorAll('.categories-wheel')
      wheels.forEach((wheel) => {
        adjustWheelPadding(wheel)
        applyWheelVisuals(wheel)
      })
      updateFilterBackground()
      updateSidebarSticky()
      adjustTagsVisibility()
    }, 100)
  })

  // ResizeObserver 监听卡片尺寸变化
  const ro = new ResizeObserver(() => {
    adjustTagsVisibility()
  })

  const observer = new MutationObserver(() => {
    const items = document.querySelectorAll('.blog-item')
    items.forEach(it => {
      try { ro.observe(it) } catch (e) { /* ignore */ }
    })
  })

  observer.observe(document.body, { childList: true, subtree: true })

  window.addEventListener('resize', handleResize)

  // 清理
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    ro.disconnect()
    observer.disconnect()
    // 清理定时器
    wheelTimers.value.forEach(timer => clearTimeout(timer))
    wheelTimers.value.clear()
  })
})

// 监听 filteredBlogs 变化，调整标签可见性
watch(filteredBlogs, () => {
  nextTick(() => {
    adjustTagsVisibility()
  })
}, { deep: true })

// 监听语言变化
watch(() => t('label_domain'), () => {
  // 语言变化时更新标签
}, { immediate: false })
</script>

<style scoped>
/* ==================== 分类页面多级分类样式 ==================== */
.categories-section {
  padding-top: 80px;
  padding-bottom: 40px;
  padding-left: 20px;
  padding-right: 20px;
  position: relative;
  min-height: calc(100vh - 60px);
}

.categories-layout {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  gap: 28px;
  align-items: stretch;
  min-height: 500px;
}

@media (max-width: 948px) {
  .categories-layout {
    flex-direction: column;
    align-items: stretch;
    gap: 18px;
    min-height: auto;
  }

  .categories-sidebar {
    flex: none !important;
    width: 100% !important;
    max-height: none !important;
    overflow-y: visible !important;
    position: static !important;
    top: auto !important;
    z-index: 1 !important;
    align-self: stretch !important;
  }

  .categories-panel-title {
    display: none;
  }

  .categories-wheel {
    height: 220px;
    --wheel-overlay-height: 42px;
    padding-left: 4px;
    padding-right: 4px;
  }

  .wheel-item {
    height: 56px;
    padding: 0 6px;
  }

  .categories-container {
    padding: 12px 12px;
  }

  .blog-item {
    --blog-card-height: 140px;
    height: var(--blog-card-height);
  }

  .blog-item .blog-right {
    flex: 0 0 120px;
    padding-right: 12px;
    justify-content: flex-end;
  }

  .blog-item .blog-left {
    padding-left: 10px;
  }

  .blog-list {
    max-height: none !important;
    overflow-y: visible !important;
  }
}

.categories-sidebar {
  flex: 0 0 460px;
  position: sticky;
  top: calc(10px);
  z-index: 20;
  align-self: start;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

.categories-sidebar.no-sticky {
  position: static !important;
  top: auto !important;
  z-index: 1 !important;
}

.categories-container {
  width: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(14px);
  border-radius: 20px;
  box-shadow: 0 16px 34px rgba(44, 62, 80, 0.14);
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 26px 22px;
  border-left: none;
  border-right: none;
  border: 4px solid transparent;
  background:
    linear-gradient(rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.78)) padding-box,
    linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.92), rgba(167, 243, 208, 0.92)) border-box;
  box-shadow: 0 16px 34px rgba(44, 62, 80, 0.14);
}

.categories-panel-title {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.04);
  color: #2b3440;
  font-weight: 900;
  letter-spacing: 0.6px;
}

.categories-panel-title::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.92), rgba(167, 243, 208, 0.92));
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
}

/* ===== 三级滚轮 ===== */
.categories-wheel-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 18px;
  border-radius: 16px;
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.82)),
    linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.90), rgba(167, 243, 208, 0.92));
  background-clip: padding-box, border-box;
  box-shadow: 0 16px 34px rgba(44, 62, 80, 0.14);
  border-radius: 18px;
}

.categories-wheel-wrap {
  position: relative;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.04);
  padding: 0px 0px 0px 0px;
  box-sizing: border-box;
  width: calc(100% - 12px);
  margin: 0 6px;
  perspective: 900px;
}

.categories-wheel-label {
  font-weight: 900;
  color: #2b3440;
  margin-bottom: 10px;
  letter-spacing: 0.4px;
  text-align: center;
}

.categories-wheel {
  position: relative;
  height: 380px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  outline: none;
  transform-style: preserve-3d;
  padding-left: 6px;
  padding-right: 6px;
  --wheel-overlay-height: 78px;
}

.categories-wheel::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.categories-wheel::before,
.categories-wheel::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: var(--wheel-overlay-height, 78px);
  pointer-events: none;
  z-index: 2;
}

.categories-wheel::before {
  top: 0;
  background: linear-gradient(to bottom,
      rgba(255, 255, 255, 0.90) 0%,
      rgba(255, 255, 255, 0.0) 100%);
}

.categories-wheel::after {
  bottom: 0;
  background: linear-gradient(to top,
      rgba(255, 255, 255, 0.90) 0%,
      rgba(255, 255, 255, 0.0) 100%);
}

.wheel-item {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  margin: 0 auto;
  padding: 0 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(0, 0, 0, 0.05);
  color: #2b3440;
  font-weight: 900;
  user-select: none;
  transform-origin: center center;
  backface-visibility: hidden;
  transition: transform 120ms ease, opacity 120ms ease, filter 120ms ease;
  cursor: pointer;
}

.wheel-item.is-center {
  background: linear-gradient(135deg, rgba(255, 182, 201, 0.90), rgba(154, 215, 255, 0.82), rgba(167, 243, 208, 0.84));
  color: #fff;
  border-color: rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 5;
}

.wheel-item.is-selected {
  background: linear-gradient(135deg, rgba(255, 182, 201, 0.90), rgba(154, 215, 255, 0.82), rgba(167, 243, 208, 0.84));
  color: #fff;
}

.wheel-selected-frame {
  position: absolute;
  left: 10px;
  right: 10px;
  height: 54px;
  border-radius: 14px;
  pointer-events: none;
  z-index: 3;
  background: transparent;
  border: 4px solid transparent;
  -webkit-border-image: linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.90), rgba(167, 243, 208, 0.92)) 1;
  border-image: linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.90), rgba(167, 243, 208, 0.92)) 1;
  box-shadow: 0 8px 18px rgba(44, 62, 80, 0.06);
  transition: top 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
  opacity: 0.98;
}

/* ===== 类型筛选 ===== */
.archive-filter-panel {
  margin-top: 12px;
  width: 100%;
}

.archive-filter-toggle {
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

.archive-filter-toggle::before {
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

.archive-filter-toggle::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.archive-filter-btn {
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
  font-family: inherit;
}

.archive-filter-btn:hover {
  color: rgba(55, 65, 81, 0.9);
  transform: scale(1.02);
}

.archive-filter-btn:active {
  transform: scale(0.98);
}

.archive-filter-btn.active {
  color: #0a3d2e;
  font-weight: 700;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.archive-filter-btn.active::before {
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
  0%, 100% {
    opacity: 0.4;
    transform: translateY(-50%) scale(1);
  }
  50% {
    opacity: 0.8;
    transform: translateY(-50%) scale(1.2);
  }
}

/* ===== 博客列表 ===== */
.blog-list {
  flex: 1;
  min-width: 0;
  height: auto;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 18px;
  box-sizing: border-box;
  overscroll-behavior: contain;
}

.blog-item {
  position: relative;
  background:
    linear-gradient(rgba(255, 255, 255, 0.76), rgba(255, 255, 255, 0.76)) padding-box,
    linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.92), rgba(167, 243, 208, 0.92)) border-box;
  border: 3px solid transparent;
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 18px;
  box-shadow: 0 10px 22px rgba(44, 62, 80, 0.10);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  --blog-card-height: 160px;
  height: var(--blog-card-height);
  display: flex;
  align-items: stretch;
  overflow: hidden;
  cursor: pointer;
}

.blog-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(44, 62, 80, 0.16);
}

.blog-item.blog-item-enter {
  opacity: 0;
  transform: translateY(-14px);
  animation: categories-blog-enter 460ms ease forwards;
  animation-delay: var(--enter-delay, 0ms);
}

@keyframes categories-blog-enter {
  from {
    opacity: 0;
    transform: translateY(-14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.blog-link {
  display: flex;
  gap: 18px;
  align-items: stretch;
  width: 100%;
  color: inherit;
  text-decoration: none;
}

.blog-left {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 18px;
}

.blog-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: #ff5f8a;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blog-excerpt {
  color: rgba(13, 110, 87, 0.86);
}

.blog-right {
  flex: 0 0 314px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  position: relative;
  margin-top: 8px;
}

.blog-tags {
  position: absolute;
  top: -26px;
  right: 18px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: flex-end;
  pointer-events: none;
  white-space: nowrap;
  flex-wrap: nowrap;
}

.blog-tag {
  pointer-events: auto;
  width: 90px;
  flex: 0 0 90px;
  max-width: 90px;
  height: 100px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.90rem;
  color: #2b3440;
  background: linear-gradient(135deg, rgba(255, 182, 201, 0.28), rgba(154, 215, 255, 0.28));
  border: 1px solid rgba(255, 182, 201, 0.32);
  box-shadow: 0 6px 12px rgba(167, 243, 208, 0.06);
  border-radius: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 8px 10px;
  -webkit-clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%);
  clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%);
  cursor: pointer;
}

.blog-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
}

.blog-item.tags-hidden .blog-right {
  display: none !important;
}

.blog-item.tags-hidden .blog-left {
  flex: 1 1 100% !important;
}

.empty-text {
  color: #aaa;
  text-align: center;
  padding: 40px 0;
}

/* ===== 移动端 FAB ===== */
.categories-filter-fab {
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #55c8ff, #a7f3d0);
  color: #fff;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24);
  z-index: 1600;
  border: none;
  cursor: pointer;
}

.categories-filter-fab i {
  font-size: 20px;
}

/* ===== 移动端弹窗 ===== */
.categories-filter-modal {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1650;
  pointer-events: none;
}

.categories-filter-modal.open,
.categories-filter-modal.open-prep,
.categories-filter-modal.closing {
  display: flex;
  pointer-events: auto;
}

.categories-filter-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
  opacity: 0;
  transition: opacity 240ms ease;
}

.categories-filter-modal.open .categories-filter-modal-backdrop {
  opacity: 1;
}

.categories-filter-modal.closing .categories-filter-modal-backdrop {
  opacity: 0;
}

.categories-filter-modal-inner {
  position: relative;
  width: min(92%, 520px);
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

.categories-filter-modal.open .categories-filter-modal-inner {
  transform: translate3d(0, 0, 0) scale(1);
  opacity: 1;
}

.categories-filter-modal.closing .categories-filter-modal-inner {
  transform: translate3d(72px, 72px, 0) scale(0.72);
  opacity: 0;
}

.categories-filter-modal-body {
  width: min(92vw, 520px);
  padding: 6px;
}

/* ===== 响应式 ===== */
@media (max-width: 948px) {
  .categories-sidebar {
    display: none !important;
  }

  .categories-filter-fab {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 600px) {
  .blog-tags {
    position: static;
    top: auto;
    left: auto;
    right: auto;
    display: flex;
    gap: 8px;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .blog-tag {
    height: 64px;
    padding: 6px 12px;
    font-size: 0.82rem;
    flex: 0 0 auto;
    min-width: 80px;
  }

  .blog-right {
    flex: 0 0 auto !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blog-item.blog-item-enter {
    opacity: 1;
    transform: none;
    animation: none;
  }

  .categories-wheel {
    scroll-behavior: auto;
  }
}
</style>