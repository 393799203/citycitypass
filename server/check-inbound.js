const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInboundOrder() {
  try {
    const order = await prisma.inboundOrder.findFirst({
      where: { orderNo: 'IN17771222052206NET' },
      include: {
        items: {
          include: {
            bundle: true,
            location: true,
          }
        },
        warehouse: true,
      }
    });

    if (order) {
      console.log('入库单信息:');
      console.log('- 订单号:', order.orderNo);
      console.log('- 仓库:', order.warehouse?.name);
      console.log('- 状态:', order.status);
      console.log('- 创建时间:', order.createdAt);
      
      console.log('\n入库项:');
      order.items.forEach((item, index) => {
        console.log(`\n项目 ${index + 1}:`);
        console.log('- 类型:', item.type);
        console.log('- 套装ID:', item.bundleId);
        console.log('- 套装名称:', item.bundle?.name);
        console.log('- 库位ID:', item.locationId);
        console.log('- 库位名称:', item.location?.name);
        console.log('- 预期数量:', item.expectedQuantity);
        console.log('- 实收数量:', item.receivedQuantity);
      });

      // 检查套装库存
      if (order.items.length > 0 && order.items[0].bundleId) {
        const bundleStocks = await prisma.bundleStock.findMany({
          where: {
            bundleId: order.items[0].bundleId,
            warehouseId: order.warehouseId,
          }
        });
        
        console.log('\n套装库存记录:');
        console.log('- 记录数:', bundleStocks.length);
        bundleStocks.forEach((stock, index) => {
          console.log(`\n库存 ${index + 1}:`);
          console.log('- 总数量:', stock.totalQuantity);
          console.log('- 可用数量:', stock.availableQuantity);
          console.log('- 库位ID:', stock.locationId);
        });

        const bundleStockIns = await prisma.bundleStockIn.findMany({
          where: {
            bundleId: order.items[0].bundleId,
            warehouseId: order.warehouseId,
          }
        });
        
        console.log('\n套装入库记录:');
        console.log('- 记录数:', bundleStockIns.length);
        bundleStockIns.forEach((stockIn, index) => {
          console.log(`\n入库记录 ${index + 1}:`);
          console.log('- 数量:', stockIn.quantity);
          console.log('- 状态:', stockIn.status);
          console.log('- 库位ID:', stockIn.locationId);
        });
      }
    } else {
      console.log('未找到入库单');
    }
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInboundOrder();
