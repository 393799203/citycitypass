import { Router } from 'express';
import prisma from '../lib/prisma';
import { success, error } from '../utils/response';

const router = Router();

router.get('/', async (req, res) => {
  try {
    if ((req as any).ownerAccessDenied) {
      return success(res, [], 0);
    }

    const { status, startDate, endDate, page = 1, pageSize = 20, ownerId } = req.query;
    const where: any = {};
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [data, total] = await Promise.all([
      prisma.returnOrder.findMany({
        where,
        include: {
          order: {
            include: {
              items: true,
            },
          },
          warehouse: true,
          items: {
            include: {
              sku: {
                include: { product: true }
              },
              bundle: {
                include: {
                  items: {
                    include: {
                      sku: {
                        include: { product: true }
                      }
                    }
                  }
                }
              },
            },
          },
          logs: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.returnOrder.count({ where }),
    ]);

    const orderIds = data.map((r: any) => r.orderId);
    const stockOuts = await prisma.stockOut.findMany({
      where: { orderId: { in: orderIds } },
      include: { skuBatch: true, bundleBatch: true },
    }) as any[];

    const dataWithPrice = data.map((returnOrder: any) => {
      const orderItemPrices: Record<string, any> = {};
      if (returnOrder.order?.items) {
        for (const item of returnOrder.order.items) {
          orderItemPrices[item.id] = item.price;
        }
      }
      const returnStockOuts = stockOuts.filter((so: any) => so.orderId === returnOrder.orderId);
      return {
        ...returnOrder,
        items: returnOrder.items.map((item: any) => {
          const stockOut = returnStockOuts.find((so: any) => so.id === item.stockOutId);
          return {
            ...item,
            unitPrice: orderItemPrices[item.orderItemId] || 0,
            skuBatchId: stockOut?.skuBatchId || null,
            skuBatch: stockOut?.skuBatch || null,
            bundleBatchId: stockOut?.bundleBatchId || null,
            bundleBatch: stockOut?.bundleBatch || null,
            stockOutQuantity: stockOut?.quantity || null,
          };
        }),
      };
    });

    res.json(success({ data: dataWithPrice, total, page: Number(page), pageSize: Number(pageSize) }));
  } catch (err: any) {
    console.error('List returns error:', err);
    res.status(500).json(error('获取退货列表失败'));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const returnOrder = await prisma.returnOrder.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                sku: true,
                bundle: true,
              },
            },
          },
        },
        warehouse: true,
        items: {
          include: {
            sku: {
              include: { product: true }
            },
            bundle: {
              include: {
                items: {
                  include: {
                    sku: {
                      include: { product: true }
                    }
                  }
                }
              }
            },
          },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!returnOrder) {
      return res.status(404).json(error('退货单不存在'));
    }

    const orderItemPrices: Record<string, any> = {};
    if (returnOrder.order?.items) {
      for (const item of returnOrder.order.items) {
        orderItemPrices[item.id] = item.price;
      }
    }

    const stockOuts = await prisma.stockOut.findMany({
      where: { orderId: returnOrder.orderId },
      include: { skuBatch: true, bundleBatch: true },
    }) as any[];

    const itemsWithBatch = returnOrder.items.map((item: any) => {
      const stockOut = stockOuts.find((so: any) => so.id === item.stockOutId);
      return {
        ...item,
        unitPrice: orderItemPrices[item.orderItemId] || 0,
        skuBatchId: stockOut?.skuBatchId || null,
        skuBatch: stockOut?.skuBatch || null,
        bundleBatchId: stockOut?.bundleBatchId || null,
        bundleBatch: stockOut?.bundleBatch || null,
        stockOutQuantity: stockOut?.quantity || null,
      };
    });

    const result = { ...returnOrder, items: itemsWithBatch };
    res.json(success(result));
  } catch (err: any) {
    console.error('Get return error:', err);
    res.status(500).json(error('获取退货详情失败'));
  }
});

router.post('/', async (req, res) => {
  try {
    const { orderId, reason, items } = req.body;
    const ownerId = (req as any).user?.ownerId;
    const operatorName = (req as any).user?.name;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            sku: {
              include: { product: true }
            },
            bundle: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(400).json(error('订单不存在'));
    }

    if (!['COMPLETED', 'DELIVERED'].includes(order.status)) {
      return res.status(400).json(error('只有已完成或已送达的订单可以申请退货'));
    }

    const existingReturn = await prisma.returnOrder.findFirst({
      where: {
        orderId,
        status: { not: 'CANCELLED' },
      },
    });
    if (existingReturn) {
      return res.status(400).json(error('该订单已有进行中的退货申请'));
    }

    const returnNo = `RET${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'RETURNING' },
    });

    const stockOuts = await prisma.stockOut.findMany({
      where: { orderId },
    });

    let returnItems: any[] = [];
    if (items && items.length > 0) {
      returnItems = items.map((item: any) => ({
        orderItemId: item.orderItemId,
        skuId: item.skuId || null,
        bundleId: item.bundleId || null,
        productName: item.productName,
        packaging: item.packaging,
        spec: item.spec,
        quantity: item.quantity,
      }));
    } else {
      for (const orderItem of order.items) {
        const matchingStockOuts = stockOuts.filter(
          (so) => orderItem.skuId ? so.skuId === orderItem.skuId : orderItem.bundleId ? so.bundleId === orderItem.bundleId : false
        );
        if (matchingStockOuts.length > 0) {
          for (const so of matchingStockOuts) {
            returnItems.push({
              orderItemId: orderItem.id,
              skuId: orderItem.skuId || null,
              bundleId: orderItem.bundleId || null,
              productName: orderItem.sku?.product?.name || orderItem.bundle?.name || '',
              packaging: orderItem.sku?.packaging || orderItem.bundle?.packaging || '',
              spec: orderItem.sku?.spec || orderItem.bundle?.spec || '',
              quantity: so.quantity,
              stockOutId: so.id,
            });
          }
        }
      }
    }

    const returnOrder = await prisma.returnOrder.create({
      data: {
        returnNo,
        orderId,
        ownerId: order.ownerId,
        warehouseId: order.warehouseId,
        status: 'RETURN_REQUESTED',
        reason,
        receiverName: order.receiver,
        receiverPhone: order.phone,
        receiverAddress: `${order.province}${order.city}${order.address}`,
        operatorName,
        items: {
          create: returnItems,
        },
        logs: {
          create: {
            action: 'CREATE',
            afterStatus: 'RETURN_REQUESTED',
            operatorName,
            remark: `客户申请退货: ${reason}`,
          },
        },
      },
      include: {
        items: true,
        logs: true,
      },
    });

    res.json(success(returnOrder));
  } catch (err: any) {
    console.error('Create return error:', err);
    res.status(500).json(error('创建退货单失败'));
  }
});

router.put('/:id/receive', async (req, res) => {
  try {
    const { id } = req.params;
    const { trackingNo, logisticsCompany } = req.body;
    const operatorName = (req as any).user?.name;

    const returnOrder = await prisma.returnOrder.findUnique({ where: { id } });
    if (!returnOrder) {
      return res.status(404).json(error('退货单不存在'));
    }

    if (returnOrder.status === 'RETURN_REQUESTED') {
       const updated = await prisma.returnOrder.update({
         where: { id },
         data: {
           status: 'RETURN_SHIPPED',
           trackingNo,
           logisticsCompany,
           logs: {
             create: {
               action: 'SHIPPED',
               beforeStatus: returnOrder.status,
               afterStatus: 'RETURN_SHIPPED',
               operatorName,
               remark: `客户填写快递: ${trackingNo || '无'}, 物流公司: ${logisticsCompany || '无'}`,
             },
           },
         },
         include: {
           items: true,
           logs: true,
         },
       });
       return res.json(success(updated));
     }

     if (returnOrder.status === 'RETURN_SHIPPED') {
       const updated = await prisma.returnOrder.update({
         where: { id },
         data: {
           status: 'RETURN_RECEIVING',
           logs: {
             create: {
               action: 'RECEIVE',
               beforeStatus: returnOrder.status,
               afterStatus: 'RETURN_RECEIVING',
               operatorName,
               remark: `仓库确认收货`,
             },
           },
         },
         include: {
           items: true,
           logs: true,
         },
       });
       return res.json(success(updated));
     }

    return res.status(400).json(error('当前状态不允许操作'));
  } catch (err: any) {
    console.error('Receive return error:', err);
    res.status(500).json(error('操作失败'));
  }
});

router.put('/:id/qualify', async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const operatorName = (req as any).user?.name;

    const returnOrder = await prisma.returnOrder.findUnique({ where: { id } });
    if (!returnOrder) {
      return res.status(404).json(error('退货单不存在'));
    }

    if (!['RETURN_SHIPPED', 'RETURN_RECEIVING'].includes(returnOrder.status)) {
      return res.status(400).json(error('当前状态不允许验收'));
    }

    const qualifiedItems = items || [];
    const updatedReturnItems: any[] = [];

    for (const item of qualifiedItems) {
      const updated = await prisma.returnItem.update({
        where: { id: item.id },
        data: {
          qualifiedQuantity: item.qualifiedQuantity || 0,
          rejectedQuantity: item.rejectedQuantity || 0,
          remark: item.remark,
        },
      });
      updatedReturnItems.push(updated);
    }

    const totalQty = updatedReturnItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalQualified = updatedReturnItems.reduce((sum, i) => sum + (i.qualifiedQuantity || 0), 0);
    const totalRejected = updatedReturnItems.reduce((sum, i) => sum + (i.rejectedQuantity || 0), 0);

    let newStatus = 'RETURN_QUALIFIED';
    if (totalRejected === totalQty) {
      newStatus = 'RETURN_REJECTED';
    } else if (totalRejected > 0) {
      newStatus = 'RETURN_PARTIAL_QUALIFIED';
    }

    const afterStatus = newStatus;
    const action = totalRejected === 0 ? 'QUALIFY' : totalQualified === 0 ? 'REJECT' : 'PARTIAL';
    const remark = totalRejected === 0 ? '验收合格' : totalQualified === 0 ? '全部拒收' : '部分合格';

    const updated = await prisma.returnOrder.update({
      where: { id },
      data: {
        status: newStatus as any,
        logs: {
          create: {
            action: action as any,
            beforeStatus: returnOrder.status,
            afterStatus: afterStatus as any,
            operatorName,
            remark,
          },
        },
      },
      include: {
        items: {
          include: {
            sku: { include: { product: true } },
            bundle: {
              include: {
                items: {
                  include: { sku: { include: { product: true } } }
                }
              }
            },
          },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const order = await prisma.order.findUnique({
      where: { id: updated.orderId },
      include: { items: true },
    });

    const orderItemPrices: Record<string, any> = {};
    if (order?.items) {
      for (const item of order.items) {
        orderItemPrices[item.id] = item.price;
      }
    }

    const stockOuts = await prisma.stockOut.findMany({
      where: { orderId: updated.orderId },
      include: { skuBatch: true, bundleBatch: true },
    });

    const itemsWithBatch = updated.items.map((item: any) => {
      const stockOut = stockOuts.find((so: any) => so.id === item.stockOutId);
      return {
        ...item,
        unitPrice: orderItemPrices[item.orderItemId] || 0,
        skuBatchId: stockOut?.skuBatchId || null,
        skuBatch: stockOut?.skuBatch || null,
        bundleBatchId: stockOut?.bundleBatchId || null,
        bundleBatch: stockOut?.bundleBatch || null,
        stockOutQuantity: stockOut?.quantity || null,
      };
    });

    const result = { ...updated, items: itemsWithBatch };
    res.json(success(result));
  } catch (err: any) {
    console.error('Qualify return error:', err.message, err.stack);
    res.status(500).json(error('验收确认失败: ' + err.message));
  }
});

router.put('/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const { refundAmount, remark } = req.body;
    const operatorName = (req as any).user?.name;

    const returnOrder = await prisma.returnOrder.findUnique({ 
      where: { id },
      include: { order: true }
    });
    if (!returnOrder) {
      return res.status(404).json(error('退货单不存在'));
    }

    if (returnOrder.status !== 'RETURN_STOCK_IN' && returnOrder.status !== 'RETURN_REJECTED') {
      return res.status(400).json(error('当前状态不允许退款'));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const retOrder = await tx.returnOrder.update({
        where: { id },
        data: {
          status: 'REFUNDED',
          refundStatus: 'COMPLETED',
          refundAmount: refundAmount || returnOrder.order?.totalAmount,
          logs: {
            create: {
              action: 'REFUND',
              beforeStatus: returnOrder.status,
              afterStatus: 'REFUNDED',
              operatorName,
              remark: remark || `退款金额: ¥${refundAmount || returnOrder.order?.totalAmount}`,
            },
          },
        },
        include: {
          items: true,
          logs: true,
        },
      });

      await tx.order.update({
        where: { id: returnOrder.orderId },
        data: { status: 'RETURNED' },
      });

      return retOrder;
    });

    res.json(success(updated));
  } catch (err: any) {
    console.error('Refund return error:', err.message, err.stack);
    res.status(500).json(error('退款确认失败: ' + (err.message || '未知错误')));
  }
});

router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operatorName = (req as any).user?.name;

    const returnOrder = await prisma.returnOrder.findUnique({ where: { id } });
    if (!returnOrder) {
      return res.status(404).json(error('退货单不存在'));
    }

    if (['RETURN_STOCK_IN', 'REFUNDED', 'RETURN_STOCK_IN'].includes(returnOrder.status)) {
      return res.status(400).json(error('当前状态不允许取消'));
    }

    await prisma.$transaction(async (tx) => {
      await tx.returnOrder.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          logs: {
            create: {
              action: 'CANCEL',
              beforeStatus: returnOrder.status,
              afterStatus: 'CANCELLED',
              operatorName,
              remark: reason || '用户取消退货',
            },
          },
        },
      });

      await tx.order.update({
        where: { id: returnOrder.orderId },
        data: { status: 'COMPLETED' },
      });
    });

    res.json(success({ message: '退货已取消' }));
  } catch (err: any) {
    console.error('Cancel return error:', err);
    res.status(500).json(error('取消退货失败'));
  }
});

export default router;
