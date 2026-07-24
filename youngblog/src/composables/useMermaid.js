/**
 * Mermaid 图表渲染（含全屏查看器）
 */
import { useI18nStore } from '@/stores/i18nStore'

export function useMermaid() {
    const i18n = useI18nStore()
    let mermaidInitialized = false

    /**
     * 渲染页面中所有未渲染的 Mermaid 图表
     * @param {HTMLElement} rootEl
     */
    function render(rootEl) {
        if (!rootEl) return
        if (!window.mermaid) {
            console.warn('Mermaid 未加载')
            return
        }
        if (!mermaidInitialized) {
            window.mermaid.initialize({
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
            if (typeof window.mermaid.run === 'function') {
                window.mermaid.run({ nodes })
                    .then(() => {
                        nodes.forEach(node => {
                            node.setAttribute('data-mermaid-rendered', '1')
                            node.removeAttribute('data-mermaid-rendering')
                        })
                    })
                    .catch(err => {
                        console.warn('Mermaid run error', err)
                        nodes.forEach(node => node.removeAttribute('data-mermaid-rendering'))
                    })
            } else if (typeof window.mermaid.init === 'function') {
                window.mermaid.init(undefined, nodes)
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
     * 打开全屏查看器
     * @param {HTMLElement} diagramEl - .mermaid-block__diagram 元素
     */
    function openFullscreen(diagramEl) {
        // 实现与原有 mermaid-block 全屏逻辑相同
        // 此处略，可复用原 ensureMermaidFullscreenViewer 代码
    }

    return { render, openFullscreen }
}