<template>
  <div class="blog-card-placeholder" aria-hidden="true">
    <span class="placeholder-star">✦</span>
    <p class="placeholder-title">{{ i18n.currentTranslations.home_placeholder_title }}</p>
    <p class="placeholder-subtitle">{{ i18n.currentTranslations.home_placeholder_subtitle }}</p>
    <span class="placeholder-line"></span>
  </div>
</template>

<script setup>
import { useI18nStore } from '@/shared/stores/i18nStore'

const i18n = useI18nStore()
</script>

<style scoped>
.blog-card-placeholder {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 400px;
  height: 100%;
  padding: 30px;
  border-radius: 22px;
  border: 1px dashed rgba(23, 34, 47, 0.16);
  background:
    radial-gradient(80% 70% at 50% 0%, rgba(255, 214, 232, 0.18), rgba(255, 255, 255, 0) 70%),
    rgba(255, 252, 246, 0.55);
  cursor: default;
  user-select: none;
}

.placeholder-star {
  font-size: 2rem;
  line-height: 1;
  margin-bottom: 4px;
  color: transparent;
  background: linear-gradient(135deg, #d4577f, #2fae90 55%, #8f7bff);
  -webkit-background-clip: text;
  background-clip: text;
  animation: placeholder-float 4.4s ease-in-out infinite;
}

.placeholder-title {
  margin: 0;
  font-size: 0.98rem;
  letter-spacing: 0.08em;
  color: #59657a;
}

.placeholder-subtitle {
  margin: 0;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #9aa4b4;
}

.placeholder-line {
  width: 46px;
  height: 1px;
  margin-top: 10px;
  background: linear-gradient(90deg, transparent, rgba(23, 34, 47, 0.22), transparent);
}

@keyframes placeholder-float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-7px) rotate(8deg);
  }
}

@media (max-width: 720px) {
  .blog-card-placeholder {
    min-height: 260px;
    border-radius: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .placeholder-star {
    animation: none;
  }
}
</style>
