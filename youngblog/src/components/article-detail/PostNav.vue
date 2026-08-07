<template>
  <div id="post-nav-left" class="post-nav-left">
    <!-- 上一篇 -->
    <a
      v-if="prev"
      id="post-prev"
      class="post-nav-btn"
      data-type="prev"
      :href="prevHref"
      :target="target"
      :rel="rel"
      @click.prevent="navigateTo(prevHref)"
      role="button"
      style="display:flex;"
    >
      <div class="post-nav-label">{{ i18n.t('prev_post') }}</div>
      <div class="post-nav-title">{{ prev.title }}</div>
    </a>

    <!-- 下一篇 -->
    <a
      v-if="next"
      id="post-next"
      class="post-nav-btn"
      data-type="next"
      :href="nextHref"
      :target="target"
      :rel="rel"
      @click.prevent="navigateTo(nextHref)"
      role="button"
      style="display:flex;"
    >
      <div class="post-nav-label">{{ i18n.t('next_post') }}</div>
      <div class="post-nav-title">{{ next.title }}</div>
    </a>

    <!-- 相似文章 -->
    <a
      v-if="similar"
      id="post-similar"
      class="post-nav-btn"
      data-type="similar"
      :href="similarHref"
      target="_blank"
      rel="noopener noreferrer"
      @click.prevent="navigateTo(similarHref)"
      role="button"
      style="display:flex;"
    >
      <div class="post-nav-label">{{ i18n.t('similar_post') }}</div>
      <div class="post-nav-title">{{ similar.title }}</div>
    </a>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'

const props = defineProps({
  prev: { type: Object, default: null },
  next: { type: Object, default: null },
  similar: { type: Object, default: null },
  // 是否在同一系列内（系列内导航同标签打开，否则新窗口）
  inSeries: { type: Boolean, default: false }
})

const emit = defineEmits(['navigate'])

const i18n = useI18nStore()

// 目标链接
const prevHref = computed(() => props.prev ? `#/blog/${props.prev.id}` : '#')
const nextHref = computed(() => props.next ? `#/blog/${props.next.id}` : '#')
const similarHref = computed(() => props.similar ? `#/blog/${props.similar.id}` : '#')

// 系列内导航保持同标签，否则新窗口（但通过路由跳转不实际使用这些属性，只是为了匹配老代码的 data 属性）
const target = computed(() => props.inSeries ? '' : '_blank')
const rel = computed(() => props.inSeries ? '' : 'noopener noreferrer')

function navigateTo(href) {
  if (href && href !== '#') {
    emit('navigate', href)
  }
}
</script>

<style scoped>
/* ===== 文章导航按钮 ===== */
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
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s;
  text-decoration: none;
  color: #222;
  cursor: pointer;
}

.post-nav-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(33, 37, 41, 0.12);
}

.post-nav-label {
  font-size: 0.78rem;
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
  margin-bottom: 6px;
  width: 100%;
}

.post-nav-btn[data-type="prev"] .post-nav-label {
  background: #9ad7ff;
}

.post-nav-btn[data-type="next"] .post-nav-label {
  background: #a7f3d0;
}

.post-nav-btn[data-type="similar"] .post-nav-label {
  background: #ffb6c9;
}

.post-nav-title {
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--detail-text, #2b3440);
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
</style>