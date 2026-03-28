# CityCityPass 城市通® 企业数字化管理系统

> 集成 OMS、WMS、TMS 一站式解决方案 | 电商、传统企业、物流、运输行业通用

---

## 📋 项目概述

**CityCityPass（城市通®）** 是一款面向多行业的数字化业务管理系统，深度集成 **订单管理系统(OMS)**、**仓储管理系统(WMS)**、**运输管理系统(TMS)** 三大核心模块，为企业提供从订单处理、仓储管理到物流配送的全链路数字化支撑。

### 核心价值

- **全链路覆盖**：订单 → 仓储 → 物流，一体化数据流转
- **多行业适配**：电商、传统商贸、制造业、物流企业、连锁零售
- **多租户支持**：支持按货主、仓库、承运商等多维度隔离
- **可视化运营**：实时库存、车辆定位、订单追溯、数据驾驶舱

---

## 🏗️ 系统架构

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端** | React 18 + TypeScript + Vite | SPA应用，组件化开发 |
| **后端** | Express.js + TypeScript | RESTful API |
| **数据库** | PostgreSQL + Prisma ORM | 关系型数据库 |
| **状态管理** | React Hooks + Context | 轻量级状态管理 |
| **样式** | Tailwind CSS | 原子化CSS框架 |
| **图标** | Lucide React | 开源图标库 |
| **地图** | 百度/高德/腾讯地图 SDK | 车辆定位与地理编码 |
| **文件存储** | 本地存储 + URL访问 | 图片、证照、合同文档 |

### 项目结构

```
citycitypass/
├── client/                          # 前端应用
│   ├── src/
│   │   ├── api/                    # API接口定义
│   │   ├── components/             # 公共组件
│   │   │   ├── ConfirmProvider.tsx  # 确认对话框
│   │   │   ├── Header.tsx          # 页头导航
│   │   │   ├── Layout.tsx          # 布局组件
│   │   │   ├── LicensePlateInput.tsx # 车牌号输入
│   │   │   ├── PhoneInput.tsx       # 手机号输入
│   │   │   └── Tooltip.tsx          # 工具提示
│   │   ├── pages/                   # 页面组件
│   │   ├── types/                   # TypeScript类型定义
│   │   └── utils/                   # 工具函数
│   └── package.json
│
├── server/                          # 后端服务
│   ├── prisma/
│   │   └── schema.prisma            # 数据库模型定义
│   └── src/
│       ├── index.ts                 # 服务入口
│       ├── routes/                  # 路由模块
│       ├── services/                 # 业务逻辑层
│       ├── middlewares/              # 中间件
│       └── utils/                    # 工具函数
│
├── README.md
└── package.json                      # 根目录管理脚本
```

---

## 📦 OMS 订单管理系统

### 功能模块

| 模块 | 功能说明 |
|------|----------|
| **订单管理** | 订单列表、订单详情、退货管理、批量操作 |
| **客户管理** | 客户档案、信用评级、价格等级、收货地址 |
| **退货管理** | 退货申请、退货验收、退款处理、质检流程 |

### 核心功能

- ✅ 订单多状态流转（待付款、待发货、已发货、已完成、已取消）
- ✅ 退货全流程管理（申请 → 退货中 → 已入库 → 退款）
- ✅ 订单追溯（批次号、商品明细、仓库记录）
- ✅ 批量导入导出（Excel格式）
- ✅ 价格等级管理（不同客户不同价格）
- ✅ 订单打印（面单、发货单）
- ✅ 货主隔离（多租户订单数据分离）

---

## 🏭 WMS 仓储管理系统

### 功能模块

| 模块 | 功能说明 |
|------|----------|
| **仓库管理** | 仓库档案、货区管理、货位管理、库位映射 |
| **商品管理** | 商品档案、SKU管理、套装管理、条形码 |
| **库存管理** | 实时库存、库位库存、批次管理、库存预警 |
| **入库管理** | 采购入库、退货入库、生产入库、入库验收 |
| **出库管理** | 销售出库、调拨出库、领用出库、批量出库 |
| **移库管理** | 库位调整、库间调拨、库内整理 |
| **库存记录** | 入库明细、出库明细、库存流水、盘点记录 |

### 核心功能

- ✅ 多仓库、多货区、多货位层级管理
- ✅ 套装（Bundle）组合商品管理
- ✅ 批次号管理（生产批次、采购批次）
- ✅ 库存锁定（预留、冻结）
- ✅ 库位推荐（智能推荐最优库位）
- ✅ 条形码支持（商品条码、货位条码）
- ✅ 库存盘点（定期盘点、随机盘点）
- ✅ 库存报表（进销存汇总、库龄分析）
- ✅ 货主隔离（不同货主独立库存视图）

---

## 🚛 TMS 运输管理系统

### 功能模块

| 模块 | 功能说明 |
|------|----------|
| **车辆管理** | 车辆档案、证照管理、定位跟踪、状态监控 |
| **司机管理** | 司机档案、驾驶证管理、准驾车型、服务状态 |
| **承运商管理** | 承运商档案、合同管理、车辆绑定、评价体系 |
| **运力管理** | 车辆池、司机池、可用运力实时查看 |
| **调度管理** | 配送调度、路线规划、任务分配 |
| **配送跟踪** | 实时定位、轨迹回放、异常告警 |
| **司机APP** | 任务接收、导航接入、签收拍照 |

### 核心功能

- ✅ 车辆实时定位（GPS + 地图SDK）
- ✅ 地理编码（地址 → 坐标）
- ✅ 运力池管理（可用/配送中/维修/停用）
- ✅ 承运商合同管理（服务条款、价格协议）
- ✅ 证照管理（行驶证、保险、年检）
- ✅ 准驾车型管理（A/B/C照对应车型）
- ✅ 调度优化（基于位置和车辆类型的智能分配）
- ✅ 配送轨迹记录与回放

---

## 👥 基础功能

### 用户权限系统

| 模块 | 功能说明 |
|------|----------|
| **用户管理** | 用户账号、角色分配、状态管理 |
| **角色管理** | 预置角色（管理员、仓库主管、调度员、客服）、自定义角色 |
| **权限管理** | 页面权限、按钮权限、数据权限 |
| **操作日志** | 用户操作记录、异常行为审计 |

### 基础数据

| 模块 | 功能说明 |
|------|----------|
| **数据字典** | 状态码、类型码、枚举值统一管理 |
| **区域管理** | 省市区三级联动 |
| **货主管理** | 货主档案、服务等级、结算方式 |
| **供应商管理** | 供应商档案、采购合同、应付账款 |

---

## 🔌 API 接口一览

### 认证模块
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/me` - 获取当前用户

### 订单模块
- `GET /api/orders` - 订单列表
- `GET /api/orders/:id` - 订单详情
- `POST /api/orders` - 创建订单
- `PUT /api/orders/:id` - 更新订单
- `DELETE /api/orders/:id` - 删除订单
- `PUT /api/orders/:id/status` - 更新订单状态

### 退货模块
- `GET /api/returns` - 退货列表
- `GET /api/returns/:id` - 退货详情
- `POST /api/returns` - 创建退货
- `PUT /api/returns/:id` - 更新退货
- `PUT /api/returns/:id/status` - 处理退货

### 商品模块
- `GET /api/products` - 商品列表
- `GET /api/products/:id` - 商品详情
- `POST /api/products` - 创建商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 删除商品

### 仓库模块
- `GET /api/warehouses` - 仓库列表
- `GET /api/warehouses/:id` - 仓库详情
- `POST /api/warehouses` - 创建仓库
- `PUT /api/warehouses/:id` - 更新仓库
- `GET /api/warehouses/:id/zones` - 货区列表
- `GET /api/warehouses/:id/shelves` - 货位列表

### 库存模块
- `GET /api/stock` - 库存查询
- `GET /api/stock/in` - 入库记录
- `GET /api/stock/out` - 出库记录
- `POST /api/stock/in` - 入库操作
- `POST /api/stock/out` - 出库操作

### 移库模块
- `GET /api/stock-transfers` - 移库列表
- `POST /api/stock-transfers` - 创建移库
- `PUT /api/stock-transfers/:id/execute` - 执行移库

### 车辆模块
- `GET /api/vehicles` - 车辆列表
- `GET /api/vehicles/all` - 所有车辆
- `POST /api/vehicles` - 创建车辆
- `PUT /api/vehicles/:id` - 更新车辆
- `PUT /api/vehicles/:id/location` - 更新位置

### 司机模块
- `GET /api/drivers` - 司机列表
- `POST /api/drivers` - 创建司机
- `PUT /api/drivers/:id` - 更新司机

### 承运商模块
- `GET /api/carriers` - 承运商列表
- `GET /api/carriers/:id` - 承运商详情
- `POST /api/carriers` - 创建承运商
- `PUT /api/carriers/:id` - 更新承运商
- `POST /api/carriers/:id/approve` - 审核承运商
- `GET /api/carriers/:id/vehicles` - 承运商车辆
- `POST /api/carriers/:id/vehicles` - 添加车辆
- `PUT /api/carriers/vehicles/:id` - 更新车辆
- `DELETE /api/carriers/vehicles/:id` - 删除车辆

### 调度模块
- `GET /api/dispatches` - 调度列表
- `POST /api/dispatches` - 创建调度
- `PUT /api/dispatches/:id` - 更新调度
- `PUT /api/dispatches/:id/status` - 更新调度状态

### 客户模块
- `GET /api/customers` - 客户列表
- `POST /api/customers` - 创建客户
- `PUT /api/customers/:id` - 更新客户

### 供应商模块
- `GET /api/suppliers` - 供应商列表
- `POST /api/suppliers` - 创建供应商
- `PUT /api/suppliers/:id` - 更新供应商

### 合同模块
- `GET /api/contracts` - 合同列表
- `POST /api/contracts` - 创建合同
- `PUT /api/contracts/:id` - 更新合同

### 货主模块
- `GET /api/owners` - 货主列表
- `POST /api/owners` - 创建货主
- `PUT /api/owners/:id` - 更新货主

### 用户模块
- `GET /api/users` - 用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 地理编码模块
- `GET /api/geocode` - 地址转坐标
- `GET /api/reverse-geocode` - 坐标转地址

### 文件上传模块
- `POST /api/upload` - 文件上传
- `GET /uploads/:filename` - 文件访问

---

## 🗄️ 数据库模型（核心表）

### 主数据

| 模型 | 说明 |
|------|------|
| `User` | 系统用户 |
| `Role` | 角色定义 |
| `Permission` | 权限定义 |
| `Owner` | 货主 |
| `Customer` | 客户/买家 |
| `Supplier` | 供应商 |
| `Carrier` | 承运商 |
| `CarrierVehicle` | 承运商车辆 |
| `Driver` | 司机 |

### 业务数据

| 模型 | 说明 |
|------|------|
| `Product` | 商品 |
| `Bundle` | 套装 |
| `Warehouse` | 仓库 |
| `Zone` | 货区 |
| `Shelf` | 货位 |
| `Stock` | 库存 |
| `Order` | 订单 |
| `OrderItem` | 订单明细 |
| `ReturnOrder` | 退货单 |
| `ReturnItem` | 退货明细 |
| `InboundOrder` | 入库单 |
| `OutboundOrder` | 出库单 |
| `StockTransfer` | 移库单 |
| `Dispatch` | 调度单 |
| `Contract` | 合同 |
| `PickOrder` | 拣货单 |

### 日志与辅助

| 模型 | 说明 |
|------|------|
| `OperationLog` | 操作日志 |
| `StockInLog` | 入库日志 |
| `StockOutLog` | 出库日志 |

---

## 🎯 适用行业场景

### 电商企业
- 多仓库协同发货
- 套装组合销售
- 退货逆向物流
- 订单批量处理

### 传统商贸
- 多货主库存共享
- 采购、销售、库存一体化
- 客户信用管理
- 批次追溯

### 制造业
- 原材料/成品仓库管理
- 工序间移库
- 生产入库/领用出库
- 库存预警

### 物流企业
- 多承运商管理
- 运力池调配
- 车辆实时定位
- 配送轨迹追溯

### 连锁零售
- 门店配送管理
- 总部-门店库存协同
- 加盟商管理
- 多价格体系

### 仓储企业
- 多货主仓配一体化
- B2B/B2C 仓储代管
- 库内加工（组装、贴标、二次包装）
- 库位智能化管理
- 客户自助下单Portal
- 库存报表自动推送

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL >= 14
- pnpm >= 8

### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd citycitypass

# 2. 安装依赖
pnpm install

# 3. 配置数据库
cp server/.env.example server/.env
# 编辑 server/.env 配置数据库连接

# 4. 初始化数据库
cd server
pnpm prisma migrate dev
pnpm prisma db seed  # 可选：初始化数据

# 5. 启动服务
pnpm dev  # 同时启动前端和后端

# 6. 访问系统
open http://localhost:3000
```

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

---

## 📊 数据驾驶舱

系统提供多维度数据统计：

- **订单统计**：日/周/月订单量、销售额、退货率
- **库存统计**：实时库存量、库存周转率、呆滞库存
- **运输统计**：配送及时率、车辆利用率、里程统计
- **财务统计**：应收应付、收入支出、利润分析

---

## 🔐 安全特性

- JWT Token 认证
- 密码加密存储（bcrypt）
- 接口权限校验
- 数据行级权限控制（货主隔离）
- 操作日志审计
- SQL注入防护
- CORS 跨域控制

---

## 🌐 集成扩展

### 物流跟踪集成
- 快递100 API 对接
- 物流轨迹推送

### 地图服务集成
- 百度地图（定位、地理编码）
- 高德地图（路径规划）
- 腾讯地图（坐标转换）

### 消息通知
- 短信通知（预留接口）
- 邮件通知（预留接口）
- 站内信（即时通知）

### 第三方对接
- ERP 系统对接
- 财务系统对接
- 电商平台对接（淘宝、京东、拼多多）

---

## 📝 License

私有软件，All Rights Reserved.

---

## 📞 联系方式

技术支持：[技术支持邮箱]

---

> **城市通®** - 让企业数字化转型更简单
