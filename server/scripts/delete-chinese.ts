import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const packagingOptions = await p.packagingOption.findMany();
  const toDelete = packagingOptions.filter(x => /[\u4e00-\u9fa5]/.test(x.code));

  console.log('要删除的记录:', toDelete.length);
  toDelete.forEach(x => console.log(' -', x.code, x.name));

  await p.packagingOption.deleteMany({
    where: { id: { in: toDelete.map(x => x.id) } }
  });

  console.log('删除完成');
}

main().then(() => p.$disconnect());
