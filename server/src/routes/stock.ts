import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const stockInSchema = z.object({
  type: z.enum(['product', 'bundle']).default('product'),
  skuId: z.string().optional(),
  bundleId: z.string().optional(),
  warehouseId: z.string().min(1, '仓库不能为空'),
  shelfId: z.string().optional(),
  quantity: z.number().int().positive('数量必须大于0'),
  batchNo: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  operator: z.string().optional(),
}).refine(data => data.skuId || data.bundleId, {
  message: "必须提供 skuId 或 bundleId"
});

const lockStockSchema = z.object({
  skuId: z.string().min(1, 'SKU不能为空'),
  warehouseId: z.string().min(1, '仓库不能为空'),
  shelfId: z.string().optional(),
  orderId: z.string().min(1, '订单不能为空'),
  quantity: z.number().int().positive('数量必须大于0'),
});

function getStockWhere(skuId: string, warehouseId: string, shelfId?: string) {
  return {
    skuId,
    warehouseId,
    shelfId: shelfId || null,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId, skuId, bundleId } = req.query;
    
    const productStocks = await prisma.stock.findMany({
      where: {
        ...(warehouseId ? { warehouseId: warehouseId as string } : {}),
        ...(skuId ? { skuId: skuId as string } : {}),
      },
      include: {
        sku: {
          include: { product: true }
        },
        warehouse: true,
        shelf: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const bundleStocks = await prisma.bundleStock.findMany({
      where: {
        ...(warehouseId ? { warehouseId: warehouseId as string } : {}),
        ...(bundleId ? { bundleId: bundleId as string } : {}),
      },
      include: {
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
        warehouse: true,
        shelf: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = {
      productStocks: productStocks.map(s => ({ ...s, type: 'product' })),
      bundleStocks: bundleStocks.map(b => ({ ...b, type: 'bundle' })),
    };

    res.json({ success: true, data: result });
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

    const bundleStockIns = await prisma.bundleStockIn.findMany({
      where: warehouseId ? { warehouseId: warehouseId as string } : {},
      include: {
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
        warehouse: true,
        shelf: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const productRecords = stockIns.map(s => ({ ...s, type: 'product' }));
    const bundleRecords = bundleStockIns.map(b => ({ 
      ...b,
      type: 'bundle',
    }));

    const result = [...productRecords, ...bundleRecords].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get stock-ins error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/stock-in', async (req: Request, res: Response) => {
  try {
    const data = stockInSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      if (data.type === 'bundle') {
        let bundleStock = await tx.bundleStock.findFirst({
          where: { 
            bundleId: data.bundleId!, 
            warehouseId: data.warehouseId, 
            shelfId: data.shelfId || null 
          },
        });

        if (bundleStock) {
          bundleStock = await tx.bundleStock.update({
            where: { id: bundleStock.id },
            data: {
              totalQuantity: { increment: data.quantity },
              availableQuantity: { increment: data.quantity },
            },
          });
        } else {
          bundleStock = await tx.bundleStock.create({
            data: {
              bundleId: data.bundleId!,
              warehouseId: data.warehouseId,
              shelfId: data.shelfId || null,
              totalQuantity: data.quantity,
              availableQuantity: data.quantity,
            },
          });
        }

        const bundleStockIn = await tx.bundleStockIn.create({
          data: {
            bundleId: data.bundleId!,
            warehouseId: data.warehouseId,
            shelfId: data.shelfId || null,
            quantity: data.quantity,
            remark: data.remark || null,
          },
        });

        return bundleStockIn;
      } else {
        let stock = await tx.stock.findFirst({
          where: getStockWhere(data.skuId!, data.warehouseId, data.shelfId),
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
              skuId: data.skuId!,
              warehouseId: data.warehouseId,
              shelfId: data.shelfId || null,
              totalQuantity: data.quantity,
              availableQuantity: data.quantity,
            },
          });
        }

        const stockIn = await tx.stockIn.create({
          data: {
            skuId: data.skuId!,
            warehouseId: data.warehouseId,
            shelfId: data.shelfId || null,
            quantity: data.quantity,
            batchNo: data.batchNo || null,
            remark: data.remark || null,
            operator: data.operator || null,
          },
        });

        return stockIn;
      }
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
      let stock = await tx.stock.findFirst({
          where: getStockWhere(data.skuId, data.warehouseId, data.shelfId),
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
        const stock = await tx.stock.findFirst({
          where: getStockWhere(lock.skuId, lock.warehouseId, lock.shelfId || undefined),
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
        const stock = await tx.stock.findFirst({
          where: getStockWhere(lock.skuId, lock.warehouseId, lock.shelfId || undefined),
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

router.post('/bundle/lock', async (req: Request, res: Response) => {
  try {
    const { bundleId, warehouseId, shelfId, quantity, orderId } = req.body;
    if (!bundleId || !warehouseId || !quantity || !orderId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const bundleStock = await tx.bundleStock.findFirst({
        where: { bundleId, warehouseId, shelfId: shelfId || null },
      });

      if (!bundleStock || bundleStock.availableQuantity < quantity) {
        throw new Error('套装库存不足');
      }

      const stockLock = await tx.bundleStockLock.create({
        data: {
          bundleId,
          orderId,
          warehouseId,
          shelfId: shelfId || null,
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
          where: { bundleId: lock.bundleId, warehouseId: lock.warehouseId, shelfId: lock.shelfId || null },
        });

        if (bundleStock) {
          await tx.bundleStock.update({
            where: { id: bundleStock.id },
            data: {
              lockedQuantity: bundleStock.lockedQuantity - lock.quantity,
              availableQuantity: bundleStock.availableQuantity + lock.quantity,
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
          where: { bundleId: lock.bundleId, warehouseId: lock.warehouseId, shelfId: lock.shelfId || null },
        });

        if (bundleStock) {
          await tx.bundleStock.update({
            where: { id: bundleStock.id },
            data: {
              totalQuantity: bundleStock.totalQuantity - lock.quantity,
              lockedQuantity: bundleStock.lockedQuantity - lock.quantity,
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

router.get('/bundle', async (req: Request, res: Response) => {
  try {
    const { warehouseId, bundleId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (bundleId) where.bundleId = bundleId as string;

    const stocks = await prisma.bundleStock.findMany({
      where,
      include: {
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
        warehouse: true,
        shelf: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: stocks });
  } catch (error) {
    console.error('Get bundle stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/bundle/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { warehouseId } = req.query;
    const where: any = { bundleId: id };
    if (warehouseId) where.warehouseId = warehouseId as string;

    const stocks = await prisma.bundleStock.findMany({
      where,
      include: {
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
        warehouse: true,
        shelf: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: stocks });
  } catch (error) {
    console.error('Get bundle stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/sku/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { warehouseId } = req.query;
    const where: any = { sku: { productId: id } };
    if (warehouseId) where.warehouseId = warehouseId as string;

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
    console.error('Get sku stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/bundle/stock-in', async (req: Request, res: Response) => {
  try {
    const { bundleId, warehouseId, shelfId, quantity, batchNo, remark } = req.body;
    if (!bundleId || !warehouseId || !quantity) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let bundleStock = await tx.bundleStock.findFirst({
        where: { bundleId, warehouseId, shelfId: shelfId || null },
      });

      if (bundleStock) {
        bundleStock = await tx.bundleStock.update({
          where: { id: bundleStock.id },
          data: {
            totalQuantity: { increment: quantity },
            availableQuantity: { increment: quantity },
          },
        });
      } else {
        bundleStock = await tx.bundleStock.create({
          data: {
            bundleId,
            warehouseId,
            shelfId: shelfId || null,
            totalQuantity: quantity,
            availableQuantity: quantity,
          },
        });
      }

      const bundleStockIn = await tx.bundleStockIn.create({
        data: {
          bundleId,
          warehouseId,
          shelfId: shelfId || null,
          quantity,
          remark: remark || null,
        },
      });

      return bundleStock;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Bundle stock in error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
