# scripts 脚本说明

Node.js 脚本，负责内容索引、构建后处理、本地预览、图片优化与验证。
脚本不在浏览器执行，不参与打包。

## 脚本一览

| 文件 | 命令 | 作用 | 产物 / 副作用 |
| --- | --- | --- | --- |
| `generate.js` | `node scripts/generate.js` | 解析 `blogs/**/*.md`，生成站点数据 | 写 `public/data/blogs.json`、`series.json`；保证 `background-images.json`、`announcements.json` 存在 |
| `postbuild.js` | `node scripts/postbuild.js` | 把 `blogs/` 复制到 `dist/blogs/` | 写 `dist/blogs/` |
| `preview-server.mjs` | `node scripts/preview-server.mjs` | 静态预览：`dist` + 仓库根 | 启动 HTTP 服务（默认 4173） |
| `optimize-images.mjs` | `npm run optimize:images` | 按 `MANIFEST` 生成 WebP 变体 | 在图片旁写 `.webp`，不删原图 |
| `compare-image-quality.mjs` | `npm run check:images` | 对比原图与 WebP 的 PSNR / MAE | 只读，输出指标 |
| `image-info.mjs` | `node scripts/image-info.mjs <文件…>` | 解析 PNG / JPEG 文件头尺寸 | 只读，打印宽高 |
| `verify-detail-mobile.mjs` | `node scripts/verify-detail-mobile.mjs --id <id>` | 注入探针，跑多视口几何断言 | 写临时目录与截图；失败退出码 1 |
| `check-docs.mjs` | `npm run check:docs` | 校验 Markdown 相对链接 | 只读；失败退出码 1 |

## generate.js

```bash
node scripts/generate.js              # 重建索引
node scripts/generate.js "公告正文"    # 追加公告并重建索引
```

- 扫描时**跳过** `blogs/模板/`、`.obsidian/` 与 `blogs/` 根目录下的非 Markdown 文件。
- 自动 ID = `contentFile` 的 FNV-1a 32 位哈希；移动文章会换 ID。
- 日期优先 frontmatter → 旧 `blogs.json` 同路径日期 → 文件 mtime。
- 详细规则见 `docs/参考/数据结构参考.md`。

## preview-server.mjs

```bash
node scripts/preview-server.mjs --port 4173 --root . --dist dist
```

- `/` 取 `dist/index.html`；`/blogs/**` 直接读仓库根的原文件；
- `/assets`、`/data` 走 `dist`。
- 仅用于本地验证，不进入构建产物。

## verify-detail-mobile.mjs

```bash
node scripts/verify-detail-mobile.mjs --id 3796104188 --out .tmp/verify
```

- 复制 `dist` 到临时目录并注入探针脚本；
- 用 Chrome `--dump-dom` 读取运行时几何信息；
- 覆盖手机 / 平板 / 桌面视口，输出截图路径。
- 依赖本机 Chrome，路径可用 `--chrome` 覆盖。

## 新增脚本约定

- 使用 ESM（`.mjs`）或与现有 `generate.js` / `postbuild.js` 保持一致。
- 路径一律由 `fileURLToPath(import.meta.url)` 推导仓库根，不依赖当前工作目录。
- 写文件前确保父目录存在；不要删除源文件。
- 需要人工判断的操作（覆盖、上传、部署）不要放进脚本。
- 新增脚本后同步本文件、`package.json` 与 `docs/参考/脚本参考.md`。
