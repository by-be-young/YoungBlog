# shared/utils

纯函数工具，不依赖 Store、DOM 或网络。

| 文件 | 导出 | 说明 |
| --- | --- | --- |
| `url.js` | `resolveUrl(path)` | 拼接 `BASE_URL`，跳过外链 / data / blob |
| `highlight.js` | 默认导出 hljs | 配置 highlight.js 的语言与别名 |

## `resolveUrl` 规则

```js
resolveUrl('/data/blogs.json') // → /BASE/data/blogs.json
resolveUrl('blogs/a.md')       // → /BASE/blogs/a.md
resolveUrl('https://x.com')    // → 原样返回
```

- 所有运行时资源请求都必须经过它，否则子路径部署会 404。
- 不要手写 `import.meta.env.BASE_URL` 拼接。
- 传入带前导 `/` 或不带都可以，函数会归一化。

## 约定

- 新工具函数必须是纯函数，并补 JSDoc。
- 不在这里放业务规则（如分类判定、系列排序）。
- 不新增全局单例或可变状态。
