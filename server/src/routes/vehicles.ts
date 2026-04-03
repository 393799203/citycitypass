import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId, status } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (status) where.status = status;

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        warehouse: true,
        drivers: true,
        _count: {
          select: { dispatches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: vehicles });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/all', async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.query;

    const warehouseWhere: any = {};
    const carrierWhere: any = {};

    if (ownerId) {
      warehouseWhere.warehouse = { ownerId: ownerId as string };
      carrierWhere.carrier = { ownerId: ownerId as string };
    }

    const [warehouseVehicles, carrierVehicles] = await Promise.all([
      prisma.vehicle.findMany({
        where: warehouseWhere,
        include: {
          warehouse: true,
          drivers: true,
          _count: { select: { dispatches: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.carrierVehicle.findMany({
        where: carrierWhere,
        include: {
          carrier: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const unifiedWarehouse = warehouseVehicles.map(v => ({
      ...v,
      sourceType: 'WAREHOUSE' as const,
      carrier: null,
    }));

    const unifiedCarrier = carrierVehicles.map(v => ({
      ...v,
      sourceType: 'CARRIER' as const,
      warehouse: v.carrier,
      warehouseId: null,
    }));

    res.json({ success: true, data: [...unifiedWarehouse, ...unifiedCarrier] });
  } catch (error) {
    console.error('Get all vehicles error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { licensePlate, vehicleType, brand, model, capacity, volume, licenseNo, insuranceNo, warehouseId, latitude, longitude, location, address } = req.body;

    if (!licensePlate || !vehicleType || !capacity || !warehouseId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const existing = await prisma.vehicle.findFirst({
      where: { licensePlate },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: '车牌号已存在' });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        licensePlate,
        vehicleType,
        brand: brand || null,
        model: model || null,
        capacity: parseFloat(capacity),
        volume: volume ? parseFloat(volume) : null,
        licenseNo: licenseNo || null,
        insuranceNo: insuranceNo || null,
        warehouseId,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        location: location || null,
        address: address || null,
      },
      include: {
        warehouse: true,
      },
    });

    res.json({ success: true, data: vehicle });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { licensePlate, vehicleType, brand, model, capacity, volume, licenseNo, insuranceNo, status, latitude, longitude, location, address } = req.body;

    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '车辆不存在' });
    }

    if (licensePlate && licensePlate !== existing.licensePlate) {
      const duplicate = await prisma.vehicle.findFirst({ where: { licensePlate } });
      if (duplicate) {
        return res.status(400).json({ success: false, message: '车牌号已存在' });
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(licensePlate && { licensePlate }),
        ...(vehicleType && { vehicleType }),
        ...(brand !== undefined && { brand }),
        ...(model !== undefined && { model }),
        ...(capacity !== undefined && { capacity: parseFloat(capacity) }),
        ...(volume !== undefined && { volume: volume ? parseFloat(volume) : null }),
        ...(licenseNo !== undefined && { licenseNo }),
        ...(insuranceNo !== undefined && { insuranceNo }),
        ...(status && { status }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(location !== undefined && { location }),
        ...(address !== undefined && { address }),
      },
      include: {
        warehouse: true,
      },
    });

    if (latitude !== undefined || longitude !== undefined || address !== undefined) {
      const drivers = await prisma.driver.findMany({
        where: { vehicleId: id, status: 'IN_TRANSIT' },
      });
      for (const driver of drivers) {
        await prisma.driver.update({
          where: { id: driver.id },
          data: {
            ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
            ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
            ...(address !== undefined && { address }),
            ...(location !== undefined && { location }),
          },
        });
      }
    }

    res.json({ success: true, data: vehicle });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '车辆不存在' });
    }

    const inTransitDispatch = await prisma.dispatch.findFirst({
      where: {
        vehicleId: id,
        status: 'IN_TRANSIT',
      },
    });
    if (inTransitDispatch) {
      return res.status(400).json({ success: false, message: '车辆正在配送中，无法删除' });
    }

    await prisma.vehicle.delete({ where: { id } });

    res.json({ success: true, message: '车辆已删除' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
