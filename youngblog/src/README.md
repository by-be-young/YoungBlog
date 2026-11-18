# src 源码说明

Vue 3 应用源码。按「应用壳 → 功能域 → 共享层」组织，依赖只能自上而下。

## 目录

```text
src/
├── main.js         入口：Pinia、Router、全局样式
├── app/            应用壳 App.vue（背景轮播、导航、全局弹窗、路由状态）
├── router/         路由表与标题守卫
├── assets/         参与构建的字体与全局样式
├── features/       功能域：每个页面及其私有组件
└── shared/         跨功能复用：组件、布局、组合式函数、Store、工具
```

## 依赖规则

```text
app → features → shared
```

- `features` 可以依赖 `shared`。
- `shared` 不得依赖 `features`。
- `features` 之间不得互相导入视图。
  唯一例外：`features/about` 复用 `features/blog-detail/components/BlogContent.vue`，
  以保证 Markdown 渲染结果一致；出现第三处复用时必须上移到 `shared`。

## 导入

- 跨目录统一使用 `@/` 别名（指向 `src/`）。
- 同级文件才使用 `./`。
- 动态导入（`import('mermaid')` 等）用于大库拆包，不是懒加载业务组件的手段。

## 样式入口

`main.js` 的导入顺序决定层叠结果：

```text
base.css → FontAwesome → global.css → butterfly.css → responsive.css → search.css → hljs → katex
```

新增全局样式必须在此登记，并说明为什么不能放在组件 `scoped` 中。

## 新增代码放哪里

| 内容 | 位置 |
| --- | --- |
| 新页面 | `features/<name>/<Name>View.vue` |
| 页面私有组件 | `features/<name>/components/` |
| 跨页面组件 | `shared/components/` |
| 导航 / 页脚 | `shared/layout/` |
| 可复用行为 | `shared/composables/useXxx.js` |
| 全局状态 | `shared/stores/xxxStore.js` |
| 纯函数 | `shared/utils/` |
| 字体 / 全局样式 | `assets/` |

完整步骤见 `docs/指南/新增页面或功能.md`。
