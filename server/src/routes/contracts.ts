import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { customerId, status, search } = req.query;
    const where: any = {};

    if (customerId) where.customerId = customerId as string;
    if (status) where.status = status as string;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { contractNo: { contains: search as string } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contract.count({ where }),
    ]);

    res.json({ success: true, data: items, total });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: '合同不存在' });
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const contractNo = `C${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const contract = await prisma.contract.create({
      data: {
        contractNo,
        name: data.name,
        customerId: data.customerId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        amount: data.amount ? parseFloat(data.amount) : null,
        discount: data.discount ? parseFloat(data.discount) : null,
        pricingTerms: data.pricingTerms,
        serviceTerms: data.serviceTerms,
        specialTerms: data.specialTerms,
        status: data.status || 'DRAFT',
        autoRenew: data.autoRenew,
      },
    });

    res.json({ success: true, data: contract });
  } catch (error: any) {
    console.error('Create contract error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: '合同编号已存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updateData: any = {
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      amount: data.amount,
      pricingTerms: data.pricingTerms,
      serviceTerms: data.serviceTerms,
      specialTerms: data.specialTerms,
      status: data.status,
      autoRenew: data.autoRenew,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
    };

    const contract = await prisma.contract.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: contract });
  } catch (error: any) {
    console.error('Update contract error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '合同不存在' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: '合同编号已存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.contract.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete contract error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '合同不存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
