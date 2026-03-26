import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

const alcoholData = {
  alcoholCategories: [
    {
      categoryName: "白酒",
      categoryCode: "BAIJIU",
      subCategories: [
        { code: 'JX', name: '酱香型' },
        { code: 'NJ', name: '浓香型' },
        { code: 'QX', name: '清香型' },
        { code: 'MX', name: '米香型' },
        { code: 'JX2', name: '兼香型' }
      ],
      brands: [
        { name: "茅台", code: 'MT', packagings: ['单瓶', '双瓶', '箱6瓶', '箱12瓶'], specs: ['500ml', '1L', '2.5L'] },
        { name: "五粮液", code: 'WL', packagings: ['单瓶', '双瓶', '箱6瓶'], specs: ['500ml', '750ml', '1L'] },
        { name: "泸州老窖", code: 'LZLJ', packagings: ['单瓶', '箱6瓶', '箱12瓶'], specs: ['500ml', '1L'] },
        { name: "洋河", code: 'YH', packagings: ['单瓶', '双瓶', '箱6瓶'], specs: ['500ml', '1L'] },
        { name: "汾酒", code: 'FJ', packagings: ['单瓶', '箱6瓶', '箱12瓶'], specs: ['475ml', '500ml', '1L'] },
        { name: "古井贡酒", code: 'GJG', packagings: ['单瓶', '双瓶', '箱6瓶'], specs: ['500ml', '1L'] },
        { name: "口子窖", code: 'KJJ', packagings: ['单瓶', '箱6瓶'], specs: ['500ml', '1L'] },
        { name: "北京二锅头", code: 'BJYY', packagings: ['单瓶', '双瓶', '箱6瓶', '箱12瓶'], specs: ['100ml', '250ml', '500ml', '1L'] }
      ]
    },
    {
      categoryName: "啤酒",
      categoryCode: "PIJIU",
      subCategories: [
        { code: 'AS', name: '艾尔' },
        { code: 'LS', name: '拉格' },
        { code: 'YJ', name: 'IPA' },
        { code: 'ST', name: '世涛' }
      ],
      brands: [
        { name: "青岛啤酒", code: 'QD', packagings: ['单瓶', '罐装', '箱6瓶', '箱12瓶', '箱24瓶'], specs: ['330ml', '500ml'] },
        { name: "燕京啤酒", code: 'YB', packagings: ['单瓶', '罐装', '箱6瓶', '箱12瓶'], specs: ['330ml', '500ml'] },
        { name: "哈尔滨啤酒", code: 'HLJ', packagings: ['单瓶', '罐装', '箱6瓶', '箱12瓶'], specs: ['330ml', '500ml'] },
        { name: "百威", code: 'BUD', packagings: ['单瓶', '罐装', '箱6瓶', '箱12瓶', '箱24瓶'], specs: ['330ml', '500ml'] }
      ]
    },
    {
      categoryName: "葡萄酒",
      categoryCode: "PUTAOJIU",
      subCategories: [
        { code: 'H', name: '红葡萄酒' },
        { code: 'W', name: '白葡萄酒' },
        { code: 'P', name: '桃红葡萄酒' }
      ],
      brands: [
        { name: "张裕", code: 'ZY', packagings: ['单瓶', '箱6瓶', '箱12瓶'], specs: ['375ml', '750ml', '1.5L'] },
        { name: "长城", code: 'CC', packagings: ['单瓶', '箱6瓶'], specs: ['375ml', '750ml'] },
        { name: "王朝", code: 'WC', packagings: ['单瓶', '箱6瓶', '箱12瓶'], specs: ['375ml', '750ml', '1.5L'] },
        { name: "威龙", code: 'WLW', packagings: ['单瓶', '箱6瓶'], specs: ['750ml'] },
        { name: "奔富", code: 'PF', packagings: ['单瓶', '箱6瓶'], specs: ['375ml', '750ml'] },
        { name: "拉菲", code: 'LF', packagings: ['单瓶', '箱6瓶'], specs: ['750ml', '1.5L'] }
      ]
    },
    {
      categoryName: "洋酒",
      categoryCode: "YANGJIU",
      subCategories: [
        { code: 'WH', name: '威士忌' },
        { code: 'BK', name: '白兰地' },
        { code: 'RM', name: '朗姆酒' },
        { code: 'VK', name: '伏特加' },
        { code: 'GJ', name: '金酒' }
      ],
      brands: [
        { name: "轩尼诗", code: 'HN', packagings: ['单瓶', '双瓶', '箱6瓶'], specs: ['350ml', '700ml', '1L'] },
        { name: "人头马", code: 'RT', packagings: ['单瓶', '箱6瓶'], specs: ['350ml', '700ml'] },
        { name: "马爹利", code: 'MPL', packagings: ['单瓶', '箱6瓶'], specs: ['350ml', '700ml', '1L'] },
        { name: "尊尼获加", code: 'JWK', packagings: ['单瓶', '双瓶', '箱6瓶', '箱12瓶'], specs: ['200ml', '375ml', '700ml', '1L'] },
        { name: "芝华士", code: 'CHS', packagings: ['单瓶', '双瓶', '箱6瓶'], specs: ['375ml', '700ml', '1L'] },
        { name: "杰克丹尼", code: 'JKDN', packagings: ['单瓶', '罐装', '箱6瓶', '箱12瓶'], specs: ['200ml', '375ml', '700ml', '1L'] },
        { name: "百加得", code: 'BJD', packagings: ['单瓶', '罐装', '箱6瓶', '箱12瓶'], specs: ['200ml', '375ml', '700ml', '1L'] },
        { name: "绝对伏特加", code: 'JD', packagings: ['单瓶', '箱6瓶', '箱12瓶'], specs: ['200ml', '375ml', '700ml', '1L'] }
      ]
    }
  ]
};

const allPackagings = ['单瓶', '双瓶', '箱4瓶', '箱6瓶', '箱12瓶', '箱24瓶', '罐装'];
const allSpecs = ['100ml', '200ml', '250ml', '330ml', '350ml', '375ml', '475ml', '500ml', '700ml', '750ml', '1L', '1.5L', '2.5L'];

async function main() {
  console.log('开始初始化数据...\n');

  console.log('>>> 清空现有数据...');
  await prisma.orderItem.deleteMany();
  await prisma.stockLock.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockIn.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.productSKU.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brandSpec.deleteMany();
  await prisma.brandPackaging.deleteMany();
  await prisma.productBrand.deleteMany();
  await prisma.productSubCategory.deleteMany();
  await prisma.specOption.deleteMany();
  await prisma.packagingOption.deleteMany();
  await prisma.productCategory.deleteMany();
  console.log('>>> 清空完成\n');

  console.log('>>> 创建包装和规格选项...');
  const packagingMap: Record<string, string> = {};
  for (let i = 0; i < allPackagings.length; i++) {
    const pkg = await prisma.packagingOption.create({
      data: { code: `PKG${String(i + 1).padStart(2, '0')}`, name: allPackagings[i], sortOrder: i }
    });
    packagingMap[allPackagings[i]] = pkg.id;
    console.log(`  [包装] ${allPackagings[i]}`);
  }

  const specMap: Record<string, string> = {};
  for (let i = 0; i < allSpecs.length; i++) {
    const spec = await prisma.specOption.create({
      data: { code: `SPEC${String(i + 1).padStart(2, '0')}`, name: allSpecs[i], sortOrder: i }
    });
    specMap[allSpecs[i]] = spec.id;
    console.log(`  [规格] ${allSpecs[i]}`);
  }

  console.log('');

  for (const categoryData of alcoholData.alcoholCategories) {
    const sortOrder = alcoholData.alcoholCategories.indexOf(categoryData);

    const category = await prisma.productCategory.create({
      data: {
        code: categoryData.categoryCode,
        name: categoryData.categoryName,
        sortOrder: sortOrder,
      }
    });
    console.log(`[分类] ${categoryData.categoryName}`);

    for (const subCat of categoryData.subCategories) {
      await prisma.productSubCategory.create({
        data: {
          code: subCat.code,
          name: subCat.name,
          categoryId: category.id,
        }
      });
      console.log(`  [二级分类] ${subCat.name}`);
    }

    for (const brandData of categoryData.brands) {
      const brand = await prisma.productBrand.create({
        data: {
          code: brandData.code,
          name: brandData.name,
          categoryId: category.id,
        }
      });
      console.log(`  [品牌] ${brandData.name}`);

      for (const pkgName of brandData.packagings) {
        if (packagingMap[pkgName]) {
          await prisma.brandPackaging.create({
            data: { brandId: brand.id, packagingId: packagingMap[pkgName] }
          });
        }
      }

      for (const specName of brandData.specs) {
        if (specMap[specName]) {
          await prisma.brandSpec.create({
            data: { brandId: brand.id, specId: specMap[specName] }
          });
        }
      }
    }
    console.log('');
  }

  console.log('>>> 创建管理员用户...');
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        role: 'ADMIN',
      }
    });
    console.log('创建管理员用户: admin / admin123');
  } else {
    console.log('管理员用户已存在');
  }

  console.log('\n========================================');
  console.log('所有初始化完成！');
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
