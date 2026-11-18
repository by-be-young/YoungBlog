<template>
  <div class="profile-card" id="home-profile-card" @click="handleCardClick">
    <div class="profile-art" aria-hidden="true"></div>
    <div class="profile-glow" aria-hidden="true"></div>

    <!-- 头像与姓名 -->
    <header class="profile-head">
      <div class="avatar-ring">
        <div class="avatar">
          <img :src="resolveUrl('/assets/avatar.webp')" alt="头像" />
        </div>
      </div>

      <div class="head-copy">
        <p class="profile-kicker">{{ i18n.currentTranslations.profile_bio }}</p>
        <h2 class="name">{{ i18n.currentTranslations.profile_name }}</h2>
        <p class="school">
          <span class="school-dot" aria-hidden="true"></span>
          {{ i18n.currentTranslations.school_name }}
        </p>
      </div>
    </header>

    <!-- 基础信息 -->
    <div class="spec-list">
      <div class="spec-row">
        <span class="spec-label">
          <i class="fas fa-graduation-cap" aria-hidden="true"></i>
          {{ i18n.currentTranslations.label_grade }}
        </span>
        <span class="spec-value">{{ i18n.currentTranslations.grade_value }}</span>
      </div>
      <div class="spec-row">
        <span class="spec-label">
          <i class="fas fa-book-open" aria-hidden="true"></i>
          {{ i18n.currentTranslations.label_degree }}
        </span>
        <span class="spec-value">{{ i18n.currentTranslations.degree_name }}</span>
      </div>
    </div>

    <!-- 专业 -->
    <div class="major-card">
      <span class="major-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </span>
      <div class="major-copy">
        <p class="major-label">{{ i18n.currentTranslations.specialty_title }}</p>
        <p class="major-value">{{ i18n.currentTranslations.specialty_name }}</p>
      </div>
    </div>

    <!-- 统计 -->
    <div class="stats">
      <router-link class="stat" to="/archive">
        <span class="stat-num">{{ displayedPosts }}</span>
        <span class="stat-label">{{ i18n.currentTranslations.posts }}</span>
      </router-link>
      <router-link class="stat" to="/archive">
        <span class="stat-num">{{ formattedWords }}</span>
        <span class="stat-label">{{ i18n.currentTranslations.total_words }}</span>
      </router-link>
      <router-link class="stat" to="/categories">
        <span class="stat-num">{{ displayedTags }}</span>
        <span class="stat-label">{{ i18n.currentTranslations.tags }}</span>
      </router-link>
    </div>

    <!-- 兴趣 -->
    <div class="meta-block">
      <p class="meta-label">{{ i18n.currentTranslations.label_interests }}</p>
      <div class="interests">
        <span class="interest interest--0">{{ i18n.currentTranslations.interest_game }}</span>
        <span class="interest interest--1">{{ i18n.currentTranslations.interest_literature }}</span>
        <span class="interest interest--2">{{ i18n.currentTranslations.interest_jpop }}</span>
        <span class="interest interest--3">{{ i18n.currentTranslations.interest_language }}</span>
      </div>
    </div>

    <!-- 联系方式 -->
    <div class="meta-block">
      <p class="meta-label">{{ i18n.currentTranslations.contact }}</p>
      <div class="contact-row">
        <a
          href="https://github.com/by-be-young"
          target="_blank"
          rel="noopener noreferrer"
          class="contact-card"
          aria-label="GitHub"
        >
          <i class="fab fa-github" aria-hidden="true"></i>
          <span>GitHub</span>
        </a>
        <button
          type="button"
          class="contact-card"
          @click.stop="handleContactClick('wechat')"
        >
          <i class="fab fa-weixin" aria-hidden="true"></i>
          <span>{{ i18n.currentTranslations.contact_wechat }}</span>
        </button>
        <button
          type="button"
          class="contact-card"
          @click.stop="handleContactClick('qq')"
        >
          <i class="fab fa-qq" aria-hidden="true"></i>
          <span>{{ i18n.currentTranslations.contact_qq }}</span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div class="contact-copy-toast" :class="{ show: toastVisible }" role="status">
        {{ toastMessage }}
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/shared/stores/i18nStore'
import { useBlogStore } from '@/shared/stores/blogStore'
import { resolveUrl } from '@/shared/utils/url'
import { prefersReducedMotion } from '@/shared/composables/useEntryLoader'

const router = useRouter()
const i18n = useI18nStore()
const blogStore = useBlogStore()

const profileArt = `url(${resolveUrl('/assets/images/information.webp')})`

/* ---------- 数字滚动 ---------- */
const displayedPosts = ref(0)
const displayedTags = ref(0)
const displayedWords = ref(0)
const wordTotal = ref(0)
const rafIds = []

const animatedValues = new Map()

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

const animateTo = (key, target, setter) => {
  if (prefersReducedMotion()) {
    setter(target)
    return
  }

  const from = animatedValues.get(key) ?? 0
  if (from === target) {
    setter(target)
    return
  }

  const start = performance.now()
  const duration = 1100
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1)
    const value = Math.round(from + (target - from) * easeOutCubic(progress))
    setter(value)
    animatedValues.set(key, value)
    if (progress < 1) {
      rafIds.push(requestAnimationFrame(tick))
    } else {
      animatedValues.set(key, target)
    }
  }
  rafIds.push(requestAnimationFrame(tick))
}

const formattedWords = computed(() => {
  const lang = i18n.getLang()
  const value = lang === 'zh' ? displayedWords.value / 10000 : displayedWords.value / 1000
  return `${value.toFixed(1)}${lang === 'zh' ? 'w' : 'k'}`
})

const calculateWordCount = async () => {
  try {
    const files = blogStore.blogs.map((b) => b.contentFile).filter(Boolean)
    let total = 0
    for (const file of files) {
      const res = await fetch(resolveUrl(file))
      const text = await res.text()
      const clean = text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#>*~-]/g, ' ')
        .replace(/\s+/g, '')
      total += clean.length
    }
    wordTotal.value = total
  } catch {
    wordTotal.value = 0
  }
}

watch(
  () => blogStore.blogs.length,
  (len) => {
    if (len > 0) calculateWordCount()
  },
  { immediate: true },
)

watch(
  () => blogStore.totalPosts,
  (target) => animateTo('posts', target, (v) => (displayedPosts.value = v)),
  { immediate: true },
)

watch(
  () => blogStore.tags.length,
  (target) => animateTo('tags', target, (v) => (displayedTags.value = v)),
  { immediate: true },
)

watch(wordTotal, (target) => animateTo('words', target, (v) => (displayedWords.value = v)))

onBeforeUnmount(() => {
  rafIds.forEach((id) => cancelAnimationFrame(id))
  rafIds.length = 0
  if (toastTimer) clearTimeout(toastTimer)
})

/* ---------- 交互 ---------- */
const handleCardClick = (e) => {
  if (e.target.closest('a, button, .contact-card')) return
  router.push('/about')
}

const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer = null

const showToast = (msg) => {
  toastMessage.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 1900)
}

const copyText = async (value) => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = value
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
}

const handleContactClick = async (type) => {
  const value = type === 'wechat' ? 'w19979258352' : '3416637855'
  const label = type === 'wechat' ? 'WeChat' : 'QQ'
  try {
    await copyText(value)
    showToast(`${label} · ${i18n.currentTranslations.image_copied}`)
  } catch {
    showToast(`${label} · ${i18n.currentTranslations.image_copied}`)
  }
}
</script>

<style scoped>
/* ==================================================
   个人资料卡：站内身份卡
   ================================================== */

@property --profile-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@property --ring-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.profile-card {
  position: sticky;
  top: 86px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  padding: 24px 24px 22px;
  border-radius: 26px;
  overflow: hidden;
  isolation: isolate;
  cursor: pointer;
  text-align: left;
  background: linear-gradient(170deg, #fffdfa 0%, #fdf6ec 54%, #fbf3ea 100%);
  border: 1px solid rgba(23, 34, 47, 0.08);
  box-shadow:
    0 2px 4px rgba(30, 34, 48, 0.04),
    0 22px 52px rgba(30, 34, 48, 0.1);
  transition:
    transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.45s ease;
}

.profile-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 4px 8px rgba(30, 34, 48, 0.05),
    0 30px 64px rgba(45, 35, 48, 0.16);
}

/* 沿边框流动的马卡龙光环 */
.profile-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(
    from var(--profile-angle),
    rgba(255, 127, 168, 0.75),
    rgba(255, 214, 166, 0.55),
    rgba(88, 216, 178, 0.6),
    rgba(160, 140, 255, 0.65),
    rgba(111, 197, 255, 0.55),
    rgba(255, 127, 168, 0.75)
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  opacity: 0.6;
  animation: profile-border-spin 14s linear infinite;
  pointer-events: none;
}

.profile-card > * {
  position: relative;
  z-index: 1;
}

/* 背景浮世绘纹理 */
.profile-art {
  position: absolute;
  z-index: 0;
  top: -24px;
  right: -34px;
  width: 280px;
  height: 230px;
  background-image: v-bind(profileArt);
  background-size: cover;
  background-position: 50% 18%;
  opacity: 0.16;
  filter: saturate(0.9);
  mask-image: radial-gradient(90% 80% at 78% 18%, #000 0%, transparent 72%);
  -webkit-mask-image: radial-gradient(90% 80% at 78% 18%, #000 0%, transparent 72%);
  pointer-events: none;
}

.profile-glow {
  position: absolute;
  z-index: 0;
  right: -70px;
  bottom: -90px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 190, 214, 0.34), rgba(255, 190, 214, 0) 66%);
  pointer-events: none;
}

/* ---------- 头部 ---------- */
.profile-head {
  display: flex;
  align-items: center;
  gap: 15px;
  padding-right: 26px;
}

.avatar-ring {
  position: relative;
  width: 82px;
  height: 82px;
  flex: 0 0 82px;
  border-radius: 50%;
  padding: 3px;
  background: conic-gradient(
    from var(--ring-angle),
    #ffb6c9,
    #ffe3c9,
    #a7f3d0,
    #c7b6ff,
    #9ad7ff,
    #ffb6c9
  );
  box-shadow: 0 10px 24px rgba(60, 40, 60, 0.16);
  animation: avatar-ring-turn 18s linear infinite;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: #fdf9f2;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.9);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.head-copy {
  min-width: 0;
  flex: 1;
}

.profile-kicker {
  margin: 0 0 4px;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a95a6;
}

.name {
  margin: 0;
  font-size: 1.86rem;
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: 0.04em;
  color: #17222f;
}

:global(html[lang='en'] .profile-kicker) {
  letter-spacing: 0.12em;
}

:global(html[lang='en'] #home-profile-card .name) {
  font-size: 1.36rem;
  letter-spacing: 0.02em;
}

.school {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 7px 0 0;
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  color: #59657a;
}

.school-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7fa8, #58d8b2);
  flex: 0 0 auto;
}

/* ---------- 信息行 ---------- */
.spec-list {
  border-top: 1px solid rgba(23, 34, 47, 0.08);
  border-bottom: 1px solid rgba(23, 34, 47, 0.08);
  padding: 6px 0;
}

.spec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 2px;
}

.spec-label {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  color: #7b8698;
}

.spec-label i {
  width: 16px;
  font-size: 0.72rem;
  color: #b192a1;
}

.spec-value {
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #2c3a4a;
}

/* ---------- 专业 ---------- */
.major-card {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 14px;
  border-radius: 16px;
  background:
    linear-gradient(120deg, rgba(255, 214, 232, 0.42), rgba(255, 250, 240, 0.7) 52%, rgba(205, 246, 233, 0.42));
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.major-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8c3b5e;
  background: rgba(255, 253, 248, 0.82);
  box-shadow: 0 4px 12px rgba(45, 35, 48, 0.08);
}

.major-icon svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
}

.major-label {
  margin: 0;
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  color: #8a7582;
}

.major-value {
  margin: 2px 0 0;
  font-size: 1.02rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #17222f;
}

/* ---------- 统计 ---------- */
.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 9px 4px 7px;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: background 0.3s ease;
}

.stat:hover {
  background: rgba(255, 214, 232, 0.28);
}

.stat + .stat {
  border-left: 1px solid rgba(23, 34, 47, 0.08);
}

.stat-num {
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: #17222f;
  font-variant-numeric: tabular-nums;
}

.stat:nth-child(2) .stat-num {
  color: #9c3460;
}

.stat:nth-child(3) .stat-num {
  color: #1b7a66;
}

.stat-label {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: #7b8698;
}

/* ---------- 兴趣 / 联系方式 ---------- */
.meta-block {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.meta-label {
  margin: 0;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #8a95a6;
}

.interests {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.interest {
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  color: #38465a;
  background: rgba(255, 253, 248, 0.86);
  border: 1px solid rgba(23, 34, 47, 0.07);
  transition:
    transform 0.28s ease,
    background 0.28s ease,
    color 0.28s ease;
}

.interest--0 {
  background: rgba(255, 226, 235, 0.72);
  color: #8c2f53;
}

.interest--1 {
  background: rgba(214, 248, 236, 0.76);
  color: #1b6a58;
}

.interest--2 {
  background: rgba(255, 240, 214, 0.8);
  color: #835310;
}

.interest--3 {
  background: rgba(224, 220, 255, 0.72);
  color: #5847a8;
}

.profile-card:hover .interest {
  transform: translateY(-2px);
}

.contact-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.contact-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 54px;
  padding: 8px 4px;
  border-radius: 12px;
  border: 1px solid rgba(23, 34, 47, 0.08);
  background: rgba(255, 253, 248, 0.8);
  color: #3d4b5d;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.66rem;
  letter-spacing: 0.04em;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 0.3s ease,
    background 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}

.contact-card i {
  font-size: 1rem;
  color: #25405b;
}

.contact-card:nth-child(2) i {
  color: #1b8d63;
}

.contact-card:nth-child(3) i {
  color: #5b63c8;
}

.contact-card:hover {
  transform: translateY(-3px);
  background: #fffdf8;
  border-color: rgba(200, 64, 112, 0.22);
  color: #17222f;
  box-shadow: 0 10px 22px rgba(45, 35, 48, 0.12);
}

/* ---------- 复制提示 ---------- */
.contact-copy-toast {
  position: fixed;
  top: calc(60px + 16px);
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  z-index: 2100;
  padding: 11px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: linear-gradient(135deg, rgba(255, 214, 232, 0.96), rgba(232, 250, 244, 0.96), rgba(219, 228, 255, 0.96));
  box-shadow: 0 16px 36px rgba(44, 62, 80, 0.18);
  color: #17222f;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.26s ease,
    transform 0.26s cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0.26s ease;
}

.contact-copy-toast.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

/* ================= 动效 ================= */
@keyframes profile-border-spin {
  to {
    --profile-angle: 360deg;
  }
}

@keyframes avatar-ring-turn {
  from {
    --ring-angle: 0deg;
  }
  to {
    --ring-angle: 360deg;
  }
}

/* ================= 响应式 ================= */
@media (max-width: 1100px) {
  .profile-card {
    padding: 21px 21px 19px;
    gap: 16px;
  }

  .profile-head {
    gap: 12px;
    padding-right: 22px;
  }

  .avatar-ring {
    width: 74px;
    height: 74px;
    flex-basis: 74px;
  }

  .name {
    font-size: 1.66rem;
  }
}

@media (max-width: 900px) {
  .profile-card {
    position: relative;
    top: 0;
  }
}

@media (max-width: 720px) {
  .profile-card {
    padding: 16px 16px 15px;
    border-radius: 24px;
    gap: 11px;
  }

  .profile-card:hover {
    transform: none;
  }

  .profile-card::before {
    animation: none;
  }

  /* 移动端压缩名片：年级/学历已包含在 kicker 中，不再重复占两行 */
  .spec-list {
    display: none;
  }

  .profile-head {
    gap: 11px;
    padding-right: 18px;
  }

  .avatar-ring {
    width: 60px;
    height: 60px;
    flex-basis: 60px;
  }

  .name {
    font-size: 1.4rem;
  }

  .profile-kicker {
    font-size: 0.53rem;
  }

  .school {
    font-size: 0.66rem;
  }

  .major-card {
    padding: 8px 10px;
    gap: 8px;
    border-radius: 14px;
  }

  .major-icon {
    width: 30px;
    height: 30px;
    flex-basis: 30px;
  }

  .major-label {
    font-size: 0.5rem;
    letter-spacing: 0.16em;
  }

  .major-value {
    font-size: 0.82rem;
  }

  .stats {
    padding: 0;
  }

  .stat-num {
    font-size: 1.2rem;
  }

  .stat-label {
    font-size: 0.5rem;
    letter-spacing: 0.08em;
  }

  .meta-block {
    gap: 6px;
  }

  .meta-label {
    font-size: 0.52rem;
    letter-spacing: 0.14em;
  }

  .interests {
    gap: 5px;
  }

  .interest {
    padding: 5px 9px;
    font-size: 0.58rem;
  }

  .contact-row {
    gap: 5px;
  }

  .contact-card {
    min-height: 42px;
    border-radius: 12px;
    font-size: 0.56rem;
  }

  .profile-art {
    opacity: 0.1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-card,
  .profile-card:hover,
  .profile-card::before,
  .avatar-ring,
  .interest,
  .profile-card:hover .interest,
  .contact-card {
    animation: none;
    transform: none;
    transition: none;
  }
}
</style>
