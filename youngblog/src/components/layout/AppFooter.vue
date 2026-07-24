<template>
  <footer class="site-footer home-footer">
    <!-- 左侧统计 -->
    <div class="footer-stats footer-stats-left" aria-hidden="true">
      <span class="footer-stat-item">
        <span>{{ i18n.currentTranslations.footer_blog_count }}</span>
        <span class="footer-stat-number">{{ blogStore.totalPosts }}</span>
      </span>
      <span class="footer-stat-item">
        <span>{{ i18n.currentTranslations.footer_total_words }}</span>
        <span class="footer-stat-number">{{ wordCount }}</span>
      </span>
    </div>

    <!-- 备案信息 -->
    <div class="footer-center">
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
        赣ICP备2026004108号
      </a>
    </div>

    <!-- 右侧统计 -->
    <div class="footer-stats footer-stats-right" aria-hidden="true">
      <span class="footer-stat-item" id="busuanzi_container_site_uv">
        <span>{{ i18n.currentTranslations.footer_site_visitors }}</span>
        <span class="footer-stat-number" id="busuanzi_site_uv">0</span>
      </span>
      <span class="footer-stat-item" id="busuanzi_container_site_pv">
        <span>{{ i18n.currentTranslations.footer_site_views }}</span>
        <span class="footer-stat-number" id="busuanzi_site_pv">0</span>
      </span>
    </div>
  </footer>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'
import { resolveUrl } from '@/utils/url'

const i18n = useI18nStore()
const blogStore = useBlogStore()
const wordCount = ref('0')

// 计算总字数
const calculateWordCount = async () => {
  try {
    const files = blogStore.blogs.map(b => b.contentFile).filter(Boolean)
    if (!files.length) {
      wordCount.value = '0'
      return
    }
    let total = 0
    for (const file of files) {
      const res = await fetch(resolveUrl(file))
      const text = await res.text()
      // 简单统计字数（去除 Markdown 标记）
      const clean = text.replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#>*~\-]/g, ' ')
        .replace(/\s+/g, '')
      total += clean.length
    }
    wordCount.value = total.toLocaleString('zh-CN')
  } catch (e) {
    wordCount.value = '0'
  }
}

// 监听博客数据变化，加载完成后自动计算
watch(() => blogStore.blogs.length, (len) => {
  if (len > 0) calculateWordCount()
})

// 等待不蒜子加载完成后输出数据到控制台
const logBusuanzi = () => {
  const uvEl = document.getElementById('busuanzi_site_uv')
  const pvEl = document.getElementById('busuanzi_site_pv')
  if (uvEl && pvEl && uvEl.textContent !== '0' && pvEl.textContent !== '0') {
    console.log('[不蒜子] 访客数 (UV):', uvEl.textContent)
    console.log('[不蒜子] 访问量 (PV):', pvEl.textContent)
  } else {
    setTimeout(logBusuanzi, 1000)
  }
}
setTimeout(logBusuanzi, 2000)
</script>

<style scoped>
/* ==================================================
   SECTION: 页脚 (Footer)
   来自 style-home.css
   ================================================== */

.site-footer {
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg,
    rgba(255, 182, 201, 0.7) 0%,
    rgba(167, 243, 208, 0.7) 45%,
    rgba(199, 182, 255, 0.7) 100%);
  backdrop-filter: blur(20px) saturate(1.1);
  -webkit-backdrop-filter: blur(20px) saturate(1.1);
  padding: 28px 100px 22px;
  margin-top: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px 24px;
  border: none;
  box-shadow: none;
}

.site-footer::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 12% 12%, rgba(255, 255, 255, 0.2), transparent 42%),
    radial-gradient(circle at 86% 20%, rgba(255, 255, 255, 0.14), transparent 38%),
    linear-gradient(120deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.1));
  z-index: 0;
}

.site-footer > * {
  position: relative;
  z-index: 1;
}

/* 页脚统计信息（左） */
.site-footer .footer-stats-left {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.site-footer .footer-stat-item {
  color: var(--home-muted, #5f6b7a);
  font-size: 0.92rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.site-footer .footer-stat-number {
  font-weight: 600;
  color: var(--dark-color, #2c3e50);
  margin-left: 2px;
}

/* 页脚中心（备案号） */
.site-footer .footer-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
}

.site-footer .footer-center a {
  color: var(--home-muted, #5f6b7a);
  text-decoration: none;
  font-size: 0.92rem;
  transition: color 0.25s ease;
}

.site-footer .footer-center a:hover {
  color: #ff5f8a;
}

/* 页脚统计信息（右） */
.site-footer .footer-stats-right {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}


/* ==================================================
   SECTION: 页脚响应式
   ================================================== */

@media (max-width: 820px) {
  .site-footer {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 22px 40px 18px;
    gap: 12px;
  }

  .site-footer .footer-stats-left,
  .site-footer .footer-stats-right {
    justify-content: center;
    gap: 16px 20px;
  }

  .site-footer .footer-center {
    order: 2;
  }

  .site-footer .footer-stats-left {
    order: 1;
  }

  .site-footer .footer-stats-right {
    order: 3;
  }
}

@media (max-width: 480px) {
  .site-footer {
    padding: 18px 24px 14px;
  }

  .site-footer .footer-stat-item {
    font-size: 0.8rem;
  }

  .site-footer .footer-center a {
    font-size: 0.8rem;
  }

  .site-footer .footer-stats-left,
  .site-footer .footer-stats-right {
    gap: 10px 14px;
  }
}

/* 减少动画偏好（无障碍） */
@media (prefers-reduced-motion: reduce) {
  .site-footer {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .site-footer::before {
    display: none;
  }
}
</style>