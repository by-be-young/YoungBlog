# announcements · 公告

- 路由：`/announcements`（name `Announcements`）
- 入口：`AnnouncementsView.vue`
- 依赖：`resolveUrl`、`i18nStore`

## 数据

`public/data/announcements.json`，结构：

```json
{ "id": 1788969600000, "date": "2026-09-10", "message": "..." }
```

- `message` 仍是纯文本，但渲染前由 `shared/utils/announcement.js` 的 `parseAnnouncement` 还原结构：
  首行标题（`「系列·版本"代号"版本更新」`）→ `xx>>` 章节 → `【分组】` → `·列表项` → 末尾寄语。
  解析只识别标记，不改动任何文字。
- 新公告通过命令行追加：

```bash
node scripts/generate.js "公告正文"
```

追加会插入数组头部，并使用运行当天日期。

## 相关

- 首次进入站点时，`shared/components/AnnouncementModal.vue` 负责弹窗提示（结构化阅读 + 章节索引）。
- 页面本身是「发布记录」列表：左侧日期片 + 右侧公告卡，长公告默认折叠，可展开全文。
- 弹窗与列表页共用 `shared/components/AnnouncementContent.vue`（`variant="modal"` / `"card"`），改一处即两处同步。

## 修改提示

- 不要手工编辑 JSON 时破坏 `id`（毫秒时间戳）与 `date` 的格式。
- 公告正文较长时，注意移动端卡片的最大高度与滚动。
- 新增文案走 i18n 三语，颜色引用 `--notice-*` 变量，不在组件里写色值。
