/**
 * 答案交互组合式函数
 * 管理例题选项点击、提交、正确/错误反馈、任务统计
 */
import { ref } from 'vue'
import { useI18nStore } from '@/shared/stores/i18nStore'

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
     * 取消答案块上尚未结束的展开 / 收起过渡
     * @param {HTMLElement} content - .answer-content 元素
     */
    function cancelPendingTransition(content) {
        if (!content) return
        if (content.__answerTimer) {
            clearTimeout(content.__answerTimer)
            content.__answerTimer = null
        }
        if (content.__answerEnd) {
            content.removeEventListener('transitionend', content.__answerEnd)
            content.__answerEnd = null
        }
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
        cancelPendingTransition(content)
        toggle?.classList.add('is-open')
        toggle?.setAttribute('aria-expanded', 'true')
        block.classList.add('is-open')

        content.hidden = false
        content.style.overflow = 'hidden'
        content.style.transition = 'max-height 260ms ease, opacity 220ms ease'
        // 从 0 起步，避免直接跳到 CSS 里的展开高度
        content.style.maxHeight = '0px'
        content.style.opacity = '0'
        void content.offsetHeight
        requestAnimationFrame(() => {
            content.style.maxHeight = content.scrollHeight + 'px'
            content.style.opacity = '1'
        })

        // 动画结束后交还给 CSS（is-open 下 max-height 为 none），
        // 长答案不会被某个固定上限截断
        const finish = () => {
            cancelPendingTransition(content)
            content.style.maxHeight = ''
        }
        const onMaxHeightEnd = e => {
            if (e.propertyName !== 'max-height') return
            finish()
        }
        content.__answerEnd = onMaxHeightEnd
        content.addEventListener('transitionend', onMaxHeightEnd)
        content.__answerTimer = setTimeout(finish, 360)

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
        cancelPendingTransition(content)
        const cur = content.scrollHeight
        // 先落定当前高度，再摘掉 is-open，避免中途直接塌回 0
        content.style.overflow = 'hidden'
        content.style.transition = 'max-height 260ms ease, opacity 220ms ease'
        content.style.maxHeight = cur + 'px'
        content.style.opacity = '1'
        void content.offsetHeight
        toggle?.classList.remove('is-open')
        toggle?.setAttribute('aria-expanded', 'false')
        block.classList.remove('is-open')
        requestAnimationFrame(() => {
            content.style.maxHeight = '0px'
            content.style.opacity = '0'
        })

        let ended = false
        const finish = () => {
            if (ended) return
            ended = true
            cancelPendingTransition(content)
            content.hidden = true
            content.style.maxHeight = ''
            content.style.opacity = ''
            content.style.overflow = ''
            content.style.transition = ''
        }
        const onMaxHeightEnd = e => {
            if (e.propertyName !== 'max-height') return
            finish()
        }
        content.__answerEnd = onMaxHeightEnd
        content.addEventListener('transitionend', onMaxHeightEnd)
        content.__answerTimer = setTimeout(finish, 360)

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
     * 合并同一道题里被拆散的选项组。
     * 文章里常见的写法是一行一个 [options]…[\options]，渲染后每行都会变成一个
     * 独立的 .md-options 容器（各自带边框），视觉上像四张卡片而不是一道题的选项表。
     * 这里把后续容器的选项节点搬进第一个容器，并清理只起占位作用的空段落。
     * @param {HTMLElement} task - .md-task 元素
     */
    function mergeOptionGroups(task) {
        const groups = Array.from(task.querySelectorAll('.md-options'))
        if (groups.length < 2) return
        const primary = groups[0]
        groups.slice(1).forEach(group => {
            while (group.firstElementChild) primary.appendChild(group.firstElementChild)
            let prev = group.previousElementSibling
            group.remove()
            // 清掉选项组之间的空段落（marked 会把空行渲染成 <p>），避免留下多余间距
            while (prev && prev.tagName === 'P' && !prev.textContent.trim() && !prev.querySelector('img, table, code')) {
                const before = prev.previousElementSibling
                prev.remove()
                prev = before
            }
        })
    }

    // 判断题的两种选项写法
    const JUDGE_TRUE_WORDS = new Set(['对', '正确', '√', '是', '真', 'true', 't', 'yes'])
    const JUDGE_FALSE_WORDS = new Set(['错', '错误', '×', '否', '假', 'false', 'f', 'no'])

    function normalizeOptionWord(text) {
        return String(text || '')
            .trim()
            .toLowerCase()
            .replace(/[\s。.，,、；;：:!！?？]+/g, '')
    }

    /**
     * 只有「对 / 错」两个选项的题按判断题处理
     * @param {HTMLElement} task
     */
    function isJudgeOptionSet(task) {
        const options = Array.from(task.querySelectorAll('.md-option'))
        if (options.length !== 2) return false
        const words = options.map(opt =>
            normalizeOptionWord(opt.querySelector('.md-option-text')?.textContent),
        )
        return (
            (JUDGE_TRUE_WORDS.has(words[0]) && JUDGE_FALSE_WORDS.has(words[1])) ||
            (JUDGE_FALSE_WORDS.has(words[0]) && JUDGE_TRUE_WORDS.has(words[1]))
        )
    }

    /**
     * 同步题头信息：题型标签 + 选项组形态（单选用圆键、多选用方键）
     * 题型不再只看答案字母：无选项按解答题、对/错两项按判断题，
     * 其余再按答案个数区分单选 / 多选。
     * @param {HTMLElement} task - .md-task 元素
     */
    function syncTaskMeta(task) {
        if (!task) return
        mergeOptionGroups(task)
        const block = task.querySelector('.answer-block')
        const isMulti = block?.getAttribute('data-answer-mode') === 'multi'
        const optionCount = task.querySelectorAll('.md-option').length
        const isJudge = optionCount === 2 && isJudgeOptionSet(task)

        task.classList.toggle('is-multiple-choice', isMulti && optionCount > 0 && !isJudge)
        task.querySelectorAll('.md-options').forEach(group => {
            group.classList.toggle('is-multi-choice', isMulti && !isJudge)
        })

        const typeEl = task.querySelector('.md-task-type')
        if (!typeEl) return
        let labelKey = 'single_choice_label'
        if (!optionCount) labelKey = 'solution_label'
        else if (isJudge) labelKey = 'judge_label'
        else if (isMulti) labelKey = 'multi_choice_label'
        typeEl.setAttribute('data-i18n', labelKey)
        typeEl.textContent = i18n.get(labelKey)
        typeEl.classList.toggle('is-multi', labelKey === 'multi_choice_label')
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
        const submitLabel = submitBtn.querySelector('.answer-submit-label')
        if (submitLabel) submitLabel.textContent = i18n.get('submit_done', '已提交')
        else submitBtn.textContent = i18n.get('submit_done', '已提交')
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
                // 统计放进题头右侧；旧结构（无题头）仍回退到卡片尾部
                const head = task.querySelector('.md-task-head')
                if (head) head.appendChild(statsEl)
                else task.appendChild(statsEl)
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
        // 先同步题头（题型、选项形态），再做点击绑定
        rootEl.querySelectorAll('.md-task').forEach(task => syncTaskMeta(task))
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