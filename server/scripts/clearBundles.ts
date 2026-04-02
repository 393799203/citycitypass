import prisma from '../src/lib/prisma';

async function clearBundles() {
  console.log('>>> 开始清除套装数据...\n');

  const bundleCount = await prisma.bundleSKU.count();
  console.log('套装数量:', bundleCount);

  console.log('\n1. 清除 BundleStockLock...');
  await prisma.bundleStockLock.deleteMany({});
  console.log('   已清除 BundleStockLock');

  console.log('\n2. 清除 BundleStockIn...');
  await prisma.bundleStockIn.deleteMany({});
  console.log('   已清除 BundleStockIn');

  console.log('\n3. 清除 BundleStock...');
  await prisma.bundleStock.deleteMany({});
  console.log('   已清除 BundleStock');

  console.log('\n4. 清除 BundleSKUItem...');
  await prisma.bundleSKUItem.deleteMany({});
  console.log('   已清除 BundleSKUItem');

  console.log('\n5. 清除 BundleBatch...');
  await prisma.bundleBatch.deleteMany({});
  console.log('   已清除 BundleBatch');

  console.log('\n6. 清除 BundleSKU...');
  await prisma.bundleSKU.deleteMany({});
  console.log('   已清除 BundleSKU');

  const remainingBundles = await prisma.bundleSKU.count();
  const remainingBatches = await prisma.bundleBatch.count();
  console.log('\n>>> 清除完成！');
  console.log('剩余套装:', remainingBundles);
  console.log('剩余批次:', remainingBatches);

  await prisma.$disconnect();
}

clearBundles().catch(console.error);
