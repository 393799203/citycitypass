import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const ownerSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  productTags: z.array(z.string()).optional(),
  warehouseLocation: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  status: z.string().optional(),
  isSelfOperated: z.boolean().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { name, province, city, status } = req.query;
    
    const where: any = {};
    if (name) where.name = { contains: String(name) };
    if (province) where.province = String(province);
    if (city) where.city = String(city);
    if (status) where.status = String(status);

    const owners = await prisma.owner.findMany({
      where,
      include: {
        warehouses: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: owners });
  } catch (error) {
    console.error('List owners error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const owner = await prisma.owner.findUnique({
      where: { id },
    });

    if (!owner) {
      return res.status(404).json({ success: false, message: '货主不存在' });
    }

    res.json({ success: true, data: owner });
  } catch (error) {
    console.error('Get owner error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = ownerSchema.parse(req.body);

    const owner = await prisma.owner.create({
      data: {
        name: data.name,
        contact: data.contact,
        phone: data.phone,
        productTags: data.productTags || [],
        warehouseLocation: data.warehouseLocation,
        province: data.province,
        city: data.city,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status || 'SERVING',
        isSelfOperated: data.isSelfOperated || false,
      },
    });

    res.json({ success: true, data: owner });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Create owner error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = ownerSchema.parse(req.body);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.contact !== undefined) updateData.contact = data.contact;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.productTags !== undefined) updateData.productTags = data.productTags;
    if (data.warehouseLocation !== undefined) updateData.warehouseLocation = data.warehouseLocation;
    if (data.province !== undefined) updateData.province = data.province;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isSelfOperated !== undefined) updateData.isSelfOperated = data.isSelfOperated;

    const owner = await prisma.owner.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: owner });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Update owner error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.owner.delete({ where: { id } });
    res.json({ success: true, message: '货主已删除' });
  } catch (error) {
    console.error('Delete owner error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
