import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const orderItemSchema = z.object({
  skuId: z.string().nullable(),
  bundleId: z.string().nullable(),
  productName: z.string(),
  packaging: z.string(),
  spec: z.string(),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
}).refine(data => data.skuId || data.bundleId, {
  message: "必须提供 skuId 或 bundleId"
});

const orderSchema = z.object({
  ownerId: z.string(),
  warehouseId: z.string(),
  receiver: z.string(),
  phone: z.string(),
  province: z.string(),
  city: z.string(),
  address: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  items: z.array(orderItemSchema).min(1),
  status: z.string().optional(),
  orderNo: z.string().optional(),
});

function generateOrderNo(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${year}${month}${day}${random}`;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { orderNo, ownerId, status, startDate, endDate } = req.query;
    
    const where: any = {};
    if (orderNo) where.orderNo = { contains: String(orderNo) };
    if (ownerId) where.ownerId = String(ownerId);
    if (status) where.status = String(status);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        owner: true,
        warehouse: true,
        items: {
          include: {
            sku: true,
            bundle: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        owner: true,
        warehouse: true,
        items: {
          include: {
            sku: true,
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
        dispatchOrders: {
          include: {
            dispatch: {
              include: {
                vehicle: true,
                driver: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const pickOrders = await prisma.pickOrder.findMany({
      where: {
        orderIds: {
          contains: id,
        },
      },
    });

    const matchedPickOrder = pickOrders.find((po: any) =>
      po.orderIds.split(',').map((oid: string) => oid.trim()).includes(id)
    );

    const picking = matchedPickOrder ? {
      id: matchedPickOrder.id,
      pickingNo: matchedPickOrder.pickNo,
      status: matchedPickOrder.status,
    } : null;

    const dispatch = order.dispatchOrders?.[0]?.dispatch ? {
      id: order.dispatchOrders[0].dispatch.id,
      dispatchNo: order.dispatchOrders[0].dispatch.dispatchNo,
      status: order.dispatchOrders[0].dispatch.status,
      vehicle: order.dispatchOrders[0].dispatch.vehicle ? {
        licensePlate: order.dispatchOrders[0].dispatch.vehicle.licensePlate,
        vehicleType: order.dispatchOrders[0].dispatch.vehicle.vehicleType,
      } : null,
      driver: order.dispatchOrders[0].dispatch.driver ? {
        name: order.dispatchOrders[0].dispatch.driver.name,
        phone: order.dispatchOrders[0].dispatch.driver.phone,
      } : null,
    } : null;

    res.json({ success: true, data: { ...order, picking, dispatch } });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = orderSchema.parse(req.body);

    let totalAmount = 0;
    for (const item of data.items) {
      totalAmount += item.price * item.quantity;
    }

    const skuItems = data.items.filter(i => i.skuId);
    const bundleItems = data.items.filter(i => i.bundleId);

    const order = await prisma.$transaction(async (tx: typeof prisma) => {
      if (skuItems.length > 0) {
        const availableStocks = await tx.stock.aggregate({
          where: {
            skuId: { in: skuItems.map(i => i.skuId!).filter(Boolean) as string[] },
            warehouseId: data.warehouseId,
          },
          _sum: { availableQuantity: true },
        });
        
        const totalAvailable = availableStocks._sum.availableQuantity || 0;
        const totalRequested = skuItems.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalAvailable < totalRequested) {
          throw new Error(`库存不足，当前可用: ${totalAvailable}`);
        }
      }

      if (bundleItems.length > 0) {
        for (const item of bundleItems) {
          const bundleStock = await tx.bundleStock.aggregate({
            where: {
              bundleId: item.bundleId!,
              warehouseId: data.warehouseId,
            },
            _sum: { availableQuantity: true },
          });
          
          const totalAvailable = bundleStock._sum.availableQuantity || 0;
          if (totalAvailable < item.quantity) {
            throw new Error(`套装 ${item.productName} 库存不足，当前可用: ${totalAvailable}`);
          }
        }
      }

      const newOrder = await tx.order.create({
        data: {
          orderNo: data.orderNo || generateOrderNo(),
          ownerId: data.ownerId,
          warehouseId: data.warehouseId,
          receiver: data.receiver,
          phone: data.phone,
          province: data.province,
          city: data.city,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          totalAmount,
          status: data.status || 'PENDING',
          items: {
            create: data.items.map(item => ({
              skuId: item.skuId,
              bundleId: item.bundleId,
              productName: item.productName,
              packaging: item.packaging,
              spec: item.spec,
              price: item.price,
              quantity: item.quantity,
              subtotal: item.price * item.quantity,
            })),
          },
        },
      });

      for (const item of data.items) {
        if (item.skuId) {
          const allStocks = await tx.stock.findMany({
            where: {
              skuId: item.skuId!,
              warehouseId: data.warehouseId,
              availableQuantity: { gt: 0 },
            },
            orderBy: { availableQuantity: 'desc' },
          });

          let remainingQuantity = item.quantity;
          const fullStock = allStocks.find(s => s.availableQuantity >= item.quantity);
          if (fullStock) {
            await tx.stock.update({
              where: { id: fullStock.id },
              data: {
                lockedQuantity: { increment: item.quantity },
                availableQuantity: { decrement: item.quantity },
              },
            });
            await tx.stockLock.create({
              data: {
                skuId: item.skuId!,
                orderId: newOrder.id,
                warehouseId: data.warehouseId,
                shelfId: fullStock.shelfId,
                quantity: item.quantity,
                status: 'LOCKED',
              },
            });
          } else {
            for (const stock of allStocks) {
              if (remainingQuantity <= 0) break;
              const lockQuantity = Math.min(stock.availableQuantity, remainingQuantity);
              await tx.stock.update({
                where: { id: stock.id },
                data: {
                  lockedQuantity: { increment: lockQuantity },
                  availableQuantity: { decrement: lockQuantity },
                },
              });
              await tx.stockLock.create({
                data: {
                  skuId: item.skuId!,
                  orderId: newOrder.id,
                  warehouseId: data.warehouseId,
                  shelfId: stock.shelfId,
                  quantity: lockQuantity,
                  status: 'LOCKED',
                },
              });
              remainingQuantity -= lockQuantity;
            }
          }
        }

        if (item.bundleId) {
          const bundleStocks = await tx.bundleStock.findMany({
            where: {
              bundleId: item.bundleId!,
              warehouseId: data.warehouseId,
              availableQuantity: { gt: 0 },
            },
            orderBy: { availableQuantity: 'desc' },
          });
          
          let remainingQuantity = item.quantity;
          for (const bs of bundleStocks) {
            if (remainingQuantity <= 0) break;
            const lockQuantity = Math.min(bs.availableQuantity, remainingQuantity);
            await tx.bundleStock.update({
              where: { id: bs.id },
              data: {
                lockedQuantity: { increment: lockQuantity },
                availableQuantity: { decrement: lockQuantity },
              },
            });
            await tx.bundleStockLock.create({
              data: {
                bundleId: item.bundleId!,
                orderId: newOrder.id,
                warehouseId: data.warehouseId,
                shelfId: bs.shelfId,
                quantity: lockQuantity,
              },
            });
            remainingQuantity -= lockQuantity;
          }
          
          if (remainingQuantity > 0) {
            throw new Error(`套装 ${item.productName} 库存不足，缺少: ${remainingQuantity}`);
          }
        }
      }

      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          owner: true,
          warehouse: true,
          items: {
            include: {
              sku: true,
              bundle: true,
            },
          },
        },
      });
    });

    res.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Create order error:', error);
    const message = error instanceof Error ? error.message : '服务器错误';
    res.status(400).json({ success: false, message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { receiver, phone, province, city, address, latitude, longitude } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: {
        receiver,
        phone,
        province,
        city,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    res.json({ success: true, data: order });
  } catch (error: any) {
    console.error('Update order error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.$transaction(async (tx: typeof prisma) => {
      const existingOrder = await tx.order.findUnique({
        where: { id },
        include: { 
          items: true,
          stockLocks: true,
          bundleStockLocks: true,
        },
      });

      if (!existingOrder) {
        throw new Error('订单不存在');
      }

      if (status === 'CANCELLED' && existingOrder.status !== 'CANCELLED' && existingOrder.status !== 'DELIVERED' && existingOrder.status !== 'IN_TRANSIT') {
        if (existingOrder.pickOrder && existingOrder.pickOrder.status !== 'PICKED') {
          await tx.pickOrder.update({
            where: { id: existingOrder.pickOrder.id },
            data: { status: 'CANCELLED' },
          });
        }

        const stockLocks = await tx.stockLock.findMany({
          where: { orderId: existingOrder.id },
        });

        for (const lock of stockLocks) {
          if (lock.shelfId) {
            await tx.stock.updateMany({
              where: {
                skuId: lock.skuId,
                warehouseId: lock.warehouseId,
                shelfId: lock.shelfId,
              },
              data: {
                lockedQuantity: { decrement: lock.quantity },
                availableQuantity: { increment: lock.quantity },
              },
            });
          }
          await tx.stockLock.delete({ where: { id: lock.id } });
        }

        const bundleStockLocks = await tx.bundleStockLock.findMany({
          where: { orderId: existingOrder.id },
        });

        for (const lock of bundleStockLocks) {
          if (lock.shelfId) {
            await tx.bundleStock.updateMany({
              where: {
                bundleId: lock.bundleId,
                warehouseId: lock.warehouseId,
                shelfId: lock.shelfId,
              },
              data: {
                lockedQuantity: { decrement: lock.quantity },
                availableQuantity: { increment: lock.quantity },
              },
            });
          } else {
            await tx.bundleStock.updateMany({
              where: {
                bundleId: lock.bundleId,
                warehouseId: lock.warehouseId,
              },
              data: {
                lockedQuantity: { decrement: lock.quantity },
                availableQuantity: { increment: lock.quantity },
              },
            });
          }
          await tx.bundleStockLock.delete({ where: { id: lock.id } });
        }
      }

      if (status === 'DISPATCHING') {
        const stockLocks = await tx.stockLock.findMany({
          where: { orderId: existingOrder.id },
        });

        for (const lock of stockLocks) {
          if (lock.shelfId) {
            await tx.stock.updateMany({
              where: {
                skuId: lock.skuId,
                warehouseId: lock.warehouseId,
                shelfId: lock.shelfId,
              },
              data: {
                totalQuantity: { decrement: lock.quantity },
                lockedQuantity: { decrement: lock.quantity },
              },
            });
          }
          await tx.stockLock.delete({ where: { id: lock.id } });
        }

        const bundleStockLocks = await tx.bundleStockLock.findMany({
          where: { orderId: existingOrder.id },
        });

        for (const lock of bundleStockLocks) {
          if (lock.shelfId) {
            await tx.bundleStock.updateMany({
              where: {
                bundleId: lock.bundleId,
                warehouseId: lock.warehouseId,
                shelfId: lock.shelfId,
              },
              data: {
                totalQuantity: { decrement: lock.quantity },
                lockedQuantity: { decrement: lock.quantity },
              },
            });
          } else {
            await tx.bundleStock.updateMany({
              where: {
                bundleId: lock.bundleId,
                warehouseId: lock.warehouseId,
              },
              data: {
                totalQuantity: { decrement: lock.quantity },
                lockedQuantity: { decrement: lock.quantity },
              },
            });
          }
          await tx.bundleStockLock.delete({ where: { id: lock.id } });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status },
        include: {
          owner: true,
          items: true,
        },
      });
    });

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Update order status error:', error);
    const message = error instanceof Error ? error.message : '服务器错误';
    res.status(400).json({ success: false, message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.$transaction(async (tx: typeof prisma) => {
      const order = await tx.order.findUnique({ where: { id } });
      
      if (!order) {
        throw new Error('订单不存在');
      }
      
      if (order.status !== 'CANCELLED') {
        throw new Error('只有已取消的订单才能删除');
      }

      const stockLocks = await tx.stockLock.findMany({
        where: { orderId: id },
      });

      for (const lock of stockLocks) {
        if (lock.shelfId) {
          await tx.stock.updateMany({
            where: {
              skuId: lock.skuId,
              warehouseId: lock.warehouseId,
              shelfId: lock.shelfId,
            },
            data: {
              lockedQuantity: { decrement: lock.quantity },
              availableQuantity: { increment: lock.quantity },
            },
          });
        }
        await tx.stockLock.delete({ where: { id: lock.id } });
      }

      const pickOrders = await tx.pickOrder.findMany({ where: { orderIds: { contains: id } } });
      for (const pickOrder of pickOrders) {
        await tx.pickOrderItem.deleteMany({ where: { pickOrderId: pickOrder.id } });
        await tx.pickOrder.delete({ where: { id: pickOrder.id } });
      }
      await tx.order.delete({ where: { id } });
    });
    
    res.json({ success: true, message: '订单已删除' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
