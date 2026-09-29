/**
 * 代码块增强组合式函数
 * 功能：添加行号、复制按钮、折叠/展开（带平滑动画）
 * 依赖：useI18nStore
 */
import { useI18nStore } from '@/stores/i18nStore'
import { useMermaid } from '@/composables/useMermaid'

export function useCodeBlock() {
    const i18n = useI18nStore()
    // Mermaid 全屏查看器（复用 useMermaid 中已有的实现）
    const { openFullscreen } = useMermaid()

    // 复制文本到剪贴板（独立实现）
    async function copyTextToClipboard(text) {
        const t = String(text || '')
        if (!t) return false
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(t)
                return true
            }
        } catch (_) { }
        try {
            const ta = document.createElement('textarea')
            ta.value = t
            ta.setAttribute('readonly', '')
            ta.style.cssText = 'position:fixed;left:-9999px;top:0'
            document.body.appendChild(ta)
            ta.select()
            const ok = document.execCommand('copy')
            document.body.removeChild(ta)
            return !!ok
        } catch (_) { return false }
    }

    /**
     * 增强页面中的所有代码块
     * @param {HTMLElement} rootEl - 包含代码块的根元素
     */
    // ==================== 代码块三态（半展开 / 展开 / 收起） ====================
    /**
     * 状态说明：
     * - peek      : 半展开，只显示前 PEEK_LINES 行，第 PEEK_LINES + 1 行开始渐隐
     * - expanded  : 展开，完整显示
     * - collapsed : 收起，只保留头部
     * 其余代码块（行数不超过 PEEK_LINES）仅在 expanded / collapsed 之间切换。
     */
    const PEEK_LINES = 10
    const PEEK_FADE = 56

    /** 状态 → i18n key / 图标 */
    const STATE_META = {
        peek: { key: 'code_peek', icon: 'fas fa-ellipsis', label: '半展开' },
        expanded: { key: 'code_expand', icon: 'fas fa-chevron-up', label: '展开' },
        collapsed: { key: 'code_collapse', icon: 'fas fa-chevron-down', label: '收起' }
    }

    /** 取代码块主体（普通代码块 / Mermaid 块） */
    function getBodyEl(container) {
        if (!container) return null
        return container.querySelector('.codeblock__body, .mermaid-block__body')
    }

    /** 该代码块行数是否超过半展开阈值 */
    function isLongBlock(container) {
        return Number(container?.dataset?.codeLines || 0) > PEEK_LINES
    }

    /** 计算并写入"半展开"高度（CSS 变量），保证恰好露出 PEEK_LINES 行 + 渐隐区 */
    function applyPeekMetrics(container) {
        const pre = container.querySelector('.codeblock__pre')
        const content = container.querySelector('.codeblock__content')
        const lines = Number(container.dataset.codeLines || 0)
        if (!pre || !content || !lines) return
        const pad = (style, key) => parseFloat(style[key]) || 0
        const preStyle = getComputedStyle(pre)
        const contentStyle = getComputedStyle(content)
        let lineHeight = parseFloat(preStyle.lineHeight)
        if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
            const rect = pre.getBoundingClientRect()
            lineHeight = (rect.height - pad(preStyle, 'paddingTop') - pad(preStyle, 'paddingBottom')) / lines
        }
        if (!Number.isFinite(lineHeight) || lineHeight <= 0) lineHeight = 24
        const height = pad(contentStyle, 'paddingTop') + pad(preStyle, 'paddingTop') + lineHeight * PEEK_LINES + PEEK_FADE
        container.style.setProperty('--code-peek-height', Math.round(height) + 'px')
        container.style.setProperty('--code-peek-fade', PEEK_FADE + 'px')
    }

    /** 读取半展开高度（未计算时回退到固定值） */
    function peekHeightOf(container, bodyEl) {
        const value = parseFloat(container.style.getPropertyValue('--code-peek-height'))
        if (Number.isFinite(value) && value > 0) return Math.round(value)
        return Math.min(360, bodyEl ? bodyEl.scrollHeight : 360)
    }

    /** 同步按钮文案与图标（按钮文案表示"当前状态"） */
    function updateToggleButton(container, state) {
        const meta = STATE_META[state] || STATE_META.expanded
        const btn = container.querySelector('[data-code-toggle]') || container.querySelectorAll('.codeblock__btn')[1]
        if (!btn) return
        const label = btn.querySelector('.code-toggle-label')
        const icon = btn.querySelector('i')
        if (label) label.textContent = i18n.get(meta.key, meta.label)
        if (icon) icon.className = meta.icon
    }

    /** 动画结束：清理内联样式并落定状态类 */
    function settleState(container, bodyEl, state) {
        bodyEl.style.height = ''
        bodyEl.style.overflow = ''
        bodyEl.style.opacity = ''
        bodyEl.hidden = state === 'collapsed'
        if (state === 'collapsed') bodyEl.style.cssText = ''
        container.classList.toggle('is-peek', state === 'peek')
        container.classList.toggle('is-peek-mask', state === 'peek')
        container.classList.toggle('is-collapsed', state === 'collapsed')
    }

    /** 清理未完成的过渡监听/定时器 */
    function clearBodyTransition(bodyEl) {
        if (!bodyEl) return
        if (bodyEl.__stateTimer) { clearTimeout(bodyEl.__stateTimer); bodyEl.__stateTimer = null }
        if (bodyEl.__stateEndHandler) {
            bodyEl.removeEventListener('transitionend', bodyEl.__stateEndHandler)
            bodyEl.__stateEndHandler = null
        }
    }

    /**
     * 切换代码块状态（带高度过渡动画）
     * @param {HTMLElement} container - .codeblock 容器
     * @param {'peek'|'expanded'|'collapsed'} state - 目标状态
     * @param {boolean} [animate] - 是否播放动画
     */
    function setState(container, state, animate = true) {
        const bodyEl = getBodyEl(container)
        if (!bodyEl) return
        const prev = container.dataset.codeState || 'expanded'
        if (prev === state) return

        container.dataset.codeState = state
        updateToggleButton(container, state)
        clearBodyTransition(bodyEl)

        const from = bodyEl.hidden ? 0 : Math.round(bodyEl.getBoundingClientRect().height)
        const to = state === 'collapsed'
            ? 0
            : (state === 'peek' ? peekHeightOf(container, bodyEl) : bodyEl.scrollHeight)

        // 无动画（或高度无变化）时直接落定
        if (!animate || from === to) {
            bodyEl.hidden = false
            settleState(container, bodyEl, state)
            return
        }

        // 动画期间由内联高度控制，避免 max-height 截断
        bodyEl.hidden = false
        container.classList.remove('is-peek')
        container.classList.toggle('is-peek-mask', state === 'peek')
        bodyEl.style.cssText = `overflow:hidden;transition:height 280ms ease,opacity 220ms ease;height:${from}px;opacity:${from > 0 ? '1' : '0'}`
        void bodyEl.offsetHeight
        requestAnimationFrame(() => {
            bodyEl.style.height = to + 'px'
            bodyEl.style.opacity = to > 0 ? '1' : '0'
        })

        const finish = () => {
            clearBodyTransition(bodyEl)
            settleState(container, bodyEl, state)
        }
        const onEnd = (e) => {
            if (e.propertyName !== 'height') return
            finish()
        }
        bodyEl.__stateEndHandler = onEnd
        bodyEl.addEventListener('transitionend', onEnd)
        // 兜底：transitionend 未触发时（如元素不可见）也能落定
        bodyEl.__stateTimer = setTimeout(finish, 400)
    }

    // ---- 状态初始化（供 enhance 和 rebindEvents 共用） ----
    /**
     * 初始化代码块的初始状态与半展开度量
     * @param {HTMLElement} container
     */
    function initState(container) {
        const gutter = container.querySelector('.codeblock__gutter')
        if (!container.dataset.codeLines) {
            const code = container.querySelector('code')
            const raw = (code?.textContent || '').replace(/\n$/, '')
            const lines = gutter
                ? (gutter.textContent || '').split('\n').length
                : (raw ? raw.split('\n').length : 1)
            container.dataset.codeLines = String(lines)
        }
        if (!container.dataset.codeState) container.dataset.codeState = 'expanded'
        if (isLongBlock(container)) {
            applyPeekMetrics(container)
            setState(container, 'peek', false)
        } else {
            updateToggleButton(container, 'expanded')
        }
    }

    /**
     * 创建 Mermaid 图表块（含代码块头部按钮 + 图表/源码切换）
     * @param {HTMLElement} pre - <pre> 元素
     * @param {HTMLElement} code - <code> 元素
     * @param {string} langLabel - 语言标签（如 'MERMAID'）
     */
    function createMermaidBlock(pre, code, langLabel) {
        const sourceText = code.textContent || ''
        const preParent = pre.parentNode
        if (!preParent) return

        // 容器
        const container = document.createElement('div')
        container.className = 'codeblock mermaid-block'

        // ---- Header ----
        const header = document.createElement('div')
        header.className = 'codeblock__header'

        const langEl = document.createElement('div')
        langEl.className = 'codeblock__lang'
        langEl.textContent = langLabel || 'MERMAID'

        const actions = document.createElement('div')
        actions.className = 'codeblock__actions'

        // 复制按钮
        const btnCopy = document.createElement('button')
        btnCopy.type = 'button'
        btnCopy.className = 'codeblock__btn'
        btnCopy.innerHTML = `<i class="far fa-copy"></i><span class="code-copy-label">${i18n.get('code_copy')}</span>`

        // 折叠/展开按钮
        const btnCollapse = document.createElement('button')
        btnCollapse.type = 'button'
        btnCollapse.className = 'codeblock__btn'
        btnCollapse.dataset.mermaidCollapse = '1'
        btnCollapse.dataset.codeToggle = '1'
        btnCollapse.innerHTML = `<i class="fas fa-chevron-up"></i><span class="code-toggle-label">${i18n.get('code_expand')}</span>`

        // 图表/源码切换按钮
        const btnToggle = document.createElement('button')
        btnToggle.type = 'button'
        btnToggle.className = 'codeblock__btn'
        btnToggle.dataset.mermaidToggle = '1'
        btnToggle.innerHTML = '<i class="fas fa-code"></i><span class="mermaid-toggle-label">源码</span>'

        // 全屏按钮
        const btnFullscreen = document.createElement('button')
        btnFullscreen.type = 'button'
        btnFullscreen.className = 'codeblock__btn'
        btnFullscreen.dataset.mermaidFullscreen = '1'
        btnFullscreen.innerHTML = `<i class="fas fa-expand"></i><span class="mermaid-fullscreen-label">${i18n.get('code_fullscreen')}</span>`

        actions.append(btnCopy, btnCollapse, btnToggle, btnFullscreen)
        header.append(langEl, actions)

        // ---- Body ----
        const body = document.createElement('div')
        body.className = 'mermaid-block__body'

        // 图表区域（默认显示）
        const diagramWrap = document.createElement('div')
        diagramWrap.className = 'mermaid-block__diagram-wrap'
        diagramWrap.dataset.mermaidPanel = 'diagram'
        const diagram = document.createElement('div')
        diagram.className = 'mermaid-block__diagram'
        diagram.textContent = sourceText
        diagramWrap.appendChild(diagram)

        // 源码区域（默认隐藏，先不移动 pre）
        const sourceWrap = document.createElement('div')
        sourceWrap.className = 'mermaid-block__source'
        sourceWrap.dataset.mermaidPanel = 'source'
        sourceWrap.hidden = true

        body.append(diagramWrap, sourceWrap)
        container.append(header, body)

        // 先将容器插入 DOM 的 pre 位置，再移动 pre 到 sourceWrap 内
        preParent.insertBefore(container, pre)
        sourceWrap.appendChild(pre)

        // 初始化折叠状态（Mermaid 块只有 展开 / 收起 两态）
        container.dataset.codeState = 'expanded'

        // ---- 复制按钮事件 ----
        let lastCopyAt = 0
        btnCopy.addEventListener('click', async () => {
            const now = Date.now()
            if (now - lastCopyAt < 400) return
            lastCopyAt = now
            const ok = await copyTextToClipboard(sourceText)
            if (!ok) return
            btnCopy.classList.add('is-copied')
            const span = btnCopy.querySelector('.code-copy-label')
            if (span) span.textContent = i18n.get('code_copied')
            setTimeout(() => {
                btnCopy.classList.remove('is-copied')
                const s = btnCopy.querySelector('.code-copy-label')
                if (s) s.textContent = i18n.get('code_copy')
            }, 900)
        })

        // ---- 折叠/展开按钮 ----
        let lastCollapseAt = 0
        btnCollapse.addEventListener('click', () => {
            const now = Date.now()
            if (now - lastCollapseAt < 200) return
            lastCollapseAt = now

            const collapsed = (container.dataset.codeState || 'expanded') === 'collapsed'
            setState(container, collapsed ? 'expanded' : 'collapsed')
        })

        // ---- 图表/源码切换按钮 ----
        let showingDiagram = true
        btnToggle.addEventListener('click', () => {
            showingDiagram = !showingDiagram
            diagramWrap.hidden = !showingDiagram
            sourceWrap.hidden = showingDiagram
            const icon = btnToggle.querySelector('i')
            const label = btnToggle.querySelector('.mermaid-toggle-label')
            if (showingDiagram) {
                icon.className = 'fas fa-code'
                if (label) label.textContent = '源码'
            } else {
                icon.className = 'fas fa-image'
                if (label) label.textContent = '图表'
            }
        })

        // ---- 全屏按钮 ----
        btnFullscreen.addEventListener('click', () => openFullscreen(diagram))
    }

    function enhance(rootEl) {
        if (!rootEl) return

        // ---- 语言标签规范化 ----
        function normalizeLangLabel(raw) {
            const s = String(raw || '').trim().toLowerCase()
            if (!s) return 'CODE'
            const map = {
                'c++': 'CPP', 'cpp': 'CPP', 'cxx': 'CPP', 'cc': 'CPP',
                'c': 'C',
                'python': 'PY', 'py': 'PY',
                'javascript': 'JS', 'js': 'JS',
                'typescript': 'TS', 'ts': 'TS',
                'java': 'JAVA',
                'go': 'GO',
                'rust': 'RUST',
                'bash': 'BASH', 'sh': 'BASH', 'shell': 'BASH',
                'json': 'JSON',
                'html': 'HTML',
                'xml': 'XML',
                'css': 'CSS',
                'markdown': 'MD', 'md': 'MD',
                'sql': 'SQL',
                'yaml': 'YAML', 'yml': 'YAML'
            }
            return map[s] || s.toUpperCase()
        }

        function detectLanguageFromCodeEl(codeEl) {
            if (!codeEl) return ''
            const className = (codeEl.getAttribute('class') || '').trim()
            if (!className) return ''
            const classes = className.split(/\s+/).filter(Boolean)
            for (const c of classes) {
                if (c.startsWith('language-')) return c.slice('language-'.length)
                if (c.startsWith('lang-')) return c.slice('lang-'.length)
            }
            return ''
        }

        // ---- 处理每个 <pre> ----
        const pres = Array.from(rootEl.querySelectorAll('pre'))
        pres.forEach((pre) => {
            const code = pre.querySelector('code')
            if (!code) return
            const existing = pre.closest('.codeblock')
            if (existing) { rebindEvents(existing); return }

            const langRaw = detectLanguageFromCodeEl(code)
            const langLabel = normalizeLangLabel(langRaw)

            // ---- Mermaid 块特殊处理 ----
            if (langRaw.toLowerCase() === 'mermaid') {
                createMermaidBlock(pre, code, langLabel)
                return
            }

            // 创建包装结构
            const container = document.createElement('div')
            container.className = 'codeblock'

            const header = document.createElement('div')
            header.className = 'codeblock__header'

            const langEl = document.createElement('div')
            langEl.className = 'codeblock__lang'
            langEl.textContent = langLabel

            const actions = document.createElement('div')
            actions.className = 'codeblock__actions'

            const btnCopy = document.createElement('button')
            btnCopy.type = 'button'
            btnCopy.className = 'codeblock__btn'
            btnCopy.innerHTML = `<i class="far fa-copy"></i><span class="code-copy-label">${i18n.get('code_copy')}</span>`

            const btnToggle = document.createElement('button')
            btnToggle.type = 'button'
            btnToggle.className = 'codeblock__btn'
            btnToggle.dataset.codeToggle = '1'
            btnToggle.innerHTML = `<i class="fas fa-chevron-up"></i><span class="code-toggle-label">${i18n.get('code_expand')}</span>`

            actions.append(btnCopy, btnToggle)
            header.append(langEl, actions)

            const body = document.createElement('div')
            body.className = 'codeblock__body'

            // 将原 pre 移到容器内
            const preParent = pre.parentNode
            if (!preParent) return
            preParent.insertBefore(container, pre)
            body.appendChild(pre)
            container.append(header, body)

            body.style.cssText = 'opacity:1'

            // ---- 添加行号 ----
            const raw = (code.textContent || '').replace(/\n$/, '')
            const lineCount = raw ? raw.split('\n').length : 1
            const numbersText = Array.from({ length: lineCount }, (_, i) => String(i + 1)).join('\n')

            const content = document.createElement('div')
            content.className = 'codeblock__content'

            const gutter = document.createElement('pre')
            gutter.className = 'codeblock__gutter'
            gutter.setAttribute('aria-hidden', 'true')
            gutter.textContent = numbersText

            pre.classList.add('codeblock__pre')
            content.append(gutter, pre)
            body.appendChild(content)

            // ---- 初始化状态：超过 10 行的代码块默认"半展开" ----
            initState(container)

            // ---- 绑定复制按钮 ----
            let lastToggleAt = 0
            btnCopy.addEventListener('click', async () => {
                const text = code.innerText || code.textContent || ''
                const ok = await copyTextToClipboard(text)
                if (!ok) return

                btnCopy.classList.add('is-copied')
                const span = btnCopy.querySelector('.code-copy-label')
                if (span) span.textContent = i18n.get('code_copied')

                setTimeout(() => {
                    btnCopy.classList.remove('is-copied')
                    const s = btnCopy.querySelector('.code-copy-label')
                    if (s) s.textContent = i18n.get('code_copy')
                }, 900)
            })

            // ---- 绑定折叠/展开按钮 ----
            btnToggle.addEventListener('click', () => {
                const now = Date.now()
                if (now - lastToggleAt < 200) return
                lastToggleAt = now

                // 长代码块三态循环：半展开 → 展开 → 收起 → 半展开；短代码块两态切换
                const current = container.dataset.codeState || 'expanded'
                let next
                if (isLongBlock(container)) {
                    next = current === 'peek' ? 'expanded' : (current === 'expanded' ? 'collapsed' : 'peek')
                } else {
                    next = current === 'collapsed' ? 'expanded' : 'collapsed'
                }
                setState(container, next)
            })
        })

        // ---- 监听语言变化更新按钮文本 ----
        function updateI18n() {
            try {
                document.querySelectorAll('.codeblock').forEach((container) => {
                    const btns = container.querySelectorAll('.codeblock__btn')
                    const btnCopy = btns[0]
                    if (btnCopy) {
                        const span = btnCopy.querySelector('.code-copy-label')
                        if (span) span.textContent = i18n.get('code_copy', '复制')
                    }
                    // Mermaid 全屏按钮文案
                    const fsLabel = container.querySelector('.mermaid-fullscreen-label')
                    if (fsLabel) fsLabel.textContent = i18n.get('code_fullscreen')
                    // 按钮文案表示"当前状态"
                    updateToggleButton(container, container.dataset.codeState || 'expanded')
                })
            } catch (_) { }
        }

        if (!window.__codeblockI18nBound) {
            window.__codeblockI18nBound = true
            document.addEventListener('site:languageChanged', updateI18n)
        }
        updateI18n()

        // ---- 视口尺寸变化时重算半展开高度（移动端字号/行高不同） ----
        if (!window.__codeblockResizeBound) {
            window.__codeblockResizeBound = true
            let resizeTimer = null
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer)
                resizeTimer = setTimeout(() => {
                    document.querySelectorAll('.codeblock.is-peek').forEach((container) => {
                        if (isLongBlock(container)) applyPeekMetrics(container)
                    })
                }, 180)
            })
        }
    }

    // 重新绑定已有代码块的事件（结构由 useMarkdown 预渲染，但事件在 v-html 中丢失）
    function rebindEvents(container) {
        // ---- Mermaid 块：复制、折叠、图表/源码切换 ----
        if (container.classList.contains('mermaid-block')) {
            const sourceText = container.querySelector('code')?.textContent || ''

            // 复制按钮
            const btnCopy = container.querySelector('.codeblock__btn:first-child')
            if (btnCopy && !btnCopy.dataset.bound) {
                btnCopy.dataset.bound = '1'
                let lastCopyAt = 0
                btnCopy.addEventListener('click', async () => {
                    const now = Date.now()
                    if (now - lastCopyAt < 400) return
                    lastCopyAt = now
                    const ok = await copyTextToClipboard(sourceText)
                    if (!ok) return
                    btnCopy.classList.add('is-copied')
                    const span = btnCopy.querySelector('.code-copy-label')
                    if (span) span.textContent = i18n.get('code_copied')
                    setTimeout(() => {
                        btnCopy.classList.remove('is-copied')
                        const s = btnCopy.querySelector('.code-copy-label')
                        if (s) s.textContent = i18n.get('code_copy')
                    }, 900)
                })
            }

            // 折叠/展开按钮
            const btnCollapse = container.querySelector('[data-mermaid-collapse]')
            const body = getBodyEl(container)
            if (!container.dataset.codeState) container.dataset.codeState = 'expanded'
            updateToggleButton(container, container.dataset.codeState)
            if (btnCollapse && !btnCollapse.dataset.bound && body) {
                btnCollapse.dataset.bound = '1'
                let lastCollapseAt = 0
                btnCollapse.addEventListener('click', () => {
                    const now = Date.now()
                    if (now - lastCollapseAt < 200) return
                    lastCollapseAt = now
                    const collapsed = (container.dataset.codeState || 'expanded') === 'collapsed'
                    setState(container, collapsed ? 'expanded' : 'collapsed')
                })
            }

            // 图表/源码切换按钮
            const btnToggle = container.querySelector('[data-mermaid-toggle]')
            if (btnToggle && !btnToggle.dataset.bound) {
                btnToggle.dataset.bound = '1'
                let showingDiagram = !container.querySelector('.mermaid-block__diagram-wrap')?.hidden
                btnToggle.addEventListener('click', () => {
                    showingDiagram = !showingDiagram
                    const diagramWrap = container.querySelector('.mermaid-block__diagram-wrap')
                    const sourceWrap = container.querySelector('.mermaid-block__source')
                    if (diagramWrap) diagramWrap.hidden = !showingDiagram
                    if (sourceWrap) sourceWrap.hidden = showingDiagram
                    const icon = btnToggle.querySelector('i')
                    const label = btnToggle.querySelector('.mermaid-toggle-label')
                    if (showingDiagram) {
                        if (icon) icon.className = 'fas fa-code'
                        if (label) label.textContent = '源码'
                    } else {
                        if (icon) icon.className = 'fas fa-image'
                        if (label) label.textContent = '图表'
                    }
                })
            }

            // 全屏按钮
            const btnFullscreen = container.querySelector('[data-mermaid-fullscreen]')
            if (btnFullscreen && !btnFullscreen.dataset.bound) {
                btnFullscreen.dataset.bound = '1'
                btnFullscreen.addEventListener('click', () => {
                    const diagramEl = container.querySelector('.mermaid-block__diagram')
                    if (diagramEl) openFullscreen(diagramEl)
                })
            }
            return
        }

        const btns = container.querySelectorAll('.codeblock__btn')
        const btnCopy = btns[0]
        const btnToggle = btns[1]
        const code = container.querySelector('code')
        if (!code) return

        // 状态初始化（行号 / 半展开度量 / 初始状态）
        initState(container)

        // 复制按钮
        if (btnCopy && !btnCopy.dataset.bound) {
            btnCopy.dataset.bound = '1'
            btnCopy.addEventListener('click', async () => {
                const text = code.innerText || code.textContent || ''
                const ok = await copyTextToClipboard(text)
                if (!ok) return
                btnCopy.classList.add('is-copied')
                const span = btnCopy.querySelector('.code-copy-label')
                if (span) span.textContent = i18n.get('code_copied')
                setTimeout(() => {
                    btnCopy.classList.remove('is-copied')
                    const s = btnCopy.querySelector('.code-copy-label')
                    if (s) s.textContent = i18n.get('code_copy')
                }, 900)
            })
        }

        // 折叠/展开按钮
        if (btnToggle && !btnToggle.dataset.bound) {
            btnToggle.dataset.bound = '1'
            let lastToggleAt = 0
            btnToggle.addEventListener('click', () => {
                const now = Date.now()
                if (now - lastToggleAt < 200) return
                lastToggleAt = now

                // 长代码块三态循环：半展开 → 展开 → 收起 → 半展开；短代码块两态切换
                const current = container.dataset.codeState || 'expanded'
                let next
                if (isLongBlock(container)) {
                    next = current === 'peek' ? 'expanded' : (current === 'expanded' ? 'collapsed' : 'peek')
                } else {
                    next = current === 'collapsed' ? 'expanded' : 'collapsed'
                }
                setState(container, next)
            })
        }
    }

    return { enhance, setState, PEEK_LINES }
}