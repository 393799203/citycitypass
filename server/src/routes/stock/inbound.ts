import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { findOrCreateSkuBatch, findOrCreateBundleBatch, findOrCreateMaterialBatch } from '../../utils/stockHelpers';

const router = Router();

// GET /stock-in
router.get('/stock-in', async (req: Request, res: Response) => {
  try {
    const { warehouseId, skuId, ownerId } = req.query;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (skuId) where.skuId = skuId as string;
    if (ownerId) {
      if (where.warehouse) {
        where.warehouse.ownerId = ownerId as string;
      } else {
        where.warehouse = { ownerId: ownerId as string };
      }
    }

    const stockIns = await prisma.stockIn.findMany({
      where,
      include: {
        sku: {
          include: { product: true }
        },
        skuBatch: true,
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

    const bundleWhere: any = warehouseId ? { warehouseId: warehouseId as string } : {};
    if (ownerId) {
      if (bundleWhere.warehouse) {
        bundleWhere.warehouse.ownerId = ownerId as string;
      } else {
        bundleWhere.warehouse = { ownerId: ownerId as string };
      }
    }

    const bundleStockIns = await prisma.bundleStockIn.findMany({
      where: bundleWhere,
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
        bundleBatch: true,
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

// POST /inbound-order
router.post('/inbound-order', async (req: Request, res: Response) => {
  try {
    const { warehouseId, source, remark, items, returnOrderId, purchaseOrderId } = req.body;

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
          source: source || 'PURCHASE',
          remark: remark || null,
          status: source === 'RETURN' ? 'RECEIVED' : 'PENDING',
          purchaseOrderId: purchaseOrderId || null,
        },
      });

      // 如果有关联采购单，获取供应商ID
      let purchaseOrderSupplierId = null;
      if (purchaseOrderId) {
        const purchaseOrder = await tx.purchaseOrder.findUnique({
          where: { id: purchaseOrderId },
          select: { supplierId: true },
        });
        purchaseOrderSupplierId = purchaseOrder?.supplierId || null;
      }

      await tx.inboundOrderItem.createMany({
        data: items.map((item: any) => ({
          inboundId: inboundOrder.id,
          type: item.type,
          skuId: item.skuId || null,
          bundleId: item.bundleId || null,
          supplierMaterialId: item.supplierMaterialId || null,
          supplierId: purchaseOrderSupplierId,
          locationId: item.locationId || undefined,
          quantity: item.quantity,
          expectedQuantity: item.quantity,
          skuBatchId: item.skuBatchId || undefined,
          bundleBatchId: item.bundleBatchId || undefined,
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

// GET /inbound-orders
router.get('/inbound-orders', async (req: Request, res: Response) => {
  try {
    const { warehouseId, status, ownerId } = req.query;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId as string;
    if (status) where.status = status as string;
    if (ownerId) where.warehouse = { ownerId: ownerId as string };

    const orders = await prisma.inboundOrder.findMany({
      where,
      include: {
        warehouse: { include: { owner: true } },
        purchaseOrder: { select: { id: true, orderNo: true } },
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
            skuBatch: true,
            bundleBatch: true,
            materialBatch: true,
            supplier: true,
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
                include: { items: { include: { sku: { include: { product: true } } } } },
              });
              return { ...item, bundle };
            } else if ((itemType === 'MATERIAL' || itemType === 'OTHER') && item.supplierMaterialId) {
              const supplierMaterial = await prisma.supplierMaterial.findUnique({
                where: { id: item.supplierMaterialId },
              });
              return { ...item, supplierMaterial };
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

// PUT /inbound-order/:id
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
        if (item.arrivalQuantity !== undefined) updateItemData.expectedQuantity = item.arrivalQuantity;
        if (item.receivedQuantity !== undefined) updateItemData.receivedQuantity = item.receivedQuantity;
        if (item.inspectionResult !== undefined) updateItemData.inspectionResult = item.inspectionResult;
        if (item.inspectionNote !== undefined) updateItemData.inspectionNote = item.inspectionNote;
        if (item.locationId !== undefined) updateItemData.locationId = item.locationId;
        if (item.targetLocationId !== undefined) updateItemData.locationId = item.targetLocationId;

        if (item.batchNo && item.type === 'PRODUCT' && item.skuId) {
          const skuBatch = await findOrCreateSkuBatch(prisma, {
            skuId: item.skuId,
            batchNo: item.batchNo,
            expiryDate: item.expiryDate,
            supplierId: item.supplierId || undefined,
          });
          updateItemData.skuBatchId = skuBatch.id;
        } else if (item.batchNo && item.type === 'BUNDLE' && item.bundleId) {
          const bundleBatch = await findOrCreateBundleBatch(prisma, {
            bundleId: item.bundleId,
            batchNo: item.batchNo,
            expiryDate: item.expiryDate,
            supplierId: item.supplierId || undefined,
          });
          updateItemData.bundleBatchId = bundleBatch.id;
        } else if (item.batchNo && (item.type === 'MATERIAL' || item.type === 'OTHER') && item.supplierMaterialId) {
          const materialBatch = await findOrCreateMaterialBatch(prisma, {
            supplierMaterialId: item.supplierMaterialId,
            batchNo: item.batchNo,
            expiryDate: item.expiryDate,
            supplierId: item.supplierId || undefined,
          });
          updateItemData.materialBatchId = materialBatch.id;
        }

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
              const quantity = item.receivedQuantity !== null && item.receivedQuantity !== undefined
                ? item.receivedQuantity
                : (item.expectedQuantity || 0);

              let skuBatchId = item.skuBatchId;
              if (!skuBatchId) {
                const defaultBatch = await tx.sKUBatch.findFirst({
                  where: { skuId: item.skuId, batchNo: '' }
                });
                if (defaultBatch) {
                  skuBatchId = defaultBatch.id;
                } else {
                  const newBatch = await tx.sKUBatch.create({
                    data: { skuId: item.skuId, batchNo: '' }
                  });
                  skuBatchId = newBatch.id;
                }
              }

              let stock = await tx.stock.findFirst({
                where: {
                  skuId: item.skuId,
                  warehouseId: orderWithItems.warehouseId,
                  locationId: item.locationId || undefined,
                  skuBatchId,
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
                    warehouseId: orderWithItems.warehouseId,
                    locationId: item.locationId || undefined,
                    skuBatchId,
                    totalQuantity: quantity,
                    availableQuantity: quantity,
                  },
                });
              }

              await tx.stockIn.create({
                data: {
                  skuId: item.skuId,
                  warehouseId: orderWithItems.warehouseId,
                  locationId: item.locationId || undefined,
                  skuBatchId,
                  quantity,
                  status: 'COMPLETED',
                },
              });
            } else if (item.type === 'BUNDLE' && item.bundleId && item.locationId) {
              const quantity = item.receivedQuantity !== null && item.receivedQuantity !== undefined
                ? item.receivedQuantity
                : (item.expectedQuantity || 0);

              let bundleBatchId = item.bundleBatchId;
              if (!bundleBatchId) {
                const defaultBatch = await tx.bundleBatch.findFirst({
                  where: { bundleId: item.bundleId, batchNo: '' }
                });
                if (defaultBatch) {
                  bundleBatchId = defaultBatch.id;
                } else {
                  const newBatch = await tx.bundleBatch.create({
                    data: { bundleId: item.bundleId, batchNo: '' }
                  });
                  bundleBatchId = newBatch.id;
                }
              }

              let bundleStock = await tx.bundleStock.findFirst({
                where: {
                  bundleId: item.bundleId,
                  warehouseId: orderWithItems.warehouseId,
                  locationId: item.locationId || undefined,
                  bundleBatchId,
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
                    warehouseId: orderWithItems.warehouseId,
                    locationId: item.locationId || undefined,
                    bundleBatchId,
                    totalQuantity: quantity,
                    availableQuantity: quantity,
                  },
                });
              }

              await tx.bundleStockIn.create({
                data: {
                  bundleId: item.bundleId,
                  warehouseId: orderWithItems.warehouseId,
                  locationId: item.locationId || undefined,
                  bundleBatchId,
                  quantity,
                  status: 'COMPLETED',
                },
              });
            } else if ((item.type === 'MATERIAL' || item.type === 'OTHER') && item.supplierMaterialId && item.locationId) {
              const quantity = item.receivedQuantity !== null && item.receivedQuantity !== undefined
                ? item.receivedQuantity
                : (item.expectedQuantity || 0);

              let materialBatchId = item.materialBatchId;
              if (!materialBatchId) {
                const defaultBatch = await tx.materialBatch.findFirst({
                  where: { supplierMaterialId: item.supplierMaterialId, batchNo: '' }
                });
                if (defaultBatch) {
                  materialBatchId = defaultBatch.id;
                } else {
                  const newBatch = await tx.materialBatch.create({
                    data: { supplierMaterialId: item.supplierMaterialId, batchNo: '' }
                  });
                  materialBatchId = newBatch.id;
                }
              }

              let materialStock = await tx.materialStock.findFirst({
                where: {
                  supplierMaterialId: item.supplierMaterialId,
                  warehouseId: orderWithItems.warehouseId,
                  locationId: item.locationId || undefined,
                  materialBatchId,
                },
              });

              if (materialStock) {
                await tx.materialStock.update({
                  where: { id: materialStock.id },
                  data: {
                    totalQuantity: { increment: quantity },
                    availableQuantity: { increment: quantity },
                  },
                });
              } else {
                await tx.materialStock.create({
                  data: {
                    supplierMaterialId: item.supplierMaterialId,
                    warehouseId: orderWithItems.warehouseId,
                    locationId: item.locationId || undefined,
                    materialBatchId,
                    totalQuantity: quantity,
                    availableQuantity: quantity,
                  },
                });
              }
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
        purchaseOrder: true,
      },
    });

    if (arrivedAt && updated.purchaseOrderId && updated.purchaseOrder) {
      await prisma.purchaseOrder.update({
        where: { id: updated.purchaseOrderId },
        data: { status: 'ARRIVED' },
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update inbound order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// PUT /inbound-order/:id/cancel
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

// PUT /inbound-order/:id/execute
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
          const batchId = item.skuBatchId || '';
          let stock = await tx.stock.findFirst({
            where: {
              skuId: item.skuId,
              warehouseId: order.warehouseId,
              locationId: item.locationId || undefined,
              skuBatchId: batchId || undefined,
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
                skuBatchId: item.skuBatchId || '',
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
              skuBatchId: item.skuBatchId || '',
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
              bundleBatchId: item.bundleBatchId || '',
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
                bundleBatchId: item.bundleBatchId || '',
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
              bundleBatchId: item.bundleBatchId || '',
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

export default router;