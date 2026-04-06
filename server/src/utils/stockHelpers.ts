import { formatLocationCode } from './helpers';

export { formatLocationCode };

export type ItemType = 'PRODUCT' | 'BUNDLE';

export interface StockQueryOptions {
  warehouseId?: string;
  zoneType?: string;
  skuId?: string;
  bundleId?: string;
  locationId?: string;
  includeRelations?: boolean;
}

export async function findOrCreateSkuBatch(
  tx: any,
  data: {
    skuId: string;
    batchNo: string;
    expiryDate?: string;
    productionDate?: string;
    supplierId?: string;
  }
) {
  let batch = await tx.sKUBatch.findFirst({
    where: { skuId: data.skuId, batchNo: data.batchNo },
  });

  if (!batch) {
    batch = await tx.sKUBatch.create({
      data: {
        skuId: data.skuId,
        batchNo: data.batchNo,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        productionDate: data.productionDate ? new Date(data.productionDate) : null,
        supplierId: data.supplierId,
      },
    });
  }

  return batch;
}

export async function findOrCreateBundleBatch(
  tx: any,
  data: {
    bundleId: string;
    batchNo: string;
    expiryDate?: string;
    productionDate?: string;
    supplierId?: string;
  }
) {
  let batch = await tx.bundleBatch.findFirst({
    where: { bundleId: data.bundleId, batchNo: data.batchNo },
  });

  if (!batch) {
    batch = await tx.bundleBatch.create({
      data: {
        bundleId: data.bundleId,
        batchNo: data.batchNo,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        productionDate: data.productionDate ? new Date(data.productionDate) : null,
        supplierId: data.supplierId,
      },
    });
  }

  return batch;
}

export async function findOrCreateMaterialBatch(
  tx: any,
  data: {
    supplierMaterialId: string;
    batchNo: string;
    expiryDate?: string;
    productionDate?: string;
    supplierId?: string;
  }
) {
  let batch = await tx.materialBatch.findFirst({
    where: { supplierMaterialId: data.supplierMaterialId, batchNo: data.batchNo },
  });

  if (!batch) {
    batch = await tx.materialBatch.create({
      data: {
        supplierMaterialId: data.supplierMaterialId,
        batchNo: data.batchNo,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        productionDate: data.productionDate ? new Date(data.productionDate) : null,
        supplierId: data.supplierId,
      },
    });
  }

  return batch;
}

export async function findOrCreateStock(
  tx: any,
  data: {
    type: ItemType;
    skuId?: string;
    bundleId?: string;
    warehouseId: string;
    locationId: string;
  }
) {
  const where = data.type === 'PRODUCT'
    ? { skuId: data.skuId, warehouseId: data.warehouseId, locationId: data.locationId }
    : { bundleId: data.bundleId, warehouseId: data.warehouseId, locationId: data.locationId };

  let stock = await tx.stock.findFirst({ where });

  if (!stock) {
    stock = await tx.stock.create({
      data: {
        ...where,
        totalQuantity: 0,
        availableQuantity: 0,
        lockedQuantity: 0,
      },
    });
  }

  return stock;
}

export async function updateStockQuantity(
  tx: any,
  stockId: string,
  data: {
    totalQuantity?: number;
    availableQuantity?: number;
    lockedQuantity?: number;
  }
) {
  return tx.stock.update({
    where: { id: stockId },
    data: {
      ...(data.totalQuantity !== undefined && { totalQuantity: data.totalQuantity }),
      ...(data.availableQuantity !== undefined && { availableQuantity: data.availableQuantity }),
      ...(data.lockedQuantity !== undefined && { lockedQuantity: data.lockedQuantity }),
    },
  });
}

export async function lockStock(
  tx: any,
  data: {
    type: ItemType;
    skuId?: string;
    bundleId?: string;
    warehouseId: string;
    locationId: string;
    quantity: number;
  }
) {
  const stock = await findOrCreateStock(tx, {
    type: data.type,
    skuId: data.skuId,
    bundleId: data.bundleId,
    warehouseId: data.warehouseId,
    locationId: data.locationId,
  });

  if (stock.availableQuantity < data.quantity) {
    throw new Error('库存不足');
  }

  return tx.stock.update({
    where: { id: stock.id },
    data: {
      availableQuantity: stock.availableQuantity - data.quantity,
      lockedQuantity: stock.lockedQuantity + data.quantity,
    },
  });
}

export async function unlockStock(
  tx: any,
  data: {
    type: ItemType;
    skuId?: string;
    bundleId?: string;
    warehouseId: string;
    locationId: string;
    quantity: number;
  }
) {
  const stock = await findOrCreateStock(tx, {
    type: data.type,
    skuId: data.skuId,
    bundleId: data.bundleId,
    warehouseId: data.warehouseId,
    locationId: data.locationId,
  });

  if (stock.lockedQuantity < data.quantity) {
    throw new Error('锁定库存不足');
  }

  return tx.stock.update({
    where: { id: stock.id },
    data: {
      totalQuantity: stock.totalQuantity + data.quantity,
      availableQuantity: stock.availableQuantity + data.quantity,
      lockedQuantity: stock.lockedQuantity - data.quantity,
    },
  });
}

export async function useStock(
  tx: any,
  data: {
    type: ItemType;
    skuId?: string;
    bundleId?: string;
    warehouseId: string;
    locationId: string;
    quantity: number;
  }
) {
  const stock = await findOrCreateStock(tx, {
    type: data.type,
    skuId: data.skuId,
    bundleId: data.bundleId,
    warehouseId: data.warehouseId,
    locationId: data.locationId,
  });

  if (stock.lockedQuantity < data.quantity) {
    throw new Error('锁定库存不足');
  }

  return tx.stock.update({
    where: { id: stock.id },
    data: {
      totalQuantity: stock.totalQuantity - data.quantity,
      lockedQuantity: stock.lockedQuantity - data.quantity,
    },
  });
}

export async function consumeStock(
  tx: any,
  data: {
    type: ItemType;
    orderId: string;
    skuId?: string;
    bundleId?: string;
    warehouseId: string;
    locationId?: string | null;
    skuBatchId?: string | null;
    bundleBatchId?: string | null;
    quantity: number;
  }
) {
  const where = data.type === 'PRODUCT'
    ? { skuId: data.skuId, warehouseId: data.warehouseId, locationId: data.locationId || undefined, skuBatchId: data.skuBatchId || undefined }
    : { bundleId: data.bundleId, warehouseId: data.warehouseId, locationId: data.locationId || undefined, bundleBatchId: data.bundleBatchId || undefined };

  const stock = await tx.stock.findFirst({ where });
  if (!stock) throw new Error('库存不存在');

  await tx.stock.update({
    where: { id: stock.id },
    data: {
      totalQuantity: stock.totalQuantity - data.quantity,
      lockedQuantity: stock.lockedQuantity - data.quantity,
    },
  });

  return tx.stockOut.create({
    data: {
      orderId: data.orderId,
      skuId: data.skuId || null,
      bundleId: data.bundleId || null,
      warehouseId: data.warehouseId,
      locationId: data.locationId || null,
      skuBatchId: data.skuBatchId || null,
      bundleBatchId: data.bundleBatchId || null,
      quantity: data.quantity,
    },
  });
}

export function formatStockLocation(location: any): string {
  if (!location) return '-';
  return formatLocationCode(location);
}

export function formatBatchResponse(batch: any, type: ItemType) {
  return {
    id: batch.id,
    batchNo: batch.batchNo,
    expiryDate: batch.expiryDate,
    productionDate: batch.productionDate,
    supplierId: batch.supplierId,
    type,
  };
}

export function formatStockSummary(stocks: any[]) {
  return stocks.reduce(
    (acc, stock) => ({
      totalQuantity: acc.totalQuantity + stock.totalQuantity,
      availableQuantity: acc.availableQuantity + stock.availableQuantity,
      lockedQuantity: acc.lockedQuantity + stock.lockedQuantity,
    }),
    { totalQuantity: 0, availableQuantity: 0, lockedQuantity: 0 }
  );
}
