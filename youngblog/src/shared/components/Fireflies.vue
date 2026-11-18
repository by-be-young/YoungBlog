<template>
  <div class="fireflies-overlay" aria-hidden="true">
    <span 
      v-for="i in count" 
      :key="i"
      class="firefly"
      :style="getFireflyStyle(i)"
    ></span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// 萤火虫数量（根据屏幕大小）
const count = computed(() => {
  const isMobile = window.innerWidth <= 760
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) return isMobile ? 10 : 16
  return isMobile ? 18 : 34
})

// 随机生成萤火虫样式
const getFireflyStyle = (index) => {
  const rand = (min, max) => Math.random() * (max - min) + min
  const randInt = (min, max) => Math.floor(rand(min, max + 1))
  
  // 使用 index 作为种子保证一致性
  const seed = index * 137.508
  const pseudoRandom = (n) => (Math.sin(seed + n * 42.7) * 0.5 + 0.5)
  
  return {
    '--x0': `${pseudoRandom(0) * 116 - 8}vw`,
    '--y0': `${pseudoRandom(1) * 108 - 4}vh`,
    '--x1': `${pseudoRandom(2) * 116 - 8}vw`,
    '--y1': `${pseudoRandom(3) * 108 - 4}vh`,
    '--x2': `${pseudoRandom(4) * 116 - 8}vw`,
    '--y2': `${pseudoRandom(5) * 108 - 4}vh`,
    '--size': `${rand(4.8, 9.6).toFixed(2)}px`,
    '--alpha': `${rand(0.58, 0.96).toFixed(2)}`,
    '--float-duration': `${randInt(18000, 32000)}ms`,
    '--glow-duration': `${randInt(2600, 5600)}ms`,
    '--float-delay': `${randInt(-32000, 0)}ms`,
    '--glow-delay': `${randInt(-5600, 0)}ms`,
    '--hue': `${randInt(44, 72)}`
  }
}
</script>

<style scoped>
.fireflies-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.firefly {
  position: absolute;
  border-radius: 50%;
  background: hsl(var(--hue, 58), 85%, 70%);
  width: var(--size, 6px);
  height: var(--size, 6px);
  opacity: 0;
  box-shadow: 0 0 12px 4px hsla(var(--hue, 58), 90%, 75%, 0.3);
  will-change: transform, opacity;
  animation: 
    fly var(--float-duration, 24000ms) ease-in-out infinite alternate,
    glow var(--glow-duration, 4000ms) ease-in-out infinite alternate;
  animation-delay: var(--float-delay, 0ms), var(--glow-delay, 0ms);
}

@keyframes fly {
  0% { transform: translate(var(--x0, 0vw), var(--y0, 0vh)) scale(0.6); }
  33% { transform: translate(var(--x1, 50vw), var(--y1, 50vh)) scale(1); }
  66% { transform: translate(var(--x2, 90vw), var(--y2, 90vh)) scale(0.8); }
  100% { transform: translate(var(--x0, 0vw), var(--y0, 0vh)) scale(0.6); }
}

@keyframes glow {
  0% { opacity: calc(var(--alpha, 0.7) * 0.3); }
  50% { opacity: var(--alpha, 0.7); }
  100% { opacity: calc(var(--alpha, 0.7) * 0.3); }
}
</style>