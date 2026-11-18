<template>
  <main class="quick-links-page">
    <section class="quick-links-section">
      <header class="quick-links-head">
        <div class="quick-links-head-copy">
          <span class="quick-links-eyebrow">LINK ATLAS · 04</span>
          <h1 class="quick-links-title">{{ i18n.t('quick_title') }}</h1>
          <p class="quick-links-meta">
            <b>{{ categories.length }}</b> {{ i18n.t('quick_categories') }}
            <i aria-hidden="true"></i>
            <b>{{ totalLinks }}</b> {{ i18n.t('quick_links_unit') }}
          </p>
        </div>

        <div class="quick-links-tabs" role="tablist" :aria-label="i18n.t('quick_title')">
          <button
            v-for="(cat, index) in categories"
            :key="cat.key"
            type="button"
            class="quick-links-tab"
            :class="{ 'is-active': cat.key === selectedKey }"
            role="tab"
            :aria-selected="(cat.key === selectedKey).toString()"
            @click="selectCategory(cat.key)"
          >
            <span class="quick-links-tab-no">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="quick-links-tab-label">{{ cat.label || cat.key }}</span>
            <span class="quick-links-tab-count">{{ cat.items?.length || 0 }}</span>
          </button>
        </div>
      </header>

      <div class="quick-links-layout">
        <!-- 桌面端侧边栏 -->
        <aside class="quick-links-sidebar" aria-label="快速链接分类">
          <div class="quick-links-panel">
            <div class="quick-links-wheel-wrap" aria-label="分类选择">
              <div
                ref="wheelRef"
                class="quick-links-wheel"
                tabindex="0"
                role="listbox"
                aria-label="分类选择（上下滚动或方向键切换）"
                @scroll="onWheelScroll('desktop', $event)"
                @wheel.prevent="onWheelZoom('desktop', $event)"
                @click="onWheelClick('desktop', $event)"
                @keydown="onWheelKeydown('desktop', $event)"
              >
                <div
                  v-for="cat in categories"
                  :key="cat.key"
                  class="quick-links-wheel-item"
                  :class="{ 'is-selected': cat.key === selectedKey }"
                  :data-key="cat.key"
                  role="option"
                  :aria-selected="(cat.key === selectedKey).toString()"
                >
                  {{ cat.label || cat.key }}
                </div>
              </div>
              <div class="quick-links-wheel-highlight" aria-hidden="true"></div>
            </div>
          </div>
        </aside>

        <!-- 卡片网格（动态渲染容器） -->
        <div class="quick-links-main">
          <div ref="gridRef" class="quick-links-grid" aria-label="链接列表">
            <!-- 卡片由 renderCards 动态插入 -->
          </div>
        </div>
      </div>
    </section>

    <!-- 移动端 FAB -->
    <button
      v-show="isNarrow"
      class="quick-links-fab"
      aria-label="打开筛选"
      @click="openModal"
    >
      <i class="fas fa-filter"></i>
    </button>

    <!-- 移动端弹窗 -->
    <Teleport to="body">
      <div
        v-if="modalVisible"
        class="quick-links-modal"
        :class="modalState"
        :aria-hidden="(modalState !== 'open').toString()"
        @click.self="closeModal(false)"
      >
        <div class="quick-links-modal-backdrop" data-role="backdrop"></div>
        <div class="quick-links-modal-inner" role="dialog" aria-modal="true">
          <div class="quick-links-modal-body">
            <div class="quick-links-panel">
              <div class="quick-links-wheel-wrap" aria-label="分类选择">
                <div
                  ref="modalWheelRef"
                  class="quick-links-wheel"
                  tabindex="0"
                  role="listbox"
                  aria-label="分类选择（上下滚动或方向键切换）"
                  @scroll="onWheelScroll('modal', $event)"
                  @wheel.prevent="onWheelZoom('modal', $event)"
                  @click="onWheelClick('modal', $event)"
                  @keydown="onWheelKeydown('modal', $event)"
                >
                  <div
                    v-for="cat in categories"
                    :key="cat.key"
                    class="quick-links-wheel-item"
                    :class="{ 'is-selected': cat.key === selectedKey }"
                    :data-key="cat.key"
                    role="option"
                    :aria-selected="(cat.key === selectedKey).toString()"
                  >
                    {{ cat.label || cat.key }}
                  </div>
                </div>
                <div class="quick-links-wheel-highlight" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { resolveUrl } from '@/shared/utils/url'
import { useI18nStore } from '@/shared/stores/i18nStore'
// ---------- i18n 简易实现 ----------
const i18n = reactive({
  lang: 'zh',
  messages: {
    zh: {
      quick_title: '快捷链接',
      quick_categories: '个分类',
      quick_links_unit: '条链接',
      quick_no_links: '该分类下暂无链接。',
      quick_links_load_failed: '加载失败：请检查 data/quick-links.json',
      link_unnamed: '未命名链接',
    },
    en: {
      quick_title: 'Quick Links',
      quick_categories: 'categories',
      quick_links_unit: 'links',
      quick_no_links: 'No links in this category.',
      quick_links_load_failed: 'Load failed: please check data/quick-links.json',
      link_unnamed: 'Unnamed Link',
    },
    ja: {
      quick_title: 'クイックリンク',
      quick_categories: 'カテゴリ',
      quick_links_unit: '件のリンク',
      quick_no_links: 'このカテゴリにはリンクがありません。',
      quick_links_load_failed: '読み込みに失敗しました：data/quick-links.json を確認してください',
      link_unnamed: '名称未設定のリンク',
    },
  },
  t(key) {
    return this.messages[this.lang]?.[key] || this.messages.zh[key] || key
  },
})

// ---------- 常量 ----------
const DATA_URL = '/data/quick-links.json'
const STAGGER_BREAKPOINT = 760
const CARD_STAGGER_MS = 85
const MODAL_ANIMATION_MS = 320
const WHEEL_SCALE = 0.35

// ---------- 状态 ----------
const categories = ref([])
const selectedKey = ref('personal')
const gridRef = ref(null)
const wheelRef = ref(null)
const modalWheelRef = ref(null)
const isNarrow = ref(false)

const modalVisible = ref(false)
const modalState = ref('closed') // 'closed' | 'open-prep' | 'open' | 'closing'

let renderLockedUntil = 0
let lastGridMinHeight = 0
let gridSwitchToken = 0
let programmaticScrollUntil = 0
let snapTimer = null
let rafPending = false
let lastRenderAt = 0
let activeWheelIndex = -1
let closeTimer = null

const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

// ---------- 计算属性 ----------
const siteI18n = useI18nStore()
i18n.lang = siteI18n.lang

const currentItems = computed(() => {
  const cat = categories.value.find(c => c.key === selectedKey.value)
  return cat?.items || []
})

const totalLinks = computed(() =>
  categories.value.reduce((sum, cat) => sum + (cat.items?.length || 0), 0)
)

const enableStagger = computed(() => {
  return !isNarrow.value && !prefersReducedMotion && window.innerWidth > STAGGER_BREAKPOINT
})

// ---------- 工具函数 ----------
function lockRender(ms) {
  const until = Date.now() + Math.max(0, ms)
  if (until > renderLockedUntil) renderLockedUntil = until
}

function getWheelItems(wheel) {
  return wheel ? Array.from(wheel.querySelectorAll('.quick-links-wheel-item')) : []
}

function findClosestIndex(wheel) {
  if (!wheel) return -1
  const items = getWheelItems(wheel)
  if (items.length === 0) return -1
  const centerY = wheel.scrollTop + wheel.clientHeight / 2
  let bestIdx = 0
  let bestDist = Infinity
  items.forEach((item, idx) => {
    const itemCenter = item.offsetTop + item.offsetHeight / 2
    const dist = Math.abs(itemCenter - centerY)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = idx
    }
  })
  return bestIdx
}

function apply3DVisuals(wheel) {
  if (!wheel) return
  const items = getWheelItems(wheel)
  if (items.length === 0) return
  const centerY = wheel.scrollTop + wheel.clientHeight / 2
  items.forEach(item => {
    const itemCenter = item.offsetTop + item.offsetHeight / 2
    const baseH = Math.max(item.offsetHeight, 1)
    const dy = (itemCenter - centerY) / baseH
    const abs = Math.min(Math.abs(dy), 3)
    if (item.classList.contains('is-selected')) {
      item.style.opacity = '1'
      item.style.transform = 'translateZ(0) scale(1.06)'
      item.style.filter = 'none'
      return
    }
    const rotate = Math.max(-28, Math.min(28, dy * 12))
    const scale = 1 - abs * 0.08
    const opacity = 1 - abs * 0.22
    const blur = abs * 0.18
    item.style.opacity = String(Math.max(0.25, opacity))
    item.style.transform = `translateZ(0) rotateX(${rotate}deg) scale(${scale})`
    item.style.filter = blur > 0.02 ? `blur(${blur}px)` : 'none'
  })
}

function setSelected(wheel, index) {
  if (!wheel) return null
  const items = getWheelItems(wheel)
  if (items.length === 0) return null
  const safe = Math.max(0, Math.min(index, items.length - 1))
  items.forEach((item, idx) => {
    const selected = idx === safe
    item.classList.toggle('is-selected', selected)
    item.setAttribute('aria-selected', selected ? 'true' : 'false')
  })
  apply3DVisuals(wheel)
  return items[safe] || null
}

function scrollToCenter(wheel, item, behavior = 'smooth') {
  if (!wheel || !item) return
  const target = item.offsetTop + item.offsetHeight / 2 - wheel.clientHeight / 2
  const top = Math.max(0, Math.min(target, wheel.scrollHeight - wheel.clientHeight))
  try {
    wheel.scrollTo({ top, behavior })
  } catch {
    wheel.scrollTop = top
  }
}

function adjustPadding(wheel) {
  if (!wheel) return
  const first = wheel.querySelector('.quick-links-wheel-item')
  if (!first) return
  const itemH = first.getBoundingClientRect().height || first.offsetHeight || 0
  if (!itemH) return
  const pad = Math.max(0, Math.round(wheel.clientHeight / 2 - itemH / 2))
  wheel.style.paddingTop = `${pad}px`
  wheel.style.paddingBottom = `${pad}px`
}

function updateSticky() {
  const sidebar = document.querySelector('.quick-links-sidebar')
  if (!sidebar) return
  if (window.innerWidth > STAGGER_BREAKPOINT) {
    sidebar.classList.remove('no-sticky')
    return
  }
  const topOffset = 60 + 12
  const avail = window.innerHeight - topOffset - 24
  const h = sidebar.getBoundingClientRect().height
  sidebar.classList.toggle('no-sticky', h > avail)
}

// ---------- 卡片渲染（直接操作 DOM，保持与老代码一致） ----------
async function renderCards(items) {
  if (!gridRef.value) return
  const grid = gridRef.value
  const doStagger = enableStagger.value

  // 记录当前高度
  const h = grid.getBoundingClientRect().height
  if (Number.isFinite(h) && h > lastGridMinHeight) lastGridMinHeight = h

  // 取消进行中的动画
  if (typeof grid.animate === 'function') {
    grid.getAnimations().forEach((a) => a.cancel())
  }

  // 直接渲染（无动画、reduced motion、页面不可见时）
  if (prefersReducedMotion || typeof grid.animate !== 'function' || document.visibilityState === 'hidden') {
    performRender()
    return
  }

  // 淡出 -> 渲染 -> 淡入
  const token = ++gridSwitchToken
  const fadeOut = grid.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 1, 1)',
    fill: 'forwards',
  })

  let committed = false
  const commit = () => {
    if (committed || token !== gridSwitchToken) return
    committed = true
    performRender()
    const fadeIn = grid.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 320,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
    })
    fadeIn.onfinish = () => {
      if (token !== gridSwitchToken) return
      grid.style.opacity = ''
    }
    // 动画被浏览器暂停时兜底，避免网格一直空着或停在透明态
    setTimeout(() => {
      if (token !== gridSwitchToken) return
      grid.getAnimations().forEach((a) => a.cancel())
      grid.style.opacity = ''
    }, 380)
  }

  fadeOut.onfinish = commit
  setTimeout(commit, 240)

  function performRender() {
    grid.innerHTML = ''
    if (!Array.isArray(items) || items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'link-empty'
      empty.textContent = i18n.t('quick_no_links')
      grid.appendChild(empty)
      if (lastGridMinHeight > 0) grid.style.minHeight = `${Math.round(lastGridMinHeight)}px`
      return
    }

    const createdCards = []
    items.forEach((item, index) => {
      const title = item?.title ? String(item.title) : i18n.t('link_unnamed')
      const url = item?.url ? String(item.url) : '#'
      const image = item?.image ? String(item.image) : ''

      const a = document.createElement('a')
      a.className = 'link-card'
      a.style.setProperty('--ql-card-index', String(index))
      if (doStagger) {
        a.classList.add('link-card-pre-enter')
        a.style.setProperty('--ql-card-delay', `${index * CARD_STAGGER_MS}ms`)
      }
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.innerHTML = `
        <div class="link-card-media"><img src="${image}" alt="${title}"></div>
        <div class="link-card-body">
          <div class="link-card-title">${title}</div>
          <div class="link-card-url">${url}</div>
        </div>
      `
      grid.appendChild(a)
      if (doStagger) createdCards.push(a)
    })

    if (doStagger && createdCards.length > 0) {
      requestAnimationFrame(() => {
        createdCards.forEach(card => card.classList.add('link-card-enter-active'))
      })
    }

    // 保持最小高度
    if (lastGridMinHeight > 0) {
      try {
        const newH = grid.getBoundingClientRect().height
        if (Number.isFinite(newH) && newH < lastGridMinHeight) {
          grid.style.minHeight = `${Math.round(lastGridMinHeight)}px`
        } else {
          lastGridMinHeight = newH
          grid.style.minHeight = ''
        }
      } catch {
        grid.style.minHeight = `${Math.round(lastGridMinHeight)}px`
      }
    }
  }
}

// ---------- 核心更新 ----------
function selectCategory(key) {
  if (!key || key === selectedKey.value) return
  selectedKey.value = key
  nextTick(() => renderCards(currentItems.value))
}

function updateSelection(wheel, index, shouldRender = false) {
  const item = setSelected(wheel, index)
  if (!item) return
  const items = getWheelItems(wheel)
  activeWheelIndex = items.indexOf(item)

  if (shouldRender) {
    const key = item.dataset.key
    if (key && key !== selectedKey.value) {
      selectedKey.value = key
      nextTick(() => renderCards(currentItems.value))
    }
  }
}

function scheduleVisuals(wheel) {
  if (!wheel || rafPending) return
  rafPending = true
  requestAnimationFrame(() => {
    rafPending = false
    apply3DVisuals(wheel)
  })
}

function recenter(wheel) {
  if (!wheel) return
  const selected = wheel.querySelector('.quick-links-wheel-item.is-selected') ||
    wheel.querySelector('.quick-links-wheel-item')
  if (!selected) return
  const idx = getWheelItems(wheel).indexOf(selected)
  if (idx < 0) return
  updateSelection(wheel, idx, true)
  lockRender(240)
  programmaticScrollUntil = Date.now() + 260
  scrollToCenter(wheel, selected, 'auto')
  apply3DVisuals(wheel)
}

// ---------- 事件处理 ----------
function onWheelScroll(source, event) {
  const wheel = event.target
  scheduleVisuals(wheel)

  const now = Date.now()
  const allowRender = now >= programmaticScrollUntil && now >= renderLockedUntil
  const idx = findClosestIndex(wheel)
  if (idx !== -1 && idx !== activeWheelIndex) {
    const shouldRender = allowRender && (now - lastRenderAt) > 120
    updateSelection(wheel, idx, shouldRender)
    if (shouldRender) lastRenderAt = now
  }

  if (snapTimer) clearTimeout(snapTimer)
  snapTimer = setTimeout(() => {
    if (Date.now() < renderLockedUntil) return
    const snapIdx = findClosestIndex(wheel)
    if (snapIdx === -1) return
    updateSelection(wheel, snapIdx, true)
    lastRenderAt = Date.now()
    const items = getWheelItems(wheel)
    programmaticScrollUntil = Date.now() + 240
    scrollToCenter(wheel, items[snapIdx], 'smooth')
  }, 120)
}

function onWheelZoom(source, event) {
  const wheel = source === 'desktop' ? wheelRef.value : modalWheelRef.value
  if (!wheel || typeof event.deltaY !== 'number' || event.deltaY === 0) return
  const base = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
  const scaled = base * WHEEL_SCALE
  const clamped = Math.max(-90, Math.min(90, scaled))
  wheel.scrollTop += clamped
}

function onWheelClick(source, event) {
  const wheel = source === 'desktop' ? wheelRef.value : modalWheelRef.value
  const target = event.target
  if (!(target instanceof Element)) return
  const item = target.closest('.quick-links-wheel-item')
  if (!item) return
  const items = getWheelItems(wheel)
  const idx = items.indexOf(item)
  if (idx === -1) return
  updateSelection(wheel, idx, true)
  programmaticScrollUntil = Date.now() + 240
  scrollToCenter(wheel, item, 'smooth')
  wheel.focus()

  if (source === 'modal') {
    setTimeout(() => closeModal(false), 180)
  }
}

function onWheelKeydown(source, event) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  const wheel = source === 'desktop' ? wheelRef.value : modalWheelRef.value
  if (activeWheelIndex < 0) return
  event.preventDefault()
  const items = getWheelItems(wheel)
  const delta = event.key === 'ArrowUp' ? -1 : 1
  const next = Math.max(0, Math.min(activeWheelIndex + delta, items.length - 1))
  updateSelection(wheel, next, true)
  programmaticScrollUntil = Date.now() + 240
  scrollToCenter(wheel, items[next], 'smooth')
}

// ---------- 弹窗控制 ----------
function openModal() {
  if (modalVisible.value) return
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  lockRender(MODAL_ANIMATION_MS + 260)
  modalVisible.value = true
  modalState.value = 'open-prep'
  document.body.style.overflow = 'hidden'

  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modalState.value = 'open'
        const wheel = modalWheelRef.value
        if (wheel) {
          adjustPadding(wheel)
          lockRender(220)
          recenter(wheel)
          setTimeout(() => recenter(wheel), 120)
        }
      })
    })
  })
}

function closeModal(immediate = false) {
  if (!modalVisible.value) return
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  if (immediate) {
    modalState.value = 'closed'
    modalVisible.value = false
    document.body.style.overflow = ''
    return
  }
  modalState.value = 'closing'
  closeTimer = setTimeout(() => {
    modalState.value = 'closed'
    modalVisible.value = false
    document.body.style.overflow = ''
    closeTimer = null
  }, MODAL_ANIMATION_MS)
}

// ---------- 数据加载 ----------
async function fetchData() {
  try {
    const res = await fetch(resolveUrl(DATA_URL), { cache: 'no-store' })
    const data = await res.json()
    if (data && Array.isArray(data.categories)) {
      categories.value = data.categories
      const preferred = 'personal'
      const found = data.categories.findIndex(c => c.key === preferred)
      const initialKey = found !== -1 ? preferred : (data.categories[0]?.key || 'personal')
      selectedKey.value = initialKey
      activeWheelIndex = found !== -1 ? found : 0

      await nextTick()
      const wheel = wheelRef.value
      if (wheel && data.categories.length > 0) {
        adjustPadding(wheel)
        setSelected(wheel, activeWheelIndex)
        const items = getWheelItems(wheel)
        const initialEl = items[activeWheelIndex]
        if (initialEl) {
          programmaticScrollUntil = Date.now() + 120
          scrollToCenter(wheel, initialEl, 'auto')
          apply3DVisuals(wheel)
        }
        renderCards(currentItems.value)
      }
      updateSticky()
    }
  } catch (e) {
    console.error('[QuickLinks] 加载失败:', e)
    if (gridRef.value) {
      gridRef.value.innerHTML = `<div class="link-empty">${i18n.t('quick_links_load_failed')}</div>`
    }
  }
}

// ---------- 响应式 ----------
function handleResize() {
  const narrow = window.innerWidth <= STAGGER_BREAKPOINT
  isNarrow.value = narrow

  const wheel = wheelRef.value
  if (wheel) {
    adjustPadding(wheel)
    scheduleVisuals(wheel)
  }

  if (modalVisible.value && modalWheelRef.value) {
    adjustPadding(modalWheelRef.value)
    scheduleVisuals(modalWheelRef.value)
  }

  updateSticky()

  if (!narrow && modalVisible.value) {
    closeModal(true)
  }
}

// ---------- 生命周期 ----------
onMounted(() => {
  isNarrow.value = window.innerWidth <= STAGGER_BREAKPOINT
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (snapTimer) clearTimeout(snapTimer)
  if (closeTimer) clearTimeout(closeTimer)
})

watch(() => i18n.lang, () => {
  if (gridRef.value) renderCards(currentItems.value)
})

watch(() => siteI18n.lang, (lang) => {
  i18n.lang = lang
})
</script>

<style scoped>
/* ========== 布局和侧边栏样式（scoped） ========== */
.quick-links-page {
  --primary-color: #c84070;
  --secondary-color: #58d8b2;
  --ql-pink: #ffb6c9;
  --ql-peach: #ffd2a6;
  --ql-mint: #a7f3d0;
  --ql-sky: #9ad7ff;
  --ql-lavender: #c7b6ff;
  --ql-text: #17222f;
  --ql-muted: rgba(23, 34, 47, 0.58);
  --ql-shadow: 0 18px 44px rgba(23, 34, 47, 0.12);
  --ql-border: linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(199, 182, 255, 0.9) 52%, rgba(167, 243, 208, 0.92));
  --transition: 0.3s ease;
  min-height: 100vh;
  position: relative;
}

.quick-links-section {
  padding-top: 80px;
  padding-bottom: 40px;
  padding-left: 20px;
  padding-right: 20px;
}

.quick-links-layout {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 22px;
  align-items: flex-start;
}

.quick-links-sidebar {
  width: 300px;
  flex: 0 0 300px;
  position: sticky;
  top: 50vh;
  transform: translateY(-50%);
  z-index: 5;
}
.quick-links-sidebar.no-sticky {
  position: static !important;
  top: auto !important;
  transform: none !important;
}

.quick-links-panel {
  position: relative;
  backdrop-filter: blur(14px);
  border-radius: 26px;
  border: 2px solid transparent;
  background:
    linear-gradient(to bottom,
      rgba(253, 249, 242, 0.97) 0%,
      rgba(253, 247, 238, 0.93) 50%,
      rgba(253, 249, 242, 0.97) 100%) padding-box,
    var(--ql-border) border-box;
  box-shadow: var(--ql-shadow);
  overflow: hidden;
  padding: 18px;
}

.quick-links-wheel-wrap {
  position: relative;
  z-index: 1;
}

.quick-links-wheel {
  --wheel-item-height: 58px;
  height: 600px;
  padding: 136px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  border-radius: 16px;
  background: linear-gradient(to bottom,
      rgba(253, 249, 242, 0) 0%,
      rgba(253, 249, 242, 0.88) 50%,
      rgba(253, 249, 242, 0) 100%);
  border: 1px solid rgba(23, 34, 47, 0.06);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 2;
  scrollbar-width: none;
  perspective: 560px;
  transform-style: preserve-3d;
}
.quick-links-wheel::-webkit-scrollbar {
  width: 0;
  height: 0;
}
.quick-links-wheel:focus-visible {
  outline: 2px solid rgba(200, 64, 112, 0.45);
  outline-offset: 3px;
}

.quick-links-wheel-item {
  height: var(--wheel-item-height);
  scroll-snap-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  padding: 0 14px;
  margin: 6px 0;
  border: 1px solid rgba(23, 34, 47, 0.06);
  background: rgba(253, 249, 242, 0.62);
  color: var(--ql-text);
  font-weight: 900;
  letter-spacing: 0.6px;
  cursor: pointer;
  user-select: none;
  transition: transform 120ms ease, opacity 120ms ease, filter 120ms ease, background 180ms ease, color 180ms ease;
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}
.quick-links-wheel-item.is-selected {
  background: linear-gradient(135deg, #ffc4d4, #dccfff 52%, #bff5e2);
  color: var(--ql-text);
  border-color: rgba(255, 255, 255, 0.55);
  transform: scale(1.06);
  filter: none;
  opacity: 1;
  box-shadow: 0 12px 26px rgba(200, 64, 112, 0.14);
}

.quick-links-wheel-highlight {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  height: 66px;
  border-radius: 16px;
  border: 3px solid transparent;
  background:
    linear-gradient(transparent, transparent) padding-box,
    var(--ql-border) border-box;
  box-shadow: none;
  z-index: 1;
  pointer-events: none;
}

.quick-links-main {
  flex: 1;
  min-width: 0;
  min-height: calc(100vh - 140px);
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-width: none;
}
.quick-links-main::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.quick-links-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-content: start;
  min-height: calc(100vh - 140px);
  will-change: opacity, transform;
}
@media (max-width: 980px) {
  .quick-links-grid {
    grid-template-columns: 1fr;
  }
}

/* ========== 卡片样式（穿透 scoped，确保动态元素生效） ========== */
.quick-links-grid :deep(.link-card) {
  text-decoration: none;
  color: inherit;
  display: block;
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  border: 2px solid transparent;
  background:
    linear-gradient(rgba(253, 249, 242, 0.9), rgba(253, 247, 238, 0.86)) padding-box,
    var(--ql-border) border-box;
  box-shadow: 0 12px 28px rgba(23, 34, 47, 0.1);
  transition: var(--transition);
}
.quick-links-grid :deep(.link-card:hover) {
  transform: translateY(-3px);
  box-shadow: 0 20px 40px rgba(23, 34, 47, 0.16);
}

.quick-links-grid :deep(.link-card-media) {
  height: 170px;
  overflow: hidden;
  position: relative;
}
.quick-links-grid :deep(.link-card-media::after) {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 78px;
  background: linear-gradient(to bottom, rgba(253, 249, 242, 0) 0%, rgba(253, 249, 242, 0.94) 100%);
  pointer-events: none;
}
.quick-links-grid :deep(.link-card-media img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.quick-links-grid :deep(.link-card-body) {
  padding: 16px 18px 18px 18px;
}
.quick-links-grid :deep(.link-card-title) {
  font-size: 1.12rem;
  font-weight: 900;
  color: #c84070;
  margin-bottom: 8px;
}
.quick-links-grid :deep(.link-card-url) {
  font-size: 0.95rem;
  color: var(--ql-muted);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-links-grid :deep(.link-empty) {
  background: rgba(253, 249, 242, 0.9);
  border-radius: 24px;
  padding: 18px;
  border: 2px solid transparent;
  background:
    linear-gradient(rgba(253, 249, 242, 0.9), rgba(253, 247, 238, 0.86)) padding-box,
    var(--ql-border) border-box;
  box-shadow: 0 12px 28px rgba(23, 34, 47, 0.1);
  color: var(--ql-muted);
  font-weight: 700;
  grid-column: 1 / -1;
}

/* 卡片入场动画 */
@media (min-width: 761px) {
  .quick-links-grid :deep(.link-card-pre-enter) {
    opacity: 0;
    transform: translateY(14px);
    transition:
      opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.3s ease;
    transition-delay: var(--ql-card-delay, 0ms);
  }
  .quick-links-grid :deep(.link-card-pre-enter.link-card-enter-active) {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .quick-links-grid :deep(.link-card-pre-enter) {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* FAB */
.quick-links-fab {
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: #fff;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24);
  z-index: 1600;
  border: none;
  cursor: pointer;
  font-size: 20px;
}

/* 弹窗样式（scoped） */
.quick-links-modal {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1650;
  pointer-events: none;
}
.quick-links-modal .quick-links-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
  opacity: 0;
  transition: opacity 240ms ease;
}
.quick-links-modal .quick-links-modal-inner {
  position: relative;
  width: min(92%, 380px);
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
.quick-links-modal .quick-links-modal-body {
  width: min(92vw, 380px);
  padding: 8px;
}

.quick-links-modal.open-prep,
.quick-links-modal.open,
.quick-links-modal.closing {
  display: flex;
  pointer-events: auto;
}
.quick-links-modal.open .quick-links-modal-backdrop {
  opacity: 1;
}
.quick-links-modal.open .quick-links-modal-inner {
  transform: translate3d(0, 0, 0) scale(1);
  opacity: 1;
}
.quick-links-modal.closing .quick-links-modal-backdrop {
  opacity: 0;
}
.quick-links-modal.closing .quick-links-modal-inner {
  transform: translate3d(72px, 72px, 0) scale(0.72);
  opacity: 0;
}

/* 响应式 */
@media (max-width: 760px) {
  .quick-links-section {
    padding-left: 10px;
    padding-right: 10px;
  }
  .quick-links-layout {
    flex-direction: column;
    --ql-side-width: min(820px, calc(100vw - 12px));
    align-items: center;
  }
  .quick-links-sidebar {
    display: none !important;
  }
  .quick-links-fab {
    display: inline-flex !important;
  }
  .quick-links-grid {
    grid-template-columns: 1fr;
    width: 100%;
    max-width: var(--ql-side-width);
    margin: 0 auto;
  }
  .quick-links-main {
    width: 100%;
  }
}

/* ================= 重构：链接图谱（顶部索引 + 三列卡片） ================= */
.quick-links-section {
  padding: 96px 24px 64px;
}

.quick-links-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  max-width: 1200px;
  margin: 0 auto 26px;
}

.quick-links-head-copy {
  flex: 0 1 420px;
  min-width: 260px;
}

.quick-links-eyebrow {
  display: block;
  margin-bottom: 9px;
  font-family: var(--font-ui);
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  color: rgba(23, 34, 47, 0.4);
}

.quick-links-title {
  margin: 0;
  font-size: clamp(2.4rem, 4.6vw, 3.5rem);
  font-weight: 900;
  line-height: 1.02;
  letter-spacing: -0.01em;
  background: linear-gradient(100deg, #c84070 0%, #a08cff 52%, #58d8b2 100%);
  background-size: 180% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 12px 26px rgba(23, 34, 47, 0.1));
}

.quick-links-meta {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 12px 0 0;
  font-family: var(--font-ui);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: rgba(23, 34, 47, 0.46);
}

.quick-links-meta b {
  font-size: 0.94rem;
  font-weight: 800;
  color: var(--ql-text);
}

.quick-links-meta i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(23, 34, 47, 0.28);
}

.quick-links-tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  flex: 1 1 520px;
}

.quick-links-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 11px 0 9px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  background: rgba(253, 249, 242, 0.62);
  color: var(--ql-text);
  font-family: var(--font-ui);
  cursor: pointer;
  transition:
    background 220ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease,
    transform 220ms ease;
}

.quick-links-tab:hover {
  transform: translateY(-2px);
  background: rgba(253, 249, 242, 0.9);
  border-color: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 22px rgba(23, 34, 47, 0.09);
}

.quick-links-tab.is-active {
  border-color: rgba(200, 64, 112, 0.22);
  background:
    linear-gradient(135deg, rgba(255, 226, 235, 0.9), rgba(247, 241, 255, 0.9) 52%, rgba(226, 249, 241, 0.9));
  box-shadow: 0 12px 26px rgba(200, 64, 112, 0.1);
}

.quick-links-tab-no {
  font-size: 0.54rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(23, 34, 47, 0.38);
}

.quick-links-tab-label {
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.quick-links-tab-count {
  min-width: 19px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(23, 34, 47, 0.08);
  font-size: 0.54rem;
  font-weight: 700;
  text-align: center;
  color: rgba(23, 34, 47, 0.54);
}

.quick-links-layout {
  display: block;
  padding-left: 0 !important;
}

.quick-links-sidebar {
  display: none !important;
}

.quick-links-main {
  min-height: 0;
  max-height: none;
  overflow: visible;
}

.quick-links-grid {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 22px;
  min-height: 0 !important;
}

.quick-links-grid :deep(.link-card) {
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 26px;
  background:
    linear-gradient(160deg, rgba(255, 253, 248, 0.94), rgba(253, 246, 236, 0.86));
  box-shadow:
    0 16px 36px rgba(23, 34, 47, 0.11),
    0 1px 0 rgba(255, 255, 255, 0.72) inset;
}

.quick-links-grid :deep(.link-card:hover) {
  transform: translateY(-4px);
  box-shadow:
    0 24px 50px rgba(23, 34, 47, 0.16),
    0 1px 0 rgba(255, 255, 255, 0.72) inset;
}

.quick-links-grid :deep(.link-card-media) {
  height: 164px;
  background:
    radial-gradient(120% 120% at 12% 8%, rgba(255, 211, 138, 0.28), transparent 55%),
    radial-gradient(120% 120% at 88% 92%, rgba(88, 216, 178, 0.24), transparent 60%),
    rgba(23, 34, 47, 0.04);
}

.quick-links-grid :deep(.link-card-media.is-fallback) {
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(90% 90% at 18% 0%, rgba(255, 182, 201, 0.5), transparent 60%),
    radial-gradient(90% 90% at 100% 100%, rgba(167, 243, 208, 0.45), transparent 62%),
    linear-gradient(145deg, #fdf6ee, #f5f1fb);
}

.quick-links-grid :deep(.link-card-media.is-fallback::before) {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(23, 34, 47, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(23, 34, 47, 0.045) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.7;
}

.quick-links-grid :deep(.link-card-glyph) {
  position: relative;
  z-index: 1;
  font-family: var(--font-ui);
  font-size: 2.9rem;
  font-weight: 300;
  line-height: 1;
  color: rgba(23, 34, 47, 0.34);
  transform: translateY(-2px);
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.quick-links-grid :deep(.link-card:hover .link-card-glyph) {
  transform: translate(3px, -5px);
}

.quick-links-grid :deep(.link-card-no) {
  position: absolute;
  top: 12px;
  right: 14px;
  z-index: 2;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(23, 34, 47, 0.26);
  color: rgba(255, 253, 248, 0.9);
  font-family: var(--font-ui);
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.quick-links-grid :deep(.link-card-body) {
  padding: 17px 18px 18px;
}

.quick-links-grid :deep(.link-card-title) {
  margin-bottom: 6px;
  font-size: 1.06rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ql-text);
}

.quick-links-grid :deep(.link-card-url) {
  font-size: 0.72rem;
  letter-spacing: 0.01em;
  color: rgba(23, 34, 47, 0.44);
}

.quick-links-grid :deep(.link-empty) {
  grid-column: 1 / -1;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(253, 249, 242, 0.8);
  box-shadow: 0 16px 36px rgba(23, 34, 47, 0.1);
}

@media (max-width: 1100px) {
  .quick-links-head {
    gap: 18px;
  }

  .quick-links-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .quick-links-section {
    padding: 84px 14px 40px;
  }

  .quick-links-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
  }

  .quick-links-head-copy {
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;
  }

  .quick-links-title {
    font-size: 2.1rem;
  }

  .quick-links-meta {
    margin-top: 8px;
  }

  .quick-links-tabs {
    flex: none;
    justify-content: flex-start;
    flex-wrap: nowrap;
    width: calc(100vw - 28px);
    margin: 0 -14px;
    padding: 2px 14px 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .quick-links-tabs::-webkit-scrollbar {
    display: none;
  }

  .quick-links-tab {
    flex: 0 0 auto;
    height: 36px;
  }

  .quick-links-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .quick-links-grid :deep(.link-card-media) {
    height: 152px;
  }

  .quick-links-fab {
    display: none !important;
  }
}
</style>