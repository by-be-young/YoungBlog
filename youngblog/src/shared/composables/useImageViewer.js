/**
 * 图片查看器组合式函数
 * 功能：全屏查看图片，支持缩放、拖拽、导航、下载、复制
 */
export function useImageViewer() {
    let overlay = null
    let state = null

    /**
     * 创建图片查看器 DOM
     */
    function createOverlay() {
        const el = document.createElement('div')
        el.id = 'image-viewer-overlay'
        el.className = 'image-viewer-overlay'
        el.setAttribute('aria-hidden', 'true')
        el.innerHTML = `
      <div class="image-viewer-stage" role="dialog" aria-modal="true" aria-label="图片查看器">
        <button class="image-viewer-nav image-viewer-prev" type="button" aria-label="上一张">&#10094;</button>
        <button class="image-viewer-nav image-viewer-next" type="button" aria-label="下一张">&#10095;</button>
        <div class="image-viewer-toolbar">
          <span class="image-viewer-counter">1 / 1</span>
          <button class="image-viewer-tool image-viewer-download" type="button" aria-label="下载图片">
            <i class="fas fa-download" aria-hidden="true"></i>
            <span class="image-viewer-tool-label">下载</span>
          </button>
          <button class="image-viewer-tool image-viewer-copy" type="button" aria-label="复制图片">
            <i class="fas fa-copy" aria-hidden="true"></i>
            <span class="image-viewer-tool-label">复制</span>
          </button>
          <button class="image-viewer-close" type="button" aria-label="关闭图片查看器">&times;</button>
        </div>
        <img class="image-viewer-image" alt="" draggable="false" />
      </div>
    `
        document.body.appendChild(el)
        return el
    }

    /**
     * 初始化状态
     */
    function initState() {
        return {
            items: [],
            index: 0,
            scale: 1,
            tx: 0,
            ty: 0,
            dragging: false,
            dragStartX: 0,
            dragStartY: 0,
            dragOriginX: 0,
            dragOriginY: 0
        }
    }

    /**
     * 绑定事件
     */
    function bindEvents(overlay, state) {
        const stage = overlay.querySelector('.image-viewer-stage')
        const prevBtn = overlay.querySelector('.image-viewer-prev')
        const nextBtn = overlay.querySelector('.image-viewer-next')
        const closeBtn = overlay.querySelector('.image-viewer-close')
        const counter = overlay.querySelector('.image-viewer-counter')
        const downloadBtn = overlay.querySelector('.image-viewer-download')
        const copyBtn = overlay.querySelector('.image-viewer-copy')
        const image = overlay.querySelector('.image-viewer-image')

        // 关闭
        function close() {
            overlay.classList.remove('is-open')
            overlay.setAttribute('aria-hidden', 'true')
            document.body.classList.remove('image-viewer-open')
            state.dragging = false
            resetTransform()
        }

        // 重置变换
        function resetTransform() {
            state.scale = 1
            state.tx = 0
            state.ty = 0
            applyTransform()
        }

        function applyTransform() {
            image.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`
            image.style.cursor = state.dragging ? 'grabbing' : (state.scale > 1 ? 'grab' : 'zoom-in')
        }

        // 显示指定索引
        function show(index) {
            if (!state.items.length) return
            const len = state.items.length
            state.index = ((index % len) + len) % len
            const item = state.items[state.index]
            image.src = item.src
            image.alt = item.alt || '图片预览'
            resetTransform()
            counter.textContent = `${state.index + 1} / ${len}`
            prevBtn.disabled = len <= 1
            nextBtn.disabled = len <= 1
        }

        // 打开
        function open(index) {
            if (!state.items.length) return
            show(index || 0)
            overlay.classList.add('is-open')
            overlay.setAttribute('aria-hidden', 'false')
            document.body.classList.add('image-viewer-open')
        }

        // 下载
        function download() {
            const item = state.items[state.index]
            if (!item) return
            const a = document.createElement('a')
            a.href = item.src
            a.download = item.src.split('/').pop() || 'image'
            a.rel = 'noopener'
            document.body.appendChild(a)
            a.click()
            a.remove()
        }

        // 复制
        async function copy() {
            const item = state.items[state.index]
            if (!item) return
            const label = copyBtn.querySelector('.image-viewer-tool-label')
            try {
                const res = await fetch(item.src)
                const blob = await res.blob()
                const mime = blob.type || 'image/png'
                await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })])
                label.textContent = '已复制'
            } catch {
                label.textContent = '复制失败'
            }
            setTimeout(() => { label.textContent = '复制' }, 1200)
        }

        // 事件绑定
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target === stage) close()
        })
        closeBtn.addEventListener('click', close)
        prevBtn.addEventListener('click', () => show(state.index - 1))
        nextBtn.addEventListener('click', () => show(state.index + 1))
        downloadBtn.addEventListener('click', download)
        copyBtn.addEventListener('click', copy)

        document.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('is-open')) return
            if (e.key === 'Escape') { close(); return }
            if (e.key === 'ArrowLeft') { show(state.index - 1); return }
            if (e.key === 'ArrowRight') { show(state.index + 1) }
        })

        // 拖拽与缩放
        image.addEventListener('wheel', (e) => {
            if (!overlay.classList.contains('is-open')) return
            e.preventDefault()
            const ratio = e.deltaY < 0 ? 1.14 : 1 / 1.14
            const next = Math.max(1, Math.min(5, state.scale * ratio))
            if (next === state.scale) return
            state.scale = next
            if (state.scale === 1) { state.tx = 0; state.ty = 0 }
            applyTransform()
        }, { passive: false })

        image.addEventListener('mousedown', (e) => {
            if (state.scale <= 1 || !overlay.classList.contains('is-open')) return
            state.dragging = true
            state.dragStartX = e.clientX
            state.dragStartY = e.clientY
            state.dragOriginX = state.tx
            state.dragOriginY = state.ty
            applyTransform()
            e.preventDefault()
        })

        window.addEventListener('mousemove', (e) => {
            if (!state.dragging) return
            state.tx = state.dragOriginX + (e.clientX - state.dragStartX)
            state.ty = state.dragOriginY + (e.clientY - state.dragStartY)
            applyTransform()
        })
        window.addEventListener('mouseup', () => {
            if (state.dragging) {
                state.dragging = false
                applyTransform()
            }
        })

        // 对外接口
        overlay.__open = open
        overlay.__close = close
        overlay.__setItems = (items) => {
            state.items = items
            if (state.index >= items.length) state.index = 0
        }
    }

    /**
     * 初始化查看器（绑定图片点击）
     */
    function init(rootEl) {
        if (!rootEl) return
        if (!document.body.classList.contains('blog-detail-page')) return
        if (!overlay) {
            overlay = createOverlay()
            state = initState()
            bindEvents(overlay, state)
        }

        // 收集图片
        const images = rootEl.querySelectorAll('img:not(.image-viewer-image)')
        const items = []
        images.forEach((img, idx) => {
            if (img.dataset.viewerBound) return
            img.dataset.viewerBound = '1'
            const src = img.currentSrc || img.src
            const alt = img.alt || '图片'
            items.push({ src, alt })
            img.classList.add('md-zoomable-image')
            img.setAttribute('role', 'button')
            img.setAttribute('tabindex', '0')
            img.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                overlay.__open(idx)
            })
            img.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    overlay.__open(idx)
                }
            })
        })
        overlay.__setItems(items)
    }

    return { init }
}