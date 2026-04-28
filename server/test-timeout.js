const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderNo = 'ORD1777101566881OSUY';
  
  const beforeStock = await prisma.stock.findMany({
    where: {
      skuId: 'd325401e-b2f9-4780-9324-a978a2b94ef0',
      warehouseId: 'bc4b8e07-bef4-4eda-abdf-530e41dffae0'
    }
  });
  console.log('超时前库存状态:');
  beforeStock.forEach(s => {
    console.log(`  库存ID: ${s.id}, 可用: ${s.availableQuantity}, 锁定: ${s.lockedQuantity}`);
  });
  
  await prisma.order.update({
    where: { orderNo },
    data: {
      paymentTimeoutAt: new Date(Date.now() - 60000)
    }
  });
  console.log('\n已设置支付超时时间为过去');
  
  const order = await prisma.order.findUnique({
    where: { orderNo },
    select: { paymentTimeoutAt: true, paymentStatus: true, status: true }
  });
  console.log('订单状态:', order);
  
  const { PaymentTimeoutService } = require('./src/services/paymentTimeout');
  PaymentTimeoutService.checkTimeoutOrders().then(() => {
    console.log('\n支付超时检查完成');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
