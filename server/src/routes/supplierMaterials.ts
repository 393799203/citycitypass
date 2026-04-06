import { Router } from 'express';
import { PrismaClient, SupplierProductStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

const supplierMaterialSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['MATERIAL', 'OTHER']),
  unit: z.string().optional(),
  price: z.number().optional(),
  minQty: z.number().optional(),
  leadDays: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// 获取供应商的所有原材料/其他商品
router.get('/', async (req, res, next) => {
  try {
    const { supplierId, ownerId } = req.query;
    const where: any = {};

    if (supplierId) {
      where.supplierId = supplierId as string;
    }

    if (ownerId) {
      where.supplier = { ownerId: ownerId as string };
    }

    const materials = await prisma.supplierMaterial.findMany({
      where,
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: materials });
  } catch (error) {
    next(error);
  }
});

// 获取原材料/其他商品（仅启用状态）
router.get('/active', async (req, res, next) => {
  try {
    const materials = await prisma.supplierMaterial.findMany({
      where: { status: SupplierProductStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: materials });
  } catch (error) {
    next(error);
  }
});

// 创建原材料/其他商品
router.post('/', async (req, res, next) => {
  try {
    const data = supplierMaterialSchema.parse(req.body);

    const material = await prisma.supplierMaterial.create({
      data: {
        name: data.name,
        category: data.category,
        unit: data.unit,
        price: data.price,
        minQty: data.minQty || 1,
        leadDays: data.leadDays,
        status: data.status as SupplierProductStatus || SupplierProductStatus.ACTIVE,
        supplierId: req.body.supplierId || null,
      },
    });

    res.json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
});

// 批量创建原材料/其他商品
router.post('/batch', async (req, res, next) => {
  try {
    const { supplierId, items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: '无效参数' });
    }

    const created = await prisma.supplierMaterial.createMany({
      data: items.map((item: any) => ({
        name: item.name,
        category: item.category,
        unit: item.unit || null,
        price: item.price,
        minQty: item.minQty || 1,
        leadDays: item.leadDays,
        status: SupplierProductStatus.ACTIVE,
        supplierId: supplierId || null,
      })),
    });

    res.json({ success: true, data: { count: created.count } });
  } catch (error) {
    next(error);
  }
});

// 更新原材料/其他商品
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = supplierMaterialSchema.partial().parse(req.body);

    const material = await prisma.supplierMaterial.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        unit: data.unit,
        price: data.price,
        minQty: data.minQty,
        leadDays: data.leadDays,
        status: data.status as SupplierProductStatus,
      },
    });

    res.json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
});

// 删除原材料/其他商品
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.supplierMaterial.delete({
      where: { id },
    });

    res.json({ success: true, message: '已删除' });
  } catch (error) {
    next(error);
  }
});

export default router;