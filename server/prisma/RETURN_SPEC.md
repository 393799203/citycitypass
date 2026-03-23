# 退货功能规格

## 核心目标
退货闭环管理：客户发起 → 仓库验收 → 退货入库 → 财务退款

## 数据模型

### ReturnOrder (退货单)
- id, returnNo (退货单号)
- orderId (原订单ID)
- ownerId, warehouseId
- status: RETURN_REQUESTED → RETURN_QUALIFIED → RETURN_STOCK_IN → REFUNDED
- reason (退货原因)
- refundAmount (退款金额)
- refundStatus: PENDING → PROCESSING → COMPLETED
- createdAt, updatedAt

### ReturnItem (退货商品)
- id, returnOrderId
- orderItemId (原订单商品ID)
- skuId / bundleId
- quantity (退货数量)
- returnQuantity (已退数量)
- qualifiedQuantity (合格数量)
- rejectedQuantity (拒收数量)
- remark

### ReturnLog (退货日志)
- id, returnOrderId
- action (操作类型)
- operator (操作人)
- beforeStatus, afterStatus
- remark
- createdAt

## 退货区隔离

### ZoneType 新增
- RETURN_RECEIVING (退货收货区)
- RETURN_QUALIFIED (合格品区)
- RETURN_REJECTED (拒收区)

### 退货库存逻辑
- 退货验收时，商品进入 RETURN_RECEIVING 区
- 验收合格后，进入 RETURN_QUALIFIED 区
- 验收不合格，进入 RETURN_REJECTED 区
- 退货入库时，从 RETURN_QUALIFIED 区出库到正常库存

## 退货流程状态

1. **RETURN_REQUESTED** - 客户发起退货申请
2. **RETURN_SHIPPED** - 客户已发货/等待仓库收货
3. **RETURN_RECEIVING** - 仓库收货中
4. **RETURN_QUALIFIED** - 验收合格
5. **RETURN_REJECTED** - 验收拒收
6. **RETURN_STOCK_IN** - 退货入库完成
7. **REFUND_PENDING** - 退款待处理
8. **REFUNDED** - 退款完成

## 前端页面

### 退货管理入口
- 在"订单管理"页面，已完成订单显示"申请退货"按钮

### 退货列表页 /returns
- 状态筛选
- 时间筛选
- 列表展示退货单

### 退货详情页 /returns/:id
- 显示原订单信息
- 显示退货商品明细及验收状态
- 显示操作日志
- 可执行操作按钮

## API 路由

### POST /api/returns - 创建退货申请
### GET /api/returns - 退货列表
### GET /api/returns/:id - 退货详情
### PUT /api/returns/:id/receive - 仓库收货
### PUT /api/returns/:id/qualify - 验收确认
### PUT /api/returns/:id/stock-in - 退货入库
### PUT /api/returns/:id/refund - 退款确认
