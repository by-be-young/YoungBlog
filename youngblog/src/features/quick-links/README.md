# quick-links · 快捷链接

- 路由：`/quick-links`（name `QuickLinks`）
- 入口：`QuickLinksView.vue`
- 数据：`public/data/quick-links.json`

## 数据

```json
{
  "categories": [
    { "key": "friends", "label": "友链", "items": [{ "title": "", "url": "", "image": "" }] }
  ]
}
```

现有分类：`friends`、`Beihang`、`personal`、`Study`、`fun`、`ai`。

## 交互

| 元素 | 作用 |
| --- | --- |
| 分类滚轮 | 左侧（桌面）/ 弹窗内（移动端）的类别选择 |
| 链接网格 | 卡片列表，图片 + 标题 + 域名 |
| 移动端弹窗 | 小屏下用浮动按钮打开分类选择 |
| 过渡动画 | 卡片进出场的渐入 / 错位效果 |

请求使用 `cache: 'no-store'`，避免更新友链后仍看到旧数据。

## 修改提示

- 新增分类只需改 JSON，并在 `i18nStore` 中补对应的展示文案（如需）。
- 外链必须带 `rel="noopener noreferrer"`。
- 卡片图片建议使用 WebP 并放在 `public/assets/images/快速链接/`。
