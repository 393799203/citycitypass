# ZLAI 部署文档

## 📋 架构说明

本项目采用**端口分离**的部署方案，适合只有公网IP、没有域名的情况。

### 服务架构

```
公网IP部署架构：
├── http://YOUR_IP:3000  → 管理端前端（client）
├── http://YOUR_IP:3001  → 用户端前端（shop-client）
└── http://YOUR_IP:3002  → 后端API（server）
```

### 技术栈

- **前端**: React + Vite + TypeScript + Tailwind CSS
- **后端**: Node.js + Express + Prisma
- **数据库**: PostgreSQL
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx

## 🚀 快速部署

### 前置要求

- 服务器已安装 Docker 和 Docker Compose
- 服务器防火墙已开放端口：3000、3001、3002、5432

### 部署命令

#### 1. 全部部署（首次部署或重置数据库）

```bash
./deploy.sh full
```

这会：
- 清空数据库
- 构建所有服务镜像
- 启动所有服务
- 执行数据库初始化

#### 2. 只部署前端

```bash
# 部署所有前端（管理端和用户端）
./deploy.sh frontend

# 只部署管理端
./deploy.sh admin

# 只部署用户端
./deploy.sh shop
```

#### 3. 只部署后端

```bash
./deploy.sh backend
```

## 📁 项目结构

```
ZLAI/
├── client/              # 管理端前端
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.ts
├── shop-client/         # 用户端前端
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.ts
├── server/              # 后端API
│   ├── Dockerfile
│   └── src/
├── docker-compose.yml   # Docker编排配置
└── deploy.sh           # 部署脚本
```

## 🔧 配置说明

### 端口配置

| 服务 | 容器端口 | 宿主机端口 | 说明 |
|------|---------|-----------|------|
| 管理端前端 | 80 | 3000 | Nginx服务 |
| 用户端前端 | 80 | 3001 | Nginx服务 |
| 后端API | 3002 | 3002 | Node.js服务 |
| PostgreSQL | 5432 | 5432 | 数据库 |

### 环境变量

#### 后端环境变量 (server/.env)

```env
DATABASE_URL="postgresql://zlai:zlai123@db:5432/zlai"
PORT=3002
JWT_SECRET="Yx9kP2mQ3nL5wB7vF8rT1hJ4sD6eR0gH"
AMAP_KEY="b4a9ed33784ddcfb7265d1e1b988cc75"
SHOPPING_BASE_URL=http://YOUR_IP
```

#### Docker Compose 环境变量

```env
POSTGRES_USER=zlai
POSTGRES_PASSWORD=zlai123
POSTGRES_DB=zlai
SHOPPING_BASE_URL=http://YOUR_IP
```

## 🌐 Nginx配置

### 管理端和用户端Nginx配置

两个前端项目都使用相同的Nginx配置模式：

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://server:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 文件上传代理
    location /uploads {
        proxy_pass http://server:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 🔒 安全建议

### 1. 修改默认密码

首次部署后，请立即修改：

- PostgreSQL密码
- JWT_SECRET
- 管理员账户密码

### 2. 防火墙配置

建议只开放必要的端口：

```bash
# 开放前端端口
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=3001/tcp

# 如果需要外部访问API
firewall-cmd --permanent --add-port=3002/tcp

# 重载防火墙
firewall-cmd --reload
```

### 3. 数据库安全

建议不要开放数据库端口到公网：

```yaml
# docker-compose.yml
db:
  ports:
    - "127.0.0.1:5432:5432"  # 只监听本地
```

## 📊 监控和日志

### 查看服务状态

```bash
docker-compose ps
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f shop-client
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec server sh

# 进入数据库容器
docker-compose exec db psql -U zlai -d zlai
```

## 🔄 更新和维护

### 更新代码

```bash
# 1. 拉取最新代码
git pull

# 2. 部署更新
./deploy.sh frontend  # 更新前端
./deploy.sh backend   # 更新后端
```

### 备份数据库

```bash
# 导出数据库
docker-compose exec db pg_dump -U zlai zlai > backup.sql

# 导入数据库
cat backup.sql | docker-compose exec -T db psql -U zlai zlai
```

### 清理旧镜像

```bash
docker system prune -a
```

## 🐛 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
lsof -i :3000
lsof -i :3001
lsof -i :3002

# 停止占用进程
kill -9 <PID>
```

### 2. 容器启动失败

```bash
# 查看详细错误
docker-compose logs server

# 重新构建
docker-compose build --no-cache server
docker-compose up -d server
```

### 3. 数据库连接失败

检查数据库是否正常启动：

```bash
docker-compose ps db
docker-compose logs db
```

### 4. 前端页面空白

检查Nginx配置和构建产物：

```bash
docker-compose exec client ls /usr/share/nginx/html
docker-compose logs client
```

## 📞 技术支持

如有问题，请检查：

1. 服务状态：`docker-compose ps`
2. 服务日志：`docker-compose logs -f`
3. 端口占用：`netstat -tlnp | grep -E "3000|3001|3002"`
4. 防火墙设置：`firewall-cmd --list-ports`

## 🎯 性能优化建议

### 1. 启用Gzip压缩

在Nginx配置中添加：

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1000;
```

### 2. 静态资源缓存

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 数据库连接池

在Prisma配置中调整连接池大小：

```env
DATABASE_URL="postgresql://zlai:zlai123@db:5432/zlai?connection_limit=10"
```
