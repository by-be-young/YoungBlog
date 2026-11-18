# features 功能域

每个子目录是一个独立页面（或一组紧密相关的页面），拥有自己的视图与私有组件。
跨域复用一律下沉到 `src/shared/`。

## 目录约定

```text
features/<feature>/
├── <Feature>View.vue     路由入口
├── components/           仅该页面使用的组件
└── README.md             职责、入口、依赖与关键行为
```

## 功能域一览

| 目录 | 路由 | 入口 | 说明 |
| --- | --- | --- | --- |
| `home` | `/` | `HomeView.vue` | 首页：Hero、资料卡、推荐、最近更新、卡片墙 |
| `blog-detail` | `/blog/:id` | `BlogDetailView.vue` | 文章阅读：目录、正文增强、导出、沉浸模式 |
| `archive` | `/archive` | `ArchiveView.vue` | 时间轴归档与学习 / 娱乐筛选 |
| `categories` | `/categories` | `CategoriesView.vue` | 领域 / 科目 / 主题三级筛选（卡片堆 + 云图） |
| `series` | `/series` | `SeriesView.vue` | 系列与章节陈列、右侧面板 |
| `about` | `/about` | `AboutView.vue` | 关于页，按语言加载 Markdown |
| `announcements` | `/announcements` | `AnnouncementsView.vue` | 公告列表 |
| `quick-links` | `/quick-links` | `QuickLinksView.vue` | 友链 / 工具卡片与分类滚轮 |

## 新增功能域

1. 建目录、视图与 `README.md`。
2. 在 `src/router/index.js` 注册路由（`meta.title` 必须填写）。
3. 在 `src/shared/stores/i18nStore.js` 补 `zh` / `en` / `ja`。
4. 如需导航入口，改 `src/shared/layout/AppNavbar.vue`。
5. 更新 `docs/架构/模块地图.md` 与 `docs/文档索引.md`（如新增文档）。

## 禁止

- 在 `features` 之间互相导入视图。
- 把页面私有组件提前放进 `shared`。
- 在视图里直接发站点数据请求（详情页 Markdown 与 about 除外）。
- 复制一套新的全局 CSS。
