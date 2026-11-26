/**
 * 目录模型的单元用例
 *
 * 运行：node scripts/test-toc.mjs
 * 只测纯函数（建树 / 当前节点 / 阅读进度），不启动浏览器。
 */
import assert from 'node:assert/strict'
import {
  computeReadingProgress,
  createTocModel,
  normalizeHeadingLabel,
  pickActiveNode,
  resolveActivePath,
} from '../src/features/blog-detail/composables/tocModel.js'

let passed = 0
const failures = []

function test(name, fn) {
  try {
    fn()
    passed += 1
  } catch (error) {
    failures.push({ name, error })
  }
}

function headings(list) {
  return list.map((item, index) => ({
    id: item.id ?? '',
    level: item.level,
    text: item.text,
    star: item.star,
    el: null,
    order: index,
  }))
}

function shape(model) {
  return model.tree.map((node) => ({
    text: node.text,
    level: node.level,
    depth: node.depth,
    children: node.children.map((child) => ({
      text: child.text,
      level: child.level,
      depth: child.depth,
      children: child.children.map((leaf) => ({
        text: leaf.text,
        level: leaf.level,
        depth: leaf.depth,
      })),
    })),
  }))
}

/* ==================== 标题文字 ==================== */

test('normalize: 普通标题', () => {
  assert.deepEqual(normalizeHeadingLabel('编译过程'), { text: '编译过程', star: false })
})

test('normalize: 末尾【!】被剥掉', () => {
  assert.deepEqual(normalizeHeadingLabel('重点章节【!】'), { text: '重点章节', star: true })
})

test('normalize: 末尾 [!] 被剥掉', () => {
  assert.deepEqual(normalizeHeadingLabel('重点章节 [!]'), { text: '重点章节', star: true })
})

test('normalize: 全角［！］被剥掉', () => {
  assert.deepEqual(normalizeHeadingLabel('重点［！］   '), { text: '重点', star: true })
})

test('normalize: 渲染阶段显式星标', () => {
  assert.deepEqual(normalizeHeadingLabel('重点', true), { text: '重点', star: true })
})

test('normalize: 中间星标不误判', () => {
  assert.deepEqual(normalizeHeadingLabel('A【!】B'), { text: 'A【!】B', star: false })
})

test('normalize: 连续空白折叠', () => {
  assert.equal(normalizeHeadingLabel('  A\t\t B\u00a0C  ').text, 'A B C')
})

test('normalize: 空标题回退占位', () => {
  assert.equal(normalizeHeadingLabel('   ').text, '未命名标题')
})

test('normalize: 只有标记不算有效标题', () => {
  const model = createTocModel(headings([{ level: 1, text: '【!】', id: 'a' }]))
  assert.equal(model.flat.length, 0)
  assert.equal(model.skipped, 1)
})

/* ==================== 建树 ==================== */

test('tree: 空数组', () => {
  const model = createTocModel([])
  assert.deepEqual(model.tree, [])
  assert.equal(model.flat.length, 0)
})

test('tree: 非数组输入不抛错', () => {
  const model = createTocModel(null)
  assert.deepEqual(model.tree, [])
})

test('tree: 单个 h1', () => {
  const model = createTocModel(headings([{ id: 'a', level: 1, text: '第一章' }]))
  assert.equal(model.tree.length, 1)
  assert.equal(model.flat.length, 1)
  assert.equal(model.tree[0].depth, 0)
  assert.deepEqual(model.tree[0].path, ['a'])
})

test('tree: 标准 1-2-3 层级', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: 'b', level: 2, text: 'B' },
      { id: 'c', level: 3, text: 'C' },
    ]),
  )
  assert.deepEqual(shape(model), [
    { text: 'A', level: 1, depth: 0, children: [
      { text: 'B', level: 2, depth: 1, children: [
        { text: 'C', level: 3, depth: 2 },
      ] },
    ] },
  ])
  assert.deepEqual(model.byId.get('c').path, ['a', 'b', 'c'])
})

test('tree: 多个并列 h1', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: 'b', level: 1, text: 'B' },
    ]),
  )
  assert.deepEqual(model.tree.map((node) => node.text), ['A', 'B'])
  assert.equal(model.flat.length, 2)
})

test('tree: 没有 h1 时 h2 也能成为根', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 2, text: 'A' },
      { id: 'b', level: 2, text: 'B' },
      { id: 'c', level: 3, text: 'C' },
    ]),
  )
  assert.deepEqual(shape(model), [
    { text: 'A', level: 2, depth: 0, children: [] },
    { text: 'B', level: 2, depth: 0, children: [
      { text: 'C', level: 3, depth: 1, children: [] },
    ] },
  ])
})

test('tree: 文章以 h3 开头不丢节点', () => {
  const model = createTocModel(headings([{ id: 'a', level: 3, text: '开头' }]))
  assert.equal(model.tree.length, 1)
  assert.equal(model.flat.length, 1)
})

test('tree: h1 → h3 跳级挂到 h1 下', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: 'c', level: 3, text: 'C' },
    ]),
  )
  assert.equal(model.tree[0].children[0].text, 'C')
  assert.equal(model.tree[0].children[0].depth, 1)
  assert.equal(model.tree[0].children[0].level, 3)
})

test('tree: h3 → h2 时回到 h2 兄弟', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: 'c', level: 3, text: 'C' },
      { id: 'd', level: 2, text: 'D' },
    ]),
  )
  assert.deepEqual(
    model.tree[0].children.map((node) => [node.text, node.depth]),
    [
      ['C', 1],
      ['D', 1],
    ],
  )
})

test('tree: 多个 h1 之间的 h2 / h3 归属正确', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: 'a1', level: 2, text: 'A1' },
      { id: 'a11', level: 3, text: 'A11' },
      { id: 'a2', level: 2, text: 'A2' },
      { id: 'b', level: 1, text: 'B' },
      { id: 'b1', level: 2, text: 'B1' },
    ]),
  )
  assert.deepEqual(model.byId.get('a2').path, ['a', 'a2'])
  assert.deepEqual(model.byId.get('b1').path, ['b', 'b1'])
  assert.equal(model.flat.length, 6)
})

test('tree: 先出现深层级再出现浅层级不产生孤儿', () => {
  const model = createTocModel(
    headings([
      { id: 'c', level: 3, text: 'C' },
      { id: 'b', level: 2, text: 'B' },
      { id: 'a', level: 1, text: 'A' },
    ]),
  )
  assert.deepEqual(model.tree.map((node) => node.text), ['C', 'B', 'A'])
  assert.equal(model.flat.length, 3)
})

test('tree: 只取 1-3 级，h4 被忽略', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: 'x', level: 4, text: 'X' },
    ]),
  )
  assert.equal(model.flat.length, 1)
  assert.equal(model.skipped, 1)
})

test('tree: 隐藏标题被跳过', () => {
  const model = createTocModel([
    { id: 'a', level: 1, text: 'A', el: null },
    { id: 'b', level: 2, text: 'B', el: null, hidden: true },
  ])
  assert.equal(model.flat.length, 1)
})

test('tree: 空标题被跳过且不占编号', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: '', level: 2, text: '   ' },
      { id: 'c', level: 2, text: 'C' },
    ]),
  )
  assert.deepEqual(model.tree[0].children.map((node) => node.text), ['C'])
  assert.equal(model.flat.length, 2)
})

test('tree: 缺失 id 自动生成且唯一', () => {
  const model = createTocModel(
    headings([
      { level: 1, text: 'A' },
      { level: 2, text: 'B' },
    ]),
  )
  assert.equal(model.flat[0].id, 'toc-auto-h1-1')
  assert.equal(model.flat[1].id, 'toc-auto-h2-2')
  assert.equal(model.byId.size, 2)
})

test('tree: 重复 id 追加后缀', () => {
  const model = createTocModel(
    headings([
      { id: 'dup', level: 1, text: 'A' },
      { id: 'dup', level: 1, text: 'B' },
      { id: 'dup', level: 1, text: 'C' },
    ]),
  )
  assert.deepEqual(model.flat.map((node) => node.id), ['dup', 'dup--2', 'dup--3'])
})

test('tree: 自动 id 与已有编号不冲突', () => {
  const model = createTocModel(
    headings([
      { id: 'real', level: 1, text: 'A' },
      { level: 1, text: 'B' },
    ]),
  )
  assert.equal(model.flat[1].id, 'toc-auto-h1-2')
})

test('tree: 自动 id 命中真实 id 时追加后缀', () => {
  const model = createTocModel(
    headings([
      { id: 'toc-auto-h1-2', level: 1, text: 'A' },
      { level: 1, text: 'B' },
    ]),
  )
  assert.equal(model.flat[1].id, 'toc-auto-h1-2--2')
})

test('tree: 带空格 / 引号的 id 原样保留', () => {
  const model = createTocModel(headings([{ id: 'a"b c', level: 1, text: 'A' }]))
  assert.equal(model.flat[0].id, 'a"b c')
})

test('tree: 星标标题文本被清理', () => {
  const model = createTocModel(
    headings([{ id: 'a', level: 1, text: '重点【!】' }]),
  )
  assert.equal(model.tree[0].text, '重点')
  assert.equal(model.tree[0].star, true)
})

test('tree: flat 顺序与文档顺序一致', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: 'b', level: 2, text: 'B' },
      { id: 'c', level: 3, text: 'C' },
      { id: 'd', level: 2, text: 'D' },
      { id: 'e', level: 1, text: 'E' },
    ]),
  )
  assert.deepEqual(model.flat.map((node) => node.text), ['A', 'B', 'C', 'D', 'E'])
})

/* ==================== 当前节点 ==================== */

const nA = { id: 'a', text: 'A' }
const nB = { id: 'b', text: 'B' }

test('active: 没有测量结果', () => {
  assert.equal(pickActiveNode([], 100), null)
})

test('active: 判定线在第一项之前', () => {
  assert.equal(pickActiveNode([{ node: nA, top: 100 }], 50), null)
})

test('active: 判定线正好在第一项', () => {
  assert.equal(pickActiveNode([{ node: nA, top: 100 }], 100).id, 'a')
})

test('active: 两项之间', () => {
  const list = [
    { node: nA, top: 100 },
    { node: nB, top: 300 },
  ]
  assert.equal(pickActiveNode(list, 200).id, 'a')
})

test('active: 正好在第二项', () => {
  const list = [
    { node: nA, top: 100 },
    { node: nB, top: 300 },
  ]
  assert.equal(pickActiveNode(list, 300).id, 'b')
})

test('active: 超过最后一项', () => {
  const list = [
    { node: nA, top: 100 },
    { node: nB, top: 300 },
  ]
  assert.equal(pickActiveNode(list, 999).id, 'b')
})

test('active: 同一位置后出现者优先', () => {
  const list = [
    { node: nA, top: 100 },
    { node: nB, top: 100 },
  ]
  assert.equal(pickActiveNode(list, 120).id, 'b')
})

test('active: 乱序测量取最靠下的上方项', () => {
  const list = [
    { node: nA, top: 500 },
    { node: nB, top: 100 },
  ]
  assert.equal(pickActiveNode(list, 600).id, 'a')
  assert.equal(pickActiveNode(list, 200).id, 'b')
})

test('active: 非法记录被忽略', () => {
  const list = [
    null,
    { node: null, top: 100 },
    { node: nA, top: Number.NaN },
    { node: nB, top: 200 },
  ]
  assert.equal(pickActiveNode(list, 300).id, 'b')
})

test('active: 负数坐标可用', () => {
  assert.equal(pickActiveNode([{ node: nA, top: -20 }], 0).id, 'a')
})

/* ==================== 当前链路 ==================== */

test('path: null', () => {
  assert.deepEqual(resolveActivePath(null), {
    nodeId: '',
    rootId: '',
    childId: '',
    leafId: '',
  })
})

test('path: 根节点', () => {
  const model = createTocModel(headings([{ id: 'a', level: 1, text: 'A' }]))
  assert.deepEqual(resolveActivePath(model.tree[0]), {
    nodeId: 'a',
    rootId: 'a',
    childId: '',
    leafId: '',
  })
})

test('path: 二级节点', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: 'b', level: 2, text: 'B' },
    ]),
  )
  assert.deepEqual(resolveActivePath(model.byId.get('b')), {
    nodeId: 'b',
    rootId: 'a',
    childId: 'b',
    leafId: '',
  })
})

test('path: 三级节点', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: 'b', level: 2, text: 'B' },
      { id: 'c', level: 3, text: 'C' },
    ]),
  )
  assert.deepEqual(resolveActivePath(model.byId.get('c')), {
    nodeId: 'c',
    rootId: 'a',
    childId: 'b',
    leafId: 'c',
  })
})

test('path: 跳级 h3 在根下时按二级展示', () => {
  const model = createTocModel(
    headings([
      { id: 'a', level: 1, text: 'A' },
      { id: 'c', level: 3, text: 'C' },
    ]),
  )
  assert.deepEqual(resolveActivePath(model.byId.get('c')), {
    nodeId: 'c',
    rootId: 'a',
    childId: 'c',
    leafId: '',
  })
})

/* ==================== 阅读进度 ==================== */

const base = { viewportHeight: 900, navHeight: 60 }

test('progress: 高度为 0', () => {
  assert.equal(computeReadingProgress({ ...base, rootTop: 0, rootHeight: 0 }), 0)
})

test('progress: 短文章进入视口算 100%', () => {
  assert.equal(computeReadingProgress({ ...base, rootTop: 120, rootHeight: 300 }), 100)
})

test('progress: 短文章还在视口下方算 0%', () => {
  assert.equal(computeReadingProgress({ ...base, rootTop: 1000, rootHeight: 300 }), 0)
})

test('progress: 长文章刚好开始', () => {
  assert.equal(computeReadingProgress({ ...base, rootTop: 80, rootHeight: 2000 }), 0)
})

test('progress: 长文章过半', () => {
  const value = computeReadingProgress({ ...base, rootTop: -510, rootHeight: 2000 })
  assert.ok(Math.abs(value - 50) < 1e-6, `expected 50, got ${value}`)
})

test('progress: 长文章读完', () => {
  assert.equal(computeReadingProgress({ ...base, rootTop: -1300, rootHeight: 2000 }), 100)
})

test('progress: 视口为 0 不产生 NaN', () => {
  const value = computeReadingProgress({
    rootTop: 0,
    rootHeight: 2000,
    viewportHeight: 0,
    navHeight: 0,
  })
  assert.ok(Number.isFinite(value))
})

test('progress: 沉浸模式导航高度为 0 时可用区更大', () => {
  const immersive = computeReadingProgress({
    rootTop: -20,
    rootHeight: 2000,
    viewportHeight: 900,
    navHeight: 0,
  })
  const normal = computeReadingProgress({
    rootTop: -20,
    rootHeight: 2000,
    viewportHeight: 900,
    navHeight: 60,
  })
  assert.ok(immersive <= normal)
})

test('progress: 极端负值仍夹在 0..100', () => {
  const value = computeReadingProgress({ ...base, rootTop: -99999, rootHeight: 2000 })
  assert.equal(value, 100)
})

/* ==================== 统计 ==================== */

if (failures.length) {
  console.error(`\nTOC 单元用例失败 ${failures.length} / ${passed + failures.length}\n`)
  failures.forEach(({ name, error }) => {
    console.error(`✗ ${name}`)
    console.error(String(error?.message || error).split('\n').slice(0, 4).join('\n'))
  })
  process.exitCode = 1
} else {
  console.log(`TOC 单元用例通过：${passed} 条`)
}
