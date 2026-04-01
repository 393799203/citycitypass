import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixStock() {
  console.log('开始修复库存数据...\n');

  const skuStocks = await prisma.stock.findMany({
    where: { skuId: { not: undefined } },
    include: {
      skuBatch: true,
    },
  });

  console.log(`找到 ${skuStocks.length} 条 SKU 库存记录\n`);

  let fixedCount = 0;

  for (const stock of skuStocks) {
    const stockIns = await prisma.stockIn.aggregate({
      where: {
        skuId: stock.skuId,
        skuBatchId: stock.skuBatchId,
        warehouseId: stock.warehouseId,
      },
      _sum: { quantity: true },
    });

    const stockOuts = await prisma.stockOut.aggregate({
      where: {
        skuId: stock.skuId,
        skuBatchId: stock.skuBatchId,
        warehouseId: stock.warehouseId,
      },
      _sum: { quantity: true },
    });

    const totalIn = stockIns._sum.quantity || 0;
    const totalOut = stockOuts._sum.quantity || 0;
    const correctTotal = totalIn - totalOut;

    const locks = await prisma.stockLock.aggregate({
      where: {
        skuId: stock.skuId,
        skuBatchId: stock.skuBatchId,
        warehouseId: stock.warehouseId,
        status: { in: ['LOCKED', 'USED'] },
      },
      _sum: { quantity: true },
    });

    const lockedQty = locks._sum.quantity || 0;
    const availableQty = Math.max(0, correctTotal - lockedQty);

    if (stock.totalQuantity !== correctTotal || stock.lockedQuantity !== lockedQty || stock.availableQuantity !== availableQty) {
      console.log(`SKU Stock [${stock.skuId}] [${stock.skuBatch?.batchNo || 'N/A'}]`);
      console.log(`  总库存: ${stock.totalQuantity} -> ${correctTotal}`);
      console.log(`  冻结: ${stock.lockedQuantity} -> ${lockedQty}`);
      console.log(`  可用: ${stock.availableQuantity} -> ${availableQty}`);
      console.log('');

      await prisma.stock.update({
        where: { id: stock.id },
        data: {
          totalQuantity: correctTotal,
          lockedQuantity: lockedQty,
          availableQuantity: availableQty,
        },
      });
      fixedCount++;
    }
  }

  console.log(`\n✅ 修复完成！共修正 ${fixedCount} 条库存记录`);
}

fixStock()
  .catch(console.error)
  .finally(() => prisma.$disconnect());