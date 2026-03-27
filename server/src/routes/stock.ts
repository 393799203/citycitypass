import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const stockInSchema = z.object({
  type: z.enum(['product', 'bundle']).default('product'),
  skuId: z.string().optional(),
  bundleId: z.string().optional(),
  warehouseId: z.string().min(1, '仓库不能为空'),
  locationId: z.string().optional(),
  quantity: z.number().int().positive('数量必须大于0'),
  batchNo: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  operator: z.string().optional(),
}).refine(data => data.skuId || data.bundleId, {
  message: "必须提供 skuId 或 bundleId"
});

const lockStockSchema = z.object({
  skuId: z.string().min(1, 'SKU不能为空'),
  warehouseId: z.string().min(1, '仓库不能为空'),
  locationId: z.string().optional(),
  orderId: z.string().min(1, '订单不能为空'),
  quantity: z.number().int().positive('数量必须大于0'),
});

function getStockWhere(skuId: string, warehouseId: string, locationId?: string) {
  return {
    skuId,
    warehouseId,
    locationId: locationId || null,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId, skuId, bundleId, inventoryType } = req.query;

    let zoneTypeFilter: object;
    if (inventoryType === 'sales') {
      zoneTypeFilter = { type: { in: ['STORAGE', 'PICKING'] } };
    } else {
      zoneTypeFilter = {};
    }

    const productStocks = await prisma.stock.findMany({
      where: {
        ...(warehouseId ? { warehouseId: warehouseId as string } : {}),
        ...(skuId ? { skuId: skuId as string } : {}),
        ...(inventoryType !== 'all' ? { location: { shelf: { zone: zoneTypeFilter } } } : {}),
      },
      include: {
        sku: {
          include: { product: true }
        },
        warehouse: true,
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const bundleStocks = await prisma.bundleStock.findMany({
      where: {
        ...(warehouseId ? { warehouseId: warehouseId as string } : {}),
        ...(bundleId ? { bundleId: bundleId as string } : {}),
        ...(inventoryType !== 'all' ? { location: { shelf: { zone: zoneTypeFilter } } } : {}),
      },
      include: {
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
        warehouse: true,
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const isSalesZoneType = (zoneType: string) => zoneType === 'STORAGE' || zoneType === 'PICKING';

    const processStocks = (stocks: any[]) => {
      return stocks.map(s => {
        const zoneType = s.location?.shelf?.zone?.type;
        const isSales = isSalesZoneType(zoneType);
        return {
          ...s,
          type: 'product',
          totalQuantity: s.totalQuantity,
          lockedQuantity: isSales ? s.lockedQuantity : 0,
          availableQuantity: isSales ? s.availableQuantity : 0,
        };
      });
    };

    const processBundleStocks = (stocks: any[]) => {
      return stocks.map(b => {
        const zoneType = b.location?.shelf?.zone?.type;
        const isSales = isSalesZoneType(zoneType);
        return {
          ...b,
          type: 'bundle',
          totalQuantity: b.totalQuantity,
          lockedQuantity: isSales ? b.lockedQuantity : 0,
          availableQuantity: isSales ? b.availableQuantity : 0,
        };
      });
    };

    const result = {
      productStocks: processStocks(productStocks),
      bundleStocks: processBundleStocks(bundleStocks),
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get stocks error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/available', async (req: Request, res: Response) => {
  try {
    const { warehouseId, skuId } = req.query;
    if (!warehouseId || !skuId) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }

    const stocks = await prisma.stock.findMany({
      where: {
        skuId: skuId as string,
        warehouseId: warehouseId as string,
      },
    });

    const totalAvailable = stocks.reduce((sum, s) => sum + s.availableQuantity, 0);
    const totalLocked = stocks.reduce((sum, s) => sum + s.lockedQuantity, 0);
    const totalQuantity = stocks.reduce((sum, s) => sum + s.totalQuantity, 0);

    res.json({ 
      success: true, 
      data: {
        totalQuantity,
        lockedQuantity: totalLocked,
        availableQuantity: totalAvailable,
      }
    });
  } catch (error) {
    console.error('Get available stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/owner-stock-summary', async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ success: false, message: '缺少货主ID' });
    }

    const warehouses = await prisma.warehouse.findMany({
      where: { ownerId: ownerId as string },
      select: { id: true, name: true, code: true },
    });

    if (warehouses.length === 0) {
      return res.json({ success: true, data: { products: [], bundles: [] } });
    }

    const warehouseIds = warehouses.map(w => w.id);

    const stocks = await prisma.stock.findMany({
      where: {
        warehouseId: { in: warehouseIds },
        location: {
          shelf: {
            zone: {
              type: { in: ['STORAGE', 'PICKING'] }
            }
          }
        }
      },
      include: {
        sku: {
          include: {
            product: {
              include: { brand: true, category: true },
            },
          },
        },
      },
    });

    const bundleStocks = await prisma.bundleStock.findMany({
      where: {
        warehouseId: { in: warehouseIds },
        location: {
          shelf: {
            zone: {
              type: { in: ['STORAGE', 'PICKING'] }
            }
          }
        }
      },
      include: {
        bundle: {
          include: {
            items: {
              include: {
                sku: {
                  include: { product: true },
                },
              },
            },
          },
        },
      },
    });

    const skuMap = new Map<string, {
      skuId: string;
      productName: string;
      spec: string;
      packaging: string;
      price: number;
      totalAvailable: number;
      brand?: { id: string; name: string };
      category?: { id: string; name: string };
      warehouseSummary: { warehouseId: string; warehouseName: string; available: number }[];
    }>();

    for (const stock of stocks) {
      const key = stock.skuId;
      if (!skuMap.has(key)) {
        skuMap.set(key, {
          skuId: stock.skuId,
          productName: stock.sku.product?.name || '',
          spec: stock.sku.spec || '',
          packaging: stock.sku.packaging || '',
          price: stock.sku.price ? Number(stock.sku.price) : 0,
          totalAvailable: 0,
          brand: stock.sku.product?.brand ? { id: stock.sku.product.brand.id, name: stock.sku.product.brand.name } : undefined,
          category: stock.sku.product?.category ? { id: stock.sku.product.category.id, name: stock.sku.product.category.name } : undefined,
          warehouseSummary: [],
        });
      }
      const entry = skuMap.get(key)!;
      entry.totalAvailable += stock.availableQuantity;
      const warehouse = warehouses.find(w => w.id === stock.warehouseId);
      const wsEntry = entry.warehouseSummary.find(ws => ws.warehouseId === stock.warehouseId);
      if (wsEntry) {
        wsEntry.available += stock.availableQuantity;
      } else {
        entry.warehouseSummary.push({
          warehouseId: stock.warehouseId,
          warehouseName: warehouse?.name || '',
          available: stock.availableQuantity,
        });
      }
    }

    const bundleMap = new Map<string, {
      bundleId: string;
      bundleName: string;
      price: number;
      totalAvailable: number;
      items: { skuId: string; productName: string; spec: string; packaging: string; quantity: number }[];
      warehouseSummary: { warehouseId: string; warehouseName: string; available: number }[];
    }>();

    for (const bs of bundleStocks) {
      const key = bs.bundleId;
      if (!bundleMap.has(key)) {
        bundleMap.set(key, {
          bundleId: bs.bundleId,
          bundleName: bs.bundle.name || '',
          price: bs.bundle.price ? Number(bs.bundle.price) : 0,
          totalAvailable: 0,
          items: bs.bundle.items?.map(item => ({
            skuId: item.skuId,
            productName: item.sku?.product?.name || '',
            spec: item.sku?.spec || '',
            packaging: item.sku?.packaging || '',
            quantity: item.quantity,
          })) || [],
          warehouseSummary: [],
        });
      }
      const entry = bundleMap.get(key)!;
      entry.totalAvailable += bs.availableQuantity;
      const warehouse = warehouses.find(w => w.id === bs.warehouseId);
      const wsEntry = entry.warehouseSummary.find(ws => ws.warehouseId === bs.warehouseId);
      if (wsEntry) {
        wsEntry.available += bs.availableQuantity;
      } else {
        entry.warehouseSummary.push({
          warehouseId: bs.warehouseId,
          warehouseName: warehouse?.name || '',
          available: bs.availableQuantity,
        });
      }
    }

    res.json({
      success: true,
      data: {
        products: Array.from(skuMap.values()),
        bundles: Array.from(bundleMap.values()),
      },
    });
  } catch (error) {
    console.error('Get owner stock summary error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/stock-in', async (req: Request, res: Response) => {
  try {
    const { warehouseId, skuId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (skuId) where.skuId = skuId as string;

    const stockIns = await prisma.stockIn.findMany({
      where,
      include: {
        sku: {
          include: { product: true }
        },
        warehouse: true,
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const bundleStockIns = await prisma.bundleStockIn.findMany({
      where: warehouseId ? { warehouseId: warehouseId as string } : {},
      include: {
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
        warehouse: true,
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const productRecords = stockIns.map(s => ({ ...s, type: 'product' }));
    const bundleRecords = bundleStockIns.map(b => ({ 
      ...b,
      type: 'bundle',
    }));

    const result = [...productRecords, ...bundleRecords].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get stock-ins error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/stock-in', async (req: Request, res: Response) => {
  try {
    const data = stockInSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      if (data.type === 'bundle') {
        const bundleStockIn = await tx.bundleStockIn.create({
          data: {
            bundleId: data.bundleId!,
            warehouseId: data.warehouseId,
            locationId: data.locationId || null,
            quantity: data.quantity,
            remark: data.remark || null,
            status: 'PENDING',
          },
        });
        return { type: 'bundle', data: bundleStockIn };
      } else {
        const stockIn = await tx.stockIn.create({
          data: {
            skuId: data.skuId!,
            warehouseId: data.warehouseId,
            locationId: data.locationId || null,
            quantity: data.quantity,
            batchNo: data.batchNo || null,
            remark: data.remark || null,
            operator: data.operator || null,
            status: 'PENDING',
          },
        });
        return { type: 'product', data: stockIn };
      }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Stock in error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/inbound-order', async (req: Request, res: Response) => {
  try {
    const { warehouseId, supplierId, source, snManagement, remark, items, returnOrderId } = req.body;

    if (!warehouseId) {
      return res.status(400).json({ success: false, message: '仓库不能为空' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: '入库项不能为空' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const inboundNo = `IN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const inboundOrder = await tx.inboundOrder.create({
        data: {
          inboundNo,
          warehouseId,
          supplierId: supplierId || null,
          source: source || 'PURCHASE',
          snManagement: snManagement || false,
          remark: remark || null,
          status: source === 'RETURN' ? 'RECEIVED' : 'PENDING',
        },
      });

      await tx.inboundOrderItem.createMany({
        data: items.map((item: any) => ({
          inboundId: inboundOrder.id,
          type: item.type,
          skuId: item.skuId || null,
          bundleId: item.bundleId || null,
          locationId: item.locationId || null,
          quantity: item.quantity,
          expectedQuantity: item.quantity,
          batchNo: item.batchNo || null,
        })),
      });

      if (source === 'RETURN' && returnOrderId) {
        await tx.returnOrder.update({
          where: { id: returnOrderId },
          data: { status: 'RETURN_STOCK_IN' },
        });
        await tx.returnLog.create({
          data: {
            returnOrderId,
            action: 'STOCK_IN',
            beforeStatus: 'RETURN_PARTIAL_QUALIFIED',
            afterStatus: 'RETURN_STOCK_IN',
            operatorName: (req as any).user?.name || 'system',
            remark: `创建入库单: ${inboundNo}`,
          },
        });
      }

      return inboundOrder;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Create inbound order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/inbound-orders', async (req: Request, res: Response) => {
  try {
    const { warehouseId, status } = req.query;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (status) where.status = status as string;

    const orders = await prisma.inboundOrder.findMany({
      where,
      include: {
        warehouse: true,
        supplier: true,
        items: {
          include: {
            location: {
              include: {
                shelf: {
                  include: {
                    zone: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const itemsWithDetails = await Promise.all(
          order.items.map(async (item) => {
            const itemType = item.type?.toUpperCase();
            if (itemType === 'PRODUCT' && item.skuId) {
              const sku = await prisma.productSKU.findUnique({
                where: { id: item.skuId },
                include: { product: true },
              });
              return { ...item, sku, product: sku?.product };
            } else if (itemType === 'BUNDLE' && item.bundleId) {
              const bundle = await prisma.bundleSKU.findUnique({
                where: { id: item.bundleId },
              });
              return { ...item, bundle };
            }
            return item;
          })
        );
        return { ...order, items: itemsWithDetails };
      })
    );

    res.json({ success: true, data: ordersWithDetails });
  } catch (error) {
    console.error('Get inbound orders error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/inbound-order/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, arrivedAt, receivedAt, putawayAt, palletNo, vehicleNo, remark, items } = req.body;

    const order = await prisma.inboundOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (arrivedAt) updateData.arrivedAt = new Date(arrivedAt);
    if (receivedAt) updateData.receivedAt = new Date(receivedAt);
    if (putawayAt) updateData.putawayAt = new Date(putawayAt);
    if (palletNo !== undefined) updateData.palletNo = palletNo;
    if (vehicleNo !== undefined) updateData.vehicleNo = vehicleNo;
    if (remark !== undefined) updateData.remark = remark;

    if (items) {
      for (const item of items) {
        const updateItemData: any = {};
        if (item.batchNo !== undefined) updateItemData.batchNo = item.batchNo;
        if (item.arrivalQuantity !== undefined) updateItemData.expectedQuantity = item.arrivalQuantity;
        if (item.receivedQuantity !== undefined) updateItemData.receivedQuantity = item.receivedQuantity;
        if (item.inspectionResult !== undefined) updateItemData.inspectionResult = item.inspectionResult;
        if (item.inspectionNote !== undefined) updateItemData.inspectionNote = item.inspectionNote;
        if (item.snCodes !== undefined) updateItemData.snCodes = item.snCodes;
        if (item.locationId !== undefined) updateItemData.locationId = item.locationId;
        if (item.targetLocationId !== undefined) updateItemData.locationId = item.targetLocationId;

        await prisma.inboundOrderItem.update({
          where: { id: item.id },
          data: updateItemData,
        });
      }
    }

    if (status === 'COMPLETED') {
      const orderWithItems = await prisma.inboundOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (orderWithItems) {
        await prisma.$transaction(async (tx) => {
          for (const item of orderWithItems.items) {
            if (item.type === 'PRODUCT' && item.skuId && item.locationId) {
              let stock = await tx.stock.findFirst({
                where: {
                  skuId: item.skuId,
                  warehouseId: orderWithItems.warehouseId,
                  locationId: item.locationId,
                  batchNo: item.batchNo || null,
                },
              });

              const quantity = item.receivedQuantity !== null && item.receivedQuantity !== undefined
                ? item.receivedQuantity
                : (item.expectedQuantity || 0);

              if (stock) {
                await tx.stock.update({
                  where: { id: stock.id },
                  data: {
                    totalQuantity: { increment: quantity },
                    availableQuantity: { increment: quantity },
                  },
                });
              } else {
                await tx.stock.create({
                  data: {
                    skuId: item.skuId,
                    warehouseId: orderWithItems.warehouseId,
                    locationId: item.locationId,
                    batchNo: item.batchNo || null,
                    totalQuantity: quantity,
                    availableQuantity: quantity,
                  },
                });
              }

              await tx.stockIn.create({
                data: {
                  skuId: item.skuId,
                  warehouseId: orderWithItems.warehouseId,
                  locationId: item.locationId,
                  batchNo: item.batchNo || null,
                  quantity,
                  status: 'COMPLETED',
                },
              });
            } else if (item.type === 'BUNDLE' && item.bundleId && item.locationId) {
              let bundleStock = await tx.bundleStock.findFirst({
                where: {
                  bundleId: item.bundleId,
                  warehouseId: orderWithItems.warehouseId,
                  locationId: item.locationId,
                  batchNo: item.batchNo || null,
                },
              });

              const quantity = item.receivedQuantity !== null && item.receivedQuantity !== undefined
                ? item.receivedQuantity
                : (item.expectedQuantity || 0);

              if (bundleStock) {
                await tx.bundleStock.update({
                  where: { id: bundleStock.id },
                  data: {
                    totalQuantity: { increment: quantity },
                    availableQuantity: { increment: quantity },
                  },
                });
              } else {
                await tx.bundleStock.create({
                  data: {
                    bundleId: item.bundleId,
                    warehouseId: orderWithItems.warehouseId,
                    locationId: item.locationId,
                    batchNo: item.batchNo || null,
                    totalQuantity: quantity,
                    availableQuantity: quantity,
                  },
                });
              }

              await tx.bundleStockIn.create({
                data: {
                  bundleId: item.bundleId,
                  warehouseId: orderWithItems.warehouseId,
                  locationId: item.locationId,
                  batchNo: item.batchNo || null,
                  quantity,
                  status: 'COMPLETED',
                },
              });
            }
          }
        });
      }
    }

    const updated = await prisma.inboundOrder.update({
      where: { id },
      data: updateData,
      include: {
        warehouse: true,
        items: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update inbound order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/inbound-order/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.inboundOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: '入库单无法取消' });
    }

    if (order.source === 'RETURN') {
      return res.status(400).json({ success: false, message: '退货入库单无法取消' });
    }

    const updated = await prisma.inboundOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Cancel inbound order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/inbound-order/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.inboundOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }
    if (order.status !== 'PUTAWAY') {
      return res.status(400).json({ success: false, message: '入库单状态不是待执行' });
    }

    await prisma.$transaction(async (tx) => {
      const errors: string[] = [];

      for (const item of order.items) {
        if (!item.locationId) {
          errors.push(`商品未选择库位`);
          continue;
        }

        const location = await tx.location.findUnique({
          where: { id: item.locationId },
          include: { shelf: { include: { zone: true } } },
        });

        if (!location) {
          errors.push(`库位不存在`);
          continue;
        }

        const zoneType = location.shelf?.zone?.type;

        if (order.source === 'RETURN') {
          if (zoneType !== 'RETURNING') {
            errors.push(`退货入库只能选择退货区库位`);
            continue;
          }
        } else {
          if (zoneType !== 'INBOUND') {
            errors.push(`入库只能选择入库区库位`);
            continue;
          }
        }

        const quantity = item.receivedQuantity !== null && item.receivedQuantity !== undefined
          ? item.receivedQuantity
          : (item.expectedQuantity || item.quantity);

        if (item.type === 'PRODUCT' && item.skuId) {
          let stock = await tx.stock.findFirst({
            where: {
              skuId: item.skuId,
              warehouseId: order.warehouseId,
              locationId: item.locationId,
              batchNo: item.batchNo || null,
            },
          });

          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: {
                totalQuantity: { increment: quantity },
                availableQuantity: { increment: quantity },
              },
            });
          } else {
            await tx.stock.create({
              data: {
                skuId: item.skuId,
                warehouseId: order.warehouseId,
                locationId: item.locationId,
                batchNo: item.batchNo || null,
                totalQuantity: quantity,
                availableQuantity: quantity,
              },
            });
          }

          await tx.stockIn.create({
            data: {
              skuId: item.skuId,
              warehouseId: order.warehouseId,
              locationId: item.locationId,
              batchNo: item.batchNo || null,
              quantity,
              status: 'COMPLETED',
            },
          });
        } else if (item.type === 'BUNDLE' && item.bundleId) {
          let bundleStock = await tx.bundleStock.findFirst({
            where: {
              bundleId: item.bundleId,
              warehouseId: order.warehouseId,
              locationId: item.locationId,
              batchNo: item.batchNo || null,
            },
          });

          if (bundleStock) {
            await tx.bundleStock.update({
              where: { id: bundleStock.id },
              data: {
                totalQuantity: { increment: quantity },
                availableQuantity: { increment: quantity },
              },
            });
          } else {
            await tx.bundleStock.create({
              data: {
                bundleId: item.bundleId,
                warehouseId: order.warehouseId,
                locationId: item.locationId,
                batchNo: item.batchNo || null,
                totalQuantity: quantity,
                availableQuantity: quantity,
              },
            });
          }

          await tx.bundleStockIn.create({
            data: {
              bundleId: item.bundleId,
              warehouseId: order.warehouseId,
              locationId: item.locationId,
              batchNo: item.batchNo || null,
              quantity,
              status: 'COMPLETED',
            },
          });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: errors.join('; ') });
      }

      await tx.inboundOrder.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
    });

    res.json({ success: true, message: '入库执行完成' });
  } catch (error) {
    console.error('Execute inbound order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/stock-in/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      if (type === 'bundle') {
        const stockIn = await tx.bundleStockIn.findUnique({ where: { id } });
        if (!stockIn) throw new Error('入库单不存在');
        if (stockIn.status !== 'PENDING') throw new Error('入库单已处理');

        let bundleStock = await tx.bundleStock.findFirst({
          where: {
            bundleId: stockIn.bundleId,
            warehouseId: stockIn.warehouseId,
            locationId: stockIn.locationId,
          },
        });

        if (bundleStock) {
          bundleStock = await tx.bundleStock.update({
            where: { id: bundleStock.id },
            data: {
              totalQuantity: { increment: stockIn.quantity },
              availableQuantity: { increment: stockIn.quantity },
            },
          });
        } else {
          bundleStock = await tx.bundleStock.create({
            data: {
              bundleId: stockIn.bundleId,
              warehouseId: stockIn.warehouseId,
              locationId: stockIn.locationId,
              totalQuantity: stockIn.quantity,
              availableQuantity: stockIn.quantity,
            },
          });
        }

        const updated = await tx.bundleStockIn.update({
          where: { id },
          data: { status: 'COMPLETED', executedAt: new Date() },
        });

        return { type: 'bundle', data: updated, stockId: bundleStock.id };
      } else {
        const stockIn = await tx.stockIn.findUnique({ where: { id } });
        if (!stockIn) throw new Error('入库单不存在');
        if (stockIn.status !== 'PENDING') throw new Error('入库单已处理');

        let stock = await tx.stock.findFirst({
          where: getStockWhere(stockIn.skuId, stockIn.warehouseId, stockIn.locationId || undefined),
        });

        if (stock) {
          stock = await tx.stock.update({
            where: { id: stock.id },
            data: {
              totalQuantity: { increment: stockIn.quantity },
              availableQuantity: { increment: stockIn.quantity },
            },
          });
        } else {
          stock = await tx.stock.create({
            data: {
              skuId: stockIn.skuId,
              warehouseId: stockIn.warehouseId,
              locationId: stockIn.locationId,
              totalQuantity: stockIn.quantity,
              availableQuantity: stockIn.quantity,
            },
          });
        }

        const updated = await tx.stockIn.update({
          where: { id },
          data: { status: 'COMPLETED', executedAt: new Date(), stockId: stock.id },
        });

        return { type: 'product', data: updated, stockId: stock.id };
      }
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Execute stock-in error:', error);
    res.status(400).json({ success: false, message: error.message || '服务器错误' });
  }
});

router.put('/stock-in/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      if (type === 'bundle') {
        const stockIn = await tx.bundleStockIn.findUnique({ where: { id } });
        if (!stockIn) throw new Error('入库单不存在');
        if (stockIn.status !== 'PENDING') throw new Error('入库单已处理');

        const updated = await tx.bundleStockIn.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });
        return { type: 'bundle', data: updated };
      } else {
        const stockIn = await tx.stockIn.findUnique({ where: { id } });
        if (!stockIn) throw new Error('入库单不存在');
        if (stockIn.status !== 'PENDING') throw new Error('入库单已处理');

        const updated = await tx.stockIn.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });
        return { type: 'product', data: updated };
      }
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Cancel stock-in error:', error);
    res.status(400).json({ success: false, message: error.message || '服务器错误' });
  }
});

router.post('/lock', async (req: Request, res: Response) => {
  try {
    const data = lockStockSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      let stock = await tx.stock.findFirst({
          where: getStockWhere(data.skuId, data.warehouseId, data.locationId),
        });

      if (!stock || stock.availableQuantity < data.quantity) {
        throw new Error('库存不足');
      }

      const stockLock = await tx.stockLock.create({
        data: {
          skuId: data.skuId,
          orderId: data.orderId,
          warehouseId: data.warehouseId,
          locationId: data.locationId || null,
          quantity: data.quantity,
          status: 'LOCKED',
        },
      });

      await tx.stock.update({
        where: { id: stock.id },
        data: {
          lockedQuantity: stock.lockedQuantity + data.quantity,
          availableQuantity: stock.availableQuantity - data.quantity,
        },
      });

      return stockLock;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Lock stock error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/unlock', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: '订单ID不能为空' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const locks = await tx.stockLock.findMany({
        where: { orderId, status: 'LOCKED' },
      });

      for (const lock of locks) {
        const stock = await tx.stock.findFirst({
          where: getStockWhere(lock.skuId, lock.warehouseId, lock.locationId || undefined),
        });

        if (stock) {
          const newLockedQty = Math.max(0, stock.lockedQuantity - lock.quantity);
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              lockedQuantity: newLockedQty,
              availableQuantity: stock.availableQuantity + (stock.lockedQuantity - newLockedQty),
            },
          });
        }

        await tx.stockLock.update({
          where: { id: lock.id },
          data: { status: 'RELEASED' },
        });
      }

      return locks;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Unlock stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/use', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: '订单ID不能为空' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const locks = await tx.stockLock.findMany({
        where: { orderId, status: 'LOCKED' },
      });

      for (const lock of locks) {
        const stock = await tx.stock.findFirst({
          where: getStockWhere(lock.skuId, lock.warehouseId, lock.locationId || undefined),
        });

        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              totalQuantity: stock.totalQuantity - lock.quantity,
              lockedQuantity: stock.lockedQuantity - lock.quantity,
            },
          });

          await tx.stockOut.create({
            data: {
              orderId: lock.orderId,
              skuId: lock.skuId,
              warehouseId: lock.warehouseId,
              locationId: lock.locationId,
              batchNo: lock.batchNo,
              quantity: lock.quantity,
            },
          });
        }

        await tx.stockLock.update({
          where: { id: lock.id },
          data: { status: 'USED' },
        });
      }

      return locks;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Use stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/bundle/lock', async (req: Request, res: Response) => {
  try {
    const { bundleId, warehouseId, locationId, quantity, orderId } = req.body;
    if (!bundleId || !warehouseId || !quantity || !orderId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const bundleStock = await tx.bundleStock.findFirst({
        where: { bundleId, warehouseId, locationId: locationId || null },
      });

      if (!bundleStock || bundleStock.availableQuantity < quantity) {
        throw new Error('套装库存不足');
      }

      const stockLock = await tx.bundleStockLock.create({
        data: {
          bundleId,
          orderId,
          warehouseId,
          locationId: locationId || null,
          quantity,
        },
      });

      await tx.bundleStock.update({
        where: { id: bundleStock.id },
        data: {
          lockedQuantity: bundleStock.lockedQuantity + quantity,
          availableQuantity: bundleStock.availableQuantity - quantity,
        },
      });

      return stockLock;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Lock bundle stock error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/bundle/unlock', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: '订单ID不能为空' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const locks = await tx.bundleStockLock.findMany({
        where: { orderId },
      });

      for (const lock of locks) {
        const bundleStock = await tx.bundleStock.findFirst({
          where: { bundleId: lock.bundleId, warehouseId: lock.warehouseId, locationId: lock.locationId || null },
        });

        if (bundleStock) {
          const newLockedQty = Math.max(0, bundleStock.lockedQuantity - lock.quantity);
          await tx.bundleStock.update({
            where: { id: bundleStock.id },
            data: {
              lockedQuantity: newLockedQty,
              availableQuantity: bundleStock.availableQuantity + (bundleStock.lockedQuantity - newLockedQty),
            },
          });
        }

        await tx.bundleStockLock.delete({ where: { id: lock.id } });
      }

      return locks;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Unlock bundle stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/bundle/use', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: '订单ID不能为空' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const locks = await tx.bundleStockLock.findMany({
        where: { orderId },
      });

      for (const lock of locks) {
        const bundleStock = await tx.bundleStock.findFirst({
          where: { bundleId: lock.bundleId, warehouseId: lock.warehouseId, locationId: lock.locationId || null },
        });

        if (bundleStock) {
          await tx.bundleStock.update({
            where: { id: bundleStock.id },
            data: {
              totalQuantity: bundleStock.totalQuantity - lock.quantity,
              lockedQuantity: bundleStock.lockedQuantity - lock.quantity,
            },
          });

          await tx.stockOut.create({
            data: {
              orderId: lock.orderId,
              bundleId: lock.bundleId,
              warehouseId: lock.warehouseId,
              locationId: lock.locationId,
              batchNo: lock.batchNo,
              quantity: lock.quantity,
            },
          });
        }

        await tx.bundleStockLock.delete({ where: { id: lock.id } });
      }

      return locks;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Use bundle stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/out', async (req: Request, res: Response) => {
  try {
    const { warehouseId, startDate, endDate, orderId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (orderId) where.orderId = orderId as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const stockOuts = await prisma.stockOut.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const warehouseIds = [...new Set(stockOuts.map(s => s.warehouseId))];
    const skuIds = stockOuts.filter(s => s.skuId).map(s => s.skuId);
    const bundleIds = stockOuts.filter(s => s.bundleId).map(s => s.bundleId);
    const locationIds = stockOuts.filter(s => s.locationId).map(s => s.locationId);
    const orderIds = [...new Set(stockOuts.map(s => s.orderId))];

    const [warehouses, skus, bundles, locations, orders] = await Promise.all([
      warehouseIds.length ? prisma.warehouse.findMany({ where: { id: { in: warehouseIds as string[] } } }) : [],
      skuIds.length ? prisma.productSKU.findMany({ where: { id: { in: skuIds as string[] } }, include: { product: true } }) : [],
      bundleIds.length ? prisma.bundleSKU.findMany({ where: { id: { in: bundleIds as string[] } }, include: { items: { include: { sku: { include: { product: true } } } } } }) : [],
      locationIds.length ? prisma.location.findMany({ where: { id: { in: locationIds as string[] } }, include: { shelf: { include: { zone: true } } } }) : [],
      orderIds.length ? prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : [],
    ]);

    const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]));
    const skuMap = Object.fromEntries(skus.map(s => [s.id, s]));
    const bundleMap = Object.fromEntries(bundles.map(b => [b.id, b]));
    const locationMap = Object.fromEntries(locations.map(l => [l.id, l]));
    const orderMap = Object.fromEntries(orders.map(o => [o.id, o]));

    const result = stockOuts.map(out => ({
      ...out,
      warehouse: warehouseMap[out.warehouseId],
      sku: out.skuId ? skuMap[out.skuId] : null,
      bundle: out.bundleId ? bundleMap[out.bundleId] : null,
      location: out.locationId ? locationMap[out.locationId] : null,
      order: orderMap[out.orderId] || null,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('List stock out error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/bundle', async (req: Request, res: Response) => {
  try {
    const { warehouseId, bundleId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (bundleId) where.bundleId = bundleId as string;

    const stocks = await prisma.bundleStock.findMany({
      where,
      include: {
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
        warehouse: true,
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const processedStocks = stocks.map(stock => {
      const isSalesZone = ['STORAGE', 'PICKING'].includes(stock.location?.shelf?.zone?.type || '');
      if (!isSalesZone) {
        return {
          ...stock,
          availableQuantity: 0,
          lockedQuantity: 0,
        };
      }
      return stock;
    });

    res.json({ success: true, data: processedStocks });
  } catch (error) {
    console.error('Get bundle stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/bundle/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { warehouseId } = req.query;
    const where: any = {
      bundleId: id,
    };
    if (warehouseId) where.warehouseId = warehouseId as string;

    const stocks = await prisma.bundleStock.findMany({
      where,
      include: {
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
        warehouse: true,
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const processedStocks = stocks.map(stock => {
      const isSalesZone = ['STORAGE', 'PICKING'].includes(stock.location?.shelf?.zone?.type || '');
      if (!isSalesZone) {
        return {
          ...stock,
          availableQuantity: 0,
          lockedQuantity: 0,
        };
      }
      return stock;
    });

    res.json({ success: true, data: processedStocks });
  } catch (error) {
    console.error('Get bundle stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/sku/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { warehouseId } = req.query;
    const where: any = {
      sku: { productId: id },
    };
    if (warehouseId) where.warehouseId = warehouseId as string;

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        sku: {
          include: { product: true }
        },
        warehouse: true,
        location: {
          include: {
            shelf: {
              include: {
                zone: true
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const processedStocks = stocks.map(stock => {
      const isSalesZone = ['STORAGE', 'PICKING'].includes(stock.location?.shelf?.zone?.type || '');
      if (!isSalesZone) {
        return {
          ...stock,
          availableQuantity: 0,
          lockedQuantity: 0,
        };
      }
      return stock;
    });

    res.json({ success: true, data: processedStocks });
  } catch (error) {
    console.error('Get sku stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/bundle/stock-in', async (req: Request, res: Response) => {
  try {
    const { bundleId, warehouseId, locationId, quantity, batchNo, remark } = req.body;
    if (!bundleId || !warehouseId || !quantity) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let bundleStock = await tx.bundleStock.findFirst({
        where: { bundleId, warehouseId, locationId: locationId || null },
      });

      if (bundleStock) {
        bundleStock = await tx.bundleStock.update({
          where: { id: bundleStock.id },
          data: {
            totalQuantity: { increment: quantity },
            availableQuantity: { increment: quantity },
          },
        });
      } else {
        bundleStock = await tx.bundleStock.create({
          data: {
            bundleId,
            warehouseId,
            locationId: locationId || null,
            totalQuantity: quantity,
            availableQuantity: quantity,
          },
        });
      }

      const bundleStockIn = await tx.bundleStockIn.create({
        data: {
          bundleId,
          warehouseId,
          locationId: locationId || null,
          quantity,
          remark: remark || null,
        },
      });

      return bundleStock;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Bundle stock in error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/batch/list', async (_req: Request, res: Response) => {
  try {
    const stockIns = await prisma.stockIn.findMany({
      select: { batchNo: true },
      distinct: ['batchNo'],
      where: { batchNo: { not: null } },
    });
    const bundleStockIns = await prisma.bundleStockIn.findMany({
      select: { batchNo: true },
      distinct: ['batchNo'],
      where: { batchNo: { not: null } },
    });
    const stockOuts = await prisma.stockOut.findMany({
      select: { batchNo: true },
      distinct: ['batchNo'],
      where: { batchNo: { not: null } },
    });

    const allBatchNos = [...stockIns, ...bundleStockIns, ...stockOuts]
      .map(r => r.batchNo)
      .filter(Boolean) as string[];

    const uniqueBatchNos = [...new Set(allBatchNos)].sort().reverse();

    res.json({ success: true, data: uniqueBatchNos });
  } catch (error) {
    console.error('Batch list error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/batch/:batchNo/trace', async (req: Request, res: Response) => {
  try {
    const { batchNo } = req.params;

    const stockIns: any[] = await prisma.stockIn.findMany({
      where: { batchNo },
      include: {
        sku: { include: { product: true } },
        warehouse: true,
        location: { include: { shelf: { include: { zone: true } } } },
      },
    });

    const bundleStockIns: any[] = await prisma.bundleStockIn.findMany({
      where: { batchNo },
      include: {
        bundle: true,
        warehouse: true,
        location: { include: { shelf: { include: { zone: true } } } },
      },
    });

    const stocks: any[] = await prisma.stock.findMany({
      where: { batchNo },
      include: {
        sku: { include: { product: true } },
        warehouse: true,
        location: { include: { shelf: { include: { zone: true } } } },
      },
    });

    const bundleStocks: any[] = await prisma.bundleStock.findMany({
      where: { batchNo },
      include: {
        bundle: true,
        warehouse: true,
        location: { include: { shelf: { include: { zone: true } } } },
      },
    });

    const stockLocks = await prisma.stockLock.findMany({
      where: { batchNo },
      include: {
        sku: { include: { product: true } },
        order: { include: { customer: true } },
        warehouse: true,
      },
    });

    const bundleStockLocks = await prisma.bundleStockLock.findMany({
      where: { batchNo },
      include: {
        bundle: true,
        order: { include: { customer: true } },
        warehouse: true,
      },
    });

    const stockTransfers: any[] = await prisma.stockTransferItem.findMany({
      where: { batchNo },
      include: {
        transfer: true,
        fromLocation: { include: { shelf: { include: { zone: true } } } },
        toLocation: { include: { shelf: { include: { zone: true } } } },
      },
    });

    const bundleStockTransfers: any[] = await prisma.stockTransferItem.findMany({
      where: { batchNo },
      include: {
        transfer: true,
        fromLocation: { include: { shelf: { include: { zone: true } } } },
        toLocation: { include: { shelf: { include: { zone: true } } } },
      },
    } as any);

    const stockOuts = await prisma.stockOut.findMany({
      where: { batchNo },
    });

    const totalInStock = stockIns.reduce((sum, s) => sum + s.quantity, 0) +
                         bundleStockIns.reduce((sum, s) => sum + s.quantity, 0);

    const totalInWarehouse = stocks.reduce((sum, s) => sum + s.totalQuantity, 0) +
                             bundleStocks.reduce((sum, s) => sum + s.totalQuantity, 0);

    const totalLocked = stockLocks.reduce((sum, s) => sum + s.quantity, 0) +
                       bundleStockLocks.reduce((sum, s) => sum + s.quantity, 0);

    const totalSold = stockOuts.reduce((sum, s) => sum + s.quantity, 0);

    const stockLocations = stocks.map(s => ({
      type: 'PRODUCT',
      locationCode: s.location ? `${s.location.shelf?.zone?.code || ''}-${s.location.shelf?.code || ''}-L${s.location.level}` : '',
      quantity: s.totalQuantity,
      availableQuantity: s.availableQuantity,
      lockedQuantity: s.lockedQuantity,
      warehouse: s.warehouse?.name,
    }));

    const bundleLocations = bundleStocks.map(s => ({
      type: 'BUNDLE',
      locationCode: s.location ? `${s.location.shelf?.zone?.code || ''}-${s.location.shelf?.code || ''}-L${s.location.level}` : '',
      quantity: s.totalQuantity,
      availableQuantity: s.availableQuantity,
      lockedQuantity: s.lockedQuantity,
      warehouse: s.warehouse?.name,
    }));

    const soldOrders: any[] = await (async () => {
      if (stockOuts.length === 0) return [];

      const orderIds = stockOuts.map(s => s.orderId).filter(id => !!id) as string[];
      const warehouseIds = stockOuts.map(s => s.warehouseId).filter(id => !!id) as string[];
      const skuIds = stockOuts.map(s => s.skuId).filter(id => !!id) as string[];
      const bundleIds = stockOuts.map(s => s.bundleId).filter(id => !!id) as string[];

      const [orders, warehouses, skus, bundles] = await Promise.all([
        orderIds.length > 0 ? prisma.order.findMany({ where: { id: { in: [...new Set(orderIds)] } }, include: { customer: true } }) : [],
        warehouseIds.length > 0 ? prisma.warehouse.findMany({ where: { id: { in: [...new Set(warehouseIds)] } } }) : [],
        skuIds.length > 0 ? prisma.productSKU.findMany({ where: { id: { in: [...new Set(skuIds)] } }, include: { product: true } }) : [],
        bundleIds.length > 0 ? prisma.bundleSKU.findMany({ where: { id: { in: [...new Set(bundleIds)] } } }) : [],
      ]);

      const ordersMap: Record<string, any> = {};
      orders.forEach(o => { ordersMap[o.id] = o; });
      const warehousesMap: Record<string, any> = {};
      warehouses.forEach(w => { warehousesMap[w.id] = w; });
      const skuMap: Record<string, any> = {};
      skus.forEach(s => { skuMap[s.id] = s; });
      const bundleMap: Record<string, any> = {};
      bundles.forEach(b => { bundleMap[b.id] = b; });

      return stockOuts.map(s => {
        const order = ordersMap[s.orderId];
        const warehouse = warehousesMap[s.warehouseId];
        const isBundle = !!s.bundleId;
        const sku = skuMap[s.skuId || ''];
        const bundle = bundleMap[s.bundleId || ''];
        return {
          type: isBundle ? 'BUNDLE' : 'PRODUCT',
          orderNo: order?.orderNo,
          orderId: s.orderId,
          customer: order?.customer?.name,
          customerPhone: order?.customer?.phone,
          quantity: s.quantity,
          productName: sku?.product?.name,
          bundleName: bundle?.name,
          warehouse: warehouse?.name,
          createdAt: s.createdAt,
        };
      });
    })();

    const allTransfers = [
      ...stockTransfers.map(t => ({
        transferNo: t.transfer?.transferNo,
        fromLocation: t.fromLocation ? `${t.fromLocation.shelf?.zone?.code || ''}-${t.fromLocation.shelf?.code || ''}-L${t.fromLocation.level}` : '',
        toLocation: t.toLocation ? `${t.toLocation.shelf?.zone?.code || ''}-${t.toLocation.shelf?.code || ''}-L${t.toLocation.level}` : '',
        quantity: t.quantity,
        status: t.transfer?.status,
        executedAt: t.transfer?.executedAt,
      })),
      ...bundleStockTransfers.map(t => ({
        transferNo: t.transfer?.transferNo,
        fromLocation: t.fromLocation ? `${t.fromLocation.shelf?.zone?.code || ''}-${t.fromLocation.shelf?.code || ''}-L${t.fromLocation.level}` : '',
        toLocation: t.toLocation ? `${t.toLocation.shelf?.zone?.code || ''}-${t.toLocation.shelf?.code || ''}-L${t.toLocation.level}` : '',
        quantity: t.quantity,
        status: t.transfer?.status,
        executedAt: t.transfer?.executedAt,
      })),
    ];

    const uniqueTransferMap = new Map<string, any>();
    for (const t of allTransfers) {
      if (t.transferNo && !uniqueTransferMap.has(t.transferNo)) {
        uniqueTransferMap.set(t.transferNo, t);
      }
    }
    const transferRecords = Array.from(uniqueTransferMap.values());

    res.json({
      success: true,
      data: {
        batchNo,
        totalInStock,
        totalInWarehouse,
        totalLocked,
        totalSold,
        stockIns: stockIns.map(s => ({
          type: 'PRODUCT',
          productName: s.sku?.product?.name,
          skuCode: s.sku?.skuCode,
          quantity: s.quantity,
          warehouse: s.warehouse?.name,
          locationCode: s.location ? `${s.location.shelf?.zone?.code || ''}-${s.location.shelf?.code || ''}-L${s.location.level}` : '',
          createdAt: s.createdAt,
        })),
        bundleStockIns: bundleStockIns.map(s => ({
          type: 'BUNDLE',
          bundleName: s.bundle?.name,
          quantity: s.quantity,
          warehouse: s.warehouse?.name,
          locationCode: s.location ? `${s.location.shelf?.zone?.code || ''}-${s.location.shelf?.code || ''}-L${s.location.level}` : '',
          createdAt: s.createdAt,
        })),
        locations: [...stockLocations, ...bundleLocations],
        soldOrders,
        transferRecords,
      },
    });
  } catch (error) {
    console.error('Batch trace error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
