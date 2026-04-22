import { Router } from 'express';
import { PrismaClient, PurchaseOrderStatus, PurchaseItemStatus, ItemType } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, '请选择供应商'),
  warehouseId: z.string().optional(),
  ownerId: z.string().optional(),
  orderDate: z.string().or(z.date()),
  expectedDate: z.string().or(z.date()).optional(),
  remark: z.string().optional(),
  items: z.array(z.object({
    itemType: z.enum(['PRODUCT', 'BUNDLE', 'MATERIAL', 'OTHER']),
    skuId: z.string().nullable().optional(),
    bundleId: z.string().nullable().optional(),
    supplierMaterialId: z.string().nullable().optional(),
    quantity: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseInt(v) || 0 : v),
    price: z.union([z.string(), z.number()]).nullable().optional().transform(v => typeof v === 'string' ? parseFloat(v) || 0 : (v ?? 0)),
    productionDate: z.string().or(z.date()).optional(),
    expireDate: z.string().or(z.date()).optional(),
  })).min(1, '请添加采购商品'),
});

const deliverySchema = z.object({
  deliveryDate: z.string().or(z.date()),
  carrierName: z.string().optional(),
  trackingNo: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  remark: z.string().optional(),
  items: z.array(z.object({
    purchaseOrderItemId: z.string().optional(),
    itemType: z.enum(['PRODUCT', 'BUNDLE', 'MATERIAL', 'OTHER']),
    skuId: z.string().optional(),
    bundleId: z.string().optional(),
    supplierMaterialId: z.string().optional(),
    quantity: z.number().min(1),
    qualifiedQuantity: z.number().optional(),
    rejectedQuantity: z.number().optional(),
    skuBatchId: z.string().optional(),
    bundleBatchId: z.string().optional(),
    locationId: z.string().optional(),
  })).min(1, '请添加到货商品'),
});

// 获取采购单列表
router.get('/', async (req, res, next) => {
  try {
    if ((req as any).ownerAccessDenied) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string;
    const supplierId = req.query.supplierId as string;
    const ownerId = req.query.ownerId as string;

    const where: any = {};
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          owner: true,
          items: {
            include: {
              sku: { include: { product: true } },
              bundle: true,
              supplierMaterial: true,
            },
          },
          inboundOrders: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        data: orders,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 获取采购单详情
router.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        owner: true,
        items: {
          include: {
            sku: { include: { product: true } },
            bundle: true,
            supplierMaterial: true,
          },
        },
        inboundOrders: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '采购单不存在' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// 创建采购单
router.post('/', async (req, res, next) => {
  try {
    const data = purchaseOrderSchema.parse(req.body);
    const { ownerId } = req.query;

    const count = await prisma.purchaseOrder.count();
    const orderNo = `PO${Date.now().toString().slice(-10)}${(count + 1).toString().padStart(4, '0')}`;

    const supplierProducts = await prisma.supplierProduct.findMany({
      where: {
        supplierId: data.supplierId,
        status: 'ACTIVE',
      },
    });

    const itemsWithPrice = data.items.map(item => {
      let price = item.price;
      
      if (!price) {
        const sp = supplierProducts.find(sp => 
          (item.itemType === 'PRODUCT' && sp.skuId === item.skuId) ||
          (item.itemType === 'BUNDLE' && sp.bundleId === item.bundleId)
        );
        if (sp?.price) {
          price = Number(sp.price);
        }
      }
      
      return {
        ...item,
        price: price || 0,
      };
    });

    const totalAmount = itemsWithPrice.reduce((sum, item) => {
      return sum + (item.price || 0) * item.quantity;
    }, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNo,
        supplierId: data.supplierId,
        warehouseId: data.warehouseId || null,
        ownerId: ownerId as string || data.ownerId || null,
        orderDate: new Date(data.orderDate),
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        totalAmount,
        remark: data.remark,
        status: PurchaseOrderStatus.PENDING,
        items: {
          create: itemsWithPrice.map(item => ({
            itemType: item.itemType as ItemType,
            skuId: item.skuId || null,
            bundleId: item.bundleId || null,
            supplierMaterialId: item.supplierMaterialId || null,
            quantity: item.quantity,
            price: item.price || null,
            amount: item.price ? item.price * item.quantity : null,
            productionDate: item.productionDate ? new Date(item.productionDate) : null,
            expireDate: item.expireDate ? new Date(item.expireDate) : null,
            status: PurchaseItemStatus.PENDING,
          })),
        },
      },
      include: {
        supplier: true,
        
        items: true,
      },
    });

    res.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    next(error);
  }
});

// 更新采购单
router.put('/:id', async (req, res, next) => {
  try {
    const data = purchaseOrderSchema.partial().parse(req.body);
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '采购单不存在' });
    }

    if (order.status !== PurchaseOrderStatus.PENDING) {
      return res.status(400).json({ success: false, message: '只能编辑待确认的采购单' });
    }

    const updateData: any = {};
    if (data.supplierId) updateData.supplierId = data.supplierId;
    if (data.warehouseId !== undefined) updateData.warehouseId = data.warehouseId;
    if (data.orderDate) updateData.orderDate = new Date(data.orderDate);
    if (data.expectedDate) updateData.expectedDate = new Date(data.expectedDate);
    if (data.remark !== undefined) updateData.remark = data.remark;

    if (data.items) {
      const supplierProducts = await prisma.supplierProduct.findMany({
        where: {
          supplierId: data.supplierId || order.supplierId,
          status: 'ACTIVE',
        },
      });

      const itemsWithPrice = data.items.map(item => {
        let price = item.price;
        
        if (!price) {
          const sp = supplierProducts.find(sp => 
            (item.itemType === 'PRODUCT' && sp.skuId === item.skuId) ||
            (item.itemType === 'BUNDLE' && sp.bundleId === item.bundleId)
          );
          if (sp?.price) {
            price = Number(sp.price);
          }
        }
        
        return {
          ...item,
          price: price || 0,
        };
      });

      updateData.items = {
        deleteMany: {},
        create: itemsWithPrice.map(item => ({
          itemType: item.itemType as ItemType,
          skuId: item.skuId || undefined,
          bundleId: item.bundleId || undefined,
          supplierMaterialId: item.supplierMaterialId || undefined,
          quantity: item.quantity,
          price: item.price || undefined,
          amount: item.price ? item.price * item.quantity : undefined,
          productionDate: item.productionDate ? new Date(item.productionDate) : undefined,
          expireDate: item.expireDate ? new Date(item.expireDate) : undefined,
          status: PurchaseItemStatus.PENDING,
        })),
      };

      const totalAmount = itemsWithPrice.reduce((sum, item) => {
        return sum + (item.price || 0) * item.quantity;
      }, 0);
      updateData.totalAmount = totalAmount;
    }

    const result = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        supplier: true,
        
        items: true,
      },
    });

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    next(error);
  }
});

// 确认采购单
router.patch('/:id/confirm', async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '采购单不存在' });
    }

    if (order.status !== PurchaseOrderStatus.PENDING) {
      return res.status(400).json({ success: false, message: '只能确认待确认的采购单' });
    }

    const result = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: PurchaseOrderStatus.CONFIRMED },
      include: {
        supplier: true,
        items: true,
      },
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 取消采购单
router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '采购单不存在' });
    }

    if (order.status === PurchaseOrderStatus.ARRIVED || order.status === PurchaseOrderStatus.PARTIAL) {
      return res.status(400).json({ success: false, message: '已到货的采购单不能取消' });
    }

    const result = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
        items: {
          updateMany: {
            where: { status: PurchaseItemStatus.PENDING },
            data: { status: PurchaseItemStatus.CANCELLED },
          },
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 删除采购单
router.delete('/:id', async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '采购单不存在' });
    }

    if (order.status !== PurchaseOrderStatus.PENDING) {
      return res.status(400).json({ success: false, message: '只能删除待确认的采购单' });
    }

    await prisma.purchaseOrder.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: '采购单已删除' });
  } catch (error) {
    next(error);
  }
});

export default router;
