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
  imageUrl: z.string().optional(),
  brandId: z.string().min(1),
  subCategoryId: z.string().min(1),
  ownerId: z.string().optional(),
  status: z.string().optional(),
  isVisibleToCustomer: z.boolean().optional(),
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

// 获取二级分类关联的规格和包装选项
router.get('/sub-categories/:subCategoryId/options', async (req: Request, res: Response) => {
  try {
    const { subCategoryId } = req.params;

    const specs = await prisma.specOption.findMany({
      where: { subCategoryId },
      orderBy: { sortOrder: 'asc' }
    });

    const packagings = await prisma.packagingOption.findMany({
      where: { subCategoryId },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      success: true,
      data: {
        specs,
        packagings
      }
    });
  } catch (error) {
    console.error('Get sub-category options error:', error);
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

// 包装选项 API
router.get('/packagings', async (req: Request, res: Response) => {
  try {
    const { subCategoryId } = req.query;
    const where = subCategoryId ? { subCategoryId: subCategoryId as string } : {};
    const packagings = await prisma.packagingOption.findMany({
      where,
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
    const { subCategoryId } = req.query;
    const where = subCategoryId ? { subCategoryId: subCategoryId as string } : {};
    const specs = await prisma.specOption.findMany({
      where,
      orderBy: { sortOrder: 'asc' }
    });
    res.json({ success: true, data: specs });
  } catch (error) {
    console.error('List specs error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 创建规格
router.post('/specs', async (req: Request, res: Response) => {
  try {
    const { code, name, sortOrder, subCategoryId } = req.body;
    if (!code || !name || !subCategoryId) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }
    const spec = await prisma.specOption.create({
      data: { code, name, sortOrder: sortOrder || 0, subCategoryId },
    });
    res.json({ success: true, data: spec });
  } catch (error) {
    console.error('Create spec error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 创建包装
router.post('/packagings', async (req: Request, res: Response) => {
  try {
    const { code, name, sortOrder, subCategoryId } = req.body;
    if (!code || !name || !subCategoryId) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }
    const packaging = await prisma.packagingOption.create({
      data: { code, name, sortOrder: sortOrder || 0, subCategoryId },
    });
    res.json({ success: true, data: packaging });
  } catch (error) {
    console.error('Create packaging error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新规格
router.put('/specs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, sortOrder } = req.body;
    const spec = await prisma.specOption.update({
      where: { id },
      data: { code, name, sortOrder: sortOrder || 0 },
    });
    res.json({ success: true, data: spec });
  } catch (error) {
    console.error('Update spec error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除规格
router.delete('/specs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.specOption.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete spec error:', error);
    if (error.code === 'P2003' || error.code === 'P2014') {
      return res.status(400).json({ success: false, message: '该规格已被使用，无法删除' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新包装
router.put('/packagings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, sortOrder } = req.body;
    const packaging = await prisma.packagingOption.update({
      where: { id },
      data: { code, name, sortOrder: sortOrder || 0 },
    });
    res.json({ success: true, data: packaging });
  } catch (error) {
    console.error('Update packaging error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除包装
router.delete('/packagings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.packagingOption.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete packaging error:', error);
    if (error.code === 'P2003' || error.code === 'P2014') {
      return res.status(400).json({ success: false, message: '该包装已被使用，无法删除' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// SKU 编码生成函数
// 格式: 品牌码(2位) + 二级分类码(2位) + 规格码(3位) + 包装码(1位) + 随机码(2位) = 9位
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

  // 生成基础编码
  const baseCode = `${brandCode}${subCategoryCode}${specNumbers}${packagingCode}`;

  // 检查是否已存在，如果存在则添加随机后缀
  let skuCode = baseCode;
  let suffix = 0;
  while (true) {
    const existing = await prisma.productSKU.findUnique({
      where: { skuCode }
    });
    if (!existing) break;
    suffix++;
    const randomPart = Math.random().toString(36).substring(2, 4).toUpperCase();
    skuCode = `${baseCode}${randomPart}`;
    if (suffix > 10) {
      // 如果尝试超过10次，直接用时间戳随机码
      const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
      skuCode = `${baseCode}${timestamp}`;
      break;
    }
  }

  return skuCode;
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

router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, sortOrder } = req.body;
    const category = await prisma.productCategory.update({
      where: { id },
      data: { code, name, sortOrder: sortOrder || 0 },
    });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.productCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/brands', async (req: Request, res: Response) => {
  try {
    const { subCategoryId, name } = req.query;
    const where: any = {};
    if (subCategoryId) where.subCategoryId = String(subCategoryId);
    if (name) where.name = String(name);

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
    const { code, name, subCategoryId, description } = req.body;
    console.log('Creating brand with:', { code, name, subCategoryId, description });
    
    const subCategoryExists = await prisma.productSubCategory.findUnique({ where: { id: subCategoryId } });
    if (!subCategoryExists) {
      console.error('SubCategory does not exist:', subCategoryId);
      return res.status(400).json({ success: false, message: '二级分类不存在' });
    }

    const brand = await prisma.productBrand.create({
      data: { code, name, subCategoryId, description },
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

router.put('/brands/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, subCategoryId, description } = req.body;
    const brand = await prisma.productBrand.update({
      where: { id },
      data: { code, name, subCategoryId, description },
    });
    res.json({ success: true, data: brand });
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/brands/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.productBrand.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete brand error:', error);
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
    const { name, categoryId, brandId, status, warehouseId, ownerId } = req.query;

    let productIds: string[] | undefined;
    let stockMap: Record<string, number> = {};

    if (warehouseId) {
      const stockWhere: any = { warehouseId: String(warehouseId), availableQuantity: { gt: 0 } };
      if (ownerId) {
        stockWhere.sku = { ownerId: { equals: String(ownerId) } };
      }
      const stocks = await prisma.stock.findMany({
        where: stockWhere,
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
    }

    const where: any = {};
    if (name) where.name = { contains: String(name) };
    if (brandId) where.brandId = String(brandId);
    if (status) where.status = String(status);
    if (ownerId) {
      where.OR = [
        { ownerId: String(ownerId) },
        { ownerId: null },
      ];
    }
    if (productIds) {
      where.id = { in: productIds };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        subCategory: { include: { category: true } },
        owner: true,
        brand: { select: { id: true, name: true, code: true } },
        skus: (() => {
          const skuWhere: any = {};
          if (ownerId) {
            skuWhere.OR = [
              { ownerId: String(ownerId) },
              { ownerId: null },
            ];
          }
          return {
            where: Object.keys(skuWhere).length > 0 ? skuWhere : undefined,
            include: {
              stocks: warehouseId ? {
                where: { warehouseId: String(warehouseId) },
                select: { totalQuantity: true },
              } : false,
            },
          };
        })(),
      },
      orderBy: { createdAt: 'desc' },
    });

    const productsWithStock = products.map((p: any) => ({
      ...p,
      skus: p.skus.map((s: any) => ({
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
        subCategory: { include: { category: true } },
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
        imageUrl: data.imageUrl || null,
        brandId: data.brandId,
        subCategoryId: data.subCategoryId,
        ownerId: data.ownerId || null,
      },
      include: {
        subCategory: { include: { category: true } },
        brand: true,
      },
    });

    // 如果有 SKU，批量创建并生成编码
    if (data.skus && data.skus.length > 0) {
      for (const sku of data.skus) {
        const skuCode = await generateSkuCode(product.id, sku.packaging, sku.spec);
        await prisma.productSKU.create({
          data: {
            productId: product.id,
            ownerId: product.ownerId,
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
        subCategory: { include: { category: true } },
        brand: true,
        skus: true,
      },
    });

    res.json({ success: true, data: fullProduct });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Create product error:', error);
    console.error('Error code:', error?.code);
    console.error('Error meta:', error?.meta);
    res.status(500).json({ success: false, message: '服务器错误: ' + (error?.message || 'Unknown') });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = productSchema.parse(req.body);

    // 检查要删除的 SKU 是否被使用
    const existingSkus = await prisma.productSKU.findMany({
      where: { productId: id },
    });
    const existingSkuIds: string[] = existingSkus.map((s: { id: string }) => s.id);
    const skusWithId = data.skus?.filter((s) => s.id) || [];
    const newSkuIds = skusWithId.filter((s) => s.id).map((s) => s.id as string);
    const toDelete = existingSkuIds.filter((skuId) => !newSkuIds.includes(skuId));

    if (toDelete.length > 0) {
      // 检查每个 SKU 是否被库存或套装引用
      const safeToDelete: string[] = [];
      for (const skuId of toDelete) {
        const stockCount = await prisma.stock.count({ where: { skuId } });
        const bundleItemCount = await prisma.bundleSKUItem.count({ where: { skuId } });
        if (stockCount === 0 && bundleItemCount === 0) {
          safeToDelete.push(skuId);
        }
      }
      if (safeToDelete.length > 0) {
        await prisma.productSKU.deleteMany({
          where: { id: { in: safeToDelete } },
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        imageUrl: data.imageUrl || null,
        brandId: data.brandId,
        subCategoryId: data.subCategoryId,
        ownerId: data.ownerId || null,
        status: data.status,
        isVisibleToCustomer: data.isVisibleToCustomer,
      },
      include: {
        subCategory: { include: { category: true } },
        brand: true,
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
              ownerId: data.ownerId || null,
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
              ownerId: data.ownerId || null,
            },
          });
        }
      }
    }

    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        subCategory: { include: { category: true } },
        brand: true,
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

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    // 自动生成 SKU 编码
    const skuCode = await generateSkuCode(id, data.packaging, data.spec);

    const sku = await prisma.productSKU.create({
      data: {
        productId: id,
        ownerId: product.ownerId,
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
