import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // 1. 删除 PackagingOption 中 code 带中文的记录
  const packagingOptions = await p.packagingOption.findMany();
  const pkgOptionsToDelete = packagingOptions.filter(x => /[\u4e00-\u9fa5]/.test(x.code));
  console.log('PackagingOption 要删除:', pkgOptionsToDelete.length);
  pkgOptionsToDelete.forEach(x => console.log(' -', x.code, x.name));
  await p.packagingOption.deleteMany({ where: { id: { in: pkgOptionsToDelete.map(x => x.id) } } });

  // 2. 删除 SpecOption 中 code 带中文的记录
  const specOptions = await p.specOption.findMany();
  const specOptionsToDelete = specOptions.filter(x => /[\u4e00-\u9fa5]/.test(x.code));
  console.log('SpecOption 要删除:', specOptionsToDelete.length);
  specOptionsToDelete.forEach(x => console.log(' -', x.code, x.name));
  await p.specOption.deleteMany({ where: { id: { in: specOptionsToDelete.map(x => x.id) } } });

  console.log('删除完成');
}

main().then(() => p.$disconnect()).catch(console.error);
