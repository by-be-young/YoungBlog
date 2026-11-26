/**
 * 目录（TOC）真实浏览器回归用例
 *
 * 运行：node scripts/e2e-toc.mjs
 * 依赖：已构建的 dist、本机 headless Chrome 的 CDP（127.0.0.1:9333）。
 * 脚本自己起一个静态服务器，不依赖 dev server。
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SHOT_DIR = path.join(os.tmpdir(), 'youngblog-toc-e2e')
const CDP = 'http://127.0.0.1:9333'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rawPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0])
      let file = path.join(DIST, rawPath)
      if (rawPath === '/' || !path.extname(rawPath)) file = path.join(DIST, 'index.html')
      if (!file.startsWith(DIST)) {
        res.writeHead(403).end()
        return
      }
      fs.readFile(file, (error, buffer) => {
        if (error) {
          fs.readFile(path.join(DIST, 'index.html'), (fallbackError, html) => {
            if (fallbackError) res.writeHead(404).end()
            else res.writeHead(200, { 'Content-Type': MIME['.html'] }).end(html)
          })
          return
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
        res.end(buffer)
      })
    })
    const listen = (port) => {
      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE') listen(port + 1)
      })
      server.listen(port, '127.0.0.1', () => resolve({ server, port }))
    }
    listen(5199)
  })
}

class Session {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.exceptions = []
    this.consoleErrors = []
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) reject(new Error(message.error.message))
        else resolve(message.result)
        return
      }
      if (message.method === 'Runtime.exceptionThrown') {
        const detail = message.params?.exceptionDetails
        this.exceptions.push(detail?.exception?.description || detail?.text || 'unknown exception')
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
        const text = message.params.args?.map((arg) => arg.value ?? arg.description).join(' ')
        if (text) this.consoleErrors.push(text)
      }
    })
  }

  send(method, params = {}) {
    const id = ++this.id
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (!this.pending.has(id)) return
        this.pending.delete(id)
        reject(new Error(`CDP timeout: ${method}`))
      }, 15000)
    })
  }

  clearErrors() {
    this.exceptions = []
    this.consoleErrors = []
  }

  async eval(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
    }
    return result.result.value
  }

  async waitFor(expression, timeout = 12000, label = expression) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        if (await this.eval(`Boolean(${expression})`)) return
      } catch {
        // 页面切换过程中偶发执行上下文丢失，继续重试
      }
      await sleep(120)
    }
    throw new Error(`等待超时：${label}`)
  }

  async load(url, { width, height, mobile = false, preserveScroll = false } = {}) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    })
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 1 })
    this.clearErrors()
    await this.send('Page.navigate', { url })
    await sleep(300)
    // 同一篇文章只改 hash 时浏览器不会重新加载，组件状态（弹层/滚动）会残留。
    await this.send('Page.reload', { ignoreCache: false })
    await sleep(500)
    await this.waitFor('document.readyState === "complete"', 12000, '文档加载')
    await this.waitFor('document.querySelector(".blog-toc")', 12000, 'TOC 挂载')
    await this.waitFor(
      'document.querySelectorAll(".toc-section").length > 0 || document.querySelector(".toc-empty")',
      15000,
      '目录内容',
    )
    if (!preserveScroll) await this.eval('window.scrollTo(0, 0)')
    await sleep(500)
  }

  async click(selector, { index = 0, focus = true } = {}) {
    const clicked = await this.eval(`(() => {
      const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}]
      if (!el) return false
      if (${focus ? 'true' : 'false'}) el.focus?.({ preventScroll: true })
      el.click()
      return true
    })()`)
    assert.equal(clicked, true, `找不到可点击元素：${selector}[${index}]`)
  }

  async mouseClick(x, y) {
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1,
    })
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1,
    })
  }

  async key(key, code, vk, modifiers = 0) {
    await this.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key,
      code,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk,
      modifiers,
    })
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk,
      modifiers,
    })
  }

  async screenshot(name) {
    const result = await this.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    })
    fs.mkdirSync(SHOT_DIR, { recursive: true })
    fs.writeFileSync(path.join(SHOT_DIR, name), Buffer.from(result.data, 'base64'))
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function openTarget() {
  const response = await fetch(`${CDP}/json/new?${encodeURIComponent('about:blank')}`, {
    method: 'PUT',
  })
  if (!response.ok) throw new Error(`创建 CDP 页面失败：${response.status}`)
  const target = await response.json()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  const session = new Session(ws)
  await session.send('Page.enable')
  await session.send('Runtime.enable')
  await session.send('Log.enable')
  await session.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {})
  await session.send('Page.bringToFront').catch(() => {})
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  return { session, target }
}

const results = []
async function test(name, fn) {
  const start = Date.now()
  try {
    await fn()
    results.push({ name, ok: true, ms: Date.now() - start })
    console.log(`✓ ${name}`)
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - start, error })
    console.error(`✗ ${name}\n  ${String(error?.message || error).split('\n')[0]}`)
  }
}

function assertNoExceptions(session, label) {
  assert.equal(session.exceptions.length, 0, `${label} 出现异常：${session.exceptions.join(' | ')}`)
}

const { server, port } = await startServer()
const base = `http://127.0.0.1:${port}`
const article = (id) => `${base}/#/blog/${id}`
const { session } = await openTarget()

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844, mobile: true }
const TABLET = { width: 900, height: 800 }

const ARIA_CURRENT =
  `([...document.querySelectorAll('.toc-link')].find((el) => el.getAttribute('aria-current') === 'location')?.closest('[data-node-id]')?.dataset.nodeId) || ''`

try {
  await test('桌面：目录树完整、节点不重复、链接带深链参数', async () => {
    await session.load(article('1311744054'), DESKTOP)
    const info = await session.eval(`(() => {
      const roots = [...document.querySelectorAll('.toc-section')]
      const children = [...document.querySelectorAll('.toc-node')]
      const articles = [...document.querySelectorAll('.article-content h1, .article-content h2')]
        .filter((el) => !el.hasAttribute('data-toc-skip') && el.getAttribute('aria-hidden') !== 'true')
      const ids = [...document.querySelectorAll('.toc-list [data-node-id]')].map((el) => el.dataset.nodeId)
      const dup = ids.filter((id, index) => ids.indexOf(id) !== index)
      return {
        roots: roots.length,
        children: children.length,
        articles: articles.length,
        duplicates: [...new Set(dup)],
        firstHref: document.querySelector('.toc-link')?.getAttribute('href') || '',
        progress: document.querySelector('.toc-progress')?.textContent.trim() || '',
      }
    })()`)

    assert.ok(info.roots >= 5, `根章节过少：${info.roots}`)
    assert.ok(info.children > 0, '没有渲染二级节点')
    assert.equal(info.roots + info.children, info.articles, '目录根+二级数量应与正文 h1+h2 一致')
    assert.deepEqual(info.duplicates, [], `目录出现重复 id：${info.duplicates}`)
    assert.ok(info.firstHref.includes('section='), `目录链接缺少 section 参数：${info.firstHref}`)
    assert.match(info.progress, /^\d+%$/)
    assertNoExceptions(session, '桌面初始')
  })

  await test('桌面：点击目录不改哈希路由、滚动到目标', async () => {
    await session.load(article('1311744054'), DESKTOP)
    const target = await session.eval(`(() => {
      const links = [...document.querySelectorAll('.toc-section .toc-link')]
      const link = links[2]
      return { id: link.closest('[data-node-id]').dataset.nodeId, href: link.getAttribute('href') }
    })()`)

    await session.click('.toc-section .toc-link', { index: 2 })
    await session.waitFor(`${ARIA_CURRENT} === ${JSON.stringify(target.id)}`, 3000, '高亮目标')
    await sleep(300)

    const after = await session.eval(`(() => {
      const node = document.querySelector('.toc-link[aria-current="location"]').closest('[data-node-id]')
      return {
        id: node?.dataset.nodeId || '',
        hash: location.hash,
        scrollY: window.scrollY,
        top: document.getElementById(${JSON.stringify(target.id)})?.getBoundingClientRect().top ?? -1,
      }
    })()`)

    assert.equal(after.id, target.id, '当前节点未切到点击目标')
    assert.ok(after.scrollY > 0, '页面没有滚动')
    assert.ok(!after.hash.includes('section='), `点击后哈希被改写：${after.hash}`)
    assert.ok(after.hash.startsWith('#/blog/1311744054'), `路由被破坏：${after.hash}`)
    assert.ok(after.top > 45 && after.top < 110, `目标标题离顶部过远：${after.top}`)
    assertNoExceptions(session, '桌面点击')
  })

  await test('桌面：?section= 深链定位且不改写 URL', async () => {
    const id = await session.eval(
      `document.querySelectorAll('.toc-node[data-node-id]')[2]?.dataset.nodeId || ''`,
    )
    assert.ok(id, '找不到用于深链的二级标题')
    await session.load(`${article('1311744054')}?section=${encodeURIComponent(id)}`, {
      ...DESKTOP,
      preserveScroll: true,
    })
    await session.waitFor(`${ARIA_CURRENT} === ${JSON.stringify(id)}`, 5000, '深链高亮')

    const info = await session.eval(`(() => {
      return {
        hash: location.hash,
        top: document.getElementById(${JSON.stringify(id)})?.getBoundingClientRect().top ?? -1,
        open: [...document.querySelectorAll('.toc-children.is-open')].map((el) => el.id),
      }
    })()`)
    assert.ok(info.hash.includes('section='), `深链参数丢失：${info.hash}`)
    assert.ok(!info.hash.endsWith(`#${id}`), `标题 id 覆盖了路由：${info.hash}`)
    assert.ok(info.top > 15 && info.top < 130, `深链未贴近顶部：${info.top}`)
    assert.ok(info.open.length > 0, '深链目标所在章节没有展开')
    assertNoExceptions(session, '深链')
  })

  await test('桌面：手动折叠后滚动同章节不自动展开，换章节才展开', async () => {
    await session.load(article('1311744054'), DESKTOP)
    await session.eval(`(() => {
      const first = document.querySelector('.toc-section')
      const heading = document.getElementById(first.dataset.nodeId)
      window.scrollTo(0, Math.max(0, heading.getBoundingClientRect().top + scrollY - 45))
    })()`)
    await sleep(500)
    const info = await session.eval(`(() => {
      const section =
        [...document.querySelectorAll('.toc-section.is-section')].find(
          (root) => root.querySelector('.toc-toggle') && root.querySelector('.toc-node'),
        ) ||
        [...document.querySelectorAll('.toc-section')].find(
          (root) => root.querySelector('.toc-toggle') && root.querySelector('.toc-node'),
        )
      if (!section) return null
      const rootId = section.dataset.nodeId
      const toggle = section.querySelector('.toc-toggle')
      const children = [...section.querySelectorAll('.toc-node')]
      const firstChild = children[0]?.dataset.nodeId
      const secondRoot = [...document.querySelectorAll('.toc-section')].find(
        (root) => root !== section && root.querySelector('.toc-node'),
      )
      return {
        rootId,
        firstChild,
        firstChildTop: document.getElementById(firstChild)?.getBoundingClientRect().top + scrollY,
        secondRootId: secondRoot?.dataset.nodeId || '',
        secondRootTop: secondRoot
          ? document.getElementById(secondRoot.dataset.nodeId).getBoundingClientRect().top + scrollY
          : -1,
        toggleRect: toggle.getBoundingClientRect().toJSON(),
      }
    })()`)
    assert.ok(info?.firstChild && info.secondRootId, '缺少可折叠章节')

    await session.eval(`(() => {
      const branch = document.querySelector('#toc-branch-${info.rootId}')
      if (branch?.classList.contains('is-open')) {
        document.querySelector('.toc-section[data-node-id="${info.rootId}"] .toc-toggle').click()
      }
    })()`)
    await sleep(350)
    assert.equal(await session.eval(`document.querySelector('#toc-branch-${info.rootId}')?.classList.contains('is-open')`), false)

    await session.eval(`window.scrollTo(0, ${Math.max(0, info.firstChildTop - 45)})`)
    await sleep(600)
    assert.equal(await session.eval(ARIA_CURRENT), info.firstChild, '同章节滚动后当前节点错误')
    assert.equal(
      await session.eval(`document.querySelector('#toc-branch-${info.rootId}')?.classList.contains('is-open')`),
      false,
      '手动折叠被滚动自动打开',
    )

    await session.eval(`window.scrollTo(0, ${Math.max(0, info.secondRootTop - 45)})`)
    await session.waitFor(`${ARIA_CURRENT} === ${JSON.stringify(info.secondRootId)}`, 3000, '切换章节高亮')
    await sleep(300)
    const switched = await session.eval(`(() => {
      return {
        active: ${ARIA_CURRENT},
        activeRoot: document.querySelector('.toc-section.is-section')?.dataset.nodeId || '',
        open: [...document.querySelectorAll('.toc-children.is-open')].map((el) => el.id),
      }
    })()`)
    assert.equal(switched.activeRoot, info.secondRootId, '换章节后根高亮未切换')
    assert.ok(switched.open.some((id) => id.includes(info.secondRootId)), '换章节后新章节未展开')
    assertNoExceptions(session, '手动折叠')
  })

  await test('桌面：阅读进度从 0 到 100', async () => {
    await session.load(article('1311744054'), DESKTOP)
    await session.eval('window.scrollTo(0, 0)')
    await sleep(500)
    const top = await session.eval(`parseInt(document.querySelector('.toc-progress').textContent)`)
    assert.ok(top <= 3, `页首进度异常：${top}`)

    await session.eval('window.scrollTo(0, document.documentElement.scrollHeight)')
    await session.waitFor(`parseInt(document.querySelector('.toc-progress').textContent) >= 99`, 3000, '页尾进度')
    const bottom = await session.eval(`parseInt(document.querySelector('.toc-progress').textContent)`)
    assert.ok(bottom >= 99, `页尾进度异常：${bottom}`)

    await session.eval('window.scrollTo(0, document.documentElement.scrollHeight * 0.5)')
    await sleep(500)
    const middle = await session.eval(`parseInt(document.querySelector('.toc-progress').textContent)`)
    assert.ok(middle > 20 && middle < 85, `中段进度异常：${middle}`)
    assertNoExceptions(session, '进度')
  })

  await test('桌面：首标题为 H4 的文章不崩溃、不丢 H1/H2', async () => {
    await session.load(article('420747978'), DESKTOP)
    const info = await session.eval(`(() => {
      const roots = document.querySelectorAll('.toc-section').length
      const children = document.querySelectorAll('.toc-node').length
      const articles = [...document.querySelectorAll('.article-content h1, .article-content h2')]
        .filter((el) => !el.hasAttribute('data-toc-skip'))
      const firstH4 = document.querySelector('.article-content h4')
      const h4InToc = firstH4 ? Boolean(document.querySelector('.toc-list [data-node-id="' + firstH4.id + '"]')) : false
      return { roots, children, articles: articles.length, h4InToc }
    })()`)
    assert.ok(info.roots > 0, 'Cache 文章没有目录根节点')
    assert.equal(info.roots + info.children, info.articles, 'Cache 目录节点数量不匹配')
    assert.equal(info.h4InToc, false, 'H4 不应进入目录')
    assertNoExceptions(session, 'Cache')
  })

  await test('桌面：短文章目录完整落在视口内', async () => {
    await session.load(article('553436030'), { width: 1440, height: 3000 })
    const info = await session.eval(`(() => {
      const rail = document.querySelector('.toc-rail')
      const article = document.querySelector('.blog-article').getBoundingClientRect()
      const rect = document.querySelector('.blog-toc').getBoundingClientRect()
      return {
        short: rail.classList.contains('is-short-article'),
        articleHeight: article.height,
        top: rect.top,
        bottom: rect.bottom,
        viewport: innerHeight,
      }
    })()`)
    assert.equal(info.short, true, `短文章未启用短文章布局：${JSON.stringify(info)}`)
    assert.ok(info.top >= 0 && info.bottom <= info.viewport + 1, `短文章目录超出视口：${JSON.stringify(info)}`)
    assertNoExceptions(session, '短文章')
  })

  await test('移动端：关闭态不可聚焦、打开后为模态弹层', async () => {
    await session.load(article('1311744054'), MOBILE)
    const closed = await session.eval(`(() => {
      const nav = document.querySelector('.blog-toc')
      const fab = document.querySelector('.toc-fab')
      return {
        fab: Boolean(fab),
        ariaHidden: nav.getAttribute('aria-hidden'),
        inert: nav.hasAttribute('inert'),
        overflow: document.body.style.overflow,
        closedBranchesInert: document.querySelectorAll('.toc-children[inert]').length,
      }
    })()`)
    assert.equal(closed.fab, true, '移动端没有目录悬浮球')
    assert.equal(closed.ariaHidden, 'true', '关闭态未设置 aria-hidden')
    assert.equal(closed.inert, true, '关闭态未设置 inert')
    assert.ok(closed.closedBranchesInert > 0, '折叠章节没有 inert')

    await session.click('.toc-fab')
    await session.waitFor('document.querySelector(".blog-toc").getAttribute("aria-modal") === "true"', 3000, '弹层打开')
    await sleep(350)
    const open = await session.eval(`(() => {
      const nav = document.querySelector('.blog-toc')
      const rect = nav.getBoundingClientRect()
      return {
        ariaHidden: nav.getAttribute('aria-hidden'),
        inert: nav.hasAttribute('inert'),
        overflow: document.body.style.overflow,
        overlay: document.querySelector('.toc-overlay').classList.contains('is-active'),
        width: rect.width,
        viewport: innerWidth,
        bottom: rect.bottom,
        height: innerHeight,
        focusInside: nav.contains(document.activeElement),
        active: document.activeElement?.className || document.activeElement?.tagName,
        globalControlsHidden:
          getComputedStyle(document.querySelector('.floating-controls-container')).opacity === '0',
      }
    })()`)
    assert.equal(open.ariaHidden, null, '打开后仍 aria-hidden')
    assert.equal(open.inert, false, '打开后仍 inert')
    assert.equal(open.overflow, 'hidden', '打开后没有锁定页面滚动')
    assert.equal(open.overlay, true, '遮罩未激活')
    assert.ok(open.focusInside, `打开后焦点不在弹层：${open.active}`)
    assert.equal(open.globalControlsHidden, true, '弹层打开后全局悬浮球仍然可见')
    assert.ok(open.width <= open.viewport * 0.93, `弹层过宽：${open.width}`)
    assert.ok(open.bottom <= open.height + 1, `弹层超出视口底部：${open.bottom}`)
    await session.screenshot('e2e-mobile-toc.png')
    assertNoExceptions(session, '移动端打开')
  })

  await test('移动端：Tab 焦点陷阱、Esc 关闭并归还焦点', async () => {
    // 接上一个用例，弹层仍然打开
    const focusables = await session.eval(`(() => {
      const nav = document.querySelector('.blog-toc')
      const items = [...nav.querySelectorAll('a[href], button:not([disabled])')].filter(
        (el) => el.getClientRects().length > 0 && !el.closest('[inert]'),
      )
      return { count: items.length }
    })()`)
    assert.ok(focusables.count >= 3, `弹层可聚焦项过少：${focusables.count}`)

    await session.eval(`(() => {
      const nav = document.querySelector('.blog-toc')
      const items = [...nav.querySelectorAll('a[href], button:not([disabled])')].filter(
        (el) => el.getClientRects().length > 0 && !el.closest('[inert]'),
      )
      items[items.length - 1].focus()
    })()`)
    await session.key('Tab', 'Tab', 9)
    await sleep(200)
    const afterTab = await session.eval(`(() => {
      const nav = document.querySelector('.blog-toc')
      const items = [...nav.querySelectorAll('a[href], button:not([disabled])')].filter(
        (el) => el.getClientRects().length > 0 && !el.closest('[inert]'),
      )
      return { first: items[0] === document.activeElement, tag: document.activeElement?.tagName }
    })()`)
    assert.equal(afterTab.first, true, `Tab 未从末项回到首项：${afterTab.tag}`)

    await session.eval(`(() => {
      const nav = document.querySelector('.blog-toc')
      const items = [...nav.querySelectorAll('a[href], button:not([disabled])')].filter(
        (el) => el.getClientRects().length > 0 && !el.closest('[inert]'),
      )
      items[0].focus()
    })()`)
    await session.key('Tab', 'Tab', 9, 8)
    await sleep(200)
    const afterShiftTab = await session.eval(`(() => {
      const nav = document.querySelector('.blog-toc')
      const items = [...nav.querySelectorAll('a[href], button:not([disabled])')].filter(
        (el) => el.getClientRects().length > 0 && !el.closest('[inert]'),
      )
      return { last: items[items.length - 1] === document.activeElement }
    })()`)
    assert.equal(afterShiftTab.last, true, 'Shift+Tab 未从首项回到末项')

    await session.key('Escape', 'Escape', 27)
    await sleep(400)
    const closed = await session.eval(`(() => {
      const nav = document.querySelector('.blog-toc')
      return {
        ariaHidden: nav.getAttribute('aria-hidden'),
        overflow: document.body.style.overflow,
        fabFocused: document.activeElement?.classList.contains('toc-fab') || false,
        text: document.activeElement?.className || '',
      }
    })()`)
    assert.equal(closed.ariaHidden, 'true', 'Esc 后未恢复 aria-hidden')
    assert.equal(closed.overflow, '', 'Esc 后未恢复页面滚动')
    assert.equal(closed.fabFocused, true, `Esc 后焦点未归还悬浮球：${closed.text}`)
    assertNoExceptions(session, '移动端关闭')
  })

  await test('移动端：点击目录项关闭弹层并滚动', async () => {
    await session.click('.toc-fab')
    await sleep(350)
    await session.click('.toc-section .toc-link', { index: 0 })
    await sleep(800)
    const info = await session.eval(`(() => {
      return {
        overlay: document.querySelector('.toc-overlay').classList.contains('is-active'),
        ariaHidden: document.querySelector('.blog-toc').getAttribute('aria-hidden'),
        overflow: document.body.style.overflow,
        scrollY: window.scrollY,
        hash: location.hash,
        fabFocused: document.activeElement?.classList.contains('toc-fab') || false,
      }
    })()`)
    assert.equal(info.overlay, false, '点击目录项后遮罩未关闭')
    assert.equal(info.ariaHidden, 'true', '点击目录项后弹层未关闭')
    assert.equal(info.overflow, '', '点击目录项后页面滚动未恢复')
    assert.ok(info.scrollY > 0, '点击目录项没有滚动')
    assert.ok(!info.hash.includes('section='), `移动端点击改写了路由：${info.hash}`)
    assert.equal(info.fabFocused, true, '点击目录项后焦点未归还悬浮球')
    assertNoExceptions(session, '移动端点击')
  })

  await test('平板：弹层居中且宽度受限', async () => {
    await session.load(article('1311744054'), TABLET)
    await session.click('.toc-fab')
    await sleep(400)
    const info = await session.eval(`(() => {
      const rect = document.querySelector('.blog-toc').getBoundingClientRect()
      return {
        width: rect.width,
        center: rect.top + rect.height / 2,
        viewport: innerHeight,
        ariaModal: document.querySelector('.blog-toc').getAttribute('aria-modal'),
      }
    })()`)
    assert.equal(info.ariaModal, 'true', '平板弹层不是模态')
    assert.ok(info.width <= 900 * 0.8, `平板弹层过宽：${info.width}`)
    assert.ok(Math.abs(info.center - info.viewport / 2) < 45, `平板弹层未居中：${info.center}`)
    assertNoExceptions(session, '平板')
    await session.key('Escape', 'Escape', 27)
  })

  await test('桌面：点击目录后 Hash 路由仍可正常切换文章', async () => {
    await session.load(article('1311744054'), DESKTOP)
    await session.click('.toc-section .toc-link', { index: 1 })
    await sleep(600)
    assert.ok(!(await session.eval('location.hash')).includes('section='), '点击后路由被标题 id 覆盖')

    await session.send('Page.navigate', { url: article('420747978') })
    await sleep(500)
    await session.waitFor(
      'document.querySelector(".article-content")?.textContent.includes("Cache")',
      12000,
      '切换文章',
    )
    await session.waitFor('document.querySelectorAll(".toc-section").length > 0', 8000, '新文章目录')
    assert.ok((await session.eval('location.hash')).includes('420747978'), '切换文章失败')
    assertNoExceptions(session, '路由切换')
  })

  await test('桌面：沉浸模式导航高度归零，判定线随 body 状态更新', async () => {
    await session.load(article('1311744054'), DESKTOP)
    const id = await session.eval(
      `document.querySelectorAll('.toc-node[data-node-id]')[2]?.dataset.nodeId || ''`,
    )
    assert.ok(id, '缺少用于判定线的二级标题')

    await session.eval(`document.querySelector('.sub-btns-wrapper .sub-btn')?.click()`)
    await session.waitFor('document.body.classList.contains("immersive-reading-active")', 3000, '进入沉浸')
    await sleep(500)

    const scrollToId = `(() => {
      const el = document.getElementById(${JSON.stringify(id)})
      window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 50)
    })()`
    await session.eval(scrollToId)
    await sleep(700)
    const immersiveActive = await session.eval(ARIA_CURRENT)
    assert.notEqual(immersiveActive, id, '沉浸模式仍按 60px 导航高度判定')

    await session.key('Escape', 'Escape', 27)
    await session.waitFor('!document.body.classList.contains("immersive-reading-active")', 3000, '退出沉浸')
    await sleep(500)
    await session.eval(scrollToId)
    await sleep(700)
    const normalActive = await session.eval(ARIA_CURRENT)
    assert.equal(normalActive, id, '退出沉浸后判定线未恢复')
    await session.screenshot('e2e-desktop-toc.png')
    assertNoExceptions(session, '沉浸')
  })
} finally {
  await session.send('Page.captureScreenshot', { format: 'png' }).catch(() => {})
  server.close()
  session.ws.close()
}

const failed = results.filter((result) => !result.ok)
console.log(`\nTOC 浏览器用例：${results.length - failed.length} 通过 / ${results.length} 总计`)
if (failed.length) {
  console.error('失败项：')
  failed.forEach((result) => console.error(`- ${result.name}: ${result.error?.message}`))
  process.exitCode = 1
}
