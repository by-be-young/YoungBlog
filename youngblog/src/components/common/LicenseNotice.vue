<template>
  <section class="license-notice">
    <p>
      本博客所有文章除特别声明外，均采用
      <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0 许可协议</a>。
      转载请注明来源 BeYoung~
    </p>
    <p class="license-blog-link-line">
      <span class="license-label">博客链接</span>
      <a :href="permalink" target="_blank" rel="noopener">{{ permalink }}</a>
    </p>
  </section>
</template>

<script setup>
defineProps({
  permalink: String
})
</script>

<style scoped>
.license-notice {
  margin-top: 28px;
  padding: 16px 18px;
  border: 1px solid #e7eefc;
  border-radius: 12px;
  background: linear-gradient(140deg, rgba(244, 250, 255, 0.96) 0%, rgba(252, 247, 255, 0.96) 100%);
  box-shadow: 0 8px 24px rgba(68, 120, 214, 0.08);
  color: #5f5a67;
  font-size: 0.98rem;
  line-height: 1.8;
}
.license-notice p {
  margin: 0;
}
.license-blog-link-line {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.license-label {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background: #edf3ff;
  color: #5676ba;
  font-size: 0.9rem;
  line-height: 1.5;
}
.license-notice a {
  color: #6b8ecf;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.license-notice a:hover {
  color: #4f76bf;
}
</style>