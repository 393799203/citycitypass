const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: { source: 'CUSTOMER' },
    select: {
      id: true,
      orderNo: true,
      status: true,
      paymentStatus: true,
      paymentTimeoutAt: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log('最近的客户订单:');
  orders.forEach(o => {
    console.log(`  订单号: ${o.orderNo}, 状态: ${o.status}, 支付状态: ${o.paymentStatus || '无'}, 超时时间: ${o.paymentTimeoutAt || '无'}`);
  });
  
  const stocks = await prisma.stock.findMany({
    where: {
      skuId: 'd325401e-b2f9-4780-9324-a978a2b94ef0'
    },
    select: {
      id: true,
      availableQuantity: true,
      lockedQuantity: true,
      warehouseId: true
    }
  });
  
  console.log('\n箱装茅台库存状态:');
  stocks.forEach(s => {
    console.log(`  库存ID: ${s.id}, 可用: ${s.availableQuantity}, 锁定: ${s.lockedQuantity}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
