# shared/layout

站点级布局组件，只被 `App.vue` 使用。

| 组件 | 职责 |
| --- | --- |
| `AppNavbar.vue` | 品牌、导航菜单、搜索入口、语言切换、移动端抽屉 |
| `AppFooter.vue` | 版权、友链入口、全站字数、可选访问量（`stats.json`） |

## 约定

- 导航项数组同时驱动桌面菜单与移动抽屉，新增页面只改一处。
- 导航项需要 `path`、`key`（对应 `i18nStore` 键）与 FontAwesome `icon`。
- 页脚读取 `stats.json` 失败时静默隐藏，不显示错误。
- 布局组件不承载页面业务，不直接渲染文章内容。

## 移动端

- 导航在 ≤1100px 转为抽屉；首页侧栏在同一断点隐藏。
- 底部安全区使用 `env(safe-area-inset-bottom)`，修改浮动控件时注意遮挡关系。
