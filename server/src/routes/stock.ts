import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const stockInSchema = z.object({
  type: z.enum(['product', 'bundle']).default('product'),
  skuId: z.string().optional(),
  bundleId: z.string().optional(),
  warehouseId: z.string().min(1, '仓库不能为空'),
  locationId: z.string().optional(),
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
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
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
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
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

router.get('/owner-stock-summary', async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ success: false, message: '缺少货主ID' });
    }

    const warehouses = await prisma.warehouse.findMany({
      where: { ownerId: ownerId as string },
      select: { id: true, name: true, code: true },
    });

    if (warehouses.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const warehouseIds = warehouses.map(w => w.id);

    const stocks = await prisma.stock.findMany({
      where: { warehouseId: { in: warehouseIds } },
      include: {
        sku: {
          include: {
            product: {
              include: { brand: true, category: true },
            },
          },
        },
      },
    });

    const bundleStocks = await prisma.bundleStock.findMany({
      where: { warehouseId: { in: warehouseIds } },
      include: {
        bundle: {
          include: {
            items: {
              include: {
                sku: {
                  include: { product: true },
                },
              },
            },
          },
        },
      },
    });

    const skuMap = new Map<string, {
      skuId: string;
      productName: string;
      spec: string;
      packaging: string;
      price: number;
      totalAvailable: number;
      brand?: { id: string; name: string };
      category?: { id: string; name: string };
      warehouseSummary: { warehouseId: string; warehouseName: string; available: number }[];
    }>();

    for (const stock of stocks) {
      const key = stock.skuId;
      if (!skuMap.has(key)) {
        skuMap.set(key, {
          skuId: stock.skuId,
          productName: stock.sku.product?.name || '',
          spec: stock.sku.spec || '',
          packaging: stock.sku.packaging || '',
          price: stock.sku.price ? Number(stock.sku.price) : 0,
          totalAvailable: 0,
          brand: stock.sku.product?.brand ? { id: stock.sku.product.brand.id, name: stock.sku.product.brand.name } : undefined,
          category: stock.sku.product?.category ? { id: stock.sku.product.category.id, name: stock.sku.product.category.name } : undefined,
          warehouseSummary: [],
        });
      }
      const entry = skuMap.get(key)!;
      entry.totalAvailable += stock.availableQuantity;
      const warehouse = warehouses.find(w => w.id === stock.warehouseId);
      const wsEntry = entry.warehouseSummary.find(ws => ws.warehouseId === stock.warehouseId);
      if (wsEntry) {
        wsEntry.available += stock.availableQuantity;
      } else {
        entry.warehouseSummary.push({
          warehouseId: stock.warehouseId,
          warehouseName: warehouse?.name || '',
          available: stock.availableQuantity,
        });
      }
    }

    const bundleMap = new Map<string, {
      bundleId: string;
      bundleName: string;
      price: number;
      totalAvailable: number;
      items: { skuId: string; productName: string; spec: string; packaging: string; quantity: number }[];
      warehouseSummary: { warehouseId: string; warehouseName: string; available: number }[];
    }>();

    for (const bs of bundleStocks) {
      const key = bs.bundleId;
      if (!bundleMap.has(key)) {
        bundleMap.set(key, {
          bundleId: bs.bundleId,
          bundleName: bs.bundle.name || '',
          price: bs.bundle.price ? Number(bs.bundle.price) : 0,
          totalAvailable: 0,
          items: bs.bundle.items?.map(item => ({
            skuId: item.skuId,
            productName: item.sku?.product?.name || '',
            spec: item.sku?.spec || '',
            packaging: item.sku?.packaging || '',
            quantity: item.quantity,
          })) || [],
          warehouseSummary: [],
        });
      }
      const entry = bundleMap.get(key)!;
      entry.totalAvailable += bs.availableQuantity;
      const warehouse = warehouses.find(w => w.id === bs.warehouseId);
      const wsEntry = entry.warehouseSummary.find(ws => ws.warehouseId === bs.warehouseId);
      if (wsEntry) {
        wsEntry.available += bs.availableQuantity;
      } else {
        entry.warehouseSummary.push({
          warehouseId: bs.warehouseId,
          warehouseName: warehouse?.name || '',
          available: bs.availableQuantity,
        });
      }
    }

    res.json({
      success: true,
      data: {
        products: Array.from(skuMap.values()),
        bundles: Array.from(bundleMap.values()),
      },
    });
  } catch (error) {
    console.error('Get owner stock summary error:', error);
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
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
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
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
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
            locationId: data.locationId || null 
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
              locationId: data.locationId || null,
              totalQuantity: data.quantity,
              availableQuantity: data.quantity,
            },
          });
        }

        const bundleStockIn = await tx.bundleStockIn.create({
          data: {
            bundleId: data.bundleId!,
            warehouseId: data.warehouseId,
            locationId: data.locationId || null,
            quantity: data.quantity,
            remark: data.remark || null,
          },
        });

        return bundleStockIn;
      } else {
        let stock = await tx.stock.findFirst({
          where: getStockWhere(data.skuId!, data.warehouseId, data.locationId),
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
              locationId: data.locationId || null,
              totalQuantity: data.quantity,
              availableQuantity: data.quantity,
            },
          });
        }

        const stockIn = await tx.stockIn.create({
          data: {
            skuId: data.skuId!,
            warehouseId: data.warehouseId,
            locationId: data.locationId || null,
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
          where: getStockWhere(data.skuId, data.warehouseId, data.locationId),
        });

      if (!stock || stock.availableQuantity < data.quantity) {
        throw new Error('库存不足');
      }

      const stockLock = await tx.stockLock.create({
        data: {
          skuId: data.skuId,
          orderId: data.orderId,
          warehouseId: data.warehouseId,
          locationId: data.locationId || null,
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
          where: getStockWhere(lock.skuId, lock.warehouseId, lock.locationId || undefined),
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
          locationId: locationId || null,
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
          where: { bundleId: lock.bundleId, warehouseId: lock.warehouseId, locationId: lock.locationId || null },
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
              locationId: lock.locationId,
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

router.get('/out', async (req: Request, res: Response) => {
  try {
    const { warehouseId, startDate, endDate, orderId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (orderId) where.orderId = orderId as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const stockOuts = await prisma.stockOut.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const warehouseIds = [...new Set(stockOuts.map(s => s.warehouseId))];
    const skuIds = stockOuts.filter(s => s.skuId).map(s => s.skuId);
    const bundleIds = stockOuts.filter(s => s.bundleId).map(s => s.bundleId);
    const locationIds = stockOuts.filter(s => s.locationId).map(s => s.locationId);
    const orderIds = [...new Set(stockOuts.map(s => s.orderId))];

    const [warehouses, skus, bundles, locations, orders] = await Promise.all([
      warehouseIds.length ? prisma.warehouse.findMany({ where: { id: { in: warehouseIds } } }) : [],
      skuIds.length ? prisma.productSKU.findMany({ where: { id: { in: skuIds } }, include: { product: true } }) : [],
      bundleIds.length ? prisma.bundleSKU.findMany({ where: { id: { in: bundleIds } }, include: { items: { include: { sku: { include: { product: true } } } } } }) : [],
      locationIds.length ? prisma.location.findMany({ where: { id: { in: locationIds } }, include: { shelf: { include: { zone: true } } } }) : [],
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
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
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
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
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
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
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
    const { bundleId, warehouseId, locationId, quantity, batchNo, remark } = req.body;
    if (!bundleId || !warehouseId || !quantity) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let bundleStock = await tx.bundleStock.findFirst({
        where: { bundleId, warehouseId, locationId: locationId || null },
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
            locationId: locationId || null,
            totalQuantity: quantity,
            availableQuantity: quantity,
          },
        });
      }

      const bundleStockIn = await tx.bundleStockIn.create({
        data: {
          bundleId,
          warehouseId,
          locationId: locationId || null,
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
