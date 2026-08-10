#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "📦 拉取最新代码..."
git pull

echo "🚀 部署..."
sudo rm -rf assets blogs articles music favicon.ico data
sudo mv dist/* . && sudo rm -rf dist
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/
sudo systemctl restart nginx

echo "✅ 部署完成！访问 http://be-young.top"