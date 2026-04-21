import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // 1. 先删除 SubCategoryPackaging 关联
  const subCategoryPackagings = await p.subCategoryPackaging.findMany({
    include: { packaging: true }
  });
  const pkgToDelete = subCategoryPackagings.filter(x => /[\u4e00-\u9fa5]/.test(x.packaging.code));
  console.log('SubCategoryPackaging 要删除:', pkgToDelete.length);
  if (pkgToDelete.length > 0) {
    await p.subCategoryPackaging.deleteMany({
      where: { id: { in: pkgToDelete.map(x => x.id) } }
    });
  }

  // 2. 删除 PackagingOption 中 code 带中文的记录
  const packagingOptions = await p.packagingOption.findMany();
  const pkgOptionsToDelete = packagingOptions.filter(x => /[\u4e00-\u9fa5]/.test(x.code));
  console.log('PackagingOption 要删除:', pkgOptionsToDelete.length);
  pkgOptionsToDelete.forEach(x => console.log(' -', x.code, x.name));
  await p.packagingOption.deleteMany({ where: { id: { in: pkgOptionsToDelete.map(x => x.id) } } });

  // 3. 先删除 SubCategorySpec 关联
  const subCategorySpecs = await p.subCategorySpec.findMany({
    include: { spec: true }
  });
  const specToDelete = subCategorySpecs.filter(x => /[\u4e00-\u9fa5]/.test(x.spec.code));
  console.log('SubCategorySpec 要删除:', specToDelete.length);
  if (specToDelete.length > 0) {
    await p.subCategorySpec.deleteMany({
      where: { id: { in: specToDelete.map(x => x.id) } }
    });
  }

  // 4. 删除 SpecOption 中 code 带中文的记录
  const specOptions = await p.specOption.findMany();
  const specOptionsToDelete = specOptions.filter(x => /[\u4e00-\u9fa5]/.test(x.code));
  console.log('SpecOption 要删除:', specOptionsToDelete.length);
  specOptionsToDelete.forEach(x => console.log(' -', x.code, x.name));
  await p.specOption.deleteMany({ where: { id: { in: specOptionsToDelete.map(x => x.id) } } });

  console.log('删除完成');
}

main().then(() => p.$disconnect()).catch(console.error);
