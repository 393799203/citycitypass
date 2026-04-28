const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const productCount = await prisma.product.count();
    const orderCount = await prisma.order.count();
    const userCount = await prisma.user.count();

    console.log('数据库统计:');
    console.log('- 商品数量:', productCount);
    console.log('- 订单数量:', orderCount);
    console.log('- 用户数量:', userCount);

    if (productCount > 0) {
      const products = await prisma.product.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          isVisibleToCustomer: true,
          status: true
        }
      });
      console.log('\n前5个商品:');
      console.log(JSON.stringify(products, null, 2));
    }
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
