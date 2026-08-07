/**
 * 代码块增强组合式函数
 * 功能：添加行号、复制按钮、折叠/展开（带平滑动画）
 * 依赖：useI18nStore
 */
import { useI18nStore } from '@/stores/i18nStore'

export function useCodeBlock() {
    const i18n = useI18nStore()

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
    // ---- 折叠/展开辅助（供 enhance 和 rebindEvents 共用） ----
    function collapseBody(container, bodyEl) {
        if (!container || !bodyEl) return
        if (bodyEl.__expandEndHandler) {
            bodyEl.removeEventListener('transitionend', bodyEl.__expandEndHandler)
            bodyEl.__expandEndHandler = null
        }
        if (bodyEl.__collapseEndHandler) {
            bodyEl.removeEventListener('transitionend', bodyEl.__collapseEndHandler)
            bodyEl.__collapseEndHandler = null
        }
        bodyEl.hidden = false
        const currentHeight = bodyEl.getBoundingClientRect().height || bodyEl.scrollHeight
        bodyEl.style.cssText = `overflow:hidden;transition:height 280ms ease,opacity 220ms ease;height:${currentHeight}px;opacity:1`
        void bodyEl.offsetHeight
        requestAnimationFrame(() => {
            container.classList.add('is-collapsed')
            bodyEl.style.height = '0px'
            bodyEl.style.opacity = '0'
        })
        const onEnd = (e) => {
            if (e.propertyName !== 'height') return
            bodyEl.hidden = true; bodyEl.style.height = ''; bodyEl.style.overflow = ''
            bodyEl.removeEventListener('transitionend', onEnd)
            bodyEl.__collapseEndHandler = null
        }
        bodyEl.__collapseEndHandler = onEnd
        bodyEl.addEventListener('transitionend', onEnd)
    }

    function expandBody(container, bodyEl) {
        if (!container || !bodyEl) return
        if (bodyEl.__collapseEndHandler) {
            bodyEl.removeEventListener('transitionend', bodyEl.__collapseEndHandler)
            bodyEl.__collapseEndHandler = null
        }
        if (bodyEl.__expandEndHandler) {
            bodyEl.removeEventListener('transitionend', bodyEl.__expandEndHandler)
            bodyEl.__expandEndHandler = null
        }
        bodyEl.hidden = false
        bodyEl.style.cssText = 'overflow:hidden;transition:height 280ms ease,opacity 220ms ease;height:0px;opacity:0'
        void bodyEl.offsetHeight
        container.classList.remove('is-collapsed')
        const targetHeight = bodyEl.scrollHeight
        requestAnimationFrame(() => {
            bodyEl.style.height = targetHeight + 'px'
            bodyEl.style.opacity = '1'
        })
        const onEnd = (e) => {
            if (e.propertyName !== 'height') return
            bodyEl.style.height = ''; bodyEl.style.overflow = ''
            bodyEl.removeEventListener('transitionend', onEnd)
            bodyEl.__expandEndHandler = null
        }
        bodyEl.__expandEndHandler = onEnd
        bodyEl.addEventListener('transitionend', onEnd)
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
        btnCollapse.innerHTML = `<i class="fas fa-chevron-up"></i><span class="code-toggle-label">${i18n.get('code_collapse')}</span>`

        // 图表/源码切换按钮
        const btnToggle = document.createElement('button')
        btnToggle.type = 'button'
        btnToggle.className = 'codeblock__btn'
        btnToggle.dataset.mermaidToggle = '1'
        btnToggle.innerHTML = '<i class="fas fa-code"></i><span class="mermaid-toggle-label">源码</span>'

        actions.append(btnCopy, btnCollapse, btnToggle)
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

            const wasCollapsed = container.classList.contains('is-collapsed')
            if (wasCollapsed) {
                expandBody(container, body)
            } else {
                collapseBody(container, body)
            }

            const icon = btnCollapse.querySelector('i')
            const label = btnCollapse.querySelector('.code-toggle-label')
            const nowCollapsed = !wasCollapsed
            if (nowCollapsed) {
                if (icon) icon.className = 'fas fa-chevron-down'
                if (label) label.textContent = i18n.get('code_expand')
            } else {
                if (icon) icon.className = 'fas fa-chevron-up'
                if (label) label.textContent = i18n.get('code_collapse')
            }
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
            btnToggle.innerHTML = `<i class="fas fa-chevron-up"></i><span class="code-toggle-label">${i18n.get('code_collapse')}</span>`

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

                const wasCollapsed = container.classList.contains('is-collapsed')
                if (wasCollapsed) {
                    expandBody(container, body)
                } else {
                    collapseBody(container, body)
                }

                const icon = btnToggle.querySelector('i')
                const label = btnToggle.querySelector('.code-toggle-label')
                // collapseBody/expandBody 异步添加/移除 class，所以直接取反 wasCollapsed
                const nowCollapsed = !wasCollapsed
                if (nowCollapsed) {
                    if (icon) icon.className = 'fas fa-chevron-down'
                    if (label) label.textContent = i18n.get('code_expand')
                } else {
                    if (icon) icon.className = 'fas fa-chevron-up'
                    if (label) label.textContent = i18n.get('code_collapse')
                }
            })
        })

        // ---- 监听语言变化更新按钮文本 ----
        function updateI18n() {
            try {
                document.querySelectorAll('.codeblock:not(.mermaid-block)').forEach((container) => {
                    const btns = container.querySelectorAll('.codeblock__btn')
                    const btnCopy = btns[0]
                    const btnToggle = btns[1]
                    if (btnCopy) {
                        const span = btnCopy.querySelector('.code-copy-label')
                        if (span) span.textContent = i18n.get('code_copy', '复制')
                    }
                    if (btnToggle) {
                        const span = btnToggle.querySelector('.code-toggle-label')
                        const icon = btnToggle.querySelector('i')
                        const collapsed = container.classList.contains('is-collapsed')
                        if (span) {
                            span.textContent = collapsed ? i18n.get('code_expand', '展开') : i18n.get('code_collapse', '收起')
                        }
                        if (icon) {
                            icon.className = collapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up'
                        }
                    }
                })
            } catch (_) { }
        }

        if (!window.__codeblockI18nBound) {
            window.__codeblockI18nBound = true
            document.addEventListener('site:languageChanged', updateI18n)
        }
        updateI18n()
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
            const body = container.querySelector('.mermaid-block__body')
            if (btnCollapse && !btnCollapse.dataset.bound && body) {
                btnCollapse.dataset.bound = '1'
                let lastCollapseAt = 0
                btnCollapse.addEventListener('click', () => {
                    const now = Date.now()
                    if (now - lastCollapseAt < 200) return
                    lastCollapseAt = now
                    const wasCollapsed = container.classList.contains('is-collapsed')
                    if (wasCollapsed) {
                        expandBody(container, body)
                    } else {
                        collapseBody(container, body)
                    }
                    const icon = btnCollapse.querySelector('i')
                    const label = btnCollapse.querySelector('.code-toggle-label')
                    const nowCollapsed = !wasCollapsed
                    if (nowCollapsed) {
                        if (icon) icon.className = 'fas fa-chevron-down'
                        if (label) label.textContent = i18n.get('code_expand')
                    } else {
                        if (icon) icon.className = 'fas fa-chevron-up'
                        if (label) label.textContent = i18n.get('code_collapse')
                    }
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
            return
        }

        const btns = container.querySelectorAll('.codeblock__btn')
        const btnCopy = btns[0]
        const btnToggle = btns[1]
        const code = container.querySelector('code')
        if (!code) return

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

                const body = container.querySelector('.codeblock__body')
                if (!body) return
                const wasCollapsed = container.classList.contains('is-collapsed')
                if (wasCollapsed) {
                    expandBody(container, body)
                } else {
                    collapseBody(container, body)
                }

                const icon = btnToggle.querySelector('i')
                const label = btnToggle.querySelector('.code-toggle-label')
                const nowCollapsed = !wasCollapsed
                if (nowCollapsed) {
                    if (icon) icon.className = 'fas fa-chevron-down'
                    if (label) label.textContent = i18n.get('code_expand')
                } else {
                    if (icon) icon.className = 'fas fa-chevron-up'
                    if (label) label.textContent = i18n.get('code_collapse')
                }
            })
        }
    }

    return { enhance }
}