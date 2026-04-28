import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { generateOrderNo } from '../utils/helpers';
import { WechatPaymentService, AlipayPaymentService, MockPaymentService } from '../services/payment';
import { paymentConfig, PaymentMethod, PaymentStatus } from '../config/payment';

const router = Router();

router.get('/products', async (req: Request, res: Response) => {
  try {
    const { name, categoryId, brandId, ownerId } = req.query;

    const productWhere: any = {
      isVisibleToCustomer: true,
      status: 'ACTIVE',
    };

    if (name) productWhere.name = { contains: String(name) };
    if (brandId) productWhere.brandId = String(brandId);
    if (categoryId) {
      productWhere.subCategory = { categoryId: String(categoryId) };
    }
    if (ownerId) {
      productWhere.ownerId = String(ownerId);
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        owner: { select: { id: true, name: true } },
        subCategory: { include: { category: true } },
        brand: { select: { id: true, name: true, code: true } },
        skus: {
          include: {
            stocks: {
              where: { 
                availableQuantity: { gt: 0 }
              },
              select: { 
                availableQuantity: true, 
                warehouseId: true,
                warehouse: { select: { id: true, name: true } }
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productsWithStock = products.map((p: any) => ({
      ...p,
      type: 'PRODUCT',
      skus: p.skus.map((s: any) => ({
        ...s,
        availableStock: s.stocks.reduce((sum: number, stock: any) => sum + stock.availableQuantity, 0),
      })),
    }));

    const bundleWhere: any = {
      isVisibleToCustomer: true,
      status: 'ACTIVE',
    };

    if (name) bundleWhere.name = { contains: String(name) };
    if (ownerId) {
      bundleWhere.ownerId = String(ownerId);
    }

    const bundles = await prisma.bundleSKU.findMany({
      where: bundleWhere,
      include: {
        owner: { select: { id: true, name: true } },
        stocks: {
          where: { 
            availableQuantity: { gt: 0 }
          },
          select: { 
            availableQuantity: true, 
            warehouseId: true,
            warehouse: { select: { id: true, name: true } }
          },
        },
        items: {
          include: {
            sku: {
              select: {
                id: true,
                spec: true,
                packaging: true,
                product: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const bundlesWithStock = bundles.map((b: any) => ({
      ...b,
      type: 'BUNDLE',
      availableStock: b.stocks.reduce((sum: number, stock: any) => sum + stock.availableQuantity, 0),
    }));

    const allProducts = [...productsWithStock, ...bundlesWithStock];

    res.json({ success: true, data: allProducts });
  } catch (error) {
    console.error('List public products error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findFirst({
      where: {
        id,
        isVisibleToCustomer: true,
        status: 'ACTIVE',
      },
      include: {
        owner: { select: { id: true, name: true } },
        subCategory: { include: { category: true } },
        brand: true,
        skus: {
          include: {
            stocks: {
              where: { 
                availableQuantity: { gt: 0 }
              },
              select: { 
                availableQuantity: true, 
                warehouseId: true,
                warehouse: { select: { id: true, name: true } }
              },
            },
          },
        },
      },
    });

    if (product) {
      const productWithStock = {
        ...product,
        type: 'PRODUCT',
        skus: product.skus.map((s: any) => ({
          ...s,
          availableStock: s.stocks.reduce((sum: number, stock: any) => sum + stock.availableQuantity, 0),
        })),
      };
      return res.json({ success: true, data: productWithStock });
    }

    const bundle = await prisma.bundleSKU.findFirst({
      where: {
        id,
        isVisibleToCustomer: true,
        status: 'ACTIVE',
      },
      include: {
        owner: { select: { id: true, name: true } },
        stocks: {
          where: { 
            availableQuantity: { gt: 0 }
          },
          select: { 
            availableQuantity: true, 
            warehouseId: true,
            warehouse: { select: { id: true, name: true } }
          },
        },
        items: {
          include: {
            sku: {
              include: {
                product: { select: { name: true } }
              }
            }
          }
        }
      },
    });

    if (bundle) {
      const bundleWithStock = {
        ...bundle,
        type: 'BUNDLE',
        availableStock: bundle.stocks.reduce((sum: number, stock: any) => sum + stock.availableQuantity, 0),
      };
      return res.json({ success: true, data: bundleWithStock });
    }

    res.status(404).json({ success: false, message: '商品不存在或不可见' });
  } catch (error) {
    console.error('Get public product error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

const cartItemSchema = z.object({
  sessionId: z.string().min(1),
  productId: z.string().optional(),
  skuId: z.string().optional(),
  bundleId: z.string().optional(),
  quantity: z.number().int().min(1),
});

router.post('/cart', async (req: Request, res: Response) => {
  try {
    const data = cartItemSchema.parse(req.body);

    if (data.bundleId) {
      const bundle = await prisma.bundleSKU.findFirst({
        where: {
          id: data.bundleId,
          isVisibleToCustomer: true,
          status: 'ACTIVE',
        },
      });

      if (!bundle) {
        return res.status(404).json({ success: false, message: '套装不存在或不可见' });
      }

      const existingItem = await prisma.cart.findFirst({
        where: {
          sessionId: data.sessionId,
          bundleId: data.bundleId,
        },
      });

      if (existingItem) {
        const updatedItem = await prisma.cart.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + data.quantity },
          include: { 
            bundle: { 
              include: { 
                stocks: { where: { availableQuantity: { gt: 0 } } },
                items: { include: { sku: { include: { product: { select: { name: true } } } } } }
              } 
            } 
          },
        });
        return res.json({ success: true, data: updatedItem });
      }

      const cartItem = await prisma.cart.create({
        data: {
          sessionId: data.sessionId,
          bundleId: data.bundleId,
          quantity: data.quantity,
        },
        include: { 
          bundle: { 
            include: { 
              stocks: { where: { availableQuantity: { gt: 0 } } },
              items: { include: { sku: { include: { product: { select: { name: true } } } } } }
            } 
          } 
        },
      });

      return res.json({ success: true, data: cartItem });
    }

    if (!data.productId) {
      return res.status(400).json({ success: false, message: '缺少商品ID或套装ID' });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        isVisibleToCustomer: true,
        status: 'ACTIVE',
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在或不可见' });
    }

    const existingItem = await prisma.cart.findFirst({
      where: {
        sessionId: data.sessionId,
        productId: data.productId,
        skuId: data.skuId || null,
      },
    });

    if (existingItem) {
      const updatedItem = await prisma.cart.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + data.quantity },
        include: { 
          product: { include: { brand: true } }, 
          sku: { include: { stocks: { where: { availableQuantity: { gt: 0 } } } } }
        },
      });
      return res.json({ success: true, data: updatedItem });
    }

    const cartItem = await prisma.cart.create({
      data: {
        sessionId: data.sessionId,
        productId: data.productId,
        skuId: data.skuId || null,
        quantity: data.quantity,
      },
      include: { 
        product: { include: { brand: true } }, 
        sku: { include: { stocks: { where: { availableQuantity: { gt: 0 } } } } }
      },
    });

    res.json({ success: true, data: cartItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/cart', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少sessionId参数' });
    }

    const cartItems = await prisma.cart.findMany({
      where: { sessionId: String(sessionId) },
      include: {
        product: {
          include: {
            owner: { select: { id: true, name: true } },
            brand: true,
          },
        },
        sku: {
          include: {
            stocks: {
              where: { 
                availableQuantity: { gt: 0 }
              },
              select: { 
                availableQuantity: true,
                warehouseId: true,
              },
            },
          },
        },
        bundle: {
          include: {
            owner: { select: { id: true, name: true } },
            stocks: {
              where: { 
                availableQuantity: { gt: 0 }
              },
              select: { 
                availableQuantity: true,
                warehouseId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const itemsWithStock = cartItems.map((item: any) => {
      let availableStock = 0;
      let price = '0';
      let name = '';
      let spec = '';
      let packaging = '';
      let ownerId = '';
      let warehouseId = '';
      let skuId = '';
      let bundleId = '';

      if (item.sku) {
        availableStock = item.sku.stocks.reduce((sum: number, s: any) => sum + s.availableQuantity, 0);
        price = item.sku.price;
        name = item.product?.name || '';
        spec = item.sku.spec;
        packaging = item.sku.packaging;
        ownerId = item.product?.ownerId || '';
        skuId = item.sku.id;
        if (item.sku.stocks.length > 0) {
          warehouseId = item.sku.stocks[0].warehouseId;
        }
      } else if (item.bundle) {
        availableStock = item.bundle.stocks.reduce((sum: number, s: any) => sum + s.availableQuantity, 0);
        price = item.bundle.price;
        name = item.bundle.name;
        spec = item.bundle.spec;
        packaging = item.bundle.packaging;
        ownerId = item.bundle.ownerId || '';
        bundleId = item.bundle.id;
        if (item.bundle.stocks.length > 0) {
          warehouseId = item.bundle.stocks[0].warehouseId;
        }
      }

      return {
        ...item,
        skuId,
        bundleId,
        ownerId,
        warehouseId,
        displayInfo: {
          name,
          spec,
          packaging,
          price,
          availableStock,
        },
      };
    });

    res.json({ success: true, data: itemsWithStock });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/cart/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少sessionId参数' });
    }

    const cartItem = await prisma.cart.findFirst({
      where: {
        id: itemId,
        sessionId: String(sessionId),
      },
    });

    if (!cartItem) {
      return res.status(404).json({ success: false, message: '购物车项不存在' });
    }

    await prisma.cart.delete({ where: { id: itemId } });

    res.json({ success: true, message: '已从购物车移除' });
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/cart/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sessionId } = req.query;
    const { quantity } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少sessionId参数' });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: '数量必须大于0' });
    }

    const cartItem = await prisma.cart.findFirst({
      where: { id, sessionId: String(sessionId) },
    });

    if (!cartItem) {
      return res.status(404).json({ success: false, message: '购物车项不存在' });
    }

    await prisma.cart.update({
      where: { id },
      data: { quantity },
    });

    res.json({ success: true, message: '已更新数量' });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/cart', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少sessionId参数' });
    }

    await prisma.cart.deleteMany({
      where: {
        sessionId: String(sessionId),
      },
    });

    res.json({ success: true, message: '购物车已清空' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

const publicOrderItemSchema = z.object({
  skuId: z.string().optional(),
  bundleId: z.string().optional(),
  quantity: z.number().int().min(1),
}).refine(data => data.skuId || data.bundleId, {
  message: 'skuId 或 bundleId 必须提供一个',
});

const publicOrderSchema = z.object({
  sessionId: z.string().optional(),
  shopUserId: z.string().optional(),  // 商城用户ID
  ownerId: z.string().min(1),
  warehouseId: z.string().min(1),
  receiver: z.string().min(1),
  phone: z.string().min(1),
  deliveryType: z.enum(['PICKUP', 'DELIVERY']).optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  items: z.array(publicOrderItemSchema).min(1),
}).refine(data => data.sessionId || data.shopUserId, {
  message: 'sessionId 或 shopUserId 必须提供一个',
});

router.post('/orders', async (req: Request, res: Response) => {
  try {
    const data = publicOrderSchema.parse(req.body);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });

    if (!warehouse) {
      return res.status(400).json({ success: false, message: '仓库不存在' });
    }

    const owner = await prisma.owner.findUnique({
      where: { id: data.ownerId },
    });

    if (!owner) {
      return res.status(400).json({ success: false, message: '主体不存在' });
    }

    const skuItems = data.items.filter(item => item.skuId);
    const bundleItems = data.items.filter(item => item.bundleId);

    const skuIds = skuItems.map(item => item.skuId) as string[];
    const bundleIds = bundleItems.map(item => item.bundleId) as string[];

    const skus = await prisma.productSKU.findMany({
      where: { id: { in: skuIds } },
      include: {
        product: true,
        stocks: {
          where: {
            warehouseId: data.warehouseId,
            availableQuantity: { gt: 0 },
          },
        },
      },
    });

    const bundles = await prisma.bundleSKU.findMany({
      where: { id: { in: bundleIds } },
      include: {
        stocks: {
          where: {
            warehouseId: data.warehouseId,
            availableQuantity: { gt: 0 },
          },
        },
      },
    });

    if (skus.length !== skuIds.length) {
      return res.status(400).json({ success: false, message: '部分商品SKU不存在' });
    }

    if (bundles.length !== bundleIds.length) {
      return res.status(400).json({ success: false, message: '部分套装不存在' });
    }

    for (const sku of skus) {
      if (!sku.product.isVisibleToCustomer) {
        return res.status(400).json({ success: false, message: `商品 ${sku.product.name} 不可购买` });
      }
    }

    for (const bundle of bundles) {
      if (!bundle.isVisibleToCustomer) {
        return res.status(400).json({ success: false, message: `套装 ${bundle.name} 不可购买` });
      }
    }

    const stockValidation = [];
    for (const item of skuItems) {
      const sku = skus.find(s => s.id === item.skuId);
      if (!sku) {
        stockValidation.push({ skuId: item.skuId, error: 'SKU不存在' });
        continue;
      }

      const totalAvailable = sku.stocks.reduce((sum, stock) => sum + stock.availableQuantity, 0);
      if (totalAvailable < item.quantity) {
        stockValidation.push({
          skuId: item.skuId,
          productName: sku.product.name,
          available: totalAvailable,
          requested: item.quantity,
          error: `库存不足，可用: ${totalAvailable}，需要: ${item.quantity}`,
        });
      }
    }

    for (const item of bundleItems) {
      const bundle = bundles.find(b => b.id === item.bundleId);
      if (!bundle) {
        stockValidation.push({ bundleId: item.bundleId, error: '套装不存在' });
        continue;
      }

      const totalAvailable = bundle.stocks.reduce((sum, stock) => sum + stock.availableQuantity, 0);
      if (totalAvailable < item.quantity) {
        stockValidation.push({
          bundleId: item.bundleId,
          productName: bundle.name,
          available: totalAvailable,
          requested: item.quantity,
          error: `库存不足，可用: ${totalAvailable}，需要: ${item.quantity}`,
        });
      }
    }

    if (stockValidation.length > 0) {
      return res.status(400).json({
        success: false,
        message: '部分商品库存不足',
        errors: stockValidation,
      });
    }

    const orderItems: any[] = [];
    
    for (const item of skuItems) {
      const sku = skus.find(s => s.id === item.skuId)!;
      orderItems.push({
        skuId: item.skuId,
        productName: sku.product.name,
        packaging: sku.packaging,
        spec: sku.spec,
        price: Number(sku.price),
        quantity: item.quantity,
        subtotal: Number(sku.price) * item.quantity,
      });
    }

    for (const item of bundleItems) {
      const bundle = bundles.find(b => b.id === item.bundleId)!;
      orderItems.push({
        bundleId: item.bundleId,
        productName: bundle.name,
        packaging: bundle.packaging,
        spec: bundle.spec,
        price: Number(bundle.price),
        quantity: item.quantity,
        subtotal: Number(bundle.price) * item.quantity,
      });
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    // 计算折扣
    let discountRate: number | null = null;
    let discountAmount = 0;
    let customerLevel: string | null = null;
    let customerId: string | null = null;
    let shopUserId: string | null = data.shopUserId || null;

    // 如果有商城用户ID，查询用户关联的客户和折扣
    if (data.shopUserId) {
      const shopUser = await prisma.shopUser.findUnique({
        where: { id: data.shopUserId },
        include: {
          customer: {
            include: {
              contracts: {
                where: {
                  status: 'ACTIVE',
                  startDate: { lte: new Date() },
                  endDate: { gte: new Date() }
                }
              }
            }
          }
        }
      });

      if (shopUser && shopUser.customer) {
        customerId = shopUser.customerId;
        customerLevel = shopUser.customer.level;

        // 如果有有效合同，应用折扣
        if (shopUser.customer.contracts.length > 0) {
          const contract = shopUser.customer.contracts[0];
          discountRate = contract.discount ? Number(contract.discount) : null;
          
          if (discountRate && discountRate < 1) {
            discountAmount = totalAmount * (1 - discountRate);
          }
        }
      }
    }

    const finalAmount = totalAmount - discountAmount;

    const order = await prisma.$transaction(async (tx: any) => {
      const newOrder = await tx.order.create({
        data: {
          orderNo: generateOrderNo(),
          ownerId: data.ownerId,
          warehouseId: data.warehouseId,
          customerId,
          shopUserId,
          customerLevel,
          discountRate,
          originalAmount: totalAmount,
          discountAmount,
          contractDiscount: discountRate,
          receiver: data.receiver,
          phone: data.phone,
          deliveryType: data.deliveryType || 'PICKUP',
          province: data.province,
          city: data.city,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          totalAmount: finalAmount,
          source: 'CUSTOMER',
          status: 'PENDING',
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        },
      });

      for (const item of skuItems) {
        const stocks = await tx.stock.findMany({
          where: {
            skuId: item.skuId,
            warehouseId: data.warehouseId,
            availableQuantity: { gt: 0 },
          },
          orderBy: { availableQuantity: 'desc' },
        });

        let remainingQuantity = item.quantity!;
        for (const stock of stocks) {
          if (remainingQuantity <= 0) break;

          const lockQty = Math.min(stock.availableQuantity, remainingQuantity);
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              lockedQuantity: { increment: lockQty },
              availableQuantity: { decrement: lockQty },
            },
          });

          await tx.stockLock.create({
            data: {
              skuId: item.skuId,
              warehouseId: data.warehouseId,
              locationId: stock.locationId,
              skuBatchId: stock.skuBatchId,
              quantity: lockQty,
              orderId: newOrder.id,
            },
          });

          remainingQuantity -= lockQty;
        }
      }

      for (const item of bundleItems) {
        const bundleStocks = await tx.bundleStock.findMany({
          where: {
            bundleId: item.bundleId,
            warehouseId: data.warehouseId,
            availableQuantity: { gt: 0 },
          },
          orderBy: { availableQuantity: 'desc' },
        });

        let remainingQuantity = item.quantity!;
        for (const stock of bundleStocks) {
          if (remainingQuantity <= 0) break;

          const lockQty = Math.min(stock.availableQuantity, remainingQuantity);
          await tx.bundleStock.update({
            where: { id: stock.id },
            data: {
              lockedQuantity: { increment: lockQty },
              availableQuantity: { decrement: lockQty },
            },
          });

          await tx.bundleStockLock.create({
            data: {
              bundleId: item.bundleId,
              warehouseId: data.warehouseId,
              locationId: stock.locationId,
              bundleBatchId: stock.bundleBatchId,
              quantity: lockQty,
              orderId: newOrder.id,
            },
          });

          remainingQuantity -= lockQty;
        }
      }

      return newOrder;
    });

    res.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Create public order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/orders/:orderNo', async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        orderNo,
        source: 'CUSTOMER',
      },
      include: {
        owner: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true, address: true } },
        items: {
          include: {
            sku: {
              include: { product: { include: { brand: true } } },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Get public order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

const paymentCreateSchema = z.object({
  orderNo: z.string().min(1),
  paymentMethod: z.enum(['WECHAT', 'ALIPAY']),
});

router.post('/payments/create', async (req: Request, res: Response) => {
  try {
    const data = paymentCreateSchema.parse(req.body);

    const order = await prisma.order.findFirst({
      where: {
        orderNo: data.orderNo,
        source: 'CUSTOMER',
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.paymentStatus === 'SUCCESS') {
      return res.status(400).json({ success: false, message: '订单已支付' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: '订单状态不允许支付' });
    }

    const amount = Number(order.totalAmount);
    const description = `订单 ${order.orderNo}`;

    let paymentResult;
    if (paymentConfig.wechat.sandbox || paymentConfig.alipay.sandbox) {
      paymentResult = await MockPaymentService.createPayment(order.id, amount, data.paymentMethod as PaymentMethod);
    } else {
      if (data.paymentMethod === 'WECHAT') {
        paymentResult = await WechatPaymentService.createPayment(order.id, amount, description);
      } else {
        paymentResult = await AlipayPaymentService.createPayment(order.id, amount, description);
      }
    }

    if (!paymentResult.success) {
      return res.status(400).json({ success: false, message: paymentResult.message });
    }

    const paymentTimeoutAt = new Date(Date.now() + paymentConfig.paymentTimeout * 60 * 1000);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: data.paymentMethod as any,
        paymentStatus: 'PENDING' as any,
        paymentId: paymentResult.paymentId,
        paymentTimeoutAt,
      },
    });

    res.json({
      success: true,
      data: {
        paymentId: paymentResult.paymentId,
        qrCodeUrl: paymentResult.qrCodeUrl,
        payUrl: paymentResult.payUrl,
        paymentTimeoutAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: '参数错误', errors: error.errors });
    }
    console.error('Create payment error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/payments/wechat/notify', async (req: Request, res: Response) => {
  try {
    const xmlData = req.body;
    
    console.log('[微信支付回调] 接收到回调数据');

    const notifyResult = WechatPaymentService.parseNotify(xmlData);

    if (!notifyResult.success || !notifyResult.orderId) {
      console.error('[微信支付回调] 解析失败:', notifyResult.message);
      return res.send(WechatPaymentService.generateFailResponse(notifyResult.message || '解析失败'));
    }

    const order = await prisma.order.findUnique({
      where: { id: notifyResult.orderId },
    });

    if (!order) {
      console.error('[微信支付回调] 订单不存在:', notifyResult.orderId);
      return res.send(WechatPaymentService.generateFailResponse('订单不存在'));
    }

    if (order.paymentStatus === 'SUCCESS') {
      console.log('[微信支付回调] 订单已支付，忽略重复回调');
      return res.send(WechatPaymentService.generateSuccessResponse());
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'SUCCESS' as any,
          paidAt: new Date(),
          status: 'PENDING',
        },
      });

      console.log(`[微信支付回调] 订单 ${order.orderNo} 支付成功`);
    });

    res.send(WechatPaymentService.generateSuccessResponse());
  } catch (error) {
    console.error('[微信支付回调] 处理失败:', error);
    res.send(WechatPaymentService.generateFailResponse('处理失败'));
  }
});

router.post('/payments/alipay/notify', async (req: Request, res: Response) => {
  try {
    const params = req.body;
    
    console.log('[支付宝回调] 接收到回调数据');

    const notifyResult = AlipayPaymentService.parseNotify(params);

    if (!notifyResult.success || !notifyResult.orderId) {
      console.error('[支付宝回调] 解析失败:', notifyResult.message);
      return res.send(AlipayPaymentService.generateFailResponse());
    }

    const order = await prisma.order.findUnique({
      where: { id: notifyResult.orderId },
    });

    if (!order) {
      console.error('[支付宝回调] 订单不存在:', notifyResult.orderId);
      return res.send(AlipayPaymentService.generateFailResponse());
    }

    if (order.paymentStatus === 'SUCCESS') {
      console.log('[支付宝回调] 订单已支付，忽略重复回调');
      return res.send(AlipayPaymentService.generateSuccessResponse());
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'SUCCESS' as any,
          paidAt: new Date(),
          status: 'PENDING',
        },
      });

      console.log(`[支付宝回调] 订单 ${order.orderNo} 支付成功`);
    });

    res.send(AlipayPaymentService.generateSuccessResponse());
  } catch (error) {
    console.error('[支付宝回调] 处理失败:', error);
    res.send(AlipayPaymentService.generateFailResponse());
  }
});

router.post('/payments/mock-success', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.body;

    const order = await prisma.order.findFirst({
      where: { paymentId },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '支付订单不存在' });
    }

    if (order.paymentStatus === 'SUCCESS') {
      return res.status(400).json({ success: false, message: '订单已支付' });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'SUCCESS' as any,
          paidAt: new Date(),
          status: 'PENDING',
        },
      });

      console.log(`[模拟支付成功] 订单 ${order.orderNo} 支付成功`);
    });

    res.json({ success: true, message: '模拟支付成功' });
  } catch (error) {
    console.error('[模拟支付成功] 处理失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
