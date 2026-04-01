import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { generateOrderNo } from '../utils/helpers';

const router = Router();

async function cleanupEmptyStockLocations(tx: any, locationId: string) {
  const stock = await tx.stock.findFirst({
    where: { locationId, totalQuantity: 0 },
  });
  if (stock) {
    await tx.stock.delete({ where: { id: stock.id } });
  }
}

async function cleanupEmptyBundleStockLocations(tx: any, locationId: string) {
  const bundleStock = await tx.bundleStock.findFirst({
    where: { locationId, totalQuantity: 0 },
  });
  if (bundleStock) {
    await tx.bundleStock.delete({ where: { id: bundleStock.id } });
  }
}

const orderItemSchema = z.object({
  skuId: z.string().nullable(),
  bundleId: z.string().nullable(),
  productName: z.string(),
  packaging: z.string(),
  spec: z.string(),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
}).refine(data => data.skuId || data.bundleId, {
  message: "必须提供 skuId 或 bundleId"
});

const orderSchema = z.object({
  ownerId: z.string(),
  warehouseId: z.string().optional(),
  customerId: z.string().optional(),
  receiver: z.string(),
  phone: z.string(),
  province: z.string(),
  city: z.string(),
  address: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  items: z.array(orderItemSchema).min(1),
  status: z.string().optional(),
  orderNo: z.string().optional(),
  contractDiscount: z.number().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { orderNo, ownerId, status, startDate, endDate } = req.query;
    
    const where: any = {};
    if (orderNo) where.orderNo = { contains: String(orderNo) };
    if (ownerId) where.ownerId = String(ownerId);
    if (status) where.status = String(status);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        owner: true,
        warehouse: true,
        customer: true,
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
          }
        },
        returnOrders: true,
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
            },
            skuBatch: true,
          }
        },
        bundleStockLocks: {
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
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        owner: true,
        warehouse: true,
        customer: true,
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
                  include: { zone: true }
                }
              }
            },
            sku: {
              include: { product: true }
            },
          },
        },
        bundleStockLocks: {
          include: {
            location: {
              include: {
                shelf: {
                  include: { zone: true }
                }
              }
            },
            bundle: true,
          },
        },
        dispatchOrders: {
          include: {
            dispatch: {
              include: {
                vehicle: true,
                carrierVehicle: true,
                driver: true,
              },
            },
          },
        },
        returnOrders: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const pickOrders = await prisma.pickOrder.findMany({
      where: {
        orderIds: {
          contains: id,
        },
      },
      include: {
        picker: true,
        approver: true,
      },
    });

    const matchedPickOrder = pickOrders.find((po: any) =>
      po.orderIds.split(',').map((oid: string) => oid.trim()).includes(id)
    );

    const picking = matchedPickOrder ? {
      id: matchedPickOrder.id,
      pickNo: matchedPickOrder.pickNo,
      status: matchedPickOrder.status,
      picker: matchedPickOrder.picker,
      approver: matchedPickOrder.approver,
    } : null;

    const stockOuts = await prisma.stockOut.findMany({
      where: { orderId: id },
      include: {
        skuBatch: true,
        bundleBatch: true,
      },
    });

    const dispatch = order.dispatchOrders?.[0]?.dispatch ? {
      id: order.dispatchOrders[0].dispatch.id,
      dispatchNo: order.dispatchOrders[0].dispatch.dispatchNo,
      status: order.dispatchOrders[0].dispatch.status,
      completedTime: order.dispatchOrders[0].dispatch.completedTime,
      vehicleSource: order.dispatchOrders[0].dispatch.vehicleSource,
      vehicle: order.dispatchOrders[0].dispatch.vehicle ? {
        licensePlate: order.dispatchOrders[0].dispatch.vehicle.licensePlate,
        vehicleType: order.dispatchOrders[0].dispatch.vehicle.vehicleType,
      } : null,
      carrierVehicle: order.dispatchOrders[0].dispatch.carrierVehicle ? {
        licensePlate: order.dispatchOrders[0].dispatch.carrierVehicle.licensePlate,
        vehicleType: order.dispatchOrders[0].dispatch.carrierVehicle.vehicleType,
      } : null,
      driver: order.dispatchOrders[0].dispatch.driver ? {
        name: order.dispatchOrders[0].dispatch.driver.name,
        phone: order.dispatchOrders[0].dispatch.driver.phone,
      } : null,
    } : null;

    res.json({ success: true, data: { ...order, picking, dispatch, stockOuts } });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('创建订单请求体:', JSON.stringify(req.body, null, 2));
    const data = orderSchema.parse(req.body);

    let totalAmount = 0;
    for (const item of data.items) {
      totalAmount += item.price * item.quantity;
    }

    if (data.contractDiscount && data.contractDiscount > 0 && data.contractDiscount <= 1) {
      totalAmount = totalAmount * data.contractDiscount;
    }

    const skuItems = data.items.filter(i => i.skuId);
    const bundleItems = data.items.filter(i => i.bundleId);

    if (data.warehouseId) {
      const order = await createSingleWarehouseOrder(prisma, data, totalAmount, skuItems, bundleItems);
      return res.json({ success: true, data: [order] });
    }

    const warehouses = await prisma.warehouse.findMany({
      where: { ownerId: data.ownerId },
      select: { id: true, name: true },
    });

    if (warehouses.length === 0) {
      return res.status(400).json({ success: false, message: '该货主没有仓库' });
    }

    const allocation = await allocateItemsToWarehouses(prisma, warehouses, skuItems, bundleItems);

    if (!allocation.success) {
      return res.status(400).json({ success: false, message: allocation.error });
    }

    const orders = await prisma.$transaction(async (tx: any) => {
      const createdOrders = [];
      const warehouseEntries = Object.entries(allocation.allocations!);
      const lastWarehouseId = warehouseEntries.length > 0 ? warehouseEntries[warehouseEntries.length - 1][0] : null;

      for (const [warehouseId, allocationItems] of warehouseEntries) {
        const isLastWarehouse = warehouseId === lastWarehouseId;
        let warehouseTotalAmount = allocationItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
        if (data.contractDiscount && data.contractDiscount > 0 && data.contractDiscount <= 1) {
          warehouseTotalAmount = warehouseTotalAmount * data.contractDiscount;
        }
        const newOrder = await tx.order.create({
          data: {
            orderNo: data.orderNo || generateOrderNo(),
            ownerId: data.ownerId,
            warehouseId,
            customerId: data.customerId,
            receiver: data.receiver,
            phone: data.phone,
            province: data.province,
            city: data.city,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            totalAmount: warehouseTotalAmount,
            contractDiscount: data.contractDiscount,
            status: 'PENDING',
            items: {
              create: allocationItems.map((item: any) => ({
                skuId: item.skuId,
                bundleId: item.bundleId,
                productName: item.productName,
                packaging: item.packaging,
                spec: item.spec,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity,
              })),
            },
          },
        });

        for (const item of allocationItems) {
          if (item.skuId) {
            const stockOrderBy = isLastWarehouse
              ? [
                  { location: { shelf: { zone: { type: 'asc' } } } },
                  { availableQuantity: 'desc' }
                ]
              : [{ availableQuantity: 'desc' }];
            const allStocks = await tx.stock.findMany({
              where: {
                skuId: item.skuId!,
                warehouseId,
                availableQuantity: { gt: 0 },
                location: {
                  shelf: {
                    zone: {
                      type: { in: ['STORAGE', 'PICKING'] }
                    }
                  }
                }
              },
              include: isLastWarehouse ? {
                location: {
                  include: {
                    shelf: {
                      include: {
                        zone: true
                      }
                    }
                  }
                }
              } : undefined,
              orderBy: stockOrderBy,
            });
            let remainingQuantity = item.quantity;
            for (const stock of allStocks) {
              if (remainingQuantity <= 0) break;
              const lockQty = Math.min(stock.availableQuantity, remainingQuantity);
              await tx.stock.update({
                where: { id: stock.id },
                data: { lockedQuantity: { increment: lockQty }, availableQuantity: { decrement: lockQty } },
              });
              await tx.stockLock.create({
                data: { skuId: item.skuId!, warehouseId, locationId: stock.locationId, skuBatchId: stock.skuBatchId, quantity: lockQty, orderId: newOrder.id },
              });
              remainingQuantity -= lockQty;
            }
          } else if (item.bundleId) {
            const bundleStockOrderBy = isLastWarehouse
              ? [
                  { location: { shelf: { zone: { type: 'asc' } } } },
                  { availableQuantity: 'desc' }
                ]
              : [{ availableQuantity: 'desc' }];
            const bundleStocks = await tx.bundleStock.findMany({
              where: {
                bundleId: item.bundleId!,
                warehouseId,
                availableQuantity: { gt: 0 },
                location: {
                  shelf: {
                    zone: {
                      type: { in: ['STORAGE', 'PICKING'] }
                    }
                  }
                }
              },
              include: isLastWarehouse ? {
                location: {
                  include: {
                    shelf: {
                      include: {
                        zone: true
                      }
                    }
                  }
                }
              } : undefined,
              orderBy: bundleStockOrderBy,
            });
            let remainingQuantity = item.quantity;
            for (const bs of bundleStocks) {
              if (remainingQuantity <= 0) break;
              const lockQty = Math.min(bs.availableQuantity, remainingQuantity);
              await tx.bundleStock.update({
                where: { id: bs.id },
                data: { lockedQuantity: { increment: lockQty }, availableQuantity: { decrement: lockQty } },
              });
              await tx.bundleStockLock.create({
                data: { bundleId: item.bundleId!, warehouseId, locationId: bs.locationId, bundleBatchId: bs.bundleBatchId, quantity: lockQty, orderId: newOrder.id },
              });
              remainingQuantity -= lockQty;
            }
          }
        }
        createdOrders.push(newOrder);
      }
      return createdOrders;
    });

    res.json({ success: true, data: orders });
  } catch (error: any) {
    console.error('Create order error:', error);
    if (error.name === 'ZodError') {
      console.error('Zod validation errors:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({ success: false, message: error.errors[0].message, errors: error.errors });
    }
    res.status(500).json({ success: false, message: error.message || '服务器错误' });
  }
});

async function allocateItemsToWarehouses(prisma: any, warehouses: any[], skuItems: any[], bundleItems: any[]) {
  const warehouseIds = warehouses.map(w => w.id);
  const stockMap = new Map<string, Map<string, number>>();
  const bundleStockMap = new Map<string, Map<string, number>>();

  const stocks = await prisma.stock.findMany({
    where: {
      warehouseId: { in: warehouseIds },
      availableQuantity: { gt: 0 },
      location: {
        shelf: {
          zone: {
            type: { in: ['STORAGE', 'PICKING'] }
          }
        }
      }
    },
  });

  for (const stock of stocks) {
    if (!stockMap.has(stock.skuId)) {
      stockMap.set(stock.skuId, new Map());
    }
    const warehouseStock = stockMap.get(stock.skuId)!;
    warehouseStock.set(stock.warehouseId, (warehouseStock.get(stock.warehouseId) || 0) + stock.availableQuantity);
  }

  const bundleStocks = await prisma.bundleStock.findMany({
    where: {
      warehouseId: { in: warehouseIds },
      availableQuantity: { gt: 0 },
      location: {
        shelf: {
          zone: {
            type: { in: ['STORAGE', 'PICKING'] }
          }
        }
      }
    },
  });

  for (const bs of bundleStocks) {
    if (!bundleStockMap.has(bs.bundleId)) {
      bundleStockMap.set(bs.bundleId, new Map());
    }
    const warehouseStock = bundleStockMap.get(bs.bundleId)!;
    warehouseStock.set(bs.warehouseId, (warehouseStock.get(bs.warehouseId) || 0) + bs.availableQuantity);
  }

  const requiredSkuIds = skuItems.map(i => i.skuId);
  const requiredBundleIds = bundleItems.map(i => i.bundleId);
  const skuAvailability = new Map<string, number>();
  for (const skuId of requiredSkuIds) {
    const warehouseStock = stockMap.get(skuId);
    let total = 0;
    if (warehouseStock) {
      for (const qty of warehouseStock.values()) {
        total += qty;
      }
    }
    skuAvailability.set(skuId, total);
  }
  for (const item of skuItems) {
    if ((skuAvailability.get(item.skuId) || 0) < item.quantity) {
      return { success: false, error: `商品 ${item.productName} 库存不足` };
    }
  }

  const bundleAvailability = new Map<string, number>();
  for (const bundleId of requiredBundleIds) {
    const warehouseStock = bundleStockMap.get(bundleId);
    let total = 0;
    if (warehouseStock) {
      for (const qty of warehouseStock.values()) {
        total += qty;
      }
    }
    bundleAvailability.set(bundleId, total);
  }
  for (const item of bundleItems) {
    if ((bundleAvailability.get(item.bundleId) || 0) < item.quantity) {
      return { success: false, error: `套装 ${item.productName} 库存不足` };
    }
  }

  const allocations: Record<string, any[]> = {};

  const singleWarehouseFit = (warehouseId: string) => {
    for (const item of [...skuItems, ...bundleItems]) {
      const isSku = !!item.skuId;
      const stockMapToUse = isSku ? stockMap : bundleStockMap;
      const itemId = isSku ? item.skuId : item.bundleId;
      const warehouseStock = stockMapToUse.get(itemId!);
      if (!warehouseStock) return false;
      const available = warehouseStock.get(warehouseId) || 0;
      if (available < item.quantity) return false;
    }
    return true;
  };

  for (const wh of warehouses) {
    if (singleWarehouseFit(wh.id)) {
      allocations[wh.id] = [...skuItems, ...bundleItems];
      return { success: true, allocations };
    }
  }

  for (const item of [...skuItems, ...bundleItems]) {
    const isSku = !!item.skuId;
    const stockMapToUse = isSku ? stockMap : bundleStockMap;
    const itemId = isSku ? item.skuId : item.bundleId;
    const warehouseStock = stockMapToUse.get(itemId!);
    if (!warehouseStock) continue;

    let remainingQty = item.quantity;

    const sortedEntries = Array.from(warehouseStock.entries()).sort((a, b) => b[1] - a[1]);

    for (const [warehouseId, available] of sortedEntries) {
      if (remainingQty <= 0) break;
      const toAllocate = Math.min(available, remainingQty);
      if (toAllocate > 0) {
        if (!allocations[warehouseId]) {
          allocations[warehouseId] = [];
        }
        const existingItem = allocations[warehouseId].find((i: any) =>
          (isSku && i.skuId === item.skuId) || (!isSku && i.bundleId === item.bundleId)
        );
        if (existingItem) {
          existingItem.quantity += toAllocate;
        } else {
          allocations[warehouseId].push({ ...item, quantity: toAllocate });
        }
        warehouseStock.set(warehouseId, available - toAllocate);
        remainingQty -= toAllocate;
      }
    }
  }

  return { success: true, allocations };
}

async function createSingleWarehouseOrder(prisma: any, data: any, totalAmount: number, skuItems: any[], bundleItems: any[]) {
  return prisma.$transaction(async (tx: typeof prisma) => {
    let warehouseId = data.warehouseId;
    if (!warehouseId) {
      const allWarehouses = await tx.warehouse.findMany({ where: { ownerId: data.ownerId } });
      if (allWarehouses.length > 0) {
        warehouseId = allWarehouses[0].id;
      } else {
        throw new Error('未找到可用仓库');
      }
    }

    if (skuItems.length > 0) {
      const availableStocks = await tx.stock.aggregate({
        where: { skuId: { in: skuItems.map((i: any) => i.skuId!).filter(Boolean) as string[] }, warehouseId: warehouseId },
        _sum: { availableQuantity: true },
      });
      const totalAvailable = availableStocks._sum.availableQuantity || 0;
      const totalRequested = skuItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      if (totalAvailable < totalRequested) {
        throw new Error(`库存不足，当前可用: ${totalAvailable}`);
      }
    }

    if (bundleItems.length > 0) {
      for (const item of bundleItems) {
        const bundleStock = await tx.bundleStock.aggregate({
          where: { bundleId: item.bundleId!, warehouseId: warehouseId },
          _sum: { availableQuantity: true },
        });
        const totalAvailable = bundleStock._sum.availableQuantity || 0;
        if (totalAvailable < item.quantity) {
          throw new Error(`套装 ${item.productName} 库存不足，当前可用: ${totalAvailable}`);
        }
      }
    }

    const newOrder = await tx.order.create({
      data: {
        orderNo: data.orderNo || generateOrderNo(),
        ownerId: data.ownerId,
        warehouseId: warehouseId,
        customerId: data.customerId,
        receiver: data.receiver,
        phone: data.phone,
        province: data.province,
        city: data.city,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        totalAmount,
        contractDiscount: data.contractDiscount,
        status: data.status || 'PENDING',
        items: {
          create: data.items.map((item: any) => ({
            skuId: item.skuId,
            bundleId: item.bundleId,
            productName: item.productName,
            packaging: item.packaging,
            spec: item.spec,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
          })),
        },
      },
    });

    for (const item of data.items) {
      if (item.skuId) {
        const allStocks = await tx.stock.findMany({
          where: {
            skuId: item.skuId!,
            warehouseId: warehouseId,
            availableQuantity: { gt: 0 },
            location: {
              shelf: {
                zone: {
                  type: { in: ['STORAGE', 'PICKING'] }
                }
              }
            }
          },
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
          },
          orderBy: [
            { location: { shelf: { zone: { type: 'asc' } } } },
            { availableQuantity: 'desc' }
          ],
        });
        let remainingQuantity = item.quantity;
        for (const stock of allStocks) {
          if (remainingQuantity <= 0) break;
          const lockQty = Math.min(stock.availableQuantity, remainingQuantity);
          await tx.stock.update({
            where: { id: stock.id },
            data: { lockedQuantity: { increment: lockQty }, availableQuantity: { decrement: lockQty } },
          });
          await tx.stockLock.create({
            data: { skuId: item.skuId!, warehouseId: warehouseId, locationId: stock.locationId, skuBatchId: stock.skuBatchId, quantity: lockQty, orderId: newOrder.id },
          });
          remainingQuantity -= lockQty;
        }
      } else if (item.bundleId) {
        const bundleStocks = await tx.bundleStock.findMany({
          where: {
            bundleId: item.bundleId!,
            warehouseId: warehouseId,
            availableQuantity: { gt: 0 },
            location: {
              shelf: {
                zone: {
                  type: { in: ['STORAGE', 'PICKING'] }
                }
              }
            }
          },
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
          },
          orderBy: [
            { location: { shelf: { zone: { type: 'asc' } } } },
            { availableQuantity: 'desc' }
          ],
        });
        let remainingQuantity = item.quantity;
        for (const bs of bundleStocks) {
          if (remainingQuantity <= 0) break;
          const lockQty = Math.min(bs.availableQuantity, remainingQuantity);
          await tx.bundleStock.update({
            where: { id: bs.id },
            data: { lockedQuantity: { increment: lockQty }, availableQuantity: { decrement: lockQty } },
          });
          await tx.bundleStockLock.create({
            data: { bundleId: item.bundleId!, warehouseId: warehouseId, locationId: bs.locationId, bundleBatchId: bs.bundleBatchId, quantity: lockQty, orderId: newOrder.id },
          });
          remainingQuantity -= lockQty;
        }
      }
    }

    return newOrder;
  });
}

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { receiver, phone, province, city, address, latitude, longitude, customerId } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: {
        receiver,
        phone,
        province,
        city,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        customerId: customerId || null,
      },
    });

    res.json({ success: true, data: order });
  } catch (error: any) {
    console.error('Update order error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.$transaction(async (tx: any) => {
      const existingOrder = await tx.order.findUnique({
        where: { id },
        include: {
          items: true,
          stockLocks: true,
          bundleStockLocks: true,
        },
      });

      if (!existingOrder) {
        throw new Error('订单不存在');
      }

      if (status === 'CANCELLED' && existingOrder.status !== 'CANCELLED' && existingOrder.status !== 'DELIVERED' && existingOrder.status !== 'IN_TRANSIT') {
        const stockLocks = await tx.stockLock.findMany({
          where: { orderId: existingOrder.id },
        });

        for (const lock of stockLocks) {
          if (lock.locationId) {
            await tx.stock.update({
              where: {
                warehouseId_locationId_skuBatchId: {
                  skuId: lock.skuId,
                  warehouseId: lock.warehouseId,
                  locationId: lock.locationId,
                  skuBatchId: lock.skuBatchId,
                },
              },
              data: {
                lockedQuantity: { decrement: lock.quantity },
                availableQuantity: { increment: lock.quantity },
              },
            });
          } else {
            await tx.stock.updateMany({
              where: {
                skuId: lock.skuId,
                warehouseId: lock.warehouseId,
                locationId: null,
                skuBatchId: lock.skuBatchId,
              },
              data: {
                lockedQuantity: { decrement: lock.quantity },
                availableQuantity: { increment: lock.quantity },
              },
            });
          }
          await tx.stockLock.delete({ where: { id: lock.id } });
        }

        const bundleStockLocks = await tx.bundleStockLock.findMany({
          where: { orderId: existingOrder.id },
        });

        for (const lock of bundleStockLocks) {
          if (lock.locationId) {
            await tx.bundleStock.updateMany({
              where: {
                bundleId: lock.bundleId,
                warehouseId: lock.warehouseId,
                locationId: lock.locationId,
              },
              data: {
                lockedQuantity: { decrement: lock.quantity },
                availableQuantity: { increment: lock.quantity },
              },
            });
          } else {
            await tx.bundleStock.updateMany({
              where: {
                bundleId: lock.bundleId,
                warehouseId: lock.warehouseId,
              },
              data: {
                lockedQuantity: { decrement: lock.quantity },
                availableQuantity: { increment: lock.quantity },
              },
            });
          }
          await tx.bundleStockLock.delete({ where: { id: lock.id } });
        }

        const pickOrders = await tx.pickOrder.findMany({
          where: {
            status: { in: ['PENDING', 'PICKING', 'PICKED'] },
          },
        });
        for (const pickOrder of pickOrders) {
          const orderIds: string[] = pickOrder.orderIds.split(',').filter((id: string) => !!id);
          if (orderIds.includes(existingOrder.id)) {
            if (pickOrder.status === 'PICKED') {
              const pickItems = await tx.pickOrderItem.findMany({
                where: {
                  pickOrderId: pickOrder.id,
                  stockLock: { orderId: existingOrder.id },
                },
              });
              for (const item of pickItems) {
                if (item.stockLockId) {
                  const stockLock = await tx.stockLock.findFirst({
                    where: { id: item.stockLockId },
                  });
                  if (stockLock) {
                    if (stockLock.locationId) {
                      await tx.stock.update({
                        where: {
                          warehouseId_locationId_skuBatchId: {
                            skuId: stockLock.skuId,
                            warehouseId: stockLock.warehouseId,
                            locationId: stockLock.locationId,
                            skuBatchId: stockLock.skuBatchId,
                          },
                        },
                        data: {
                          lockedQuantity: { decrement: stockLock.quantity },
                          availableQuantity: { increment: stockLock.quantity },
                        },
                      });
                    } else {
                      await tx.stock.updateMany({
                        where: {
                          skuId: stockLock.skuId,
                          warehouseId: stockLock.warehouseId,
                          locationId: null,
                          skuBatchId: stockLock.skuBatchId,
                        },
                        data: {
                          lockedQuantity: { decrement: stockLock.quantity },
                          availableQuantity: { increment: stockLock.quantity },
                        },
                      });
                    }
                    await tx.stockLock.delete({ where: { id: stockLock.id } });
                  }
                }
                await tx.pickOrderItem.delete({ where: { id: item.id } });
              }
              const remainingOrderIds = orderIds.filter((id: string) => id !== existingOrder.id);
              if (remainingOrderIds.length === 0) {
                await tx.pickOrder.update({
                  where: { id: pickOrder.id },
                  data: { status: 'CANCELLED' },
                });
              } else {
                await tx.pickOrder.update({
                  where: { id: pickOrder.id },
                  data: { orderIds: remainingOrderIds.join(',') },
                });
              }
            } else if (orderIds.length === 1) {
              await tx.pickOrder.update({
                where: { id: pickOrder.id },
                data: { status: 'CANCELLED' },
              });
              const pickItems = await tx.pickOrderItem.findMany({
                where: { pickOrderId: pickOrder.id },
              });
              for (const item of pickItems) {
                if (item.stockLockId) {
                  const stockLock = await tx.stockLock.findFirst({
                    where: { id: item.stockLockId },
                  });
                  if (stockLock) {
                    await tx.stock.updateMany({
                      where: {
                        skuId: stockLock.skuId,
                        bundleId: stockLock.bundleId,
                        warehouseId: stockLock.warehouseId,
                        locationId: stockLock.locationId,
                      },
                      data: {
                        lockedQuantity: { decrement: stockLock.quantity },
                        availableQuantity: { increment: stockLock.quantity },
                      },
                    });
                    await tx.stockLock.delete({ where: { id: stockLock.id } });
                  }
                }
              }
            } else {
              const pickItems = await tx.pickOrderItem.findMany({
                where: {
                  pickOrderId: pickOrder.id,
                  stockLock: { orderId: existingOrder.id },
                },
              });
              for (const item of pickItems) {
                if (item.stockLockId) {
                  const stockLock = await tx.stockLock.findFirst({
                    where: { id: item.stockLockId },
                  });
                  if (stockLock) {
                    if (stockLock.locationId) {
                      await tx.stock.update({
                        where: {
                          warehouseId_locationId_skuBatchId: {
                            skuId: stockLock.skuId,
                            warehouseId: stockLock.warehouseId,
                            locationId: stockLock.locationId,
                            skuBatchId: stockLock.skuBatchId,
                          },
                        },
                        data: {
                          lockedQuantity: { decrement: stockLock.quantity },
                          availableQuantity: { increment: stockLock.quantity },
                        },
                      });
                    } else {
                      await tx.stock.updateMany({
                        where: {
                          skuId: stockLock.skuId,
                          warehouseId: stockLock.warehouseId,
                          locationId: null,
                          skuBatchId: stockLock.skuBatchId,
                        },
                        data: {
                          lockedQuantity: { decrement: stockLock.quantity },
                          availableQuantity: { increment: stockLock.quantity },
                        },
                      });
                    }
                    await tx.stockLock.delete({ where: { id: stockLock.id } });
                  }
                }
                await tx.pickOrderItem.delete({ where: { id: item.id } });
              }
              const remainingOrderIds = orderIds.filter((id: string) => id !== existingOrder.id);
              await tx.pickOrder.update({
                where: { id: pickOrder.id },
                data: { orderIds: remainingOrderIds.join(',') },
              });
            }
          }
        }
      }

      if (status === 'DISPATCHING') {
        const stockLocks = await tx.stockLock.findMany({
          where: { orderId: existingOrder.id },
        });

        for (const lock of stockLocks) {
          if (lock.locationId) {
            await tx.stock.updateMany({
              where: {
                skuId: lock.skuId,
                warehouseId: lock.warehouseId,
                locationId: lock.locationId,
              },
              data: {
                totalQuantity: { decrement: lock.quantity },
                lockedQuantity: { decrement: lock.quantity },
              },
            });

            await tx.stockOut.create({
              data: {
                orderId: lock.orderId,
                skuId: lock.skuId,
                warehouseId: lock.warehouseId,
                locationId: lock.locationId,
                skuBatchId: lock.skuBatchId,
                quantity: lock.quantity,
              },
            });

            if (lock.locationId) {
              await cleanupEmptyStockLocations(tx, lock.locationId);
            }
          }
          await tx.stockLock.delete({ where: { id: lock.id } });
        }

        const bundleStockLocks = await tx.bundleStockLock.findMany({
          where: { orderId: existingOrder.id },
        });

        for (const lock of bundleStockLocks) {
          if (lock.locationId) {
            await tx.bundleStock.updateMany({
              where: {
                bundleId: lock.bundleId,
                warehouseId: lock.warehouseId,
                locationId: lock.locationId,
              },
              data: {
                totalQuantity: { decrement: lock.quantity },
                lockedQuantity: { decrement: lock.quantity },
              },
            });

            if (lock.locationId) {
              await cleanupEmptyBundleStockLocations(tx, lock.locationId);
            }
          } else {
            await tx.bundleStock.updateMany({
              where: {
                bundleId: lock.bundleId,
                warehouseId: lock.warehouseId,
              },
              data: {
                totalQuantity: { decrement: lock.quantity },
                lockedQuantity: { decrement: lock.quantity },
              },
            });
          }

          await tx.stockOut.create({
            data: {
              orderId: lock.orderId,
              bundleId: lock.bundleId,
              warehouseId: lock.warehouseId,
              locationId: lock.locationId,
              bundleBatchId: lock.bundleBatchId,
              quantity: lock.quantity,
            },
          });

          await tx.bundleStockLock.delete({ where: { id: lock.id } });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status },
        include: {
          owner: true,
          items: true,
        },
      });
    });

    const stockOuts = await prisma.stockOut.findMany({
      where: { orderId: id },
      include: {
        skuBatch: true,
        bundleBatch: true,
      },
    });

    res.json({ success: true, data: { ...order, stockOuts } });
  } catch (error) {
    console.error('Update order status error:', error);
    const message = error instanceof Error ? error.message : '服务器错误';
    res.status(400).json({ success: false, message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({ where: { id } });
      
      if (!order) {
        throw new Error('订单不存在');
      }
      
      if (order.status !== 'CANCELLED') {
        throw new Error('只有已取消的订单才能删除');
      }

      const stockLocks = await tx.stockLock.findMany({
        where: { orderId: id },
      });

      for (const lock of stockLocks) {
        if (lock.locationId) {
          await tx.stock.update({
            where: {
              warehouseId_locationId_skuBatchId: {
                skuId: lock.skuId,
                warehouseId: lock.warehouseId,
                locationId: lock.locationId,
                skuBatchId: lock.skuBatchId,
              },
            },
            data: {
              lockedQuantity: { decrement: lock.quantity },
              availableQuantity: { increment: lock.quantity },
            },
          });
        } else {
          await tx.stock.updateMany({
            where: {
              skuId: lock.skuId,
              warehouseId: lock.warehouseId,
              locationId: null,
              skuBatchId: lock.skuBatchId,
            },
            data: {
              lockedQuantity: { decrement: lock.quantity },
              availableQuantity: { increment: lock.quantity },
            },
          });
        }
        await tx.stockLock.delete({ where: { id: lock.id } });
      }

      const pickOrders = await tx.pickOrder.findMany({ where: { orderIds: { contains: id } } });
      for (const pickOrder of pickOrders) {
        await tx.pickOrderItem.deleteMany({ where: { pickOrderId: pickOrder.id } });
        await tx.pickOrder.delete({ where: { id: pickOrder.id } });
      }
      await tx.order.delete({ where: { id } });
    });
    
    res.json({ success: true, message: '订单已删除' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
