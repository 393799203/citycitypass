const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearCart() {
  try {
    const result = await prisma.cart.deleteMany({});
    console.log(`已清除 ${result.count} 条购物车数据`);
  } catch (error) {
    console.error('清除失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearCart();
