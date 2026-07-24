/**
 * Markdown 渲染引擎
 * 依赖：useMermaid, useCodeBlock, useAnswer, useImageViewer
 * 负责：Front Matter剥离、Obsidian图片嵌入、自定义块（task/answer/options/question）、
 *       数学公式（KaTeX）、内部引用 [[#标题]]、资源URL重写、列表颜色、引用块样式
 *
 * 注：marked 和 highlight.js 在 renderMarkdown 中按需动态导入，
 *     避免 ArticleContent 仅使用 annotateTaskLabels 时打包这两个大库。
 */
import { useI18nStore } from '@/stores/i18nStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useMermaid } from './useMermaid'
import { useCodeBlock } from './useCodeBlock'
import { useAnswer } from './useAnswer'
import { useImageViewer } from './useImageViewer'

export function useMarkdown() {
    const i18n = useI18nStore()
    const settings = useSettingsStore()
    const { render: renderMermaid } = useMermaid()
    const { enhance: enhanceCodeBlocks } = useCodeBlock()
    const { bindAll: bindAnswers } = useAnswer()
    const { init: initImageViewer } = useImageViewer()

    // ==================== 工具函数 ====================
    function escapeHtml(value) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
        return String(value).replace(/[&<>"]/g, ch => map[ch])
    }

    function getSiteBasePath() {
        const pathname = window.location?.pathname || '/'
        const idx = pathname.lastIndexOf('/')
        return idx >= 0 ? pathname.slice(0, idx + 1) : '/'
    }

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

    // ==================== Front Matter 剥离 ====================
    function stripFrontMatter(markdown) {
        if (typeof markdown !== 'string' || !markdown) return ''
        const text = markdown.replace(/^\uFEFF/, '')
        const lines = text.split(/\r?\n/)
        if (lines.length === 0 || lines[0].trim() !== '---') return text
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                return lines.slice(i + 1).join('\n').replace(/^\s*\n/, '')
            }
        }
        return text
    }

    // ==================== Obsidian 图片嵌入转换 ====================
    function transformObsidianImageEmbeds(markdown) {
        if (typeof markdown !== 'string' || !markdown) return markdown || ''
        return markdown.replace(/!\[\[([^\]\n]+)\]\]/g, (match, inner) => {
            const raw = String(inner || '').trim()
            if (!raw) return match
            const parts = raw.split('|')
            const targetRaw = (parts[0] || '').trim()
            if (!targetRaw) return match
            const target = targetRaw.replace(/\\/g, '/')
            if (!/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(target)) return match
            let alt = (parts[1] || '').trim()
            if (!alt) alt = target.split('/').pop().replace(/\.[^.]+$/, '')
            let src = target
            const hasKnownPrefix = /^(?:https?:\/\/|\/|\.{1,2}\/|assets\/|blogs\/)/i.test(src)
            const isBareFilename = src.indexOf('/') === -1
            if (!hasKnownPrefix && isBareFilename) src = `/blogs/图片/${src}`
            return `![${alt}](${src})`
        })
    }

    // ==================== 有序列表规范化 ====================
    function normalizeOrderedListIndentation(md) {
        if (!md || typeof md !== 'string') return md || ''
        const blocks = []
        let idx = 0
        const escaped = md.replace(/```[\s\S]*?```/g, m => {
            const key = '@@CODELIST_' + idx++ + '@@'
            blocks.push(m)
            return key
        })
        const result = escaped.replace(/^[ \t]{1,3}(\d+[\.\)])/gm, '$1')
        return result.replace(/@@CODELIST_(\d+)@@/g, (_, n) => blocks[parseInt(n, 10)] || '')
    }

    // ==================== 资源 URL 重写 ====================
    function rewriteMarkdownAssetUrls(rootEl, sourcePath) {
        if (!rootEl) return
        const sourceDir = sourcePath && sourcePath.includes('/')
            ? sourcePath.slice(0, sourcePath.lastIndexOf('/') + 1)
            : ''
        const siteBasePath = getSiteBasePath()
        const origin = window.location?.origin || ''
        const mdBase = origin + siteBasePath + sourceDir.replace(/^\/+/, '')
        const siteBaseNoSlash = siteBasePath.endsWith('/') ? siteBasePath.slice(0, -1) : siteBasePath

        function toAbsoluteBySiteRoot(pathLike) {
            const prefixed = (siteBaseNoSlash || '') + '/' + String(pathLike).replace(/^\/+/, '')
            return new URL(prefixed, origin).href
        }

        rootEl.querySelectorAll('img').forEach(img => {
            const rawSrc = img.getAttribute('src')
            if (!rawSrc) return
            const src = String(rawSrc).trim().replace(/\\/g, '/')
            if (!src) return
            if (/^(https?:|data:|blob:|\/\/)/i.test(src)) return
            if (src.startsWith('#')) return
            try {
                if (src.startsWith('/')) {
                    const prefixed = (siteBaseNoSlash || '') + src
                    img.setAttribute('src', new URL(prefixed, origin).href)
                    return
                }
                if (/^(?:\.\/|\.\.\/)*assets\//i.test(src) || /^assets\//i.test(src)) {
                    const normalized = src.replace(/^(?:\.\/|\.\.\/)+/, '')
                    img.setAttribute('src', toAbsoluteBySiteRoot(normalized))
                    return
                }
                img.setAttribute('src', new URL(src, mdBase).href)
            } catch (_) { }
        })
    }

    // ==================== 列表标记颜色 ====================
    function applyRandomMacaronListMarkerColors(rootEl) {
        if (!rootEl) return
        const palette = ['#f59ab5', '#74c4f7', '#86dfbe', '#f7bf8a', '#b29af2', '#eea9ef', '#8fd8fb', '#f6bddc']
        rootEl.querySelectorAll('ul li, ol li').forEach(li => {
            const idx = Math.floor(Math.random() * palette.length)
            li.style.setProperty('--macaron-marker-color', palette[idx])
        })
    }

    // ==================== 标题 ID 与内部引用 ====================
    function assignHeadingIdsAndLinkifyRefs(rootEl) {
        if (!rootEl) return
        const STAR_SUFFIX_RE = /(?:【\s*[!！]\s*】|\[\s*[!！]\s*\]|［\s*[!！]\s*］)\s*$/
        const map = new Map()
        const used = new Map()
        rootEl.querySelectorAll('h1, h2, h3').forEach(h => {
            const rawText = (h.textContent || '').trim()
            if (!rawText) return
            const cleanText = rawText.replace(STAR_SUFFIX_RE, '').trim()
            h.dataset.headingPlainText = cleanText
            if (STAR_SUFFIX_RE.test(rawText)) {
                if (!h.dataset.starDecorated) {
                    h.textContent = cleanText
                    const star = document.createElement('span')
                    star.className = 'heading-star-marker'
                    star.setAttribute('aria-hidden', 'true')
                    star.textContent = '★'
                    h.appendChild(star)
                    h.dataset.starDecorated = '1'
                    h.dataset.starMarked = '1'
                }
            }
            let id = h.id?.trim() || cleanText.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') || 'heading'
            const base = id
            let c = used.get(base) || 0
            while (document.getElementById(id)) {
                c += 1
                id = base + '-' + c
            }
            used.set(base, c)
            h.id = id
            map.set(rawText, id)
            map.set(cleanText, id)
            map.set(cleanText.toLowerCase().replace(/\s+/g, '-'), id)
        })
        // 替换 [[#标题]] 引用
        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null, false)
        const textNodes = []
        while (walker.nextNode()) textNodes.push(walker.currentNode)
        textNodes.forEach(node => {
            const parentTag = node.parentElement?.tagName?.toLowerCase() || ''
            if (['a', 'code', 'pre', 'textarea'].includes(parentTag)) return
            const txt = node.nodeValue || ''
            if (!txt.includes('[#') && !txt.includes('@@INTERNALREF_')) return
            const parts = []
            let last = 0
            const re = /@@INTERNALREF_(\d+)@@/g
            let m
            while ((m = re.exec(txt)) !== null) {
                const before = txt.slice(last, m.index)
                if (before) parts.push(document.createTextNode(before))
                const refText = (window.__internalRefPlaceholders?.[parseInt(m[1], 10)]?.raw || '').trim()
                const targetId = map.get(refText) || map.get(refText.toLowerCase().replace(/\s+/g, '-'))
                if (targetId) {
                    const a = document.createElement('a')
                    a.setAttribute('href', '#' + targetId)
                    a.className = 'internal-ref'
                    a.textContent = refText
                    parts.push(a)
                } else {
                    parts.push(document.createTextNode(`[[#${refText}]]`))
                }
                last = m.index + m[0].length
            }
            const tail = txt.slice(last)
            if (tail) parts.push(document.createTextNode(tail))
            if (parts.length) {
                const frag = document.createDocumentFragment()
                parts.forEach(p => frag.appendChild(p))
                node.parentNode.replaceChild(frag, node)
            }
        })
    }

    // ==================== 自定义块解析（完整） ====================
    function processCustomBlocks(markdownText, marked) {
        if (!markdownText) return markdownText

        // 辅助：提取数学公式（用于选项内部）
        const displayMathBlocks = []
        const inlineMathBlocks = []
        function extractMathFrom(text) {
            if (!text) return ''
            const codeBlocks = []
            const stashCode = (match) => {
                const idx = codeBlocks.length
                codeBlocks.push(match)
                return `@@CODE_${idx}@@`
            }
            let protectedText = text
                .replace(/```[\s\S]*?```/g, stashCode)
                .replace(/~~~[\s\S]*?~~~/g, stashCode)
                .replace(/`[^`\n]*`/g, stashCode)

            // 显示数学 $$...$$
            let tmp = protectedText.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
                const inner = match.slice(2, -2)
                const idx = displayMathBlocks.length
                displayMathBlocks.push(inner)
                return `@@MATHD_${idx}@@`
            })

            // 内联数学 $...$（转义 \$ 跳过）
            let out = ''
            for (let i = 0; i < tmp.length; i++) {
                const ch = tmp[i]
                if (ch === '$' && tmp[i + 1] !== '$' && tmp[i - 1] !== '\\') {
                    let j = i + 1, closed = false
                    while (j < tmp.length) {
                        if (tmp[j] === '$' && tmp[j - 1] !== '\\') { closed = true; break }
                        j++
                    }
                    if (closed) {
                        const inner = tmp.slice(i + 1, j)
                        const idx = inlineMathBlocks.length
                        inlineMathBlocks.push(inner)
                        out += `@@MATHI_${idx}@@`
                        i = j + 1
                        continue
                    }
                }
                out += ch
            }
            // 恢复代码块
            return out.replace(/@@CODE_(\d+)@@/g, (_, num) => codeBlocks[parseInt(num, 10)] || '')
        }

        // ---- 构建选项 HTML ----
        function buildOptionsHtml(optionsText) {
            if (!optionsText) return '<div class="md-options"></div>'
            const rawLines = optionsText.split(/\r?\n/)
            const explicitKeyPattern = /^\s*([A-Ga-g])\s*[\)）\.：:\-]?\s*(.*)$/
            const hasExplicitKeys = rawLines.some(line => explicitKeyPattern.test(line))
            const optionItems = []

            if (hasExplicitKeys) {
                let current = null
                rawLines.forEach(line => {
                    const matched = line.match(explicitKeyPattern)
                    if (matched) {
                        if (current) optionItems.push(current)
                        current = { key: matched[1].toUpperCase(), content: matched[2] || '' }
                        return
                    }
                    if (current) current.content += `\n${line}`
                })
                if (current) optionItems.push(current)
            } else {
                let autoIndex = 0
                rawLines.forEach(line => {
                    if (!line.trim()) return
                    optionItems.push({
                        key: String.fromCharCode('A'.charCodeAt(0) + autoIndex),
                        content: line.trim()
                    })
                    autoIndex++
                })
            }

            const parts = ['<div class="md-options">']
            optionItems.forEach(item => {
                const optionProtected = extractMathFrom((item.content || '').trim())
                const optionHtmlRaw = marked.parse(optionProtected) || optionProtected
                parts.push(`
          <div class="md-option" role="button" tabindex="0" data-key="${item.key}">
            <strong class="md-option-key">${item.key}</strong>
            <div class="md-option-text">${optionHtmlRaw}</div>
          </div>
        `)
            })
            parts.push('</div>')
            return parts.join('\n')
        }

        // ---- 处理 question / options / task / answer/analysis ----
        const questionsHtml = []
        const optionsHtml = []

        function processInnerForQuestionsAndOptions(innerText) {
            if (!innerText) return ''
            let step = innerText.replace(/\[question\]([\s\S]*?)\[\\question\]/g, (_, qinner) => {
                const innerProtected = extractMathFrom(qinner)
                const innerHtml = marked.parse(innerProtected) || innerProtected
                const idx = questionsHtml.length
                questionsHtml.push(innerHtml)
                return `@@QUESTION_${idx}@@`
            })

            step = step.replace(/\[options\]([\s\S]*?)\[\\options\]/g, (_, optInner) => {
                const idx = optionsHtml.length
                optionsHtml.push(buildOptionsHtml(optInner))
                return `@@OPTION_${idx}@@`
            })

            return step
        }

        let transformed = processInnerForQuestionsAndOptions(markdownText)

        // 处理 task
        transformed = transformed.replace(/\[task\]([\s\S]*?)\[\\task\]/g, (_, inner) => {
            return '\n<div class="md-task">' + inner + '</div>\n'
        })

        // 处理 answer/analysis
        const answerRegex = /\[(answer|analysis)\]([\s\S]*?)\[\\\1\]/g
        const segments = []
        let lastIdx = 0
        let m
        while ((m = answerRegex.exec(transformed)) !== null) {
            const before = transformed.slice(lastIdx, m.index)
            if (before) segments.push({ type: 'text', content: extractMathFrom(before) })
            const tag = m[1]
            const innerRaw = m[2] || ''
            const innerProtected = extractMathFrom(innerRaw)
            const innerHtml = marked.parse(innerProtected) || innerProtected
            segments.push({ type: 'anspart', sub: tag, raw: innerRaw, content: innerHtml })
            lastIdx = m.index + m[0].length
        }
        if (lastIdx < transformed.length) {
            const tail = transformed.slice(lastIdx)
            if (tail) segments.push({ type: 'text', content: extractMathFrom(tail) })
        }

        // 合并 answer + analysis
        let combinedProtected = ''
        const answersHtml = []

        function extractAnswerKeys(rawText) {
            const raw = String(rawText || '').trim()
            if (!raw) return []
            const compact = raw.replace(/[\s,，;；、/|·\-\.\)）\:]*/g, '')
            if (compact && /^[A-G]+$/i.test(compact)) {
                return compact.toUpperCase().split('').filter((k, i, arr) => arr.indexOf(k) === i)
            }
            return []
        }

        function resolveAnswerMeta(rawText) {
            const raw = String(rawText || '')
            const keys = extractAnswerKeys(raw)
            if (keys.length) return { keys, mode: keys.length > 1 ? 'multi' : 'single' }
            let letter = ''
            const singleLetter = raw.trim().match(/^([A-Ga-g])\s*[\)\.]?\s*$/)
            if (singleLetter) {
                letter = singleLetter[1].toUpperCase()
            } else {
                const kw = raw.match(/(?:答案|结论|Answer)[:：\s]*([A-Ga-g])/i)
                if (kw) letter = kw[1].toUpperCase()
                else {
                    const firstLine = raw.split(/\r?\n/)[0] || ''
                    const m2 = firstLine.match(/^\s*([A-Ga-g])[\)）\.：:\-]?/)
                    if (m2) letter = m2[1].toUpperCase()
                }
            }
            return { keys: letter ? [letter] : [], mode: 'single' }
        }

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i]
            if (seg.type === 'text') {
                combinedProtected += seg.content
                continue
            }
            if (seg.type === 'anspart' && seg.sub === 'answer') {
                let analysisHtml = ''
                let analysisRaw = ''
                let j = i + 1
                for (; j < segments.length; j++) {
                    const s2 = segments[j]
                    if (s2.type === 'anspart' && s2.sub === 'analysis') {
                        analysisHtml = s2.content || ''
                        analysisRaw = s2.raw || ''
                        break
                    }
                    if (s2.type === 'text' && (s2.content || '').trim() === '') continue
                    break
                }
                if (j < segments.length && segments[j].type === 'anspart' && segments[j].sub === 'analysis') {
                    i = j
                }
                answersHtml.push({
                    answerHtml: seg.content || '',
                    analysisHtml,
                    answerRaw: seg.raw || ''
                })
                combinedProtected += `@@ANSWERN_${answersHtml.length - 1}@@`
                continue
            }
            if (seg.type === 'anspart' && seg.sub === 'analysis') {
                combinedProtected += seg.content || ''
            }
        }

        // 使用 marked 解析剩余文本
        let html = marked.parse(combinedProtected) || combinedProtected

        // 还原答案占位符
        html = html.replace(/@@ANSWERN_(\d+)@@/g, (_, num) => {
            const i = parseInt(num, 10)
            const obj = answersHtml[i] || { answerHtml: '', analysisHtml: '', answerRaw: '' }
            const contentId = `answer-content-${i}`
            const submitId = `answer-submit-${i}`
            const answerMeta = resolveAnswerMeta(obj.answerRaw || '')
            const answerKeys = answerMeta.keys || []
            const isMultiChoice = answerMeta.mode === 'multi'
            const answerKeysAttr = answerKeys.join(',')

            const actionHtml = isMultiChoice ? `
        <div class="answer-actions">
          <div class="answer-actions-row">
            <span class="answer-type-badge" data-i18n="multi_choice_label" aria-hidden="true">多选题</span>
            <button id="${submitId}" class="answer-submit" type="button" aria-expanded="false" aria-controls="${contentId}">
              <span class="answer-submit-label" data-i18n="submit_answer">提交答案</span>
              <span class="answer-submit-icon" aria-hidden="true">√</span>
            </button>
          </div>
          <button class="answer-toggle" type="button" aria-expanded="false" aria-controls="${contentId}">
            <svg class="answer-toggle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      ` : `
        <button class="answer-toggle" type="button" aria-expanded="false" aria-controls="${contentId}">
          <svg class="answer-toggle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      `

            return `
        <div class="answer-block${isMultiChoice ? ' is-multiple' : ''}" data-answer="${answerKeys[0] || ''}" data-answer-keys="${answerKeysAttr}" data-answer-mode="${answerMeta.mode}">
          ${actionHtml}
          <div id="${contentId}" class="answer-content" hidden>
            <div class="answer-inner">
              <div class="answer-header"><strong data-i18n="answer_label">答案</strong>: <span class="answer-letter">${obj.answerHtml || ''}</span></div>
              <div class="answer-analysis">${obj.analysisHtml || ''}</div>
            </div>
          </div>
        </div>
      `
        })

        // 还原 question 和 options
        html = html.replace(/@@QUESTION_(\d+)@@/g, (_, num) => {
            const i = parseInt(num, 10)
            return `\n<div class="md-question">${questionsHtml[i] || ''}</div>\n`
        })
        html = html.replace(/@@OPTION_(\d+)@@/g, (_, num) => {
            const i = parseInt(num, 10)
            return optionsHtml[i] || ''
        })

        return html
    }

    // ==================== 任务标签标注 ====================
    function annotateTaskLabels(rootEl) {
        if (!rootEl) return
        const children = Array.from(rootEl.children)
        if (!children.length) return
        let h1Index = 0, h2Index = 0, h3Index = 0
        const taskInfos = []
        let separatorDepth = 0, inheritedDepth = 0

        children.forEach(el => {
            if (!el?.tagName) return
            const tag = el.tagName.toLowerCase()
            if (tag === 'hr') {
                separatorDepth = Math.min(separatorDepth + 1, 2)
                return
            }
            if (tag === 'h1') {
                h1Index += 1; h2Index = 0; h3Index = 0; separatorDepth = 0; inheritedDepth = 0
                return
            }
            if (tag === 'h2') {
                if (h1Index === 0) return
                h2Index += 1; h3Index = 0; separatorDepth = 0; inheritedDepth = 0
                return
            }
            if (tag === 'h3') {
                if (h1Index === 0) return
                h3Index += 1; separatorDepth = 0; inheritedDepth = 0
                return
            }
            if (el.classList?.contains('md-task')) {
                const depth = Math.max(separatorDepth, inheritedDepth)
                taskInfos.push({ element: el, fullKey: [h1Index, h2Index, h3Index].join('-'), depth })
                separatorDepth = 0
                inheritedDepth = depth
                return
            }
            separatorDepth = 0
            inheritedDepth = 0
        })

        const displayKeyGroups = new Map()
        taskInfos.forEach(info => {
            const parts = info.fullKey.split('-').map(Number)
            if (info.depth > 0) {
                let stripped = 0
                for (let i = parts.length - 1; i >= 0 && stripped < info.depth; i--) {
                    if (parts[i] > 0 && i > 0) { parts[i] = 0; stripped++ }
                }
            }
            const key = parts.filter(num => num > 0).join('-')
            if (!displayKeyGroups.has(key)) displayKeyGroups.set(key, [])
            displayKeyGroups.get(key).push(info)
        })

        displayKeyGroups.forEach((group, key) => {
            group.forEach((info, index) => {
                info.element.dataset.taskLabel = key
                info.element.dataset.taskSuffix = group.length > 1 ? ` （${index + 1}）` : ''
                info.element.dataset.taskIndex = String(index + 1)
                info.element.dataset.taskTotal = String(group.length)
            })
        })
    }

    // ==================== 主渲染函数 ====================
    async function renderMarkdown(rawMarkdown, sourcePath = '') {
        if (!rawMarkdown) return ''

        // 按需动态导入 marked 和 highlight.js（大库，仅执行渲染时加载）
        const { marked } = await import('marked')
        const hljs = (await import('@/utils/highlight')).default

        // 1. 预处理
        let md = stripFrontMatter(rawMarkdown)
        md = transformObsidianImageEmbeds(md)
        md = normalizeOrderedListIndentation(md)

        // 2. 处理自定义块（返回 HTML 片段）
        let html = processCustomBlocks(md, marked)

        // 3. 数学公式提取（保护显示/行内公式）

        // 4. 创建临时容器进行后处理
        const container = document.createElement('div')
        container.innerHTML = html

        // 5. 资源重写
        rewriteMarkdownAssetUrls(container, sourcePath)

        // 6. 标题 ID 与内部引用（需处理 [[#标题]]，在 processCustomBlocks 中未处理）
        //    但内部引用需要在渲染后处理，我们在此调用
        assignHeadingIdsAndLinkifyRefs(container)

        // 7. 代码高亮
        container.querySelectorAll('pre code:not(.language-mermaid):not(.lang-mermaid)')
            .forEach(block => hljs.highlightElement(block))

        // 8. 所有后处理（代码块增强、Mermaid、图片查看器、答案交互、任务标签等）
        //    由 ArticleContent 在真实 DOM 上统一处理，避免事件监听在序列化中丢失

        // 9. 列表标记颜色
        applyRandomMacaronListMarkerColors(container)

        // 10. 引用块第一段特殊样式
        container.querySelectorAll('blockquote p:first-child').forEach(p => {
            const children = p.childNodes
            if (children.length === 1 && children[0].nodeType === 1 && children[0].tagName === 'STRONG') {
                p.style.textAlign = 'center'
                p.style.textIndent = '0'
                p.style.color = '#b57b00'
            }
        })

        return container.innerHTML
    }

    // ==================== 导出 ====================
    return {
        renderMarkdown,
        stripFrontMatter,
        enhanceCodeBlocks,      // 暴露供外部调用
        renderMermaid,          // 暴露供外部调用
        bindAnswers,            // 暴露供外部调用
        initImageViewer,        // 暴露供外部调用
        annotateTaskLabels,
        applyRandomMacaronListMarkerColors,
        rewriteMarkdownAssetUrls,
        transformObsidianImageEmbeds,
        normalizeOrderedListIndentation
    }
}