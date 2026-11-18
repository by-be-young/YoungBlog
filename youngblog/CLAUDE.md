# CLAUDE.md

本文件面向 Claude Code。完整规则以 [AGENTS.md](AGENTS.md) 为准，本文件只列高频要点。

## 项目

YoungBlog：Vue 3 + Vite 8 + Pinia 的纯静态博客。文章在 `blogs/`，源码在 `src/`，
构建脚本在 `scripts/`。Node `^22.18.0 || >=24.12.0`，使用 npm。

## 常用命令

```bash
npm run dev
node scripts/generate.js
npm run build
npm run build:github
npm run lint
node scripts/check-docs.mjs
```

## 必须遵守

- 不手改 `public/data/blogs.json` / `series.json`（生成产物）。
- 不移动 `blogs/` 下已发布文章（会换 ID、断链）。
- 不在 `blogs/` 根建 `.md`（会被当文章收录），草稿放 `blogs/模板/`。
- 不改 `dist/`、`node_modules/`。
- 保持 Hash 路由与 `resolveUrl` 的资源路径写法。
- 不改 `src/main.js` 的 CSS 导入顺序。
- 用户可见文案补齐 `zh` / `en` / `ja`。
- 不批量格式化无关文件。

## 结构

`src/app`（壳）→ `src/features/*`（功能域）→ `src/shared/*`（共享）。
`shared` 不得依赖 `features`，`features` 之间不得互相导入视图。

## 改之前先读

- 任务对应文档：`docs/智能协作/上下文地图.md`
- 已知陷阱：`docs/运维/已知行为与陷阱.md`
- 编码规范：`docs/质量/编码规范.md`

## 交付

运行 `npm run lint` 与 `npm run build`，检查 `git status`。
汇报改动、验证结果与未验证项；不要把推测写成事实。
