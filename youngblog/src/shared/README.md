# shared 共享层

跨功能域复用的组件、布局、行为、状态与工具。**不得**导入 `src/features/` 下的任何文件。

## 子目录

| 目录 | 内容 | README |
| --- | --- | --- |
| `components/` | 全局弹窗与通用 UI | [components/README.md](components/README.md) |
| `layout/` | 导航栏与页脚 | [layout/README.md](layout/README.md) |
| `composables/` | 可复用行为（渲染、目录、加载器…） | [composables/README.md](composables/README.md) |
| `stores/` | Pinia 全局状态 | [stores/README.md](stores/README.md) |
| `utils/` | 纯函数与轻量封装 | [utils/README.md](utils/README.md) |

## 放进来之前的判断

1. 是否**两个及以上**功能域会用到？否 → 留在功能域。
2. 是否只是视觉相似？是 → 先抽象 props，而不是复制组件。
3. 是否依赖具体路由或页面？是 → 不适合放 `shared`。

## 依赖规则

```text
shared/components  → shared/composables / shared/stores / shared/utils
shared/layout      → shared/components / stores / utils
shared/composables → shared/stores / shared/utils
shared/stores      → shared/composables / shared/utils
shared/utils       → 无内部依赖
```

`shared/utils` 必须是纯函数，不访问 Store、DOM 或网络。
