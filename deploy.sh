#!/bin/bash

SERVER_IP="8.136.144.140"
SERVER_USER="root"
SERVER_PATH="/opt/ZLAI"

echo "🚀 开始部署到 $SERVER_IP..."

echo "📦 上传代码..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/

if [ $? -ne 0 ]; then
  echo "❌ 代码上传失败"
  exit 1
fi

echo "🔨 重新构建服务..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/ZLAI
docker-compose up -d --build
if [ $? -ne 0 ]; then
  echo "❌ Docker构建失败"
  exit 1
fi
docker-compose ps
if [ $? -ne 0 ]; then
  exit 1
fi
ENDSSH

if [ $? -ne 0 ]; then
  echo "❌ 部署失败"
  exit 1
fi

echo "✅ 部署完成！"
echo "🌐 访问地址: http://$SERVER_IP"
