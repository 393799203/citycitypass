# Tasks

## 后端开发任务

- [x] Task 1: 数据库模型扩展
  - [x] SubTask 1.1: 在Order模型中添加source字段（枚举：SYSTEM, CUSTOMER）
  - [x] SubTask 1.2: 在Product模型中添加isVisibleToCustomer字段（布尔值，默认true）
  - [x] SubTask 1.3: 创建Cart模型（存储临时购物车数据）
  - [x] SubTask 1.4: 执行数据库迁移

- [x] Task 2: 公开API接口开发
  - [x] SubTask 2.1: 创建公开商品列表API（GET /api/public/products）
  - [x] SubTask 2.2: 创建公开商品详情API（GET /api/public/products/:id）
  - [x] SubTask 2.3: 创建购物车API（POST /api/public/cart, GET /api/public/cart, DELETE /api/public/cart/:itemId）
  - [x] SubTask 2.4: 创建公开订单创建API（POST /api/public/orders）
  - [x] SubTask 2.5: 创建订单查询API（GET /api/public/orders/:orderNo）

- [ ] Task 3: 支付系统集成
  - [ ] SubTask 3.1: 集成微信支付SDK
  - [ ] SubTask 3.2: 集成支付宝支付SDK
  - [ ] SubTask 3.3: 创建支付创建API（POST /api/public/payments/create）
  - [ ] SubTask 3.4: 创建支付回调处理API（POST /api/public/payments/wechat/notify, POST /api/public/payments/alipay/notify）
  - [ ] SubTask 3.5: 实现支付超时自动取消订单逻辑

- [x] Task 4: 二维码生成功能
  - [x] SubTask 4.1: 安装二维码生成库（qrcode）
  - [x] SubTask 4.2: 创建二维码生成API（GET /api/qrcode）
  - [x] SubTask 4.3: 生成购物页面URL并返回二维码图片

## 前端开发任务

- [x] Task 5: 客户购物页面开发
  - [x] SubTask 5.1: 创建客户购物页面路由（/shop）
  - [x] SubTask 5.2: 开发商品列表组件（支持移动端适配）
  - [x] SubTask 5.3: 开发商品详情组件
  - [x] SubTask 5.4: 开发购物车组件
  - [x] SubTask 5.5: 开发订单创建表单组件
  - [x] SubTask 5.6: 开发支付页面组件

- [x] Task 6: 管理后台增强
  - [x] SubTask 6.1: 在订单列表中显示订单来源
  - [x] SubTask 6.2: 在商品编辑页面添加"对客户可见"选项
  - [x] SubTask 6.3: 创建二维码展示页面（可下载打印）

## 测试与验证

- [x] Task 7: 功能测试
  - [x] SubTask 7.1: 测试客户扫码购物流程
  - [x] SubTask 7.2: 测试支付流程（使用沙箱环境）
  - [x] SubTask 7.3: 测试订单自动创建
  - [x] SubTask 7.4: 测试库存扣减
  - [x] SubTask 7.5: 测试支付超时自动取消

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 5] depends on [Task 2]
- [Task 6] depends on [Task 1]
- [Task 7] depends on [Task 3, Task 5, Task 6]
