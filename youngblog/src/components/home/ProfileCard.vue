<template>
  <div class="profile-card" id="home-profile-card" @click="handleCardClick">
    <div class="profile-card-sheen" aria-hidden="true"></div>

    <!-- 头像与姓名 -->
    <div class="profile-header">
      <div class="avatar profile-avatar">
        <img :src="resolveUrl('/assets/avatar.webp')" alt="头像">
      </div>
      <div class="profile-header-info">
        <h2 class="name">{{ i18n.currentTranslations.profile_name }}</h2>
        <div class="date-row">
          <div class="play-icon"></div>
          <span class="date-label">{{ i18n.currentTranslations.label_school }}</span>
          <span class="date-value">{{ i18n.currentTranslations.school_name }}</span>
        </div>
      </div>
    </div>

    <div class="profile-divider"></div>

    <!-- 年级与学历 -->
    <div class="level-section">
      <div class="profile-row">
        <div class="level-item">
          <div class="level-icon hex">⬡</div>
          <span class="level-text">{{ i18n.currentTranslations.label_grade }}</span>
        </div>
        <span class="level-value">{{ i18n.currentTranslations.grade_value }}</span>
      </div>
      <div class="profile-row">
        <div class="level-item">
          <div class="level-icon eye">◉</div>
          <span class="level-text">{{ i18n.currentTranslations.label_degree }}</span>
        </div>
        <span class="level-value">{{ i18n.currentTranslations.degree_name }}</span>
      </div>
    </div>

    <div class="profile-divider"></div>

    <!-- 专业方向 -->
    <div class="specialty-section">
      <div class="specialty-row">
        <div class="specialty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
            <line x1="12" y1="12" x2="12" y2="22" />
          </svg>
        </div>
        <div class="specialty-info">
          <div class="specialty-title">{{ i18n.currentTranslations.specialty_title }}</div>
          <div class="specialty-value">{{ i18n.currentTranslations.specialty_name }}</div>
        </div>
      </div>
    </div>

    <div class="profile-divider"></div>

    <!-- 统计数据 -->
    <div class="stats stats--compact">
      <div class="stat">
        <router-link class="stat-link" to="/archive">
          <span class="count">{{ blogStore.totalPosts }}</span>
          <span class="label">{{ i18n.currentTranslations.posts }}</span>
        </router-link>
      </div>
      <div class="stat">
        <router-link class="stat-link" to="/archive">
          <span class="count">{{ wordCount }}</span>
          <span class="label">{{ i18n.currentTranslations.total_words }}</span>
        </router-link>
      </div>
      <div class="stat">
        <router-link class="stat-link" to="/categories">
          <span class="count">{{ blogStore.tags.length }}</span>
          <span class="label">{{ i18n.currentTranslations.tags }}</span>
        </router-link>
      </div>
    </div>

    <div class="profile-divider"></div>

    <!-- 兴趣爱好 -->
    <div class="profile-bottom">
      <div class="interests-label">{{ i18n.currentTranslations.label_interests }}</div>
      <div class="interests-list">
        <span class="interest">{{ i18n.currentTranslations.interest_game }}</span>
        <span class="interest">{{ i18n.currentTranslations.interest_literature }}</span>
        <span class="interest">{{ i18n.currentTranslations.interest_jpop }}</span>
        <span class="interest">{{ i18n.currentTranslations.interest_language }}</span>
      </div>
    </div>

    <div class="profile-divider"></div>

    <!-- 联系方式 -->
    <div class="profile-footer">
      <div class="build-title">{{ i18n.currentTranslations.contact }}</div>
      <div class="build-bars contact-bars">
        <a href="https://github.com/by-be-young" target="_blank" rel="noopener noreferrer" class="build-item green contact-card">
          <div class="build-left">
            <div class="build-icon contact-icon github"><i class="fab fa-github"></i></div>
            <span class="build-name">GitHub</span>
          </div>
        </a>
        <button type="button" class="build-item blue contact-card" @click.stop="handleContactClick('wechat')">
          <div class="build-left">
            <div class="build-icon contact-icon wechat"><i class="fab fa-weixin"></i></div>
            <span class="build-name">{{ i18n.currentTranslations.contact_wechat }}</span>
          </div>
        </button>
        <button type="button" class="build-item contact-card contact-card--purple" @click.stop="handleContactClick('qq')">
          <div class="build-left">
            <div class="build-icon contact-icon qq"><i class="fab fa-qq"></i></div>
            <span class="build-name">{{ i18n.currentTranslations.contact_qq }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18nStore'
import { useBlogStore } from '@/stores/blogStore'
import { resolveUrl } from '@/utils/url'

const router = useRouter()
const i18n = useI18nStore()
const infoBgImg = `url(${resolveUrl('/assets/images/information.webp')})`

const blogStore = useBlogStore()
const wordCount = ref('0.0w')

const calculateWordCount = async () => {
  try {
    const files = blogStore.blogs.map(b => b.contentFile).filter(Boolean)
    let total = 0
    for (const file of files) {
      const res = await fetch(resolveUrl(file))
      const text = await res.text()
      const clean = text.replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#>*~\-]/g, ' ')
        .replace(/\s+/g, '')
      total += clean.length
    }
    const lang = i18n.getLang()
    wordCount.value = lang === 'zh' ? (total / 10000).toFixed(1) + 'w' : Math.round(total / 1000) + 'k'
  } catch (e) {
    wordCount.value = '0.0w'
  }
}

const handleCardClick = (e) => {
  if (e.target.closest('a, button, .contact-card')) return
  router.push('/about')
}

const handleContactClick = (type) => {
  const value = type === 'wechat' ? 'w19979258352' : '3416637855'
  if (navigator.clipboard) {
    navigator.clipboard.writeText(value).then(() => {
      showToast(`${type === 'wechat' ? '微信' : 'QQ'} 已复制`)
    }).catch(() => {
      fallbackCopy(value)
    })
  } else {
    fallbackCopy(value)
  }
}

const fallbackCopy = (text) => {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
  showToast('已复制')
}

const showToast = (msg) => {
  const toast = document.createElement('div')
  toast.className = 'contact-copy-toast show'
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 1800)
}

// 博客数据加载完成后计算总字数
// （卡片挂载时博客列表可能尚未从异步 fetchBlogs 加载完成，需监听到达后再计算）
watch(() => blogStore.blogs.length, (len) => {
  if (len > 0) calculateWordCount()
}, { immediate: true })
</script>

<style scoped>
/* ==================================================
   SECTION: 侧边栏容器 (Sidebar)
   ================================================== */

.sidebar {
  position: relative;
}


/* ==================================================
   SECTION: 个人资料卡片基础样式 (Profile Card Base)
   ================================================== */

.profile-card {
  background:
    linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)),
    v-bind(infoBgImg) center/cover no-repeat;
  border-radius: 15px;
  padding: 30px;
  box-shadow: var(--shadow);
  text-align: center;
  position: sticky;
  top: 80px;
  transition: var(--transition);
}

.profile-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}


/* ==================================================
   SECTION: 头像 (Avatar)
   ================================================== */

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 20px;
  border: 3px solid var(--primary-color);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}


/* ==================================================
   SECTION: 资料详情行 (Profile Info Rows)
   ================================================== */

.profile-info {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-row {
  display: flex;
  gap: 0px;
  align-items: stretch;
}

.profile-label {
  background: rgba(93, 173, 226, 0.78);
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px 0 0 8px;
  font-size: 0.85rem;
  min-width: 86px;
  flex: 0 0 86px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.profile-value {
  background: rgba(255, 255, 255, 0.72);
  color: var(--detail-text);
  padding: 8px 12px;
  border-radius: 0 8px 8px 0;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  font-weight: 600;
  box-sizing: border-box;
  flex: 1 1 auto;
}

/* 各标签的纯色马卡龙背景 */
.profile-label--school {
  background: rgba(255, 110, 143, 0.8);
}

.profile-label--degree {
  background: rgba(47, 191, 134, 0.8);
}

.profile-label--grade {
  background: rgba(127, 114, 230, 0.8);
}

.profile-label--department {
  background: rgba(255, 184, 77, 0.8);
}

/* 右侧文字颜色与左侧标签对应 */
.profile-label--school + .profile-value {
  color: #ff6e8f;
}

.profile-label--degree + .profile-value {
  color: #2fbf86;
}

.profile-label--grade + .profile-value {
  color: #7f72e6;
}

.profile-label--department + .profile-value {
  color: #ffb84d;
}


/* ==================================================
   SECTION: 兴趣标签 (Interests)
   ================================================== */

.profile-interests {
  margin-top: 12px;
}

.interests-label {
  font-weight: 700;
  color: var(--detail-text);
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 10px;
  padding: 6px 10px;
}

.interests-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.interest {
  background: rgba(47, 191, 134, 0.78);
  color: #fff;
  padding: 6px 8px;
  border-radius: 12px;
  font-size: 0.85rem;
}


/* ==================================================
   SECTION: 联系方式按钮 & 弹出卡片 (Contact & Popup)
   ================================================== */

.contact-links {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  position: relative;
}

.contact-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: var(--detail-text);
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease;
}

.contact-btn:hover {
  background: var(--primary-color);
  color: #fff;
  transform: translateY(-3px);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.12);
}

.contact-popup {
  position: fixed;
  top: 0;
  left: 0;
  transform: translate3d(0, 0, 0);
  background: rgba(255, 255, 255, 0.98);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.08);
  display: block;
  z-index: 1200;
  min-width: 160px;
  text-align: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity .12s ease, transform .12s ease;
  pointer-events: none;
}

.contact-popup.show {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.contact-popup .contact-item {
  padding: 6px 0;
  color: var(--detail-text);
}

.contact-popup .number-line {
  font-weight: 700;
  color: var(--detail-text);
  font-size: 1rem;
}

/* 复制成功/失败提示 */
.contact-copy-toast {
  position: fixed;
  top: calc(60px + 12px);
  left: 50%;
  transform: translateX(-50%) translateY(-12px);
  z-index: 2100;
  min-width: 180px;
  max-width: min(92vw, 480px);
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.95), rgba(167, 243, 208, 0.95));
  box-shadow: 0 12px 28px rgba(44, 62, 80, 0.18);
  color: #1f2f40;
  font-weight: 700;
  font-size: 1.06rem;
  text-align: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 260ms ease, transform 260ms ease, visibility 260ms ease;
}

.contact-copy-toast.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.contact-copy-toast.is-error {
  background: linear-gradient(135deg, rgba(255, 208, 208, 0.96), rgba(255, 236, 200, 0.96));
  color: #7a2732;
}


/* ==================================================
   SECTION: 首页卡片精细化布局 (#home-profile-card)
   ================================================== */

#home-profile-card .profile-card-sheen {
  position: absolute;
  inset: auto -36px -40px auto;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 219, 235, 0.18), rgba(255, 219, 235, 0) 68%);
  pointer-events: none;
  z-index: 0;
}

#home-profile-card {
  width: 100%;
  max-width: none;
  position: sticky;
  top: 80px;
  padding: 18px;
  border-radius: 22px;
  overflow: hidden;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: var(--card-border-w, 5px) solid transparent;
  background:
    linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)) padding-box,
    v-bind(infoBgImg) center/cover no-repeat padding-box,
    linear-gradient(135deg, var(--macaron-pink, #ffb6c9), var(--macaron-mint, #a7f3d0), var(--macaron-lavender, #c7b6ff)) border-box;
  box-shadow: 0 18px 42px rgba(18, 24, 38, 0.16);
  backdrop-filter: blur(10px);
  isolation: isolate;
}

#home-profile-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0) 70%);
  border-radius: 0 0 0 100%;
  pointer-events: none;
}

#home-profile-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0) 36%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 45%);
  pointer-events: none;
}

#home-profile-card > * {
  position: relative;
  z-index: 1;
}

/* 卡片头部：头像 + 姓名 + 学校 */
#home-profile-card .profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

#home-profile-card .profile-avatar {
  width: 88px;
  height: 88px;
  margin: 0;
  border-radius: 18px;
  border: 2px solid rgba(255, 255, 255, 0.24);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.16);
  overflow: hidden;
  flex-shrink: 0;
}

#home-profile-card .profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

#home-profile-card .profile-header-info {
  min-width: 0;
  flex: 1;
}

#home-profile-card .name {
  margin: 0;
  padding: 0;
  background: transparent;
  color: #fff9d8;
  text-shadow: 0 1px 2px rgba(47, 25, 10, 0.42);
  font-size: 1.72rem;
  line-height: 1.1;
}

/* 学校日期行 */
#home-profile-card .date-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  margin-bottom: 4px;
}

#home-profile-card .play-icon {
  width: 0;
  height: 0;
  border-left: 8px solid #aaff00;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

#home-profile-card .date-label {
  font-size: 0.72rem;
  color: #aaff00;
}

#home-profile-card .date-value {
  font-size: 0.78rem;
  color: #17324f;
  font-weight: 700;
}

/* 分割线 */
#home-profile-card .profile-divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
}

/* 等级/学历区域 */
#home-profile-card .level-section {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#home-profile-card .profile-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  min-height: 40px;
  margin: 0;
}

#home-profile-card .level-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

#home-profile-card .level-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4d79a8;
  font-size: 14px;
}

#home-profile-card .level-text {
  font-size: 0.86rem;
  color: #325b7b;
}

#home-profile-card .level-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #fffdf5;
}

/* 专业/特长区域 */
#home-profile-card .specialty-section {
  padding: 0;
}

#home-profile-card .specialty-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 250, 240, 0.88);
  box-shadow: inset 0 0 0 1px rgba(80, 120, 160, 0.08);
}

#home-profile-card .specialty-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 219, 235, 0.86);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7a3550;
  flex-shrink: 0;
}

#home-profile-card .specialty-icon svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
}

#home-profile-card .specialty-info {
  min-width: 0;
  flex: 1;
}

#home-profile-card .specialty-title {
  font-size: 0.74rem;
  color: #325b7b;
  margin-bottom: 2px;
}

#home-profile-card .specialty-value {
  font-size: 1rem;
  font-weight: 700;
  color: #17324f;
}

/* 紧凑统计 */
#home-profile-card .stats--compact {
  margin: 0;
  padding: 12px 0;
  border: 0;
  background: rgba(255, 250, 240, 0.9);
  border-radius: 14px;
  display: flex;
  justify-content: space-around;
  gap: 8px;
}

#home-profile-card .stat {
  text-align: center;
}

#home-profile-card .stat-link {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
}

#home-profile-card .stat-link:hover {
  background: rgba(255, 219, 235, 0.6);
  transform: translateY(-2px);
}

#home-profile-card .stat-link:active {
  transform: translateY(0);
}

#home-profile-card .count {
  font-size: 1.6rem;
  line-height: 1;
  color: #17324f;
}

#home-profile-card .stat:nth-child(2) .count {
  color: #325b7b;
}

#home-profile-card .stat:nth-child(3) .count {
  color: #7a3550;
}

#home-profile-card .label {
  font-size: 0.78rem;
  color: #325b7b;
}

/* 卡片底部：兴趣 + 联系方式 */
#home-profile-card .profile-bottom {
  display: flex;
  flex-direction: column;
}

#home-profile-card .interests-label {
  font-size: 0.74rem;
  color: #325b7b;
  margin-bottom: 8px;
  background: transparent;
  padding: 0;
}

#home-profile-card .interests-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#home-profile-card .interest {
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.84rem;
  color: #17324f;
  background: rgba(255, 250, 240, 0.9);
  box-shadow: inset 0 0 0 1px rgba(80, 120, 160, 0.08);
}

#home-profile-card .profile-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#home-profile-card .build-title {
  font-size: 0.74rem;
  color: #325b7b;
  margin: 0;
}

#home-profile-card .contact-bars {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

#home-profile-card .build-item {
  flex: 1 1 0;
  min-width: 0;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  border-radius: 10px;
  border: 0;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
}

#home-profile-card .build-item.green {
  background: rgba(255, 250, 240, 0.9);
  box-shadow: inset 0 0 0 1px rgba(91, 127, 49, 0.16);
}

#home-profile-card .build-item.blue {
  background: rgba(255, 250, 240, 0.9);
  box-shadow: inset 0 0 0 1px rgba(29, 138, 90, 0.16);
}

#home-profile-card .build-item.contact-card--purple {
  background: rgba(255, 250, 240, 0.9);
  box-shadow: inset 0 0 0 1px rgba(91, 99, 200, 0.16);
}

#home-profile-card .build-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.10);
}

#home-profile-card .build-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

#home-profile-card .build-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: currentColor;
}

#home-profile-card .contact-icon i {
  font-size: 18px;
  line-height: 1;
}

#home-profile-card .contact-icon.github {
  color: #2d63bf;
}

#home-profile-card .contact-icon.wechat {
  color: #1b8d63;
}

#home-profile-card .contact-icon.qq {
  color: #5b63c8;
}

#home-profile-card .build-name {
  font-size: 0.8rem;
  color: #17324f;
  white-space: nowrap;
}

#home-profile-card .build-item .build-left,
#home-profile-card .build-item .build-icon {
  color: #17324f;
}

#home-profile-card .build-item .build-icon i {
  color: currentColor;
}

#home-profile-card .build-item.green .build-icon {
  color: #2d63bf;
}

#home-profile-card .build-item.blue .build-icon {
  color: #1b8d63;
}

#home-profile-card .build-item.contact-card--purple .build-icon {
  color: #5b63c8;
}

#home-profile-card .build-item:hover {
  box-shadow: 0 10px 24px rgba(21, 50, 79, 0.16);
}


/* ==================================================
   SECTION: 响应式适配 (针对侧边卡片)
   ================================================== */

@media (max-width: 720px) {
  #home-profile-card {
    top: 0;
    padding: 16px;
  }

  #home-profile-card .profile-header {
    align-items: flex-start;
  }

  #home-profile-card .profile-avatar {
    width: 76px;
    height: 76px;
  }

  #home-profile-card .name {
    font-size: 1.5rem;
  }

  #home-profile-card .profile-row {
    gap: 12px;
  }

  #home-profile-card .level-value {
    font-size: 1.08rem;
  }

  #home-profile-card .specialty-row {
    padding: 10px;
  }

  #home-profile-card .specialty-value {
    font-size: 0.96rem;
  }

  #home-profile-card .stats--compact {
    padding: 10px 0;
    gap: 6px;
  }

  #home-profile-card .count {
    font-size: 1.35rem;
  }

  #home-profile-card .interests-list {
    gap: 8px;
  }

  #home-profile-card .interest {
    padding: 6px 10px;
  }

  #home-profile-card .contact-bars {
    flex-direction: column;
  }

  #home-profile-card .build-item {
    width: 100%;
  }
}

@media (hover: hover) {
  #home-profile-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 22px 46px rgba(18, 24, 38, 0.18);
  }
}

@media (prefers-reduced-motion: reduce) {
  #home-profile-card,
  #home-profile-card:hover {
    transform: none;
  }
}
</style>