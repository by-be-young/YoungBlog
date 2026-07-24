<template>
  <main class="quick-links-page">
    <section class="quick-links-section">
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

// ---------- i18n 简易实现 ----------
const i18n = reactive({
  lang: 'zh',
  messages: {
    zh: {
      quick_no_links: '该分类下暂无链接。',
      quick_links_load_failed: '加载失败：请检查 data/quick-links.json',
      link_unnamed: '未命名链接',
    },
    en: {
      quick_no_links: 'No links in this category.',
      quick_links_load_failed: 'Load failed: please check data/quick-links.json',
      link_unnamed: 'Unnamed Link',
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
const defaultImage = '/assets/images/background/bg1.png'

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
const currentItems = computed(() => {
  const cat = categories.value.find(c => c.key === selectedKey.value)
  return cat?.items || []
})

const enableStagger = computed(() => {
  return !isNarrow.value && !prefersReducedMotion && window.innerWidth > STAGGER_BREAKPOINT
})

// ---------- 工具函数 ----------
function lockRender(ms) {
  const until = Date.now() + Math.max(0, ms)
  if (until > renderLockedUntil) renderLockedUntil = until
}

function getActiveWheel() {
  return modalVisible.value ? modalWheelRef.value : wheelRef.value
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
  try {
    const h = grid.getBoundingClientRect().height
    if (Number.isFinite(h) && h > lastGridMinHeight) lastGridMinHeight = h
  } catch {}

  // 取消进行中的动画
  if (typeof grid.animate === 'function') {
    try { grid.getAnimations().forEach(a => a.cancel()) } catch {}
  }

  // 直接渲染（无动画或 reduced motion）
  if (prefersReducedMotion || typeof grid.animate !== 'function') {
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

  fadeOut.onfinish = () => {
    if (token !== gridSwitchToken) return
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
  }

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
      const image = item?.image ? String(item.image) : defaultImage

      const a = document.createElement('a')
      a.className = 'link-card'
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
    const res = await fetch(DATA_URL, { cache: 'no-store' })
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
</script>

<style scoped>
/* ========== 布局和侧边栏样式（scoped） ========== */
.quick-links-page {
  --primary-color: #55c8ff;
  --secondary-color: #a7f3d0;
  --ql-pink: #ffb6c9;
  --ql-peach: #ffd2a6;
  --ql-mint: #a7f3d0;
  --ql-sky: #9ad7ff;
  --ql-lavender: #c7b6ff;
  --ql-text: #2b3440;
  --ql-muted: #5f6b7a;
  --ql-shadow: 0 16px 34px rgba(44, 62, 80, 0.14);
  --ql-border: linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.92), rgba(167, 243, 208, 0.92));
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
  border-radius: 18px;
  border: 4px solid transparent;
  background:
    linear-gradient(to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.86) 50%,
      rgba(255, 255, 255, 0) 100%) padding-box,
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
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.82) 50%,
      rgba(255, 255, 255, 0) 100%);
  border: 1px solid rgba(0, 0, 0, 0.05);
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
  outline: 2px solid rgba(85, 200, 255, 0.65);
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
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.55);
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
  background: linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.90), rgba(167, 243, 208, 0.92));
  color: #fff;
  border-color: rgba(0, 0, 0, 0.06);
  transform: scale(1.06);
  filter: none;
  opacity: 1;
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
  border-radius: 18px;
  overflow: hidden;
  border: 3px solid transparent;
  background:
    linear-gradient(rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.82)) padding-box,
    var(--ql-border) border-box;
  box-shadow: 0 10px 22px rgba(44, 62, 80, 0.10);
  transition: var(--transition);
}
.quick-links-grid :deep(.link-card:hover) {
  transform: translateY(-2px);
  box-shadow: 0 18px 36px rgba(44, 62, 80, 0.16);
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
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.92) 100%);
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
  color: #ff5f8a;
  margin-bottom: 8px;
}
.quick-links-grid :deep(.link-card-url) {
  font-size: 0.95rem;
  color: rgba(13, 110, 87, 0.86);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-links-grid :deep(.link-empty) {
  background: rgba(255, 255, 255, 0.82);
  border-radius: 18px;
  padding: 18px;
  border: 3px solid transparent;
  background:
    linear-gradient(rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.78)) padding-box,
    var(--ql-border) border-box;
  box-shadow: 0 10px 22px rgba(44, 62, 80, 0.10);
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

@media (min-width: 761px) {
  .quick-links-sidebar {
    position: fixed;
    left: max(20px, calc((100vw - 1200px) / 2));
    top: 50%;
    transform: translateY(-50%);
    z-index: 5;
  }
  .quick-links-layout {
    padding-left: 322px;
  }
}
</style>