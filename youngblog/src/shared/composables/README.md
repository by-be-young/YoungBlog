# shared/composables

可复用的行为逻辑。除 `useSeries` 等纯计算外，多数会操作 DOM，因此必须在组件卸载时清理。

| 文件 | 职责 | 副作用 |
| --- | --- | --- |
| `useMarkdown.js` | Markdown 预处理、渲染、资源重写、内部引用 | 创建临时 DOM；动态导入 marked / katex |
| `useToc.js` | 目录构建、滚动高亮、自动居中、进度 | 监听滚动与 resize |
| `useCodeBlock.js` | 行号、复制、折叠 / 展开 | 绑定按钮事件 |
| `useAnswer.js` | 选项选择、提交、对错反馈、统计 | 绑定点击与键盘事件 |
| `useChecklist.js` | 任务清单交互、进度条、localStorage 持久化 | 读写 `yb-checklist:*` |
| `useMermaid.js` | Mermaid 动态加载、渲染、全屏查看 | 动态导入 mermaid |
| `useImageViewer.js` | 图片全屏、缩放、拖拽、切换、下载 | 创建 overlay DOM |
| `useEntryLoader.js` | 入场阶段权重、图片预载、默认背景图 | 网络请求、rAF 进度 |
| `useSettings.js` | 把 Store 设置应用到文章 DOM | 修改类名与样式 |
| `useSeries.js` | 从 `blogStore` 派生系列 / 章节结构 | 无（纯计算） |

## 约定

- 命名 `useXxx`，返回对象。
- 依赖 Store 时在函数内部获取（Pinia 已初始化后再调用）。
- 不定义全局单例状态；共享状态放 `shared/stores/`。
- 需要清理的逻辑提供 `destroy` / `dispose`，或在内部注册 `onUnmounted`。
- 新增 composable 后更新本表与 `docs/架构/状态管理.md`（如涉及状态）。
