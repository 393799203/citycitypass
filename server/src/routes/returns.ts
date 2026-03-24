import { Router } from 'express';
import prisma from '../lib/prisma';
import { success, error } from '../utils/response';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    const ownerId = (req as any).user?.ownerId;

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

    const dataWithPrice = data.map((returnOrder: any) => {
      const orderItemPrices: Record<string, any> = {};
      if (returnOrder.order?.items) {
        for (const item of returnOrder.order.items) {
          orderItemPrices[item.id] = item.price;
        }
      }
      return {
        ...returnOrder,
        items: returnOrder.items.map((item: any) => ({
          ...item,
          unitPrice: orderItemPrices[item.orderItemId] || 0,
        })),
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

    const returnWithPrice = {
      ...returnOrder,
      items: returnOrder.items.map((item: any) => ({
        ...item,
        unitPrice: orderItemPrices[item.orderItemId] || 0,
      })),
    };

    res.json(success(returnWithPrice));
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
          create: items?.map((item: any) => ({
            orderItemId: item.orderItemId,
            skuId: item.skuId || null,
            bundleId: item.bundleId || null,
            productName: item.productName,
            packaging: item.packaging,
            spec: item.spec,
            quantity: item.quantity,
          })) || order.items.map(item => ({
            orderItemId: item.id,
            skuId: item.skuId || null,
            bundleId: item.bundleId || null,
            productName: item.sku?.product?.name || item.bundle?.name || '',
            packaging: item.sku?.packaging || item.bundle?.packaging || '',
            spec: item.sku?.spec || item.bundle?.spec || '',
            quantity: item.quantity,
          })),
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

    let newStatus: string = 'RETURN_QUALIFIED';
    let hasRejection = false;

    for (const item of items || []) {
      await prisma.returnItem.update({
        where: { id: item.id },
        data: {
          qualifiedQuantity: item.qualifiedQuantity || 0,
          rejectedQuantity: item.rejectedQuantity || 0,
          remark: item.remark,
        },
      });
      if ((item.rejectedQuantity || 0) > 0) {
        hasRejection = true;
      }
    }

    if (hasRejection) {
      newStatus = 'RETURN_REJECTED';
    }

    const updated = await prisma.returnOrder.update({
      where: { id },
      data: {
        status: newStatus as any,
        logs: {
          create: {
            action: hasRejection ? 'REJECT' : 'QUALIFY',
            beforeStatus: returnOrder.status,
            afterStatus: newStatus,
            operatorName,
            remark: hasRejection ? '部分商品验收不合格' : '验收合格',
          },
        },
      },
      include: {
        items: true,
        logs: true,
      },
    });

    res.json(success(updated));
  } catch (err: any) {
    console.error('Qualify return error:', err);
    res.status(500).json(error('验收确认失败'));
  }
});

router.put('/:id/stock-in', async (req, res) => {
  try {
    const { id } = req.params;
    const { locationId, items } = req.body;
    const operatorName = (req as any).user?.name;

    const returnOrder = await prisma.returnOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!returnOrder) {
      return res.status(404).json(error('退货单不存在'));
    }

    if (returnOrder.status !== 'RETURN_QUALIFIED') {
      return res.status(400).json(error('只有验收合格的退货才能入库'));
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { shelf: { include: { zone: true } } },
    });

    if (!location) {
      return res.status(400).json(error('库位不存在'));
    }

    for (const item of returnOrder.items) {
      const stockInQty = items?.find((i: any) => i.id === item.id)?.qualifiedQuantity || item.qualifiedQuantity;

      if (item.skuId) {
        const stock = await prisma.stock.findFirst({
          where: { skuId: item.skuId, locationId },
        });

        if (stock) {
          await prisma.stock.update({
            where: { id: stock.id },
            data: { 
              totalQuantity: { increment: stockInQty },
              availableQuantity: { increment: stockInQty }
            },
          });
        } else {
          await prisma.stock.create({
            data: {
              skuId: item.skuId,
              locationId,
              totalQuantity: stockInQty,
              availableQuantity: stockInQty,
              warehouseId: returnOrder.warehouseId,
            },
          });
        }
      } else if (item.bundleId) {
        const bundleStock = await prisma.bundleStock.findFirst({
          where: { bundleId: item.bundleId, locationId },
        });

        if (bundleStock) {
          await prisma.bundleStock.update({
            where: { id: bundleStock.id },
            data: { 
              totalQuantity: { increment: stockInQty },
              availableQuantity: { increment: stockInQty }
            },
          });
        } else {
          await prisma.bundleStock.create({
            data: {
              bundleId: item.bundleId,
              locationId,
              totalQuantity: stockInQty,
              availableQuantity: stockInQty,
              warehouseId: returnOrder.warehouseId,
            },
          });
        }
      }
    }

    const updated = await prisma.returnOrder.update({
      where: { id },
      data: {
        status: 'RETURN_STOCK_IN',
        logs: {
          create: {
            action: 'STOCK_IN',
            beforeStatus: returnOrder.status,
            afterStatus: 'RETURN_STOCK_IN',
            operatorName,
            remark: `入库到: ${location.shelf?.zone?.code || ''}-${location.shelf?.code || ''}-L${location.level}`,
          },
        },
      },
      include: {
        items: true,
        logs: true,
      },
    });

    res.json(success(updated));
  } catch (err: any) {
    console.error('Stock in return error:', err.message, err.stack);
    res.status(500).json(error('退货入库失败: ' + (err.message || '未知错误')));
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
