#!/bin/bash
set -e

# 进入脚本所在目录（仓库根目录）
cd "$(dirname "$0")"
ROOT="$(pwd)"
PROJECT_DIR="$ROOT/youngblog"

echo "📦 拉取最新代码..."
git pull

echo "🔨 构建项目..."
cd "$PROJECT_DIR"
sudo rm -rf dist node_modules/.vite .vite-temp
npm install
npm run build

# 构建产物检查：构建失败时立即终止，绝不清空线上文件
if [ ! -d "$PROJECT_DIR/dist" ]; then
  echo "❌ 构建产物不存在，已中止部署"
  exit 1
fi

echo "🚀 部署..."
cd "$ROOT"
sudo rm -rf assets blogs articles music favicon.ico data
sudo mv "$PROJECT_DIR/dist"/* .
sudo rm -rf "$PROJECT_DIR/dist"
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/
sudo systemctl restart nginx

echo "✅ 部署完成！访问 http://be-young.top"
