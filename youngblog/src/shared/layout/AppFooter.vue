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
      <span class="footer-stat-item" v-if="pv">
        <span>{{ i18n.currentTranslations.footer_site_views }}</span>
        <span class="footer-stat-number">{{ pv }}</span>
      </span>
    </div>
  </footer>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { useBlogStore } from '@/shared/stores/blogStore'
import { resolveUrl } from '@/shared/utils/url'

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
        .replace(/[#>*~-]/g, ' ')
        .replace(/\s+/g, '')
      total += clean.length
    }
    wordCount.value = total.toLocaleString('zh-CN')
  } catch {
    wordCount.value = '0'
  }
}

// 监听博客数据变化，加载完成后自动计算
watch(() => blogStore.blogs.length, (len) => {
  if (len > 0) calculateWordCount()
})

// 访问量统计：读取服务器 nginx 日志生成的 stats.json（服务器每 5 分钟自动更新）。
// 没有该文件（如 GitHub Pages 部署）时静默隐藏，不影响其他功能。
const pv = ref('')
onMounted(async () => {
  try {
    const res = await fetch(resolveUrl('stats.json'), { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    if (data && typeof data.site_pv === 'number') {
      pv.value = data.site_pv.toLocaleString('zh-CN')
    }
  } catch {
    // 静默失败
  }
})
</script>

<style scoped>
/* ==================================================
   SECTION: 页脚 (Footer)
   来自 style-home.css
   ================================================== */

.site-footer {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: none;
  margin: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.62) 0%, rgba(246, 250, 255, 0.5) 100%);
  backdrop-filter: blur(18px) saturate(1.08);
  -webkit-backdrop-filter: blur(18px) saturate(1.08);
  padding: 24px clamp(20px, 4vw, 72px) 24px clamp(96px, 8vw, 132px);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px 24px;
  border: 0;
  border-top: 1px solid rgba(23, 34, 47, 0.08);
  border-radius: 0;
  box-shadow: none;
}

.site-footer::before {
  display: none;
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
  color: rgba(23, 34, 47, 0.58);
  font-size: 0.92rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.site-footer .footer-stat-number {
  font-weight: 600;
  color: #17222f;
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
  color: rgba(23, 34, 47, 0.58);
  text-decoration: none;
  font-size: 0.92rem;
  transition: color 0.25s ease;
}

.site-footer .footer-center a:hover {
  color: #c84070;
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
    width: 100%;
    margin: 0;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px 18px;
    border-radius: 0;
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
    padding: 16px 14px;
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