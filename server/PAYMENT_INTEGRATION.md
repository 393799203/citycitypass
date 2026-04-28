# 支付系统集成文档

## 概述

本次集成了微信支付和支付宝支付SDK，并创建了完整的支付流程API。由于这是演示项目，使用了模拟支付方式，不需要真实的支付商户账号。

## 创建的文件列表

### 1. 支付配置文件
- **文件路径**: `server/src/config/payment.ts`
- **功能**: 定义支付配置参数，包括微信支付和支付宝支付的配置

### 2. 支付服务层
- **文件路径**: `server/src/services/payment.ts`
- **功能**: 
  - 微信支付服务类
  - 支付宝支付服务类
  - 模拟支付服务类

### 3. 支付超时服务
- **文件路径**: `server/src/services/paymentTimeout.ts`
- **功能**: 定时检查超时订单并自动取消

### 4. 数据库模型更新
- **文件路径**: `server/prisma/schema.prisma`
- **更新内容**:
  - 在 Order 模型中添加支付相关字段
  - 添加 PaymentMethod 枚举（WECHAT, ALIPAY）
  - 添加 PaymentStatus 枚举（PENDING, SUCCESS, FAILED, TIMEOUT, CANCELLED）

## API 端点信息

### 1. 创建支付订单
- **端点**: `POST /api/public/payments/create`
- **请求体**:
  ```json
  {
    "orderNo": "订单号",
    "paymentMethod": "WECHAT" 或 "ALIPAY"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "paymentId": "支付ID",
      "qrCodeUrl": "二维码URL（微信支付）",
      "payUrl": "支付链接（支付宝）",
      "paymentTimeoutAt": "支付超时时间"
    }
  }
  ```

### 2. 微信支付回调
- **端点**: `POST /api/public/payments/wechat/notify`
- **功能**: 接收微信支付回调通知
- **响应**: XML格式的成功/失败消息

### 3. 支付宝回调
- **端点**: `POST /api/public/payments/alipay/notify`
- **功能**: 接收支付宝回调通知
- **响应**: "success" 或 "fail"

### 4. 模拟支付成功（测试用）
- **端点**: `POST /api/public/payments/mock-success`
- **请求体**:
  ```json
  {
    "paymentId": "支付ID"
  }
  ```
- **功能**: 模拟支付成功，用于测试

## 支付流程说明

### 1. 创建订单
首先通过 `POST /api/public/orders` 创建订单

### 2. 创建支付
调用 `POST /api/public/payments/create` 创建支付订单，系统会：
- 生成支付ID
- 设置支付超时时间（默认30分钟）
- 返回支付二维码或支付链接

### 3. 支付回调
支付成功后，支付平台会调用回调接口：
- 验证签名（沙箱模式跳过验证）
- 更新订单状态为"已支付"
- 记录支付时间

### 4. 支付超时处理
系统每分钟检查一次超时订单：
- 查找支付状态为 PENDING 且已超时的订单
- 自动取消订单
- 释放库存锁

## 测试步骤

### 1. 创建测试订单
```bash
curl -X POST http://localhost:3001/api/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "ownerId": "your-owner-id",
    "warehouseId": "your-warehouse-id",
    "receiver": "测试用户",
    "phone": "13800138000",
    "province": "北京市",
    "city": "北京市",
    "address": "朝阳区测试地址",
    "items": [
      {
        "skuId": "your-sku-id",
        "quantity": 1
      }
    ]
  }'
```

### 2. 创建支付
```bash
curl -X POST http://localhost:3001/api/public/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderNo": "返回的订单号",
    "paymentMethod": "WECHAT"
  }'
```

### 3. 模拟支付成功
```bash
curl -X POST http://localhost:3001/api/public/payments/mock-success \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "返回的支付ID"
  }'
```

### 4. 查询订单状态
```bash
curl http://localhost:3001/api/public/orders/订单号
```

## 环境变量配置

在 `.env` 文件中添加以下配置（可选，默认使用模拟模式）：

```env
# 微信支付配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_MCH_ID=your_mch_id
WECHAT_API_KEY=your_api_key
WECHAT_NOTIFY_URL=http://your-domain/api/public/payments/wechat/notify
WECHAT_SANDBOX=true

# 支付宝配置
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_private_key
ALIPAY_PUBLIC_KEY=alipay_public_key
ALIPAY_NOTIFY_URL=http://your-domain/api/public/payments/alipay/notify
ALIPAY_SANDBOX=true

# 支付超时时间（分钟）
PAYMENT_TIMEOUT=30
```

## 功能特点

1. **沙箱模式支持**: 默认启用沙箱模式，无需真实商户账号
2. **签名验证**: 支持微信支付和支付宝的签名验证（沙箱模式跳过）
3. **支付超时**: 30分钟未支付自动取消订单并释放库存
4. **重复支付保护**: 防止重复支付和重复回调
5. **库存管理**: 支付成功后库存保持锁定，超时自动释放
6. **日志记录**: 完整的支付流程日志

## 注意事项

1. 当前为模拟支付模式，适合演示和测试
2. 生产环境需要配置真实的支付商户信息
3. 支付超时服务在服务器启动时自动运行
4. 所有支付操作都有详细的日志记录

## 数据库字段说明

### Order 模型新增字段
- `paymentMethod`: 支付方式（WECHAT/ALIPAY）
- `paymentStatus`: 支付状态（PENDING/SUCCESS/FAILED/TIMEOUT/CANCELLED）
- `paymentId`: 第三方支付ID
- `paidAt`: 支付成功时间
- `paymentTimeoutAt`: 支付超时时间

## 后续优化建议

1. 添加支付退款功能
2. 支持多种支付方式组合
3. 添加支付对账功能
4. 实现支付失败重试机制
5. 添加支付通知功能（短信/邮件）
