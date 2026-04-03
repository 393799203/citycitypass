import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId, status, vehicleId, ownerId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId as string;
    if (ownerId) where.warehouse = { ownerId: ownerId as string };

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        warehouse: true,
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, licenseNo, licenseTypes, warehouseId, vehicleId, latitude, longitude, location } = req.body;

    if (!name || !phone || !licenseNo || !warehouseId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const existing = await prisma.driver.findFirst({
      where: { licenseNo },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: '驾驶证号已存在' });
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        phone,
        licenseNo,
        licenseTypes: licenseTypes || [],
        warehouseId,
        vehicleId: vehicleId || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        location: location || null,
      },
      include: {
        warehouse: true,
        vehicle: true,
      },
    });

    res.json({ success: true, data: driver });
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, licenseNo, licenseTypes, status, vehicleId, latitude, longitude, location, address } = req.body;

    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '司机不存在' });
    }

    if (licenseNo && licenseNo !== existing.licenseNo) {
      const duplicate = await prisma.driver.findFirst({ where: { licenseNo } });
      if (duplicate) {
        return res.status(400).json({ success: false, message: '驾驶证号已存在' });
      }
    }

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(licenseNo && { licenseNo }),
        ...(licenseTypes !== undefined && { licenseTypes }),
        ...(status && { status }),
        ...(vehicleId !== undefined && { vehicleId }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(location !== undefined && { location }),
        ...(address !== undefined && { address }),
      },
      include: {
        warehouse: true,
        vehicle: true,
      },
    });

    if (latitude !== undefined || longitude !== undefined || address !== undefined) {
      const vehicleIdToUpdate = driver.vehicleId || existing.vehicleId;
      if (vehicleIdToUpdate) {
        await prisma.vehicle.update({
          where: { id: vehicleIdToUpdate },
          data: {
            ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
            ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
            ...(address !== undefined && { address }),
            ...(location !== undefined && { location }),
          },
        });
      }
    }

    res.json({ success: true, data: driver });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.driver.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
