# AGENTS.md

本文件是本仓库 AI Agent 的**唯一事实来源**。`CLAUDE.md`、Copilot 指令与 Cursor 规则只做摘要，
如有冲突，以本文件为准。

## 1. 仓库是什么

YoungBlog（站点名「白恙的逃避行」）：纯静态个人博客。
Markdown 文章存放在 `blogs/`，Vue 3 应用在 `src/`，构建脚本在 `scripts/`。
没有后端、没有数据库、没有账号系统。

## 2. 快速事实

| 项 | 值 |
| --- | --- |
| 框架 | Vue 3 `<script setup>` + Vue Router（Hash）+ Pinia |
| 构建 | Vite 8，入口 `src/main.js`，产物 `dist/` |
| Node | `^22.18.0 || >=24.12.0` |
| 包管理 | npm（使用 `package-lock.json`） |
| 内容 | `blogs/**/*.md`，frontmatter + 目录即分类 |
| 生成数据 | `public/data/blogs.json`、`series.json` 等（**构建产物**） |
| 部署 | GitHub Pages `/YoungBlog/` 或自建服务器 `/` |

## 3. 命令

```bash
npm ci                  # 安装
npm run dev             # 开发（不生成数据）
node scripts/generate.js  # 仅重建内容索引
npm run build           # generate + vite build + postbuild
npm run build:github    # 子路径构建
npm run lint            # oxlint + eslint（带 --fix）
npm run format          # prettier（仅 src/）
node scripts/preview-server.mjs        # dist + 根目录静态预览
node scripts/check-docs.mjs            # 文档链接检查
node scripts/verify-detail-mobile.mjs --id <id>  # 移动端几何断言
```

## 4. 硬性约束

违反以下任一项都可能改变线上行为或破坏旧链接。

1. **不手工编辑生成数据**：`public/data/blogs.json`、`series.json`、`background-images.json`
   由 `scripts/generate.js` 生成，下一次构建会覆盖。
2. **不移动 / 重命名 `blogs/` 下已发布文章**：自动 ID 是 `contentFile` 路径的哈希，
   移动会换 ID 并让 `/blog/<id>` 链接失效。如确需移动，先确认链接影响。
3. **不在 `blogs/` 根目录创建 `.md`**：任何 `.md` 都会被当作文章收录；
   草稿放 `blogs/模板/`（构建跳过）。
4. **不把 `blogs/` 移出仓库根**：`postbuild.js` 与运行时 `fetch(contentFile)` 都依赖该路径。
5. **不修改 `dist/` 与 `node_modules/`**：产物与依赖由命令重建。
6. **不改变 Hash 路由**：静态托管没有 404 回退，换成 History 会白屏。
7. **不硬编码资源绝对路径**：所有请求必须经 `src/shared/utils/url.js` 的 `resolveUrl`，
   否则子路径部署 404。
8. **不调整 `src/main.js` 的 CSS 导入顺序**：层叠结果依赖它。
9. **不引入会改变首屏体积的新依赖**（尤其同步导入的大库）；确需新增时说明体积与替代方案。
10. **不批量格式化无关文件**：`npm run lint` 会 `--fix`，提交前检查 diff。

## 5. 目录职责

```text
src/
├── app/App.vue        壳层：轮播、导航、全局弹窗、路由状态
├── router/            路由表与标题守卫
├── assets/            字体与全局样式
├── features/          功能域（视图 + 私有组件）
│   ├── home / blog-detail / archive / categories
│   └── series / about / announcements / quick-links
└── shared/            跨域复用
    ├── components / layout
    ├── composables / stores
    └── utils
```

依赖方向：`app → features → shared`。`shared` 不得依赖 `features`；
`features` 之间不得互相导入视图（`about` 复用 `blog-detail/BlogContent.vue` 是唯一例外）。

判断归属：只有一个功能域使用 → 留在该域；两个及以上 → 上移到 `shared`。

## 6. 数据流（必须理解）

```text
blogs/**.md
  → scripts/generate.js 解析 frontmatter、目录标签、系列
  → public/data/blogs.json
  → vite build 复制 public/ 到 dist/
  → postbuild.js 复制 blogs/ 到 dist/blogs/
  → 运行时 blogStore.fetchBlogs() + 详情页 fetch(contentFile)
```

完整规则：`docs/架构/数据流.md`。

## 7. 关键文件

| 文件 | 说明 |
| --- | --- |
| `scripts/generate.js` | 内容索引、ID、日期、系列排序的唯一实现 |
| `scripts/postbuild.js` | 复制 `blogs/`，漏掉会导致详情页 404 |
| `src/shared/stores/blogStore.js` | 站点唯一数据入口 |
| `src/shared/composables/useMarkdown.js` | Markdown 扩展语法唯一入口 |
| `src/shared/composables/useToc.js` | 目录与滚动同步 |
| `src/app/App.vue` | 背景、路由类名、音频初始化 |
| `src/shared/utils/url.js` | base 前缀拼接 |
| `vite.config.js` | `base` 与分包 |

## 8. 任务起点

按任务类型查 `docs/智能协作/上下文地图.md`。常用：

| 任务 | 先读 |
| --- | --- |
| 新增页面 | `docs/指南/新增页面或功能.md` |
| 改 UI / 样式 | `docs/架构/样式与主题.md` |
| 改 Markdown 渲染 | `docs/架构/渲染管线.md` |
| 写 / 改文章 | `docs/指南/内容工作流.md` |
| 改构建 / 数据 | `docs/架构/构建管线.md`、`docs/参考/数据结构参考.md` |
| 部署 / 404 | `docs/运维/部署指南.md` |
| 不生效 / 报错 | `docs/运维/故障排查.md`、`docs/运维/已知行为与陷阱.md` |

## 9. 编码约定（摘要）

- 2 空格、单引号、无分号、行宽 100。
- 视图 `XxxView.vue`；组件 PascalCase；composable `useXxx.js`；store `xxxStore.js`。
- 导入统一 `@/`；同级才用 `./`。
- 用户可见文案必须三语（`zh/en/ja`）。
- 组件样式 `scoped`；不新增全局选择器。
- 组件卸载时清理定时器 / 监听器。
- 错误要有回退，不静默吞掉（可选资源除外）。

完整规范：`docs/质量/编码规范.md`。

## 10. 交付前检查

```bash
npm run lint
npm run build
node scripts/check-docs.mjs
git status --short
```

- 构建会重建 `public/data`，确认 diff 只包含预期的内容变化。
- 涉及路径或资源时，追加 `npm run build:github`。
- 涉及移动端时，附视口与验证方式。

逐项清单：`docs/智能协作/审查清单.md`。

## 11. 汇报格式

必须包含：

1. 改动内容（按文件/模块）；
2. 验证命令与结果；
3. 明确未验证的部分；
4. 如有取舍，说明原因。

禁止把推测写成事实，禁止用「应该没问题」代替验证。

## 12. 文档规则

- 描述性文档使用中文文件名；`README.md` / `AGENTS.md` / `CLAUDE.md` 保留英文。
- 文档索引：`docs/文档索引.md`。
- 结构变化同步 `docs/架构/模块地图.md` 与本文件。
- 新决策写 ADR（`docs/决策记录/`）。
- 新陷阱写 `docs/运维/已知行为与陷阱.md`。

## 13. 已知陷阱（必读）

`docs/运维/已知行为与陷阱.md` 记录了 14 条容易误判的行为，例如：

- 背景图清单恒为空，属预期；
- `series.json` 不是系列页数据源；
- 习题块结束标记是 `[\task]` 而非 `[/task]`；
- 构建会沿用旧文章日期；
- 移动文章会换 ID。

改动前先读，避免把既有行为当 bug「修复」。
