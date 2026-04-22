import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const allSpecs = await p.specOption.findMany();
  console.log('所有 SpecOption:', allSpecs.length);
  allSpecs.forEach(x => console.log(' -', x.code, x.name, '| subCategoryId:', x.subCategoryId));

  const allPackagings = await p.packagingOption.findMany();
  console.log('\n所有 PackagingOption:', allPackagings.length);
  allPackagings.forEach(x => console.log(' -', x.code, x.name, '| subCategoryId:', x.subCategoryId));

  console.log('\n当前数据模型已更新：');
  console.log('- SpecOption 现在直接通过 subCategoryId 属于某个二级分类');
  console.log('- PackagingOption 现在直接通过 subCategoryId 属于某个二级分类');
  console.log('- SubCategorySpec 和 SubCategoryPackaging 关联表已删除');
}

main().then(() => p.$disconnect()).catch(console.error);
