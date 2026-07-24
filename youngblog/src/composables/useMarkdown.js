import { ref } from 'vue'

export function useMarkdown() {
    const renderedHtml = ref('')
    const isLoading = ref(false)

    const renderMarkdown = async (markdownText) => {
        isLoading.value = true
        try {
            // 动态导入 marked
            const { marked } = await import('marked')

            // 配置 marked
            marked.setOptions({
                gfm: true,
                breaks: true,
                headerIds: true,
                mangle: false
            })

            // 渲染
            renderedHtml.value = marked.parse(markdownText)
        } catch (e) {
            console.error('[useMarkdown] 渲染失败:', e)
            renderedHtml.value = '<p>内容渲染失败</p>'
        } finally {
            isLoading.value = false
        }
        return renderedHtml.value
    }

    const stripFrontMatter = (markdown) => {
        if (!markdown) return ''
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

    return {
        renderedHtml,
        isLoading,
        renderMarkdown,
        stripFrontMatter
    }
}