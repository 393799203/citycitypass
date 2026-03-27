import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const pickOrderItemSchema = z.object({
  skuId: z.string(),
  productName: z.string(),
  packaging: z.string().optional(),
  spec: z.string().optional(),
  quantity: z.number(),
  batchNo: z.string().optional(),
  warehouseLocation: z.string().optional(),
  stockLockId: z.string().optional(),
});

const createPickOrderSchema = z.object({
  orderId: z.string().optional(),
  orderIds: z.array(z.string()).optional(),
}).refine(data => data.orderId || data.orderIds, {
  message: "需要提供 orderId 或 orderIds",
});

function generatePickNo(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PK${year}${month}${day}${random}`;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createPickOrderSchema.parse(req.body);
    
    const orderIdList = data.orderIds || (data.orderId ? [data.orderId] : []);
    
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIdList } },
      include: {
        items: {
          include: {
            sku: true,
            bundle: true,
          },
        },
      },
    });

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const invalidOrders = orders.filter(o => o.status !== 'PENDING' && o.status !== 'PICKING');
    if (invalidOrders.length > 0) {
      return res.status(400).json({ success: false, message: `订单 ${invalidOrders.map(o => o.orderNo)} 状态不正确，无法生成拣货单` });
    }

    const existingPickOrders = await prisma.pickOrder.findMany({
      where: { orderIds: { in: orderIdList } },
    });
    
    if (existingPickOrders.length > 0) {
      return res.status(400).json({ success: false, message: '部分订单已存在拣货单' });
    }

    const pickOrder = await prisma.$transaction(async (tx) => {
      const allStockLocks: any[] = [];
      const allBundleStockLocks: any[] = [];
      
      for (const orderId of orderIdList) {
        const stockLocks = await tx.stockLock.findMany({
          where: { orderId },
          include: {
            location: {
              include: { shelf: { include: { zone: true } } }
            },
            sku: {
              include: { product: true },
            },
          },
        });
        allStockLocks.push(...stockLocks);

        const bundleStockLocks = await tx.bundleStockLock.findMany({
          where: { orderId },
          include: {
            location: {
              include: { shelf: { include: { zone: true } } }
            },
            bundle: {
              include: {
                items: {
                  include: {
                    sku: {
                      include: { product: true }
                    }
                  }
                }
              }
            },
          },
        });
        allBundleStockLocks.push(...bundleStockLocks);
      }

      const mergedItems: any[] = [];
      
      for (const lock of allStockLocks) {
        const key = `${lock.skuId}-${lock.location?.shelf?.zone?.code || ''}-${lock.location?.shelf?.code || ''}-L${lock.location?.level || ''}`;
        const existing = mergedItems.find(m => m.key === key && !m.isBundle);
        if (existing) {
          existing.quantity += lock.quantity;
        } else {
          mergedItems.push({
            key,
            isBundle: false,
            skuId: lock.skuId,
            bundleId: null,
            productName: lock.sku.product.name,
            packaging: lock.sku.packaging,
            spec: lock.sku.spec,
            quantity: lock.quantity,
            batchNo: lock.batchNo,
            warehouseLocation: `${lock.location?.shelf?.zone?.code || ''}-${lock.location?.shelf?.code || ''}-L${lock.location?.level || ''}` || lock.sku.warehouseLocation || '',
            stockLockId: lock.id,
            bundleStockLockId: null,
          });
        }
      }

      for (const lock of allBundleStockLocks) {
        const key = `bundle-${lock.bundleId}-${lock.location?.shelf?.zone?.code || ''}-${lock.location?.shelf?.code || ''}-L${lock.location?.level || ''}`;
        const existing = mergedItems.find(m => m.key === key && m.isBundle);
        if (existing) {
          existing.quantity += lock.quantity;
        } else {
          mergedItems.push({
            key,
            isBundle: true,
            skuId: null,
            bundleId: lock.bundleId,
            productName: lock.bundle.name,
            packaging: lock.bundle.packaging,
            spec: lock.bundle.spec,
            quantity: lock.quantity,
            batchNo: lock.batchNo,
            warehouseLocation: `${lock.location?.shelf?.zone?.code || ''}-${lock.location?.shelf?.code || ''}-L${lock.location?.level || ''}` || '',
            stockLockId: null,
            bundleStockLockId: lock.id,
            bundleItems: lock.bundle.items,
          });
        }
      }

      const pickItems = mergedItems.map(item => ({
        skuId: item.skuId,
        bundleId: item.bundleId,
        productName: item.productName,
        packaging: item.packaging || '',
        spec: item.spec || '',
        quantity: item.quantity,
        batchNo: item.batchNo,
        warehouseLocation: item.warehouseLocation,
        stockLockId: item.stockLockId,
        bundleStockLockId: item.bundleStockLockId,
      }));

      const pick = await tx.pickOrder.create({
        data: {
          pickNo: generatePickNo(),
          orderIds: orderIdList.join(','),
          status: 'PICKING',
          items: {
            create: pickItems.map(item => ({
              skuId: item.skuId,
              bundleId: item.bundleId,
              productName: item.productName,
              packaging: item.packaging || '',
              spec: item.spec || '',
              quantity: item.quantity,
              batchNo: item.batchNo,
              warehouseLocation: item.warehouseLocation,
              stockLockId: item.stockLockId,
              bundleStockLockId: item.bundleStockLockId,
            })),
          },
        },
        include: {
          items: {
            include: {
              sku: true,
              bundle: true,
            },
          },
        },
      });

      for (const orderId of orderIdList) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'PICKING' },
        });
      }

      return pick;
    });

    res.json({ success: true, data: pickOrder });
  } catch (error) {
    console.error('Create pick order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', pageSize = '20' } = req.query;
    
    const where: any = {};
    if (status) where.status = String(status);

    const skip = (Number(page) - 1) * Number(pageSize);
    
    const [items, total] = await Promise.all([
      prisma.pickOrder.findMany({
        where,
        include: {
          picker: true,
          approver: true,
          items: {
            include: {
              sku: true,
              bundle: {
                include: {
                  items: {
                    include: {
                      sku: {
                        include: { product: true }
                      }
                    }
                  }
                }
              },
              stockLock: {
                include: {
                  location: {
                    include: {
                      shelf: {
                        include: {
                          zone: true
                        }
                      }
                    }
                  }
                }
              },
              bundleStockLock: {
                include: {
                  location: {
                    include: {
                      shelf: {
                        include: {
                          zone: true
                        }
                      }
                    }
                  }
                }
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.pickOrder.count({ where }),
    ]);

    const itemsWithOrders = await Promise.all(
      items.map(async (item) => {
        const orderIds = item.orderIds.split(',');
        const orders = await prisma.order.findMany({
          where: { id: { in: orderIds } },
          include: { 
            owner: true, 
            warehouse: true,
            items: {
              include: { 
                sku: true,
                bundle: {
                  include: {
                    items: {
                      include: {
                        sku: {
                          include: { product: true }
                        }
                      }
                    }
                  }
                },
              },
            },
            stockLocks: {
              include: {
                location: {
                  include: {
                    shelf: {
                      include: {
                        zone: true
                      }
                    }
                  }
                }
              }
            },
          },
        });
        return { ...item, orders };
      })
    );

    res.json({ 
      success: true, 
      data: itemsWithOrders,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('List pick orders error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pickOrder = await prisma.pickOrder.findUnique({
      where: { id },
      include: {
        picker: true,
        approver: true,
        items: {
          include: {
            sku: true,
            bundle: {
              include: {
                items: {
                  include: {
                    sku: {
                      include: { product: true }
                    }
                  }
                }
              }
            },
            stockLock: {
              include: {
                location: {
                  include: {
                    shelf: {
                      include: {
                        zone: true
                      }
                    }
                  }
                }
              }
            },
            bundleStockLock: {
              include: {
                location: {
                  include: {
                    shelf: {
                      include: {
                        zone: true
                      }
                    }
                  }
                }
              }
            },
          },
        },
      },
    });

    if (!pickOrder) {
      return res.status(404).json({ success: false, message: '拣货单不存在' });
    }

    const orderIds = pickOrder.orderIds.split(',');
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { owner: true, warehouse: true, items: { include: { sku: true, bundle: true } } },
    });

    res.json({ success: true, data: { ...pickOrder, orders } });
  } catch (error) {
    console.error('Get pick order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, userId } = req.body;

    const updateData: any = { status };
    if (status === 'PICKED' && userId) {
      updateData.pickerId = userId;
    }
    if (status === 'COMPLETED' && userId) {
      updateData.approverId = userId;
    }

    const pickOrder = await prisma.pickOrder.update({
      where: { id },
      data: updateData,
      include: {
        picker: true,
        approver: true,
      },
    });

    if (status === 'PICKED') {
      const orderIds = pickOrder.orderIds.split(',');
      for (const orderId of orderIds) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'OUTBOUND_REVIEW' },
        });
      }
    }

    res.json({ success: true, data: pickOrder });
  } catch (error) {
    console.error('Update pick order status error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
