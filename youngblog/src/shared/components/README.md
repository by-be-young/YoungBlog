# shared/components

跨功能域使用的全局组件。它们不应依赖具体路由或页面状态。

| 组件 | 用途 | 使用位置 |
| --- | --- | --- |
| `EntrySplash.vue` | 入场加载屏，阶段权重进度、揭幕与退场 | `App.vue`（Teleport 到 body） |
| `SearchPanel.vue` | 全站搜索：标题 / 正文、键盘导航、高亮 | `App.vue` |
| `SettingsModal.vue` | 语言、音乐、习题模式、代码块模式 | `App.vue` |
| `AnnouncementModal.vue` | 首次进入的公告弹窗 | `App.vue` |
| `FloatingControls.vue` | 全局浮动按钮（设置 / 公告 / 音乐） | `App.vue` |
| `Fireflies.vue` | 归档 / 分类 / 系列 / 快捷链接页的萤火虫装饰 | `App.vue` |
| `LicenseNotice.vue` | 文章底部版权说明 | `BlogDetailView.vue` |

## 约定

- 组件通过 props / emits 与外部交互，不直接读取路由参数。
- 弹窗类组件必须支持 Esc 关闭，并在关闭后归还焦点。
- 新增全局组件前，先确认是否真的跨两个以上功能域使用。
- 纯装饰组件（如 `Fireflies`）应设置 `aria-hidden="true"`。

## 注意

`features/blog-detail/components/FloatingControls.vue` 与本目录的 `FloatingControls.vue`
是两个不同组件：前者只服务详情页的阅读控制，后者是全局悬浮入口。
