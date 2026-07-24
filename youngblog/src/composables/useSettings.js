/**
 * 应用显示设置（练习模式、答案折叠、代码折叠）
 */
import { useSettingsStore } from '@/stores/settingsStore'

export function useSettings() {
    const settings = useSettingsStore()

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

        // 代码块折叠（使用第二个按钮即折叠按钮）
        const codeblocks = contentEl.querySelectorAll('.codeblock')
        if (codeMode === 'collapse') {
            codeblocks.forEach(block => {
                if (!block.classList.contains('is-collapsed')) {
                    const btns = block.querySelectorAll('.codeblock__btn')
                    const toggle = btns[1] // 第二个 btn 是折叠/展开
                    if (toggle) toggle.click()
                }
            })
        } else {
            codeblocks.forEach(block => {
                if (block.classList.contains('is-collapsed')) {
                    const btns = block.querySelectorAll('.codeblock__btn')
                    const toggle = btns[1]
                    if (toggle) toggle.click()
                }
            })
        }
    }

    return { apply }
}