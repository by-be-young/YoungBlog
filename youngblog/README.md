# YoungBlog · 白恙的逃避行

一个以 Markdown 为内容源、以 Vue 3 构建的个人学习笔记与生活记录站点。
仓库同时承载内容（`blogs/`）、前端应用（`src/`）与构建脚本（`scripts/`），
目标是让「写作 → 生成数据 → 构建静态站点」这条链路完全可复现。

[![Vue](https://img.shields.io/badge/Vue-3.5-42b883)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff)](https://vite.dev/)
[![Node](https://img.shields.io/badge/Node-%3E%3D22.18-5fa04e)](https://nodejs.org/)
[![Content](https://img.shields.io/badge/Content-CC%20BY--NC--SA%204.0-lightgrey)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

## 站点特性

- **Markdown / Obsidian 双栖写作**：文章直接存放于 `blogs/`，兼容 Obsidian 双链、图片嵌入与本地图片目录。
- **系列与章节**：通过 frontmatter 的 `series` / `chapter` / `order` 组织长系列课程笔记，自动生成章节时间轴。
- **学习 / 娱乐双分类**：首页按目录首层标签自动归类，归档页提供时间轴视图。
- **公式、图表、代码**：KaTeX 数学公式、Mermaid 图表、代码高亮与折叠、可交互任务清单。
- **沉浸阅读**：目录跟随、阅读进度、宽屏模式、图片查看器、导出与分享。
- **多语言 UI**：中文 / English / 日本語三套界面文案。
- **静态部署友好**：Hash 路由 + 可配置 `base`，同时支持根路径与 GitHub Pages 子路径部署。
- **入场加载器**：真实预载字体、数据与首屏图像，按阶段权重推进进度。

## 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | Vue 3（`<script setup>`） | 组合式 API + 单文件组件 |
| 路由 | Vue Router（Hash 模式） | 静态托管无需服务端重写规则 |
| 状态 | Pinia（Setup Store） | 博客数据、语言、设置、音乐、背景 |
| 构建 | Vite 8 | 开发服务器、生产构建、`base` 切换 |
| 内容解析 | marked + gray-matter | Markdown 渲染与 frontmatter 解析 |
| 增强 | highlight.js / KaTeX / Mermaid | 代码高亮、公式、图表 |
| 样式 | 原生 CSS（全局 + scoped） | 无 UI 框架，自定义主题与响应式 |
| 工具 | ESLint + oxlint + Prettier | 代码质量与格式 |

## 快速开始

要求 Node.js `^22.18.0 || >=24.12.0`（见 `package.json` 的 `engines`）。
仓库提供 `.nvmrc`，使用 nvm 时可直接 `nvm use`。

```bash
npm ci          # 安装依赖（严格按 package-lock.json）
npm run dev     # 开发服务器，默认 http://localhost:5173
```

生成可部署产物：

```bash
npm run build         # 根路径部署
npm run build:github  # GitHub Pages 子路径（base=/YoungBlog/）
```

`npm run build` 会依次执行：`scripts/generate.js` → `vite build` → `scripts/postbuild.js`。
其中 `generate.js` 会重写 `public/data/blogs.json` 与 `series.json`，提交前请检查 diff。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器（端口 5173，自动打开浏览器） |
| `npm run build` | 生成内容数据并构建生产包到 `dist/` |
| `npm run build:github` | 以 `/YoungBlog/` 为 base 构建（GitHub Pages） |
| `npm run preview` | Vite 预览构建产物 |
| `node scripts/preview-server.mjs` | 同时提供 `dist/` 与仓库根目录的静态服务器（可访问 `blogs/*.md`） |
| `npm run optimize:images` | 按清单生成 WebP 变体（不删除原图） |
| `npm run check:images` | 对比原图与 WebP 的 PSNR / MAE / MaxDiff |
| `npm run lint` | oxlint + ESLint（均带 `--fix`） |
| `npm run format` | Prettier 格式化 `src/` |
| `npm run check:docs` | 校验 Markdown 文档的相对链接 |

## 目录结构

```text
youngblog/
├── blogs/                  # 文章源（Markdown，按学年/主题/小节分目录）
│   └── 模板/               # 写作模板，构建时被 generate.js 跳过
├── docs/                   # 项目文档（架构、指南、参考、ADR、AI 协作）
├── public/                 # 原样拷贝到 dist 的静态资源
│   ├── assets/             # 图片、字体引用、音乐等
│   └── data/               # 站点数据（部分由构建生成）
├── scripts/                # 内容生成、构建后处理、图片与验证脚本
├── src/
│   ├── app/                # 应用外壳 App.vue
│   ├── assets/             # 参与构建的字体与全局样式
│   ├── features/           # 功能域：home / blog-detail / archive / ...
│   ├── router/             # 路由表
│   ├── shared/             # 跨功能共享：组件、布局、组合式函数、Store、工具
│   └── main.js             # 应用入口
├── index.html              # Vite 入口模板（含首屏图片 preload）
├── vite.config.js          # base、别名、分包配置
└── package.json
```

更细的职责划分见 [docs/架构/模块地图.md](docs/架构/模块地图.md)。

## 内容与数据流（简版）

1. 在 `blogs/<学年>/<主题>/<小节>/<文章>.md` 写文章，frontmatter 提供 `title` / `date` / `series` 等字段。
2. `scripts/generate.js` 扫描 `blogs/`，解析 frontmatter，派生标签与分类，写入 `public/data/blogs.json`、`series.json`。
3. `vite build` 打包 `src/` 与 `public/`；`scripts/postbuild.js` 再把 `blogs/` 复制到 `dist/blogs/`。
4. 运行时 `blogStore` 拉取 `data/blogs.json`；详情页按 `contentFile` 拉取原始 Markdown 并渲染。

完整链路见 [docs/架构/数据流.md](docs/架构/数据流.md)。

## 文档地图

| 入口 | 内容 |
| --- | --- |
| [docs/文档索引.md](docs/文档索引.md) | 全部文档索引 |
| [docs/架构/架构总览.md](docs/架构/架构总览.md) | 架构总览与设计约束 |
| [docs/指南/内容工作流.md](docs/指南/内容工作流.md) | 写作、目录规范与发布流程 |
| [docs/参考/文章元数据参考.md](docs/参考/文章元数据参考.md) | frontmatter 字段参考 |
| [docs/运维/部署指南.md](docs/运维/部署指南.md) | 部署与路径配置 |
| [docs/运维/已知行为与陷阱.md](docs/运维/已知行为与陷阱.md) | 已确认的历史行为与陷阱 |
| [AGENTS.md](AGENTS.md) | AI Agent 工作准则与任务手册入口 |
| [架构说明.md](架构说明.md) | 一页纸架构与关键决策 |
| [贡献指南.md](贡献指南.md) | 环境、提交规范、PR 清单 |
| [行为准则.md](行为准则.md) | 社区行为约定 |
| [安全策略.md](安全策略.md) | 漏洞报告渠道与攻击面 |
| [更新日志.md](更新日志.md) | 版本变更记录 |
| [LICENSE](LICENSE) | 文章与代码的授权范围 |
| [src/README.md](src/README.md) | 源码分层、依赖规则与新增代码位置 |
| [scripts/README.md](scripts/README.md) | 每个构建 / 验证脚本的用法 |
| [blogs/模板/README.md](blogs/模板/README.md) | 写作模板与草稿约定 |

## 部署

- **GitHub Pages**：`npm run build:github` 生成 `base=/YoungBlog/` 的产物；路由使用 Hash 模式，无需 404 重写。
- **自建服务器**：将 `dist/` 作为站点根目录，确保 `dist/blogs/` 一并上传；如需访问量统计，由服务器生成 `stats.json`。
- **本地验收**：`node scripts/preview-server.mjs` 会同时服务 `dist/`、`blogs/`、`public/assets`，最接近线上行为。

详见 [docs/运维/部署指南.md](docs/运维/部署指南.md)。

## 贡献与 AI 协作

- 人类贡献者请先读 [贡献指南.md](贡献指南.md)。
- AI Agent 请先读 [AGENTS.md](AGENTS.md)，其中包含仓库事实、硬性约束、任务配方与验收清单。
- 架构调整需附带 [ADR](docs/决策记录/)，文档与代码同仓维护。

## 许可

- 文章内容：CC BY-NC-SA 4.0，转载请注明来源。
- 源代码：版权保留，未经书面许可不得再分发。详见 [LICENSE](LICENSE)。
