# blog-detail · 文章详情

- 路由：`/blog/:id`（name `BlogDetail`）
- 入口：`BlogDetailView.vue`
- 依赖：`blogStore`、`settingsStore`、`useMarkdown`、`useToc` 等

## 数据加载

```text
id → blogStore.getBlogById → fetch(resolveUrl(blog.contentFile))
   → useMarkdown.renderMarkdown(text, contentFile)
   → BlogContent 真实 DOM 增强
```

`contentFile` 是相对仓库根的路径（`blogs/...`），构建后需存在 `dist/blogs/`。

## 组件

| 组件 | 作用 |
| --- | --- |
| `BlogContent.vue` | 渲染 HTML 并绑定代码块 / Mermaid / 图片 / 习题 / 清单增强 |
| `TOC.vue` | 目录生成、滚动高亮、自动居中、进度条 |
| `PostNav.vue` | 上一篇 / 下一篇 / 相似文章 |
| `FloatingControls.vue` | 详情页浮动控制（沉浸、字号、导出等） |
| `ExportModal.vue` | 导出 Markdown / 文本 |
| `DisplayModal.vue` | 字号、行距等阅读参数 |

> `features/about` 复用了 `BlogContent.vue`，以保持与详情页一致的 Markdown 渲染效果。

## 设置联动

- `settingsStore.isImmersive` → 宽屏 / 沉浸阅读。
- `exerciseMode` → `.md-task` 的隐藏 / 折叠 / 练习 / 展开。
- `codeMode` → 代码块 `peek` / `collapse` / `expand`。
- 切换由 `useSettings.apply(contentEl)` 落到 DOM。

## 修改提示

- 改渲染相关逻辑前先读 `docs/架构/渲染管线.md`。
- 小节标题层级只到 `###`，目录依赖三级结构。
- 移动端改动后运行：

```bash
node scripts/verify-detail-mobile.mjs --id <文章ID>
```
