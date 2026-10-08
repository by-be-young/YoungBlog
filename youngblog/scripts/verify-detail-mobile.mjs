/**
 * 博客详情页移动端验证脚本（仅用于本地验证，不参与构建）
 *
 * 思路：
 *  1. 复制 dist 到临时目录，往 index.html 注入一段「探针脚本」；
 *     探针在 Vue 挂载完成后，模拟点击浮控件里的「沉浸阅读」按钮，
 *     再把关键几何信息写回 <html data-*> 属性。这样只要 --dump-dom
 *     就能拿到真实运行时的尺寸，无需 CDP 客户端。
 *  2. 对每个手机 / 平板 / 桌面视口跑一遍，做断言并输出截图路径。
 *
 * 用法：
 *   node scripts/verify-detail-mobile.mjs --id <博客id> [--out <输出目录>]
 *
 * 退出码：0 = 断言全部通过；1 = 存在失败项。
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const argv = process.argv.slice(2)
const getArg = (name, fallback) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

const ROOT = resolve(getArg('--root', '.'))
const BLOG_ID = getArg('--id', '3796104188')
const PORT = Number(getArg('--port', '4179'))
const BASE = `http://127.0.0.1:${PORT}`
const CHROME = getArg('--chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
const OUT = resolve(getArg('--out', join(tmpdir(), 'yb-mobile-verify')))
const WORK = join(tmpdir(), 'yb-verify-site')
const PROFILE = join(tmpdir(), 'yb-verify-profile')

/** 视口清单：expect 决定断言分支 */
const VIEWPORTS = [
  { name: 'phone-390x844', width: 390, height: 844, expect: 'mobile' },
  { name: 'phone-landscape-844x390', width: 844, height: 390, expect: 'mobile' },
  { name: 'tablet-820x1180', width: 820, height: 1180, expect: 'tablet' },
  { name: 'tablet-1024x768', width: 1024, height: 768, expect: 'tablet' },
  { name: 'desktop-1440x900', width: 1440, height: 900, expect: 'desktop' },
]

/** 注入到 index.html 的探针：改写自真实 DOM 的运行时测量 */
const PROBE = `
<script>
(function () {
  window.__YB_PROBE__ = {}
  var A = function (k, v) { document.documentElement.setAttribute(k, v) }

  function rectOf(sel) {
    var el = document.querySelector(sel)
    if (!el) return 'missing'
    var r = el.getBoundingClientRect()
    var cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return 'hidden'
    return Math.round(r.width) + 'x' + Math.round(r.height) + '@' + Math.round(r.left) + ',' + Math.round(r.top)
  }

  function maxScrollWidth() {
    return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
  }

  function collect(tag) {
    A('data-probe-' + tag + '-innerWidth', String(window.innerWidth))
    A('data-probe-' + tag + '-overflowX', String(maxScrollWidth() - window.innerWidth))
    A('data-probe-' + tag + '-article', rectOf('.blog-article'))
    A('data-probe-' + tag + '-navbar', rectOf('.navbar'))
    A('data-probe-' + tag + '-fabGroup', rectOf('#floating-controls'))
    A('data-probe-' + tag + '-exitFab', rectOf('.immersive-exit-fab'))
    A('data-probe-' + tag + '-tocFab', rectOf('.toc-fab'))
    A('data-probe-' + tag + '-tocPanel', rectOf('.blog-toc.in-overlay'))
    A('data-probe-' + tag + '-bodyClass', document.body.className)
    A('data-probe-' + tag + '-mainClass', (document.querySelector('.blog-detail-page') || {}).className || 'missing')
    var hint = document.getElementById('immersive-read-hint')
    A('data-probe-' + tag + '-hintText', hint ? hint.textContent.trim().replace(/\\s+/g, ' ') : 'missing')
  }

  function ready() {
    return document.querySelector('.blog-detail-page') && document.querySelector('.article-content')
  }

  function clickSubImmersive() {
    var main = document.querySelector('.blog-detail-page')
    if (main && main.querySelector('[data-probe-toggle]')) return true
    var btns = document.querySelectorAll('#floating-controls button')
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('title') === '沉浸阅读' || btns[i].getAttribute('title') === 'Immersive Read') {
        btns[i].setAttribute('data-probe-toggle', '1')
        btns[i].click()
        return true
      }
    }
    return false
  }

  function exitImmersive() {
    var fab = document.querySelector('.immersive-exit-fab')
    if (fab) { fab.click(); return true }
    return false
  }

  var tries = 0
  var timer = setInterval(function () {
    tries++
    if (tries > 120) { clearInterval(timer); A('data-probe-status', 'timeout'); return }
    if (!ready()) return

    // 阶段一：普通阅读状态
    collect('normal')
    A('data-probe-status', 'normal')

    // 阶段二：进入沉浸模式
    if (!clickSubImmersive()) return
    setTimeout(function () {
      collect('immersive')
      A('data-probe-status', 'immersive')

      // 阶段三：点击退出胶囊，确认能退出
      if (!exitImmersive()) { A('data-probe-status', 'no-exit-fab'); return }
      setTimeout(function () {
        collect('exited')
        A('data-probe-status', 'done')
      }, 700)
    }, 900)
  }, 120)
})()
</script>
`

mkdirSync(OUT, { recursive: true })
mkdirSync(PROFILE, { recursive: true })
// 只把 index.html（注入探针后）放进临时目录，其余静态资源交由内置服务器
// 从真实的 dist / 项目根目录读取：既省掉整棵 dist 的复制（含 18MB 字体），
// 也避免在受限与提权环境下 TEMP 指向不同目录导致的怪异问题。
rmSync(WORK, { recursive: true, force: true })
mkdirSync(WORK, { recursive: true })

const distIndex = join(ROOT, 'dist', 'index.html')
if (!existsSync(distIndex)) {
  console.error(`[verify] 缺少 ${distIndex}，请先执行构建`)
  process.exit(2)
}
const original = readFileSync(distIndex, 'utf8')
writeFileSync(join(WORK, 'index.html'), original.replace('</body>', `${PROBE}</body>`), 'utf8')

if (!existsSync(CHROME)) {
  console.error(`[verify] 找不到 Chrome：${CHROME}`)
  process.exit(2)
}

// ==================== 内置静态服务器 ====================
// 直接内嵌而不依赖 preview-server.mjs：验证脚本要能被单独调用，
// dist 副本在 WORK 目录，而 blogs/ 原始 Markdown 仍需从项目根目录读取。
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '')
  if (clean.includes('..')) return null
  for (const base of [WORK, join(ROOT, 'dist'), ROOT]) {
    const p = join(base, clean)
    if (existsSync(p) && statSync(p).isFile()) return p
  }
  const fallback = join(WORK, 'index.html')
  return existsSync(fallback) ? fallback : null
}

const server = createServer((req, res) => {
  const file = resolveFile(req.url || '/')
  if (!file) {
    res.writeHead(404)
    res.end('404')
    return
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  createReadStream(file).pipe(res)
})

await new Promise((ok) => server.listen(PORT, '127.0.0.1', ok))
console.log(`[verify] 本地站点已启动：${BASE}`)

/**
 * 运行一次无头 Chrome。
 * @param {object} vp 视口
 * @param {'dump'|'shot'} mode
 * @param {string} hashPath hash 路由
 */
function runChrome(vp, mode, hashPath) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-breakpad',
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--disable-features=Translate,MediaRouter,OptimizationHints',
    '--virtual-time-budget=25000',
    `--window-size=${vp.width},${vp.height}`,
    '--force-device-scale-factor=1',
  ]
  if (mode === 'shot') {
    args.push('--hide-scrollbars', `--screenshot=${join(OUT, `${vp.name}.png`)}`)
  } else {
    args.push('--dump-dom')
  }
  const res = spawnSync(CHROME, args.concat([`${BASE}/${hashPath}`]), {
    encoding: 'utf8',
    maxBuffer: 96 * 1024 * 1024,
    timeout: 180000,
  })
  if (res.error) throw res.error
  return res.stdout || ''
}

/** 从 dump 出来的 DOM 中取出 data-probe-* 属性 */
function parseProbe(html, tag) {
  const out = {}
  const re = new RegExp(`data-probe-${tag}-([a-zA-Z]+)="([^"]*)"`, 'g')
  let m
  while ((m = re.exec(html))) out[m[1]] = m[2]
  const sm = html.match(/data-probe-status="([^"]*)"/)
  out.status = sm ? sm[1] : 'missing'
  return out
}

const failures = []
const notes = []

for (const vp of VIEWPORTS) {
  const hash = `#/blog/${BLOG_ID}`
  const html = runChrome(vp, 'dump', hash)
  // 截图与 DOM 分开跑：--screenshot 与 --dump-dom 同时给出时行为不稳定
  runChrome(vp, 'shot', hash)
  const normal = parseProbe(html, 'normal')
  const imm = parseProbe(html, 'immersive')
  const exited = parseProbe(html, 'exited')

  if (normal.status === 'missing' && normal.innerWidth === undefined) {
    failures.push(`${vp.name}: 页面未渲染或探针未执行（DOM ${html.length} 字节）`)
    continue
  }

  const overflow = Number(normal.overflowX || 0)
  if (overflow > 1) failures.push(`${vp.name}: 普通状态出现横向溢出 ${overflow}px`)
  else notes.push(`${vp.name}: 无横向溢出 ✓`)

  notes.push(
    `${vp.name}: 普通状态 文章=${normal.article} 悬浮球=${normal.fabGroup} 目录球=${normal.tocFab} 导航=${normal.navbar}`,
  )

  if (vp.expect === 'desktop') {
    if (imm.exitFab && imm.exitFab !== 'missing' && imm.exitFab !== 'hidden') {
      failures.push(`${vp.name}: 桌面端不应显示沉浸退出胶囊，实际 ${imm.exitFab}`)
    } else {
      notes.push(`${vp.name}: 桌面端无退出胶囊 ✓`)
    }
    if (imm.navbar && imm.navbar !== 'hidden' && imm.navbar !== 'missing') {
      failures.push(`${vp.name}: 桌面端沉浸模式应隐藏导航栏，实际 ${imm.navbar}`)
    }
  } else {
    if (imm.status !== 'immersive' && imm.status !== 'done') {
      failures.push(`${vp.name}: 未能进入沉浸模式（status=${imm.status}）`)
    }
    const body = imm.bodyClass || ''
    if (!body.includes('immersive-reading-active')) {
      failures.push(`${vp.name}: 沉浸模式 body 缺少 immersive-reading-active（"${body}"）`)
    }
    if (!imm.exitFab || imm.exitFab === 'missing') {
      failures.push(`${vp.name}: 移动端沉浸模式缺少 .immersive-exit-fab 退出胶囊`)
    } else if (imm.exitFab === 'hidden') {
      failures.push(`${vp.name}: 退出胶囊存在但不可见`)
    } else {
      const [size] = imm.exitFab.split('@')
      const [w, h] = size.split('x').map(Number)
      if (!(w >= 44 && h >= 44)) failures.push(`${vp.name}: 退出胶囊热区 ${size} 小于 44x44`)
      else notes.push(`${vp.name}: 退出胶囊 ${imm.exitFab} ✓`)
    }
    if (imm.navbar && imm.navbar !== 'hidden' && imm.navbar !== 'missing') {
      failures.push(`${vp.name}: 沉浸模式导航栏未隐藏（${imm.navbar}）`)
    }
    if (imm.status === 'done' || exited.status === 'done') {
      const cls = exited.bodyClass || ''
      if (cls.includes('immersive-reading-active')) {
        failures.push(`${vp.name}: 点击退出胶囊后 body 仍保留 immersive-reading-active`)
      } else {
        notes.push(`${vp.name}: 点击退出胶囊成功退出沉浸 ✓`)
      }
    }
  }
}

console.log(`[verify] 截图目录：${OUT}`)
console.log('[verify] 明细：')
for (const n of notes) console.log('  ·', n)
server.close()
if (failures.length) {
  console.log('\n[verify] 失败项：')
  for (const f of failures) console.log('  ✗', f)
  process.exit(1)
}
console.log('\n[verify] 全部断言通过')
