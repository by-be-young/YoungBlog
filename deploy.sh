#!/bin/bash
set -e

# 进入脚本所在目录（项目根目录）
cd "$(dirname "$0")"

echo "📦 拉取最新代码..."
git pull

echo "🔨 构建项目..."
sudo rm -rf dist node_modules/.vite .vite-temp
npm install
npm run build

# 检查构建产物
if [ ! -d "./dist" ]; then
  echo "❌ 构建产物不存在，已中止部署"
  exit 1
fi

echo "🚀 部署..."
sudo rm -rf assets blogs articles music favicon.ico data
sudo mv dist/* . && sudo rm -rf dist
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/
sudo systemctl restart nginx

echo "✅ 部署完成！访问 http://be-young.top"