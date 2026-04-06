import { Router } from 'express';
import { PrismaClient, ItemType, SupplierProductStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

const supplierProductSchema = z.object({
  supplierId: z.string().min(1),
  itemType: z.enum(['PRODUCT', 'BUNDLE']),
  skuId: z.string().optional(),
  bundleId: z.string().optional(),
  price: z.number().optional(),
  minQty: z.number().optional(),
  leadDays: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// 获取供应商的所有供应商品
router.get('/', async (req, res, next) => {
  try {
    const { supplierId, ownerId } = req.query;

    const where: any = {};
    if (supplierId) where.supplierId = supplierId as string;
    if (ownerId) where.supplier = { ownerId: ownerId as string };

    const products = await prisma.supplierProduct.findMany({
      where,
      include: {
        supplier: true,
        sku: { include: { product: true } },
        bundle: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// 获取供应商的供应商品列表（按供应商分组）
router.get('/by-supplier', async (req, res, next) => {
  try {
    const { supplierId } = req.query;

    const where: any = { status: SupplierProductStatus.ACTIVE };
    if (supplierId) where.supplierId = supplierId as string;

    const products = await prisma.supplierProduct.findMany({
      where,
      include: {
        supplier: true,
        sku: { include: { product: true } },
        bundle: { include: { items: { include: { sku: { include: { product: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按供应商分组
    const grouped = products.reduce((acc: any, p) => {
      if (!acc[p.supplierId]) {
        acc[p.supplierId] = {
          supplierId: p.supplierId,
          supplierName: p.supplier?.name,
          products: [],
          bundles: [],
        };
      }
      if (p.itemType === ItemType.PRODUCT && p.sku) {
        acc[p.supplierId].products.push({
          skuId: p.skuId,
          skuCode: p.sku.skuCode,
          productId: p.sku.productId,
          productName: p.sku.product?.name,
          spec: p.sku.spec,
          packaging: p.sku.packaging,
          price: p.price,
          minQty: p.minQty,
          leadDays: p.leadDays,
        });
      } else if (p.itemType === ItemType.BUNDLE && p.bundle) {
        acc[p.supplierId].bundles.push({
          bundleId: p.bundleId,
          bundleName: p.bundle.name,
          skuCode: p.bundle.skuCode,
          spec: p.bundle.spec,
          packaging: p.bundle.packaging,
          price: p.price,
          minQty: p.minQty,
          leadDays: p.leadDays,
        });
      }
      return acc;
    }, {});

    res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    next(error);
  }
});

// 添加供应商品
router.post('/', async (req, res, next) => {
  try {
    const data = supplierProductSchema.parse(req.body);

    // 检查是否已存在
    const existing = await prisma.supplierProduct.findFirst({
      where: {
        supplierId: data.supplierId,
        skuId: data.skuId || null,
        bundleId: data.bundleId || null,
      },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '该商品已存在' });
    }

    const product = await prisma.supplierProduct.create({
      data: {
        supplierId: data.supplierId,
        itemType: data.itemType as ItemType,
        skuId: data.skuId || null,
        bundleId: data.bundleId || null,
        price: data.price,
        minQty: data.minQty,
        leadDays: data.leadDays,
        status: data.status as SupplierProductStatus || SupplierProductStatus.ACTIVE,
      },
      include: {
        sku: { include: { product: true } },
        bundle: true,
      },
    });

    res.json({ success: true, data: product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    next(error);
  }
});

// 批量添加供应商品
router.post('/batch', async (req, res, next) => {
  try {
    const { supplierId, items } = req.body;

    if (!supplierId || !items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    // 删除旧的所有商品
    await prisma.supplierProduct.deleteMany({
      where: { supplierId },
    });

    // 创建新的
    const created = await prisma.supplierProduct.createMany({
      data: items.map((item: any) => ({
        supplierId,
        itemType: item.itemType,
        skuId: item.skuId || null,
        bundleId: item.bundleId || null,
        price: item.price,
        minQty: item.minQty || 1,
        leadDays: item.leadDays,
        status: SupplierProductStatus.ACTIVE,
      })),
    });

    res.json({ success: true, data: { count: created.count } });
  } catch (error) {
    next(error);
  }
});

// 更新供应商品
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = supplierProductSchema.partial().parse(req.body);

    const product = await prisma.supplierProduct.update({
      where: { id },
      data: {
        price: data.price,
        minQty: data.minQty,
        leadDays: data.leadDays,
        status: data.status as SupplierProductStatus,
      },
      include: {
        sku: { include: { product: true } },
        bundle: true,
      },
    });

    res.json({ success: true, data: product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    next(error);
  }
});

// 删除供应商品
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.supplierProduct.delete({
      where: { id },
    });

    res.json({ success: true, message: '已删除' });
  } catch (error) {
    next(error);
  }
});

export default router;
