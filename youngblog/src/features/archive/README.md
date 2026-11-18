# archive · 归档

- 路由：`/archive`（name `Archive`）
- 入口：`ArchiveView.vue`
- 依赖：`blogStore`、`i18nStore`

## 功能

- 按年 / 月组织的时间轴归档。
- 顶部筛选：学习 / 全部 / 娱乐，对应 `archive_filter_*` 文案键。
- 月份折叠、当前定位（`locate_today`）、年份视图切换。
- 背景在 `App.vue` 中被标记为 `is-frosted`（毛玻璃）。
- 页面会显示萤火虫（路由名在 `showFireflies` 列表中）。

## 数据

全部来自 `blogStore.blogs`，按 `date` 倒序；不额外请求数据文件。

## 修改提示

- 时间轴布局复杂，样式集中在视图的 `scoped` 中，改动前先确认移动端断点。
- 学习 / 娱乐判定复用 `blogStore.getCategoryKey`，不要另写一套规则。
