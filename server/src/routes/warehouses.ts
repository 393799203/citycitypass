import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const warehouseSchema = z.object({
  code: z.string().min(1, '仓库编码不能为空'),
  name: z.string().min(1, '仓库名称不能为空'),
  type: z.enum(['NORMAL', 'COLD', 'MATERIAL']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  ownerId: z.string().optional(),
  manager: z.string().optional(),
  managerPhone: z.string().optional(),
  businessStartTime: z.string().optional(),
  businessEndTime: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, ownerId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        owner: true,
        zones: {
          include: {
            shelves: {
              orderBy: { code: 'asc' },
            },
          },
        },
        stocks: {
          select: {
            skuId: true,
            totalQuantity: true,
          },
        },
        bundleStocks: {
          select: {
            bundleId: true,
            totalQuantity: true,
          },
        },
      },
      orderBy: [
        { owner: { isSelfOperated: 'desc' } },
        { createdAt: 'desc' },
      ],
    });

    const warehousesWithStock = warehouses.map(w => {
      const allShelves = w.zones.flatMap(z => z.shelves);
      const skuStockMap: Record<string, number> = {};
      const bundleStockMap: Record<string, number> = {};
      w.stocks.forEach((s: any) => {
        if (s.skuId) {
          skuStockMap[s.skuId] = (skuStockMap[s.skuId] || 0) + (s.totalQuantity || 0);
        }
      });
      w.bundleStocks.forEach((b: any) => {
        if (b.bundleId) {
          bundleStockMap[b.bundleId] = (bundleStockMap[b.bundleId] || 0) + (b.totalQuantity || 0);
        }
      });
      return {
        ...w,
        shelves: allShelves,
        totalStock: Object.values(skuStockMap).reduce((a, b) => a + b, 0),
        totalBundleStock: Object.values(bundleStockMap).reduce((a, b) => a + b, 0),
        skuCount: Object.keys(skuStockMap).length,
        bundleCount: Object.keys(bundleStockMap).length,
      };
    });

    res.json({ success: true, data: warehousesWithStock });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        owner: true,
        zones: {
          include: {
            shelves: {
              orderBy: { code: 'asc' },
              include: {
                zone: true,
                locations: {
                  orderBy: { level: 'asc' },
                },
              }
            }
          }
        },
      },
    });

    if (!warehouse) {
      return res.status(404).json({ success: false, message: '仓库不存在' });
    }

    const allShelves = warehouse.zones.flatMap(z => z.shelves);
    const shelfIds = allShelves.map(s => s.id);

    const stocks = await prisma.stock.findMany({
      where: { warehouseId: id, location: { shelfId: { in: shelfIds } } },
      include: {
        sku: { include: { product: true } },
        skuBatch: true,
        location: {
          include: {
            shelf: {
              include: { zone: true }
            }
          }
        }
      }
    });

    const bundleStocks = await prisma.bundleStock.findMany({
      where: { warehouseId: id, location: { shelfId: { in: shelfIds } } },
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
        bundleBatch: true,
        location: {
          include: {
            shelf: {
              include: { zone: true }
            }
          }
        }
      }
    });

    const materialStocks = await prisma.materialStock.findMany({
      where: { warehouseId: id, location: { shelfId: { in: shelfIds } } },
      include: {
        supplierMaterial: true,
        materialBatch: true,
        location: {
          include: {
            shelf: {
              include: { zone: true }
            }
          }
        }
      }
    });

    const shelfStocksMap: Record<string, any[]> = {};
    const shelfBundleStocksMap: Record<string, any[]> = {};
    const shelfMaterialStocksMap: Record<string, any[]> = {};

    for (const stock of stocks) {
      if (stock.location?.shelfId) {
        if (!shelfStocksMap[stock.location.shelfId]) {
          shelfStocksMap[stock.location.shelfId] = [];
        }
        shelfStocksMap[stock.location.shelfId].push(stock);
      }
    }

    for (const stock of bundleStocks) {
      if (stock.location?.shelfId) {
        if (!shelfBundleStocksMap[stock.location.shelfId]) {
          shelfBundleStocksMap[stock.location.shelfId] = [];
        }
        shelfBundleStocksMap[stock.location.shelfId].push(stock);
      }
    }

    for (const stock of materialStocks) {
      if (stock.location?.shelfId) {
        if (!shelfMaterialStocksMap[stock.location.shelfId]) {
          shelfMaterialStocksMap[stock.location.shelfId] = [];
        }
        shelfMaterialStocksMap[stock.location.shelfId].push(stock);
      }
    }

    const shelvesWithStocks = allShelves.map(shelf => ({
      ...shelf,
      stocks: shelfStocksMap[shelf.id] || [],
      bundleStocks: shelfBundleStocksMap[shelf.id] || [],
      materialStocks: shelfMaterialStocksMap[shelf.id] || [],
    }));

    const stockStats = await prisma.stock.aggregate({
      where: { 
        warehouseId: id,
      },
      _sum: {
        totalQuantity: true,
        availableQuantity: true,
        lockedQuantity: true,
      },
    });

    const bundleStockStats = await prisma.bundleStock.aggregate({
      where: { 
        warehouseId: id,
      },
      _sum: {
        totalQuantity: true,
        availableQuantity: true,
        lockedQuantity: true,
      },
    });

    const totalStock = stockStats._sum.totalQuantity || 0;
    const availableStock = stockStats._sum.availableQuantity || 0;
    const lockedStock = stockStats._sum.lockedQuantity || 0;
    const totalBundleStock = bundleStockStats._sum.totalQuantity || 0;
    const availableBundleStock = bundleStockStats._sum.availableQuantity || 0;
    const lockedBundleStock = bundleStockStats._sum.lockedQuantity || 0;

    res.json({ success: true, data: {
      ...warehouse,
      shelves: shelvesWithStocks,
      totalStock,
      availableStock,
      lockedStock,
      totalBundleStock,
      availableBundleStock,
      lockedBundleStock,
    } });
  } catch (error) {
    console.error('Get warehouse error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/quick-create', async (req: Request, res: Response) => {
  try {
    const { code, name, ...warehouseData } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: '仓库编码和名称不能为空' });
    }

    const existing = await prisma.warehouse.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ success: false, message: '仓库编码已存在' });
    }

    const defaultZones = [
      { code: 'IN', name: '入库区', type: 'INBOUND' },
      { code: 'ST', name: '存储区', type: 'STORAGE' },
      { code: 'PK', name: '拣货区', type: 'PICKING' },
      { code: 'RT', name: '退货区', type: 'RETURNING' },
      { code: 'DM', name: '报废区', type: 'DAMAGED' },
    ];

    const result = await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.create({
        data: {
          code,
          name,
          type: warehouseData.type || 'NORMAL',
          status: 'ACTIVE',
          province: warehouseData.province,
          city: warehouseData.city,
          address: warehouseData.address,
          latitude: warehouseData.latitude,
          longitude: warehouseData.longitude,
          manager: warehouseData.manager,
          managerPhone: warehouseData.managerPhone,
          businessStartTime: warehouseData.businessStartTime,
          businessEndTime: warehouseData.businessEndTime,
          owner: warehouseData.ownerId ? { connect: { id: warehouseData.ownerId } } : undefined,
        },
      });

      const zones = [];
      for (const zoneData of defaultZones) {
        const zone = await tx.zone.create({
          data: {
            code: zoneData.code,
            name: zoneData.name,
            type: zoneData.type,
            warehouseId: warehouse.id,
          },
        });

        const shelf = await tx.shelf.create({
          data: {
            code: 'R001',
            name: '默认货架',
            type: 'LIGHT',
            status: 'ACTIVE',
            zoneId: zone.id,
          },
        });

        for (let level = 1; level <= 6; level++) {
          await tx.location.create({
            data: {
              shelfId: shelf.id,
              level,
            },
          });
        }

        zones.push(zone);
      }

      return { warehouse, zones };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Quick create warehouse error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = warehouseSchema.parse(req.body);

    const existing = await prisma.warehouse.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '仓库编码已存在' });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        status: data.status,
        province: data.province,
        city: data.city,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        manager: data.manager,
        managerPhone: data.managerPhone,
        businessStartTime: data.businessStartTime,
        businessEndTime: data.businessEndTime,
        owner: data.ownerId ? { connect: { id: data.ownerId } } : undefined,
      },
      include: {
        owner: true,
      },
    });

    res.json({ success: true, data: warehouse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Create warehouse error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = warehouseSchema.partial().parse(req.body);

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '仓库不存在' });
    }

    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.warehouse.findUnique({ where: { code: data.code } });
      if (codeExists) {
        return res.status(400).json({ success: false, message: '仓库编码已存在' });
      }
    }

    const updateData: any = {
      code: data.code,
      name: data.name,
      type: data.type,
      status: data.status,
      province: data.province,
      city: data.city,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      manager: data.manager,
      managerPhone: data.managerPhone,
      businessStartTime: data.businessStartTime,
      businessEndTime: data.businessEndTime,
    };

    if (data.ownerId !== undefined) {
      updateData.owner = data.ownerId ? { connect: { id: data.ownerId } } : { disconnect: true };
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: updateData,
      include: {
        owner: true,
      },
    });

    res.json({ success: true, data: warehouse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Update warehouse error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        zones: {
          include: {
            shelves: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '仓库不存在' });
    }

    const hasShelves = existing.zones.some(zone => zone.shelves.length > 0);
    if (hasShelves) {
      return res.status(400).json({ success: false, message: '该仓库下有货架，无法删除' });
    }

    await prisma.warehouse.delete({ where: { id } });

    res.json({ success: true, message: '仓库已删除' });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id/zones', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const zones = await prisma.zone.findMany({
      where: { warehouseId: id },
      include: {
        shelves: {
          include: {
            locations: { orderBy: { level: 'asc' } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const allLocations = zones.flatMap(z => z.shelves.flatMap(s => s.locations.map(l => l.id)));
    const locationIds = allLocations.length > 0 ? allLocations : ['none'];

    const [stocks, bundleStocks, materialStocks] = await Promise.all([
      prisma.stock.findMany({ where: { locationId: { in: locationIds } } }),
      prisma.bundleStock.findMany({ where: { locationId: { in: locationIds } } }),
      prisma.materialStock.findMany({
        where: { locationId: { in: locationIds } },
        include: { supplierMaterial: true }
      }),
    ]);

    const stockMap: Record<string, any> = {};
    const bundleStockMap: Record<string, any> = {};
    const materialStockMap: Record<string, any> = {};
    stocks.forEach(s => { if (s.locationId) stockMap[s.locationId] = s; });
    bundleStocks.forEach(b => { if (b.locationId) bundleStockMap[b.locationId] = b; });
    materialStocks.forEach(m => { if (m.locationId) materialStockMap[m.locationId] = m; });

    const zonesWithStocks = zones.map(zone => ({
      ...zone,
      shelves: zone.shelves.map(shelf => ({
        ...shelf,
        locations: shelf.locations.map(loc => ({
          ...loc,
          stock: stockMap[loc.id] || null,
          bundleStock: bundleStockMap[loc.id] || null,
          materialStock: materialStockMap[loc.id] || null,
        })),
      })),
    }));

    res.json({ success: true, data: zonesWithStocks });
  } catch (error) {
    console.error('List zones error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:id/zones', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, type = 'NORMAL' } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: '库区编码和名称不能为空' });
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
      return res.status(404).json({ success: false, message: '仓库不存在' });
    }

    const existing = await prisma.zone.findFirst({
      where: { warehouseId: id, code },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '该库区编码已存在' });
    }

    const zone = await prisma.zone.create({
      data: { code, name, type, warehouseId: id },
    });

    res.json({ success: true, data: zone });
  } catch (error) {
    console.error('Create zone error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/zones/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const existing = await prisma.zone.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '库区不存在' });
    }

    const zone = await prisma.zone.update({
      where: { id },
      data: { name, type },
    });

    res.json({ success: true, data: zone });
  } catch (error) {
    console.error('Update zone error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/zones/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.zone.findUnique({ where: { id }, include: { shelves: true } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '库区不存在' });
    }

    if (existing.shelves.length > 0) {
      return res.status(400).json({ success: false, message: '该库区下有货架，无法删除' });
    }

    await prisma.zone.delete({ where: { id } });

    res.json({ success: true, message: '库区已删除' });
  } catch (error) {
    console.error('Delete zone error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/zones/:zoneId/shelves', async (req: Request, res: Response) => {
  try {
    const { zoneId } = req.params;
    const { code, name, type = 'HEAVY', status = 'ACTIVE', levels = 6 } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: '货架编码不能为空' });
    }

    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      return res.status(404).json({ success: false, message: '库区不存在' });
    }

    const existing = await prisma.shelf.findFirst({
      where: { zoneId, code },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '该编码已存在' });
    }

    const shelf = await prisma.shelf.create({
      data: {
        code,
        name,
        type,
        status,
        zoneId,
      },
    });

    const locations = [];
    for (let level = 1; level <= levels; level++) {
      locations.push({ shelfId: shelf.id, level });
    }
    await prisma.location.createMany({ data: locations });

    res.json({ success: true, data: shelf });
  } catch (error) {
    console.error('Create shelf error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/shelves/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, type, status } = req.body;

    const existing = await prisma.shelf.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '货架不存在' });
    }

    if (code && code !== existing.code) {
      const codeExists = await prisma.shelf.findFirst({
        where: { zoneId: existing.zoneId, code, id: { not: id } },
      });
      if (codeExists) {
        return res.status(400).json({ success: false, message: '该编码已存在' });
      }
    }

    const shelf = await prisma.shelf.update({
      where: { id },
      data: { code, name, type, status },
    });

    res.json({ success: true, data: shelf });
  } catch (error) {
    console.error('Update shelf error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/shelves/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.shelf.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '货架不存在' });
    }

    await prisma.shelf.delete({ where: { id } });

    res.json({ success: true, message: '货架已删除' });
  } catch (error) {
    console.error('Delete shelf error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/shelves/:shelfId/locations', async (req: Request, res: Response) => {
  try {
    const { shelfId } = req.params;
    const { level, position } = req.body;

    if (!level) {
      return res.status(400).json({ success: false, message: '层数不能为空' });
    }

    const shelf = await prisma.shelf.findUnique({ where: { id: shelfId } });
    if (!shelf) {
      return res.status(404).json({ success: false, message: '货架不存在' });
    }

    const existing = await prisma.location.findFirst({
      where: { shelfId, level, position },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '该库位已存在' });
    }

    const location = await prisma.location.create({
      data: { shelfId, level, position },
    });

    res.json({ success: true, data: location });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/locations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { level, position } = req.body;

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '库位不存在' });
    }

    const location = await prisma.location.update({
      where: { id },
      data: { level, position },
    });

    res.json({ success: true, data: location });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/locations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '库位不存在' });
    }

    await prisma.location.delete({ where: { id } });

    res.json({ success: true, message: '库位已删除' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:warehouseId/locations', async (req: Request, res: Response) => {
  try {
    const { warehouseId } = req.params;

    const locations = await prisma.location.findMany({
      where: {
        shelf: {
          zone: {
            warehouseId,
          },
        },
      },
      include: {
        shelf: {
          include: {
            zone: true,
          },
        },
      },
      orderBy: [
        { shelf: { code: 'asc' } },
        { level: 'asc' },
        { position: 'asc' },
      ],
    });

    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
