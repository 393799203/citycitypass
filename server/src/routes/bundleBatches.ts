import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { bundleId, supplierId, search } = req.query;

    const where: any = {};
    if (bundleId) where.bundleId = bundleId;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { batchNo: { contains: search as string } },
        { bundle: { name: { contains: search as string } } },
      ];
    }

    const batches = await prisma.bundleBatch.findMany({
      where,
      include: {
        bundle: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: batches });
  } catch (error: any) {
    console.error('Get bundle batches error:', error);
    res.status(500).json({ success: false, message: '获取批次列表失败' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const batch = await prisma.bundleBatch.findUnique({
      where: { id },
      include: {
        bundle: true,
        supplier: true,
      },
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    res.json({ success: true, data: batch });
  } catch (error: any) {
    console.error('Get bundle batch error:', error);
    res.status(500).json({ success: false, message: '获取批次详情失败' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { batchNo, bundleId, productionDate, expiryDate, supplierId } = req.body;

    if (!batchNo || !bundleId) {
      return res.status(400).json({ success: false, message: '批次号和套装不能为空' });
    }

    const existing = await prisma.bundleBatch.findFirst({
      where: {
        bundleId,
        batchNo,
      },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '该套装的批次号已存在' });
    }

    const batch = await prisma.bundleBatch.create({
      data: {
        batchNo,
        bundleId,
        productionDate: productionDate ? new Date(productionDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        supplierId: supplierId || null,
      },
      include: {
        bundle: true,
        supplier: true,
      },
    });

    res.json({ success: false, data: batch });
  } catch (error: any) {
    console.error('Create bundle batch error:', error);
    res.status(500).json({ success: false, message: '创建批次失败' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { productionDate, expiryDate, supplierId } = req.body;

    const batch = await prisma.bundleBatch.update({
      where: { id },
      data: {
        productionDate: productionDate ? new Date(productionDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        supplierId: supplierId || null,
      },
      include: {
        bundle: true,
        supplier: true,
      },
    });

    res.json({ success: true, data: batch });
  } catch (error: any) {
    console.error('Update bundle batch error:', error);
    res.status(500).json({ success: false, message: '更新批次失败' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const stocks = await prisma.bundleStock.count({
      where: { bundleBatchId: id }
    });

    if (stocks > 0) {
      return res.status(400).json({ success: false, message: '该批次已有库存，无法删除' });
    }

    await prisma.bundleBatch.delete({
      where: { id }
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('Delete bundle batch error:', error);
    res.status(500).json({ success: false, message: '删除批次失败' });
  }
});

export default router;
