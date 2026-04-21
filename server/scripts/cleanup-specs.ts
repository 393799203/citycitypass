import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // 获取所有 SpecOption
  const allSpecs = await p.specOption.findMany();
  console.log('所有 SpecOption:', allSpecs.length);
  allSpecs.forEach(x => console.log(' -', x.code, x.name));

  // 专业 code 格式应该是 SPEC_ 开头
  const professionalSpecs = allSpecs.filter(x => x.code.startsWith('SPEC_'));
  const nonProfessionalSpecs = allSpecs.filter(x => !x.code.startsWith('SPEC_'));

  console.log('\n专业规格:', professionalSpecs.length);
  console.log('非专业规格:', nonProfessionalSpecs.length);

  // 先删除 SubCategorySpec 关联
  const subCategorySpecs = await p.subCategorySpec.findMany({
    include: { spec: true }
  });

  const nonProfessionalSubSpecs = subCategorySpecs.filter(x => !x.spec.code.startsWith('SPEC_'));
  console.log('\nSubCategorySpec 非专业关联要删除:', nonProfessionalSubSpecs.length);

  if (nonProfessionalSubSpecs.length > 0) {
    await p.subCategorySpec.deleteMany({
      where: { id: { in: nonProfessionalSubSpecs.map(x => x.id) } }
    });
  }

  // 删除非专业规格
  if (nonProfessionalSpecs.length > 0) {
    console.log('\n删除非专业规格:');
    nonProfessionalSpecs.forEach(x => console.log(' -', x.code, x.name));
    await p.specOption.deleteMany({
      where: { id: { in: nonProfessionalSpecs.map(x => x.id) } }
    });
  }

  console.log('\n清理完成');
  const remaining = await p.specOption.findMany();
  console.log('剩余 SpecOption:', remaining.length);
  remaining.forEach(x => console.log(' -', x.code, x.name));
}

main().then(() => p.$disconnect()).catch(console.error);
