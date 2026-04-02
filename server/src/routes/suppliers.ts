import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { keyword, status, ownerId } = req.query;
    const where: Prisma.SupplierWhereInput = {};

    if (ownerId) {
      where.OR = [
        { ownerId: String(ownerId) },
        { ownerId: undefined },
      ];
    }

    if (keyword) {
      where.OR = (where.OR || []).concat([
        { name: { contains: keyword as string } },
        { code: { contains: keyword as string } },
        { contact: { contains: keyword as string } },
        { phone: { contains: keyword as string } },
      ]);
    }

    if (status) {
      where.status = status as 'ACTIVE' | 'INACTIVE';
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('List suppliers error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id }
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, contact, phone, address, province, city, district, productTags, status, remark } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '供应商名称不能为空' });
    }

    const code = `SUP${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const supplier = await prisma.supplier.create({
      data: {
        code,
        name,
        contact,
        phone,
        address,
        province,
        city,
        district,
        productTags,
        status: status || 'ACTIVE',
        remark,
        ownerId: req.body.ownerId || null,
      }
    });

    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, contact, phone, address, province, city, district, productTags, status, remark } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: '供应商编码和名称不能为空' });
    }

    const existing = await prisma.supplier.findFirst({
      where: { code, NOT: { id } }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '供应商编码已存在' });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        code,
        name,
        contact,
        phone,
        address,
        province,
        city,
        district,
        productTags,
        status,
        remark,
      }
    });

    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const skuBatches = await prisma.sKUBatch.count({
      where: { supplierId: id }
    });

    const bundleBatches = await prisma.bundleBatch.count({
      where: { supplierId: id }
    });

    if (skuBatches > 0 || bundleBatches > 0) {
      return res.status(400).json({ success: false, message: '该供应商已有批次关联，无法删除' });
    }

    await prisma.supplier.delete({
      where: { id }
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ success: false, message: '删除失败: ' + (error as Error).message });
  }
});

export default router;
