<template>
  <div class="atlas-veil" :data-open="open ? 'true' : 'false'" aria-hidden="true"></div>

  <section class="atlas-sheet" :data-open="open ? 'true' : 'false'" role="dialog" aria-modal="true"
    tabindex="-1" :aria-label="title" :inert="open ? undefined : true" @keydown="handleKeydown">
    <header class="atlas-head">
      <div class="atlas-brand">
        <span class="atlas-brand__glyph" aria-hidden="true"><i class="fas fa-cloud"></i></span>
        <span class="atlas-brand__copy">
          <small>CATEGORY ATLAS</small>
          <strong>{{ title }}</strong>
        </span>
      </div>

      <ol class="atlas-steps" :aria-label="levelLabel">
        <li v-for="(label, index) in levelLabels" :key="`step-${index}`" :class="{
          'is-done': index < activeLevel,
          'is-now': index === activeLevel,
        }">
          <span class="atlas-step__no">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="atlas-step__label">{{ label }}</span>
        </li>
      </ol>

      <div class="atlas-tools">
        <div class="atlas-types" role="radiogroup" :aria-label="title">
          <button v-for="item in types" :key="item.key" type="button" class="atlas-type__btn"
            :class="{ 'is-active': currentType === item.key }" role="radio"
            :aria-checked="currentType === item.key ? 'true' : 'false'" @click="emit('type', item.key)">
            {{ item.label }}
          </button>
        </div>
        <button ref="closeRef" type="button" class="atlas-close" :aria-label="closeLabel" :title="closeLabel"
          @click="emit('close')">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <div ref="stageRef" class="atlas-stage" @pointermove="updatePointer" @pointerdown="handlePointerDown"
      @pointerup="handlePointerUp" @pointerleave="handlePointerLeave" @pointercancel="handlePointerLeave">
      <canvas ref="canvasRef" class="atlas-canvas" aria-hidden="true"></canvas>

      <div class="atlas-stage__vignette" aria-hidden="true"></div>

      <div v-if="loading" class="atlas-loading" role="status">
        <span class="atlas-loading__cloud" aria-hidden="true"></span>
        <span>正在铺开云海</span>
      </div>

      <div v-if="sceneError" class="atlas-fallback" role="list">
        <p class="atlas-fallback__title">{{ levelLabel }}</p>
        <div class="atlas-fallback__list">
          <button v-for="item in tags" :key="`fallback-${item.tag ?? '__all__'}`" type="button" class="atlas-fallback__item"
            :class="{ 'is-active': item.selected }" @click="selectTag(item.tag)">
            <span>{{ item.tag === null ? allLabel : item.tag }}</span>
            <em>{{ item.count }}</em>
          </button>
        </div>
      </div>

      <div class="atlas-stage__caption" aria-live="polite">
        <span class="atlas-stage__depth">{{ String(activeLevel + 1).padStart(2, '0') }} / {{ String(maxLevels).padStart(2, '0') }}</span>
        <span>{{ levelLabel }}</span>
        <em v-if="pendingLabel">选择「{{ pendingLabel }}」</em>
      </div>

      <div class="atlas-stage__count" aria-hidden="true">
        <strong>{{ total }}</strong>
        <span>篇</span>
      </div>

      <!-- Canvas 不可用时的键盘替代，同时给读屏软件保留可操作入口 -->
      <div class="atlas-a11y">
        <button v-for="item in tags" :key="`sr-${item.tag ?? '__all__'}`" type="button" @click="selectTag(item.tag)">
          {{ item.tag === null ? allLabel : item.tag }} · {{ item.count }}
        </button>
      </div>
    </div>

    <footer class="atlas-foot">
      <nav class="atlas-path" :aria-label="title">
        <span v-if="!path.length" class="atlas-path__current">{{ allLabel }}</span>
        <button v-else type="button" class="atlas-path__crumb" @click="emit('jump', 0)">{{ allLabel }}</button>

        <template v-for="(tag, index) in path" :key="`path-${index}-${tag}`">
          <i class="fas fa-chevron-right atlas-path__sep" aria-hidden="true"></i>
          <span v-if="index === path.length - 1" class="atlas-path__current" aria-current="true">{{ tag }}</span>
          <button v-else type="button" class="atlas-path__crumb" @click="emit('jump', index + 1)">
            {{ tag }}
          </button>
        </template>

        <template v-if="pendingLabel">
          <i class="fas fa-chevron-right atlas-path__sep" aria-hidden="true"></i>
          <span class="atlas-path__pending">{{ pendingLabel }}</span>
        </template>
      </nav>

      <div class="atlas-foot__hint">
        <span><i class="fas fa-hand-pointer" aria-hidden="true"></i> 点击云朵逐级选择</span>
        <span><kbd>ESC</kbd> 关闭</span>
      </div>
    </footer>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  tags: { type: Array, default: () => [] },
  ancestors: { type: Array, default: () => [] },
  activeLevel: { type: Number, default: 0 },
  maxLevels: { type: Number, default: 3 },
  levelLabel: { type: String, default: '' },
  levelLabels: { type: Array, default: () => [] },
  path: { type: Array, default: () => [] },
  pendingLabel: { type: String, default: '' },
  total: { type: Number, default: 0 },
  types: { type: Array, default: () => [] },
  currentType: { type: String, default: 'all' },
  title: { type: String, default: '' },
  allLabel: { type: String, default: '全部' },
  closeLabel: { type: String, default: '关闭' },
})

const emit = defineEmits(['close', 'select', 'jump', 'type'])

const stageRef = ref(null)
const canvasRef = ref(null)
const closeRef = ref(null)
const loading = ref(false)
const sceneError = ref(false)

const palette = [
  [255, 198, 216],
  [166, 210, 252],
  [174, 236, 214],
  [204, 192, 255],
  [255, 218, 174],
  [184, 222, 246],
  [250, 194, 179],
]
const ALL_TONE = [214, 231, 247]

const hashText = (text) => {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

const toneFor = (tag, isAll, isGhost) => {
  if (isAll) return ALL_TONE
  const base = palette[hashText(String(tag)) % palette.length]
  if (!isGhost) return base
  return base.map((value) => Math.round((value + 242) / 2))
}

const visibleTags = computed(() => props.tags.filter((item) => item && typeof item === 'object'))
const ghostTags = computed(() => props.ancestors.filter((item) => item && item.tag))

let ctx = null
let cssWidth = 0
let cssHeight = 0
let dpr = 1
let nodes = []
let orderedNodes = []
let dust = []
let running = false
let rafId = 0
let lastFrame = 0
let sceneTime = 0
let resizeObserver = null
let reducedMotion = false

const pointer = { x: 0, y: 0, ndcX: 0, ndcY: 0, inside: false }
const parallax = { x: 0, y: 0, tx: 0, ty: 0 }
let hoveredNode = null
let pointerDirty = false
let pointerDown = false
let pointerStart = null
let textureCache = new Map()
let haloCache = new Map()
let dustTexture = null
let ambientTexture = null

const makeCloudPath = (context) => {
  context.beginPath()
  context.moveTo(112, 300)
  context.bezierCurveTo(48, 300, 14, 256, 22, 202)
  context.bezierCurveTo(30, 146, 74, 110, 124, 116)
  context.bezierCurveTo(128, 58, 184, 24, 244, 36)
  context.bezierCurveTo(278, 2, 338, 4, 376, 42)
  context.bezierCurveTo(418, 22, 476, 30, 510, 74)
  context.bezierCurveTo(564, 58, 616, 84, 640, 128)
  context.bezierCurveTo(704, 128, 756, 168, 760, 218)
  context.bezierCurveTo(764, 268, 708, 300, 642, 300)
  context.closePath()
}

const roundedRect = (context, x, y, width, height, radius) => {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

const fitLabel = (context, text, maxWidth, initialSize) => {
  let size = initialSize
  context.font = `700 ${size}px "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`
  while (context.measureText(text).width > maxWidth && size > 40) {
    size -= 4
    context.font = `700 ${size}px "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`
  }
  return size
}

const drawCloudBody = (context, tone, ghost) => {
  context.save()
  context.shadowColor = ghost ? 'rgba(67, 91, 126, 0.12)' : 'rgba(49, 75, 112, 0.26)'
  context.shadowBlur = ghost ? 18 : 30
  context.shadowOffsetY = ghost ? 8 : 16
  context.fillStyle = ghost ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.02)'
  makeCloudPath(context)
  context.fill()
  context.restore()

  const body = context.createLinearGradient(0, 28, 0, 302)
  body.addColorStop(0, 'rgba(255, 255, 255, 0.99)')
  body.addColorStop(0.36, 'rgba(255, 255, 255, 0.82)')
  body.addColorStop(0.64, 'rgba(255, 255, 255, 0.52)')
  body.addColorStop(1, `rgba(${tone.join(',')}, ${ghost ? 0.55 : 0.95})`)

  context.save()
  makeCloudPath(context)
  context.fillStyle = body
  context.fill()
  context.lineWidth = ghost ? 2 : 3
  context.strokeStyle = ghost ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.86)'
  context.stroke()

  context.translate(42, 18)
  context.scale(0.9, 0.86)
  makeCloudPath(context)
  context.fillStyle = ghost ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.56)'
  context.fill()
  context.restore()

  context.save()
  makeCloudPath(context)
  context.clip()
  const sheen = context.createRadialGradient(268, 106, 4, 268, 106, 250)
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.96)')
  sheen.addColorStop(0.34, 'rgba(255, 255, 255, 0.34)')
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = sheen
  context.fillRect(0, 0, 800, 360)

  context.fillStyle = 'rgba(255, 255, 255, 0.46)'
  context.beginPath()
  context.ellipse(214, 112, 82, 27, -0.12, 0, Math.PI * 2)
  context.ellipse(526, 132, 60, 18, 0.22, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

const makeCloudCanvas = (item, ghost) => {
  const key = `${item.tag ?? '__all__'}|${item.count}|${item.tone.join(',')}|${ghost ? 1 : 0}`
  if (textureCache.has(key)) return textureCache.get(key)

  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 360
  const context = canvas.getContext('2d')
  if (!context) return null

  const label = item.tag === null ? props.allLabel : item.tag
  const tone = item.tone

  const halo = context.createRadialGradient(400, 208, 22, 400, 208, 352)
  halo.addColorStop(0, `rgba(${tone.join(',')}, ${ghost ? 0.1 : 0.22})`)
  halo.addColorStop(0.58, `rgba(${tone.join(',')}, ${ghost ? 0.04 : 0.1})`)
  halo.addColorStop(1, `rgba(${tone.join(',')}, 0)`)
  context.fillStyle = halo
  context.fillRect(0, 0, 800, 360)

  drawCloudBody(context, tone, ghost)

  const fontSize = fitLabel(context, label, 460, 82)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = ghost ? 'rgba(58, 79, 111, 0.46)' : '#21364b'
  context.shadowColor = 'rgba(255, 255, 255, 0.9)'
  context.shadowBlur = 8
  context.fillText(label, 360, 236)
  context.shadowBlur = 0
  context.font = `700 ${fontSize}px "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`

  roundedRect(context, 640, 198, 88, 54, 24)
  context.fillStyle = ghost ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.88)'
  context.fill()
  context.strokeStyle = ghost ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.98)'
  context.lineWidth = 2
  context.stroke()
  context.fillStyle = ghost ? 'rgba(58, 79, 111, 0.42)' : '#475b70'
  context.font = '600 32px "Noto Sans SC", "SFMono-Regular", "Segoe UI", sans-serif'
  context.fillText(String(item.count), 684, 228)

  textureCache.set(key, canvas)
  return canvas
}

const makeHaloCanvas = (tone) => {
  const key = tone.join(',')
  if (haloCache.has(key)) return haloCache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) return null
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 124)
  gradient.addColorStop(0, `rgba(${tone.join(',')}, 0.7)`)
  gradient.addColorStop(0.34, `rgba(${tone.join(',')}, 0.24)`)
  gradient.addColorStop(1, `rgba(${tone.join(',')}, 0)`)
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  haloCache.set(key, canvas)
  return canvas
}

const makeDustCanvas = () => {
  if (dustTexture) return dustTexture
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return null
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 30)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  gradient.addColorStop(0.45, 'rgba(194, 224, 250, 0.42)')
  gradient.addColorStop(1, 'rgba(194, 224, 250, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  dustTexture = canvas
  return canvas
}

const makeAmbientCanvas = () => {
  if (ambientTexture) return ambientTexture
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 360
  const context = canvas.getContext('2d')
  if (!context) return null
  drawCloudBody(context, [206, 226, 246], false)
  ambientTexture = canvas
  return canvas
}

const makeDustParticles = () => {
  const count = window.innerWidth < 720 ? 52 : 104
  const next = []
  for (let i = 0; i < count; i++) {
    next.push({
      x: Math.random(),
      y: Math.random(),
      size: 2 + Math.random() * 5.5,
      alpha: 0.18 + Math.random() * 0.45,
      drift: 0.002 + Math.random() * 0.006,
      phase: Math.random() * Math.PI * 2,
    })
  }
  return next
}

const buildNodes = () => {
  textureCache = new Map()
  const allSource = visibleTags.value.find((item) => item.tag === null)
  const current = visibleTags.value
    .filter((item) => item.tag !== null)
    .map((item) => ({
      ...item,
      tone: toneFor(item.tag, false, false),
      isAll: false,
    }))
  const all = allSource
    ? {
        ...allSource,
        tone: ALL_TONE,
        isAll: true,
      }
    : null

  const next = []
  const items = all ? [all, ...current] : current
  items.forEach((item, index) => {
    const canvas = makeCloudCanvas(item, false)
    if (!canvas) return
    const hash = hashText(String(item.tag ?? '__all__'))
    next.push({
      tag: item.tag,
      item,
      canvas,
      halo: makeHaloCanvas(item.tone),
      isGhost: false,
      selected: Boolean(item.selected) || item.isAll,
      interactive: true,
      phase: (hash % 100) / 100 * Math.PI * 2,
      bob: 0.65 + (hash % 9) / 10,
      revealAt: performance.now() + 45 + index * 30,
      reveal: 0,
      screen: null,
      anchorX: 0,
      anchorY: 0,
      baseW: 120,
      z: 0,
    })
  })

  ghostTags.value.forEach((item, index) => {
    const ghostItem = {
      tag: item.tag,
      count: item.count,
      tone: toneFor(item.tag, false, true),
      selected: false,
    }
    const canvas = makeCloudCanvas(ghostItem, true)
    if (!canvas) return
    const hash = hashText(String(item.tag))
    next.push({
      tag: item.tag,
      item: ghostItem,
      canvas,
      halo: makeHaloCanvas(ghostItem.tone),
      isGhost: true,
      selected: false,
      interactive: false,
      phase: (hash % 100) / 100 * Math.PI * 2,
      bob: 0.52,
      revealAt: performance.now() + 70 + index * 50,
      reveal: 0,
      screen: null,
      anchorX: 0,
      anchorY: 0,
      baseW: 80,
      z: -3.2 - index * 0.35,
    })
  })

  nodes = next
  orderedNodes = [...nodes].sort((a, b) => a.z - b.z)
  dust = makeDustParticles()
  dustTexture = makeDustCanvas()
  ambientTexture = makeAmbientCanvas()
}

const layoutNodes = () => {
  if (!stageRef.value) return
  const mobile = cssWidth < 720
  const current = nodes.filter((node) => !node.isGhost)
  const ghosts = nodes.filter((node) => node.isGhost)
  nodes.forEach((node) => {
    node.hidden = false
  })

  if (mobile) {
    const count = current.length
    const columns =
      count <= 4
        ? cssWidth > 560
          ? 2
          : 1
        : count <= 9
          ? cssWidth > 560
            ? 3
            : 2
          : count <= 12
            ? 3
            : cssWidth <= 420
              ? 3
              : 4
    const gapX = 9
    const gapY = 10
    const padX = 14
    const rows = Math.max(1, Math.ceil(count / columns))
    const cellW = (cssWidth - padX * 2 - gapX * (columns - 1)) / columns
    const cloudW = Math.min(count <= 4 ? 300 : 210, Math.max(62, cellW * 0.96))
    const cellH = Math.max(
      cloudW * 0.45 + 16,
      (cssHeight - 56 - gapY * (rows - 1)) / rows,
    )
    const contentH = rows * cellH + gapY * (rows - 1)
    const top = Math.max(18, (cssHeight - contentH) / 2 + 6)
    current.forEach((node, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      node.anchorX = padX + cellW / 2 + column * (cellW + gapX) + (row % 2 ? 2 : -2)
      node.anchorY = top + cellH / 2 + row * (cellH + gapY)
      node.baseW = cloudW
      node.z = 0.16 + (hashText(String(node.tag ?? '__all__')) % 8) / 100
      node.hidden = false
    })
    ghosts.forEach((node) => {
      node.hidden = true
    })
  } else {
    const sparse = current.length <= 5
    const tight = current.length <= 4
    const unit =
      Math.max(34, Math.min((cssWidth - 64) / 12.4, (cssHeight - 48) / 9.2)) *
      (tight ? 1.2 : sparse ? 1.12 : 1)
    const cx = cssWidth / 2
    const cy = cssHeight / 2
    const allNode = current.find((node) => node.tag === null)
    const others = current.filter((node) => node.tag !== null)
    const ringDefs = [
      { count: 5, rx: 3.15, ry: 2.0, scale: 1.0, z: 0.2 },
      { count: 8, rx: 4.45, ry: 3.05, scale: 0.92, z: -0.15 },
      { count: 99, rx: 5.68, ry: 3.75, scale: 0.83, z: -0.58 },
    ]
    const ringCount = others.length <= 4 ? 1 : others.length <= 12 ? 2 : 3
    if (allNode) {
      allNode.anchorX = cx
      allNode.anchorY = cy + 2
      allNode.baseW = Math.min((tight ? 3.35 : 3.16) * unit, cssWidth * 0.4)
      allNode.z = 1.25
    }
    let offset = 0
    let ringIndex = 0
    for (const def of ringDefs) {
      if (ringIndex >= ringCount) break
      const remaining = others.slice(offset, offset + def.count)
      if (!remaining.length) break
      const start = -Math.PI / 2 + ringIndex * 0.42
      remaining.forEach((node, index) => {
        const hash = hashText(String(node.tag))
        const angle = start + (index / remaining.length) * Math.PI * 2 + ((hash % 17) / 17 - 0.5) * 0.08
        const scaleX = remaining.length < 3 ? 0.82 : 1
        node.anchorX = cx + Math.cos(angle) * def.rx * unit * scaleX
        node.anchorY = cy - Math.sin(angle) * def.ry * unit * (remaining.length < 3 ? 0.82 : 1)
        node.baseW = Math.min((tight ? 2.42 : 2.18) * def.scale * unit, cssWidth * 0.36)
        node.z = def.z + ((hash % 13) / 13 - 0.5) * 0.38
      })
      offset += remaining.length
      ringIndex += 1
      if (offset >= others.length) break
    }
    ghosts.forEach((node, index) => {
      node.anchorX = cx - 0.34 * cssWidth + index * 0.14 * cssWidth
      node.anchorY = 44 + index * 8
      node.baseW = Math.min(1.55 * unit, cssWidth * 0.2)
    })
  }

  // 重新开始入场动画，避免层级切换时旧云闪跳
  const now = performance.now()
  nodes.forEach((node, index) => {
    node.revealAt = now + 40 + index * 32
    node.reveal = 0
    node.screen = null
  })
  orderedNodes = [...nodes].sort((a, b) => a.z - b.z)
}

const drawAmbient = () => {
  if (!ctx || !ambientTexture) return
  const clouds = [
    { x: 0.1, y: 0.19, w: 0.38, alpha: 0.15, phase: 0.4 },
    { x: 0.88, y: 0.7, w: 0.33, alpha: 0.13, phase: 2.1 },
    { x: 0.22, y: 0.87, w: 0.3, alpha: 0.11, phase: 4.4 },
    { x: 0.82, y: 0.12, w: 0.24, alpha: 0.09, phase: 5.2 },
  ]
  clouds.forEach((cloud) => {
    const width = cssWidth * cloud.w
    const height = width * 0.45
    const drift = reducedMotion ? 0 : Math.sin(sceneTime * 0.12 + cloud.phase) * 8
    ctx.globalAlpha = cloud.alpha
    ctx.drawImage(
      ambientTexture,
      cssWidth * cloud.x - width / 2 + drift,
      cssHeight * cloud.y - height / 2,
      width,
      height,
    )
  })
  ctx.globalAlpha = 1
}

const drawOrbits = () => {
  if (!ctx || cssWidth < 720) return
  const cx = cssWidth / 2
  const cy = cssHeight / 2
  const unit = Math.max(34, Math.min((cssWidth - 64) / 12.4, (cssHeight - 48) / 9.2))
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(1, 0.82)
  ;[
    { rx: 3.45, ry: 3.45, alpha: 0.15 },
    { rx: 4.85, ry: 4.85, alpha: 0.1 },
    { rx: 6.1, ry: 6.1, alpha: 0.06 },
  ].forEach((ring, index) => {
    ctx.beginPath()
    ctx.arc(0, 0, ring.rx * unit, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(137, 170, 204, ${ring.alpha})`
    ctx.lineWidth = index === 0 ? 1 : 0.8
    ctx.setLineDash(index === 2 ? [5, 7] : [])
    ctx.stroke()
  })
  ctx.restore()
}

const drawDust = () => {
  if (!ctx || !dustTexture) return
  dust.forEach((particle) => {
    const x = particle.x * cssWidth
    const y = particle.y * cssHeight
    const twinkle = 0.72 + 0.28 * Math.sin(sceneTime * 0.38 + particle.phase)
    const size = particle.size * twinkle
    ctx.globalAlpha = particle.alpha * twinkle
    ctx.drawImage(dustTexture, x - size / 2, y - size / 2, size, size)
  })
  ctx.globalAlpha = 1
}

const drawCloudNode = (node) => {
  if (!ctx || node.hidden) return
  const elapsed = (performance.now() - node.revealAt) / 620
  const reveal = reducedMotion ? 1 : Math.min(1, Math.max(0, elapsed))
  node.reveal = reveal
  if (reveal <= 0) {
    node.screen = null
    return
  }
  const eased = 1 - (1 - reveal) ** 3
  const hover = node === hoveredNode ? 1 : 0
  const selected = node.selected && !node.isGhost
  const depth = 1 + node.z * 0.08
  const bobX = reducedMotion ? 0 : Math.cos(sceneTime * 0.42 + node.phase) * 2.4
  const bobY = reducedMotion ? 0 : Math.sin(sceneTime * node.bob + node.phase) * 3.2
  const parallaxX = cssWidth < 720 ? 0 : parallax.x * (0.45 + Math.max(0, node.z) * 0.22) * 8
  const parallaxY = cssHeight < 720 ? 0 : parallax.y * (0.3 + Math.max(0, node.z) * 0.16) * 6
  const width = node.baseW * depth * (0.72 + eased * 0.28) * (selected ? 1.02 : 1) * (hover ? 1.045 : 1)
  const height = width * 0.45
  const x = node.anchorX + bobX + parallaxX
  const y = node.anchorY + bobY + parallaxY
  const alpha = node.isGhost ? 0.3 : Math.min(0.96, eased)

  if (!node.isGhost && node.halo) {
    const haloWidth = width * 1.6
    const haloHeight = height * 2.25
    ctx.globalAlpha = alpha * (selected ? 0.42 : hover ? 0.32 : 0.4)
    ctx.drawImage(node.halo, x - haloWidth / 2, y - haloHeight / 2, haloWidth, haloHeight)
  }

  ctx.globalAlpha = alpha
  ctx.drawImage(node.canvas, x - width / 2, y - height / 2, width, height)
  ctx.globalAlpha = 1
  node.screen = { x, y, width, height }
}

const renderFrame = (now) => {
  if (!running) return
  if (!ctx) return
  const delta = lastFrame ? Math.min(40, now - lastFrame) : 16
  lastFrame = now
  sceneTime += delta / 1000

  parallax.x += (parallax.tx - parallax.x) * 0.07
  parallax.y += (parallax.ty - parallax.y) * 0.07
  if (pointerDirty) {
    updateHover()
    pointerDirty = false
  }

  ctx.clearRect(0, 0, cssWidth, cssHeight)
  drawAmbient()
  drawOrbits()
  drawDust()

  orderedNodes.forEach((node) => drawCloudNode(node))

  rafId = requestAnimationFrame(renderFrame)
}

const startLoop = () => {
  if (running) return
  running = true
  lastFrame = 0
  rafId = requestAnimationFrame(renderFrame)
}

const stopLoop = () => {
  running = false
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  lastFrame = 0
}

const resizeCanvas = () => {
  if (!canvasRef.value || !stageRef.value) return
  cssWidth = Math.max(1, stageRef.value.clientWidth)
  cssHeight = Math.max(1, stageRef.value.clientHeight)
  dpr = Math.min(window.devicePixelRatio || 1, 1.8)
  canvasRef.value.width = Math.floor(cssWidth * dpr)
  canvasRef.value.height = Math.floor(cssHeight * dpr)
  ctx = canvasRef.value.getContext('2d')
  if (!ctx) {
    sceneError.value = true
    return
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
}

const rebuildMap = () => {
  if (!props.open) return
  loading.value = true
  sceneError.value = false
  nextTick(() => {
    try {
      resizeCanvas()
      if (!ctx) return
      buildNodes()
      layoutNodes()
      loading.value = false
      startLoop()
      nextTick(() => closeRef.value?.focus())
    } catch (error) {
      console.warn('[CloudAtlas] canvas map unavailable', error)
      sceneError.value = true
      loading.value = false
    }
  })
}

const handleResize = () => {
  if (!props.open) return
  if (!ctx) {
    rebuildMap()
    return
  }
  resizeCanvas()
  if (ctx) {
    layoutNodes()
  }
}

const updatePointer = (event) => {
  if (!stageRef.value) return
  const rect = stageRef.value.getBoundingClientRect()
  pointer.x = event.clientX - rect.left
  pointer.y = event.clientY - rect.top
  pointer.ndcX = (pointer.x / Math.max(1, rect.width)) * 2 - 1
  pointer.ndcY = -(pointer.y / Math.max(1, rect.height)) * 2 + 1
  pointer.inside = true
  parallax.tx = pointer.ndcX * 0.42
  parallax.ty = pointer.ndcY * 0.28
  pointerDirty = true
}

const findHit = (x, y) => {
  for (let i = orderedNodes.length - 1; i >= 0; i--) {
    const node = orderedNodes[i]
    if (!node.interactive || !node.screen || node.hidden) continue
    const { screen } = node
    if (
      x >= screen.x - screen.width / 2 &&
      x <= screen.x + screen.width / 2 &&
      y >= screen.y - screen.height / 2 &&
      y <= screen.y + screen.height / 2
    ) {
      return node
    }
  }
  return null
}

const updateHover = () => {
  const hit = pointer.inside ? findHit(pointer.x, pointer.y) : null
  if (hit !== hoveredNode) {
    hoveredNode = hit
    if (canvasRef.value) canvasRef.value.style.cursor = hoveredNode ? 'pointer' : 'default'
  }
}

const handlePointerDown = (event) => {
  pointerDown = true
  pointerStart = { x: event.clientX, y: event.clientY }
}

const handlePointerUp = (event) => {
  if (!pointerDown) return
  pointerDown = false
  if (!pointerStart) return
  const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y)
  pointerStart = null
  if (moved > 8) return
  updatePointer(event)
  updateHover()
  if (hoveredNode?.interactive) emit('select', hoveredNode.tag)
}

const handlePointerLeave = () => {
  pointerDown = false
  pointerStart = null
  pointer.inside = false
  pointerDirty = false
  hoveredNode = null
  parallax.tx = 0
  parallax.ty = 0
  if (canvasRef.value) canvasRef.value.style.cursor = 'default'
}

const handleKeydown = (event) => {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

const selectTag = (tag) => {
  if (tag === undefined) return
  emit('select', tag)
}

watch(
  () => props.open,
  (open) => {
    if (open) rebuildMap()
    else stopLoop()
  },
  { immediate: true },
)

watch(
  () => [props.tags, props.activeLevel, props.ancestors],
  () => {
    if (!props.open) return
    if (ctx) {
      rebuildMap()
    }
  },
  { deep: true },
)

onMounted(() => {
  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(stageRef.value)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  stopLoop()
  resizeObserver?.disconnect()
  window.removeEventListener('resize', handleResize)
  textureCache.clear()
  haloCache.clear()
  dust = []
})

</script>

<style scoped>
.atlas-veil {
  position: fixed;
  inset: 0;
  z-index: 1700;
  opacity: 0;
  visibility: hidden;
  background:
    radial-gradient(70% 60% at 14% 8%, rgba(255, 203, 221, 0.14), transparent 66%),
    rgba(239, 247, 253, 0.84);
  backdrop-filter: blur(18px) saturate(1.08);
  transition:
    opacity 460ms ease,
    visibility 0s linear 460ms;
}

.atlas-veil[data-open='true'] {
  opacity: 1;
  visibility: visible;
  transition:
    opacity 460ms ease,
    visibility 0s linear 0s;
}

.atlas-sheet {
  position: fixed;
  inset: 0;
  z-index: 1750;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: #21364b;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(16px) scale(0.988);
  transition:
    opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s linear 520ms;
  backdrop-filter: blur(26px) saturate(1.16);
  -webkit-backdrop-filter: blur(26px) saturate(1.16);
}

.atlas-sheet[data-open='true'] {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
  transition:
    opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s linear 0s;
}

.atlas-sheet::before,
.atlas-sheet::after {
  content: none;
}

.atlas-sheet::before {
  width: 46vw;
  height: 36vw;
  left: -12vw;
  top: -12vw;
  background: radial-gradient(circle, rgba(255, 189, 214, 0.16), transparent 68%);
}

.atlas-sheet::after {
  width: 50vw;
  height: 42vw;
  right: -14vw;
  bottom: -18vw;
  background: radial-gradient(circle, rgba(165, 206, 243, 0.18), transparent 68%);
}

.atlas-head,
.atlas-foot {
  position: relative;
  z-index: 5;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 30px 16px;
  border-bottom: 1px solid rgba(67, 94, 120, 0.12);
  background: transparent;
}

.atlas-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 190px;
}

.atlas-brand__glyph {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: #5a7b9f;
  font-size: 0.9375rem;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.38);
  box-shadow: 0 8px 18px -12px rgba(67, 98, 134, 0.4);
}

.atlas-brand__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.atlas-brand__copy small {
  color: #758ba1;
  font-size: 0.59375rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  white-space: nowrap;
}

.atlas-brand__copy strong {
  color: #21364b;
  font-size: 1.125rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.atlas-steps {
  display: flex;
  align-items: center;
  gap: 0;
  margin: 0 auto 0 0;
  padding: 0;
  list-style: none;
}

.atlas-steps li {
  display: flex;
  align-items: baseline;
  gap: 7px;
  color: #9aabbc;
  font-size: 0.78125rem;
  transition: color 300ms ease;
}

.atlas-steps li + li::before {
  content: '';
  display: inline-block;
  width: 30px;
  height: 1px;
  margin: 0 12px;
  background: rgba(117, 143, 169, 0.24);
  vertical-align: middle;
}

.atlas-steps li.is-done {
  color: #617b94;
}

.atlas-steps li.is-now {
  color: #2e5576;
}

.atlas-step__no {
  font-family: 'SFMono-Regular', 'Cascadia Code', monospace;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.atlas-step__label {
  white-space: nowrap;
}

.atlas-tools {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
}

.atlas-types {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
}

.atlas-type__btn {
  position: relative;
  padding: 7px 10px;
  border: none;
  border-radius: 5px;
  color: #70859a;
  background: transparent;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition:
    color 220ms ease,
    background 220ms ease;
}

.atlas-type__btn:hover {
  color: #2d4c68;
  background: rgba(255, 255, 255, 0.38);
}

.atlas-type__btn.is-active {
  color: #274d6d;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.atlas-type__btn.is-active::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 3px;
  height: 2px;
  border-radius: 2px;
  background: #8fc8ef;
}

.atlas-close {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  color: #3f5d79;
  background: rgba(255, 255, 255, 0.36);
  cursor: pointer;
  transition:
    background 220ms ease,
    transform 220ms ease;
}

.atlas-close:hover {
  background: rgba(255, 255, 255, 0.76);
  transform: rotate(8deg);
}

.atlas-stage {
  position: relative;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  background: transparent;
  touch-action: none;
}

.atlas-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.atlas-stage__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 18%, transparent 84%, rgba(212, 232, 247, 0.1)),
    radial-gradient(ellipse at center, transparent 48%, rgba(209, 229, 246, 0.16) 100%);
}

.atlas-loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  color: #6d8397;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  background: rgba(251, 254, 255, 0.56);
  backdrop-filter: blur(6px);
}

.atlas-loading__cloud {
  width: 62px;
  height: 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow:
    18px -10px 0 -3px rgba(255, 255, 255, 0.78),
    36px -4px 0 -6px rgba(255, 255, 255, 0.7),
    0 12px 24px -12px rgba(94, 132, 170, 0.28);
  animation: atlas-cloud-pulse 1.8s ease-in-out infinite;
}

@keyframes atlas-cloud-pulse {
  0%,
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.74;
  }
  50% {
    transform: translateY(-5px) scale(1.04);
    opacity: 1;
  }
}

.atlas-stage__caption {
  position: absolute;
  left: 30px;
  bottom: 22px;
  z-index: 3;
  display: flex;
  align-items: baseline;
  gap: 9px;
  color: #647b90;
  font-size: 0.6875rem;
  pointer-events: none;
}

.atlas-stage__caption em {
  color: #2f5878;
  font-style: normal;
  font-weight: 600;
}

.atlas-stage__depth {
  font-family: 'SFMono-Regular', 'Cascadia Code', monospace;
  color: #88a0b4;
  font-size: 0.625rem;
  letter-spacing: 0.06em;
}

.atlas-stage__count {
  position: absolute;
  right: 32px;
  bottom: 16px;
  z-index: 3;
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: #7b90a3;
  font-size: 0.625rem;
  pointer-events: none;
}

.atlas-stage__count strong {
  color: #3b5f80;
  font-family: 'SFMono-Regular', 'Cascadia Code', monospace;
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1;
}

.atlas-a11y {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.atlas-fallback {
  position: absolute;
  inset: 0;
  z-index: 3;
  padding: 30px;
  overflow: auto;
  background: rgba(249, 253, 255, 0.68);
}

.atlas-fallback__title {
  margin: 0 0 18px;
  color: #5b7287;
  font-size: 0.75rem;
}

.atlas-fallback__list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.atlas-fallback__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 18px;
  color: #2d4c67;
  background: rgba(255, 255, 255, 0.6);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

.atlas-fallback__item em {
  color: #7d93a6;
  font-size: 0.625rem;
  font-style: normal;
}

.atlas-fallback__item.is-active {
  border-color: rgba(148, 196, 228, 0.7);
  background: #fff;
}

.atlas-foot {
  justify-content: space-between;
  gap: 24px;
  padding: 13px 30px 18px;
  border-top: 1px solid rgba(67, 94, 120, 0.12);
  border-bottom: none;
  background: transparent;
}

.atlas-path {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  color: #7d91a4;
  font-size: 0.6875rem;
  white-space: nowrap;
}

.atlas-path__crumb,
.atlas-path__current,
.atlas-path__pending {
  border: none;
  font: inherit;
}

.atlas-path__crumb {
  padding: 4px 3px;
  color: #6d8498;
  background: transparent;
  cursor: pointer;
  transition: color 200ms ease;
}

.atlas-path__crumb:hover {
  color: #2d5474;
}

.atlas-path__current {
  color: #21364b;
  font-weight: 700;
}

.atlas-path__pending {
  color: #95a8b8;
  border-bottom: 1px dashed rgba(146, 168, 187, 0.54);
}

.atlas-path__sep {
  color: #abbdcc;
  font-size: 0.5rem;
}

.atlas-foot__hint {
  display: flex;
  align-items: center;
  gap: 18px;
  flex: 0 0 auto;
  color: #8296a8;
  font-size: 0.625rem;
}

.atlas-foot__hint span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.atlas-foot__hint i {
  color: #7094b1;
}

.atlas-foot__hint kbd {
  padding: 2px 5px;
  border: 1px solid rgba(130, 156, 180, 0.3);
  border-radius: 4px;
  color: #6d8498;
  background: rgba(255, 255, 255, 0.42);
  font-family: 'SFMono-Regular', 'Cascadia Code', monospace;
  font-size: 0.5625rem;
}

@media (max-width: 930px) {
  .atlas-head {
    gap: 14px;
    padding: 16px 20px 13px;
  }

  .atlas-brand {
    min-width: 152px;
  }

  .atlas-steps li + li::before {
    width: 16px;
    margin: 0 7px;
  }

  .atlas-step__label {
    font-size: 0.625rem;
  }

  .atlas-tools {
    gap: 8px;
  }

  .atlas-type__btn {
    padding: 6px 7px;
    font-size: 0.625rem;
  }

  .atlas-step__no {
    display: none;
  }

  .atlas-foot {
    padding-right: 20px;
    padding-left: 20px;
  }
}

@media (max-width: 720px) {
  .atlas-sheet {
    inset: 0;
    border-radius: 0;
    border-width: 0;
  }

  .atlas-head {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px 16px;
    padding: 14px 16px 12px;
  }

  .atlas-brand {
    min-width: 0;
  }

  .atlas-brand__copy strong {
    font-size: 0.9375rem;
  }

  .atlas-steps {
    grid-column: 1 / -1;
    grid-row: 2;
    margin: 0;
  }

  .atlas-tools {
    grid-column: 2;
    grid-row: 1;
  }

  .atlas-types {
    gap: 0;
  }

  .atlas-type__btn {
    padding: 6px 6px;
    font-size: 0.59375rem;
  }

  .atlas-close {
    width: 30px;
    height: 30px;
  }

  .atlas-stage__caption {
    left: 16px;
    bottom: 13px;
    gap: 6px;
    font-size: 0.625rem;
  }

  .atlas-stage__count {
    right: 17px;
    bottom: 10px;
    font-size: 0.5625rem;
  }

  .atlas-stage__count strong {
    font-size: 1.125rem;
  }

  .atlas-foot {
    display: block;
    padding: 10px 16px 13px;
  }

  .atlas-path {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .atlas-path::-webkit-scrollbar {
    display: none;
  }

  .atlas-foot__hint {
    display: none;
  }

  .atlas-fallback {
    padding: 18px 16px;
  }
}

@media (max-width: 360px) {
  .atlas-head {
    gap: 8px 10px;
    padding: 12px 12px 10px;
  }

  .atlas-brand {
    gap: 8px;
  }

  .atlas-brand__glyph {
    width: 30px;
    height: 30px;
    font-size: 0.8125rem;
  }

  .atlas-brand__copy small {
    display: none;
  }

  .atlas-brand__copy strong {
    font-size: 0.875rem;
  }

  .atlas-type__btn {
    padding: 5px 4px;
    font-size: 0.5625rem;
  }

  .atlas-close {
    width: 28px;
    height: 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .atlas-veil,
  .atlas-sheet,
  .atlas-loading__cloud {
    animation: none !important;
    transition-duration: 1ms !important;
  }
}
</style>

