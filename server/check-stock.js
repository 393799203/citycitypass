const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // 检查库存记录
    const stock = await prisma.bundleStock.findUnique({
      where: { id: 'd6c59894-4a82-4af3-8306-69e0ddab8603' },
      include: { bundle: true, warehouse: true, location: true }
    });

    if (stock) {
      console.log('套装库存记录:');
      console.log('- ID:', stock.id);
      console.log('- 套装:', stock.bundle?.name);
      console.log('- 仓库:', stock.warehouse?.name);
      console.log('- 库位:', stock.location?.code);
      console.log('- 总数量:', stock.totalQuantity);
      console.log('- 可用数量:', stock.availableQuantity);
      console.log('- 创建时间:', stock.createdAt);
      console.log('- 更新时间:', stock.updatedAt);

      // 检查入库记录
      const stockIns = await prisma.bundleStockIn.findMany({
        where: { bundleId: stock.bundleId },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      console.log('\n最近的套装入库记录:');
      stockIns.forEach((si, i) => {
        console.log(`${i + 1}. 数量=${si.quantity}, 状态=${si.status}, 库位ID=${si.locationId}, 时间=${si.createdAt}`);
      });

      // 检查入库单
      const inboundOrder = await prisma.inboundOrder.findFirst({
        where: { orderNo: 'IN17771222052206NET' },
        include: {
          items: {
            where: { bundleId: stock.bundleId }
          }
        }
      });

      if (inboundOrder) {
        console.log('\n入库单信息:');
        console.log('- 订单号:', inboundOrder.orderNo);
        console.log('- 状态:', inboundOrder.status);
        console.log('- 创建时间:', inboundOrder.createdAt);
        console.log('- 入库项:');
        inboundOrder.items.forEach((item, i) => {
          console.log(`  ${i + 1}. 类型=${item.type}, 预期数量=${item.expectedQuantity}, 实收数量=${item.receivedQuantity}, 库位ID=${item.locationId}`);
        });
      }
    } else {
      console.log('未找到库存记录');
    }
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
