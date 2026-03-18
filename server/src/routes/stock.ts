import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const stockInSchema = z.object({
  skuId: z.string().min(1, 'SKU不能为空'),
  warehouseId: z.string().min(1, '仓库不能为空'),
  shelfId: z.string().optional(),
  quantity: z.number().int().positive('数量必须大于0'),
  batchNo: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  operator: z.string().optional(),
});

const lockStockSchema = z.object({
  skuId: z.string().min(1, 'SKU不能为空'),
  warehouseId: z.string().min(1, '仓库不能为空'),
  shelfId: z.string().optional(),
  orderId: z.string().min(1, '订单不能为空'),
  quantity: z.number().int().positive('数量必须大于0'),
});

function getStockUniqueKey(skuId: string, warehouseId: string, shelfId?: string) {
  return {
    skuId_warehouseId_shelfId: {
      skuId,
      warehouseId,
      shelfId: shelfId || null,
    },
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId, skuId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (skuId) where.skuId = skuId as string;

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        sku: {
          include: { product: true }
        },
        warehouse: true,
        shelf: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: stocks });
  } catch (error) {
    console.error('Get stocks error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/available', async (req: Request, res: Response) => {
  try {
    const { warehouseId, skuId } = req.query;
    if (!warehouseId || !skuId) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }

    const stocks = await prisma.stock.findMany({
      where: {
        skuId: skuId as string,
        warehouseId: warehouseId as string,
      },
    });

    const totalAvailable = stocks.reduce((sum, s) => sum + s.availableQuantity, 0);
    const totalLocked = stocks.reduce((sum, s) => sum + s.lockedQuantity, 0);
    const totalQuantity = stocks.reduce((sum, s) => sum + s.totalQuantity, 0);

    res.json({ 
      success: true, 
      data: {
        totalQuantity,
        lockedQuantity: totalLocked,
        availableQuantity: totalAvailable,
      }
    });
  } catch (error) {
    console.error('Get available stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/stock-in', async (req: Request, res: Response) => {
  try {
    const { warehouseId, skuId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (skuId) where.skuId = skuId as string;

    const stockIns = await prisma.stockIn.findMany({
      where,
      include: {
        sku: {
          include: { product: true }
        },
        warehouse: true,
        shelf: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: stockIns });
  } catch (error) {
    console.error('Get stock-ins error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/stock-in', async (req: Request, res: Response) => {
  try {
    const data = stockInSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      let stock = await tx.stock.findUnique({
        where: getStockUniqueKey(data.skuId, data.warehouseId, data.shelfId),
      });

      if (stock) {
        stock = await tx.stock.update({
          where: { id: stock.id },
          data: {
            totalQuantity: stock.totalQuantity + data.quantity,
            availableQuantity: stock.availableQuantity + data.quantity,
          },
        });
      } else {
        stock = await tx.stock.create({
          data: {
            skuId: data.skuId,
            warehouseId: data.warehouseId,
            shelfId: data.shelfId || null,
            totalQuantity: data.quantity,
            availableQuantity: data.quantity,
          },
        });
      }

      const stockIn = await tx.stockIn.create({
        data: {
          stockId: stock.id,
          skuId: data.skuId,
          warehouseId: data.warehouseId,
          shelfId: data.shelfId || null,
          quantity: data.quantity,
          batchNo: data.batchNo || null,
          remark: data.remark || null,
          operator: data.operator || null,
        },
      });

      return { stockIn, stock };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Stock in error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/lock', async (req: Request, res: Response) => {
  try {
    const data = lockStockSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      let stock = await tx.stock.findUnique({
        where: getStockUniqueKey(data.skuId, data.warehouseId, data.shelfId),
      });

      if (!stock || stock.availableQuantity < data.quantity) {
        throw new Error('库存不足');
      }

      const stockLock = await tx.stockLock.create({
        data: {
          skuId: data.skuId,
          orderId: data.orderId,
          warehouseId: data.warehouseId,
          shelfId: data.shelfId || null,
          quantity: data.quantity,
          status: 'LOCKED',
        },
      });

      await tx.stock.update({
        where: { id: stock.id },
        data: {
          lockedQuantity: stock.lockedQuantity + data.quantity,
          availableQuantity: stock.availableQuantity - data.quantity,
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

router.post('/unlock', async (req: Request, res: Response) => {
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
        const stock = await tx.stock.findUnique({
          where: getStockUniqueKey(lock.skuId, lock.warehouseId, lock.shelfId || undefined),
        });

        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              lockedQuantity: stock.lockedQuantity - lock.quantity,
              availableQuantity: stock.availableQuantity + lock.quantity,
            },
          });
        }

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
        const stock = await tx.stock.findUnique({
          where: getStockUniqueKey(lock.skuId, lock.warehouseId, lock.shelfId || undefined),
        });

        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              totalQuantity: stock.totalQuantity - lock.quantity,
              lockedQuantity: stock.lockedQuantity - lock.quantity,
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

export default router;
