import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { lockStock } from '../../utils/stockHelpers';

const router = Router();

const lockStockSchema = z.object({
  skuId: z.string().min(1, 'SKU不能为空'),
  warehouseId: z.string().min(1, '仓库不能为空'),
  locationId: z.string().optional(),
  orderId: z.string().min(1, '订单不能为空'),
  quantity: z.number().int().positive('数量必须大于0'),
});

function getStockWhere(skuId: string, warehouseId: string, locationId?: string) {
  return {
    skuId,
    warehouseId,
    locationId: locationId || null,
  };
}

// GET /stock-out
router.get('/stock-out', async (req: Request, res: Response) => {
  try {
    const { warehouseId, skuId, ownerId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (skuId) where.skuId = skuId as string;
    if (ownerId) {
      const warehouses = await prisma.warehouse.findMany({
        where: { ownerId: ownerId as string },
        select: { id: true },
      });
      const warehouseIds = warehouses.map(w => w.id);
      if (warehouseIds.length > 0) {
        where.warehouseId = { in: warehouseIds };
      } else {
        where.warehouseId = 'none-matching';
      }
    }

    const stockOuts = await (prisma.stockOut.findMany as any)({
      where,
      include: {
        skuBatch: true,
        bundleBatch: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: stockOuts });
  } catch (error) {
    console.error('Get stock-outs error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /out
router.get('/out', async (req: Request, res: Response) => {
  try {
    const { warehouseId, startDate, endDate, orderId, ownerId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (orderId) where.orderId = orderId as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (ownerId) {
      const warehouses = await prisma.warehouse.findMany({
        where: { ownerId: ownerId as string },
        select: { id: true },
      });
      const warehouseIds = warehouses.map(w => w.id);
      if (warehouseIds.length > 0) {
        where.warehouseId = { in: warehouseIds };
      } else {
        where.warehouseId = 'none-matching';
      }
    }

    const stockOuts = await prisma.stockOut.findMany({
      where,
      include: {
        skuBatch: true,
        bundleBatch: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const warehouseIds = [...new Set(stockOuts.map(s => s.warehouseId))];
    const skuIds = stockOuts.filter(s => s.skuId).map(s => s.skuId);
    const bundleIds = stockOuts.filter(s => s.bundleId).map(s => s.bundleId);
    const locationIds = stockOuts.filter(s => s.locationId).map(s => s.locationId);
    const orderIds = [...new Set(stockOuts.map(s => s.orderId))];

    const [warehouses, skus, bundles, locations, orders] = await Promise.all([
      warehouseIds.length ? prisma.warehouse.findMany({ where: { id: { in: warehouseIds as string[] } } }) : [],
      skuIds.length ? prisma.productSKU.findMany({ where: { id: { in: skuIds as string[] } }, include: { product: true } }) : [],
      bundleIds.length ? prisma.bundleSKU.findMany({ where: { id: { in: bundleIds as string[] } }, include: { items: { include: { sku: { include: { product: true } } } } } }) : [],
      locationIds.length ? prisma.location.findMany({ where: { id: { in: locationIds as string[] } }, include: { shelf: { include: { zone: true } } } }) : [],
      orderIds.length ? prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : [],
    ]);

    const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]));
    const skuMap = Object.fromEntries(skus.map(s => [s.id, s]));
    const bundleMap = Object.fromEntries(bundles.map(b => [b.id, b]));
    const locationMap = Object.fromEntries(locations.map(l => [l.id, l]));
    const orderMap = Object.fromEntries(orders.map(o => [o.id, o]));

    const result = stockOuts.map(out => ({
      ...out,
      warehouse: warehouseMap[out.warehouseId],
      sku: out.skuId ? skuMap[out.skuId] : null,
      bundle: out.bundleId ? bundleMap[out.bundleId] : null,
      location: out.locationId ? locationMap[out.locationId] : null,
      order: orderMap[out.orderId] || null,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('List stock out error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /use
router.post('/use', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: '订单ID不能为空' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const locks = await tx.stockLock.findMany({
        where: { orderId, status: 'LOCKED' },
      });

      for (const lock of locks) {
        const stock = await tx.stock.findFirst({
          where: getStockWhere(lock.skuId, lock.warehouseId, lock.locationId || undefined),
        });

        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              totalQuantity: stock.totalQuantity - lock.quantity,
              lockedQuantity: stock.lockedQuantity - lock.quantity,
            },
          });

          await tx.stockOut.create({
            data: {
              orderId: lock.orderId,
              skuId: lock.skuId,
              warehouseId: lock.warehouseId,
              locationId: lock.locationId,
              skuBatchId: lock.skuBatchId,
              quantity: lock.quantity,
            },
          });
        }

        await tx.stockLock.update({
          where: { id: lock.id },
          data: { status: 'USED' },
        });
      }

      return locks;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Use stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /unlock
router.post('/unlock', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: '订单ID不能为空' });
    }

    const { unlockStock } = await import('../../utils/stockHelpers');

    const result = await prisma.$transaction(async (tx) => {
      const locks = await tx.stockLock.findMany({
        where: { orderId, status: 'LOCKED' },
      });

      for (const lock of locks) {
        await unlockStock(tx, {
          type: 'PRODUCT',
          skuId: lock.skuId,
          warehouseId: lock.warehouseId,
          locationId: lock.locationId || '',
          quantity: lock.quantity,
        });

        await tx.stockLock.update({
          where: { id: lock.id },
          data: { status: 'RELEASED' },
        });
      }

      return locks;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Unlock stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /bundle/unlock
router.post('/bundle/unlock', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: '订单ID不能为空' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const locks = await tx.bundleStockLock.findMany({
        where: { orderId },
      });

      for (const lock of locks) {
        const bundleStock = await tx.bundleStock.findFirst({
          where: { bundleId: lock.bundleId, warehouseId: lock.warehouseId, locationId: lock.locationId || null },
        });

        if (bundleStock) {
          const newLockedQty = Math.max(0, bundleStock.lockedQuantity - lock.quantity);
          await tx.bundleStock.update({
            where: { id: bundleStock.id },
            data: {
              lockedQuantity: newLockedQty,
              availableQuantity: bundleStock.availableQuantity + (bundleStock.lockedQuantity - newLockedQty),
            },
          });
        }

        await tx.bundleStockLock.delete({ where: { id: lock.id } });
      }

      return locks;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Unlock bundle stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /bundle/use
router.post('/bundle/use', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: '订单ID不能为空' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const locks = await tx.bundleStockLock.findMany({
        where: { orderId },
      });

      for (const lock of locks) {
        const bundleStock = await tx.bundleStock.findFirst({
          where: { bundleId: lock.bundleId, warehouseId: lock.warehouseId, locationId: lock.locationId || null },
        });

        if (bundleStock) {
          await tx.bundleStock.update({
            where: { id: bundleStock.id },
            data: {
              totalQuantity: bundleStock.totalQuantity - lock.quantity,
              lockedQuantity: bundleStock.lockedQuantity - lock.quantity,
            },
          });

          await tx.stockOut.create({
            data: {
              orderId: lock.orderId,
              bundleId: lock.bundleId,
              warehouseId: lock.warehouseId,
              locationId: lock.locationId || undefined,
              skuBatchId: '',
              bundleBatchId: lock.bundleBatchId || '',
              quantity: lock.quantity,
            },
          });
        }

        await tx.bundleStockLock.delete({ where: { id: lock.id } });
      }

      return locks;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Use bundle stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /lock
router.post('/lock', async (req: Request, res: Response) => {
  try {
    const data = lockStockSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const stock = await lockStock(tx, {
        type: 'PRODUCT',
        skuId: data.skuId,
        warehouseId: data.warehouseId,
        locationId: data.locationId || '',
        quantity: data.quantity,
      });

      const stockLock = await tx.stockLock.create({
        data: {
          skuId: data.skuId,
          orderId: data.orderId,
          warehouseId: data.warehouseId,
          locationId: data.locationId || null,
          skuBatchId: stock.skuBatchId,
          quantity: data.quantity,
          status: 'LOCKED',
        },
      });

      return stockLock;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Lock stock error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /bundle/lock
router.post('/bundle/lock', async (req: Request, res: Response) => {
  try {
    const { bundleId, warehouseId, locationId, quantity, orderId } = req.body;
    if (!bundleId || !warehouseId || !quantity || !orderId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const bundleStock = await tx.bundleStock.findFirst({
        where: { bundleId, warehouseId, locationId: locationId || null },
      });

      if (!bundleStock || bundleStock.availableQuantity < quantity) {
        throw new Error('套装库存不足');
      }

      const stockLock = await tx.bundleStockLock.create({
        data: {
          bundleId,
          orderId,
          warehouseId,
          locationId: locationId || undefined,
          bundleBatchId: bundleStock.bundleBatchId,
          quantity,
        },
      });

      await tx.bundleStock.update({
        where: { id: bundleStock.id },
        data: {
          lockedQuantity: bundleStock.lockedQuantity + quantity,
          availableQuantity: bundleStock.availableQuantity - quantity,
        },
      });

      return stockLock;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Lock bundle stock error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;