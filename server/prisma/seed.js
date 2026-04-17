const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ROLES = [
  {
    code: 'ADMIN',
    name: '系统管理员',
    description: '跨所有主体，拥有最高权限，可以看所有主体的数据',
    permissions: {
      business: { orders: 'WRITE', outbound: 'WRITE', dispatch: 'WRITE', returns: 'WRITE', inventory: 'WRITE', batch: 'WRITE', purchases: 'WRITE', inbound: 'WRITE', transfer: 'WRITE', transport: 'WRITE' },
      config: { warehouses: 'WRITE', products: 'WRITE', customers: 'WRITE', suppliers: 'WRITE', carriers: 'WRITE' },
      system: { system: 'WRITE' },
    },
    isDefault: true,
  },
  {
    code: 'OWNER',
    name: '主体拥有者',
    description: '该主体的最高权限，可以管理该主体的所有业务',
    permissions: {
      business: { orders: 'WRITE', outbound: 'WRITE', dispatch: 'WRITE', returns: 'WRITE', inventory: 'WRITE', batch: 'WRITE', purchases: 'WRITE', inbound: 'WRITE', transfer: 'WRITE', transport: 'WRITE' },
      config: { warehouses: 'WRITE', products: 'WRITE', customers: 'WRITE', suppliers: 'WRITE', carriers: 'WRITE' },
      system: { system: 'READ' },
    },
    isDefault: true,
  },
  {
    code: 'MANAGER',
    name: '管理员',
    description: '某主体内的全部权限，只能看自己所属主体的数据',
    permissions: {
      business: { orders: 'WRITE', outbound: 'WRITE', dispatch: 'WRITE', returns: 'WRITE', inventory: 'WRITE', batch: 'WRITE', purchases: 'WRITE', inbound: 'WRITE', transfer: 'WRITE', transport: 'WRITE' },
      config: { warehouses: 'WRITE', products: 'WRITE', customers: 'WRITE', suppliers: 'WRITE', carriers: 'WRITE' },
      system: { system: 'NONE' },
    },
    isDefault: true,
  },
  {
    code: 'WAREHOUSE_MANAGER',
    name: '仓储管理',
    description: '负责仓库运营管理，拥有WMS全部功能权限',
    permissions: {
      business: { orders: 'READ', outbound: 'WRITE', dispatch: 'READ', returns: 'READ', inventory: 'WRITE', batch: 'WRITE', purchases: 'WRITE', inbound: 'WRITE', transfer: 'WRITE', transport: 'READ' },
      config: { warehouses: 'WRITE', products: 'WRITE', customers: 'READ', suppliers: 'WRITE', carriers: 'READ' },
      system: { system: 'NONE' },
    },
    isDefault: true,
  },
  {
    code: 'TRANSPORT_MANAGER',
    name: '运力管理',
    description: '负责配送调度管理，拥有TMS全部功能权限',
    permissions: {
      business: { orders: 'READ', outbound: 'READ', dispatch: 'WRITE', returns: 'READ', inventory: 'READ', batch: 'READ', purchases: 'READ', inbound: 'READ', transfer: 'NONE', transport: 'WRITE' },
      config: { warehouses: 'READ', products: 'READ', customers: 'READ', suppliers: 'READ', carriers: 'WRITE' },
      system: { system: 'NONE' },
    },
    isDefault: true,
  },
  {
    code: 'AFTER_SALES_MANAGER',
    name: '售后管理',
    description: '负责退货和客服管理，拥有售后模块全部权限',
    permissions: {
      business: { orders: 'READ', outbound: 'READ', dispatch: 'READ', returns: 'WRITE', inventory: 'READ', batch: 'READ', purchases: 'READ', inbound: 'READ', transfer: 'NONE', transport: 'READ' },
      config: { warehouses: 'READ', products: 'READ', customers: 'READ', suppliers: 'READ', carriers: 'READ' },
      system: { system: 'NONE' },
    },
    isDefault: true,
  },
  {
    code: 'GUEST',
    name: '访客',
    description: '外部人员查看，仅有查看权限',
    permissions: {
      business: { orders: 'READ', outbound: 'READ', dispatch: 'READ', returns: 'READ', inventory: 'READ', batch: 'READ', purchases: 'READ', inbound: 'READ', transfer: 'READ', transport: 'READ' },
      config: { warehouses: 'READ', products: 'READ', customers: 'READ', suppliers: 'READ', carriers: 'READ' },
      system: { system: 'NONE' },
    },
    isDefault: true,
  },
];

const CATEGORIES = [
  { code: 'BAIJIU', name: '白酒', sortOrder: 1 },
  { code: 'BEER', name: '啤酒', sortOrder: 2 },
  { code: 'WINE', name: '葡萄酒', sortOrder: 3 },
  { code: 'SPIRITS', name: '洋酒', sortOrder: 4 },
  { code: 'BEVERAGE', name: '饮料', sortOrder: 5 },
];

const SUBCATEGORIES = [
  { code: 'BAIJIU_JIANG', name: '酱香型', categoryCode: 'BAIJIU' },
  { code: 'BAIJIU_NONG', name: '浓香型', categoryCode: 'BAIJIU' },
  { code: 'BAIJIU_QING', name: '清香型', categoryCode: 'BAIJIU' },
  { code: 'BEER_LAGER', name: '拉格', categoryCode: 'BEER' },
  { code: 'BEER_ALE', name: '艾尔', categoryCode: 'BEER' },
  { code: 'BEER_PILS', name: '皮尔森', categoryCode: 'BEER' },
  { code: 'WINE_HONG', name: '红酒', categoryCode: 'WINE' },
  { code: 'WINE_BAI', name: '白葡萄酒', categoryCode: 'WINE' },
  { code: 'WINE_QIP', name: '起泡酒', categoryCode: 'WINE' },
  { code: 'SPIRITS_WHISKY', name: '威士忌', categoryCode: 'SPIRITS' },
  { code: 'SPIRITS_BRANnY', name: '白兰地', categoryCode: 'SPIRITS' },
  { code: 'SPIRITS_VODKA', name: '伏特加', categoryCode: 'SPIRITS' },
  { code: 'SPIRITS_RUM', name: '朗姆酒', categoryCode: 'SPIRITS' },
  { code: 'SPIRITS_GIN', name: '金酒', categoryCode: 'SPIRITS' },
  { code: 'BEVERAGE_YINLIAO', name: '饮料类', categoryCode: 'BEVERAGE' },
];

const BRANDS = [
  { code: 'MOUTAI', name: '茅台', categoryCode: 'BAIJIU', description: '贵州茅台酒' },
  { code: 'WULIANGYE', name: '五粮液', categoryCode: 'BAIJIU', description: '五粮液集团' },
  { code: 'LUZHOU', name: '泸州老窖', categoryCode: 'BAIJIU', description: '泸州老窖股份有限公司' },
  { code: 'YANGHE', name: '洋河', categoryCode: 'BAIJIU', description: '洋河酒厂' },
  { code: 'FENJIU', name: '汾酒', categoryCode: 'BAIJIU', description: '汾酒集团' },
  { code: 'BAIWEI', name: '百威', categoryCode: 'BEER', description: '百威啤酒' },
  { code: 'YANJING', name: '燕京', categoryCode: 'BEER', description: '燕京啤酒' },
  { code: 'TSINGTAO', name: '青岛', categoryCode: 'BEER', description: '青岛啤酒' },
  { code: 'CHANGCHENG', name: '长城', categoryCode: 'WINE', description: '中粮长城葡萄酒' },
  { code: 'ZHANGYU', name: '张裕', categoryCode: 'WINE', description: '张裕葡萄酒' },
  { code: 'MACALLAN', name: '麦卡伦', categoryCode: 'SPIRITS', description: '苏格兰威士忌' },
  { code: 'REMY', name: '人头马', categoryCode: 'SPIRITS', description: '法国白兰地' },
];

const SPECS = [
  { code: '100ML', name: '100ml', sortOrder: 1 },
  { code: '250ML', name: '250ml', sortOrder: 2 },
  { code: '330ML', name: '330ml', sortOrder: 3 },
  { code: '375ML', name: '375ml', sortOrder: 4 },
  { code: '500ML', name: '500ml', sortOrder: 5 },
  { code: '700ML', name: '700ml', sortOrder: 6 },
  { code: '750ML', name: '750ml', sortOrder: 7 },
  { code: '1L', name: '1L', sortOrder: 8 },
  { code: '1.5L', name: '1.5L', sortOrder: 9 },
];

const PACKAGINGS = [
  { code: 'PING', name: '瓶', sortOrder: 1 },
  { code: 'GUAN', name: '罐', sortOrder: 2 },
  { code: 'XIANG_6_PING', name: '箱(6瓶)', sortOrder: 3 },
  { code: 'XIANG_12_PING', name: '箱(12瓶)', sortOrder: 4 },
  { code: 'XIANG_12_GUAN', name: '箱(12罐)', sortOrder: 5 },
];

async function seedRoles() {
  console.log('Seeding roles...');
  let created = 0;
  let existing = 0;

  for (const role of ROLES) {
    try {
      const found = await prisma.role.findUnique({
        where: { code: role.code }
      });

      if (found) {
        console.log(`  ${role.code}: already exists`);
        existing++;
      } else {
        await prisma.role.create({ data: role });
        console.log(`  ${role.code}: created`);
        created++;
      }
    } catch (err) {
      console.error(`  ${role.code}: error - ${err.message}`);
    }
  }

  console.log(`Roles: ${created} created, ${existing} existing`);
}

async function createAdminUser() {
  console.log('\nCreating admin user...');

  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (existingAdmin) {
    console.log('  admin: already exists');
  } else {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        isAdmin: true,
      }
    });
    console.log('  admin: created (password: admin123)');
  }
}

async function seedCategories() {
  console.log('\nSeeding product categories...');

  for (const cat of CATEGORIES) {
    try {
      const found = await prisma.productCategory.findUnique({
        where: { code: cat.code }
      });

      if (found) {
        console.log(`  ${cat.code}: already exists`);
      } else {
        await prisma.productCategory.create({ data: cat });
        console.log(`  ${cat.code}: created`);
      }
    } catch (err) {
      console.error(`  ${cat.code}: error - ${err.message}`);
    }
  }
}

async function seedSubCategories() {
  console.log('\nSeeding product subcategories...');

  for (const sub of SUBCATEGORIES) {
    try {
      const found = await prisma.productSubCategory.findUnique({
        where: { code: sub.code }
      });

      if (found) {
        console.log(`  ${sub.code}: already exists`);
      } else {
        const category = await prisma.productCategory.findUnique({
          where: { code: sub.categoryCode }
        });

        if (category) {
          await prisma.productSubCategory.create({
            data: {
              code: sub.code,
              name: sub.name,
              categoryId: category.id,
            }
          });
          console.log(`  ${sub.code}: created`);
        }
      }
    } catch (err) {
      console.error(`  ${sub.code}: error - ${err.message}`);
    }
  }
}

async function seedBrands() {
  console.log('\nSeeding product brands...');

  for (const brand of BRANDS) {
    try {
      const found = await prisma.productBrand.findUnique({
        where: { code: brand.code }
      });

      if (found) {
        console.log(`  ${brand.code}: already exists`);
      } else {
        const category = await prisma.productCategory.findUnique({
          where: { code: brand.categoryCode }
        });

        if (category) {
          await prisma.productBrand.create({
            data: {
              code: brand.code,
              name: brand.name,
              categoryId: category.id,
              description: brand.description,
            }
          });
          console.log(`  ${brand.code}: created`);
        }
      }
    } catch (err) {
      console.error(`  ${brand.code}: error - ${err.message}`);
    }
  }
}

async function seedSpecs() {
  console.log('\nSeeding spec options...');

  for (const spec of SPECS) {
    try {
      const found = await prisma.specOption.findUnique({
        where: { code: spec.code }
      });

      if (found) {
        console.log(`  ${spec.code}: already exists`);
      } else {
        await prisma.specOption.create({ data: spec });
        console.log(`  ${spec.code}: created`);
      }
    } catch (err) {
      console.error(`  ${spec.code}: error - ${err.message}`);
    }
  }
}

async function seedPackagings() {
  console.log('\nSeeding packaging options...');

  for (const pkg of PACKAGINGS) {
    try {
      const found = await prisma.packagingOption.findUnique({
        where: { code: pkg.code }
      });

      if (found) {
        console.log(`  ${pkg.code}: already exists`);
      } else {
        await prisma.packagingOption.create({ data: pkg });
        console.log(`  ${pkg.code}: created`);
      }
    } catch (err) {
      console.error(`  ${pkg.code}: error - ${err.message}`);
    }
  }
}

async function seedBrandPackagings() {
  console.log('\nSeeding brand-packaging relations...');

  const brandPackagings = [
    { brandCode: 'MOUTAI', packagingCode: 'PING' },
    { brandCode: 'MOUTAI', packagingCode: 'XIANG_6_PING' },
    { brandCode: 'WULIANGYE', packagingCode: 'PING' },
    { brandCode: 'WULIANGYE', packagingCode: 'XIANG_6_PING' },
    { brandCode: 'LUZHOU', packagingCode: 'PING' },
    { brandCode: 'LUZHOU', packagingCode: 'XIANG_6_PING' },
    { brandCode: 'YANGHE', packagingCode: 'PING' },
    { brandCode: 'YANGHE', packagingCode: 'XIANG_6_PING' },
    { brandCode: 'FENJIU', packagingCode: 'PING' },
    { brandCode: 'FENJIU', packagingCode: 'XIANG_6_PING' },
    { brandCode: 'BAIWEI', packagingCode: 'GUAN' },
    { brandCode: 'BAIWEI', packagingCode: 'PING' },
    { brandCode: 'BAIWEI', packagingCode: 'XIANG_12_GUAN' },
    { brandCode: 'YANJING', packagingCode: 'GUAN' },
    { brandCode: 'YANJING', packagingCode: 'PING' },
    { brandCode: 'YANJING', packagingCode: 'XIANG_12_GUAN' },
    { brandCode: 'TSINGTAO', packagingCode: 'GUAN' },
    { brandCode: 'TSINGTAO', packagingCode: 'PING' },
    { brandCode: 'TSINGTAO', packagingCode: 'XIANG_12_GUAN' },
    { brandCode: 'TSINGTAO', packagingCode: 'XIANG_12_PING' },
    { brandCode: 'CHANGCHENG', packagingCode: 'PING' },
    { brandCode: 'CHANGCHENG', packagingCode: 'XIANG_6_PING' },
    { brandCode: 'ZHANGYU', packagingCode: 'PING' },
    { brandCode: 'ZHANGYU', packagingCode: 'XIANG_6_PING' },
    { brandCode: 'MACALLAN', packagingCode: 'PING' },
    { brandCode: 'MACALLAN', packagingCode: 'XIANG_6_PING' },
    { brandCode: 'REMY', packagingCode: 'PING' },
    { brandCode: 'REMY', packagingCode: 'XIANG_6_PING' },
  ];

  for (const bp of brandPackagings) {
    try {
      const brand = await prisma.productBrand.findUnique({ where: { code: bp.brandCode } });
      const packaging = await prisma.packagingOption.findUnique({ where: { code: bp.packagingCode } });

      if (brand && packaging) {
        const existing = await prisma.brandPackaging.findUnique({
          where: { brandId_packagingId: { brandId: brand.id, packagingId: packaging.id } }
        });

        if (existing) {
          console.log(`  ${bp.brandCode}-${bp.packagingCode}: already exists`);
        } else {
          await prisma.brandPackaging.create({
            data: { brandId: brand.id, packagingId: packaging.id }
          });
          console.log(`  ${bp.brandCode}-${bp.packagingCode}: created`);
        }
      }
    } catch (err) {
      console.error(`  ${bp.brandCode}-${bp.packagingCode}: error - ${err.message}`);
    }
  }
}

async function seedBrandSpecs() {
  console.log('\nSeeding brand-spec relations...');

  const brandSpecs = [
    { brandCode: 'MOUTAI', specCode: '500ML' },
    { brandCode: 'MOUTAI', specCode: '1L' },
    { brandCode: 'WULIANGYE', specCode: '500ML' },
    { brandCode: 'WULIANGYE', specCode: '1L' },
    { brandCode: 'LUZHOU', specCode: '500ML' },
    { brandCode: 'LUZHOU', specCode: '1.5L' },
    { brandCode: 'YANGHE', specCode: '500ML' },
    { brandCode: 'FENJIU', specCode: '500ML' },
    { brandCode: 'BAIWEI', specCode: '330ML' },
    { brandCode: 'BAIWEI', specCode: '500ML' },
    { brandCode: 'YANJING', specCode: '330ML' },
    { brandCode: 'YANJING', specCode: '500ML' },
    { brandCode: 'TSINGTAO', specCode: '330ML' },
    { brandCode: 'TSINGTAO', specCode: '500ML' },
    { brandCode: 'CHANGCHENG', specCode: '750ML' },
    { brandCode: 'CHANGCHENG', specCode: '1.5L' },
    { brandCode: 'ZHANGYU', specCode: '750ML' },
    { brandCode: 'ZHANGYU', specCode: '1.5L' },
    { brandCode: 'MACALLAN', specCode: '700ML' },
    { brandCode: 'REMY', specCode: '700ML' },
  ];

  for (const bs of brandSpecs) {
    try {
      const brand = await prisma.productBrand.findUnique({ where: { code: bs.brandCode } });
      const spec = await prisma.specOption.findUnique({ where: { code: bs.specCode } });

      if (brand && spec) {
        const existing = await prisma.brandSpec.findUnique({
          where: { brandId_specId: { brandId: brand.id, specId: spec.id } }
        });

        if (existing) {
          console.log(`  ${bs.brandCode}-${bs.specCode}: already exists`);
        } else {
          await prisma.brandSpec.create({
            data: { brandId: brand.id, specId: spec.id }
          });
          console.log(`  ${bs.brandCode}-${bs.specCode}: created`);
        }
      }
    } catch (err) {
      console.error(`  ${bs.brandCode}-${bs.specCode}: error - ${err.message}`);
    }
  }
}

async function main() {
  console.log('=== 项目初始化 ===\n');
  await seedRoles();
  await createAdminUser();
  await seedCategories();
  await seedSubCategories();
  await seedBrands();
  await seedSpecs();
  await seedPackagings();
  await seedBrandPackagings();
  await seedBrandSpecs();
  await prisma.$disconnect();
  console.log('\n=== 初始化完成 ===');
}

main();
