# series · 系列

- 路由：`/series`（name `Series`）
- 入口：`SeriesView.vue`
- 依赖：`useSeries`、`blogStore`、`i18nStore`

## 数据来源

系列结构由 `useSeries` 从 `blogStore.blogs` 派生，**不读取** `public/data/series.json`。
`series.json` 只在入场加载器中被预取，修改它不会改变系列页展示。

派生内容：

```text
系列 → 章节（chapter）→ 各节（文章）
```

- 有 `chapter` 的文章排在无章节文章之前，按章节序号升序。
- 无章节时按 `order` 升序，再按日期倒序。
- 系列按文章数降序、标题排序。

## 布局

| 区域 | 说明 |
| --- | --- |
| 主区域 | 陈列所选章节下的各节 |
| 右侧面板 | 封面与章节选择，滑出式 |
| 底部 | 横向时间轴，长系列可横向翻阅 |
| 未分章 | 直接按节陈列，不出现空章占位 |

## 修改提示

- 排序逻辑集中在 `useSeries`，视图只做展示，不要在视图里重排。
- 章节标题为空时按语言显示「未分章」文案。
- 背景在 `App.vue` 中被标记为 `is-series`（强蒙版），并显示萤火虫。
