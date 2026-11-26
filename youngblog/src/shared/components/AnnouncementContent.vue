<!-- AnnouncementContent.vue - 公告结构化渲染（弹窗与公告页共用） -->
<template>
  <article ref="rootRef" class="ann-doc" :class="`ann-doc--${variant}`">
    <header class="ann-doc__head">
      <p class="ann-doc__meta">
        <span v-if="headline.series" class="ann-doc__series">{{ headline.series }}</span>
        <span v-if="headline.version" class="ann-doc__issue">NO.{{ headline.version }}</span>
      </p>
      <h2 class="ann-doc__title">
        <template v-if="headline.codename">
          <span class="ann-doc__codename">「{{ headline.codename }}」</span>
          <span v-if="headline.suffix" class="ann-doc__suffix">{{ headline.suffix }}</span>
        </template>
        <template v-else>{{ headline.title }}</template>
      </h2>
    </header>

    <div class="ann-doc__body">
      <template v-for="(block, index) in intro" :key="`intro-${index}`">
        <ul v-if="block.type === 'list'" class="ann-list">
          <li v-for="(item, itemIndex) in block.items" :key="itemIndex" class="ann-list__item">
            {{ item }}
          </li>
        </ul>
        <p v-else-if="block.type === 'group'" class="ann-doc__lead ann-doc__lead--strong">
          {{ block.title }}
        </p>
        <p v-else class="ann-doc__lead">{{ block.text }}</p>
      </template>

      <section
        v-for="(section, sectionIndex) in sections"
        :key="`section-${sectionIndex}`"
        class="ann-sec"
        :data-ann-section="sectionIndex"
      >
        <div class="ann-sec__head">
          <span class="ann-sec__index">{{ String(sectionIndex + 1).padStart(2, '0') }}</span>
          <h3 class="ann-sec__title">{{ section.title }}</h3>
          <span class="ann-sec__rule" aria-hidden="true"></span>
        </div>

        <template v-for="(block, blockIndex) in section.blocks" :key="`block-${blockIndex}`">
          <p v-if="block.type === 'group'" class="ann-sec__group">{{ block.title }}</p>
          <ul v-else-if="block.type === 'list'" class="ann-list">
            <li v-for="(item, itemIndex) in block.items" :key="itemIndex" class="ann-list__item">
              {{ item }}
            </li>
          </ul>
          <p v-else class="ann-sec__note">{{ block.text }}</p>
        </template>
      </section>

      <footer v-if="outro.length" class="ann-doc__outro">
        <p v-for="(paragraph, index) in outro" :key="`outro-${index}`" class="ann-doc__outro-line">
          {{ paragraph }}
        </p>
      </footer>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { parseAnnouncement } from '@/shared/utils/announcement'

const props = defineProps({
  /** 公告对象 `{ date, message }`，或直接传字符串 */
  announcement: { type: [Object, String], default: null },
  /** modal：弹窗主视觉；card：公告页卡片 */
  variant: { type: String, default: 'modal' },
})

const rootRef = ref(null)

const message = computed(() => {
  if (typeof props.announcement === 'string') return props.announcement
  return props.announcement?.message || ''
})

const parsed = computed(() => parseAnnouncement(message.value))
const headline = computed(() => parsed.value.headline)
const intro = computed(() => parsed.value.intro)
const sections = computed(() => parsed.value.sections)
const outro = computed(() => parsed.value.outro)

defineExpose({ rootRef })
</script>

<style scoped>
.ann-doc {
  --ann-gap: 1.15rem;
  color: var(--notice-ink);
  font-size: 1rem;
  line-height: 1.72;
}

/* ---------- 标题区 ---------- */
.ann-doc__head {
  padding: 0 0 0.9rem;
}

.ann-doc__meta {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0 0 0.45rem;
  font-family: var(--font-ui, -apple-system, 'Segoe UI', 'PingFang SC', sans-serif);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--notice-accent-deep);
}

.ann-doc__series {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.ann-doc__series::after {
  content: '';
  width: 1.5rem;
  height: 1px;
  background: var(--notice-accent-veil);
}

.ann-doc__issue {
  padding: 0.16rem 0.42rem;
  border-radius: 0.35rem;
  border: 1px solid var(--notice-accent-veil);
  background: var(--notice-accent-wash);
  letter-spacing: 0.1em;
}

.ann-doc__title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.4rem 0.55rem;
  margin: 0;
  font-size: 1.42rem;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: var(--notice-ink);
}

.ann-doc__codename {
  position: relative;
  color: var(--notice-accent-deep);
}

.ann-doc__suffix {
  font-size: 0.78em;
  font-weight: 600;
  color: var(--notice-ink-faint);
  letter-spacing: 0.04em;
}

/* ---------- 正文 ---------- */
.ann-doc__body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--ann-gap);
}

.ann-doc__lead {
  margin: 0;
  color: var(--notice-ink-soft);
}

.ann-doc__lead--strong {
  font-weight: 700;
  color: var(--notice-ink);
}

.ann-sec {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.95rem 1rem 0.85rem;
  border-radius: 0.9rem;
  border: 1px solid var(--notice-line);
  background:
    linear-gradient(180deg, var(--notice-accent-wash), transparent 42%) padding-box,
    var(--notice-paper-muted) padding-box;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;
  scroll-margin-top: 0.5rem;
}

.ann-sec__head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.ann-sec__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.3rem;
  border-radius: 0.45rem;
  background: var(--notice-accent);
  color: var(--notice-on-accent);
  font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 0.7rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  box-shadow: 0 3px 8px var(--notice-glow);
}

.ann-sec__title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--notice-ink);
}

.ann-sec__rule {
  flex: 1 1 auto;
  height: 1px;
  min-width: 1.5rem;
  background: linear-gradient(90deg, var(--notice-accent-veil), transparent);
}

.ann-sec__group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.15rem 0 0;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--notice-accent-deep);
}

.ann-sec__group::before {
  content: '';
  width: 0.2rem;
  height: 0.86rem;
  border-radius: 0.2rem;
  background: linear-gradient(180deg, var(--notice-accent), var(--notice-accent-strong));
}

.ann-sec__note {
  margin: 0;
  padding-left: 0.7rem;
  border-left: 1px dashed var(--notice-accent-veil);
  color: var(--notice-ink-soft);
  font-size: 0.9rem;
}

/* ---------- 列表 ---------- */
.ann-list {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ann-list__item {
  position: relative;
  padding: 0.32rem 0.55rem 0.32rem 1.35rem;
  border-radius: 0.55rem;
  font-size: 0.94rem;
  line-height: 1.66;
  color: var(--notice-ink);
  transition: background-color 0.18s ease, color 0.18s ease;
}

.ann-list__item::before {
  content: '';
  position: absolute;
  left: 0.52rem;
  top: 0.9em;
  width: 0.32rem;
  height: 0.32rem;
  border-radius: 0.1rem;
  transform: rotate(45deg);
  background: var(--notice-accent);
  transition: background-color 0.18s ease, transform 0.18s ease;
}

.ann-list__item:hover {
  background: var(--notice-accent-wash);
}

.ann-list__item:hover::before {
  background: var(--notice-accent-strong);
  transform: rotate(45deg) scale(1.12);
}

/* ---------- 文末寄语 ---------- */
.ann-doc__outro {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.15rem;
  padding: 0.85rem 1rem;
  border-radius: 0.9rem;
  border: 1px dashed var(--notice-line-strong);
  background: var(--notice-paper-muted);
}

.ann-doc__outro-line {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.68;
  color: var(--notice-ink-soft);
}

/* ---------- 变体：公告页卡片 ---------- */
.ann-doc--card {
  --ann-gap: 0.9rem;
  font-size: 0.95rem;
}

.ann-doc--card .ann-doc__title {
  font-size: 1.16rem;
}

.ann-doc--card .ann-sec {
  padding: 0.8rem 0.85rem 0.7rem;
  border-radius: 0.75rem;
}

.ann-doc--card .ann-sec__index {
  min-width: 1.35rem;
  height: 1.35rem;
  font-size: 0.66rem;
}

.ann-doc--card .ann-list__item {
  font-size: 0.9rem;
}

@media (max-width: 720px) {
  .ann-doc__title {
    font-size: 1.24rem;
  }

  .ann-list__item {
    padding: 0.28rem 0.4rem 0.28rem 1.2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ann-list__item,
  .ann-list__item::before {
    transition: none;
  }
}
</style>
