## 变更内容

<!-- 用一两句话说明这个 PR 做了什么 -->

## 类型

- [ ] 功能（feat）
- [ ] 修复（fix）
- [ ] 重构（refactor）
- [ ] 文档（docs）
- [ ] 构建 / 工具（chore）
- [ ] 样式 / 体验（style）

## 影响范围

- [ ] 首页
- [ ] 详情阅读
- [ ] 归档 / 分类 / 系列
- [ ] 搜索 / 设置 / 公告
- [ ] 快捷链接 / 关于
- [ ] 内容数据 / 构建
- [ ] 文档 / Agent 配置

## 验证

- [ ] `npm run lint` 通过
- [ ] `npm run build` 通过
- [ ] 涉及子路径时验证过 `npm run build:github`
- [ ] 涉及移动端时检查过 ≤480px
- [ ] `node scripts/check-docs.mjs` 通过（文档改动时）

## 截图 / 说明

<!-- 涉及 UI 时附前后对比；涉及数据时说明 diff 范围 -->

## 检查清单

- [ ] 没有提交 `dist/`、`node_modules/` 或临时产物
- [ ] 没有手工修改 `public/data/blogs.json` / `series.json`
- [ ] 没有移动 `blogs/` 下已发布文章
- [ ] 新增文案已补齐 `zh` / `en` / `ja`
- [ ] 结构变化已同步 `docs/架构/模块地图.md` 与 `AGENTS.md`
- [ ] 一次提交只做一类改动
