#!/bin/bash

# 进入脚本所在目录
cd "$(dirname "$0")"

echo "📦 拉取最新代码..."
git pull

echo "🧹 清理旧构建..."
sudo rm -rf dist node_modules/.vite .vite-temp

echo "📦 安装依赖..."
npm install

echo "🔨 构建项目..."
npm run build

echo "🚀 部署..."
sudo rm -rf assets blogs articles music favicon.ico data
sudo mv dist/* . && sudo rm -rf dist
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/
sudo systemctl restart nginx

echo "✅ 部署完成！访问 http://be-young.top"