const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function detailedCheck() {
  try {
    console.log('=== 详细数据库检查 ===\n');

    // 检查所有表
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    console.log('数据库表:', tables.map((t: any) => t.tablename).join(', '));
    console.log('');

    // 检查各表数量
    const counts = {
      users: await prisma.user.count(),
      owners: await prisma.owner.count(),
      products: await prisma.product.count(),
      orders: await prisma.order.count(),
      warehouses: await prisma.warehouse.count(),
      categories: await prisma.category.count(),
      brands: await prisma.brand.count(),
    };

    console.log('各表数据统计:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`);
    });

    // 如果有用户，显示用户信息
    if (counts.users > 0) {
      const users = await prisma.user.findMany({
        select: { id: true, username: true, name: true, isAdmin: true }
      });
      console.log('\n用户列表:', JSON.stringify(users, null, 2));
    }

    // 如果有商品，显示商品信息
    if (counts.products > 0) {
      const products = await prisma.product.findMany({
        take: 3,
        select: { id: true, name: true, status: true, isVisibleToCustomer: true }
      });
      console.log('\n商品列表(前3个):', JSON.stringify(products, null, 2));
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

detailedCheck();
