# announcements · 公告

- 路由：`/announcements`（name `Announcements`）
- 入口：`AnnouncementsView.vue`
- 依赖：`resolveUrl`、`i18nStore`

## 数据

`public/data/announcements.json`，结构：

```json
{ "id": 1788969600000, "date": "2026-09-10", "message": "..." }
```

- `message` 中的 `\n` 会在渲染时转换为段落 / 换行。
- 新公告通过命令行追加：

```bash
node scripts/generate.js "公告正文"
```

追加会插入数组头部，并使用运行当天日期。

## 相关

- 首次进入站点时，`shared/components/AnnouncementModal.vue` 负责弹窗提示。
- 页面本身只做列表展示，不写入数据。

## 修改提示

- 不要手工编辑 JSON 时破坏 `id`（毫秒时间戳）与 `date` 的格式。
- 公告正文较长时，注意移动端卡片的最大高度与滚动。
