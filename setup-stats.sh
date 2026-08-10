#!/bin/bash
# 一次性脚本：在服务器上安装 GoAccess 并配置全自动访问统计。
# 用法：git pull 后执行  bash setup-stats.sh
# 之后 cron 每 5 分钟自动更新报告，无需任何手动操作。
set -e
cd "$(dirname "$0")"

echo "🛠 安装 GoAccess..."
if command -v goaccess >/dev/null 2>&1; then
  echo "已安装: $(goaccess --version | head -1)"
else
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq && sudo apt-get install -y goaccess
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y goaccess
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y goaccess
  fi
  command -v goaccess >/dev/null 2>&1 || { echo "❌ GoAccess 安装失败，请手动安装后重试"; exit 1; }
fi

echo "📂 定位 nginx 访问日志..."
LOG_FILE="$(sudo nginx -T 2>/dev/null | grep -oP 'access_log\s+\K[^;]+' | grep -v 'off' | head -1 | tr -d '"' | xargs)"
[ -z "$LOG_FILE" ] && LOG_FILE=/var/log/nginx/access.log
echo "日志路径: $LOG_FILE"

GOACCESS_BIN="$(command -v goaccess)"
ZCAT_BIN="$(command -v zcat)"
[ -z "$ZCAT_BIN" ] && ZCAT_BIN=/bin/zcat

STATS_DIR=/var/www/html/stats
ARCHIVE_DIR=/var/lib/youngblog-stats
ARCHIVE=$ARCHIVE_DIR/access.all

echo "📄 生成统计脚本..."
sudo mkdir -p "$ARCHIVE_DIR" "$STATS_DIR"
# awk 过滤程序：静态文件，统计页面请求（排除 js/css/图片/字体/md/json 等静态资源）
sudo tee /etc/goaccess/youngblog-pv.awk >/dev/null <<'EOF'
# 页脚访问量统计：GET 且非静态资源 => 页面访问
sub(/"/, "", $6) && $6 == "GET" {
  p = $7
  sub(/\?.*/, "", p)
  if (p ~ /\.(js|css|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|otf|md|json|xml|txt|map|gz)$/) next
  n++
}
END {
  printf "{\"site_pv\": %d, \"updated_at\": \"%s\"}\n", n + 0, up
}
EOF
# 定时任务脚本：setup 时把真实路径展开进去，cron 运行时只负责执行
sudo tee /usr/local/bin/youngblog-stats.sh >/dev/null <<EOF
#!/bin/bash
# 由 setup-stats.sh 生成，cron 每 5 分钟执行一次
set -e
mkdir -p "$ARCHIVE_DIR"
# 汇总所有日志（含轮转归档，保证数据累计不丢失）
for f in ${LOG_FILE}*; do
  case "\$f" in
    *.gz) "$ZCAT_BIN" "\$f" ;;
    *) cat "\$f" ;;
  esac
done > "$ARCHIVE"
"$GOACCESS_BIN" -p /etc/goaccess/youngblog.conf -f "$ARCHIVE" -o "$STATS_DIR/index.html" >/dev/null 2>&1
chown www-data:www-data "$STATS_DIR/index.html" 2>/dev/null || true
# 页脚访问量：用 awk 过滤生成 stats.json，供前端展示
UPDATED="\$(date '+%Y-%m-%d %H:%M')"
awk -f /etc/goaccess/youngblog-pv.awk -v up="\$UPDATED" "$ARCHIVE" > "$STATS_DIR/stats.json"
EOF
sudo chmod +x /usr/local/bin/youngblog-stats.sh

echo "📝 写入 GoAccess 配置..."
sudo tee /etc/goaccess/youngblog.conf >/dev/null <<EOF
log-format COMBINED
EOF

echo "⏰ 注册 cron（每 5 分钟自动更新，幂等可重复执行）..."
( sudo crontab -l 2>/dev/null | grep -v 'youngblog-stats' || true; echo "*/5 * * * * /usr/local/bin/youngblog-stats.sh >/dev/null 2>&1" ) | sudo crontab -

echo "🚀 立即生成第一份报告..."
sudo /usr/local/bin/youngblog-stats.sh

echo ""
echo "✅ 完成！报告地址: http://be-young.top/stats/"
echo "之后无需任何手动操作，cron 每 5 分钟自动更新。"
