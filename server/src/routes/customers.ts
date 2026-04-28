import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    if ((req as any).ownerAccessDenied) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const { channel, region, level, status, search, ownerId } = req.query;
    const where: any = {};

    if (ownerId) {
      where.OR = [
        { ownerId: ownerId },
        { ownerId: null },
      ];
    }
    if (channel) where.channel = channel as string;
    if (region) where.region = region as string;
    if (level) where.level = level as string;
    if (status) where.status = status as string;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { code: { contains: search as string } },
        { contact: { contains: search as string } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          owner: true,
          contracts: {
            where: { status: 'ACTIVE' },
          },
          shopUsers: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ success: true, data: items, total });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        contracts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id/contracts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contracts = await prisma.contract.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: contracts });
  } catch (error) {
    console.error('Get customer contracts error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const count = await prisma.customer.count();
    const code = `KH${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(count + 1).padStart(4, '0')}`;

    const customer = await prisma.customer.create({
      data: {
        code,
        name: data.name,
        channel: data.channel,
        region: data.region,
        level: data.level,
        contact: data.contact,
        phone: data.phone,
        province: data.province,
        city: data.city,
        district: data.district,
        address: data.address,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        deliveryStartTime: data.deliveryStartTime,
        deliveryEndTime: data.deliveryEndTime,
        specialRequirements: data.specialRequirements,
        inspectionRequired: data.inspectionRequired,
        certificateRequired: data.certificateRequired,
        signatureNote: data.signatureNote,
        status: data.status,
        remark: data.remark,
        ownerId: data.ownerId || null,
      },
    });

    res.json({ success: true, data: customer });
  } catch (error: any) {
    console.error('Create customer error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: '客户编码已存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        channel: data.channel,
        region: data.region,
        level: data.level,
        contact: data.contact,
        phone: data.phone,
        province: data.province,
        city: data.city,
        district: data.district,
        address: data.address,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        deliveryStartTime: data.deliveryStartTime,
        deliveryEndTime: data.deliveryEndTime,
        specialRequirements: data.specialRequirements,
        inspectionRequired: data.inspectionRequired,
        certificateRequired: data.certificateRequired,
        signatureNote: data.signatureNote,
        status: data.status,
        remark: data.remark,
      },
    });

    res.json({ success: true, data: customer });
  } catch (error: any) {
    console.error('Update customer error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: '客户编码已存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.customer.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete customer error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:customerId/shop-users/:shopUserId', async (req: Request, res: Response) => {
  try {
    const { customerId, shopUserId } = req.params;

    await prisma.shopUser.update({
      where: { id: shopUserId },
      data: { customerId: null },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Unbind shop user error:', error);
    res.status(500).json({ success: false, message: '解除绑定失败' });
  }
});

export default router;
