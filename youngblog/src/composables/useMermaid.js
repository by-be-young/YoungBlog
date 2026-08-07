/**
 * Mermaid 图表渲染（含全屏查看器）
 *
 * 使用 npm 安装的 mermaid 包（动态导入），无需全局 script 标签。
 */
export function useMermaid() {
    let mermaidInitialized = false
    let fullscreenViewer = null
    let mermaidModule = null

    /**
     * 动态加载 mermaid（仅在首次需要时加载）
     * @returns {Promise<boolean>} 是否加载成功
     */
    async function ensureMermaid() {
        if (mermaidModule) return true
        try {
            mermaidModule = await import('mermaid')
            return true
        } catch (e) {
            console.warn('Mermaid 加载失败', e)
            return false
        }
    }

    /**
     * 渲染页面中所有未渲染的 Mermaid 图表
     * @param {HTMLElement} rootEl
     */
    async function render(rootEl) {
        if (!rootEl) return
        const loaded = await ensureMermaid()
        if (!loaded) return

        if (!mermaidInitialized) {
            mermaidModule.default.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: 'default'
            })
            mermaidInitialized = true
        }

        const nodes = rootEl.querySelectorAll('.mermaid-block__diagram:not([data-mermaid-rendered="1"]):not([data-mermaid-rendering="1"])')
        if (!nodes.length) return
        nodes.forEach(node => node.setAttribute('data-mermaid-rendering', '1'))

        try {
            if (typeof mermaidModule.default.run === 'function') {
                await mermaidModule.default.run({ nodes })
                nodes.forEach(node => {
                    node.setAttribute('data-mermaid-rendered', '1')
                    node.removeAttribute('data-mermaid-rendering')
                })
            } else if (typeof mermaidModule.default.init === 'function') {
                mermaidModule.default.init(undefined, nodes)
                nodes.forEach(node => {
                    node.setAttribute('data-mermaid-rendered', '1')
                    node.removeAttribute('data-mermaid-rendering')
                })
            }
        } catch (e) {
            console.warn('Mermaid render error', e)
            nodes.forEach(node => node.removeAttribute('data-mermaid-rendering'))
        }
    }

    /**
     * 确保全屏查看器已创建
     */
    function ensureFullscreenViewer() {
        if (fullscreenViewer) return fullscreenViewer

        let overlay = document.getElementById('mermaid-viewer-overlay')
        if (!overlay) {
            overlay = document.createElement('div')
            overlay.id = 'mermaid-viewer-overlay'
            overlay.className = 'mermaid-viewer-overlay'
            overlay.setAttribute('aria-hidden', 'true')
            overlay.innerHTML = `
                <div class="mermaid-viewer-stage" role="dialog" aria-modal="true" aria-label="Mermaid 全屏预览">
                    <div class="mermaid-viewer-toolbar">
                        <button class="mermaid-viewer-close" type="button" aria-label="关闭全屏预览">&times;</button>
                    </div>
                    <div class="mermaid-viewer-content"></div>
                </div>
            `
            document.body.appendChild(overlay)
        }

        const contentEl = overlay.querySelector('.mermaid-viewer-content')
        const closeBtn = overlay.querySelector('.mermaid-viewer-close')

        const zoomState = {
            scale: 1,
            minScale: 0.4,
            maxScale: 4,
            baseWidth: 0,
            baseHeight: 0,
            svg: null
        }

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value))
        }

        function applyZoom() {
            if (!zoomState.svg || !zoomState.baseWidth || !zoomState.baseHeight) return
            const w = zoomState.baseWidth * zoomState.scale
            const h = zoomState.baseHeight * zoomState.scale
            zoomState.svg.style.width = w + 'px'
            zoomState.svg.style.height = h + 'px'
            zoomState.svg.style.maxWidth = 'none'
            zoomState.svg.style.maxHeight = 'none'
        }

        function resetZoom() {
            zoomState.scale = 1
            zoomState.baseWidth = 0
            zoomState.baseHeight = 0
            zoomState.svg = null
        }

        function close() {
            overlay.classList.remove('is-open')
            overlay.setAttribute('aria-hidden', 'true')
            document.body.classList.remove('mermaid-viewer-open')
            resetZoom()
            if (contentEl) contentEl.innerHTML = ''
        }

        function open(diagramEl) {
            if (!diagramEl) return false

            const svg = diagramEl.querySelector('svg')
            if (!svg || !contentEl) return false

            contentEl.innerHTML = ''
            const svgClone = svg.cloneNode(true)
            svgClone.removeAttribute('style')
            svgClone.removeAttribute('width')
            svgClone.removeAttribute('height')
            svgClone.style.cssText = 'width:auto;height:auto;max-width:100%;max-height:100%'
            contentEl.appendChild(svgClone)

            zoomState.svg = svgClone
            requestAnimationFrame(() => {
                if (!zoomState.svg) return
                const rect = zoomState.svg.getBoundingClientRect()
                zoomState.baseWidth = rect.width || 0
                zoomState.baseHeight = rect.height || 0
                zoomState.scale = 1
                applyZoom()
            })

            overlay.classList.add('is-open')
            overlay.setAttribute('aria-hidden', 'false')
            document.body.classList.add('mermaid-viewer-open')
            return true
        }

        // 事件绑定（仅绑定一次）
        if (!overlay.__mermaidViewerBound) {
            overlay.__mermaidViewerBound = true

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close()
            })

            if (contentEl) {
                contentEl.addEventListener('wheel', (e) => {
                    if (!overlay.classList.contains('is-open')) return
                    if (!zoomState.svg || !zoomState.baseWidth || !zoomState.baseHeight) return

                    e.preventDefault()
                    const factor = e.deltaY < 0 ? 1.12 : (1 / 1.12)
                    zoomState.scale = clamp(zoomState.scale * factor, zoomState.minScale, zoomState.maxScale)
                    applyZoom()
                }, { passive: false })
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', close)
            }

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && overlay.classList.contains('is-open')) close()
            })
        }

        fullscreenViewer = { open, close }
        return fullscreenViewer
    }

    /**
     * 打开全屏查看器
     * @param {HTMLElement} diagramEl - .mermaid-block__diagram 元素
     */
    function openFullscreen(diagramEl) {
        const viewer = ensureFullscreenViewer()
        viewer.open(diagramEl)
    }

    return { render, openFullscreen }
}
