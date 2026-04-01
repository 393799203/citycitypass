import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBundleOrderItems() {
  console.log('开始修复套装订单项的 packaging 和 spec...\n');

  const bundleOrderItems = await prisma.orderItem.findMany({
    where: { bundleId: { not: null } },
    include: {
      bundle: true,
    },
  });

  console.log(`找到 ${bundleOrderItems.length} 条套装订单项`);

  let fixedCount = 0;

  for (const item of bundleOrderItems) {
    if (!item.packaging || !item.spec) {
      if (item.bundle) {
        console.log(`\n修复 OrderItem [${item.id}]`);
        console.log(`  商品: ${item.productName}`);
        console.log(`  packaging: '${item.packaging}' -> '${item.bundle.packaging}'`);
        console.log(`  spec: '${item.spec}' -> '${item.bundle.spec}'`);

        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            packaging: item.bundle.packaging,
            spec: item.bundle.spec,
          },
        });
        fixedCount++;
      } else {
        console.log(`\n警告: OrderItem [${item.id}] 没有对应的 bundle 数据`);
      }
    }
  }

  console.log(`\n✅ 修复完成！共修正 ${fixedCount} 条记录`);
}

fixBundleOrderItems()
  .catch(console.error)
  .finally(() => prisma.$disconnect());