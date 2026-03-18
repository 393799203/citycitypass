# 城城配送系统 (CityCityPass)

城城配送系统是一款面向物流配送行业的智能化管理系统，旨在帮助企业高效管理订单、车辆、司机和配送调度。

## 系统定位

城城配送系统是一个 **SaaS 化物流配送管理平台**，专注于解决城际配送场景中的核心痛点：

- 订单分散、调度困难
- 车辆和司机资源利用率低
- 配送路线规划不智能
- 缺乏数据支撑的决策能力

## 核心功能

### 1. 订单管理
- 支持创建、编辑、删除配送订单
- 订单包含收货人信息、货物详情、收货地址
- 订单状态流转：待确认 → 待调度 → 已调度 → 已完成
- 支持 Excel 批量导入订单

### 2. 仓库管理
- 多仓库支持
- 仓库位置信息管理（经纬度）
- 3D 仓库可视化展示

### 3. 车辆管理
- 车辆信息维护（车牌号、车型、载重、容积）
- 车辆位置实时追踪
- 车辆状态管理（可用/配送中/休息）
- 支持为车辆设置详细地址

### 4. 司机管理
- 司机档案管理（姓名、电话、驾驶证）
- 司机位置实时追踪
- 司机状态管理（可用/配送中/休息）
- 司机与车辆关联
- 支持为司机设置详细地址

### 5. 配送调度
- 手动创建配送单
- 配送单状态流转：待发运 → 配送中 → 已完成/已取消
- 配送单包含：车辆、司机、订单列表
- **AI 智能调度**：自动分析订单，智能推荐分组
- 配送路线可视化（高德地图）
- 支持多目的地路线规划
- 配送中可实时更新位置

### 6. 出库管理
- 根据配送单生成出库单
- 出库单状态管理

## AI 增强能力

### AI 智能调度
系统集成了 AI 能力，帮助调度员更高效地完成配送单创建：

1. **订单智能分组**
   - AI 分析待调度订单
   - 优先按仓库分组
   - 同一仓库内按城市/区域聚类

2. **资源智能推荐**
   - 基于仓库位置计算最近可用车辆
   - 基于仓库位置计算最近可用司机
   - 推荐理由清晰可见

3. **多目的地路线规划**
   - 调用高德地图 API
   - 支持多个目的地顺序规划
   - 自动过滤重复位置
   - 计算总距离和预计时间

### 地址智能解析
- 创建订单时，输入详细地址后自动获取经纬度
- 创建/更新车辆位置时，支持地址解析
- 创建/更新司机位置时，支持地址解析

## 技术架构

### 前端
- **React** + **TypeScript**
- **Tailwind CSS** UI 框架
- **Vite** 构建工具
- **React Router** 路由管理
- **Axios** HTTP 请求
- **高德地图 JS API** 地图展示
- **xlsx** Excel 导入导出
- **React Toastify** 提示组件

### 后端
- **Node.js** + **Express**
- **TypeScript**
- **Prisma** ORM
- **SQLite** 数据库（可切换 MySQL/PostgreSQL）
- **高德地图 Web API** 地理编码、路线规划

### 项目结构

```
citycitypass/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── api/          # API 接口
│   │   ├── components/   # 公共组件
│   │   ├── pages/        # 页面组件
│   │   ├── stores/        # 状态管理
│   │   └── data/          # 静态数据
│   └── package.json
│
├── server/                 # 后端项目
│   ├── src/
│   │   ├── routes/       # 路由接口
│   │   ├── services/      # 业务服务
│   │   ├── middleware/    # 中间件
│   │   └── lib/          # 工具库
│   ├── prisma/           # 数据库模型
│   └── package.json
│
└── README.md
```

## 快速开始

### 环境要求
- Node.js 18+
- npm 9+

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd citycitypass

# 安装前端依赖
cd client && npm install

# 安装后端依赖
cd ../server && npm install
```

### 配置

1. 创建环境变量文件（可选）：
```bash
# server/.env
DATABASE_URL="file:./dev.db"
AMAP_KEY="your-amap-key"
AI_API_KEY="your-ai-api-key"
```

2. 初始化数据库：
```bash
cd server
npx prisma generate
npx prisma db push
```

### 启动

```bash
# 启动后端（端口 3001）
cd server && npm run dev

# 启动前端（端口 3000）
cd client && npm run dev
```

访问 http://localhost:3000

## 系统截图

系统包含以下核心页面：
- 登录/注册
- 订单中心
- 配送调度中心
- 配送单详情
- 车辆管理
- 司机管理
- 仓库管理
- 商品管理
- 货主管理
- 出库管理

## 扩展能力

### 数据库切换
当前使用 SQLite，可轻松切换到 MySQL 或 PostgreSQL：

```bash
# 修改 prisma/schema.prisma 中的 provider
provider = "mysql"  # 或 "postgresql"

# 更新数据库连接字符串
DATABASE_URL="mysql://user:password@localhost:3306/citycitypass"
```

### 添加 AI 供应商
当前支持多种 AI 供应商，可在 `client/src/api/ai.ts` 中扩展。

## 许可证

MIT License
