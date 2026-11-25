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
  border: 1px solid rgba(136, 187, 167, 0.24);
  border-radius: 14px;
  background: linear-gradient(140deg, rgba(255, 252, 246, 0.96) 0%, rgba(247, 251, 248, 0.94) 100%);
  box-shadow: 0 10px 26px rgba(47, 62, 69, 0.05);
  color: #5f665f;
  font-size: 0.98rem;
  line-height: 1.8;
}
.license-notice p {
  margin: 0;
  overflow-wrap: anywhere;
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
  background: rgba(183, 209, 195, 0.22);
  color: #376657;
  font-size: 0.9rem;
  line-height: 1.5;
}
.license-notice a {
  color: #6b8a74;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: rgba(136, 187, 167, 0.5);
  text-underline-offset: 2px;
  word-break: break-all;
}
.license-notice a:hover {
  color: #376657;
}
</style>