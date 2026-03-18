import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始填充酒类数据...');

  const categories = [
    { name: '白酒', code: 'BAIJIU' },
    { name: '啤酒', code: 'PIJIU' },
    { name: '葡萄酒', code: 'PUTAOJIU' },
    { name: '洋酒', code: 'YANGJIU' },
  ];

  for (const cat of categories) {
    await prisma.productCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }
  console.log('分类创建完成:', categories.map(c => c.name));

  const brands = [
    { name: '茅台', code: 'MAOTAI', categoryCode: 'BAIJIU' },
    { name: '五粮液', code: 'WULIANGYE', categoryCode: 'BAIJIU' },
    { name: '洋河', code: 'YANGHE', categoryCode: 'BAIJIU' },
    { name: '泸州老窖', code: 'LUZHOULAOJIAO', categoryCode: 'BAIJIU' },
    { name: '古井贡酒', code: 'GUJINGGONGJIU', categoryCode: 'BAIJIU' },
    { name: '酒鬼酒', code: 'JIUGUIJIU', categoryCode: 'BAIJIU' },
    { name: '青岛啤酒', code: 'QINGDAO', categoryCode: 'PIJIU' },
    { name: '华润啤酒', code: 'HUARUN', categoryCode: 'PIJIU' },
    { name: '张裕', code: 'ZHANGYU', categoryCode: 'PUTAOJIU' },
    { name: '长城', code: 'CHANGCHENG', categoryCode: 'PUTAOJIU' },
    { name: '人头马', code: 'REMMART', categoryCode: 'YANGJIU' },
    { name: '轩尼诗', code: 'HENNESSY', categoryCode: 'YANGJIU' },
  ];

  const categoryMap = await prisma.productCategory.findMany();
  const catIdMap: Record<string, string> = {};
  categoryMap.forEach(c => catIdMap[c.code] = c.id);

  for (const brand of brands) {
    await prisma.productBrand.upsert({
      where: { code: brand.code },
      update: {},
      create: {
        name: brand.name,
        code: brand.code,
        categoryId: catIdMap[brand.categoryCode],
      },
    });
  }
  console.log('品牌创建完成:', brands.map(b => b.name));

  const brandsData = await prisma.productBrand.findMany();
  const brandMap: Record<string, string> = {};
  brandsData.forEach(b => brandMap[b.code] = b.id);

  const products = [
    { name: '飞天茅台', brandCode: 'MAOTAI', categoryCode: 'BAIJIU', spec: '500ml', packaging: '单瓶', price: 1499 },
    { name: '飞天茅台', brandCode: 'MAOTAI', categoryCode: 'BAIJIU', spec: '500ml', packaging: '箱(6瓶)', price: 8994 },
    { name: '五粮精酿', brandCode: 'WULIANGYE', categoryCode: 'BAIJIU', spec: '500ml', packaging: '单瓶', price: 120 },
    { name: '青岛纯生', brandCode: 'QINGDAO', categoryCode: 'PIJIU', spec: '250ml', packaging: '箱(12瓶)', price: 45 },
    { name: '青岛纯生', brandCode: 'QINGDAO', categoryCode: 'PIJIU', spec: '330ml', packaging: '箱(12瓶)', price: 55 },
    { name: '张裕干红', brandCode: 'ZHANGYU', categoryCode: 'PUTAOJIU', spec: '750ml', packaging: '单瓶', price: 88 },
    { name: '人头马VSOP', brandCode: 'REMMART', categoryCode: 'YANGJIU', spec: '700ml', packaging: '单瓶', price: 980 },
  ];

  for (const p of products) {
    const productId = `${p.name}_${p.spec}_${p.packaging}`.replace(/[^a-zA-Z0-9]/g, '_');
    await prisma.product.upsert({
      where: { id: productId },
      update: {},
      create: {
        id: productId,
        name: p.name,
        brandId: brandMap[p.brandCode],
        categoryId: catIdMap[p.categoryCode],
        status: 'ACTIVE',
      },
    });

    const skuId = `${productId}_sku`;
    await prisma.productSKU.upsert({
      where: { id: skuId },
      update: {},
      create: {
        id: skuId,
        productId: productId,
        spec: p.spec,
        packaging: p.packaging,
        price: p.price,
      },
    });
  }

  console.log('商品和SKU创建完成:', products.length);
  console.log('酒类数据填充完成！');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
