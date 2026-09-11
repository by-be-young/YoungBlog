<template>
  <div
    class="entry-splash"
    :class="[`is-${phase}`, { 'is-complete': loaded, 'is-fast': skipped }]"
    role="status"
    aria-live="polite"
    @click="onSplashClick"
  >
    <!-- ===== 1. 背景层：极光 / 光晕 / 网格 / 扫描线 ===== -->
    <div class="es-backdrop" aria-hidden="true">
      <span class="es-aurora es-aurora--a"></span>
      <span class="es-aurora es-aurora--b"></span>
      <span class="es-aurora es-aurora--c"></span>
      <span class="es-rays"></span>
      <span class="es-grid"></span>
      <span class="es-vignette"></span>
      <span class="es-scan"></span>
      <span class="es-scan es-scan--slow"></span>
    </div>

    <!-- ===== 2. 上升光粒 ===== -->
    <div class="es-particles" aria-hidden="true">
      <span
        v-for="particle in particles"
        :key="particle.id"
        class="es-particle"
        :style="particle.style"
      ></span>
    </div>

    <!-- ===== 3. 主体 ===== -->
    <div class="es-stage">
      <!-- 环形进度 -->
      <div class="es-emblem" :style="{ '--p': percent }">
        <span class="es-halo"></span>

        <svg class="es-ring es-ring--deco" viewBox="0 0 200 200" aria-hidden="true">
          <circle class="es-deco-dash" cx="100" cy="100" r="95" />
          <circle class="es-deco-fine" cx="100" cy="100" r="74" />
        </svg>

        <svg class="es-ring es-ring--progress" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <linearGradient id="esRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffd977" />
              <stop offset="34%" stop-color="#ffb6c9" />
              <stop offset="68%" stop-color="#9ad7ff" />
              <stop offset="100%" stop-color="#a7f3d0" />
            </linearGradient>
          </defs>
          <circle class="es-track" cx="100" cy="100" r="84" />
          <circle
            class="es-value"
            cx="100"
            cy="100"
            r="84"
            :style="{ strokeDasharray: ringCircumference, strokeDashoffset: dashOffset }"
          />
        </svg>

        <span class="es-ticks"></span>

        <span class="es-orbit es-orbit--a"><i></i></span>
        <span class="es-orbit es-orbit--b"><i></i></span>
        <span class="es-orbit es-orbit--c"><i></i></span>

        <span class="es-pointer"><i></i></span>

        <div class="es-core">
          <span class="es-core-glow"></span>
          <span class="es-core-ripple"></span>
          <span class="es-core-ripple es-core-ripple--late"></span>
          <div class="es-readout">
            <span class="es-percent">{{ percentInt }}</span>
            <span class="es-unit">%</span>
          </div>
        </div>
      </div>

      <!-- 主标题 -->
      <h1 class="es-title" :aria-label="title">
        <span
          v-for="(char, index) in titleChars"
          :key="`${char}-${index}`"
          class="es-char"
          :style="{ '--i': index }"
          >{{ char === ' ' ? '\u00A0' : char }}</span
        >
      </h1>
      <p class="es-subtitle">{{ subtitle }}</p>

      <!-- 阶段芯片 -->
      <ul class="es-chips">
        <li
          v-for="(stage, index) in stages"
          :key="stage.key"
          class="es-chip"
          :class="{
            'is-active': index === stageIndex && !isAllDone,
            'is-done': index < stageIndex || isAllDone,
          }"
        >
          <span class="es-chip-dot"></span>
          <span class="es-chip-text">{{ stage.label[langCode] || stage.label.zh }}</span>
        </li>
      </ul>

      <!-- 状态行 -->
      <div class="es-status">
        <span class="es-status-tag" :class="{ 'is-ready': loaded }">
          {{ loaded ? 'READY' : 'LOADING' }}
        </span>
        <span class="es-status-text">{{ loaded ? entryText.ready : stageLabel }}</span>
        <span v-if="loaded" class="es-status-dot"></span>
        <span v-else class="es-caret"></span>
      </div>

      <!-- 进度条 -->
      <div
        class="es-bar"
        role="progressbar"
        :aria-valuenow="percentInt"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span class="es-bar-fill" :style="{ width: `${percent}%` }">
          <span class="es-bar-head"></span>
        </span>
        <span class="es-bar-shimmer"></span>
      </div>

      <div class="es-meta">
        <span class="es-meta-num">{{ percentInt }}%</span>
        <span class="es-sep">·</span>
        <span class="es-meta-tip">{{ loaded ? entryText.ready : tip }}</span>
        <span class="es-sep">·</span>
        <span class="es-meta-skip" :class="{ 'is-strong': loaded }">
          {{ loaded ? entryText.action : entryText.skip }}
        </span>
      </div>

      <!-- 进入提示：加载完成后出现，点击屏幕任意处才进入 -->
      <div class="es-enter" :class="{ 'is-visible': waitingEnter }" aria-hidden="true">
        <span class="es-enter-halo"></span>
        <span class="es-enter-btn">
          <span class="es-enter-ripple"></span>
          <span class="es-enter-ripple es-enter-ripple--late"></span>
          <span class="es-enter-text">{{ entryText.enter }}</span>
          <span class="es-enter-chevron"><i></i><i></i></span>
        </span>
      </div>
    </div>

    <!-- ===== 4. 角落 HUD ===== -->
    <div class="es-hud" aria-hidden="true">
      <span class="es-bracket es-bracket--tl"></span>
      <span class="es-bracket es-bracket--tr"></span>
      <span class="es-bracket es-bracket--bl"></span>
      <span class="es-bracket es-bracket--br"></span>
      <span class="es-hud-text es-hud-text--tl">YOUNGBLOG · ENTRY SEQUENCE</span>
      <span class="es-hud-text es-hud-text--br">QUARTZ ENGINE · v2.0</span>
      <span class="es-crosshair"></span>
    </div>

    <!-- ===== 5. 收尾闪光 ===== -->
    <span class="es-flash" aria-hidden="true"></span>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useEntryLoader } from '@/composables/useEntryLoader'

const emit = defineEmits(['reveal', 'finished'])

const i18n = useI18nStore()

const {
  percent,
  percentInt,
  stageIndex,
  stages,
  stageLabel,
  tip,
  isSettled,
  skipped,
  start,
  requestSkip,
  dispose,
} = useEntryLoader({
  lang: () => i18n.getLang(),
  // maxDuration 使用默认值（60s，仅作为防卡死安全绳）：
  // 首页图片未完整下载并解码前不应该揭幕
  minDuration: 1950,
})

/* ---------- 环形进度几何 ---------- */
const RING_RADIUS = 84
const ringCircumference = 2 * Math.PI * RING_RADIUS
const dashOffset = computed(() => (ringCircumference * (1 - percent.value)).toFixed(2))

/* ---------- 文案 ---------- */
const langCode = computed(() => i18n.getLang())
const title = computed(() => i18n.get('brand'))
const titleChars = computed(() => Array.from(title.value || ''))
const subtitle = computed(() => (i18n.get('welcome_text') || '').split('\n').join(' · '))

/* 加载屏内的操作性文案（随语言切换） */
const ENTRY_TEXT = {
  zh: {
    enter: '点击进入',
    ready: '全部资源已就绪',
    action: '点击屏幕任意处进入首页',
    skip: '点击任意处跳过',
  },
  en: {
    enter: 'Click to enter',
    ready: 'All assets ready',
    action: 'Click anywhere to enter',
    skip: 'Click anywhere to skip',
  },
  ja: {
    enter: 'クリックして開始',
    ready: 'すべての準備が完了',
    action: '画面のどこかをクリックで開始',
    skip: 'クリックでスキップ',
  },
}

const entryText = computed(() => ENTRY_TEXT[langCode.value] || ENTRY_TEXT.zh)

/* ---------- 入场动画时间轴 ---------- */
// boot → loading → ready（等待点击）→ entering → exiting → done
const phase = ref('boot')
let timers = []
let cancelled = false
let enterResolve = null

const holdDuration = computed(() => (skipped.value ? 140 : 400))
const exitDuration = computed(() => (skipped.value ? 480 : 840))

/** 加载已完成（含等待点击 / 退场中） */
const loaded = computed(() => ['ready', 'entering', 'exiting'].includes(phase.value))

/** 正在等待用户点击屏幕进入 */
const waitingEnter = computed(() => phase.value === 'ready')

const delay = (ms) =>
  new Promise((resolve) => {
    const id = setTimeout(resolve, ms)
    timers.push(id)
  })

/** 等待用户点击 / 按键（返回的 Promise 在用户进入时 resolve） */
const waitForEnter = () =>
  new Promise((resolve) => {
    enterResolve = resolve
  })

/** 用户确认进入：仅在「等待点击」状态下生效 */
const enter = () => {
  if (phase.value !== 'ready') return
  phase.value = 'entering'
  if (enterResolve) {
    enterResolve()
    enterResolve = null
  }
}

/** 点击屏幕：等待进入时进入，加载中则跳过 */
const onSplashClick = () => {
  if (phase.value === 'ready') {
    enter()
    return
  }
  if (phase.value === 'boot' || phase.value === 'loading') requestSkip()
}

const waitSettled = async () => {
  while (!isSettled.value && !cancelled) {
    // eslint-disable-next-line no-await-in-loop
    await delay(50)
  }
}

const play = async () => {
  await delay(40)
  if (cancelled) return
  phase.value = 'loading'
  start()

  await waitSettled()
  if (cancelled) return

  // 加载完成：先播放完成特效
  await delay(holdDuration.value)
  if (cancelled) return

  // 停留等待用户点击屏幕后，才真正进入首页
  const entered = waitForEnter()
  phase.value = 'ready'
  await entered
  if (cancelled) return

  phase.value = 'exiting'
  emit('reveal')
  await delay(exitDuration.value)
  if (cancelled) return

  phase.value = 'done'
  emit('finished')
}

/* ---------- 键盘 / 触摸 ---------- */
const onKeydown = () => {
  if (phase.value === 'ready') {
    enter()
    return
  }
  if (phase.value === 'boot' || phase.value === 'loading') requestSkip()
}

onMounted(() => {
  play()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('touchstart', onKeydown, { passive: true })
})

onBeforeUnmount(() => {
  cancelled = true
  timers.forEach((id) => clearTimeout(id))
  timers = []
  enterResolve = null
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('touchstart', onKeydown)
  dispose()
})

/* 进度走到 100% 时，阶段芯片全部置为完成态 */
const isAllDone = computed(() => isSettled.value || skipped.value)

/* ---------- 背景光粒 ---------- */
const seededRandom = (seed, salt) => {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

const particleCount = typeof window !== 'undefined' && window.innerWidth <= 760 ? 26 : 46
const huePalette = [48, 52, 340, 200, 160]

const particles = Array.from({ length: particleCount }, (_, index) => {
  const seed = index + 1
  return {
    id: index,
    style: {
      '--x': `${(seededRandom(seed, 2) * 100).toFixed(2)}%`,
      '--y': `${(seededRandom(seed, 3) * 100).toFixed(2)}%`,
      '--size': `${(2 + seededRandom(seed, 1) * 5).toFixed(2)}px`,
      '--rise': `${(140 + seededRandom(seed, 7) * 260).toFixed(0)}px`,
      '--drift': `${(seededRandom(seed, 6) * 110 - 55).toFixed(1)}px`,
      '--alpha': (0.35 + seededRandom(seed, 8) * 0.55).toFixed(2),
      '--fly': `${(8 + seededRandom(seed, 4) * 10).toFixed(2)}s`,
      '--twinkle': `${(2.4 + seededRandom(seed, 9) * 3.4).toFixed(2)}s`,
      '--delay': `${(-seededRandom(seed, 5) * 12).toFixed(2)}s`,
      '--hue': huePalette[index % huePalette.length],
    },
  }
})

/* 供父组件（如需要）手动进入 / 跳过 */
defineExpose({ requestSkip, enter })
</script>

<style scoped>
/* ==================================================
   入场加载屏
   ================================================== */
.entry-splash {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  color: #3a4a63;
  background: radial-gradient(
    120% 85% at 50% -10%,
    #ffffff 0%,
    #fdfbf3 30%,
    #f5f2e8 58%,
    #eceadf 100%
  );
  clip-path: circle(150% at 50% 50%);
  transition: clip-path 0.78s cubic-bezier(0.55, 0.05, 0.25, 1);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.entry-splash.is-boot {
  clip-path: circle(0% at 50% 50%);
}

/* ===== 背景层 ===== */
.es-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.es-aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.75;
  will-change: transform, opacity;
}

.es-aurora--a {
  width: 58vmax;
  height: 58vmax;
  top: -22vmax;
  left: -14vmax;
  background: radial-gradient(circle at 40% 40%, rgba(255, 217, 119, 0.62), transparent 66%);
  animation: es-aurora-a 17s ease-in-out infinite;
}

.es-aurora--b {
  width: 52vmax;
  height: 52vmax;
  right: -18vmax;
  bottom: -20vmax;
  background: radial-gradient(circle at 60% 60%, rgba(255, 182, 201, 0.55), transparent 66%);
  animation: es-aurora-b 21s ease-in-out infinite;
}

.es-aurora--c {
  width: 46vmax;
  height: 46vmax;
  left: 46%;
  top: 32%;
  background: radial-gradient(circle at 50% 50%, rgba(154, 215, 255, 0.5), transparent 68%);
  animation: es-aurora-c 25s ease-in-out infinite;
}

.es-rays {
  position: absolute;
  inset: -30%;
  background: repeating-conic-gradient(
    from 0deg,
    rgba(255, 255, 255, 0) 0deg 6deg,
    rgba(255, 255, 255, 0.55) 6deg 7.4deg
  );
  mask-image: radial-gradient(closest-side, rgba(0, 0, 0, 0.85), transparent 72%);
  -webkit-mask-image: radial-gradient(closest-side, rgba(0, 0, 0, 0.85), transparent 72%);
  opacity: 0.35;
  animation: es-spin 90s linear infinite;
}

.es-grid {
  position: absolute;
  inset: -10%;
  background-image:
    linear-gradient(rgba(58, 74, 99, 0.075) 1px, transparent 1px),
    linear-gradient(90deg, rgba(58, 74, 99, 0.075) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at 50% 50%, #000 5%, transparent 78%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 50%, #000 5%, transparent 78%);
  animation: es-grid-drift 24s linear infinite;
}

.es-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, transparent 42%, rgba(255, 255, 255, 0.72) 100%);
}

.es-scan {
  position: absolute;
  left: 0;
  right: 0;
  height: 34vh;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(255, 255, 255, 0.5) 45%,
    rgba(255, 233, 168, 0.32) 55%,
    transparent
  );
  animation: es-scan 6.4s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  opacity: 0.8;
}

.es-scan--slow {
  height: 22vh;
  animation-duration: 11s;
  animation-delay: 1.6s;
  opacity: 0.5;
}

/* ===== 光粒 ===== */
.es-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.es-particle {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: hsl(var(--hue), 88%, 76%);
  box-shadow: 0 0 10px 2px hsla(var(--hue), 92%, 78%, 0.55);
  opacity: 0;
  will-change: transform, opacity;
  animation:
    es-rise var(--fly) ease-in-out infinite,
    es-twinkle var(--twinkle) ease-in-out infinite;
  animation-delay: var(--delay), var(--delay);
}

/* ===== 主体布局 ===== */
.es-stage {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  text-align: center;
  animation: es-stage-in 0.9s cubic-bezier(0.2, 0.9, 0.25, 1) both;
}

/* ===== 环形进度 ===== */
.es-emblem {
  position: relative;
  width: clamp(228px, 46vw, 312px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  margin-bottom: clamp(18px, 4vw, 34px);
}

.es-halo {
  position: absolute;
  inset: -14%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(255, 236, 180, 0.5), transparent 62%);
  filter: blur(14px);
  animation: es-halo 4.6s ease-in-out infinite;
}

.es-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.es-deco-dash {
  fill: none;
  stroke: rgba(58, 74, 99, 0.16);
  stroke-width: 0.7;
  stroke-dasharray: 2 7;
  transform-origin: 100px 100px;
  animation: es-spin 34s linear infinite;
}

.es-deco-fine {
  fill: none;
  stroke: rgba(255, 185, 90, 0.42);
  stroke-width: 0.6;
  stroke-dasharray: 26 12;
  transform-origin: 100px 100px;
  animation: es-spin 20s linear infinite reverse;
}

.es-ring--progress {
  transform: rotate(-90deg);
}

.es-track {
  fill: none;
  stroke: rgba(58, 74, 99, 0.09);
  stroke-width: 7;
}

.es-value {
  fill: none;
  stroke: url(#esRingGradient);
  stroke-width: 7;
  stroke-linecap: round;
  transition:
    stroke-dashoffset 0.18s linear,
    filter 0.3s ease;
  filter: drop-shadow(0 0 7px rgba(255, 200, 120, 0.6));
}

.entry-splash.is-complete .es-value {
  filter: drop-shadow(0 0 16px rgba(255, 176, 90, 0.95));
}

.es-ticks {
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  background: repeating-conic-gradient(
    from 0deg,
    rgba(58, 74, 99, 0.26) 0deg 0.5deg,
    transparent 0.5deg 3deg
  );
  mask-image: radial-gradient(closest-side, transparent 86%, #000 87%, #000 96%, transparent 97%);
  -webkit-mask-image: radial-gradient(
    closest-side,
    transparent 86%,
    #000 87%,
    #000 96%,
    transparent 97%
  );
  animation: es-spin 70s linear infinite reverse;
  opacity: 0.75;
}

.es-orbit {
  position: absolute;
  inset: 3%;
  border-radius: 50%;
  animation: es-spin 9s linear infinite;
}

.es-orbit i {
  position: absolute;
  top: -5px;
  left: 50%;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffffff, #ffd977);
  box-shadow: 0 0 14px 4px rgba(255, 217, 119, 0.8);
}

.es-orbit--b {
  inset: 15%;
  animation-duration: 6.6s;
  animation-direction: reverse;
}

.es-orbit--b i {
  width: 8px;
  height: 8px;
  margin-left: -4px;
  background: radial-gradient(circle at 35% 30%, #ffffff, #9ad7ff);
  box-shadow: 0 0 14px 4px rgba(154, 215, 255, 0.8);
}

.es-orbit--c {
  inset: 26%;
  animation-duration: 4.6s;
}

.es-orbit--c i {
  width: 7px;
  height: 7px;
  margin-left: -3.5px;
  background: radial-gradient(circle at 35% 30%, #ffffff, #ffb6c9);
  box-shadow: 0 0 12px 3px rgba(255, 182, 201, 0.85);
}

.es-pointer {
  position: absolute;
  inset: 0;
  transform: rotate(calc(var(--p, 0) * 360deg));
  will-change: transform;
}

.es-pointer i {
  position: absolute;
  top: 8%;
  left: 50%;
  width: 13px;
  height: 13px;
  margin: -6.5px 0 0 -6.5px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #ffffff, #ffcf6b);
  box-shadow: 0 0 16px 5px rgba(255, 196, 92, 0.75);
  animation: es-pointer-pulse 1.4s ease-in-out infinite;
}

/* ===== 核心读数 ===== */
.es-core {
  position: relative;
  width: 62%;
  height: 62%;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(
    circle at 34% 28%,
    rgba(255, 255, 255, 0.98),
    rgba(255, 255, 255, 0.62) 46%,
    rgba(255, 250, 235, 0.34) 72%,
    transparent 76%
  );
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -14px 30px rgba(180, 170, 140, 0.12),
    0 18px 48px rgba(120, 120, 140, 0.14);
  backdrop-filter: blur(7px);
  animation: es-core-breathe 3.6s ease-in-out infinite;
}

.es-core-glow {
  position: absolute;
  inset: -18%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 233, 168, 0.6), transparent 62%);
  filter: blur(12px);
  animation: es-core-glow 2.8s ease-in-out infinite;
}

.es-core-ripple {
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  border: 1px solid rgba(255, 205, 110, 0.55);
  animation: es-ripple 3s cubic-bezier(0.2, 0.7, 0.3, 1) infinite;
}

.es-core-ripple--late {
  animation-delay: 1.5s;
}

.es-readout {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 2px;
  line-height: 1;
}

.es-percent {
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Courier New', monospace;
  font-size: clamp(2.2rem, 6.6vw, 3.4rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  background: linear-gradient(100deg, #ffb800 0%, #ff5f8a 38%, #3f8cff 72%, #20c997 100%);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: es-gradient-slide 4.6s ease-in-out infinite;
}

.es-unit {
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Courier New', monospace;
  font-size: clamp(0.85rem, 2.2vw, 1.15rem);
  font-weight: 600;
  color: #a89a72;
}

.entry-splash.is-complete .es-core {
  animation: es-core-flare 0.55s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

.entry-splash.is-complete .es-readout {
  animation: es-readout-pop 0.6s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

/* ===== 标题 ===== */
.es-title {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.02em;
  font-size: clamp(1.5rem, 4.6vw, 2.5rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  margin-bottom: 0.35em;
  position: relative;
}

.es-char {
  display: inline-block;
  background: linear-gradient(100deg, #ff5f8a 0%, #ffb56b 34%, #2fb8a6 66%, #3f8cff 100%);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 6px 14px rgba(255, 95, 138, 0.2));
  opacity: 0;
  transform: translateY(22px) scale(0.86) rotate(-6deg);
  animation: es-char-in 0.72s cubic-bezier(0.2, 0.9, 0.25, 1) both;
  animation-delay: calc(0.38s + var(--i) * 0.07s);
}

.entry-splash.is-complete .es-char {
  animation: es-char-glow 0.7s ease-out both;
}

.es-subtitle {
  font-size: clamp(0.78rem, 1.9vw, 0.95rem);
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  color: rgba(58, 74, 99, 0.62);
  margin-bottom: clamp(16px, 3.4vw, 26px);
  opacity: 0;
  animation: es-subtitle-in 0.9s ease-out 0.9s both;
}

/* ===== 阶段芯片 ===== */
.es-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  list-style: none;
  margin-bottom: 16px;
  max-width: min(900px, 94vw);
}

.es-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  font-size: 0.75rem;
  white-space: nowrap;
  letter-spacing: 0.02em;
  color: rgba(58, 74, 99, 0.5);
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(58, 74, 99, 0.08);
  backdrop-filter: blur(6px);
  transition:
    color 0.35s ease,
    background 0.35s ease,
    border-color 0.35s ease,
    transform 0.35s ease;
  opacity: 0;
  animation: es-chip-in 0.5s ease-out both;
  animation-delay: calc(0.7s + var(--i, 0) * 0.06s);
}

.es-chip:nth-child(1) {
  animation-delay: 0.7s;
}
.es-chip:nth-child(2) {
  animation-delay: 0.76s;
}
.es-chip:nth-child(3) {
  animation-delay: 0.82s;
}
.es-chip:nth-child(4) {
  animation-delay: 0.88s;
}
.es-chip:nth-child(5) {
  animation-delay: 0.94s;
}
.es-chip:nth-child(6) {
  animation-delay: 1s;
}

.es-chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(58, 74, 99, 0.2);
  transition:
    background 0.35s ease,
    box-shadow 0.35s ease;
}

.es-chip.is-active {
  color: #8a6a1f;
  background: rgba(255, 236, 180, 0.72);
  border-color: rgba(255, 205, 110, 0.75);
  transform: translateY(-2px);
}

.es-chip.is-active .es-chip-dot {
  background: #ffb800;
  box-shadow: 0 0 0 0 rgba(255, 184, 0, 0.6);
  animation: es-chip-ping 1.5s ease-out infinite;
}

.es-chip.is-done {
  color: rgba(30, 122, 100, 0.9);
  background: rgba(215, 246, 233, 0.7);
  border-color: rgba(120, 220, 190, 0.55);
}

.es-chip.is-done .es-chip-dot {
  background: #20c997;
  box-shadow: 0 0 8px 1px rgba(32, 201, 151, 0.55);
}

/* ===== 状态行 ===== */
.es-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: clamp(0.78rem, 1.8vw, 0.9rem);
  color: rgba(58, 74, 99, 0.78);
  margin-bottom: 12px;
  min-height: 1.6em;
}

.es-status-tag {
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  padding: 3px 8px;
  border-radius: 5px;
  color: #8a6a1f;
  background: rgba(255, 236, 180, 0.85);
  animation: es-tag-pulse 1.8s ease-in-out infinite;
}

.es-status-text {
  letter-spacing: 0.06em;
}

.es-caret {
  width: 2px;
  height: 1.05em;
  background: #ffb800;
  animation: es-caret 1s steps(1, end) infinite;
}

.es-status-tag.is-ready {
  color: #0f7a5c;
  background: rgba(198, 244, 226, 0.92);
  animation: none;
}

.es-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #20c997;
  animation: es-dot-ping 1.6s ease-out infinite;
}

/* ===== 进入提示（加载完成后出现） ===== */
.es-enter {
  position: relative;
  margin-top: 20px;
  opacity: 0;
  transform: translateY(18px) scale(0.92);
  pointer-events: none;
  transition:
    opacity 0.5s ease,
    transform 0.55s cubic-bezier(0.2, 0.9, 0.25, 1);
}

.es-enter.is-visible {
  opacity: 1;
  transform: none;
}

.es-enter-halo {
  position: absolute;
  inset: -26px -34px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 214, 140, 0.55), transparent 70%);
  filter: blur(12px);
  opacity: 0;
  animation: es-enter-halo 2.4s ease-in-out infinite;
}

.es-enter.is-visible .es-enter-halo {
  opacity: 1;
}

.es-enter-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 30px;
  border-radius: 999px;
  font-size: clamp(0.86rem, 2vw, 0.98rem);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  color: #7a5710;
  background: linear-gradient(135deg, rgba(255, 240, 194, 0.96), rgba(255, 213, 138, 0.92));
  border: 1px solid rgba(255, 205, 110, 0.92);
  box-shadow:
    0 12px 34px rgba(255, 184, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  animation: es-enter-pulse 2.4s ease-in-out infinite;
}

.es-enter-ripple {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid rgba(255, 184, 0, 0.75);
  animation: es-enter-ripple 2.4s cubic-bezier(0.2, 0.7, 0.3, 1) infinite;
}

.es-enter-ripple--late {
  animation-delay: 1.2s;
}

.es-enter-text {
  position: relative;
}

.es-enter-chevron {
  position: relative;
  display: inline-flex;
  gap: 2px;
}

.es-enter-chevron i {
  width: 7px;
  height: 7px;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  transform: rotate(45deg);
  opacity: 0.3;
  animation: es-chevron 1.4s ease-in-out infinite;
}

.es-enter-chevron i:last-child {
  animation-delay: 0.18s;
}

/* 等待点击期间的额外呼吸感 */
.entry-splash.is-ready .es-halo {
  animation-duration: 1.8s;
}

.entry-splash.is-ready .es-percent {
  animation-duration: 1.6s;
}

.entry-splash.is-ready .es-core-ripple {
  animation-duration: 1.8s;
}

.es-meta-skip.is-strong {
  color: #8a6a1f;
  animation: es-skip-blink 1.6s ease-in-out infinite;
}

/* ===== 进度条 ===== */
.es-bar {
  position: relative;
  width: min(460px, 84vw);
  height: 6px;
  border-radius: 999px;
  background: rgba(58, 74, 99, 0.1);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(58, 74, 99, 0.12);
  margin-bottom: 12px;
}

.es-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffd977, #ffb6c9 38%, #9ad7ff 74%, #a7f3d0);
  box-shadow: 0 0 12px rgba(255, 200, 120, 0.65);
  transition: width 0.18s linear;
}

.es-bar-head {
  position: absolute;
  right: -4px;
  top: 50%;
  width: 12px;
  height: 12px;
  margin-top: -6px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #ffffff, #ffcf6b);
  box-shadow: 0 0 14px 4px rgba(255, 196, 92, 0.75);
  animation: es-pointer-pulse 1.4s ease-in-out infinite;
}

.es-bar-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.85), transparent);
  background-size: 40% 100%;
  background-repeat: no-repeat;
  animation: es-bar-shimmer 1.9s ease-in-out infinite;
  mix-blend-mode: screen;
}

/* ===== 元信息 ===== */
.es-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  color: rgba(58, 74, 99, 0.5);
}

.es-meta-num {
  color: rgba(58, 74, 99, 0.8);
  font-variant-numeric: tabular-nums;
}

.es-sep {
  color: rgba(58, 74, 99, 0.28);
}

.es-meta-skip {
  animation: es-skip-blink 2.4s ease-in-out infinite;
}

/* ===== 角落 HUD ===== */
.es-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
}

.es-bracket {
  position: absolute;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(58, 74, 99, 0.28);
  opacity: 0;
  animation: es-bracket-in 0.8s ease-out both;
}

.es-bracket--tl {
  top: 22px;
  left: 22px;
  border-right: none;
  border-bottom: none;
  animation-delay: 0.2s;
}

.es-bracket--tr {
  top: 22px;
  right: 22px;
  border-left: none;
  border-bottom: none;
  animation-delay: 0.3s;
}

.es-bracket--bl {
  bottom: 22px;
  left: 22px;
  border-right: none;
  border-top: none;
  animation-delay: 0.4s;
}

.es-bracket--br {
  bottom: 22px;
  right: 22px;
  border-left: none;
  border-top: none;
  animation-delay: 0.5s;
}

.es-hud-text {
  position: absolute;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.18em;
  color: rgba(58, 74, 99, 0.42);
  opacity: 0;
  animation: es-hud-text-in 0.9s ease-out 1.1s both;
}

.es-hud-text--tl {
  top: 26px;
  left: 78px;
}

.es-hud-text--br {
  bottom: 26px;
  right: 78px;
}

.es-crosshair {
  position: absolute;
  bottom: 34px;
  left: 34px;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 184, 0, 0.6);
  animation: es-spin 12s linear infinite;
  opacity: 0.75;
}

.es-crosshair::before,
.es-crosshair::after {
  content: '';
  position: absolute;
  background: rgba(58, 74, 99, 0.28);
}

.es-crosshair::before {
  left: 50%;
  top: -6px;
  bottom: -6px;
  width: 1px;
  margin-left: -0.5px;
}

.es-crosshair::after {
  top: 50%;
  left: -6px;
  right: -6px;
  height: 1px;
  margin-top: -0.5px;
}

/* ===== 闪光 ===== */
.es-flash {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(255, 255, 255, 0.98) 0%,
    rgba(255, 240, 190, 0.62) 26%,
    rgba(255, 255, 255, 0) 62%
  );
}

.entry-splash.is-complete .es-flash {
  animation: es-flash-in 0.6s ease-out both;
}

/* ===== 退场 ===== */
.entry-splash.is-exiting {
  animation: es-iris-out 0.86s cubic-bezier(0.68, 0, 0.36, 1) forwards;
}

.entry-splash.is-fast.is-exiting {
  animation-duration: 0.48s;
}

.entry-splash.is-exiting .es-stage {
  animation: es-stage-out 0.72s cubic-bezier(0.6, 0, 0.3, 1) forwards;
}

.entry-splash.is-exiting .es-flash {
  animation: es-flash-out 0.5s ease-out forwards;
}

.entry-splash.is-exiting .es-hud {
  animation: es-fade-out 0.3s ease forwards;
}

.entry-splash.is-exiting .es-particles,
.entry-splash.is-exiting .es-backdrop {
  animation: es-fade-out 0.55s ease forwards;
}

/* ===== 关键帧 ===== */
@keyframes es-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes es-aurora-a {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  33% {
    transform: translate3d(6vw, 4vh, 0) scale(1.12);
  }

  66% {
    transform: translate3d(-3vw, 7vh, 0) scale(0.95);
  }

  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes es-aurora-b {
  0% {
    transform: translate3d(0, 0, 0) scale(1.05);
  }

  50% {
    transform: translate3d(-7vw, -5vh, 0) scale(0.92);
  }

  100% {
    transform: translate3d(0, 0, 0) scale(1.05);
  }
}

@keyframes es-aurora-c {
  0% {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0.5;
  }

  50% {
    transform: translate(-46%, -56%) scale(1.15);
    opacity: 0.85;
  }

  100% {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0.5;
  }
}

@keyframes es-grid-drift {
  0% {
    background-position:
      0 0,
      0 0;
  }

  100% {
    background-position:
      48px 96px,
      96px 48px;
  }
}

@keyframes es-scan {
  0% {
    top: -40vh;
    opacity: 0;
  }

  12% {
    opacity: 0.85;
  }

  88% {
    opacity: 0.85;
  }

  100% {
    top: 110vh;
    opacity: 0;
  }
}

@keyframes es-rise {
  0% {
    transform: translate3d(0, 0, 0) scale(0.7);
  }

  50% {
    transform: translate3d(var(--drift), calc(var(--rise) * -0.55), 0) scale(1.1);
  }

  100% {
    transform: translate3d(0, calc(var(--rise) * -1), 0) scale(0.7);
  }
}

@keyframes es-twinkle {
  0% {
    opacity: 0;
  }

  30% {
    opacity: var(--alpha);
  }

  70% {
    opacity: calc(var(--alpha) * 0.7);
  }

  100% {
    opacity: 0;
  }
}

@keyframes es-stage-in {
  from {
    opacity: 0;
    transform: translateY(26px) scale(0.96);
    filter: blur(8px);
  }

  to {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
}

@keyframes es-halo {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.96);
  }

  50% {
    opacity: 0.95;
    transform: scale(1.06);
  }
}

@keyframes es-core-breathe {
  0%,
  100% {
    transform: scale(0.97);
  }

  50% {
    transform: scale(1.03);
  }
}

@keyframes es-core-glow {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(0.92);
  }

  50% {
    opacity: 0.95;
    transform: scale(1.08);
  }
}

@keyframes es-ripple {
  0% {
    transform: scale(0.9);
    opacity: 0.85;
  }

  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

@keyframes es-pointer-pulse {
  0%,
  100% {
    transform: scale(0.82);
    opacity: 0.85;
  }

  50% {
    transform: scale(1.16);
    opacity: 1;
  }
}

@keyframes es-gradient-slide {
  0%,
  100% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }
}

@keyframes es-char-in {
  0% {
    opacity: 0;
    transform: translateY(22px) scale(0.86) rotate(-6deg);
    filter: blur(6px);
  }

  60% {
    opacity: 1;
    transform: translateY(-4px) scale(1.04) rotate(1deg);
    filter: blur(0);
  }

  100% {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
}

@keyframes es-char-glow {
  0% {
    opacity: 1;
    transform: none;
    filter: drop-shadow(0 0 0 rgba(255, 184, 0, 0));
  }

  50% {
    opacity: 1;
    transform: none;
    filter: drop-shadow(0 4px 20px rgba(255, 184, 0, 0.6));
  }

  100% {
    opacity: 1;
    transform: none;
    filter: drop-shadow(0 6px 14px rgba(255, 95, 138, 0.24));
  }
}

@keyframes es-subtitle-in {
  from {
    opacity: 0;
    letter-spacing: 0.9em;
    filter: blur(6px);
  }

  to {
    opacity: 1;
    letter-spacing: 0.42em;
    filter: blur(0);
  }
}

@keyframes es-chip-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.92);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes es-chip-ping {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 184, 0, 0.65);
  }

  100% {
    box-shadow: 0 0 0 7px rgba(255, 184, 0, 0);
  }
}

@keyframes es-tag-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }
}

@keyframes es-caret {
  0%,
  49% {
    opacity: 1;
  }

  50%,
  100% {
    opacity: 0;
  }
}

@keyframes es-bar-shimmer {
  0% {
    background-position: -50% 0;
  }

  100% {
    background-position: 150% 0;
  }
}

@keyframes es-skip-blink {
  0%,
  100% {
    opacity: 0.35;
  }

  50% {
    opacity: 0.9;
  }
}

@keyframes es-dot-ping {
  0% {
    box-shadow: 0 0 0 0 rgba(32, 201, 151, 0.65);
  }

  100% {
    box-shadow: 0 0 0 8px rgba(32, 201, 151, 0);
  }
}

@keyframes es-enter-pulse {
  0%,
  100% {
    transform: translateY(0) scale(1);
    box-shadow:
      0 12px 34px rgba(255, 184, 0, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.95);
  }

  50% {
    transform: translateY(-3px) scale(1.035);
    box-shadow:
      0 18px 44px rgba(255, 184, 0, 0.42),
      inset 0 1px 0 rgba(255, 255, 255, 0.95);
  }
}

@keyframes es-enter-halo {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.94);
  }

  50% {
    opacity: 0.9;
    transform: scale(1.08);
  }
}

@keyframes es-enter-ripple {
  0% {
    transform: scale(1);
    opacity: 0.85;
  }

  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

@keyframes es-chevron {
  0%,
  100% {
    opacity: 0.25;
    transform: rotate(45deg) translateX(0);
  }

  50% {
    opacity: 1;
    transform: rotate(45deg) translateX(3px);
  }
}

@keyframes es-bracket-in {
  from {
    opacity: 0;
    transform: scale(1.35);
  }

  to {
    opacity: 0.9;
    transform: none;
  }
}

@keyframes es-hud-text-in {
  from {
    opacity: 0;
    letter-spacing: 0.42em;
  }

  to {
    opacity: 1;
    letter-spacing: 0.18em;
  }
}

@keyframes es-flash-in {
  0% {
    opacity: 0;
  }

  45% {
    opacity: 0.9;
  }

  100% {
    opacity: 0.22;
  }
}

@keyframes es-flash-out {
  from {
    opacity: 0.35;
  }

  to {
    opacity: 0;
  }
}

@keyframes es-core-flare {
  0% {
    transform: scale(1);
    box-shadow: 0 18px 48px rgba(120, 120, 140, 0.14);
  }

  55% {
    transform: scale(1.14);
    box-shadow: 0 0 60px rgba(255, 200, 110, 0.85);
  }

  100% {
    transform: scale(1.06);
    box-shadow: 0 0 40px rgba(255, 200, 110, 0.5);
  }
}

@keyframes es-readout-pop {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.16);
  }

  100% {
    transform: scale(1.04);
  }
}

@keyframes es-stage-out {
  0% {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }

  100% {
    opacity: 0;
    transform: scale(1.28) translateY(-14px);
    filter: blur(16px);
  }
}

@keyframes es-fade-out {
  to {
    opacity: 0;
  }
}

@keyframes es-iris-out {
  0% {
    clip-path: circle(150% at 50% 50%);
    opacity: 1;
    transform: scale(1);
  }

  55% {
    clip-path: circle(30% at 50% 50%);
    opacity: 1;
  }

  100% {
    clip-path: circle(0% at 50% 50%);
    opacity: 0;
    transform: scale(1.05);
  }
}

/* ===== 响应式 ===== */
@media (max-width: 760px) {
  .es-backdrop,
  .es-hud-text,
  .es-crosshair {
    display: none;
  }

  .es-aurora {
    filter: blur(52px);
  }

  .es-aurora--c {
    left: 30%;
  }

  .es-chip-text {
    display: none;
  }

  .es-chip {
    padding: 6px 9px;
  }

  .es-emblem {
    width: clamp(200px, 62vw, 268px);
  }

  .es-enter {
    margin-top: 14px;
  }

  .es-enter-btn {
    padding: 11px 22px;
    letter-spacing: 0.1em;
    text-indent: 0.1em;
  }
}

@media (max-height: 560px) {
  .es-chips {
    display: none;
  }

  .es-emblem {
    width: clamp(170px, 26vh, 230px);
    margin-bottom: 12px;
  }
}

/* ===== 减少动态效果 ===== */
@media (prefers-reduced-motion: reduce) {
  .entry-splash,
  .entry-splash * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
