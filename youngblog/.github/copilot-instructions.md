# Copilot 指令

本仓库是 Vue 3 + Vite 8 的纯静态博客。完整约束见根目录 `AGENTS.md`。

## 生成代码时

- 使用 `<script setup>`、组合式 API、Pinia Setup Store。
- 2 空格缩进、单引号、无分号、行宽 100。
- 导入使用 `@/` 别名；同级文件才用 `./`。
- 视图命名 `XxxView.vue`；组件 PascalCase；composable `useXxx.js`。
- 用户可见文案走 `i18nStore`，并同时补 `zh` / `en` / `ja`。
- 样式写在 `<style scoped>`，不新增全局选择器。
- 资源路径必须经 `resolveUrl`，不要写死 `/assets/...`。
- 组件卸载时清理定时器与事件监听。

## 不要

- 不要修改 `public/data/blogs.json` / `series.json`（构建生成）。
- 不要移动或重命名 `blogs/` 下文章（会产生新 ID）。
- 不要在 `blogs/` 根目录新建 `.md`。
- 不要改 `dist/`、`node_modules/`。
- 不要把 Hash 路由改成 History 路由。
- 不要调整 `src/main.js` 的 CSS 导入顺序。
- 不要批量格式化无关文件。

## 目录

- `src/features/<feature>/`：页面与该页面私有组件。
- `src/shared/{components,layout,composables,stores,utils}/`：跨页面复用。
- `scripts/`：Node 脚本；新增脚本后同步 `docs/参考/脚本参考.md`。

## 文档

- 描述性文档使用中文文件名，索引在 `docs/文档索引.md`。
- 结构或行为变化时同步 `docs/架构/模块地图.md` 与 `AGENTS.md`。
- 修改前先读 `docs/运维/已知行为与陷阱.md`。
