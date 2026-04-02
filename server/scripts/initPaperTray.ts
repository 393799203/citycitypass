import prisma from '../src/lib/prisma';

const paperTrayData = {
  categoryName: "包装材料",
  categoryCode: "BAOZHUANG",
  subCategories: [
    { code: 'ZT', name: '纸托' },
    { code: 'FB', name: '发泡包装' },
    { code: 'HC', name: '缓冲材料' }
  ],
  brands: [
    { 
      name: "纸托王", 
      code: 'ZTW', 
      packagings: ['张', '叠', '箱'], 
      specs: ['小号(10cm)', '中号(15cm)', '大号(20cm)', '特大号(25cm)'] 
    },
    { 
      name: "绿森环保", 
      code: 'LSHB', 
      packagings: ['张', '包', '箱'], 
      specs: ['小号(10cm)', '中号(15cm)', '大号(20cm)'] 
    },
    { 
      name: "嘉润纸业", 
      code: 'JRZY', 
      packagings: ['叠', '箱'], 
      specs: ['小号', '中号', '大号', '特大号'] 
    },
  ]
};

const newPackagings = ['张', '叠', '包'];
const newSpecs = ['小号(10cm)', '中号(15cm)', '大号(20cm)', '特大号(25cm)', '小号', '中号', '大号', '特大号'];

async function main() {
  console.log('>>> 开始新增纸托公司初始化数据...\n');

  console.log('>>> 创建新增的包装选项...');
  const packagingMap: Record<string, string> = {};
  for (const pkgName of newPackagings) {
    const existing = await prisma.packagingOption.findFirst({
      where: { name: pkgName }
    });
    if (existing) {
      packagingMap[pkgName] = existing.id;
      console.log(`  [已存在] 包装: ${pkgName}`);
    } else {
      const pkg = await prisma.packagingOption.create({
        data: { 
          code: `PKG_${pkgName}`, 
          name: pkgName, 
          sortOrder: 100 
        }
      });
      packagingMap[pkgName] = pkg.id;
      console.log(`  [新增] 包装: ${pkgName}`);
    }
  }

  console.log('\n>>> 创建新增的规格选项...');
  const specMap: Record<string, string> = {};
  for (const specName of newSpecs) {
    const existing = await prisma.specOption.findFirst({
      where: { name: specName }
    });
    if (existing) {
      specMap[specName] = existing.id;
      console.log(`  [已存在] 规格: ${specName}`);
    } else {
      const spec = await prisma.specOption.create({
        data: { 
          code: `SPEC_${specName.replace(/[()（）]/g, '')}`, 
          name: specName, 
          sortOrder: 100 
        }
      });
      specMap[specName] = spec.id;
      console.log(`  [新增] 规格: ${specName}`);
    }
  }

  console.log('\n>>> 创建包装材料类目...');
  let category = await prisma.productCategory.findFirst({
    where: { code: paperTrayData.categoryCode }
  });
  
  if (category) {
    console.log(`  [已存在] 类目: ${paperTrayData.categoryName}`);
  } else {
    category = await prisma.productCategory.create({
      data: {
        code: paperTrayData.categoryCode,
        name: paperTrayData.categoryName,
        sortOrder: 10,
      }
    });
    console.log(`  [新增] 类目: ${paperTrayData.categoryName}`);
  }

  console.log('\n>>> 创建二级分类...');
  for (const subCat of paperTrayData.subCategories) {
    const existing = await prisma.productSubCategory.findFirst({
      where: { code: subCat.code, categoryId: category.id }
    });
    if (existing) {
      console.log(`  [已存在] 二级分类: ${subCat.name}`);
    } else {
      await prisma.productSubCategory.create({
        data: {
          code: subCat.code,
          name: subCat.name,
          categoryId: category.id,
        }
      });
      console.log(`  [新增] 二级分类: ${subCat.name}`);
    }
  }

  console.log('\n>>> 创建品牌...');
  for (const brandData of paperTrayData.brands) {
    let brand = await prisma.productBrand.findFirst({
      where: { code: brandData.code }
    });
    
    if (brand) {
      console.log(`  [已存在] 品牌: ${brandData.name}`);
    } else {
      brand = await prisma.productBrand.create({
        data: {
          code: brandData.code,
          name: brandData.name,
          categoryId: category.id,
        }
      });
      console.log(`  [新增] 品牌: ${brandData.name}`);
    }

    for (const pkgName of brandData.packagings) {
      if (packagingMap[pkgName]) {
        const existing = await prisma.brandPackaging.findFirst({
          where: { brandId: brand.id, packagingId: packagingMap[pkgName] }
        });
        if (!existing) {
          await prisma.brandPackaging.create({
            data: { brandId: brand.id, packagingId: packagingMap[pkgName] }
          });
          console.log(`    [新增] 品牌包装: ${brandData.name} - ${pkgName}`);
        }
      }
    }

    for (const specName of brandData.specs) {
      if (specMap[specName]) {
        const existing = await prisma.brandSpec.findFirst({
          where: { brandId: brand.id, specId: specMap[specName] }
        });
        if (!existing) {
          await prisma.brandSpec.create({
            data: { brandId: brand.id, specId: specMap[specName] }
          });
          console.log(`    [新增] 品牌规格: ${brandData.name} - ${specName}`);
        }
      }
    }
  }

  console.log('\n========================================');
  console.log('纸托公司初始化数据新增完成！');
  console.log('========================================');
}

main()
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
