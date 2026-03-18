import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const warehouseSchema = z.object({
  code: z.string().min(1, '仓库编码不能为空'),
  name: z.string().min(1, '仓库名称不能为空'),
  type: z.enum(['NORMAL', 'COLD']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  ownerId: z.string().optional(),
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
        _count: {
          select: { shelves: true },
        },
        shelves: {
          orderBy: { code: 'asc' },
        },
        stocks: {
          select: {
            skuId: true,
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
      const skuStockMap: Record<string, number> = {};
      w.stocks.forEach((s: any) => {
        if (s.skuId && (s.totalQuantity || 0) > 0) {
          skuStockMap[s.skuId] = (s.totalQuantity || 0);
        }
      });
      return {
        ...w,
        totalStock: w.stocks.reduce((sum: number, s: any) => sum + (Number(s.totalQuantity) || 0), 0),
        skuCount: Object.keys(skuStockMap).length,
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
        shelves: {
          orderBy: { code: 'asc' },
          include: {
            stocks: {
              include: {
                sku: {
                  include: { product: true }
                }
              }
            }
          }
        },
      },
    });

    if (!warehouse) {
      return res.status(404).json({ success: false, message: '仓库不存在' });
    }

    const stockStats = await prisma.stock.aggregate({
      where: { warehouseId: id },
      _sum: {
        totalQuantity: true,
        availableQuantity: true,
        lockedQuantity: true,
      },
    });

    const totalStock = stockStats._sum.totalQuantity || 0;
    const availableStock = stockStats._sum.availableQuantity || 0;
    const lockedStock = stockStats._sum.lockedQuantity || 0;

    res.json({ success: true, data: { ...warehouse, totalStock, availableStock, lockedStock } });
  } catch (error) {
    console.error('Get warehouse error:', error);
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
        ownerId: data.ownerId,
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

    const warehouse = await prisma.warehouse.update({
      where: { id },
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
        ownerId: data.ownerId,
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
    console.error('Update warehouse error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.warehouse.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: '仓库不存在' });
    }

    await prisma.warehouse.delete({ where: { id } });

    res.json({ success: true, message: '仓库已删除' });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:id/shelves', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type = '1', row, column, level = 5 } = req.body;

    if (row === undefined || column === undefined) {
      return res.status(400).json({ success: false, message: '排和列不能为空' });
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
      return res.status(404).json({ success: false, message: '仓库不存在' });
    }

    const code = `${warehouse.code}-0${row}${column}`;

    const existing = await prisma.shelf.findFirst({
      where: { warehouseId: id, code },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '该位置已存在货架' });
    }

    const shelf = await prisma.shelf.create({
      data: {
        code,
        type,
        row,
        column,
        level,
        warehouseId: id,
      },
    });

    res.json({ success: true, data: shelf });
  } catch (error) {
    console.error('Create shelf error:', error);
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

    await prisma.stock.updateMany({
      where: { shelfId: id },
      data: { shelfId: null },
    });

    await prisma.stockLock.updateMany({
      where: { shelfId: id },
      data: { shelfId: null },
    });

    await prisma.stockIn.updateMany({
      where: { shelfId: id },
      data: { shelfId: null },
    });

    await prisma.shelf.delete({ where: { id } });

    res.json({ success: true, message: '货架已删除' });
  } catch (error) {
    console.error('Delete shelf error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
