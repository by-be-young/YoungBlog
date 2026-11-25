<template>
  <div id="post-nav-left" class="post-nav-left">
    <router-link
      v-if="prev"
      id="post-prev"
      class="post-nav-btn"
      data-type="prev"
      :to="`/blog/${prev.id}`"
    >
      <div class="post-nav-label">{{ i18n.get('prev_post') }}</div>
      <div class="post-nav-title">{{ prev.title }}</div>
    </router-link>

    <router-link
      v-if="next"
      id="post-next"
      class="post-nav-btn"
      data-type="next"
      :to="`/blog/${next.id}`"
    >
      <div class="post-nav-label">{{ i18n.get('next_post') }}</div>
      <div class="post-nav-title">{{ next.title }}</div>
    </router-link>

    <router-link
      v-if="similar"
      id="post-similar"
      class="post-nav-btn"
      data-type="similar"
      :to="`/blog/${similar.id}`"
    >
      <div class="post-nav-label">{{ i18n.get('similar_post') }}</div>
      <div class="post-nav-title">{{ similar.title }}</div>
    </router-link>
  </div>
</template>

<script setup>
import { useI18nStore } from '@/shared/stores/i18nStore'

defineProps({
  prev: { type: Object, default: null },
  next: { type: Object, default: null },
  similar: { type: Object, default: null },
  /** 预留：系列内导航与普通导航的语义区分；当前两者都沿用站内同标签跳转 */
  inSeries: { type: Boolean, default: false },
})

const i18n = useI18nStore()
</script>

<style scoped>
.post-nav-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.post-nav-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 253, 249, 0.78);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(23, 34, 47, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  text-decoration: none;
  color: #17222f;
  cursor: pointer;
}

.post-nav-btn:hover {
  transform: translateY(-3px);
  border-color: rgba(200, 64, 112, 0.2);
  box-shadow: 0 16px 40px rgba(23, 34, 47, 0.12);
}

.post-nav-btn:focus-visible {
  outline: 2px solid rgba(0, 172, 255, 0.55);
  outline-offset: 2px;
}

.post-nav-label {
  font-size: 0.78rem;
  color: #17222f;
  padding: 4px 9px;
  border-radius: 999px;
  display: inline-block;
  margin-bottom: 6px;
  width: 100%;
}

.post-nav-btn[data-type='prev'] .post-nav-label {
  background: rgba(255, 196, 212, 0.68);
}

.post-nav-btn[data-type='next'] .post-nav-label {
  background: rgba(167, 243, 208, 0.68);
}

.post-nav-btn[data-type='similar'] .post-nav-label {
  background: rgba(199, 182, 255, 0.62);
}

.post-nav-title {
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--detail-text, #17222f);
  line-height: 1.2;
}

@media (max-width: 640px) {
  .post-nav-left {
    margin-top: 10px;
  }

  .post-nav-btn {
    padding: 8px 10px;
  }

  .post-nav-title {
    font-size: 0.92rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-nav-btn {
    transition: none;
  }
}
</style>
