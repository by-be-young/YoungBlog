# shared/stores

Pinia Setup Store。仅负责状态与数据获取，不做 DOM 操作。

| Store | 职责 | 持久化 |
| --- | --- | --- |
| `blogStore.js` | 文章索引、派生列表、按 ID / 系列查询 | 内存缓存 |
| `i18nStore.js` | 三语词典、当前语言、`t()` | `site_language` |
| `settingsStore.js` | 沉浸 / 宽屏、习题模式、代码块模式 | 无 |
| `musicStore.js` | 音频实例、曲目、播放状态、音量 | 无 |
| `backgroundStore.js` | 背景图列表与索引 | 无 |
| `counter.js` | 模板遗留计数器 | 无（未被页面使用） |

## 约定

- Setup Store，显式返回 state / getters / actions。
- 网络请求集中在 Store 或 `useEntryLoader`；组件不直接拉站点数据
  （详情页与 about 的 Markdown 文本除外）。
- 失败时回退到安全默认值（`blogStore` 回退空数组）。
- 新增持久化键必须带 `yb-` / `site_` 前缀，并登记到
  `docs/架构/状态管理.md`。
- 跨 Store 只读依赖，避免循环。

详细说明见 `docs/架构/状态管理.md`。
