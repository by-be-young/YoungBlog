<template>
  <span class="loading-dots" role="status" :aria-label="label">
    <span
      v-for="index in 3"
      :key="index"
      class="loading-dot"
      :style="{ animationDelay: `${(index - 1) * 0.16}s` }"
      aria-hidden="true"
    ></span>
  </span>
</template>

<script setup>
defineProps({
  /** 供屏幕阅读器朗读的状态文案 */
  label: { type: String, default: '加载中' },
})
</script>

<style scoped>
.loading-dots {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 1em;
  line-height: 1;
  vertical-align: middle;
  color: currentColor;
}

.loading-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.28;
  transform: scale(0.8);
  animation: loading-dot-breathe 1.15s ease-in-out infinite;
}

@keyframes loading-dot-breathe {
  0%,
  72%,
  100% {
    opacity: 0.24;
    transform: translateY(0) scale(0.76);
  }

  36% {
    opacity: 0.92;
    transform: translateY(-2px) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-dot {
    animation: none;
    opacity: 0.65;
  }
}
</style>
