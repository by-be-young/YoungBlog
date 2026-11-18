# about · 关于

- 路由：`/about`（name `About`）
- 入口：`AboutView.vue`
- 依赖：`i18nStore`、`blogStore`、`useMarkdown`、`BlogContent`

## 内容加载

按当前语言依次尝试：

```text
/data/about.<lang>.md
/data/about.<lang>.markdown
/data/about.md.<lang>
/data/about.md
```

任一命中即渲染；全部失败时显示「内容加载失败」。因此新增语言只需要提供
`public/data/about.<lang>.md`，无需改代码。

## 其他行为

- 复用 `features/blog-detail/components/BlogContent.vue` 渲染，保持与文章一致的排版与增强。
- 统计全站字数：遍历 `blogStore.blogs` 的 `contentFile` 拉取正文并粗略计数。
- 展示资料卡信息（学校、专业、兴趣等），文案在 `i18nStore`。

## 修改提示

- 关于页属于内容页，改文案优先改 `public/data/about.*.md`，不要写进组件。
- 复用 `BlogContent` 是唯一允许的跨功能域引用；若新增第二处复用，考虑上移到 `shared`。
