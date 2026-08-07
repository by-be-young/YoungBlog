<template>
  <div class="blog-card-placeholder" aria-hidden="true">
    <div class="placeholder-content">
      <div class="placeholder-icon">✦</div>
      <div class="placeholder-title">{{ i18n.currentTranslations.home_placeholder_title }}</div>
      <div class="placeholder-subtitle">{{ i18n.currentTranslations.home_placeholder_subtitle }}</div>
      <div class="placeholder-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18nStore } from '@/stores/i18nStore'

const i18n = useI18nStore()
</script>

<style scoped>
/* ==================================================
   SECTION: 占位卡片 - 优雅装饰设计
   来自 style-home.css
   ================================================== */

.blog-card-placeholder {
  height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  cursor: default;
  background: #ffffff;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.4s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* 动态渐变背景层 */
.blog-card-placeholder::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
    #fdf6f0 0%,
    #f0f7f4 30%,
    #f5f0fa 60%,
    #fdf6f0 100%);
  background-size: 300% 300%;
  animation: placeholderShimmer 8s ease-in-out infinite alternate;
  z-index: 0;
}

/* 装饰性浮动光晕 */
.blog-card-placeholder::after {
  content: '';
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background: radial-gradient(circle at 30% 40%,
    rgba(239, 117, 168, 0.08) 0%,
    rgba(67, 200, 160, 0.08) 35%,
    rgba(143, 131, 235, 0.08) 70%,
    transparent 100%);
  animation: placeholderGlow 12s ease-in-out infinite alternate;
  z-index: 1;
  pointer-events: none;
}

/* 内容容器 - 在顶层 */
.blog-card-placeholder .placeholder-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px 24px;
}

/* 装饰图标 - 更精致的样式 */
.blog-card-placeholder .placeholder-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  display: inline-block;
  animation: placeholderFloat 4s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(143, 131, 235, 0.2));
  background: linear-gradient(135deg,
    #ef75a8,
    #43c8a0,
    #8f83eb);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% 200%;
  animation: placeholderFloat 4s ease-in-out infinite,
    gradientShift 5s ease-in-out infinite alternate;
}

/* 主标题文字 */
.blog-card-placeholder .placeholder-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4a4a5a;
  letter-spacing: 0.02em;
  margin-bottom: 6px;
  opacity: 0.85;
}

/* 副标题/装饰文字 */
.blog-card-placeholder .placeholder-subtitle {
  font-size: 0.8rem;
  font-weight: 400;
  color: #9a9aaa;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  opacity: 0.6;
}

/* 装饰性小点 - 作为视觉点缀 */
.blog-card-placeholder .placeholder-dots {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

.blog-card-placeholder .placeholder-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef75a8, #8f83eb);
  opacity: 0.3;
  transition: all 0.3s ease;
}

.blog-card-placeholder .placeholder-dots span:nth-child(2) {
  background: linear-gradient(135deg, #43c8a0, #8f83eb);
  opacity: 0.5;
  width: 8px;
  height: 8px;
}

.blog-card-placeholder .placeholder-dots span:nth-child(3) {
  background: linear-gradient(135deg, #ef75a8, #43c8a0);
  opacity: 0.4;
}

/* 悬停效果 - 更有互动感 */
.blog-card-placeholder:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 16px 48px rgba(143, 131, 235, 0.15),
    0 4px 16px rgba(239, 117, 168, 0.08);
  border-color: rgba(143, 131, 235, 0.15);
}

.blog-card-placeholder:hover .placeholder-dots span {
  opacity: 0.8;
  transform: scale(1.2);
}

.blog-card-placeholder:hover .placeholder-icon {
  filter: drop-shadow(0 8px 24px rgba(143, 131, 235, 0.35));
}


/* ===== 动画关键帧 ===== */

@keyframes placeholderShimmer {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 100% 100%;
  }
}

@keyframes placeholderGlow {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.5;
  }
  50% {
    transform: translate(5%, 5%) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translate(-5%, -5%) scale(0.9);
    opacity: 0.6;
  }
}

@keyframes placeholderFloat {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 100% 50%;
  }
}


/* ===== 响应式适配 ===== */

@media (max-width: 720px) {
  .blog-card-placeholder {
    height: 340px;
    border-radius: 14px;
  }

  .blog-card-placeholder .placeholder-icon {
    font-size: 2.4rem;
  }

  .blog-card-placeholder .placeholder-title {
    font-size: 0.95rem;
  }
}

@media (max-width: 600px) {
  .blog-card-placeholder {
    height: 280px;
    border-radius: 12px;
  }

  .blog-card-placeholder .placeholder-icon {
    font-size: 2rem;
  }

  .blog-card-placeholder .placeholder-title {
    font-size: 0.85rem;
  }

  .blog-card-placeholder .placeholder-subtitle {
    font-size: 0.7rem;
  }

  .blog-card-placeholder .placeholder-dots {
    gap: 6px;
    margin-top: 14px;
  }

  .blog-card-placeholder .placeholder-dots span {
    width: 5px;
    height: 5px;
  }

  .blog-card-placeholder .placeholder-dots span:nth-child(2) {
    width: 7px;
    height: 7px;
  }
}

/* 当网格列数较少时，占位卡片可隐藏 */
@media (max-width: 480px) {
  .blog-card-placeholder {
    display: none;
  }
}

/* 减少动画偏好（无障碍） */
@media (prefers-reduced-motion: reduce) {
  .blog-card-placeholder::before {
    animation: none;
  }

  .blog-card-placeholder::after {
    animation: none;
  }

  .blog-card-placeholder .placeholder-icon {
    animation: none !important;
  }

  .blog-card-placeholder:hover {
    transform: none !important;
  }
}
</style>