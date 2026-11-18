<template>
  <div class="recent-updates-card">
    <article
      v-for="(blog, index) in props.blogs"
      :key="blog.id"
      class="recent-item"
      role="link"
      tabindex="0"
      @click="$router.push(`/blog/${blog.id}`)"
      @keydown.enter="$router.push(`/blog/${blog.id}`)"
    >
      <div class="recent-media">
        <img :src="cardImage" :alt="blog.title" loading="lazy" />
        <span class="media-veil" aria-hidden="true"></span>

        <span class="recent-category">{{ getCategoryLabel(blog) }}</span>
        <span class="recent-index" aria-hidden="true">0{{ index + 1 }}</span>

        <div v-if="blog.tags?.length" class="recent-tags">
          <span
            v-for="(tag, idx) in blog.tags.slice(0, 2)"
            :key="tag"
            class="recent-tag"
            @click.stop="handleTagClick(blog, idx)"
          >{{ tag }}</span>
        </div>
      </div>

      <div class="recent-body">
        <div class="recent-meta">
          <span>{{ formatDate(blog.date) }}</span>
          <span v-if="blog.type" class="meta-dot" aria-hidden="true"></span>
          <span v-if="blog.type">{{ blog.type }}</span>
        </div>

        <h3 class="recent-title">{{ blog.title }}</h3>
        <p v-if="blog.excerpt" class="recent-excerpt">{{ blog.excerpt }}</p>

        <span class="recent-arrow" aria-hidden="true">
          <i class="fas fa-arrow-right"></i>
        </span>
      </div>
    </article>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { useBlogStore } from '@/shared/stores/blogStore'
import { resolveUrl } from '@/shared/utils/url'

const props = defineProps({
  blogs: {
    type: Array,
    required: true,
  },
})

const cardImage = resolveUrl('/assets/images/lantern_festival.webp')

const router = useRouter()
const i18n = useI18nStore()
const blogStore = useBlogStore()

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

const getCategoryLabel = (blog) => {
  const key = blogStore.getCategoryKey(blog)
  const t = i18n.currentTranslations
  return key === 'home_category_learning'
    ? t.home_category_learning
    : t.home_category_entertainment
}

const handleTagClick = (blog, index) => {
  const path = blog.tags.slice(0, index + 1)
  const tagsParam = JSON.stringify(path)
  router.push(`/categories?tags=${encodeURIComponent(tagsParam)}`)
}
</script>

<style scoped>
/* ==================================================
   最近更新：双栏封面故事卡
   ================================================== */

.recent-updates-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.recent-item {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border-radius: 24px;
  background: linear-gradient(180deg, #fffdf9 0%, #fcf5eb 100%);
  border: 1px solid rgba(23, 34, 47, 0.08);
  box-shadow:
    0 2px 4px rgba(30, 34, 48, 0.04),
    0 18px 42px rgba(30, 34, 48, 0.075);
  cursor: pointer;
  transition:
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.5s ease,
    border-color 0.5s ease;
  outline: none;
}

.recent-item:hover,
.recent-item:focus-visible {
  transform: translateY(-7px);
  border-color: rgba(200, 64, 112, 0.2);
  box-shadow:
    0 4px 8px rgba(30, 34, 48, 0.05),
    0 30px 58px rgba(45, 35, 48, 0.15);
}

.recent-item:focus-visible {
  box-shadow:
    0 0 0 2px rgba(255, 253, 248, 0.9),
    0 0 0 4px rgba(82, 184, 255, 0.65),
    0 30px 58px rgba(45, 35, 48, 0.15);
}

/* ---------- 影像 ---------- */
.recent-media {
  position: relative;
  height: 176px;
  flex: 0 0 auto;
  overflow: hidden;
  isolation: isolate;
}

.recent-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.02);
  transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.recent-item:hover .recent-media img {
  transform: scale(1.07);
}

.media-veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      180deg,
      rgba(15, 21, 31, 0.38) 0%,
      rgba(15, 21, 31, 0) 36%,
      rgba(15, 21, 31, 0.04) 60%,
      rgba(252, 245, 235, 0.94) 100%
    ),
    linear-gradient(90deg, rgba(15, 21, 31, 0.2), rgba(15, 21, 31, 0));
}

.recent-category {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 3;
  padding: 5px 12px;
  border-radius: 999px;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #fffaf2;
  background: rgba(18, 25, 36, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.recent-index {
  position: absolute;
  right: 16px;
  bottom: 2px;
  z-index: 2;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 3.1rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 253, 248, 0.5);
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.recent-item:hover .recent-index {
  transform: translateY(-4px);
}

.recent-tags {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: calc(100% - 90px);
}

.recent-tag {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.67rem;
  letter-spacing: 0.04em;
  color: #26303c;
  background: rgba(255, 253, 248, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 2px 10px rgba(16, 22, 32, 0.1);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  cursor: pointer;
  transition: transform 0.28s ease;
}

.recent-tag:nth-child(1) {
  background: rgba(255, 214, 226, 0.9);
  color: #8c2f53;
}

.recent-tag:nth-child(2) {
  background: rgba(205, 246, 233, 0.9);
  color: #1b6a58;
}

.recent-tag:hover {
  transform: translateY(-2px);
}

/* ---------- 正文 ---------- */
.recent-body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 18px 22px 22px;
  flex: 1 1 auto;
}

.recent-meta {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.69rem;
  letter-spacing: 0.08em;
  color: #7b8698;
}

.meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(123, 134, 152, 0.6);
}

.recent-title {
  margin: 0;
  font-size: 1.28rem;
  font-weight: 600;
  line-height: 1.42;
  letter-spacing: 0.02em;
  color: #1d2836;
  transition: color 0.35s ease;
  padding-right: 40px;
}

.recent-item:hover .recent-title {
  color: #9c3460;
}

.recent-excerpt {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.68;
  color: #5f6b7a;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 30px;
}

.recent-arrow {
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #3d4b5d;
  background: rgba(23, 34, 47, 0.05);
  border: 1px solid rgba(23, 34, 47, 0.08);
  transition:
    background 0.4s ease,
    color 0.4s ease,
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.recent-item:hover .recent-arrow {
  background: #17222f;
  color: #fff8ef;
  transform: rotate(-8deg);
}

/* ================= 响应式 ================= */
@media (max-width: 1100px) {
  .recent-updates-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .recent-media {
    height: 150px;
  }
}

@media (max-width: 820px) {
  .recent-updates-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .recent-media {
    height: 180px;
  }
}

@media (max-width: 720px) {
  /* 两张最近更新改成横向轨道：宽度由内容决定，并让下一张露出边 */
  .recent-updates-card {
    display: flex;
    flex-direction: row;
    gap: 14px;
    margin: 0 -18px;
    padding: 4px 18px 14px;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-padding-left: 18px;
    scrollbar-width: none;
  }

  .recent-updates-card::-webkit-scrollbar {
    display: none;
  }

  .recent-item {
    flex: 0 0 84%;
    scroll-snap-align: center;
    border-radius: 20px;
  }

  .recent-media {
    height: 164px;
  }

  .recent-body {
    padding: 15px 18px 18px;
  }

  .recent-title {
    font-size: 1.12rem;
    padding-right: 34px;
  }

  .recent-excerpt {
    font-size: 0.82rem;
  }

  .recent-arrow {
    right: 15px;
    bottom: 15px;
    width: 30px;
    height: 30px;
  }

  .recent-index {
    font-size: 2.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recent-item,
  .recent-item:hover,
  .recent-media img,
  .recent-item:hover .recent-media img,
  .recent-index,
  .recent-arrow,
  .recent-tag {
    transform: none;
    transition: none;
  }
}
</style>
