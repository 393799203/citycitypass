import prisma from '../lib/prisma';
import { formatLocationCode } from '../utils/helpers';

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: {
        [key: string]: any;
      };
      required: string[];
    };
  };
}

export const inventoryTools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'match_sku',
      description: '根据商品名称、规格、包装匹配SKU。返回skuId、productName、spec、packaging。如果匹配到多个，返回options数组让用户选择。',
      parameters: {
        type: 'object',
        properties: {
          productName: {
            type: 'string',
            description: '商品名称（必填）',
          },
          spec: {
            type: 'string',
            description: '规格，如"500ml"（可选）',
          },
          packaging: {
            type: 'string',
            description: '包装，如"箱(6瓶)"（可选）',
          },
        },
        required: ['productName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'match_supplier',
      description: '根据供应商名称匹配供应商。返回supplierId和supplierName。',
      parameters: {
        type: 'object',
        properties: {
          supplierName: {
            type: 'string',
            description: '供应商名称（必填）',
          },
        },
        required: ['supplierName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'match_warehouse',
      description: '根据仓库名称匹配仓库。返回warehouseId和warehouseName。',
      parameters: {
        type: 'object',
        properties: {
          warehouseName: {
            type: 'string',
            description: '仓库名称（必填）',
          },
        },
        required: ['warehouseName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_inventory',
      description: '查询商品或套装的库存。只需要输入商品名称（必填）、规格（可选，如500ml）、包装（可选，如箱(6瓶)），系统会自动查找对应的SKU或套装，然后返回库存信息。',
      parameters: {
        type: 'object',
        properties: {
          productName: {
            type: 'string',
            description: '商品名称或套装修名称（必填）',
          },
          spec: {
            type: 'string',
            description: '规格，如"500ml"、"1L"（可选）',
          },
          packaging: {
            type: 'string',
            description: '包装，如"箱(6瓶)"、"瓶装"（可选）',
          },
        },
        required: ['productName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_batch_trace',
      description: '追溯批次的完整流转记录，包括入库、出库、移库、退货等信息。',
      parameters: {
        type: 'object',
        properties: {
          batchNo: { type: 'string', description: '批次号' },
        },
        required: ['batchNo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_owner_stock_summary',
      description: '查询主体的库存汇总，按SKU和批次分组统计库存。',
      parameters: {
        type: 'object',
        properties: {
          ownerId: { type: 'string', description: '主体ID' },
        },
        required: ['ownerId'],
      },
    },
  },
];

export async function executeTool(toolName: string, args: any): Promise<any> {
  console.log(`[Tool] Executing ${toolName} with args:`, args);

  try {
    switch (toolName) {
      case 'match_sku':
        return await matchSkuOrBundle(args);
      case 'match_supplier':
        return await matchSupplier(args);
      case 'match_warehouse':
        return await matchWarehouse(args);
      case 'query_inventory':
        return await queryInventory(args);
      case 'query_batch_trace':
        return await queryBatchTrace(args);
      case 'query_owner_stock_summary':
        return await queryOwnerStockSummary(args);
      default:
        return { success: false, message: `Unknown tool: ${toolName}` };
    }
  } catch (error: unknown) {
    console.error(`[Tool] Error executing ${toolName}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Tool execution error: ${errorMessage}` };
  }
}

async function searchSku(args: { productName: string; spec?: string; packaging?: string; ownerId?: string }) {
  const { productName, spec, packaging, ownerId } = args;

  const where: any = {
    sku: {
      product: {
        name: { contains: productName }
      }
    }
  };

  if (ownerId) {
    where.warehouse = { ownerId };
  }

  if (spec) {
    where.sku = { ...where.sku, spec: { contains: spec } };
  }

  const stocks = await prisma.stock.findMany({
    where,
    include: {
      sku: { include: { product: true } },
      warehouse: true,
      location: { include: { shelf: { include: { zone: true } } } },
    },
    take: 20,
  });

  const skuMap = new Map<string, any>();
  for (const s of stocks) {
    const isSalesZone = ['STORAGE', 'PICKING'].includes(s.location?.shelf?.zone?.type || '');
    if (!isSalesZone) continue;

    if (packaging) {
      const stockPackaging = (s.sku.packaging || '').toLowerCase().trim();
      const searchPackaging = packaging.toLowerCase().trim();
      const isMatch = stockPackaging === searchPackaging ||
        stockPackaging.startsWith(searchPackaging + '(') ||
        searchPackaging.startsWith(stockPackaging + '(');
      if (!isMatch) {
        continue;
      }
    }

    if (!skuMap.has(s.skuId)) {
      skuMap.set(s.skuId, {
        skuId: s.skuId,
        productName: s.sku.product?.name,
        spec: s.sku.spec,
        packaging: s.sku.packaging,
        availableQuantity: 0,
        warehouseCount: 0,
      });
    }
    skuMap.get(s.skuId).availableQuantity += s.availableQuantity;
    skuMap.get(s.skuId).warehouseCount += 1;
  }

  return {
    success: true,
    data: {
      items: Array.from(skuMap.values()),
      total: Array.from(skuMap.values()).length,
    },
  };
}

async function searchBundle(args: { bundleName?: string; ownerId?: string }) {
  const { bundleName, ownerId } = args;

  const where: any = {};
  if (bundleName) {
    where.bundle = { name: { contains: bundleName } };
  }
  if (ownerId) {
    where.warehouse = { ownerId };
  }

  const bundleStocks = await prisma.bundleStock.findMany({
    where,
    include: {
      bundle: { include: { items: { include: { sku: { include: { product: true } } } } } },
      warehouse: true,
    },
    take: 20,
  });

  const bundleMap = new Map<string, any>();
  for (const bs of bundleStocks) {
    if (!bundleMap.has(bs.bundleId)) {
      bundleMap.set(bs.bundleId, {
        bundleId: bs.bundleId,
        bundleName: bs.bundle?.name || '',
        availableQuantity: 0,
      });
    }
    bundleMap.get(bs.bundleId).availableQuantity += bs.availableQuantity;
  }

  return {
    success: true,
    data: {
      items: Array.from(bundleMap.values()),
      total: Array.from(bundleMap.values()).length,
    },
  };
}

async function querySkuInventoryInternal(skuId: string, ownerId?: string) {
  const where: any = {};
  if (ownerId) where.warehouse = { ownerId };
  if (skuId) where.skuId = skuId;

  const stocks = await prisma.stock.findMany({
    where,
    include: {
      sku: { include: { product: true } },
      warehouse: true,
      location: { include: { shelf: { include: { zone: true } } } },
      skuBatch: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const processedStocks = stocks.map(s => {
    const isSalesZone = ['STORAGE', 'PICKING'].includes(s.location?.shelf?.zone?.type || '');
    return {
      skuId: s.skuId,
      productName: s.sku.product?.name,
      spec: s.sku.spec,
      packaging: s.sku.packaging,
      warehouseName: s.warehouse?.name,
      locationCode: formatLocationCode(s.location),
      batchNo: s.skuBatch?.batchNo,
      totalQuantity: s.totalQuantity,
      availableQuantity: isSalesZone ? s.availableQuantity : 0,
      lockedQuantity: isSalesZone ? s.lockedQuantity : 0,
    };
  });

  const totalAvailable = processedStocks.reduce((sum, s) => sum + s.availableQuantity, 0);
  const totalLocked = processedStocks.reduce((sum, s) => sum + s.lockedQuantity, 0);
  const totalQuantity = processedStocks.reduce((sum, s) => sum + s.totalQuantity, 0);

  return {
    success: true,
    data: {
      summary: { totalQuantity, availableQuantity: totalAvailable, lockedQuantity: totalLocked },
      details: processedStocks,
    },
  };
}

async function queryBundleInventoryInternal(bundleId: string, ownerId?: string) {
  const where: any = {};
  if (ownerId) where.warehouse = { ownerId };
  if (bundleId) where.bundleId = bundleId;

  const bundleStocks = await prisma.bundleStock.findMany({
    where,
    include: {
      bundle: { include: { items: { include: { sku: { include: { product: true } } } } } },
      warehouse: true,
      location: { include: { shelf: { include: { zone: true } } } },
      bundleBatch: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const processedStocks = bundleStocks.map(s => {
    const isSalesZone = ['STORAGE', 'PICKING'].includes(s.location?.shelf?.zone?.type || '');
    return {
      bundleId: s.bundleId,
      bundleName: s.bundle?.name || '',
      warehouseName: s.warehouse?.name,
      locationCode: formatLocationCode(s.location),
      batchNo: s.bundleBatch?.batchNo,
      totalQuantity: s.totalQuantity,
      availableQuantity: isSalesZone ? s.availableQuantity : 0,
      lockedQuantity: isSalesZone ? s.lockedQuantity : 0,
    };
  });

  const totalAvailable = processedStocks.reduce((sum, s) => sum + s.availableQuantity, 0);
  const totalLocked = processedStocks.reduce((sum, s) => sum + s.lockedQuantity, 0);
  const totalQuantity = processedStocks.reduce((sum, s) => sum + s.totalQuantity, 0);

  return {
    success: true,
    data: {
      summary: { totalQuantity, availableQuantity: totalAvailable, lockedQuantity: totalLocked },
      details: processedStocks,
    },
  };
}

async function matchSkuOrBundle(args: { productName: string; spec?: string; packaging?: string; ownerId?: string }) {
  const { productName, spec, packaging, ownerId } = args;

  const searchResult = await searchSku({ productName, spec, packaging, ownerId });

  if (!searchResult.success || searchResult.data.items.length === 0) {
    const bundleResult = await searchBundle({ bundleName: productName, ownerId });
    if (bundleResult.success && bundleResult.data.items.length > 0) {
      return {
        success: true,
        type: 'bundle',
        bundleId: bundleResult.data.items[0].bundleId,
        bundleName: bundleResult.data.items[0].bundleName,
      };
    }
    return { success: false, message: `未找到商品或套装"${productName}"` };
  }

  const items = searchResult.data.items;

  if (items.length > 1) {
    const options = items.map(item => ({
      skuId: item.skuId,
      productName: item.productName,
      spec: item.spec,
      packaging: item.packaging,
      availableQuantity: item.availableQuantity,
    }));

    return {
      success: true,
      type: 'sku_multiple',
      message: `找到多个匹配的SKU，请选择：`,
      options,
    };
  }

  return {
    success: true,
    type: 'sku_single',
    skuId: items[0].skuId,
    productName: items[0].productName,
    spec: items[0].spec,
    packaging: items[0].packaging,
  };
}

async function matchSupplier(args: { supplierName: string; ownerId?: string }) {
  const { supplierName, ownerId } = args;

  const where: any = {
    name: { contains: supplierName }
  };

  if (ownerId) {
    where.ownerId = ownerId;
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
    },
    take: 10,
  });

  if (suppliers.length === 0) {
    return { success: false, message: `未找到供应商"${supplierName}"` };
  }

  if (suppliers.length > 1) {
    const options = suppliers.map(s => ({
      supplierId: s.id,
      supplierName: s.name,
      code: s.code,
    }));

    return {
      success: true,
      type: 'supplier_multiple',
      message: `找到多个匹配的供应商，请选择：`,
      options,
    };
  }

  return {
    success: true,
    type: 'supplier_single',
    supplierId: suppliers[0].id,
    supplierName: suppliers[0].name,
  };
}

async function matchWarehouse(args: { warehouseName: string; ownerId?: string }) {
  const { warehouseName, ownerId } = args;

  const where: any = {
    name: { contains: warehouseName }
  };

  if (ownerId) {
    where.ownerId = ownerId;
  }

  const warehouses = await prisma.warehouse.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
    },
    take: 10,
  });

  if (warehouses.length === 0) {
    return { success: false, message: `未找到仓库"${warehouseName}"` };
  }

  if (warehouses.length > 1) {
    const options = warehouses.map(w => ({
      warehouseId: w.id,
      warehouseName: w.name,
      code: w.code,
    }));

    return {
      success: true,
      type: 'warehouse_multiple',
      message: `找到多个匹配的仓库，请选择：`,
      options,
    };
  }

  return {
    success: true,
    type: 'warehouse_single',
    warehouseId: warehouses[0].id,
    warehouseName: warehouses[0].name,
  };
}

async function queryInventory(args: { productName: string; spec?: string; packaging?: string; ownerId?: string }) {
  const { productName, spec, packaging, ownerId } = args;

  const matchResult = await matchSkuOrBundle({ productName, spec, packaging, ownerId });

  if (!matchResult.success) {
    return { success: false, message: matchResult.message };
  }

  if (matchResult.type === 'bundle') {
    const bundleInventoryResult = await queryBundleInventoryInternal(matchResult.bundleId, ownerId);
    return {
      success: true,
      type: 'bundle_inventory',
      data: {
        productName: matchResult.bundleName,
        bundleId: matchResult.bundleId,
        ...bundleInventoryResult.data,
      },
    };
  }

  if (matchResult.type === 'sku_multiple') {
    return {
      success: true,
      type: 'match_sku',
      multiple: true,
      message: matchResult.message,
      options: matchResult.options,
    };
  }

  const inventoryResult = await querySkuInventoryInternal(matchResult.skuId, ownerId);

  return {
    success: true,
    type: 'sku_inventory',
    multiple: false,
    data: {
      productName: matchResult.productName,
      spec: matchResult.spec,
      packaging: matchResult.packaging,
      skuId: matchResult.skuId,
      ...inventoryResult.data,
    },
  };
}

async function queryBatchTrace(args: { batchNo: string }) {
  const { batchNo } = args;

  const skuBatch = await prisma.sKUBatch.findFirst({
    where: { batchNo },
    include: { sku: { include: { product: true } }, supplier: true },
  });

  const bundleBatch = await prisma.bundleBatch.findFirst({
    where: { batchNo },
    include: { bundle: true, supplier: true },
  });

  if (!skuBatch && !bundleBatch) {
    return { success: false, message: '批次不存在' };
  }

  const isProduct = !!skuBatch;

  const stockIns = isProduct
    ? await prisma.stockIn.findMany({
        where: { skuBatchId: skuBatch!.id },
        include: { warehouse: true, location: true },
        orderBy: { createdAt: 'asc' },
      })
    : await prisma.bundleStockIn.findMany({
        where: { bundleBatchId: bundleBatch!.id },
        include: { warehouse: true, location: true },
        orderBy: { createdAt: 'asc' },
      });

  const stockOuts = isProduct
    ? await prisma.stockOut.findMany({
        where: { skuBatchId: skuBatch!.id },
        orderBy: { createdAt: 'asc' },
      })
    : await prisma.stockOut.findMany({
        where: { bundleBatchId: bundleBatch!.id },
        orderBy: { createdAt: 'asc' },
      });

  const stockOutIds = stockOuts.map(s => s.orderId);
  const orders = stockOutIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: stockOutIds } },
        include: { customer: true }
      })
    : [];
  const orderMap = new Map(orders.map(o => [o.id, o]));

  const currentStocks = isProduct
      ? await prisma.stock.findMany({
          where: { skuBatchId: skuBatch!.id, totalQuantity: { gt: 0 } },
          include: { warehouse: true, location: { include: { shelf: { include: { zone: true } } } } },
        })
      : await prisma.bundleStock.findMany({
          where: { bundleBatchId: bundleBatch!.id, totalQuantity: { gt: 0 } },
          include: { warehouse: true, location: { include: { shelf: { include: { zone: true } } } } },
        });

  return {
    success: true,
    data: {
      batchNo,
      type: isProduct ? 'PRODUCT' : 'BUNDLE',
      productName: isProduct ? skuBatch!.sku?.product?.name : bundleBatch!.bundle?.name,
      spec: isProduct ? skuBatch!.sku?.spec : undefined,
      packaging: isProduct ? skuBatch!.sku?.packaging : undefined,
      supplierName: isProduct ? skuBatch!.supplier?.name : bundleBatch!.supplier?.name,
      totalInbound: stockIns.reduce((sum, s) => sum + s.quantity, 0),
      totalOutbound: stockOuts.reduce((sum, s) => sum + s.quantity, 0),
      totalInWarehouse: currentStocks.reduce((sum, s) => sum + s.totalQuantity, 0),
      locations: currentStocks.map(s => ({
        locationCode: formatLocationCode(s.location),
        quantity: s.totalQuantity,
        warehouseName: s.warehouse?.name,
      })),
      stockOuts: stockOuts.map(s => {
        const order = orderMap.get(s.orderId);
        return {
          orderId: s.orderId,
          orderNo: order?.orderNo,
          customerName: order?.customer?.name,
          quantity: s.quantity,
          createdAt: s.createdAt,
        };
      }),
    },
  };
}

async function queryOwnerStockSummary(args: { ownerId: string }) {
  const { ownerId } = args;

  const warehouses = await prisma.warehouse.findMany({
    where: { ownerId },
    select: { id: true, name: true },
  });

  if (warehouses.length === 0) {
    return { success: true, data: { products: [], bundles: [] } };
  }

  const warehouseIds = warehouses.map(w => w.id);

  const stocks = await prisma.stock.findMany({
    where: {
      warehouseId: { in: warehouseIds },
      location: { shelf: { zone: { type: { in: ['STORAGE', 'PICKING'] } } } },
    },
    include: { sku: { include: { product: true } }, skuBatch: true },
  });

  const bundleStocks = await prisma.bundleStock.findMany({
    where: {
      warehouseId: { in: warehouseIds },
      location: { shelf: { zone: { type: { in: ['STORAGE', 'PICKING'] } } } },
    },
    include: { bundle: true, bundleBatch: true },
  });

  const skuMap = new Map<string, any>();
  for (const s of stocks) {
    if (!skuMap.has(s.skuId)) {
      skuMap.set(s.skuId, {
        skuId: s.skuId,
        productName: s.sku.product?.name,
        spec: s.sku.spec,
        packaging: s.sku.packaging,
        totalAvailable: 0,
        warehouseSummary: [],
      });
    }
    skuMap.get(s.skuId).totalAvailable += s.availableQuantity;
    const wh = warehouses.find(w => w.id === s.warehouseId);
    skuMap.get(s.skuId).warehouseSummary.push({
      warehouseName: wh?.name,
      available: s.availableQuantity,
    });
  }

  const bundleMap = new Map<string, any>();
  for (const bs of bundleStocks) {
    if (!bundleMap.has(bs.bundleId)) {
      bundleMap.set(bs.bundleId, {
        bundleId: bs.bundleId,
        bundleName: bs.bundle?.name,
        packaging: bs.bundle?.packaging,
        totalAvailable: 0,
        warehouseSummary: [],
      });
    }
    bundleMap.get(bs.bundleId).totalAvailable += bs.availableQuantity;
    const wh = warehouses.find(w => w.id === bs.warehouseId);
    bundleMap.get(bs.bundleId).warehouseSummary.push({
      warehouseName: wh?.name,
      available: bs.availableQuantity,
    });
  }

  return {
    success: true,
    data: {
      products: Array.from(skuMap.values()),
      bundles: Array.from(bundleMap.values()),
    },
  };
}