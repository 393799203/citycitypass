import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const carrierSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
  level: z.enum(['A', 'B', 'C']).optional(),
  businessLicenseNo: z.string().optional(),
  businessLicenseUrl: z.string().optional(),
  transportLicenseNo: z.string().optional(),
  transportLicenseUrl: z.string().optional(),
  serviceTypes: z.array(z.string()).optional(),
  coverageAreas: z.array(z.string()).optional(),
  vehicleTypes: z.array(z.string()).optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  rejectionReason: z.string().optional(),
  remark: z.string().optional(),
});

const contractSchema = z.object({
  carrierId: z.string(),
  contractNo: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  serviceTerms: z.string().optional(),
  priceTerms: z.string().optional(),
  paymentTerms: z.string().optional(),
  liabilityTerms: z.string().optional(),
  amount: z.number().optional(),
  deposit: z.number().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  remark: z.string().optional(),
});

const vehicleSchema = z.object({
  licensePlate: z.string(),
  vehicleType: z.string(),
  brand: z.string().optional(),
  model: z.string().optional(),
  capacity: z.union([z.number(), z.string()]).optional(),
  volume: z.union([z.number(), z.string()]).optional(),
  licenseNo: z.string().optional(),
  licenseUrl: z.string().optional(),
  insuranceNo: z.string().optional(),
  insuranceUrl: z.string().optional(),
  status: z.enum(['AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'DISABLED']).optional(),
  remark: z.string().optional(),
});

// 获取承运商列表
router.get('/', async (req, res, next) => {
  try {
    const { status, level, type, search, ownerId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (level) where.level = level;
    if (type) where.type = type;
    if (ownerId) where.ownerId = ownerId;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { code: { contains: search as string } },
        { contact: { contains: search as string } },
      ];
    }

    const carriers = await prisma.carrier.findMany({
      where,
      include: {
        contracts: true,
        vehicles: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: carriers });
  } catch (error) {
    next(error);
  }
});

// 获取单个承运商
router.get('/:id', async (req, res, next) => {
  try {
    const carrier = await prisma.carrier.findUnique({
      where: { id: req.params.id },
      include: {
        contracts: { orderBy: { createdAt: 'desc' } },
        vehicles: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!carrier) {
      return res.status(404).json({ success: false, message: '承运商不存在' });
    }

    res.json({ success: true, data: carrier });
  } catch (error) {
    next(error);
  }
});

// 创建承运商
router.post('/', async (req, res, next) => {
  try {
    const data = carrierSchema.parse(req.body);

    const count = await prisma.carrier.count();
    const code = data.code || `CY${Date.now().toString().slice(-8)}${(count + 1).toString().padStart(4, '0')}`;

    const carrier = await prisma.carrier.create({
      data: { ...data, code }
    });
    res.json({ success: true, data: carrier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    next(error);
  }
});

// 更新承运商
router.put('/:id', async (req, res, next) => {
  try {
    const data = carrierSchema.partial().parse(req.body);
    const carrier = await prisma.carrier.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: carrier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    next(error);
  }
});

// 删除承运商
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.carrier.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

// 审核承运商
router.post('/:id/approve', async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;
    const carrier = await prisma.carrier.findUnique({ where: { id: req.params.id } });

    if (!carrier) {
      return res.status(404).json({ success: false, message: '承运商不存在' });
    }

    let status = carrier.status;
    if (action === 'approve') {
      status = 'APPROVED';
    } else if (action === 'reject') {
      status = 'REJECTED';
    } else if (action === 'suspend') {
      status = 'SUSPENDED';
    }

    const updated = await prisma.carrier.update({
      where: { id: req.params.id },
      data: {
        status,
        rejectionReason: action === 'reject' ? rejectionReason : null,
        approvedAt: action === 'approve' ? new Date() : undefined,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// 合同管理
router.get('/:id/contracts', async (req, res, next) => {
  try {
    const contracts = await prisma.carrierContract.findMany({
      where: { carrierId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: contracts });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/contracts', async (req, res, next) => {
  try {
    const { contractNo, name, startDate, endDate, status, ...rest } = req.body;
    if (!contractNo || !name || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: '合同编号、名称、开始日期、结束日期为必填项' });
    }
    const contract = await prisma.carrierContract.create({
      data: {
        carrierId: req.params.id,
        contractNo,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'ACTIVE',
        ...rest
      }
    });
    res.json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
});

router.put('/contracts/:contractId', async (req, res, next) => {
  try {
    const { contractNo, name, startDate, endDate, status, serviceTerms, priceTerms, paymentTerms, liabilityTerms, amount, deposit, remark } = req.body;
    const data: any = {};
    if (contractNo !== undefined) data.contractNo = contractNo;
    if (name !== undefined) data.name = name;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (status !== undefined) data.status = status;
    if (serviceTerms !== undefined) data.serviceTerms = serviceTerms;
    if (priceTerms !== undefined) data.priceTerms = priceTerms;
    if (paymentTerms !== undefined) data.paymentTerms = paymentTerms;
    if (liabilityTerms !== undefined) data.liabilityTerms = liabilityTerms;
    if (amount !== undefined) data.amount = amount;
    if (deposit !== undefined) data.deposit = deposit;
    if (remark !== undefined) data.remark = remark;

    const contract = await prisma.carrierContract.update({
      where: { id: req.params.contractId },
      data,
    });
    res.json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
});

router.delete('/contracts/:contractId', async (req, res, next) => {
  try {
    await prisma.carrierContract.delete({ where: { id: req.params.contractId } });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

// 获取所有承运商车辆
router.get('/vehicles/all', async (req, res, next) => {
  try {
    const { ownerId } = req.query;
    const where: any = {};
    if (ownerId) where.carrier = { ownerId: ownerId as string };

    const vehicles = await prisma.carrierVehicle.findMany({
      where,
      include: { carrier: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: vehicles });
  } catch (error) {
    next(error);
  }
});

// 车辆管理
router.get('/:id/vehicles', async (req, res, next) => {
  try {
    const vehicles = await prisma.carrierVehicle.findMany({
      where: { carrierId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: vehicles });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/vehicles', async (req, res, next) => {
  try {
    const data = vehicleSchema.parse(req.body);
    const processedData: any = { ...data, carrierId: req.params.id };
    if (processedData.capacity !== undefined) {
      processedData.capacity = parseFloat(processedData.capacity);
    }
    if (processedData.volume !== undefined) {
      processedData.volume = processedData.volume ? parseFloat(processedData.volume) : null;
    }
    const vehicle = await prisma.carrierVehicle.create({
      data: processedData
    });
    res.json({ success: true, data: vehicle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    next(error);
  }
});

router.put('/vehicles/:vehicleId', async (req, res, next) => {
  try {
    const data = vehicleSchema.partial().parse(req.body);
    const processedData: any = { ...data };
    if (processedData.capacity !== undefined) {
      processedData.capacity = parseFloat(processedData.capacity);
    }
    if (processedData.volume !== undefined) {
      processedData.volume = processedData.volume ? parseFloat(processedData.volume) : null;
    }
    const vehicle = await prisma.carrierVehicle.update({
      where: { id: req.params.vehicleId },
      data: processedData,
    });
    res.json({ success: true, data: vehicle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    next(error);
  }
});

router.put('/vehicles/:vehicleId/location', async (req, res, next) => {
  try {
    const { latitude, longitude, location, address } = req.body;
    const vehicle = await prisma.carrierVehicle.update({
      where: { id: req.params.vehicleId },
      data: {
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        location: location || null,
        address: address || null,
      },
    });
    res.json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
});

router.delete('/vehicles/:vehicleId', async (req, res, next) => {
  try {
    await prisma.carrierVehicle.delete({ where: { id: req.params.vehicleId } });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

// 审核车辆
router.post('/vehicles/:vehicleId/approve', async (req, res, next) => {
  try {
    const { action } = req.body;
    let status: 'AVAILABLE' | 'DISABLED' = 'AVAILABLE';
    if (action === 'approve') status = 'AVAILABLE';
    else if (action === 'reject') status = 'DISABLED';

    const vehicle = await prisma.carrierVehicle.update({
      where: { id: req.params.vehicleId },
      data: { status },
    });
    res.json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
});

export default router;
