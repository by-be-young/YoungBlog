<template>
  <div class="recent-updates-card" style="grid-column: 1 / -1;">
    <div class="recent-updates-header">
      <span class="recommended-title">{{ i18n.currentTranslations.home_recent_updates }}</span>
    </div>
    <div class="recent-content">
      <template v-for="(blog, index) in blogs" :key="blog.id">
        <div
          class="recent-item"
          @click="$router.push(`/blog/${blog.id}`)"
        >
          <div class="recent-item-category-rail">
            <span class="recent-item-category">{{ getCategoryLabel(blog) }}</span>
          </div>
          <div class="recent-item-main">
            <h3 class="blog-title recent-item-title">{{ blog.title }}</h3>
            <p class="blog-excerpt recent-item-excerpt">{{ blog.excerpt || '' }}</p>
            <div class="blog-meta recent-item-meta">
              <span class="date">{{ formatDate(blog.date) }}</span>
            </div>
          </div>
          <div class="recent-item-side">
            <div class="blog-image recent-thumb">
              <img src="/assets/images/lantern_festival.png" :alt="blog.title">
              <div v-if="blog.type" class="blog-type-overlay">
                <span class="blog-type">{{ blog.type }}</span>
              </div>
              <div class="tags">
                <span
                  v-for="(tag, idx) in blog.tags"
                  :key="idx"
                  class="tag"
                  @click.stop="handleTagClick(blog, idx)"
                >{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'

const props = defineProps({
  blogs: {
    type: Array,
    required: true
  }
})

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
  return key === 'home_category_learning' ? i18n.t('home_category_learning') : i18n.t('home_category_entertainment')
}

const handleTagClick = (blog, index) => {
  const path = blog.tags.slice(0, index + 1)
  const tagsParam = JSON.stringify(path)
  router.push(`/categories?tags=${encodeURIComponent(tagsParam)}`)
}
</script>

<style scoped>
/* ==================================================
   SECTION: 最近更新卡片 (Recent Updates Card)
   来自 style-home.css
   ================================================== */

.recent-updates-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: stretch;
  border-radius: 15px;
  padding: 0;
  box-shadow: var(--shadow, 0 4px 6px rgba(0, 0, 0, 0.1));
  overflow: hidden;
  border: var(--card-border-w, 5px) solid transparent;
  background:
    var(--card-fill-blog, linear-gradient(135deg,
      rgba(154, 215, 255, 0.22) 0%,
      rgba(199, 182, 255, 0.20) 55%,
      rgba(255, 182, 201, 0.16) 100%)) padding-box,
    linear-gradient(135deg, var(--macaron-pink, #ffb6c9), var(--macaron-mint, #a7f3d0), var(--macaron-lavender, #c7b6ff)) border-box;
  --card-merge-bg: rgba(244, 250, 255, 0.92);
  backdrop-filter: blur(12px) saturate(1.06);
  -webkit-backdrop-filter: blur(12px) saturate(1.06);
}

.recent-updates-card .recent-updates-header {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 82px;
  padding: 18px 20px;
  border-radius: 0;
  border-bottom: 1px solid rgba(44, 62, 80, 0.08);
}

.recent-updates-card .recommended-title {
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--dark-color, #2c3e50);
  text-align: center;
  line-height: 1.15;
  text-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
  filter: saturate(1.1) contrast(1.06);
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .recent-updates-card .recommended-title {
    background: linear-gradient(120deg,
      var(--macaron-pink-strong, #ef75a8),
      var(--macaron-peach-strong, #ffb179),
      var(--macaron-mint-strong, #43c8a0),
      var(--macaron-lavender-strong, #8f83eb),
      var(--macaron-pink-strong, #ef75a8));
    background-size: 240% 240%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: recommended-title-macaron-flow 6s ease-in-out infinite;
  }
}

@keyframes recommended-title-macaron-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.recent-updates-card .recent-content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ========== 最近更新列表项 ========== */
.recent-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 290px;
  gap: 12px;
  align-items: stretch;
  padding: 0;
  min-height: 182px;
  border-bottom: 1px solid rgba(44, 62, 80, 0.08);
  cursor: pointer;
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-item-category-rail {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0.02));
  cursor: default;
  user-select: none;
}

.recent-item-category-rail,
.recent-item-category-rail * {
  cursor: default !important;
}

.recent-item-main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px 10px 20px 8px;
}

.recent-item-title {
  color: #ff5f8a;
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 4px;
}

.recent-item-excerpt {
  color: rgba(13, 110, 87, 0.86);
  font-size: 0.95rem;
  line-height: 1.5;
}

.recent-item-meta {
  color: var(--home-muted, #5f6b7a);
  font-size: 0.85rem;
}

.recent-item-category {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: 0.96rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--dark-color, #2c3e50);
}

/* ========== 缩略图 ========== */
.recent-item-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
}

.recent-thumb {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 0;
  position: relative;
}

.recent-thumb::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 30px;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(135deg,
    var(--macaron-pink, #ffb6c9) 0%,
    var(--macaron-mint, #a7f3d0) 45%,
    var(--macaron-lavender, #c7b6ff) 100%);
  -webkit-mask-image: linear-gradient(to right, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0) 100%);
  mask-image: linear-gradient(to right, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0) 100%);
}

.recent-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ========== 缩略图上的标签 ========== */
.recent-thumb .tags {
  position: absolute;
  top: 12px;
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.recent-thumb .tag {
  padding: 4px 8px;
  border-radius: 999px 0 0 999px;
  font-size: 0.8rem;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: #ffffff;
  color: rgba(44, 62, 80, 0.88);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  position: relative;
  transition: padding 0.3s ease, background-color 0.3s ease;
}

.recent-thumb .tag::after {
  content: '→';
  position: absolute;
  right: -1.2em;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: right 0.3s ease, opacity 0.3s ease;
  color: inherit;
  font-size: inherit;
}

.recent-thumb .tag:hover {
  padding-left: 16px;
  padding-right: 24px;
  background-color: rgba(255, 255, 255, 0.9);
}

.recent-thumb .tag:hover::after {
  right: 8px;
  opacity: 1;
}

.recent-thumb .tag:nth-child(1) {
  background: #ffb6c9;
  border-color: rgba(255, 182, 201, 0.85);
  color: rgba(168, 54, 91, 0.92);
}

.recent-thumb .tag:nth-child(1):hover {
  background: rgba(255, 182, 201, 0.95);
}

.recent-thumb .tag:nth-child(2) {
  background: #a7f3d0;
  border-color: rgba(167, 243, 208, 0.85);
  color: rgba(13, 110, 87, 0.92);
}

.recent-thumb .tag:nth-child(2):hover {
  background: rgba(167, 243, 208, 0.95);
}

.recent-thumb .tag:nth-child(3) {
  background: #ffd2a6;
  border-color: rgba(255, 210, 166, 0.88);
  color: rgba(126, 69, 0, 0.92);
}

.recent-thumb .tag:nth-child(3):hover {
  background: rgba(255, 210, 166, 0.95);
}

/* ========== 博客类型标签 ========== */
.blog-type {
  display: inline-block;
  margin-left: 0;
  padding-left: 0;
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  color: #FFB6C1;
  font-size: 1.3em;
  font-weight: 500;
  font-style: italic;
  opacity: 0.95;
  -webkit-text-stroke: 0.01px #c29898;
  text-shadow: 0.4px 0.4px 0 #fff, -0.4px 0.4px 0 #fff, 0.4px -0.4px 0 #fff, -0.4px -0.4px 0 #fff;
}

.blog-type-overlay {
  position: absolute;
  top: 10px;
  left: 25px;
  z-index: 2;
}

/* ========== 悬浮日期效果 ========== */
.recent-item-title,
.recent-item-excerpt {
  transition: transform 0.34s cubic-bezier(0.2, 0.72, 0.2, 1);
  will-change: transform;
}

.recent-item-meta {
  border-top: 0;
  padding-top: 0;
  margin-top: 0;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transform: translateY(16px);
  transition: max-height 0.34s cubic-bezier(0.2, 0.72, 0.2, 1),
    margin-top 0.34s cubic-bezier(0.2, 0.72, 0.2, 1),
    padding-top 0.34s cubic-bezier(0.2, 0.72, 0.2, 1),
    opacity 0.24s ease,
    transform 0.34s cubic-bezier(0.2, 0.72, 0.2, 1),
    border-top-color 0.34s ease;
  will-change: max-height, opacity, transform;
}

.recent-item:hover .recent-item-title,
.recent-item:focus-within .recent-item-title {
  transform: translateY(-10px);
}

.recent-item:hover .recent-item-excerpt,
.recent-item:focus-within .recent-item-excerpt {
  transform: translateY(-8px);
}

.recent-item:hover .recent-item-meta,
.recent-item:focus-within .recent-item-meta {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-top: 10px;
  margin-top: 8px;
  max-height: 44px;
  opacity: 1;
  transform: translateY(0);
}

/* 触屏设备降级 */
@media (hover: none), (pointer: coarse) {
  .recent-item-title,
  .recent-item-excerpt {
    transform: none !important;
  }

  .recent-item-meta {
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    padding-top: 10px;
    margin-top: 8px;
    max-height: none;
    opacity: 1;
    overflow: visible;
    transform: none;
  }
}

/* ========== 响应式 ========== */
@media (max-width: 720px) {
  .recent-updates-card .recent-updates-header {
    min-height: 68px;
    padding: 14px 16px;
  }

  .recent-updates-card .recommended-title {
    font-size: 1.24rem;
    letter-spacing: 0.06em;
  }

  .recent-item {
    grid-template-columns: 36px minmax(0, 1fr) 148px;
    align-items: stretch;
    min-height: 120px;
  }

  .recent-item-main {
    padding: 14px 8px 14px 6px;
  }

  .recent-item-title {
    font-size: 1.02rem;
    line-height: 1.35;
    margin-bottom: 8px;
  }

  .recent-item-excerpt {
    margin-bottom: 8px;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .recent-item-meta {
    padding-top: 8px;
  }

  .recent-item-category {
    font-size: 0.84rem;
  }

  .recent-item-side {
    align-self: stretch;
    align-items: stretch;
    min-height: 100%;
  }

  .recent-thumb {
    width: 100%;
    height: 100%;
    min-height: 100%;
  }

  .recent-thumb .tags {
    top: 10px;
    gap: 6px;
  }

  .recent-thumb .tag {
    font-size: 0.72rem;
    padding: 3px 6px;
    border-radius: 10px 0 0 10px;
  }
}

@media (max-width: 560px) {
  .recent-item {
    grid-template-columns: 30px minmax(0, 1fr) 126px;
    gap: 8px;
    min-height: 112px;
  }

  .recent-item-main {
    padding: 10px 6px 10px 4px;
  }

  .recent-item-category {
    font-size: 0.78rem;
    letter-spacing: 0.04em;
  }

  .recent-thumb .tags {
    top: 8px;
    gap: 4px;
  }

  .recent-thumb .tag {
    font-size: 0.68rem;
    padding: 2px 6px;
  }
}

/* 减少动画偏好（无障碍） */
@media (prefers-reduced-motion: reduce) {
  .recent-updates-card .recommended-title {
    animation: none;
  }

  .recent-item-title,
  .recent-item-excerpt,
  .recent-item-meta {
    transition: none !important;
  }

  .recent-item:hover .recent-item-title,
  .recent-item:hover .recent-item-excerpt,
  .recent-item:hover .recent-item-meta {
    transform: none !important;
  }
}
</style>