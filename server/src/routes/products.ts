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
  subCategoryId: z.string().optional(),
  status: z.string().optional(),
  skus: skuSchema.array().optional(),
});

// 二级分类 API
router.get('/sub-categories', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.query;
    const where = categoryId ? { categoryId: categoryId as string } : {};
    const subCategories = await prisma.productSubCategory.findMany({
      where,
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: subCategories });
  } catch (error) {
    console.error('List sub-categories error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/sub-categories', async (req: Request, res: Response) => {
  try {
    const { code, name, categoryId } = req.body;
    if (!code || !name || !categoryId) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }
    const subCategory = await prisma.productSubCategory.create({
      data: { code, name, categoryId },
    });
    res.json({ success: true, data: subCategory });
  } catch (error) {
    console.error('Create sub-category error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/sub-categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name } = req.body;
    const subCategory = await prisma.productSubCategory.update({
      where: { id },
      data: { code, name },
    });
    res.json({ success: true, data: subCategory });
  } catch (error) {
    console.error('Update sub-category error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/sub-categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.productSubCategory.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Delete sub-category error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取品牌关联的包装和规格选项
router.get('/brands/:brandId/options', async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const brand = await prisma.productBrand.findUnique({
      where: { id: brandId },
      include: {
        packagings: {
          include: { packaging: true },
          orderBy: { packaging: { sortOrder: 'asc' } }
        },
        specs: {
          include: { spec: true },
          orderBy: { spec: { sortOrder: 'asc' } }
        }
      }
    });
    res.json({
      success: true,
      data: {
        packagings: brand?.packagings.map(bp => bp.packaging) || [],
        specs: brand?.specs.map(bs => bs.spec) || []
      }
    });
  } catch (error) {
    console.error('Get brand options error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 包装选项 API
router.get('/packagings', async (req: Request, res: Response) => {
  try {
    const packagings = await prisma.packagingOption.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    res.json({ success: true, data: packagings });
  } catch (error) {
    console.error('List packagings error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 规格选项 API
router.get('/specs', async (req: Request, res: Response) => {
  try {
    const specs = await prisma.specOption.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    res.json({ success: true, data: specs });
  } catch (error) {
    console.error('List specs error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// SKU 编码生成函数
// 格式: 品牌码(2位) + 二级分类码(2位) + 规格码(3位) + 包装码(1位) = 8位
async function generateSkuCode(productId: string, packaging: string, spec: string): Promise<string> {
  // 获取产品及其关联的品牌和二级分类
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      brand: true,
      subCategory: true
    }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  // 品牌编码（2位）
  const brandCode = product.brand.code.toUpperCase().slice(0, 2);

  // 二级分类编码（2位），从商品的 subCategory 获取
  const subCategoryCode = product.subCategory?.code.toUpperCase().slice(0, 2) || 'XX';

  // 规格编码（3位）：从规格中提取数字，不足3位前补0，超过3位截断
  const specNumbers = spec.replace(/\D/g, '').slice(0, 3).padStart(3, '0');

  // 包装编码（1位）
  const packagingCode = getPackagingCode(packaging);

  return `${brandCode}${subCategoryCode}${specNumbers}${packagingCode}`;
}

// 包装编码映射
function getPackagingCode(packaging: string): string {
  const p = packaging.toLowerCase();
  if (p.includes('箱')) {
    const match = p.match(/(\d+)/);
    if (match) {
      return `C${match[1]}`;
    }
    return 'C';
  }
  if (p.includes('罐') || p.includes('a')) {
    return 'A';
  }
  if (p.includes('盒') || p.includes('h')) {
    return 'H';
  }
  if (p.includes('双瓶')) {
    return 'D';
  }
  return 'P';
}

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
    const { categoryId, subCategoryId, name } = req.query;
    const where: any = {};
    if (categoryId) where.categoryId = String(categoryId);
    if (name) where.name = String(name);

    // 如果选择了香型(二级分类)，过滤出有该香型商品的品牌
    if (subCategoryId) {
      where.products = {
        some: {
          subCategoryId: String(subCategoryId)
        }
      };
    }

    const brands = await prisma.productBrand.findMany({
      where,
      orderBy: { name: 'asc' }
    });
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

    // 先创建商品
    const product = await prisma.product.create({
      data: {
        name: data.name,
        brandId: data.brandId,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId || null,
      },
      include: {
        category: true,
        brand: true,
        subCategory: true,
      },
    });

    // 如果有 SKU，批量创建并生成编码
    if (data.skus && data.skus.length > 0) {
      for (const sku of data.skus) {
        const skuCode = await generateSkuCode(product.id, sku.packaging, sku.spec);
        await prisma.productSKU.create({
          data: {
            productId: product.id,
            skuCode: skuCode,
            packaging: sku.packaging,
            spec: sku.spec,
            price: sku.price,
          },
        });
      }
    }

    // 重新查询包含 SKU 的完整商品信息
    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        brand: true,
        subCategory: true,
        skus: true,
      },
    });

    res.json({ success: true, data: fullProduct });
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
      },
      include: {
        category: true,
        brand: true,
        subCategory: true,
        skus: true,
      },
    });

    if (data.skus) {
      for (const sku of data.skus) {
        if (sku.id) {
          await prisma.productSKU.update({
            where: { id: sku.id },
            data: {
              packaging: sku.packaging,
              spec: sku.spec,
              price: sku.price,
            },
          });
        } else {
          const skuCode = await generateSkuCode(id, sku.packaging, sku.spec);
          await prisma.productSKU.create({
            data: {
              productId: id,
              skuCode: skuCode,
              packaging: sku.packaging,
              spec: sku.spec,
              price: sku.price,
            },
          });
        }
      }
    }

    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        subCategory: true,
        skus: true,
      },
    });

    res.json({ success: true, data: updatedProduct });
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

    // 自动生成 SKU 编码
    const skuCode = await generateSkuCode(id, data.packaging, data.spec);

    const sku = await prisma.productSKU.create({
      data: {
        productId: id,
        skuCode: skuCode,
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
