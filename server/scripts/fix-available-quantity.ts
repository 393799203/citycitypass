import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAvailableQuantity() {
  console.log('开始修正库存可用数量...');
  console.log('规则：只有存储区(STORAGE)和拣货区(PICKING)的库存才计入可用数量');
  console.log('');

  const salesZoneTypes = ['STORAGE', 'PICKING'];

  const productStocks = await prisma.stock.findMany({
    where: {
      locationId: { not: null },
    },
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
  });

  console.log(`找到 ${productStocks.length} 条商品库存记录`);

  let productUpdated = 0;
  for (const stock of productStocks) {
    const zoneType = stock.location?.shelf?.zone?.type;
    const shouldBeAvailable = salesZoneTypes.includes(zoneType || '')
      ? stock.totalQuantity - stock.lockedQuantity
      : 0;

    if (stock.availableQuantity !== shouldBeAvailable) {
      console.log(`[商品] SKU ${stock.skuId}:`);
      console.log(`  库位: ${stock.locationId}`);
      console.log(`  区域类型: ${zoneType || '未知'}`);
      console.log(`  总数量: ${stock.totalQuantity}, 锁定数量: ${stock.lockedQuantity}`);
      console.log(`  当前可用: ${stock.availableQuantity}, 应为: ${shouldBeAvailable}`);
      
      await prisma.stock.update({
        where: { id: stock.id },
        data: { availableQuantity: shouldBeAvailable },
      });
      productUpdated++;
    }
  }
  console.log(`商品库存修正完成，共更新 ${productUpdated} 条记录`);
  console.log('');

  const bundleStocks = await prisma.bundleStock.findMany({
    where: {
      locationId: { not: null },
    },
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
  });

  console.log(`找到 ${bundleStocks.length} 条套装库存记录`);

  let bundleUpdated = 0;
  for (const stock of bundleStocks) {
    const zoneType = stock.location?.shelf?.zone?.type;
    const shouldBeAvailable = salesZoneTypes.includes(zoneType || '')
      ? stock.totalQuantity - stock.lockedQuantity
      : 0;

    if (stock.availableQuantity !== shouldBeAvailable) {
      console.log(`[套装] Bundle ${stock.bundleId}:`);
      console.log(`  库位: ${stock.locationId}`);
      console.log(`  区域类型: ${zoneType || '未知'}`);
      console.log(`  总数量: ${stock.totalQuantity}, 锁定数量: ${stock.lockedQuantity}`);
      console.log(`  当前可用: ${stock.availableQuantity}, 应为: ${shouldBeAvailable}`);
      
      await prisma.bundleStock.update({
        where: { id: stock.id },
        data: { availableQuantity: shouldBeAvailable },
      });
      bundleUpdated++;
    }
  }
  console.log(`套装库存修正完成，共更新 ${bundleUpdated} 条记录`);
  console.log('');

  const materialStocks = await prisma.materialStock.findMany({
    where: {
      locationId: { not: null },
    },
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
  });

  console.log(`找到 ${materialStocks.length} 条物料库存记录`);

  let materialUpdated = 0;
  for (const stock of materialStocks) {
    const zoneType = stock.location?.shelf?.zone?.type;
    const shouldBeAvailable = salesZoneTypes.includes(zoneType || '')
      ? stock.totalQuantity - stock.lockedQuantity
      : 0;

    if (stock.availableQuantity !== shouldBeAvailable) {
      console.log(`[物料] Material ${stock.supplierMaterialId}:`);
      console.log(`  库位: ${stock.locationId}`);
      console.log(`  区域类型: ${zoneType || '未知'}`);
      console.log(`  总数量: ${stock.totalQuantity}, 锁定数量: ${stock.lockedQuantity}`);
      console.log(`  当前可用: ${stock.availableQuantity}, 应为: ${shouldBeAvailable}`);
      
      await prisma.materialStock.update({
        where: { id: stock.id },
        data: { availableQuantity: shouldBeAvailable },
      });
      materialUpdated++;
    }
  }
  console.log(`物料库存修正完成，共更新 ${materialUpdated} 条记录`);
  console.log('');

  console.log('=== 修正完成 ===');
  console.log(`商品库存: ${productUpdated} 条已更新`);
  console.log(`套装库存: ${bundleUpdated} 条已更新`);
  console.log(`物料库存: ${materialUpdated} 条已更新`);
  console.log(`总计: ${productUpdated + bundleUpdated + materialUpdated} 条记录已更新`);
}

fixAvailableQuantity()
  .catch((e) => {
    console.error('执行出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
