<template>
    <nav class="blog-toc" :class="{ 'toc-collapsed': collapsed }">
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
}

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

/* ==================== 紧凑模式与弹层 ==================== */
body.toc-compact-mode .blog-toc:not(.in-overlay) {
    display: none !important;
}

.toc-fab {
    width: 48px;
    height: 48px;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
}

.toc-fab:active {
    transform: scale(0.98);
}

.toc-overlay {
    position: fixed;
    inset: 0;
    z-index: 1098;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.26s ease;
}

.toc-overlay.is-active {
    opacity: 1;
    pointer-events: auto;
}

.toc-overlay .blog-toc.in-overlay {
    position: relative;
    top: auto;
    align-self: center;
    width: min(88vw, 420px);
    flex: 0 0 auto;
    max-height: min(78vh, 680px);
    margin: 0;
    overflow: hidden;
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
    transform: translate(var(--toc-pop-dx, 0), var(--toc-pop-dy, 0)) scale(0.2);
    opacity: 0;
    will-change: transform, opacity;
    transition:
        transform 0.32s cubic-bezier(0.2, 0.82, 0.22, 1),
        opacity 0.24s ease;
}

.toc-overlay .blog-toc.in-overlay.is-open {
    transform: translate(0, 0) scale(1);
    opacity: 1;
}

@media (max-width: 880px) {
    body.toc-compact-mode .toc-fab {
        display: inline-flex;
    }
}
</style>