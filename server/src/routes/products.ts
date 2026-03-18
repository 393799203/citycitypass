import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const skuSchema = z.object({
  id: z.string().optional(),
  packaging: z.string().min(1),
  spec: z.string().min(1),
  price: z.number().min(0),
});

const productSchema = z.object({
  name: z.string().min(1),
  brandId: z.string().min(1),
  categoryId: z.string().min(1),
  status: z.string().optional(),
  skus: skuSchema.array().optional(),
});

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/categories', async (req: Request, res: Response) => {
  try {
    const { code, name, sortOrder } = req.body;
    const category = await prisma.productCategory.create({
      data: { code, name, sortOrder: sortOrder || 0 },
    });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/brands', async (req: Request, res: Response) => {
  try {
    const { categoryId, name } = req.query;
    const where: any = {};
    if (categoryId) where.categoryId = String(categoryId);
    if (name) where.name = String(name);

    const brands = await prisma.productBrand.findMany({ where });
    res.json({ success: true, data: brands });
  } catch (error) {
    console.error('List brands error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/brands', async (req: Request, res: Response) => {
  try {
    const { code, name, categoryId, description } = req.body;
    console.log('Creating brand with:', { code, name, categoryId, description });
    
    const categoryExists = await prisma.productCategory.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      console.error('Category does not exist:', categoryId);
      return res.status(400).json({ success: false, message: '商品类别不存在' });
    }
    
    const brand = await prisma.productBrand.create({
      data: { code, name, categoryId, description },
    });
    console.log('Brand created successfully:', brand);
    res.json({ success: true, data: brand });
  } catch (error: any) {
    console.error('Create brand error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: '品牌代码已存在' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, message: '商品类别不存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/skus/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.productSKU.delete({ where: { id } });
    res.json({ success: true, message: 'SKU已删除' });
  } catch (error) {
    console.error('Delete SKU error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { name, categoryId, brandId, status, warehouseId } = req.query;
    
    const where: any = {};
    if (name) where.name = { contains: String(name) };
    if (categoryId) where.categoryId = String(categoryId);
    if (brandId) where.brandId = String(brandId);
    if (status) where.status = String(status);

    let productIds: string[] | undefined;
    let stockMap: Record<string, number> = {};
    if (warehouseId) {
      const stocks = await prisma.stock.findMany({
        where: { warehouseId: String(warehouseId), availableQuantity: { gt: 0 } },
        select: { skuId: true, availableQuantity: true },
      });
      stocks.forEach((s: any) => {
        stockMap[s.skuId] = s.availableQuantity;
      });
      const skuList = await prisma.productSKU.findMany({
        where: { id: { in: Object.keys(stockMap) } },
        select: { id: true, productId: true },
      });
      const ids = skuList.map(s => s.productId).filter(Boolean);
      productIds = [...new Set(ids)];
      if (!productIds || productIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      where.id = { in: productIds };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: { select: { id: true, name: true, code: true } },
        skus: {
          include: {
            stocks: warehouseId ? {
              where: { warehouseId: String(warehouseId) },
              select: { totalQuantity: true },
            } : false,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productsWithStock = products.map(p => ({
      ...p,
      skus: p.skus.map(s => ({
        ...s,
        stock: stockMap[s.id] || 0,
      })),
    }));

    res.json({ success: true, data: productsWithStock });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        skus: true,
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('Received product data:', req.body);
    const data = productSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        name: data.name,
        brandId: data.brandId,
        categoryId: data.categoryId,
        skus: data.skus ? {
          create: data.skus.map(sku => ({
            packaging: sku.packaging,
            spec: sku.spec,
            price: sku.price,
          }))
        } : undefined,
      },
      include: {
        category: true,
        brand: true,
        skus: true,
      },
    });

    res.json({ success: true, data: product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Create product error:', error);
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = productSchema.parse(req.body);

    const existingSkus = await prisma.productSKU.findMany({
      where: { productId: id },
    });
    const existingSkuIds: string[] = existingSkus.map((s: { id: string }) => s.id);
    const skusWithId = data.skus?.filter((s) => s.id) || [];
    const newSkuIds = skusWithId.filter((s) => s.id).map((s) => s.id as string);
    const toDelete = existingSkuIds.filter((skuId) => !newSkuIds.includes(skuId));

    if (toDelete.length > 0) {
      await prisma.productSKU.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        brandId: data.brandId,
        categoryId: data.categoryId,
        status: data.status,
        skus: data.skus ? {
          upsert: data.skus.map(sku => ({
            where: { id: sku.id || '' },
            create: {
              packaging: sku.packaging,
              spec: sku.spec,
              price: sku.price,
            },
            update: {
              packaging: sku.packaging,
              spec: sku.spec,
              price: sku.price,
            },
          })),
        } : undefined,
      },
      include: {
        category: true,
        brand: true,
        skus: true,
      },
    });

    res.json({ success: true, data: product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: '商品已删除' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:id/skus', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = skuSchema.parse(req.body);

    const sku = await prisma.productSKU.create({
      data: {
        productId: id,
        packaging: data.packaging,
        spec: data.spec,
        price: data.price,
      },
    });

    res.json({ success: true, data: sku });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Create SKU error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
