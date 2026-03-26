import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

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

const ZONE_TYPE_NAMES: Record<string, string> = {
  RECEIVING: '收货区',
  STORAGE: '存储区',
  PICKING: '拣货区',
  RETURNING: '退货区',
  DAMAGED: '报废区',
};

function validateTransferRule(fromZoneType: string, toZoneType: string): { valid: boolean; message?: string } {
  const salesZones = ['RECEIVING', 'STORAGE', 'PICKING'];

  if (salesZones.includes(fromZoneType) && salesZones.includes(toZoneType)) {
    return { valid: true };
  }

  if (fromZoneType === 'RETURNING' && ['STORAGE', 'PICKING', 'DAMAGED'].includes(toZoneType)) {
    return { valid: true };
  }

  if (fromZoneType === 'DAMAGED') {
    return { valid: false, message: '报废区货物不能再移出' };
  }

  return { valid: false, message: `不允许从${ZONE_TYPE_NAMES[fromZoneType] || fromZoneType}移至${ZONE_TYPE_NAMES[toZoneType] || toZoneType}` };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId, status, startDate, endDate } = req.query;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (status && status !== 'ALL') where.status = status as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        warehouse: true,
        fromZone: true,
        toZone: true,
        items: {
          include: {
            sku: { include: { product: true } },
            bundle: true,
            fromLocation: { include: { shelf: { include: { zone: true } } } },
            toLocation: { include: { shelf: { include: { zone: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: transfers });
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        warehouse: true,
        fromZone: true,
        toZone: true,
        items: {
          include: {
            sku: { include: { product: { include: { brand: true, category: true } } } },
            bundle: { include: { items: { include: { sku: true } } } },
            fromLocation: { include: { shelf: { include: { zone: true } } } },
            toLocation: { include: { shelf: { include: { zone: true } } } },
          },
        },
      },
    });

    if (!transfer) {
      return res.status(404).json({ success: false, message: '移库单不存在' });
    }

    res.json({ success: true, data: transfer });
  } catch (error) {
    console.error('Get transfer error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId, fromZoneId, toZoneId, remark, operator, items } = req.body;

    if (!warehouseId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: '仓库和移库明细不能为空' });
    }

    if (fromZoneId && toZoneId) {
      const fromZone = await prisma.zone.findUnique({ where: { id: fromZoneId } });
      const toZone = await prisma.zone.findUnique({ where: { id: toZoneId } });

      if (!fromZone || !toZone) {
        return res.status(400).json({ success: false, message: '库区不存在' });
      }

      const validation = validateTransferRule(fromZone.type, toZone.type);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
    }

    for (const item of items) {
      if (item.itemType === 'PRODUCT' && item.skuId && item.fromLocationId) {
        const stock = await prisma.stock.findFirst({
          where: {
            skuId: item.skuId,
            warehouseId,
            locationId: item.fromLocationId,
          },
        });

        if (!stock || stock.availableQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `商品库存不足或已被锁定，当前可移库数量：${stock?.availableQuantity || 0}`,
          });
        }
      } else if (item.itemType === 'BUNDLE' && item.bundleId && item.fromLocationId) {
        const bundleStock = await prisma.bundleStock.findFirst({
          where: {
            bundleId: item.bundleId,
            warehouseId,
            locationId: item.fromLocationId,
            batchNo: (item.batchNo || null) as any,
          },
        });

        if (!bundleStock || bundleStock.availableQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `套装库存不足或已被锁定，当前可移库数量：${bundleStock?.availableQuantity || 0}`,
          });
        }
      }
    }

    const transferNo = `TK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          transferNo,
          warehouseId,
          fromZoneId: fromZoneId || null,
          toZoneId: toZoneId || null,
          remark: remark || null,
          operator: operator || null,
          status: 'PENDING',
          type: 'ZONE_TRANSFER',
        },
      });

      for (const item of items) {
        await tx.stockTransferItem.create({
          data: {
            transferId: transfer.id,
            itemType: item.itemType || 'PRODUCT',
            skuId: item.skuId || null,
            bundleId: item.bundleId || null,
            fromLocationId: item.fromLocationId || null,
            toLocationId: item.toLocationId || null,
            quantity: item.quantity,
            batchNo: item.batchNo || null,
          },
        });
      }

      return transfer;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!transfer) {
      return res.status(404).json({ success: false, message: '移库单不存在' });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: '只能执行待移库的单据' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.stockTransfer.update({
        where: { id },
        data: { status: 'IN_TRANSIT' },
      });

      for (const item of transfer.items) {
        if (item.itemType === 'PRODUCT' && item.skuId) {
          const fromStock = await tx.stock.findFirst({
            where: {
              skuId: item.skuId,
              warehouseId: transfer.warehouseId,
              locationId: item.fromLocationId || null,
              batchNo: item.batchNo || null,
            },
          });

          if (!fromStock || fromStock.availableQuantity < item.quantity) {
            const available = fromStock?.availableQuantity || 0;
            throw new Error(`商品库存不足: ${item.skuId} 在 ${item.fromLocationId} 可用库存 ${available}，需要移出 ${item.quantity}`);
          }

          const newTotal = fromStock.totalQuantity - item.quantity;
          const newAvailable = fromStock.availableQuantity - item.quantity;
          if (newTotal <= 0) {
            await tx.stock.delete({ where: { id: fromStock.id } });
            if (item.fromLocationId) {
              await cleanupEmptyStockLocations(tx, item.fromLocationId);
            }
          } else {
            await tx.stock.update({
              where: { id: fromStock.id },
              data: {
                totalQuantity: newTotal,
                availableQuantity: newAvailable,
              },
            });
          }

          let toStock = await tx.stock.findFirst({
            where: {
              skuId: item.skuId,
              warehouseId: transfer.warehouseId,
              locationId: item.toLocationId || null,
              batchNo: item.batchNo || null,
            },
          });

          if (toStock) {
            await tx.stock.update({
              where: { id: toStock.id },
              data: {
                totalQuantity: { increment: item.quantity },
                availableQuantity: { increment: item.quantity },
              },
            });
          } else {
            await tx.stock.create({
              data: {
                skuId: item.skuId,
                warehouseId: transfer.warehouseId,
                locationId: item.toLocationId || null,
                batchNo: item.batchNo || null,
                totalQuantity: item.quantity,
                availableQuantity: item.quantity,
              },
            });
          }
        } else if (item.itemType === 'BUNDLE' && item.bundleId) {
          const fromBundleStock = await tx.bundleStock.findFirst({
            where: {
              bundleId: item.bundleId,
              warehouseId: transfer.warehouseId,
              locationId: item.fromLocationId || null,
              batchNo: item.batchNo || null,
            },
          });

          if (!fromBundleStock || fromBundleStock.availableQuantity < item.quantity) {
            const available = fromBundleStock?.availableQuantity || 0;
            throw new Error(`套装库存不足: ${item.bundleId} 在 ${item.fromLocationId} 可用库存 ${available}，需要移出 ${item.quantity}`);
          }

          if (fromBundleStock) {
            const newTotal = fromBundleStock.totalQuantity - item.quantity;
            const newAvailable = fromBundleStock.availableQuantity - item.quantity;
            if (newTotal <= 0) {
              await tx.bundleStock.delete({ where: { id: fromBundleStock.id } });
              if (item.fromLocationId) {
                await cleanupEmptyBundleStockLocations(tx, item.fromLocationId);
              }
            } else {
              await tx.bundleStock.update({
                where: { id: fromBundleStock.id },
                data: {
                  totalQuantity: newTotal,
                  availableQuantity: newAvailable,
                },
              });
            }
          }

          let toBundleStock = await tx.bundleStock.findFirst({
            where: {
              bundleId: item.bundleId,
              warehouseId: transfer.warehouseId,
              locationId: item.toLocationId || null,
              batchNo: item.batchNo || null,
            },
          });

          if (toBundleStock) {
            await tx.bundleStock.update({
              where: { id: toBundleStock.id },
              data: {
                totalQuantity: { increment: item.quantity },
                availableQuantity: { increment: item.quantity },
              },
            });
          } else {
            await tx.bundleStock.create({
              data: {
                bundleId: item.bundleId,
                warehouseId: transfer.warehouseId,
                locationId: item.toLocationId || null,
                batchNo: item.batchNo || null,
                totalQuantity: item.quantity,
                availableQuantity: item.quantity,
              },
            });
          }
        }
      }

      const updatedTransfer = await tx.stockTransfer.update({
        where: { id },
        data: { status: 'COMPLETED', executedAt: new Date() },
      });

      return updatedTransfer;
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Execute transfer error:', error);
    if (error.message.includes('库存不足')) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: error.message || '服务器错误' });
    }
  }
});

router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      return res.status(404).json({ success: false, message: '移库单不存在' });
    }

    if (transfer.status !== 'PENDING' && transfer.status !== 'IN_TRANSIT') {
      return res.status(400).json({ success: false, message: '当前状态不允许取消' });
    }

    if (transfer.status === 'IN_TRANSIT') {
      await prisma.$transaction(async (tx) => {
        const transferWithItems = await tx.stockTransfer.findUnique({
          where: { id },
          include: { items: true },
        });

        for (const item of transferWithItems!.items) {
          if (item.itemType === 'PRODUCT' && item.skuId) {
            const toStock = await tx.stock.findFirst({
              where: {
                skuId: item.skuId,
                warehouseId: transfer.warehouseId,
                locationId: item.toLocationId || null,
              },
            });

            if (toStock) {
              await tx.stock.update({
                where: { id: toStock.id },
                data: {
                  totalQuantity: { decrement: item.quantity },
                  availableQuantity: { decrement: item.quantity },
                },
              });
            }

            const fromStock = await tx.stock.findFirst({
              where: {
                skuId: item.skuId,
                warehouseId: transfer.warehouseId,
                locationId: item.fromLocationId || null,
              },
            });

            if (fromStock) {
              await tx.stock.update({
                where: { id: fromStock.id },
                data: {
                  totalQuantity: { increment: item.quantity },
                  availableQuantity: { increment: item.quantity },
                },
              });
            } else {
              await tx.stock.create({
                data: {
                  skuId: item.skuId,
                  warehouseId: transfer.warehouseId,
                  locationId: item.fromLocationId || null,
                  totalQuantity: item.quantity,
                  availableQuantity: item.quantity,
                  lockedQuantity: 0,
                },
              });
            }
          } else if (item.itemType === 'BUNDLE' && item.bundleId) {
            const toBundleStock = await tx.bundleStock.findFirst({
              where: {
                bundleId: item.bundleId,
                warehouseId: transfer.warehouseId,
                locationId: item.toLocationId || null,
              },
            });

            if (toBundleStock) {
              await tx.bundleStock.update({
                where: { id: toBundleStock.id },
                data: {
                  totalQuantity: { decrement: item.quantity },
                  availableQuantity: { decrement: item.quantity },
                },
              });
            }

            const fromBundleStock = await tx.bundleStock.findFirst({
              where: {
                bundleId: item.bundleId,
                warehouseId: transfer.warehouseId,
                locationId: item.fromLocationId || null,
              },
            });

            if (fromBundleStock) {
              await tx.bundleStock.update({
                where: { id: fromBundleStock.id },
                data: {
                  totalQuantity: { increment: item.quantity },
                  availableQuantity: { increment: item.quantity },
                },
              });
            } else {
              await tx.bundleStock.create({
                data: {
                  bundleId: item.bundleId,
                  warehouseId: transfer.warehouseId,
                  locationId: item.fromLocationId || null,
                  totalQuantity: item.quantity,
                  availableQuantity: item.quantity,
                  lockedQuantity: 0,
                },
              });
            }
          }
        }

        await tx.stockTransfer.update({
          where: { id },
          data: { status: 'CANCELLED', remark: reason || '用户取消' },
        });
      });
    } else {
      await prisma.stockTransfer.update({
        where: { id },
        data: { status: 'CANCELLED', remark: reason || '用户取消' },
      });
    }

    res.json({ success: true, message: '移库单已取消' });
  } catch (error) {
    console.error('Cancel transfer error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/zone-stocks/:warehouseId', async (req: Request, res: Response) => {
  try {
    const { warehouseId } = req.params;
    const { zoneType } = req.query;

    const where: any = { warehouseId };
    if (zoneType) {
      where.location = {
        shelf: {
          zone: {
            type: zoneType as string,
          },
        },
      };
    }

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        sku: { include: { product: true } },
        location: { include: { shelf: { include: { zone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const bundleStocks = await prisma.bundleStock.findMany({
      where,
      include: {
        bundle: true,
        location: { include: { shelf: { include: { zone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        productStocks: stocks.map(s => ({ ...s, type: 'product' })),
        bundleStocks: bundleStocks.map(b => ({ ...b, type: 'bundle' })),
      },
    });
  } catch (error) {
    console.error('Get zone stocks error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;