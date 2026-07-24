<template>
  <div class="blog-card" @click="navigateToDetail">
    <div class="blog-image">
      <img :src="blogImage" :alt="blog.title">
      <div v-if="blog.type" class="blog-type-overlay">
        <span class="blog-type">{{ blog.type }}</span>
      </div>
      <div class="tags">
        <span 
          v-for="(tag, index) in blog.tags" 
          :key="index"
          class="tag"
          @click.stop="handleTagClick(index)"
        >{{ tag }}</span>
      </div>
    </div>
    <div class="blog-content">
      <h3 class="blog-title">{{ blog.title }}</h3>
      <p class="blog-excerpt">{{ blog.excerpt || '' }}</p>
      <div class="blog-meta">
        <span class="date">{{ formatDate(blog.date) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18nStore'
import { resolveUrl } from '@/utils/url'

const props = defineProps({
  blog: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const i18n = useI18nStore()

const blogImage = computed(() => {
  return resolveUrl('/assets/images/lantern_festival.png')
})

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
   SECTION: 博客卡片 (Blog Cards)
   来自 style-home.css
   ================================================== */

.blog-card {
  --card-merge-bg: rgba(244, 250, 255, 0.92);
  --card-fill-blog: linear-gradient(135deg,
    rgba(154, 215, 255, 0.22) 0%,
    rgba(199, 182, 255, 0.20) 55%,
    rgba(255, 182, 201, 0.16) 100%);
  --card-border-w: 5px;
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  --transition: all 0.3s ease;

  position: relative;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: var(--transition);
  cursor: pointer;
  border: var(--card-border-w) solid transparent;
  background:
    var(--card-fill-blog) padding-box,
    linear-gradient(135deg, #ffb6c9, #a7f3d0, #c7b6ff) border-box;
  backdrop-filter: blur(12px) saturate(1.06);
  -webkit-backdrop-filter: blur(12px) saturate(1.06);
}

/* 闪光扫光效果 */
.blog-card::before {
  content: '';
  position: absolute;
  top: -40%;
  bottom: -40%;
  width: 120px;
  left: -160px;
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.00) 35%,
    rgba(255, 255, 255, 0.42) 50%,
    rgba(255, 255, 255, 0.00) 65%,
    rgba(255, 255, 255, 0) 100%);
  transform: translateX(0) rotate(18deg);
  opacity: 0;
  pointer-events: none;
  z-index: 4;
  filter: blur(0.2px);
}

.blog-card:hover::before {
  opacity: 1;
  animation: blogCardShine 0.95s ease-out;
}

@keyframes blogCardShine {
  0% {
    transform: translateX(0) rotate(18deg);
  }
  100% {
    transform: translateX(calc(100vw + 360px)) rotate(18deg);
  }
}

.blog-card:hover {
  transform: translateY(-6px);
}

/* ========== 博客图片 ========== */
.blog-card .blog-image {
  position: relative;
  z-index: 1;
  height: 200px;
  overflow: hidden;
  flex: 0 0 200px;
}

.blog-card .blog-image::after {
  display: none;
}

/* 渐变遮罩（从图片到内容区的过渡） */
.blog-card::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(200px - 78px);
  height: 78px;
  z-index: 2;
  pointer-events: none;
  background:
    var(--card-fill-blog) padding-box,
    linear-gradient(135deg, #ffb6c9, #a7f3d0, #c7b6ff) border-box;
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%);
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%);
}

.blog-card .blog-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.blog-card:hover .blog-image img {
  transform: none;
}

/* ========== 博客内容 ========== */
.blog-card .blog-content {
  position: relative;
  z-index: 3;
  padding: 25px 25px 52px;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}

.blog-card .blog-title {
  font-size: 1.4rem;
  color: #ff5f8a;
  margin-bottom: 10px;
  line-height: 1.4;
  transition: transform 0.34s cubic-bezier(0.2, 0.72, 0.2, 1);
  will-change: transform;
}

.blog-card .blog-excerpt {
  color: rgba(13, 110, 87, 0.86);
  margin-bottom: 15px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform 0.34s cubic-bezier(0.2, 0.72, 0.2, 1);
  will-change: transform;
}

.blog-card .blog-meta {
  position: absolute;
  left: 25px;
  right: 25px;
  bottom: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: #5f6b7a;
  border-top: 0;
  padding-top: 0;
  margin-top: 0;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transform: translateY(16px);
  transition: max-height 0.34s cubic-bezier(0.2, 0.72, 0.2, 1),
    padding-top 0.34s cubic-bezier(0.2, 0.72, 0.2, 1),
    opacity 0.24s ease,
    transform 0.34s cubic-bezier(0.2, 0.72, 0.2, 1),
    border-top-color 0.34s ease;
  will-change: max-height, opacity, transform;
}

.blog-card:hover .blog-title,
.blog-card:focus-within .blog-title {
  transform: translateY(-10px);
}

.blog-card:hover .blog-excerpt,
.blog-card:focus-within .blog-excerpt {
  transform: translateY(-8px);
}

.blog-card:hover .blog-meta,
.blog-card:focus-within .blog-meta {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-top: 10px;
  max-height: 44px;
  opacity: 1;
  transform: translateY(0);
}

/* 触屏设备降级 */
@media (hover: none), (pointer: coarse) {
  .blog-card .blog-title,
  .blog-card .blog-excerpt {
    transform: none !important;
  }

  .blog-card .blog-meta {
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    padding-top: 10px;
    margin-top: auto;
    max-height: none;
    opacity: 1;
    overflow: visible;
    transform: none;
    position: static;
  }
}

/* ========== 标签 ========== */
.blog-card .tags {
  position: absolute;
  top: 12px;
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.blog-card .tag {
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

.blog-card .tag::after {
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

.blog-card .tag:hover {
  padding-left: 16px;
  padding-right: 24px;
  background-color: rgba(255, 255, 255, 0.9);
}

.blog-card .tag:hover::after {
  right: 8px;
  opacity: 1;
}

/* 标签颜色变体 */
.blog-card .tag:nth-child(1) {
  background: #ffb6c9;
  border-color: rgba(255, 182, 201, 0.85);
  color: rgba(168, 54, 91, 0.92);
}

.blog-card .tag:nth-child(1):hover {
  background: rgba(255, 182, 201, 0.95);
}

.blog-card .tag:nth-child(2) {
  background: #a7f3d0;
  border-color: rgba(167, 243, 208, 0.85);
  color: rgba(13, 110, 87, 0.92);
}

.blog-card .tag:nth-child(2):hover {
  background: rgba(167, 243, 208, 0.95);
}

.blog-card .tag:nth-child(3) {
  background: #ffd2a6;
  border-color: rgba(255, 210, 166, 0.88);
  color: rgba(126, 69, 0, 0.92);
}

.blog-card .tag:nth-child(3):hover {
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

/* ========== 响应式适配 ========== */
@media (max-width: 720px) {
  .blog-card {
    height: 430px;
  }
}

/* 减少动画偏好（无障碍） */
@media (prefers-reduced-motion: reduce) {
  .blog-card::before {
    display: none;
  }

  .blog-card .blog-title,
  .blog-card .blog-excerpt,
  .blog-card .blog-meta {
    transition: none !important;
  }

  .blog-card:hover .blog-title,
  .blog-card:hover .blog-excerpt,
  .blog-card:hover .blog-meta {
    transform: none !important;
  }
}
</style>