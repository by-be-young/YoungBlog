/**
 * 答案交互组合式函数
 * 管理例题选项点击、提交、正确/错误反馈、任务统计
 */
import { ref } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'

export function useAnswer(rootRef) {
    const i18n = useI18nStore()
    const taskStats = ref({ total: 0, answered: 0, correct: 0 })

    /**
     * 锁定选项组（提交后禁止再选）
     * @param {HTMLElement} group - .md-options 元素
     * @param {boolean} locked
     */
    function setOptionsLocked(group, locked) {
        if (!group) return
        group.classList.toggle('is-locked', locked)
        group.querySelectorAll('.md-option').forEach(btn => {
            btn.setAttribute('aria-disabled', locked ? 'true' : 'false')
            btn.setAttribute('tabindex', locked ? '-1' : '0')
            btn.classList.toggle('is-locked', locked)
        })
    }

    /**
     * 展开答案块
     * @param {HTMLElement} block - .answer-block 元素
     */
    function expandAnswerBlock(block) {
        if (!block) return
        const content = block.querySelector('.answer-content')
        const toggle = block.querySelector('.answer-toggle')
        if (!content) return
        toggle?.classList.add('is-open')
        block.classList.add('is-open')
        toggle?.setAttribute('aria-expanded', 'true')
        content.hidden = false
        content.style.cssText = 'overflow:hidden;transition:max-height 260ms ease,opacity 220ms ease'
        requestAnimationFrame(() => {
            content.style.maxHeight = content.scrollHeight + 'px'
            content.style.opacity = '1'
        })
        const onEnd = () => {
            content.style.maxHeight = ''
            content.removeEventListener('transitionend', onEnd)
        }
        content.addEventListener('transitionend', onEnd)

        // 锁定所属任务的所有选项
        const task = block.closest('.md-task')
        if (task) {
            task.querySelectorAll('.md-options').forEach(g => setOptionsLocked(g, true))
        }
    }

    /**
     * 折叠答案块
     * @param {HTMLElement} block
     */
    function collapseAnswerBlock(block) {
        if (!block) return
        const content = block.querySelector('.answer-content')
        const toggle = block.querySelector('.answer-toggle')
        if (!content) return
        toggle?.classList.remove('is-open')
        block.classList.remove('is-open')
        toggle?.setAttribute('aria-expanded', 'false')
        const cur = content.scrollHeight
        content.style.maxHeight = cur + 'px'
        requestAnimationFrame(() => {
            content.style.maxHeight = '0px'
            content.style.opacity = '0'
        })
        const onEndHide = () => {
            content.hidden = true
            content.removeEventListener('transitionend', onEndHide)
        }
        content.addEventListener('transitionend', onEndHide)

        // 如果该任务没有已提交的选项，解锁
        const task = block.closest('.md-task')
        if (task) {
            const anyChosen = task.querySelectorAll('.md-option.is-correct, .md-option.is-wrong').length > 0
            if (!anyChosen) {
                task.querySelectorAll('.md-options').forEach(g => setOptionsLocked(g, false))
            }
        }
    }

    /**
     * 获取答案块的正确选项键列表
     * @param {HTMLElement} block
     * @returns {string[]}
     */
    function getAnswerKeys(block) {
        if (!block) return []
        const attr = block.getAttribute('data-answer-keys') || ''
        if (attr) return attr.split(',').map(k => k.trim().toUpperCase()).filter(Boolean)
        const single = (block.getAttribute('data-answer') || '').trim().toUpperCase()
        return single ? single.split(',').filter(Boolean) : []
    }

    /**
     * 处理选项点击（单/多选题逻辑）
     * @param {HTMLElement} btn - .md-option 元素
     */
    function handleOptionClick(btn) {
        const optionsGroup = btn.closest('.md-options')
        if (optionsGroup?.classList.contains('is-locked')) return

        const task = btn.closest('.md-task')
        let answerBlock = task?.querySelector('.answer-block')
        if (!answerBlock) {
            // 向后查找最近的 answer-block
            let el = btn.parentElement
            while (el) {
                const candidate = el.querySelector('.answer-block')
                if (candidate) { answerBlock = candidate; break }
                el = el.parentElement
            }
        }
        if (!answerBlock) return

        const answerKeys = getAnswerKeys(answerBlock)
        const isMulti = answerBlock.getAttribute('data-answer-mode') === 'multi' || answerKeys.length > 1
        const key = (btn.getAttribute('data-key') || '').toUpperCase()
        if (!key) return

        if (isMulti) {
            btn.classList.toggle('is-selected')
            btn.setAttribute('aria-pressed', btn.classList.contains('is-selected') ? 'true' : 'false')
            return
        }

        // 单选题：若已提交则忽略
        if (btn.classList.contains('is-correct') || btn.classList.contains('is-wrong')) return

        const correctKey = answerKeys[0] || ''
        const isCorrect = correctKey === key

        if (isCorrect) {
            btn.classList.add('is-correct')
            const q = task?.querySelector('.md-question')
            if (q) {
                q.classList.remove('is-question-correct', 'is-question-wrong')
                q.classList.add('is-question-correct')
            }
            if (task) task.dataset.answerState = 'correct'
        } else {
            btn.classList.add('is-wrong')
            const q = task?.querySelector('.md-question')
            if (q) {
                q.classList.remove('is-question-correct', 'is-question-wrong')
                q.classList.add('is-question-wrong')
            }
            if (task) task.dataset.answerState = 'wrong'
            // 展开答案
            const toggle = answerBlock.querySelector('.answer-toggle')
            if (toggle && !toggle.classList.contains('is-open')) {
                expandAnswerBlock(answerBlock)
            }
            // 高亮正确答案
            if (correctKey) {
                const correctBtn = task?.querySelector(`.md-option[data-key="${correctKey}"]`)
                if (correctBtn) correctBtn.classList.add('is-correct')
            }
        }
        // 锁定所有选项
        if (task) {
            task.querySelectorAll('.md-options').forEach(g => setOptionsLocked(g, true))
        }
        updateTaskStats(task?.closest('.article-content') || document)
    }

    /**
     * 处理多选题提交按钮
     * @param {HTMLElement} submitBtn - .answer-submit 元素
     */
    function handleMultiSubmit(submitBtn) {
        const answerBlock = submitBtn.closest('.answer-block')
        if (!answerBlock || answerBlock.getAttribute('data-answer-mode') !== 'multi') return
        const task = answerBlock.closest('.md-task')
        if (task) task.classList.add('is-multiple-choice')

        const answerKeys = getAnswerKeys(answerBlock)
        const correctSet = new Set(answerKeys)

        const options = task?.querySelectorAll('.md-option') || answerBlock.closest('.article-content')?.querySelectorAll('.md-option')
        if (!options) return

        const selected = Array.from(options).filter(opt => opt.classList.contains('is-selected'))
        const selectedKeys = selected.map(opt => (opt.getAttribute('data-key') || '').toUpperCase()).filter(Boolean)
        const selectedSet = new Set(selectedKeys)

        const isCorrect = correctSet.size > 0 &&
            selectedSet.size === correctSet.size &&
            Array.from(selectedSet).every(k => correctSet.has(k))

        options.forEach(opt => {
            const key = (opt.getAttribute('data-key') || '').toUpperCase()
            const isSelected = opt.classList.contains('is-selected')
            const shouldBeCorrect = correctSet.has(key)
            opt.classList.remove('is-correct', 'is-wrong')
            if (isSelected && shouldBeCorrect) opt.classList.add('is-correct')
            else if (isSelected && !shouldBeCorrect) opt.classList.add('is-wrong')
            else if (shouldBeCorrect) opt.classList.add('is-correct')
        })

        const q = task?.querySelector('.md-question')
        if (q) {
            q.classList.remove('is-question-correct', 'is-question-wrong')
            q.classList.add(isCorrect ? 'is-question-correct' : 'is-question-wrong')
        }
        if (task) task.dataset.answerState = isCorrect ? 'correct' : 'wrong'

        if (task) {
            task.querySelectorAll('.md-options').forEach(g => setOptionsLocked(g, true))
        }
        expandAnswerBlock(answerBlock)
        submitBtn.classList.add('is-submitted')
        submitBtn.setAttribute('aria-disabled', 'true')
        submitBtn.disabled = true
        submitBtn.textContent = i18n.get('submit_answer', '已提交')
        updateTaskStats(task?.closest('.article-content') || document)
    }

    /**
     * 更新任务统计信息
     * @param {HTMLElement} rootEl - 包含 .md-task 的根元素
     */
    function updateTaskStats(rootEl) {
        if (!rootEl) return
        const tasks = rootEl.querySelectorAll('.md-task')
        if (!tasks.length) return

        let total = tasks.length
        let answered = 0, correct = 0
        tasks.forEach(task => {
            const state = task.dataset.answerState || ''
            if (state === 'correct') { answered++; correct++ }
            else if (state === 'wrong') { answered++ }
        })

        const rate = answered > 0 ? Math.round((correct / answered) * 100) : 0
        const hasRate = answered > 0

        tasks.forEach(task => {
            task.classList.add('has-task-stats')
            let statsEl = task.querySelector('.md-task-stats')
            if (!statsEl) {
                statsEl = document.createElement('div')
                statsEl.className = 'md-task-stats'
                task.appendChild(statsEl)
            }
            statsEl.innerHTML = `
        <span class="md-task-stats-main">
          <span class="md-task-stats-label">${i18n.get('stats_correct_count', '答对数：')}</span>
          <span class="md-task-stats-value">${correct}</span>
          <span class="md-task-stats-label">${i18n.get('stats_answered_count', '总答题数：')}</span>
          <span class="md-task-stats-value">${answered}</span>
          <span class="md-task-stats-label">${i18n.get('stats_total_count', '总题数：')}</span>
          <span class="md-task-stats-value">${total}</span>
        </span>
        ${hasRate ? `
          <span class="md-task-stats-rate">
            <span class="md-task-stats-label">${i18n.get('stats_accuracy', '正确率：')}</span>
            <span class="md-task-stats-value">${rate}%</span>
          </span>
        ` : ''}
      `
            statsEl.classList.toggle('is-rate-hidden', !hasRate)
            task.classList.toggle('is-rate-hidden', !hasRate)
        })
    }

    /**
     * 绑定所有答案交互事件（在渲染后调用）
     * @param {HTMLElement} rootEl - 文章内容容器
     */
    function bindAll(rootEl) {
        if (!rootEl) return
        // 绑定选项点击
        rootEl.querySelectorAll('.md-option').forEach(btn => {
            if (btn.dataset.bound) return
            btn.dataset.bound = '1'
            btn.addEventListener('click', () => handleOptionClick(btn))
            btn.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOptionClick(btn)
                }
            })
        })
        // 绑定答案折叠按钮
        rootEl.querySelectorAll('.answer-block .answer-toggle').forEach(btn => {
            if (btn.dataset.bound) return
            btn.dataset.bound = '1'
            const block = btn.closest('.answer-block')
            btn.addEventListener('click', () => {
                const isOpen = btn.classList.toggle('is-open')
                if (isOpen) expandAnswerBlock(block)
                else collapseAnswerBlock(block)
            })
        })
        // 绑定多选题提交按钮
        rootEl.querySelectorAll('.answer-block .answer-submit').forEach(btn => {
            if (btn.dataset.bound) return
            btn.dataset.bound = '1'
            btn.addEventListener('click', () => handleMultiSubmit(btn))
        })
        // 更新初始统计
        updateTaskStats(rootEl)
    }

    return {
        bindAll,
        expandAnswerBlock,
        collapseAnswerBlock,
        updateTaskStats,
        handleOptionClick,
        handleMultiSubmit,
        taskStats
    }
}