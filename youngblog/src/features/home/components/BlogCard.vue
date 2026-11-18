<template>
  <article
    class="blog-card"
    role="link"
    tabindex="0"
    @click="navigateToDetail"
    @keydown.enter="navigateToDetail"
  >
    <div class="card-media">
      <img :src="blogImage" :alt="blog.title" loading="lazy" />
      <span class="media-veil" aria-hidden="true"></span>

      <span v-if="blog.type" class="type-badge">{{ blog.type }}</span>
      <span v-if="index" class="media-index" aria-hidden="true">
        {{ String(index).padStart(2, '0') }}
      </span>

      <div v-if="visibleTags.length" class="tags">
        <span
          v-for="(tag, tagIndex) in visibleTags"
          :key="tag"
          class="tag"
          :class="`tag--${tagIndex % 3}`"
          @click.stop="handleTagClick(tagIndex)"
        >{{ tag }}</span>
      </div>
    </div>

    <div class="card-body">
      <div class="card-meta">
        <span class="card-date">{{ formatDate(blog.date) }}</span>
        <span class="meta-dot" aria-hidden="true"></span>
        <span class="card-read">
          {{ i18n.currentTranslations.home_read }}
          <i class="fas fa-arrow-right" aria-hidden="true"></i>
        </span>
      </div>

      <h3 class="blog-title">{{ blog.title }}</h3>
      <p class="blog-excerpt">{{ blog.excerpt || '' }}</p>

      <span class="card-arrow" aria-hidden="true">
        <i class="fas fa-arrow-right"></i>
      </span>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { resolveUrl } from '@/shared/utils/url'

const props = defineProps({
  blog: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
})

const router = useRouter()
const i18n = useI18nStore()

const blogImage = resolveUrl('/assets/images/lantern_festival.webp')

const visibleTags = computed(() =>
  Array.isArray(props.blog.tags) ? props.blog.tags.slice(0, 3) : [],
)

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const lang = i18n.getLang()
  try {
    if (lang === 'en') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    if (lang === 'ja') {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    }
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

const navigateToDetail = () => {
  router.push(`/blog/${props.blog.id}`)
}

const handleTagClick = (index) => {
  const path = props.blog.tags.slice(0, index + 1)
  const tagsParam = JSON.stringify(path)
  router.push(`/categories?tags=${encodeURIComponent(tagsParam)}`)
}
</script>

<style scoped>
/* ==================================================
   推荐博客卡片：纸感卡片 + 双色影像
   ================================================== */

.blog-card {
  --card-radius: 22px;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--card-radius);
  background: linear-gradient(180deg, #fffdf9 0%, #fdf7ee 100%);
  border: 1px solid rgba(23, 34, 47, 0.08);
  box-shadow:
    0 2px 4px rgba(30, 34, 48, 0.04),
    0 20px 44px rgba(30, 34, 48, 0.08);
  cursor: pointer;
  transition:
    transform 0.48s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.48s ease,
    border-color 0.48s ease;
  outline: none;
}

.blog-card:hover,
.blog-card:focus-visible {
  transform: translateY(-8px);
  border-color: rgba(200, 64, 112, 0.22);
  box-shadow:
    0 4px 8px rgba(30, 34, 48, 0.05),
    0 32px 64px rgba(45, 35, 48, 0.16);
}

.blog-card:focus-visible {
  box-shadow:
    0 0 0 2px rgba(255, 253, 248, 0.9),
    0 0 0 4px rgba(82, 184, 255, 0.65),
    0 32px 64px rgba(45, 35, 48, 0.16);
}

/* ---------- 影像区 ---------- */
.card-media {
  position: relative;
  height: 212px;
  flex: 0 0 auto;
  overflow: hidden;
  isolation: isolate;
}

.card-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.02);
  transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}

.blog-card:hover .card-media img {
  transform: scale(1.08);
}

.media-veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      180deg,
      rgba(16, 22, 32, 0.34) 0%,
      rgba(16, 22, 32, 0) 34%,
      rgba(16, 22, 32, 0.06) 62%,
      rgba(253, 247, 238, 0.94) 100%
    ),
    linear-gradient(90deg, rgba(16, 22, 32, 0.18), rgba(16, 22, 32, 0));
}

/* ---------- 类型 / 序号 ---------- */
.type-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 3;
  padding: 5px 11px;
  border-radius: 999px;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #fffaf2;
  background: rgba(18, 25, 36, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.media-index {
  position: absolute;
  right: 14px;
  bottom: 4px;
  z-index: 2;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 3.4rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 253, 248, 0.55);
  text-shadow: 0 10px 26px rgba(16, 22, 32, 0.18);
  opacity: 0.9;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.blog-card:hover .media-index {
  transform: translateY(-4px);
}

/* ---------- 标签 ---------- */
.tags {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: calc(100% - 90px);
}

.tag {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  color: #26303c;
  background: rgba(255, 253, 248, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 2px 10px rgba(16, 22, 32, 0.1);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  cursor: pointer;
  transition:
    transform 0.28s ease,
    background 0.28s ease,
    color 0.28s ease;
}

.tag--0 {
  background: rgba(255, 214, 226, 0.9);
  color: #8c2f53;
}

.tag--1 {
  background: rgba(205, 246, 233, 0.9);
  color: #1b6a58;
}

.tag--2 {
  background: rgba(255, 236, 205, 0.92);
  color: #86520f;
}

.tag:hover {
  transform: translateY(-2px);
}

/* ---------- 正文 ---------- */
.card-body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 24px 24px;
  flex: 1 1 auto;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: #7b8698;
}

.meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(123, 134, 152, 0.6);
}

.card-read {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #8c3b5e;
}

.card-read i {
  font-size: 0.58rem;
  transform: translateX(0);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.blog-card:hover .card-read i {
  transform: translateX(3px);
}

.blog-title {
  margin: 0;
  font-size: 1.34rem;
  font-weight: 600;
  line-height: 1.42;
  letter-spacing: 0.02em;
  color: #1d2836;
  transition: color 0.35s ease;
}

.blog-card:hover .blog-title {
  color: #9c3460;
}

.blog-excerpt {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  letter-spacing: 0.02em;
  color: #5f6b7a;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 44px;
}

.card-arrow {
  position: absolute;
  right: 22px;
  bottom: 22px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #3d4b5d;
  background: rgba(23, 34, 47, 0.05);
  border: 1px solid rgba(23, 34, 47, 0.08);
  font-size: 0.72rem;
  transition:
    background 0.4s ease,
    color 0.4s ease,
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.blog-card:hover .card-arrow {
  background: #17222f;
  color: #fff8ef;
  transform: rotate(-8deg);
}

/* ================= 响应式 ================= */
@media (max-width: 720px) {
  .card-media {
    height: 186px;
  }

  .card-body {
    padding: 17px 18px 20px;
  }

  .blog-title {
    font-size: 1.16rem;
  }

  .blog-excerpt {
    font-size: 0.85rem;
    padding-right: 38px;
  }

  .card-arrow {
    right: 16px;
    bottom: 16px;
    width: 32px;
    height: 32px;
  }

  .media-index {
    font-size: 2.8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blog-card,
  .blog-card:hover,
  .card-media img,
  .blog-card:hover .card-media img,
  .media-index,
  .blog-card:hover .media-index,
  .card-arrow,
  .blog-card:hover .card-arrow {
    transform: none;
    transition: none;
  }
}
</style>
