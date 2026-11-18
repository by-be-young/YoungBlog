# home · 首页

- 路由：`/`（name `Home`）
- 入口：`HomeView.vue`
- 依赖：`blogStore`、`i18nStore`、`resolveUrl`、`ProfileCard` 等

## 页面结构

| 区域 | 组件 | 说明 |
| --- | --- | --- |
| Hero | 视图内模板 | 欢迎语 `welcome_text`、地点文案、向下箭头 |
| 侧栏 | `ProfileCard.vue` | 头像、简介、社交链接、全站字数 |
| 最近更新 | `RecentUpdatesCard.vue` | 学习 / 娱乐各最新一篇 |
| 推荐 | 视图内模板 | `recommendedBlogs` |
| 文章墙 | `BlogCard.vue` / `BlogPlaceholder.vue` | 按分类分组，空位用占位卡 |
| 门帘 | `shared/components/EntrySplash.vue` | 全局组件，在 `App.vue` 挂载 |

## 关键行为

- `App.vue` 在路由名为 `home` 时给 `body` 加 `home` 类，首页的侧栏与栅格依赖它。
- 页面依赖 `blogStore.fetchBlogs()`，数据未就绪时展示占位。
- 分类顺序与文案由 `i18nStore` 的 `home_category_*` 控制。

## 修改提示

- 新增首页卡片时优先复用 `BlogCard` 的视觉语言。
- 不要在这里直接 `fetch` 文章数据，统一走 `blogStore`。
- 移动端侧栏隐藏由 `responsive.css` 控制，改断点需全局评估。
