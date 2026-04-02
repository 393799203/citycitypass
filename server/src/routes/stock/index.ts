import { Router } from 'express';
import inboundRouter from './inbound';
import outboundRouter from './outbound';
import transferRouter from './transfer';
import shippingRouter from './shipping';
import queryRouter from './query';

const router = Router();

// 入库相关路由 (inbound-order, stock-in)
router.use('/', inboundRouter);

// 出库相关路由 (stock-out, use, unlock, lock, bundle/*)
router.use('/', outboundRouter);

// 移库相关路由 (transfer) - 注意：此路由会被挂载到 /api/stock 下
router.use('/transfer', transferRouter);

// 发货相关路由 (shipping)
router.use('/', shippingRouter);

// 库存查询相关路由 (/, /available, /owner-stock-summary, /bundle, /sku/:id, /batch/*)
router.use('/', queryRouter);

export default router;