import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { formatLocationCode } from '../../utils/helpers';

const router = Router();

// GET /
router.get('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId, skuId, bundleId, inventoryType, ownerId } = req.query;

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
        ...(ownerId ? { warehouse: { ownerId: ownerId as string } } : {}),
      },
      include: {
        sku: {
          include: { product: true }
        },
        warehouse: { include: { owner: true } },
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
      },
      orderBy: { createdAt: 'desc' },
    });

    const bundleStocks = await prisma.bundleStock.findMany({
      where: {
        ...(warehouseId ? { warehouseId: warehouseId as string } : {}),
        ...(bundleId ? { bundleId: bundleId as string } : {}),
        ...(inventoryType !== 'all' ? { location: { shelf: { zone: zoneTypeFilter } } } : {}),
        ...(ownerId ? { warehouse: { ownerId: ownerId as string } } : {}),
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
        bundleBatch: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const materialStocks = await prisma.materialStock.findMany({
      where: {
        ...(warehouseId ? { warehouseId: warehouseId as string } : {}),
        ...(inventoryType !== 'all' ? { location: { shelf: { zone: zoneTypeFilter } } } : {}),
        ...(ownerId ? { warehouse: { ownerId: ownerId as string } } : {}),
      },
      include: {
        supplierMaterial: true,
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
        materialBatch: true,
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

    const processMaterialStocks = (stocks: any[]) => {
      return stocks.map(s => {
        const zoneType = s.location?.shelf?.zone?.type;
        const isSales = isSalesZoneType(zoneType);
        return {
          ...s,
          type: 'material',
          totalQuantity: s.totalQuantity,
          lockedQuantity: isSales ? s.lockedQuantity : 0,
          availableQuantity: isSales ? s.availableQuantity : 0,
        };
      });
    };

    const result = {
      productStocks: processStocks(productStocks),
      bundleStocks: processBundleStocks(bundleStocks),
      materialStocks: processMaterialStocks(materialStocks),
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get stocks error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /available
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

// GET /owner-stock-summary
router.get('/owner-stock-summary', async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ success: false, message: '缺少主体ID' });
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
        skuBatch: true,
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
        bundleBatch: true,
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
      packaging: string;
      spec: string;
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
          packaging: bs.bundle.packaging || '',
          spec: bs.bundle.spec || '',
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

// GET /bundle
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
        bundleBatch: true,
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
      return {
        ...stock,
        availableQuantity: isSalesZone ? stock.availableQuantity : 0,
        lockedQuantity: isSalesZone ? stock.lockedQuantity : 0,
        locationCode: formatLocationCode(stock.location),
      };
    });

    res.json({ success: true, data: processedStocks });
  } catch (error) {
    console.error('Get bundle stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /bundle/:id
router.get('/bundle/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { warehouseId, ownerId } = req.query;
    const where: any = {
      bundleId: id,
    };
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (ownerId) {
        if (where.warehouse) {
          where.warehouse.ownerId = ownerId as string;
        } else {
          where.warehouse = { ownerId: ownerId as string };
        }
      }

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
        bundleBatch: true,
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
      return {
        ...stock,
        availableQuantity: isSalesZone ? stock.availableQuantity : 0,
        lockedQuantity: isSalesZone ? stock.lockedQuantity : 0,
        locationCode: formatLocationCode(stock.location),
      };
    });

    res.json({ success: true, data: processedStocks });
  } catch (error) {
    console.error('Get bundle stock error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /sku/by-skuId/:skuId - 按SKU ID查询
router.get('/sku/by-skuId/:skuId', async (req: Request, res: Response) => {
  try {
    const { skuId } = req.params;
    const { warehouseId, ownerId } = req.query;
    const where: any = {
      skuId: skuId,
    };
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (ownerId) {
      if (where.warehouse) {
        where.warehouse.ownerId = ownerId as string;
      } else {
        where.warehouse = { ownerId: ownerId as string };
      }
    }

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        sku: {
          include: { product: true }
        },
        warehouse: true,
        skuBatch: true,
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
      return {
        ...stock,
        availableQuantity: isSalesZone ? stock.availableQuantity : 0,
        lockedQuantity: isSalesZone ? stock.lockedQuantity : 0,
        locationCode: formatLocationCode(stock.location),
      };
    });

    res.json({ success: true, data: processedStocks });
  } catch (error) {
    console.error('Get sku stock by skuId error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /batch/list
router.get('/batch/list', async (req: Request, res: Response) => {
  try {
    const { skuId, bundleId, warehouseId, ownerId } = req.query;

    const skuWhere: any = {};
    const bundleWhere: any = {};

    if (skuId) {
      skuWhere.skuId = skuId as string;
    }
    if (bundleId) {
      bundleWhere.bundleId = bundleId as string;
    }

    let warehouseFilter: any = {};
    if (warehouseId) {
      warehouseFilter.warehouseId = warehouseId as string;
    }
    if (ownerId) {
      warehouseFilter.warehouse = { ownerId: ownerId as string };
    }

    if (warehouseId || ownerId) {
      if (ownerId) {
        skuWhere.OR = [
          { stocks: { some: warehouseFilter } },
          { sku: { ownerId: ownerId as string } }
        ];
        bundleWhere.OR = [
          { stocks: { some: warehouseFilter } },
          { bundle: { ownerId: ownerId as string } }
        ];
      } else {
        skuWhere.stocks = { some: warehouseFilter };
        bundleWhere.stocks = { some: warehouseFilter };
      }
    }

    const skuBatches = await prisma.sKUBatch.findMany({
      where: skuWhere,
      include: {
        sku: {
          include: {
            product: true,
          },
        },
        supplier: true,
        stocks: {
          where: warehouseFilter,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const bundleBatches = await prisma.bundleBatch.findMany({
      where: bundleWhere,
      include: {
        bundle: true,
        supplier: true,
        stocks: {
          where: warehouseFilter,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const batchList = [
      ...skuBatches.map((b: any) => ({
        id: b.id,
        batchNo: b.batchNo,
        expiryDate: b.expiryDate,
        productionDate: b.productionDate,
        supplierId: b.supplierId,
        supplierName: b.supplier?.name,
        skuId: b.skuId,
        productName: b.sku?.product?.name,
        spec: b.sku?.spec,
        packaging: b.sku?.packaging,
        type: 'PRODUCT',
        totalQuantity: b.stocks?.reduce((sum: number, s: any) => sum + s.totalQuantity, 0) || 0,
      })),
      ...bundleBatches.map((b: any) => ({
        id: b.id,
        batchNo: b.batchNo,
        expiryDate: b.expiryDate,
        productionDate: b.productionDate,
        supplierId: b.supplierId,
        supplierName: b.supplier?.name,
        bundleId: b.bundleId,
        productName: b.bundle?.name,
        spec: b.bundle?.spec,
        packaging: b.bundle?.packaging,
        type: 'BUNDLE',
        totalQuantity: b.stocks?.reduce((sum: number, s: any) => sum + s.totalQuantity, 0) || 0,
      })),
    ].sort((a, b) => b.batchNo.localeCompare(a.batchNo));

    res.json({ success: true, data: batchList });
  } catch (error) {
    console.error('Batch list error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /batch/:batchNo/trace
router.get('/batch/:batchNo/trace', async (req: Request, res: Response) => {
  try {
    const { batchNo } = req.params;

    const skuBatch = await prisma.sKUBatch.findFirst({
      where: { batchNo },
      include: {
        sku: {
          include: { product: true }
        },
        supplier: true,
      },
    });

    const bundleBatch = await prisma.bundleBatch.findFirst({
      where: { batchNo },
      include: {
        bundle: true,
        supplier: true,
      },
    });

    if (!skuBatch && !bundleBatch) {
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    const isProduct = !!skuBatch;

    // 入库记录
    const stockIns = isProduct
      ? await prisma.stockIn.findMany({
          where: { skuBatchId: skuBatch.id },
          include: {
            warehouse: true,
            location: {
              include: { shelf: { include: { zone: true } } }
            },
            sku: {
              include: { product: true }
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : await prisma.bundleStockIn.findMany({
          where: { bundleBatchId: bundleBatch!.id },
          include: {
            warehouse: true,
            location: {
              include: { shelf: { include: { zone: true } } }
            },
            bundle: true,
          },
          orderBy: { createdAt: 'asc' },
        });

    // 获取入库单号（通过 InboundOrderItem 关联）
    const stockInsAny = stockIns as any[];
    const skuBatchIds = stockInsAny.filter(s => s.skuBatchId).map(s => s.skuBatchId);
    const bundleBatchIds = stockInsAny.filter(s => s.bundleBatchId).map(s => s.bundleBatchId);

    const inboundOrderItems = await prisma.inboundOrderItem.findMany({
      where: isProduct
        ? { skuBatchId: { in: skuBatchIds } }
        : { bundleBatchId: { in: bundleBatchIds } },
      include: {
        inbound: true,
      },
    });

    const inboundOrderMap = new Map<string, string>();
    inboundOrderItems.forEach(item => {
      const key = isProduct ? item.skuBatchId : item.bundleBatchId;
      if (key && item.inbound?.inboundNo) {
        inboundOrderMap.set(key, item.inbound.inboundNo);
      }
    });

    // 当前库位
    const locations = isProduct
      ? await prisma.stock.findMany({
          where: { skuBatchId: skuBatch.id, totalQuantity: { gt: 0 } },
          include: {
            warehouse: true,
            location: {
              include: {
                shelf: {
                  include: { zone: true }
                }
              }
            },
          },
        })
      : await prisma.bundleStock.findMany({
          where: { bundleBatchId: bundleBatch!.id, totalQuantity: { gt: 0 } },
          include: {
            warehouse: true,
            location: {
              include: {
                shelf: {
                  include: { zone: true }
                }
              }
            },
          },
        });

    // 出库记录
    const stockOuts = isProduct
      ? await prisma.stockOut.findMany({
          where: { skuBatchId: skuBatch.id },
          orderBy: { createdAt: 'asc' },
        })
      : await prisma.stockOut.findMany({
          where: { bundleBatchId: bundleBatch!.id },
          orderBy: { createdAt: 'asc' },
        });

    // 获取出库订单信息
    const orderIds = stockOuts.map(s => s.orderId).filter(Boolean);
    const orders = orderIds.length > 0
      ? await prisma.order.findMany({
          where: { id: { in: orderIds } },
          include: { customer: true }
        })
      : [];
    const orderMap = new Map(orders.map(o => [o.id, o]));

    // 获取已退货的订单ID列表
    const returnedOrderIds = orderIds.length > 0
      ? await prisma.returnOrder.findMany({
          where: { orderId: { in: orderIds } },
          select: { orderId: true }
        })
      : [];
    const returnedOrderIdSet = new Set(returnedOrderIds.map(r => r.orderId));

    // 移库记录
    const transferItems = isProduct
      ? await prisma.stockTransferItem.findMany({
          where: { skuBatchId: skuBatch.id },
          include: {
            transfer: true,
            fromLocation: {
              include: {
                shelf: {
                  include: { zone: true }
                }
              }
            },
            toLocation: {
              include: {
                shelf: {
                  include: { zone: true }
                }
              }
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : await prisma.stockTransferItem.findMany({
          where: { bundleBatchId: bundleBatch!.id },
          include: {
            transfer: true,
            fromLocation: {
              include: {
                shelf: {
                  include: { zone: true }
                }
              }
            },
            toLocation: {
              include: {
                shelf: {
                  include: { zone: true }
                }
              }
            },
          },
          orderBy: { createdAt: 'asc' },
        });

    // 退货记录 - 通过 ReturnItem 的 stockOutId 关联
    const stockOutIds = stockOuts.map(s => s.id).filter(Boolean);
    const returns = stockOutIds.length > 0
      ? await prisma.returnItem.findMany({
          where: { stockOutId: { in: stockOutIds } },
          include: { returnOrder: true },
        })
      : [];

    const totalInbound = stockIns.reduce((sum: number, s: any) => sum + s.quantity, 0);
    const totalOutbound = stockOuts.reduce((sum: number, s: any) => sum + s.quantity, 0);
    const totalInWarehouse = locations.reduce((sum: number, l: any) => sum + l.quantity, 0);
    const totalLocked = locations.reduce((sum: number, l: any) => sum + l.lockedQuantity, 0);

    res.json({
      success: true,
      data: {
        batchNo,
        batchInfo: skuBatch ? {
          id: skuBatch.id,
          batchNo: skuBatch.batchNo,
          expiryDate: skuBatch.expiryDate,
          productionDate: skuBatch.productionDate,
          supplierId: skuBatch.supplierId,
          supplierName: skuBatch.supplier?.name,
          productName: skuBatch.sku?.product?.name,
          spec: skuBatch.sku?.spec,
          packaging: skuBatch.sku?.packaging,
          type: 'PRODUCT',
        } : {
          id: bundleBatch?.id,
          batchNo: bundleBatch?.batchNo,
          expiryDate: bundleBatch?.expiryDate,
          productionDate: bundleBatch?.productionDate,
          supplierId: bundleBatch?.supplierId,
          supplierName: bundleBatch?.supplier?.name,
          productName: bundleBatch?.bundle?.name,
          spec: bundleBatch?.bundle?.spec,
          packaging: bundleBatch?.bundle?.packaging,
          type: 'BUNDLE',
        },
        summary: {
          totalInbound,
          totalOutbound,
          totalInWarehouse,
          totalLocked,
          totalReturned: returns.reduce((sum: number, r: any) => sum + r.quantity, 0),
        },
        stockIns: stockIns.map((s: any) => ({
          type: isProduct ? 'PRODUCT' : 'BUNDLE',
          productName: s.sku?.product?.name,
          bundleName: s.bundle?.name,
          spec: s.sku?.spec,
          packaging: s.sku?.packaging,
          inboundNo: inboundOrderMap.get(s.skuBatchId || s.bundleBatchId),
          quantity: s.quantity,
          warehouse: s.warehouse?.name,
          locationCode: formatLocationCode(s.location),
          createdAt: s.createdAt,
        })),
        locations: locations.map((l: any) => ({
          type: 'LOCATION',
          locationCode: formatLocationCode(l.location),
          quantity: l.totalQuantity,
          availableQuantity: l.availableQuantity,
          lockedQuantity: l.lockedQuantity,
          warehouse: l.warehouse?.name,
        })),
        stockOuts: stockOuts.map((s: any) => {
          const order = orderMap.get(s.orderId);
          return {
            type: 'OUTBOUND',
            orderNo: order?.orderNo,
            orderId: s.orderId,
            customer: order?.customer?.name,
            customerPhone: order?.customer?.phone,
            quantity: s.quantity,
            warehouse: s.warehouse?.name,
            createdAt: s.createdAt,
            isReturned: returnedOrderIdSet.has(s.orderId),
          };
        }),
        transfers: transferItems.map((t: any) => ({
          type: 'TRANSFER',
          transferNo: t.transfer?.transferNo,
          fromLocation: formatLocationCode(t.fromLocation),
          toLocation: formatLocationCode(t.toLocation),
          quantity: t.quantity,
          status: t.transfer?.status,
          executedAt: t.executedAt || t.transfer?.createdAt,
        })),
        returns: returns.map((r: any) => ({
          type: 'RETURN',
          returnNo: r.returnOrder?.returnNo,
          quantity: r.quantity,
          createdAt: r.returnOrder?.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Batch trace error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;