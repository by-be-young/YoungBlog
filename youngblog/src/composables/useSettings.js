/**
 * 应用显示设置（练习模式、答案折叠、代码块显示状态）
 */
import { useSettingsStore } from '@/stores/settingsStore'
import { useCodeBlock } from '@/composables/useCodeBlock'

export function useSettings() {
    const settings = useSettingsStore()
    const { setState: setCodeBlockState, PEEK_LINES } = useCodeBlock()

    /**
     * 应用当前设置到文章内容
     * @param {HTMLElement} contentEl - .article-content 元素
     */
    function apply(contentEl) {
        if (!contentEl) return
        const mode = settings.exerciseMode
        const codeMode = settings.codeMode

        // 练习模式：只显示任务卡片
        contentEl.classList.toggle('practice-mode', mode === 'practice')

        // 控制习题可见性
        const tasks = contentEl.querySelectorAll('.md-task')
        if (mode === 'hide') {
            tasks.forEach(t => { t.style.display = 'none'; t.setAttribute('aria-hidden', 'true') })
        } else {
            tasks.forEach(t => { t.style.display = ''; t.removeAttribute('aria-hidden') })
        }

        // 答案折叠
        const answerBlocks = contentEl.querySelectorAll('.answer-block')
        if (mode === 'expand') {
            answerBlocks.forEach(block => {
                const toggle = block.querySelector('.answer-toggle')
                if (toggle && !toggle.classList.contains('is-open')) {
                    toggle.click() // 触发展开
                }
            })
        } else if (mode === 'collapse' || mode === 'practice' || mode === 'hide') {
            answerBlocks.forEach(block => {
                const toggle = block.querySelector('.answer-toggle')
                if (toggle && toggle.classList.contains('is-open')) {
                    toggle.click() // 折叠
                }
            })
        }

        // 代码块显示状态：peek（半展开）/ expand（展开）/ collapse（收起）
        // 注：Mermaid 块只有 展开 / 收起 两态，不做半展开
        const codeblocks = contentEl.querySelectorAll('.codeblock')
        codeblocks.forEach(block => {
            const isMermaid = block.classList.contains('mermaid-block')
            const isLong = Number(block.dataset.codeLines || 0) > PEEK_LINES
            let target = 'expanded'
            if (codeMode === 'collapse') target = 'collapsed'
            else if (codeMode === 'peek' && isLong && !isMermaid) target = 'peek'
            setCodeBlockState(block, target, false)
        })
    }

    return { apply }
}