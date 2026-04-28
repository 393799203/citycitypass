const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.bundleStock.findUnique({
  where: { id: 'd6c59894-4a82-4af3-8306-69e0ddab8603' }
}).then(stock => {
  console.log('库存:', stock);
  return prisma.bundleStockIn.findMany({
    where: { bundleId: stock.bundleId },
    take: 3,
    orderBy: { createdAt: 'desc' }
  });
}).then(ins => {
  console.log('入库记录:', ins);
  return prisma.inboundOrder.findFirst({
    where: { orderNo: 'IN17771222052206NET' },
    include: { items: true }
  });
}).then(order => {
  console.log('入库单:', order?.orderNo, order?.status);
  console.log('入库项:', order?.items);
  prisma.$disconnect();
}).catch(e => {
  console.error(e);
  prisma.$disconnect();
});
