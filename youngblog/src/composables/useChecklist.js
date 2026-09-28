/**
 * 复选框（Markdown 任务列表）前端适配
 *
 * 功能：
 * 1. 将 marked 渲染出的 `- [ ] / - [x]` 原生复选框改造为站点风格的自定义复选框
 * 2. 允许读者在页面上直接勾选（原生 checkbox 默认带 disabled，无法交互）
 * 3. 为每个清单插入"已完成 x / y"的覆盖进度条
 * 4. 勾选状态按文章维度持久化到 localStorage
 *
 * 用法：
 *   const { enhance } = useChecklist()
 *   enhance(articleContentEl, 'blog-id')
 *
 * 说明：文章内容由 v-html 渲染，每次渲染都是全新节点，
 *       因此绑定事件与状态恢复都在 enhance 中统一完成。
 */
import { useI18nStore } from '@/stores/i18nStore'

/** localStorage 键前缀 */
const STORAGE_PREFIX = 'yb-checklist:'

export function useChecklist() {
    const i18n = useI18nStore()

    // ==================== 本地存储 ====================

    /** 读取某篇文章的勾选状态（{ '0:1': true, ... }） */
    function readStore(storageKey) {
        if (!storageKey) return {}
        try {
            const raw = localStorage.getItem(STORAGE_PREFIX + storageKey)
            if (!raw) return {}
            const data = JSON.parse(raw)
            return data && typeof data === 'object' ? data : {}
        } catch (_) {
            return {}
        }
    }

    /** 写入某篇文章的勾选状态 */
    function writeStore(storageKey, data) {
        if (!storageKey) return
        try {
            localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(data))
        } catch (_) { /* 隐私模式 / 配额不足时静默降级 */ }
    }

    // ==================== 进度条 ====================

    /** 刷新清单进度条 */
    function updateProgress(listEl) {
        if (!listEl) return
        const chip = listEl.previousElementSibling
        if (!chip || !chip.classList.contains('md-checklist-progress')) return

        const items = listEl.querySelectorAll(':scope > .md-checklist-item')
        const done = listEl.querySelectorAll(':scope > .md-checklist-item.is-checked').length
        const count = chip.querySelector('.md-checklist-progress-count')
        const fill = chip.querySelector('.md-checklist-progress-fill')
        if (count) count.textContent = `${done} / ${items.length}`
        if (fill) {
            const percent = items.length ? Math.round((done / items.length) * 100) : 0
            fill.style.width = percent + '%'
        }
        chip.classList.toggle('is-complete', items.length > 0 && done === items.length)
    }

    /** 在清单前插入进度条（已存在则复用） */
    function ensureProgressChip(listEl) {
        const prev = listEl.previousElementSibling
        if (prev && prev.classList.contains('md-checklist-progress')) return prev
        const chip = document.createElement('div')
        chip.className = 'md-checklist-progress'
        chip.innerHTML =
            '<span class="md-checklist-progress-text">' +
            `<span data-i18n="checklist_done">${i18n.get('checklist_done')}</span>` +
            ' <span class="md-checklist-progress-count"></span>' +
            '</span>' +
            '<span class="md-checklist-progress-bar" aria-hidden="true">' +
            '<span class="md-checklist-progress-fill"></span>' +
            '</span>'
        listEl.parentNode?.insertBefore(chip, listEl)
        return chip
    }

    // ==================== 主入口 ====================

    /**
     * 增强文章中的任务列表
     * @param {HTMLElement} rootEl - 文章内容容器
     * @param {string} storageKey - 持久化键（通常为文章 id）
     */
    function enhance(rootEl, storageKey) {
        if (!rootEl) return

        const store = readStore(storageKey)
        const lists = Array.from(rootEl.querySelectorAll('ul'))
        let groupIndex = 0

        lists.forEach(ul => {
            // 仅处理"直接子项为复选框"的列表（即 Markdown 任务列表）
            const items = Array.from(ul.children).filter(
                li => li.tagName === 'LI' && li.querySelector(':scope > input[type="checkbox"]')
            )
            if (!items.length) return

            const group = groupIndex++
            ul.classList.add('md-checklist')
            ensureProgressChip(ul)

            items.forEach((li, itemIndex) => {
                const box = li.querySelector(':scope > input[type="checkbox"]')
                if (!box) return
                const id = `${group}:${itemIndex}`

                li.classList.add('md-checklist-item')
                box.classList.add('md-checklist-box')
                // 原生任务列表的复选框默认 disabled，需要放开交互
                box.removeAttribute('disabled')
                box.removeAttribute('aria-hidden')
                if (!box.getAttribute('aria-label')) {
                    const text = (li.textContent || '').trim().replace(/\s+/g, ' ')
                    if (text) box.setAttribute('aria-label', text.slice(0, 80))
                }

                const checked = !!store[id]
                box.checked = checked
                li.classList.toggle('is-checked', checked)

                if (!box.dataset.checklistBound) {
                    box.dataset.checklistBound = '1'
                    box.addEventListener('change', () => {
                        const next = readStore(storageKey)
                        if (box.checked) next[id] = true
                        else delete next[id]
                        writeStore(storageKey, next)
                        li.classList.toggle('is-checked', box.checked)
                        updateProgress(ul)
                    })
                }
            })

            updateProgress(ul)
        })
    }

    return { enhance, updateProgress }
}
