<template>
  <!--
    toc-root 使用 display: contents，使内部元素在桌面端仍作为 .container 的直接子项参与布局；
    移动端（紧凑模式）下导航、遮罩、按钮均脱离文档流，正文占满整行。
  -->
  <div class="toc-root">
    <nav class="blog-toc"
      :class="{ 'toc-collapsed': collapsed, 'toc-compact': isCompact, 'in-overlay': isCompact, 'is-open': overlayOpen }">
        <div class="toc-header">
            <div class="toc-title">{{ i18n.currentTranslations.toc }}</div>
            <div class="toc-progress">{{ Math.round(progress) }}%</div>
        </div>

        <ul class="toc-list has-animated-h2-indicator" ref="tocListRef">
            <!-- H2 活动指示器（背景滑块） -->
            <div class="toc-h2-active-indicator" ref="h2IndicatorRef"></div>

            <!-- H3 跟随小虫 -->
            <div class="toc-bug" :class="{ idle: activeH3 == null }" ref="tocBugRef">
                <img :src="resolveUrl('/assets/images/task/correct.png')" alt="" />
            </div>

            <template v-for="h1 in tree" :key="h1.index">
                <li class="toc-h1">
                    <span class="toc-toggle" @click="toggleH1(h1)">
                        {{ getToggleText(h1) }}
                    </span>

                    <a :href="'#h1-' + h1.index" @click.prevent="scrollToHeader(h1)"
                        :class="{ 'has-star-marker': h1.star }">
                        <span class="toc-item-label">{{ h1.text }}</span>
                        <span v-if="h1.star" class="toc-star-marker" aria-hidden="true">★</span>
                    </a>

                    <ul v-if="h1.children?.length" class="toc-sub-list" :ref="el => setSubListRef(h1.index, el)">
                        <li v-for="h2 in h1.children" :key="h2.index" :data-text="h2.text"
                            :class="['toc-h2', { 'is-active': activeH2?.index === h2.index }]">
                            <a :href="'#h2-' + h2.index" @click.prevent="scrollToHeader(h2)"
                                :class="{ 'has-star-marker': h2.star }">
                                <span class="toc-item-label">{{ h2.text }}</span>
                                <span v-if="h2.star" class="toc-star-marker" aria-hidden="true">★</span>
                            </a>

                            <ul v-if="activeH2?.index === h2.index && h2.children?.length"
                                class="toc-sub-list toc-h3-sub-list">
                                <li v-for="h3 in h2.children" :key="h3.index" :data-text="h3.text"
                                    :class="['toc-h3', { 'is-active': activeH3?.index === h3.index }]">
                                    <a :href="'#' + h3.index" @click.prevent="scrollToHeader(h3)"
                                        :class="{ 'has-star-marker': h3.star }">
                                        <span class="toc-item-label">{{ h3.text }}</span>
                                        <span v-if="h3.star" class="toc-star-marker" aria-hidden="true">★</span>
                                    </a>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </template>
        </ul>

        <div class="toc-footer" v-if="$slots.footer">
            <slot name="footer" />
        </div>
    </nav>

    <!-- 紧凑模式（移动端）遮罩：点击空白处关闭目录 -->
    <div v-if="isCompact" class="toc-overlay" :class="{ 'is-active': overlayOpen }" @click.self="closeOverlay"></div>

    <!-- 紧凑模式（移动端）目录按钮：注入右下角悬浮球组，避免与其它悬浮球重叠 -->
    <Teleport v-if="isCompact && fabTarget" :to="fabTarget">
      <button type="button" class="toc-fab floating-btn" :title="i18n.get(overlayOpen ? 'toc_close' : 'toc_open')"
        :aria-expanded="overlayOpen ? 'true' : 'false'" :aria-label="i18n.get(overlayOpen ? 'toc_close' : 'toc_open')"
        @click="toggleOverlay">
        <i :class="overlayOpen ? 'fas fa-times' : 'fas fa-list-ul'" aria-hidden="true"></i>
      </button>
    </Teleport>
  </div>
</template>

<script setup>
/**
 * 博客目录组件 (Table of Contents)
 *
 * 功能概述：
 * - 从页面 .article-content 中提取 h1~h3 标题，生成多级目录树
 * - 自动追踪页面滚动位置，高亮当前所在章节（H2/H3）
 * - 支持手动展开/折叠一级标题（H1），手风琴式交互
 * - 点击目录项平滑滚动至对应标题，并短暂锁定自动追踪
 * - 显示阅读进度百分比
 * - 支持星标标题（解析末尾的【!】标记），并在目录中显示星标符号
 * - H2 具有滑动背景指示器，H3 具有跟随的“小虫”图标
 * - 可整体折叠（由外部 collapsed prop 控制）
 * - 支持紧凑模式与弹层展示（通过外部 CSS 和插槽配合）
 *
 * 依赖：
 * - @/stores/i18nStore：国际化文字
 * - 页面需存在 .article-content 容器以及 .navbar 导航栏
 * - 标题元素需通过 data-heading-plain-text 提供纯净文本
 * - 星标状态可通过 data-star-marked 可选提供
 */

import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18nStore'
import { resolveUrl } from '@/utils/url'

const props = defineProps({
    /** 文章内容 HTML，用于监听变化并触发目录重建 */
    contentHtml: { type: String, default: '' },
    /** 是否折叠整个目录组件（宽度变为 0） */
    collapsed: { type: Boolean, default: false }
})

const i18n = useI18nStore()

// ==================== 常量 ====================
/** 子列表展开/折叠动画持续时间 (ms) */
const TOC_SUBLIST_ANIM_MS = 220
/** 点击跳转后，锁定自动追踪的最小时间 (ms) */
const TOC_SCROLL_LOCK_MIN_MS = 650
/** 点击跳转后，锁定自动追踪的最大时间 (ms)（根据滚动距离动态计算） */
const TOC_SCROLL_LOCK_MAX_MS = 2200

// ==================== 模板引用 ====================
const tocListRef = ref(null)    // 目录列表 ul 元素
const h2IndicatorRef = ref(null) // H2 活动指示器元素
const tocBugRef = ref(null)      // H3 小虫图标元素

// ==================== 核心响应式数据 ====================
/** 目录树：{ index, text, level, star, children, rawEl }[] */
const tree = ref([])
/** 阅读进度 0~100 */
const progress = ref(0)
/** 当前激活的 H2 节点 */
const activeH2 = ref(null)
/** 当前激活的 H3 节点 */
const activeH3 = ref(null)

// ==================== 展开状态管理 ====================
/** 各 H1 的展开状态，key 为 h1.index */
const openStates = reactive({})
/** 存储子列表 ul 的 DOM 引用，key 为 h1.index */
const subListEls = {}
/** 动画序列号，用于防止同一元素的动画冲突 */
const animSeqs = {}

// ==================== 滚动锁定 ====================
/** 在此时间戳之前，自动滚动追踪保持锁定（手动点击后） */
let tocAutoSyncLockUntil = 0

// ==================== 工具函数 ====================

/**
 * 根据纯净文本查找页面中对应的标题 DOM 元素
 * @param {string} text 标题的纯净文本（不含标记）
 * @returns {HTMLElement|null}
 */
function findHeading(text) {
    const content = document.querySelector('.article-content')
    if (!content) return null
    for (const h of content.querySelectorAll('h1, h2, h3')) {
        const plain = h.dataset.headingPlainText || (h.textContent || '').trim()
        if (plain === text) return h
    }
    return null
}

// ==================== 一、目录生成 ====================

/**
 * 解析标题末尾的星标标记（【!】、[!]、［!］等）
 * @param {string} raw 原始标题文本
 * @returns {{ text: string, star: boolean }} 纯净文本及是否包含星标
 */
function parseStar(raw) {
    const txt = String(raw || '').trim()
    const re = /(?:【\s*[!！]\s*】|\[\s*[!！]\s*\]|［\s*[!！]\s*］)\s*$/
    return {
        text: txt.replace(re, '').trim(),
        star: re.test(txt)
    }
}

/**
 * 从页面真实 DOM 构建目录树
 * 遍历 .article-content 中的所有 h1~h3，生成层级结构
 */
function buildTree() {
    const content = document.querySelector('.article-content')
    if (!content) return

    const headings = content.querySelectorAll('h1, h2, h3')
    const result = []
    let currentH1 = null
    let currentH2 = null
    const counters = { h1: 0, h2: 0, h3: 0 }

    headings.forEach((h) => {
        const rawText = (h.textContent || '').trim()
        if (!rawText) return

        const plainText = h.dataset.headingPlainText || rawText
        const star = h.dataset.starMarked === '1' || (!h.dataset.starMarked && parseStar(rawText).star)
        const text = star ? (h.dataset.headingPlainText || parseStar(rawText).text) : plainText

        const level = parseInt(h.tagName[1])
        const idx = counters['h' + level]++

        if (level === 1) {
            currentH1 = { index: `h1-${idx}`, text, level, star, children: [], rawEl: h }
            currentH2 = null
            result.push(currentH1)
        } else if (level === 2 && currentH1) {
            currentH2 = { index: `h2-${idx}`, text, level, star, children: [], rawEl: h }
            currentH1.children.push(currentH2)
        } else if (level === 3 && currentH2) {
            currentH2.children.push({ index: `h3-${idx}`, text, level, star, rawEl: h })
        }
    })

    tree.value = result
}

// ==================== 二、展开/折叠动画 ====================

/**
 * 获取展开/折叠按钮的文字（▼ 或 ▶）
 */
function getToggleText(h1) {
    return openStates[h1.index] ? '▼' : '▶'
}

/**
 * 切换 H1 的展开/折叠（手风琴模式）
 */
function toggleH1(h1) {
    // 折叠其他已展开的 H1
    tree.value.forEach(other => {
        if (other !== h1 && openStates[other.index]) {
            openStates[other.index] = false
            animateSubList(other.index, false)
        }
    })
    const next = !openStates[h1.index]
    openStates[h1.index] = next
    animateSubList(h1.index, next)
}

/** 保存子列表 ul 的 DOM 引用 */
function setSubListRef(idx, el) {
    subListEls[idx] = el
}

/**
 * 执行子列表的展开/折叠动画
 * @param {string} idx   h1.index
 * @param {boolean} open true 展开 / false 折叠
 * @param {boolean} instant 是否跳过动画
 */
function animateSubList(idx, open, instant) {
    const ul = subListEls[idx]
    if (!ul) return

    animSeqs[idx] = (animSeqs[idx] || 0) + 1
    const seq = animSeqs[idx]
    ul.style.overflow = 'hidden'
    ul.style.transition = instant ? 'none' : `max-height ${TOC_SUBLIST_ANIM_MS}ms ease, opacity 180ms ease`

    if (open) {
        ul.style.display = 'block'
        if (instant) {
            ul.style.maxHeight = 'none'
            ul.style.opacity = '1'
            ul.style.overflow = 'visible'
            return
        }
        const target = ul.scrollHeight
        ul.style.maxHeight = '0px'
        ul.style.opacity = '0'
        requestAnimationFrame(() => {
            if (animSeqs[idx] !== seq) return
            ul.style.maxHeight = target + 'px'
            ul.style.opacity = '1'
        })
        setTimeout(() => {
            if (animSeqs[idx] !== seq) return
            ul.style.maxHeight = 'none'
            ul.style.overflow = 'visible'
        }, TOC_SUBLIST_ANIM_MS + 40)
    } else {
        if (instant) {
            ul.style.maxHeight = '0px'
            ul.style.opacity = '0'
            ul.style.display = 'none'
            return
        }
        const cur = ul.scrollHeight
        ul.style.maxHeight = cur + 'px'
        ul.style.opacity = '1'
        requestAnimationFrame(() => {
            if (animSeqs[idx] !== seq) return
            ul.style.maxHeight = '0px'
            ul.style.opacity = '0'
        })
        setTimeout(() => {
            if (animSeqs[idx] !== seq) return
            ul.style.display = 'none'
        }, TOC_SUBLIST_ANIM_MS + 40)
    }
}

/**
 * 展开指定索引的 H1（不折叠其他）
 */
function openH1ById(index) {
    if (!index) return
    tree.value.forEach(h1 => {
        const open = h1.index === index
        if (openStates[h1.index] !== open) {
            openStates[h1.index] = open
            animateSubList(h1.index, open)
        }
    })
}

// ==================== 三、激活状态管理 ====================

/**
 * 切换活跃的 H2 节点，并同步目录与页面标题的激活样式
 */
function toggleActiveH2(h2node, instant) {
    const list = tocListRef.value
    if (!list) return

    // 清除旧的 H2 激活状态
    list.querySelectorAll('.toc-h2.is-active').forEach(el => el.classList.remove('is-active'))
    document.querySelectorAll('h2.is-toc-active').forEach(h => h.classList.remove('is-toc-active'))

    // 清除 H3 激活状态
    list.querySelectorAll('.toc-h3.is-active').forEach(el => el.classList.remove('is-active'))
    document.querySelectorAll('h3.is-toc-active').forEach(h => h.classList.remove('is-toc-active'))
    activeH3.value = null
    moveTocBugTo(null)

    if (h2node) {
        const li = list.querySelector(`.toc-h2[data-text="${h2node.text}"]`)
        if (li) li.classList.add('is-active')
        const el = findHeading(h2node.text)
        if (el) el.classList.add('is-toc-active')
    }

    activeH2.value = h2node || null
    moveH2IndicatorTo(h2node ? h2node.index : null, instant)
    if (h2node) scheduleCenterTocItem(h2node.index, instant)
}

/**
 * 切换活跃的 H3 节点，并同步目录与页面标题的激活样式
 */
function toggleActiveH3(h3node, instant) {
    const list = tocListRef.value
    if (!list) return

    list.querySelectorAll('.toc-h3.is-active').forEach(el => el.classList.remove('is-active'))
    document.querySelectorAll('h3.is-toc-active').forEach(h => h.classList.remove('is-toc-active'))

    if (h3node) {
        const li = list.querySelector(`.toc-h3[data-text="${h3node.text}"]`)
        if (li) li.classList.add('is-active')
        const el = findHeading(h3node.text)
        if (el) el.classList.add('is-toc-active')
    }

    activeH3.value = h3node || null
    moveTocBugTo(h3node ? h3node.index : null)
    if (h3node) scheduleCenterTocItem(h3node.index, instant)
}

// ==================== 指示器定位 ====================

/**
 * 移动 H2 活动指示器至当前激活的 H2 链接
 */
function moveH2IndicatorTo(index, instant) {
    const indicator = h2IndicatorRef.value
    const list = tocListRef.value
    if (!indicator || !list) return
    if (!index || !activeH2.value) {
        indicator.style.opacity = '0'
        return
    }

    const anchor = list.querySelector(`.toc-h2.is-active > a`)
    if (!anchor || !anchor.isConnected) {
        indicator.style.opacity = '0'
        return
    }

    const elRect = anchor.getBoundingClientRect()
    const listRect = list.getBoundingClientRect()
    const top = elRect.top - listRect.top + list.scrollTop - 4
    const left = elRect.left - listRect.left - 12
    const width = listRect.right - elRect.left - 2 + 12
    const height = elRect.height + 8

    if (!isFinite(top) || !isFinite(left) || !isFinite(width) || !isFinite(height)) {
        indicator.style.opacity = '0'
        return
    }

    if (instant) indicator.style.transition = 'none'
    indicator.style.transform = `translateY(${Math.round(top)}px)`
    indicator.style.left = `${Math.round(left)}px`
    indicator.style.width = `${Math.round(width)}px`
    indicator.style.height = `${Math.round(height)}px`
    indicator.style.opacity = '1'
    if (instant) requestAnimationFrame(() => { indicator.style.transition = '' })
}

/**
 * 移动 H3 “小虫”至当前激活的 H3 链接
 */
function moveTocBugTo(index) {
    const bug = tocBugRef.value
    const list = tocListRef.value
    if (!bug || !list) return
    if (!index || !activeH3.value) {
        bug.style.opacity = '0'
        return
    }

    const anchor = list.querySelector(`.toc-h3.is-active > a`)
    if (!anchor || !anchor.isConnected) {
        bug.style.opacity = '0'
        return
    }

    const elRect = anchor.getBoundingClientRect()
    const listRect = list.getBoundingClientRect()
    const left = Math.round(elRect.left - listRect.left + list.scrollLeft - 28)
    const top = Math.round(elRect.top - listRect.top + list.scrollTop + (elRect.height - 18) / 2)

    if (!isFinite(left) || !isFinite(top)) {
        bug.style.opacity = '0'
        return
    }

    bug.style.left = left + 'px'
    bug.style.top = top + 'px'
    bug.style.opacity = '1'
    bug.style.width = '18px'
    bug.style.height = '18px'
}

// ==================== 目录居中滚动 ====================

let centerPending = false
let centerTarget = null

/**
 * 调度一次目录项居中操作（使用 rAF 合并同一帧内的多次调用）
 */
function scheduleCenterTocItem(index, instant) {
    const list = tocListRef.value
    if (!list || !index) return
    centerTarget = index
    if (centerPending) return
    centerPending = true
    requestAnimationFrame(() => {
        centerPending = false
        if (!centerTarget) return
        let anchor = list.querySelector(`.toc-h2.is-active > a, .toc-h3.is-active > a`)
        if (!anchor || !anchor.isConnected || anchor.getClientRects().length === 0) return

        const containerHeight = list.clientHeight
        if (containerHeight <= 0) return
        const containerRect = list.getBoundingClientRect()
        const itemRect = anchor.getBoundingClientRect()
        const itemTopInList = itemRect.top - containerRect.top + list.scrollTop
        const desiredTop = itemTopInList - (containerHeight - itemRect.height) / 2
        const maxTop = Math.max(0, list.scrollHeight - containerHeight)
        const nextTop = Math.max(0, Math.min(desiredTop, maxTop))
        if (Math.abs(list.scrollTop - nextTop) < 2) return
        if (instant) list.scrollTop = nextTop
        else list.scrollTo({ top: nextTop, behavior: 'smooth' })
    })
}

// ==================== 四、滚动追踪 ====================

/** 计算页面顶部偏移量（导航栏高度 + 额外间距） */
function getOffsetTop() {
    const nav = document.querySelector('.navbar')
    return nav ? nav.offsetHeight + 20 : 60
}

/** 判断当前 H1 下是否即将到达下一个 H2（用于提前取消 H2 高亮） */
function isNearNextH2Top(h1El, offset) {
    if (!h1El) return false
    const act = offset - 6
    const band = 28
    let node = h1El.nextElementSibling
    while (node) {
        if (!node.tagName) { node = node.nextElementSibling; continue }
        const tag = node.tagName.toLowerCase()
        if (tag === 'h1') break
        if (tag === 'h2') {
            const top = node.getBoundingClientRect().top
            if (top > act) return (top - act) <= band
        }
        node = node.nextElementSibling
    }
    return false
}

/** 在指定 H1 下获取当前可见的 H2 元素 */
function getCurrentH2WithinH1(h1El, offset) {
    if (!h1El) return null
    let node = h1El.nextElementSibling
    let current = null
    const act = offset - 6
    while (node) {
        if (!node.tagName) { node = node.nextElementSibling; continue }
        const tag = node.tagName.toLowerCase()
        if (tag === 'h1') break
        if (tag === 'h2') {
            if (node.getBoundingClientRect().top <= act) current = node
            else break
        }
        node = node.nextElementSibling
    }
    return current
}

/** 在指定 H2 下获取当前可见的 H3 元素 */
function getCurrentH3WithinH2(h2El, offset) {
    if (!h2El) return null
    let node = h2El.nextElementSibling
    let current = null
    const act = offset - 6
    while (node) {
        if (!node.tagName) { node = node.nextElementSibling; continue }
        const tag = node.tagName.toLowerCase()
        if (tag === 'h1' || tag === 'h2') break
        if (tag === 'h3') {
            if (node.getBoundingClientRect().top <= act) current = node
            else break
        }
        node = node.nextElementSibling
    }
    return current
}

/** 根据纯净文本在目录树中递归查找对应节点 */
function getNodeByText(text) {
    for (const h1 of tree.value) {
        if (h1.text === text) return h1
        for (const h2 of h1.children) {
            if (h2.text === text) return h2
            for (const h3 of h2.children) {
                if (h3.text === text) return h3
            }
        }
    }
    return null
}

/** 滚动事件处理：更新进度 & 自动追踪激活标题 */
function updateOnScroll() {
    const content = document.querySelector('.article-content')
    if (!content) return

    // 阅读进度
    const rect = content.getBoundingClientRect()
    const total = Math.max(rect.height, 1)
    const passed = window.innerHeight - rect.top
    progress.value = Math.min(100, Math.max(0, (passed / total) * 100))

    if (Date.now() < tocAutoSyncLockUntil) return

    const offset = getOffsetTop()
    const h1s = content.querySelectorAll('h1')
    let visibleH1 = null
    for (const h of h1s) {
        if (h.getBoundingClientRect().top <= offset) visibleH1 = h
        else break
    }
    if (!visibleH1) return

    const h1Text = visibleH1.dataset.headingPlainText || (visibleH1.textContent || '').trim()
    const h1Node = getNodeByText(h1Text)
    if (!h1Node) return

    openH1ById(h1Node.index)

    if (!isNearNextH2Top(visibleH1, offset)) {
        const h2El = getCurrentH2WithinH1(visibleH1, offset)
        if (h2El) {
            const h2Text = h2El.dataset.headingPlainText || (h2El.textContent || '').trim()
            const h2Node = getNodeByText(h2Text)
            if (h2Node) {
                toggleActiveH2(h2Node, true)
                const h3El = getCurrentH3WithinH2(h2El, offset)
                if (h3El) {
                    const h3Text = h3El.dataset.headingPlainText || (h3El.textContent || '').trim()
                    const h3Node = getNodeByText(h3Text)
                    if (h3Node) {
                        nextTick(() => toggleActiveH3(h3Node, true))
                    }
                }
                return
            }
        }
    }
    toggleActiveH2(null, true)
}

const throttledScroll = () => requestAnimationFrame(updateOnScroll)

// ==================== 五、点击跳转 ====================

/**
 * 处理目录项点击：展开层级、锁定追踪、平滑滚动
 */
function scrollToHeader(node) {
    const el = findHeading(node.text)
    if (!el) return

    const nav = document.querySelector('.navbar')
    const navHeight = nav ? nav.offsetHeight : 0
    const y = el.getBoundingClientRect().top + window.scrollY - navHeight - 10
    const distance = Math.abs(y - window.scrollY)
    const lockMs = Math.max(TOC_SCROLL_LOCK_MIN_MS, Math.min(Math.round(distance * 0.9), TOC_SCROLL_LOCK_MAX_MS))
    tocAutoSyncLockUntil = Date.now() + lockMs

    if (node.level === 1) {
        openH1ById(node.index)
        toggleActiveH2(null, true)
    } else if (node.level === 2) {
        const parentH1 = tree.value.find(h1 => h1.children.some(c => c.index === node.index))
        if (parentH1) openH1ById(parentH1.index)
        toggleActiveH2(node, true)
    } else if (node.level === 3) {
        for (const h1 of tree.value) {
            for (const h2 of h1.children) {
                if (h2.children.some(c => c.index === node.index)) {
                    openH1ById(h1.index)
                    toggleActiveH2(h2, true)
                    nextTick(() => toggleActiveH3(node, true))
                    break
                }
            }
        }
    }

    window.scrollTo({ top: y, behavior: 'smooth' })
    closeOverlay()
}

// ==================== 一、紧凑模式（移动端） ====================

/** 走马灯式目录弹层的响应式开关 */
const isCompact = ref(false)
/** 弹出层是否展开 */
const overlayOpen = ref(false)
/** 右下角悬浮球组容器（目录按钮通过 Teleport 注入其中） */
const fabTarget = ref(null)
/**
 * 紧凑模式媒体查询。
 * 断点从 880 提升到 1024：881–1024 区间原先仍走桌面侧栏（固定 300px 宽），
 * 在 900px 级宽度上会把正文压到约 560px；改为弹层后正文占满整行，平板阅读更舒适。
 * ⚠️ 此常量必须与 <style> 中 `@media (max-width: 1024px)` 完全一致：
 *    JS 决定是否渲染弹层/目录球，CSS 决定弹层的定位与外观，两者错位就会出现
 *    「JS 认为是弹层、CSS 仍按桌面侧栏排版」或反之的破版。
 *    另注：AppNavbar 到 ≤1100px 才切换为抽屉，与本断点相差 76px，不冲突。
 */
const COMPACT_QUERY = '(max-width: 1024px)'
let compactMql = null

/**
 * 打开弹层前 body 上的 overflow 值。
 * 不直接写死 '' 回填，是为了不破坏其它组件（如导航抽屉）可能设置的滚动锁。
 */
let bodyOverflowBeforeLock = ''
/** 是否由本组件锁定了 body 滚动，用于幂等恢复 */
let bodyOverflowLocked = false

function toggleOverlay() {
    if (overlayOpen.value) closeOverlay()
    else openOverlay()
}

function openOverlay() {
    // 幂等：重复调用不重复加监听、不重复覆盖已记录的原始 overflow
    if (overlayOpen.value) return
    overlayOpen.value = true
    // 弹层展开时锁定页面滚动，避免背景跟随滚动
    bodyOverflowBeforeLock = document.body.style.overflow
    bodyOverflowLocked = true
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onOverlayKeyDown)
}

/**
 * 关闭弹层。
 * 幂等：无论弹层是否处于打开状态都可安全调用，并且只要本组件加过滚动锁就一定恢复，
 * 这样「断点切回桌面 / 路由变化 / 组件卸载」等非点击路径也能保证页面恢复可滚动。
 */
function closeOverlay() {
    overlayOpen.value = false
    if (bodyOverflowLocked) {
        document.body.style.overflow = bodyOverflowBeforeLock
        bodyOverflowBeforeLock = ''
        bodyOverflowLocked = false
    }
    window.removeEventListener('keydown', onOverlayKeyDown)
}

function onOverlayKeyDown(e) {
    if (e.key === 'Escape') closeOverlay()
}

/** 响应式断点变化：离开紧凑模式时收起弹层 */
function onCompactChange(matches) {
    isCompact.value = matches
    if (!matches) closeOverlay()
}

/** 当前路由：用于监听路由变化 */
const route = useRoute()

/**
 * 路由变化时收起弹层。
 * 为什么需要：详情页在「文章 A → 文章 B」跳转时会复用同一个组件实例，onUnmounted 不会触发，
 * 若弹层此时是打开的，body 上的 overflow:hidden 就会残留到新文章，页面永久无法滚动。
 * （跳转到完全不同的路由时组件会卸载，onUnmounted 里的 closeOverlay 同样兜住。）
 */
watch(() => route.fullPath, closeOverlay)

/**
 * 调整目录球在悬浮球组中的位置
 * 该组为 flex column-reverse（DOM 越靠前视觉越靠下），
 * 目标视觉顺序（自下而上）：回到顶部 → 目录 → 设置 → 子菜单
 */
function placeFab() {
    const group = fabTarget.value
    if (!group) return
    const fab = group.querySelector(':scope > .toc-fab')
    if (!fab) return
    const topBtn = group.querySelector('.back-to-top-btn')
    const anchor = topBtn ? topBtn.nextElementSibling : null
    if (anchor !== fab && anchor) group.insertBefore(fab, anchor)
}

watch([isCompact, fabTarget], async () => {
    await nextTick()
    placeFab()
})

// ==================== 监听 contentHtml 重建目录 ====================

let rebuildTimer = null
watch(() => props.contentHtml, () => {
    if (rebuildTimer) clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(() => {
        buildTree()
        if (!tree.value.length) return
        tree.value.forEach(h1 => {
            openStates[h1.index] = false
            animateSubList(h1.index, false, true)
        })
    }, 150)
}, { immediate: true })

// ==================== 生命周期 ====================

let listScrollHandler = null

function onResize() {
    moveH2IndicatorTo(activeH2.value?.index, true)
    moveTocBugTo(activeH3.value?.index)
}

onMounted(() => {
    window.addEventListener('scroll', throttledScroll)
    window.addEventListener('resize', onResize)
    // 紧凑模式（移动端目录按钮 + 弹层）
    compactMql = window.matchMedia(COMPACT_QUERY)
    onCompactChange(compactMql.matches)
    compactMql.addEventListener('change', e => onCompactChange(e.matches))
    // 悬浮球组容器（FloatingControls 与本组件同级，挂载后才存在）
    fabTarget.value = document.querySelector('#floating-controls')
    nextTick(placeFab)
    const list = tocListRef.value
    if (list) {
        listScrollHandler = () => {
            moveH2IndicatorTo(activeH2.value?.index, true)
            moveTocBugTo(activeH3.value?.index)
        }
        list.addEventListener('scroll', listScrollHandler)
    }
    setTimeout(updateOnScroll, 300)
    setTimeout(updateOnScroll, 600)
})

onUnmounted(() => {
    window.removeEventListener('scroll', throttledScroll)
    window.removeEventListener('resize', onResize)
    if (compactMql) compactMql.removeEventListener('change', onCompactChange)
    compactMql = null
    // 卸载时恢复 body 滚动锁并移除键盘监听：
    // closeOverlay 已做幂等处理，只在确实加过锁时回填，避免误清其它组件的滚动锁
    closeOverlay()
    const list = tocListRef.value
    if (list && listScrollHandler) list.removeEventListener('scroll', listScrollHandler)
    if (rebuildTimer) clearTimeout(rebuildTimer)
})
</script>

<style scoped>
/* ==================== 整体容器 ==================== */
.blog-toc {
    position: sticky;
    top: 100px;
    align-self: flex-start;
    width: 300px;
    flex: 0 0 300px;
    height: calc(100vh - 140px);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    font-size: 1.08rem;
    background: #fff;
    border-radius: 10px;
    border: 4px solid transparent;
    box-shadow: var(--detail-shadow, 0 16px 34px rgba(44, 62, 80, 0.14));
    transition: width 0.25s;
    /* 渐变边框效果 */
    background:
        linear-gradient(rgba(255, 255, 255, 0.80), rgba(255, 255, 255, 0.80)) padding-box,
        var(--detail-border, linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.92), rgba(167, 243, 208, 0.92))) border-box;
}

/* ==================== 头部 ==================== */
.toc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.toc-title {
    font-weight: bold;
    font-size: 1.08rem;
    color: var(--detail-text, #2b3440);
}

.toc-progress {
    font-weight: 700;
    font-size: 1rem;
    line-height: 1;
    color: #2d8cf0;
    font-variant-numeric: tabular-nums;
}

/* ==================== 列表与滚动条 ==================== */
.toc-list {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    list-style: none;
    padding: 0;
    margin: 0;
    scrollbar-width: none;
    /* Firefox */
    -ms-overflow-style: none;
    /* IE/Edge */
}

.toc-list::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
}

.toc-list li {
    margin-bottom: 7px;
}

/* ==================== 底部 ==================== */
.toc-footer {
    flex: 0 0 auto;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* ==================== 各级标题基础 ==================== */
.toc-h1,
.toc-h2,
.toc-h3 {
    position: relative;
}

/* ==================== H1 样式 ==================== */
.toc-h1>a {
    font-weight: bold;
    font-size: 1.08rem;
    color: rgba(0, 172, 255, 0.95);
}

/* ==================== H2 样式 ==================== */
.toc-h2>a {
    position: relative;
    z-index: 1;
    margin-left: 12px;
    font-size: 1rem;
    color: rgba(72, 219, 187, 0.92);
}

/* 普通激活背景（被动画指示器替代时隐藏） */
.toc-h2.is-active>a::before {
    content: '';
    position: absolute;
    left: -12px;
    right: -2px;
    top: -4px;
    bottom: -4px;
    z-index: 0;
    background: rgba(25, 190, 107, 0.08);
    border-radius: 8px;
}

/* 当使用动画指示器时，隐藏伪元素背景 */
.toc-list.has-animated-h2-indicator .toc-h2.is-active>a::before {
    opacity: 0;
}

/* ==================== H3 样式 ==================== */
.toc-h3>a {
    position: relative;
    z-index: 1;
    display: inline-block;
    margin-left: 24px;
    font-size: 0.95rem;
    color: var(--h3-heading-color, #ff8f9e);
}

.toc-h3>a:hover {
    color: var(--h3-heading-color, #ff8f9e);
}

.toc-h3.is-active>a {
    padding-left: 0;
}

/* H3 不使用伪元素指示器，由小虫替代 */
.toc-h3.is-active>a::before {
    display: none;
}

/* ==================== 子列表 ==================== */
.toc-sub-list {
    list-style: none;
    padding-left: 18px;
    margin: 0;
    display: none;
}

/* H3 子列表由 v-if（activeH2 匹配）控制渲染，渲染即显示；
   H1 子列表由 animateSubList() 通过内联样式控制显示 */
.toc-h3-sub-list {
    display: block;
}

/* ==================== 展开/折叠按钮 ==================== */
.toc-toggle {
    cursor: pointer;
    margin-right: 6px;
    user-select: none;
    color: #aaa;
    font-size: 0.95em;
    transition: color 0.2s;
}

.toc-toggle:hover {
    color: #2d8cf0;
}

/* ==================== 链接通用 ==================== */
.toc-list a {
    text-decoration: none;
    transition: color 0.2s;
}

.toc-list a:hover {
    text-decoration: underline;
    color: #b620e0;
}

.toc-list .toc-h3>a:hover {
    color: var(--h3-heading-color, #ff8f9e);
}

/* ==================== 星标标记 ==================== */
.toc-list a.has-star-marker {
    display: inline-block;
    padding-right: 22px;
}

.toc-item-label {
    min-width: 0;
}

.toc-star-marker {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #f3b51a;
    font-size: 0.95em;
    line-height: 1;
    text-shadow: 0 0 8px rgba(243, 181, 26, 0.28);
}

/* ==================== H2 动画指示器 ==================== */
.toc-h2-active-indicator {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    z-index: 0;
    background: rgba(25, 190, 107, 0.08);
    border-radius: 8px;
    pointer-events: none;
    opacity: 0;
    transform: translateY(0);
    transition:
        transform 220ms ease,
        left 220ms ease,
        width 220ms ease,
        height 220ms ease,
        opacity 160ms ease;
}

/* ==================== H3 “小虫” ==================== */
.toc-bug {
    position: absolute;
    left: 0;
    top: 0;
    width: 18px;
    height: 18px;
    z-index: 3;
    pointer-events: none;
    opacity: 0;
    transform-origin: center center;
    transition:
        left 260ms cubic-bezier(.2, .9, .2, 1),
        top 260ms cubic-bezier(.2, .9, .2, 1),
        opacity 160ms ease,
        transform 600ms ease;
}

.toc-bug img {
    display: block;
    width: 100%;
    height: 100%;
}

/* 闲置时上下浮动动画 */
@keyframes toc-bug-float {
    0% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-4px);
    }

    100% {
        transform: translateY(0);
    }
}

.toc-bug.idle {
    animation: toc-bug-float 3s ease-in-out infinite;
}

/* ==================== 折叠状态 ==================== */
.blog-toc.toc-collapsed {
    width: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    min-width: 0 !important;
    flex: 0 0 0 !important;
    overflow: hidden;
    opacity: 0;
    transition:
        width 0.28s ease,
        opacity 0.28s ease,
        padding 0.28s ease,
        flex 0.28s ease;
}

/* ==================== 紧凑模式（移动端）与弹层 ==================== */
/* 桌面端 toc-root 不生成盒子，内部元素直接作为 .container 的子项参与布局 */
.toc-root {
    display: contents;
}

/* 遮罩层：点击空白处关闭目录 */
.toc-overlay {
    position: fixed;
    inset: 0;
    z-index: 1098;
    background: rgba(24, 40, 52, 0.42);
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.26s ease;
}

.toc-overlay.is-active {
    opacity: 1;
    pointer-events: auto;
}

/* 目录按钮：注入右下角悬浮球组（圆形渐变外观由 .floating-btn 提供）
   尺寸与图标字号直接复用 FloatingControls.vue 定义在 #floating-controls 上的
   --fab-size / --fab-icon-size：Teleport 注入的按钮是它的直接子元素，会继承这两个变量，
   这样目录球在手机(≤480)/小平板(481–900)/平板(901–1100)三档里与同组其它球完全等大，
   不需要在本文件重复维护尺寸断点；回退值 48px / 1.2rem 保证变量缺失时仍不小于 44×44 触控热区。
   选择器加 #floating-controls 前缀提高权重，避免与 FloatingControls 的 .floating-btn 因样式注入顺序不同而互相覆盖。 */
#floating-controls .toc-fab {
    width: var(--fab-size, 48px);
    height: var(--fab-size, 48px);
    padding: 0;
    font-size: var(--fab-icon-size, 1.2rem);
    flex-shrink: 0;
}

/*
 * ==================== 紧凑模式（平板 / 手机）与弹层 ====================
 *
 * ⚠️ 断点 1024px 必须与 script 中的 COMPACT_QUERY 保持一致（见该常量上方注释）。
 * 为什么从 880 提高到 1024：881–1024 原先仍是桌面侧栏（.blog-toc 固定 300px + flex 0 0 300px），
 * 在 900px 级宽度上正文被压到约 560px；切到弹层后正文占满整行，平板（768×1024、1024×768）体验更好。
 * 为什么不跟着 AppNavbar 用 1100：目录在平板上更需要弹层，而导航抽屉在 1100 才切换，
 * 两者错开 76px 并不冲突（1024–1100 区间为「导航仍是横向 + 目录已是弹层」）。
 * 1280×800 / 1100×800 等更宽视口不进入本媒体查询，仍保持与改动前完全一致的桌面侧栏形态。
 */
@media (max-width: 1024px) {

    /* 弹层基础形态：手机竖屏「底部弹出」（bottom sheet）。
       原来用 top:50% + translate(-50%,-50%) 垂直居中，矮屏（横屏手机、分屏、带键盘）上容易上下溢出；
       改为贴底弹出后配合 dvh 高度上限，无论屏高多少都能完整落在视口内。 */
    .blog-toc.in-overlay {
        position: fixed;
        top: auto;
        left: 50%;
        /* 底部偏移叠加安全区：带手势条的机型不会被系统横条盖住 */
        bottom: max(12px, env(safe-area-inset-bottom, 0px));
        align-self: center;
        /* 宽度用 min(92vw, 420px)：窄屏几乎占满，宽一点的手机仍保持弹窗宽度 */
        width: min(92vw, 420px);
        max-width: 92vw;
        height: auto;
        /* 先写 vh 作为不支持 dvh 的浏览器兜底，再用 dvh 覆盖：
           dvh 不随移动浏览器地址栏收放而跳变，避免弹层高度忽大忽小 */
        max-height: min(72vh, 640px);
        max-height: min(72dvh, 640px);
        margin: 0;
        /* 左右留出横向安全区（刘海屏横握），底部再补一条安全区，
           避免内容被圆角/手势条裁掉；整体仍保持 16/18 的原有内边距观感 */
        padding: 16px calc(18px + env(safe-area-inset-right, 0px))
            calc(16px + env(safe-area-inset-bottom, 0px)) calc(18px + env(safe-area-inset-left, 0px));
        z-index: 1099;
        overflow: hidden;
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
        opacity: 0;
        pointer-events: none;
        /* 用向下位移模拟「从底部升起」，比原来的缩小淡入更符合底部弹出的空间感 */
        transform: translate(-50%, 24px) scale(0.98);
        transform-origin: 50% 100%;
        will-change: transform, opacity;
        transition:
            transform 0.3s cubic-bezier(0.2, 0.82, 0.22, 1),
            opacity 0.22s ease;
    }

    .blog-toc.in-overlay.is-open {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, 0) scale(1);
    }

    /* 目录列表：作为独立滚动区，
       - overscroll-behavior: contain 让滚到两端时不再把滚动链传给页面（避免背景被带着晃）；
       - -webkit-overflow-scrolling: touch 显式开启 iOS 惯性滚动。 */
    .blog-toc.in-overlay .toc-list {
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        /* 保底高度：避免页脚（上一篇/下一篇）较高时把列表压到几乎看不见。
           先给 120px，但矮屏（如 480×320 分屏、横屏手机）按 22dvh 收缩，
           否则「列表保底 + 页脚」会一起超过弹层高度上限而被裁掉。 */
        min-height: min(120px, 22vh);
        min-height: min(120px, 22dvh);
    }

    /* 页脚自身也限制高度：文章页脚可能同时含上一篇/下一篇/相似推荐，
       超长时让它在内部滚动，而不是挤占列表的保底高度。 */
    .blog-toc.in-overlay .toc-footer {
        max-height: 30vh;
        max-height: 30dvh;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
    }
}

/*
 * 横屏矮屏（如 844×390，或横屏平板 1024×560）：底部弹出只剩约 300px 高度，
 * 目录头 + 列表 + 页脚会被压扁，因此回到居中弹窗形态，
 * 并把高度上限放宽到 84dvh，让列表拿到足够的滚动空间。
 * 拆成独立媒体查询（而不是嵌套在 1024 那条里）是为了不依赖「条件规则嵌套」的解析差异，
 * 同时让后面的平板档位按源码顺序覆盖它，优先级一目了然。
 */
@media (max-width: 1024px) and (orientation: landscape) and (max-height: 560px) {
    .blog-toc.in-overlay {
        top: 50%;
        bottom: auto;
        max-height: min(84vh, 640px);
        max-height: min(84dvh, 640px);
        transform: translate(-50%, -50%) scale(0.94);
        transform-origin: 50% 50%;
    }

    .blog-toc.in-overlay.is-open {
        transform: translate(-50%, -50%) scale(1);
    }
}

/*
 * 平板档位（721–1024，如 iPad 820×1180、1024×768）：居中弹窗形态，
 * 宽度放宽到 560px 但不超视口的 78%，避免弹层在横屏平板上显得过窄。
 * 放在横屏矮屏规则之后：两者同时命中时（如 844×390、1024×560）以本档位为准，
 * 这样矮屏横屏也能拿到 560px 的宽度与更大的触控热区。
 */
@media (min-width: 721px) and (max-width: 1024px) {
    .blog-toc.in-overlay {
        top: 50%;
        bottom: auto;
        width: min(560px, 78vw);
        max-width: 78vw;
        max-height: min(84vh, 640px);
        max-height: min(84dvh, 640px);
        padding: 18px 22px;
        transform: translate(-50%, -50%) scale(0.94);
        transform-origin: 50% 50%;
    }

    .blog-toc.in-overlay.is-open {
        transform: translate(-50%, -50%) scale(1);
    }

    /* 平板观看距离更远，条目字号略微上调（只调链接，不动 .toc-toggle 的字号） */
    .blog-toc.in-overlay .toc-h1>a {
        font-size: 1.16rem;
    }

    .blog-toc.in-overlay .toc-h2>a {
        font-size: 1.08rem;
    }

    .blog-toc.in-overlay .toc-h3>a {
        font-size: 1.02rem;
    }

    /* 平板以触摸为主：目录条目行高提到 40px，保证手指点击命中率
       （桌面端不进入本媒体查询，仍保持原有紧凑行距） */
    .blog-toc.in-overlay .toc-h1>a,
    .blog-toc.in-overlay .toc-h2>a,
    .blog-toc.in-overlay .toc-h3>a {
        line-height: 40px;
    }

    /* 展开/折叠箭头热区扩大到 32×32：用 padding 撑开，字号保持不变 */
    .blog-toc.in-overlay .toc-toggle {
        display: inline-block;
        min-width: 32px;
        min-height: 32px;
        padding: 4px;
        margin-right: 2px;
        line-height: 24px;
        text-align: center;
        box-sizing: border-box;
        vertical-align: middle;
    }
}

/*
 * ==================== 沉浸模式兜底 ====================
 * 1) 沉浸模式下桌面侧栏需要隐藏目录（BlogDetailView 已有同条件规则），这里再声明一次作为兜底，
 *    保证组件被复用到没有该规则的页面时，沉浸态不会残留一个点了没反应的目录球。
 *    条件与对方完全一致（同样排除 .immersive-mobile-mode），不会与对方规则冲突。
 * 2) BlogDetailView 为了隐藏桌面侧栏写了 `.immersive-reading-active .blog-toc { display: none }`，
 *    该规则会连移动端弹层一起隐藏，导致「沉浸模式下目录球可点却弹不出内容」；
 *    这里仅在弹层已打开（.is-open）时恢复显示，权重(0,6,0)高于对方(0,4,0)，不依赖样式注入顺序。
 *    桌面端不会命中本规则：.in-overlay 只在紧凑模式（isCompact）下才渲染。
 */
.blog-detail-page.immersive-reading-active:not(.immersive-mobile-mode) .toc-fab {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
}

.blog-detail-page.immersive-reading-active .blog-toc.in-overlay.is-open {
    display: flex;
}

@media (prefers-reduced-motion: reduce) {

    .toc-overlay,
    .blog-toc.in-overlay {
        transition: none !important;
    }
}
</style>