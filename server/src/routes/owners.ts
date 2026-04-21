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
      orderBy: [
        { isSelfOperated: 'desc' },
        { createdAt: 'desc' },
      ],
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
      return res.status(404).json({ success: false, message: '主体不存在' });
    }

    res.json({ success: true, data: owner });
  } catch (error) {
    console.error('Get owner error:', error);
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
    console.error('Get owner contracts error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = ownerSchema.parse(req.body);

    console.log('Create owner - user:', req.user);

    const owner = await prisma.owner.create({
      data: {
        name: data.name!,
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

    if (req.user && req.user.id) {
      const ownerRole = await prisma.role.findUnique({ where: { code: 'OWNER' } });
      if (ownerRole) {
        console.log('Creating UserOwner link:', { userId: req.user.id, ownerId: owner.id, roleId: ownerRole.id });
        await prisma.userOwner.create({
          data: {
            userId: req.user.id,
            ownerId: owner.id,
            roleId: ownerRole.id,
          },
        });
      }
    } else {
      console.log('WARNING: req.user is not set, skipping UserOwner creation');
    }

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
    
    // 开始事务
    await prisma.$transaction(async (prisma) => {
      // 1. 删除关联的客户及合同
      const customers = await prisma.customer.findMany({ where: { ownerId: id } });
      for (const customer of customers) {
        await prisma.contract.deleteMany({ where: { customerId: customer.id } });
        await prisma.customer.delete({ where: { id: customer.id } });
      }
      
      // 2. 删除关联的供应商及相关资源
      const suppliers = await prisma.supplier.findMany({ where: { ownerId: id } });
      for (const supplier of suppliers) {
        await prisma.supplierContract.deleteMany({ where: { supplierId: supplier.id } });
        await prisma.supplierProduct.deleteMany({ where: { supplierId: supplier.id } });
        await prisma.supplierMaterial.deleteMany({ where: { supplierId: supplier.id } });
        await prisma.supplier.delete({ where: { id: supplier.id } });
      }
      
      // 3. 删除关联的承运商及相关资源
      const carriers = await prisma.carrier.findMany({ where: { ownerId: id } });
      for (const carrier of carriers) {
        await prisma.carrierContract.deleteMany({ where: { carrierId: carrier.id } });
        await prisma.carrierVehicle.deleteMany({ where: { carrierId: carrier.id } });
        await prisma.carrier.delete({ where: { id: carrier.id } });
      }
      
      // 4. 删除关联的商品及SKU
      const products = await prisma.product.findMany({ where: { ownerId: id } });
      for (const product of products) {
        const skus = await prisma.productSKU.findMany({ where: { productId: product.id } });
        for (const sku of skus) {
          // 删除与SKU相关的资源
          await prisma.supplierProduct.deleteMany({ where: { skuId: sku.id } });
          await prisma.productSKU.delete({ where: { id: sku.id } });
        }
        await prisma.product.delete({ where: { id: product.id } });
      }
      
      // 5. 删除关联的套装
      const bundles = await prisma.bundleSKU.findMany({ where: { ownerId: id } });
      for (const bundle of bundles) {
        await prisma.bundleSKUItem.deleteMany({ where: { bundleId: bundle.id } });
        await prisma.supplierProduct.deleteMany({ where: { bundleId: bundle.id } });
        await prisma.bundleSKU.delete({ where: { id: bundle.id } });
      }
      
      // 6. 删除关联的仓库及相关资源
      const warehouses = await prisma.warehouse.findMany({ where: { ownerId: id } });
      for (const warehouse of warehouses) {
        // 删除仓库相关的资源
        await prisma.zone.deleteMany({ where: { warehouseId: warehouse.id } });
        await prisma.vehicle.deleteMany({ where: { warehouseId: warehouse.id } });
        await prisma.driver.deleteMany({ where: { warehouseId: warehouse.id } });
        await prisma.warehouse.delete({ where: { id: warehouse.id } });
      }
      
      // 7. 删除关联的订单及相关资源
      const orders = await prisma.order.findMany({ where: { ownerId: id } });
      for (const order of orders) {
        await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
        await prisma.stockLock.deleteMany({ where: { orderId: order.id } });
        await prisma.bundleStockLock.deleteMany({ where: { orderId: order.id } });
        await prisma.dispatchOrder.deleteMany({ where: { orderId: order.id } });
        await prisma.returnOrder.deleteMany({ where: { orderId: order.id } });
        await prisma.order.delete({ where: { id: order.id } });
      }
      
      // 8. 删除关联的退货订单
      const returnOrders = await prisma.returnOrder.findMany({ where: { ownerId: id } });
      for (const returnOrder of returnOrders) {
        await prisma.returnItem.deleteMany({ where: { returnOrderId: returnOrder.id } });
        await prisma.returnLog.deleteMany({ where: { returnOrderId: returnOrder.id } });
        await prisma.returnOrder.delete({ where: { id: returnOrder.id } });
      }
      
      // 9. 删除关联的采购订单
      const purchaseOrders = await prisma.purchaseOrder.findMany({ where: { ownerId: id } });
      for (const purchaseOrder of purchaseOrders) {
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: purchaseOrder.id } });
        await prisma.purchaseOrder.delete({ where: { id: purchaseOrder.id } });
      }
      
      // 10. 最后删除主体
      await prisma.owner.delete({ where: { id } });
    });
    
    res.json({ success: true, message: '主体及关联资源已删除' });
  } catch (error) {
    console.error('Delete owner error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
