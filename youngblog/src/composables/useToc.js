/**
 * 目录组合式函数（完全复刻老代码 blog-detail.js 的 generateTOC）
 * 使用 DOM 操作直接构建目录，保持与原有行为完全一致
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

export function useToc(contentRef, tocListRef) {
    // 响应式状态（供父组件使用）
    const activeId = ref(null)
    const progress = ref(0)

    // 内部状态（与老代码对应）
    let activeH1Id = null
    let lastUrlH1Id = null
    let tocAutoSyncLockUntil = 0
    let activeH2Li = null
    let activeH3Li = null
    let tocCenterPending = false
    let tocCenterTargetLi = null
    const h1Map = new Map()
    const h2Map = new Map()
    const h3Map = new Map()
    const h3ParentH2IdMap = new Map()

    // ----- 辅助函数（从老代码复制） -----
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value))
    }

    function setSubListState(ul, open, instant) {
        if (!ul) return
        const hasState = ul.dataset.open === '1' || ul.dataset.open === '0'
        const wasOpen = ul.dataset.open === '1'
        if (hasState && wasOpen === !!open) {
            if (open) {
                ul.style.display = 'block'
                ul.style.maxHeight = 'none'
                ul.style.opacity = '1'
                ul.style.overflow = 'visible'
            }
            return
        }
        if (ul.__tocAnimTimer) {
            clearTimeout(ul.__tocAnimTimer)
            ul.__tocAnimTimer = null
        }
        const seq = (Number(ul.dataset.animSeq || '0') || 0) + 1
        ul.dataset.animSeq = String(seq)
        ul.dataset.open = open ? '1' : '0'
        ul.style.overflow = 'hidden'
        ul.style.transition = instant ? 'none' : 'max-height 220ms ease, opacity 180ms ease'

        if (open) {
            ul.style.display = 'block'
            const target = ul.scrollHeight
            if (instant) {
                ul.style.maxHeight = 'none'
                ul.style.opacity = '1'
                ul.style.overflow = 'visible'
                return
            }
            ul.style.maxHeight = '0px'
            ul.style.opacity = '0'
            requestAnimationFrame(() => {
                if (ul.dataset.animSeq !== String(seq) || ul.dataset.open !== '1') return
                ul.style.maxHeight = target + 'px'
                ul.style.opacity = '1'
            })
            ul.__tocAnimTimer = setTimeout(() => {
                if (ul.dataset.animSeq !== String(seq) || ul.dataset.open !== '1') return
                ul.style.maxHeight = 'none'
                ul.style.overflow = 'visible'
            }, 260)
            return
        }

        const current = ul.scrollHeight
        ul.style.display = 'block'
        if (instant) {
            ul.style.maxHeight = '0px'
            ul.style.opacity = '0'
            ul.style.display = 'none'
            return
        }
        ul.style.maxHeight = current + 'px'
        ul.style.opacity = '1'
        requestAnimationFrame(() => {
            if (ul.dataset.animSeq !== String(seq) || ul.dataset.open !== '0') return
            ul.style.maxHeight = '0px'
            ul.style.opacity = '0'
        })
        ul.__tocAnimTimer = setTimeout(() => {
            if (ul.dataset.animSeq !== String(seq) || ul.dataset.open !== '0') return
            ul.style.display = 'none'
        }, 260)
    }

    function updateTocProgress(contentEl) {
        if (!contentEl) return
        const rect = contentEl.getBoundingClientRect()
        const viewportBottom = window.innerHeight || document.documentElement.clientHeight || 0
        const total = Math.max(rect.height, 1)
        const passed = viewportBottom - rect.top
        const ratio = Math.max(0, Math.min(1, passed / total))
        progress.value = Math.round(ratio * 100)
    }

    function openH1ById(h1Id) {
        if (!h1Id || !h1Map.has(h1Id)) return
        const currentH1Li = h1Map.get(h1Id)
        const currentSubList = currentH1Li ? currentH1Li.querySelector('ul') : null
        if (activeH1Id === h1Id && (!currentSubList || currentSubList.dataset.open === '1')) return

        document.querySelectorAll('.toc-h1 > .toc-sub-list').forEach(function (ul) {
            setSubListState(ul, false)
        })
        document.querySelectorAll('.toc-h1 > .toc-toggle').forEach(function (t) {
            t.textContent = '▶'
        })

        const h1Li = h1Map.get(h1Id)
        if (!h1Li) {
            activeH1Id = h1Id
            return
        }
        const ul = h1Li.querySelector('ul')
        const toggle = h1Li.querySelector('.toc-toggle')
        if (ul) setSubListState(ul, true)
        if (toggle) toggle.textContent = '▼'

        activeH1Id = h1Id
        syncActiveH2WithSubList()
    }

    function scrollToHeaderAndExpand(e, headerId, contentEl) {
        e.preventDefault()
        const header = document.getElementById(headerId)
        if (!header) return
        let h1Id = null
        if (header.tagName.toLowerCase() === 'h1') {
            h1Id = header.id
            setActiveH2(null, null, true)
            setActiveH3(null, null)
        } else if (header.tagName.toLowerCase() === 'h2' || header.tagName.toLowerCase() === 'h3') {
            let prev = header.previousElementSibling
            while (prev) {
                if (prev.tagName && prev.tagName.toLowerCase() === 'h1') {
                    h1Id = prev.id
                    break
                }
                prev = prev.previousElementSibling
            }
        }
        openH1ById(h1Id)
        if (header.tagName.toLowerCase() === 'h2') {
            const h2Li = h2Map.get(header.id)
            setActiveH2(h2Li || null, header, true)
            setActiveH3(null, null)
        } else if (header.tagName.toLowerCase() === 'h3') {
            const parentH2 = getParentH2ForHeading(header)
            const h2Li = parentH2 && parentH2.id ? h2Map.get(parentH2.id) : null
            setActiveH2(h2Li || null, parentH2 || null, true)
            const h3Li = h3Map.get(header.id)
            setActiveH3(h3Li || null, header)
        }
        refreshActiveH2IndicatorSoon()

        const nav = document.querySelector('.navbar')
        const navHeight = nav ? nav.offsetHeight : 0
        if (window.__scrollingToTOC) return
        window.__scrollingToTOC = true
        const y = header.getBoundingClientRect().top + window.scrollY - navHeight - 10
        const distance = Math.abs(y - window.scrollY)
        const lockMs = clamp(Math.round(distance * 0.9), 650, 2200)
        tocAutoSyncLockUntil = Date.now() + lockMs
        window.scrollTo({ top: y, behavior: 'smooth' })
        setTimeout(function () {
            window.__scrollingToTOC = false
        }, lockMs)
        try {
            history.replaceState(null, '', '#' + headerId)
        } catch (_) { }
    }

    function getRelativeOffset(el, ancestor) {
        let top = 0, left = 0, node = el
        while (node && node !== ancestor) {
            top += node.offsetTop || 0
            left += node.offsetLeft || 0
            node = node.offsetParent
        }
        if (node !== ancestor) return null
        return { top, left }
    }

    function getH2IndicatorReachWidth(anchorRect, listRect) {
        const leftInList = anchorRect.left - listRect.left
        const rightPadding = 2
        const reach = listRect.width - leftInList - rightPadding
        return Math.max(0, Math.round(reach))
    }

    function moveH2IndicatorTo(li, instant) {
        const h2Indicator = document.querySelector('.toc-h2-active-indicator')
        if (!h2Indicator) return
        if (!li) {
            h2Indicator.style.opacity = '0'
            return
        }
        const tocList = document.getElementById('toc-list')
        if (!li.isConnected || !tocList.contains(li) || li.getClientRects().length === 0) {
            h2Indicator.style.opacity = '0'
            return
        }
        const ownerSubList = li.closest('.toc-sub-list')
        if (ownerSubList && ownerSubList.dataset.open !== '1') {
            h2Indicator.style.opacity = '0'
            return
        }
        const anchor = li.querySelector(':scope > a')
        if (!anchor || anchor.getClientRects().length === 0) {
            h2Indicator.style.opacity = '0'
            return
        }
        const relative = getRelativeOffset(anchor, tocList)
        if (!relative) {
            h2Indicator.style.opacity = '0'
            return
        }
        const listRect = tocList.getBoundingClientRect()
        const anchorRect = anchor.getBoundingClientRect()
        const top = relative.top - 4
        const left = relative.left - 12
        const width = getH2IndicatorReachWidth(anchorRect, listRect) + 12
        const height = anchorRect.height + 8
        if (!isFinite(top) || !isFinite(left) || !isFinite(width) || !isFinite(height)) {
            h2Indicator.style.opacity = '0'
            return
        }
        if (instant) h2Indicator.style.transition = 'none'
        else h2Indicator.style.transition = ''
        h2Indicator.style.transform = 'translateY(' + Math.round(top) + 'px)'
        h2Indicator.style.left = Math.round(left) + 'px'
        h2Indicator.style.width = Math.round(width) + 'px'
        h2Indicator.style.height = Math.round(height) + 'px'
        h2Indicator.style.opacity = '1'
        if (instant) {
            requestAnimationFrame(() => { h2Indicator.style.transition = '' })
        }
    }

    function moveTocBugTo(li) {
        const bug = document.getElementById('toc-bug')
        if (!bug) return
        if (!li) {
            bug.style.opacity = '0'
            return
        }
        const tocList = document.getElementById('toc-list')
        if (!li.isConnected || !tocList.contains(li) || li.getClientRects().length === 0) {
            bug.style.opacity = '0'
            return
        }
        const anchor = li.querySelector(':scope > a')
        if (!anchor || anchor.getClientRects().length === 0) {
            bug.style.opacity = '0'
            return
        }
        const relative = getRelativeOffset(anchor, tocList)
        if (!relative) {
            bug.style.opacity = '0'
            return
        }
        const anchorRect = anchor.getBoundingClientRect()
        const bugWidth = 18, bugHeight = 18
        const left = Math.round(relative.left - bugWidth - 10)
        const top = Math.round(relative.top + (anchorRect.height - bugHeight) / 2)
        if (!isFinite(left) || !isFinite(top)) {
            bug.style.opacity = '0'
            return
        }
        bug.style.left = left + 'px'
        bug.style.top = top + 'px'
        bug.style.width = bugWidth + 'px'
        bug.style.height = bugHeight + 'px'
        bug.style.opacity = '1'
    }

    function scheduleCenterTocItem(li, instant) {
        const tocList = document.getElementById('toc-list')
        if (!tocList || !li || !li.isConnected) return
        tocCenterTargetLi = li
        if (tocCenterPending) return
        tocCenterPending = true
        requestAnimationFrame(function () {
            tocCenterPending = false
            const target = tocCenterTargetLi
            if (!target || !target.isConnected) return
            const anchor = target.querySelector(':scope > a')
            const targetEl = (anchor && anchor.getClientRects().length > 0) ? anchor : target
            if (!targetEl || targetEl.getClientRects().length === 0) return
            const containerHeight = tocList.clientHeight || 0
            if (containerHeight <= 0) return
            const containerRect = tocList.getBoundingClientRect()
            const itemRect = targetEl.getBoundingClientRect()
            const itemTopInList = itemRect.top - containerRect.top + tocList.scrollTop
            const desiredTop = itemTopInList - (containerHeight - itemRect.height) / 2
            const maxTop = Math.max(0, tocList.scrollHeight - containerHeight)
            const nextTop = Math.max(0, Math.min(desiredTop, maxTop))
            if (Math.abs(tocList.scrollTop - nextTop) < 2) return
            if (instant) tocList.scrollTop = nextTop
            else tocList.scrollTo({ top: nextTop, behavior: 'smooth' })
        })
    }

    function setActiveH2(li, headingEl, instant) {
        const content = document.getElementById('markdown-content')
        if (!content) return
        const nextLi = li || null
        const nextHeading = headingEl || null
        const currentHeading = content.querySelector('h2.is-toc-active')
        if (activeH2Li === nextLi && currentHeading === nextHeading) {
            moveH2IndicatorTo(activeH2Li, true)
            if (activeH2Li) scheduleCenterTocItem(activeH2Li, instant)
            return
        }
        document.querySelectorAll('.toc-h2.is-active').forEach(el => el.classList.remove('is-active'))
        content.querySelectorAll('h2.is-toc-active').forEach(h => h.classList.remove('is-toc-active'))
        activeH2Li = nextLi
        if (nextLi) nextLi.classList.add('is-active')
        if (nextHeading) nextHeading.classList.add('is-toc-active')
        setH3SubListOpenForH2Li(activeH2Li, instant)
        moveH2IndicatorTo(activeH2Li, instant)
        if (activeH2Li) scheduleCenterTocItem(activeH2Li, instant)
    }

    function setActiveH3(li, headingEl, instant) {
        const content = document.getElementById('markdown-content')
        if (!content) return
        const nextLi = li || null
        const nextHeading = headingEl || null
        const currentHeading = content.querySelector('h3.is-toc-active')
        if (activeH3Li === nextLi && currentHeading === nextHeading) {
            moveTocBugTo(activeH3Li)
            if (activeH3Li) scheduleCenterTocItem(activeH3Li, instant)
            return
        }
        document.querySelectorAll('.toc-h3.is-active').forEach(el => el.classList.remove('is-active'))
        content.querySelectorAll('h3.is-toc-active').forEach(h => h.classList.remove('is-toc-active'))
        activeH3Li = nextLi
        if (nextLi) nextLi.classList.add('is-active')
        if (nextHeading) nextHeading.classList.add('is-toc-active')
        moveTocBugTo(activeH3Li)
        if (activeH3Li) scheduleCenterTocItem(activeH3Li, instant)
    }

    function getCurrentH2WithinH1(h1El, offset) {
        if (!h1El) return null
        let node = h1El.nextElementSibling
        let currentH2 = null
        const activationOffset = offset - 6
        while (node) {
            if (!node.tagName) { node = node.nextElementSibling; continue }
            const tag = node.tagName.toLowerCase()
            if (tag === 'h1') break
            if (tag === 'h2') {
                const r = node.getBoundingClientRect()
                if (r.top <= activationOffset) currentH2 = node
                else break
            }
            node = node.nextElementSibling
        }
        return currentH2
    }

    function getCurrentH3WithinH2(h2El, offset) {
        if (!h2El) return null
        let node = h2El.nextElementSibling
        let currentH3 = null
        const activationOffset = offset - 6
        while (node) {
            if (!node.tagName) { node = node.nextElementSibling; continue }
            const tag = node.tagName.toLowerCase()
            if (tag === 'h1' || tag === 'h2') break
            if (tag === 'h3') {
                const r = node.getBoundingClientRect()
                if (r.top <= activationOffset) currentH3 = node
                else break
            }
            node = node.nextElementSibling
        }
        return currentH3
    }

    function isNearNextH2Top(h1El, offset) {
        if (!h1El) return false
        const activationOffset = offset - 6
        const transitionBand = 28
        let node = h1El.nextElementSibling
        while (node) {
            if (!node.tagName) { node = node.nextElementSibling; continue }
            const tag = node.tagName.toLowerCase()
            if (tag === 'h1') break
            if (tag === 'h2') {
                const top = node.getBoundingClientRect().top
                if (top > activationOffset) {
                    return (top - activationOffset) <= transitionBand
                }
            }
            node = node.nextElementSibling
        }
        return false
    }

    function getParentH2ForHeading(headingEl) {
        if (!headingEl) return null
        if (headingEl.tagName && headingEl.tagName.toLowerCase() === 'h2') return headingEl
        let prev = headingEl.previousElementSibling
        while (prev) {
            if (prev.tagName) {
                const tag = prev.tagName.toLowerCase()
                if (tag === 'h2') return prev
                if (tag === 'h1') break
            }
            prev = prev.previousElementSibling
        }
        return null
    }

    function setH3SubListOpenForH2Li(targetH2Li, instant) {
        document.querySelectorAll('.toc-h2 > .toc-sub-list').forEach(function (ul) {
            const shouldOpen = !!targetH2Li && ul.parentElement === targetH2Li
            setSubListState(ul, shouldOpen, instant)
        })
    }

    function parseHeadingLabelWithStar(rawText) {
        const txt = String(rawText || '').trim()
        const re = /(?:【\s*[!！]\s*】|\[\s*[!！]\s*\]|［\s*[!！]\s*］)\s*$/
        return {
            text: txt.replace(re, '').trim(),
            star: re.test(txt)
        }
    }

    function createTocAnchor(header) {
        const plain = header && header.dataset ? (header.dataset.headingPlainText || '') : ''
        const marked = header && header.dataset ? (header.dataset.starMarked === '1') : false
        const meta = marked ?
            { text: plain || ((header && header.textContent) || '').replace(/★\s*$/, '').trim(), star: true } :
            parseHeadingLabelWithStar(plain || (header && header.textContent))
        const a = document.createElement('a')
        a.setAttribute('href', '#' + header.id)
        const label = document.createElement('span')
        label.className = 'toc-item-label'
        label.textContent = meta.text || (header && header.textContent) || ''
        a.appendChild(label)
        if (meta.star) {
            a.classList.add('has-star-marker')
            const star = document.createElement('span')
            star.className = 'toc-star-marker'
            star.setAttribute('aria-hidden', 'true')
            star.textContent = '★'
            a.appendChild(star)
        }
        return a
    }

    function syncActiveH2WithSubList() {
        if (!activeH2Li) return
        const subList = activeH2Li.closest('.toc-sub-list')
        if (!subList) return
        if (subList.dataset.open !== '1') {
            setActiveH2(null, null, true)
            setActiveH3(null, null)
        }
    }

    function refreshActiveH2IndicatorSoon() {
        requestAnimationFrame(function () {
            moveH2IndicatorTo(activeH2Li, true)
            moveTocBugTo(activeH3Li)
        })
        setTimeout(function () {
            moveH2IndicatorTo(activeH2Li, true)
            moveTocBugTo(activeH3Li)
        }, 280)
    }

    // ----- 主生成函数（从老代码复制并适配） -----
    function generateToc(contentEl, tocListEl) {
        if (!contentEl || !tocListEl) return

        // 清空并重置
        tocListEl.innerHTML = ''
        tocListEl.classList.add('has-animated-h2-indicator')
        h1Map.clear()
        h2Map.clear()
        h3Map.clear()
        h3ParentH2IdMap.clear()
        activeH1Id = null
        lastUrlH1Id = null
        activeH2Li = null
        activeH3Li = null

        // 创建高亮指示器和源石虫
        const h2Indicator = document.createElement('div')
        h2Indicator.className = 'toc-h2-active-indicator'
        tocListEl.appendChild(h2Indicator)

        const tocBug = document.createElement('div')
        tocBug.id = 'toc-bug'
        tocBug.className = 'toc-bug'
        const bugImg = document.createElement('img')
        bugImg.src = 'assets/images/task/correct.png'
        bugImg.alt = ''
        tocBug.appendChild(bugImg)
        tocListEl.appendChild(tocBug)

        // 收集标题
        const headers = Array.from(contentEl.querySelectorAll('h1, h2, h3'))
        let lastH1 = null, lastH2 = null

        headers.forEach(function (header, idx) {
            if (!header.id) header.id = 'toc-h-' + idx
            const tag = header.tagName.toLowerCase()
            if (tag === 'h1') {
                lastH1 = document.createElement('li')
                lastH1.className = 'toc-h1'
                const toggle = document.createElement('span')
                toggle.className = 'toc-toggle'
                toggle.title = '展开/收起'
                toggle.textContent = '▶'
                lastH1.appendChild(toggle)
                lastH1.appendChild(createTocAnchor(header))
                tocListEl.appendChild(lastH1)
                h1Map.set(header.id, lastH1)
                lastH2 = null
                lastH1.querySelector('a').addEventListener('click', function (e) {
                    scrollToHeaderAndExpand(e, header.id, contentEl)
                })
            } else if (tag === 'h2') {
                if (!lastH1) return
                let ul = lastH1.querySelector('ul')
                if (!ul) {
                    ul = document.createElement('ul')
                    ul.className = 'toc-sub-list'
                    lastH1.appendChild(ul)
                }
                lastH2 = document.createElement('li')
                lastH2.className = 'toc-h2'
                lastH2.appendChild(createTocAnchor(header))
                ul.appendChild(lastH2)
                h2Map.set(header.id, lastH2)
                lastH2.querySelector('a').addEventListener('click', function (e) {
                    scrollToHeaderAndExpand(e, header.id, contentEl)
                })
            } else if (tag === 'h3') {
                if (!lastH2) return
                let ul = lastH2.querySelector('ul')
                if (!ul) {
                    ul = document.createElement('ul')
                    ul.className = 'toc-sub-list toc-h3-sub-list'
                    lastH2.appendChild(ul)
                }
                const h3Li = document.createElement('li')
                h3Li.className = 'toc-h3'
                h3Li.appendChild(createTocAnchor(header))
                ul.appendChild(h3Li)
                h3Map.set(header.id, h3Li)
                const parentLink = lastH2.querySelector('a[href^="#"]')
                const parentH2Id = parentLink ? parentLink.getAttribute('href').slice(1) : null
                if (parentH2Id) h3ParentH2IdMap.set(header.id, parentH2Id)
                h3Li.querySelector('a').addEventListener('click', function (e) {
                    scrollToHeaderAndExpand(e, header.id, contentEl)
                })
            }
        })

        // 初始折叠所有子列表
        document.querySelectorAll('.toc-h1 > .toc-sub-list, .toc-h2 > .toc-sub-list').forEach(function (ul) {
            setSubListState(ul, false, true)
        })

        // H1 折叠按钮事件
        document.querySelectorAll('.toc-h1 > .toc-toggle').forEach(function (toggle) {
            toggle.addEventListener('click', function (e) {
                e.stopPropagation()
                const h1Li = this.parentElement
                const ul = this.parentElement.querySelector('ul')
                if (!ul) return
                const isOpen = ul.dataset.open === '1'
                document.querySelectorAll('.toc-h1 > .toc-sub-list').forEach(function (otherUl) {
                    setSubListState(otherUl, false)
                    const t = otherUl.parentElement.querySelector('.toc-toggle')
                    if (t) t.textContent = '▶'
                })
                if (!isOpen) {
                    setSubListState(ul, true)
                    this.textContent = '▼'
                    const h1Link = h1Li.querySelector('a[href^="#"]')
                    activeH1Id = h1Link ? h1Link.getAttribute('href').slice(1) : activeH1Id
                } else {
                    setSubListState(ul, false)
                    this.textContent = '▶'
                    activeH1Id = null
                }
                syncActiveH2WithSubList()
            })
        })

        // 滚动处理
        const scrollHandler = function () {
            updateTocProgress(contentEl)
            if (window.__scrollingToTOC) return
            if (Date.now() < tocAutoSyncLockUntil) return

            const h1s = Array.from(contentEl.querySelectorAll('h1'))
            let current = null
            const nav = document.querySelector('.navbar')
            const offset = (nav ? nav.offsetHeight : 0) + 20
            for (let i = 0; i < h1s.length; i++) {
                const rect = h1s[i].getBoundingClientRect()
                if (rect.top <= offset) {
                    current = h1s[i]
                } else {
                    break
                }
            }
            if (!current || !current.id) return
            openH1ById(current.id)

            try {
                if (isNearNextH2Top(current, offset)) {
                    setActiveH2(null, null, true)
                    setActiveH3(null, null)
                } else {
                    const currentH2 = getCurrentH2WithinH1(current, offset)
                    if (currentH2 && currentH2.id) {
                        const li = h2Map.get(currentH2.id)
                        setActiveH2(li || null, currentH2)
                        const currentH3 = getCurrentH3WithinH2(currentH2, offset)
                        if (currentH3 && currentH3.id) {
                            setActiveH3(h3Map.get(currentH3.id) || null, currentH3)
                        } else {
                            setActiveH3(null, null)
                        }
                    } else {
                        setActiveH2(null, null)
                        setActiveH3(null, null)
                    }
                }
            } catch (_) { }

            if (lastUrlH1Id !== current.id) {
                lastUrlH1Id = current.id
                try {
                    history.replaceState(null, '', '#' + current.id)
                } catch (_) { }
            }

            // 更新 activeId 供父组件使用（仅 h2 或 h3）
            const activeHeading = contentEl.querySelector('h2.is-toc-active, h3.is-toc-active')
            activeId.value = activeHeading ? activeHeading.id : null
        }

        // 注册滚动和 resize 监听
        const throttledScroll = function () { requestAnimationFrame(scrollHandler) }
        window.addEventListener('scroll', throttledScroll)
        window.addEventListener('resize', function () {
            updateTocProgress(contentEl)
            moveH2IndicatorTo(activeH2Li, true)
            moveTocBugTo(activeH3Li)
        })
        tocListEl.addEventListener('scroll', function () {
            moveH2IndicatorTo(activeH2Li, true)
            moveTocBugTo(activeH3Li)
        })

        // hash 变化处理
        function openCurrentH1ByHash() {
            if (!location.hash) return
            let target = null
            try {
                const decodedId = decodeURIComponent(location.hash.slice(1))
                target = document.getElementById(decodedId)
            } catch (_) {
                try { target = document.querySelector(location.hash) } catch (__) { }
            }
            if (!target) return
            let h1Id = null
            if (target.tagName.toLowerCase() === 'h1') {
                h1Id = target.id
            } else if (target.tagName.toLowerCase() === 'h2' || target.tagName.toLowerCase() === 'h3') {
                let prev = target.previousElementSibling
                while (prev) {
                    if (prev.tagName && prev.tagName.toLowerCase() === 'h1') {
                        h1Id = prev.id
                        break
                    }
                    prev = prev.previousElementSibling
                }
            }
            openH1ById(h1Id)
            if (target.tagName.toLowerCase() === 'h2') {
                setActiveH2(h2Map.get(target.id) || null, target, true)
                setActiveH3(null, null)
            } else if (target.tagName.toLowerCase() === 'h3') {
                const parentH2Id = h3ParentH2IdMap.get(target.id)
                const parentH2 = parentH2Id ? document.getElementById(parentH2Id) : getParentH2ForHeading(target)
                const h2Li = parentH2 && parentH2.id ? h2Map.get(parentH2.id) : null
                setActiveH2(h2Li || null, parentH2 || null, true)
                setActiveH3(h3Map.get(target.id) || null, target)
            }
            refreshActiveH2IndicatorSoon()
        }

        window.addEventListener('hashchange', function () {
            openCurrentH1ByHash()
            try {
                let target = null
                if (location.hash) {
                    try {
                        const decodedId = decodeURIComponent(location.hash.slice(1))
                        target = document.getElementById(decodedId)
                    } catch (_) {
                        try { target = document.querySelector(location.hash) } catch (__) { }
                    }
                }
                if (target && target.tagName.toLowerCase() === 'h2') {
                    const li = h2Map.get(target.id)
                    setActiveH2(li || null, target)
                    setActiveH3(null, null)
                } else if (target && target.tagName.toLowerCase() === 'h3') {
                    const parentH2Id = h3ParentH2IdMap.get(target.id)
                    const parentH2 = parentH2Id ? document.getElementById(parentH2Id) : getParentH2ForHeading(target)
                    const h2Li = parentH2 && parentH2.id ? h2Map.get(parentH2.id) : null
                    setActiveH2(h2Li || null, parentH2 || null)
                    setActiveH3(h3Map.get(target.id) || null, target)
                } else {
                    setActiveH2(null, null)
                    setActiveH3(null, null)
                }
            } catch (_) { }
        })

        // 初始打开 hash
        openCurrentH1ByHash()
        try {
            if (location.hash) {
                let target = null
                try {
                    const decodedId = decodeURIComponent(location.hash.slice(1))
                    target = document.getElementById(decodedId)
                } catch (_) {
                    try { target = document.querySelector(location.hash) } catch (__) { }
                }
                if (target && target.tagName.toLowerCase() === 'h2' && h2Map.has(target.id)) {
                    setActiveH2(h2Map.get(target.id), target, true)
                    setActiveH3(null, null)
                } else if (target && target.tagName.toLowerCase() === 'h3') {
                    const parentH2Id = h3ParentH2IdMap.get(target.id)
                    const parentH2 = parentH2Id ? document.getElementById(parentH2Id) : getParentH2ForHeading(target)
                    const h2Li = parentH2 && parentH2.id ? h2Map.get(parentH2.id) : null
                    setActiveH2(h2Li || null, parentH2 || null, true)
                    setActiveH3(h3Map.get(target.id) || null, target)
                }
            }
        } catch (_) { }

        // 初始进度
        updateTocProgress(contentEl)

        // 存储清理函数
        return function cleanup() {
            window.removeEventListener('scroll', throttledScroll)
            window.removeEventListener('hashchange', openCurrentH1ByHash)
        }
    }

    // ----- 对外接口 -----
    const cleanupFn = ref(null)

    function generate(contentEl, tocListEl) {
        if (cleanupFn.value) {
            cleanupFn.value()
            cleanupFn.value = null
        }
        if (contentEl && tocListEl) {
            cleanupFn.value = generateToc(contentEl, tocListEl)
        }
    }

    // 提供给父组件的手动滚动方法（与老代码 scrollToHeaderAndExpand 类似）
    function scrollToHeading(id, contentEl) {
        const header = document.getElementById(id)
        if (!header) return
        const nav = document.querySelector('.navbar')
        const navHeight = nav ? nav.offsetHeight : 0
        const y = header.getBoundingClientRect().top + window.scrollY - navHeight - 10
        window.scrollTo({ top: y, behavior: 'smooth' })
        // 更新 active 状态（尽量匹配）
        if (header.tagName.toLowerCase() === 'h2') {
            const li = h2Map.get(id)
            setActiveH2(li || null, header, true)
            setActiveH3(null, null)
        } else if (header.tagName.toLowerCase() === 'h3') {
            const parentH2 = getParentH2ForHeading(header)
            const h2Li = parentH2 && parentH2.id ? h2Map.get(parentH2.id) : null
            setActiveH2(h2Li || null, parentH2 || null, true)
            const h3Li = h3Map.get(id)
            setActiveH3(h3Li || null, header)
        }
        refreshActiveH2IndicatorSoon()
        try {
            history.replaceState(null, '', '#' + id)
        } catch (_) { }
    }

    return {
        activeId,    // 当前高亮的标题 ID
        progress,    // 阅读进度 0-100
        generate,    // 生成目录（传入 contentEl 和 tocListEl）
        scrollToHeading // 供外部点击调用
    }
}