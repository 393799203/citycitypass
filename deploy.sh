#!/bin/bash

SERVER_IP="8.136.144.140"
SERVER_USER="root"
SERVER_PATH="/opt/ZLAI"

MODE=${1:-full}

show_usage() {
  echo "用法: ./deploy.sh [模式]"
  echo ""
  echo "模式说明:"
  echo "  frontend  - 只部署前端（不动数据库，不执行seed）"
  echo "  backend   - 只部署后端（不动数据库，不执行seed）"
  echo "  full      - 全部部署（清空数据库，重新seed）默认"
  echo ""
  echo "示例:"
  echo "  ./deploy.sh frontend  # 只更新前端"
  echo "  ./deploy.sh backend   # 只更新后端"
  echo "  ./deploy.sh full      # 全部重新部署"
}

if [ "$MODE" = "-h" ] || [ "$MODE" = "--help" ]; then
  show_usage
  exit 0
fi

if [ "$MODE" != "frontend" ] && [ "$MODE" != "backend" ] && [ "$MODE" != "full" ]; then
  echo "❌ 无效的模式: $MODE"
  show_usage
  exit 1
fi

echo "🚀 开始部署到 $SERVER_IP..."
echo "📋 部署模式: $MODE"

echo "📦 上传代码..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/

if [ $? -ne 0 ]; then
  echo "❌ 代码上传失败"
  exit 1
fi

echo "🔨 执行部署..."

case $MODE in
  frontend)
    echo "🎯 只部署前端..."
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/ZLAI
docker-compose build client
docker-compose up -d client
docker-compose ps
ENDSSH
    ;;

  backend)
    echo "🎯 只部署后端..."
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/ZLAI
export DEPLOY_MODE=normal
docker-compose build server
docker-compose up -d server
docker-compose ps
ENDSSH
    ;;

  full)
    echo "🎯 全部部署（清空数据库）..."
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/ZLAI
docker-compose down -v
export DEPLOY_MODE=full
docker-compose up -d --build
docker-compose ps
ENDSSH
    ;;
esac

if [ $? -ne 0 ]; then
  echo "❌ 部署失败"
  exit 1
fi

echo "✅ 部署完成！"
echo "🌐 访问地址: http://$SERVER_IP"
