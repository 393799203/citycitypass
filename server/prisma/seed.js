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

// 一级分类
const CATEGORIES = [
  { code: 'WINE', name: '酒类', sortOrder: 1 },
  { code: 'BEVERAGE', name: '饮料', sortOrder: 2 },
  { code: 'FOOD', name: '食品', sortOrder: 3 },
  { code: 'DAILY', name: '生活用品', sortOrder: 4 },
];

// 二级分类
const SUBCATEGORIES = [
  { code: 'BAIJIU', name: '白酒', categoryCode: 'WINE' },
  { code: 'YELLOW_WINE', name: '黄酒', categoryCode: 'WINE' },
  { code: 'WINE_RED', name: '葡萄酒', categoryCode: 'WINE' },
  { code: 'BEER', name: '啤酒', categoryCode: 'WINE' },
  { code: 'SOFT_DRINK', name: '软饮料', categoryCode: 'BEVERAGE' },
  { code: 'JUICE', name: '果汁', categoryCode: 'BEVERAGE' },
  { code: 'SNACKS', name: '零食', categoryCode: 'FOOD' },
  { code: 'HOUSEHOLD', name: '家居用品', categoryCode: 'DAILY' },
];

// 品牌 - 现在属于二级分类
const BRANDS = [
  { code: 'MAOTAI', name: '茅台', subCategoryCode: 'BAIJIU', description: '酱香型白酒代表' },
  { code: 'WULIANGYE', name: '五粮液', subCategoryCode: 'BAIJIU', description: '浓香型白酒代表' },
  { code: 'YANGHE', name: '洋河', subCategoryCode: 'BAIJIU', description: '绵柔型白酒' },
  { code: 'LUZHOULAOJAO', name: '泸州老窖', subCategoryCode: 'BAIJIU', description: '浓香型白酒' },
  { code: 'GUOTAI', name: '国台', subCategoryCode: 'BAIJIU', description: '酱香型白酒' },
  { code: 'CHANGYU', name: '张裕', subCategoryCode: 'WINE_RED', description: '葡萄酒' },
  { code: 'PENGWEI', name: '长城', subCategoryCode: 'WINE_RED', description: '葡萄酒' },
  { code: 'TSINGTAO', name: '青岛啤酒', subCategoryCode: 'BEER', description: '啤酒' },
  { code: 'YILI', name: '伊利', subCategoryCode: 'SOFT_DRINK', description: '乳制品饮料' },
];

// 规格 - 现在属于二级分类
const SPECS = [
  // 白酒规格
  { code: 'SPEC_BAIJIU_500ML', name: '500ml', subCategoryCode: 'BAIJIU' },
  { code: 'SPEC_BAIJIU_1L', name: '1L', subCategoryCode: 'BAIJIU' },
  { code: 'SPEC_BAIJIU_2_5L', name: '2.5L', subCategoryCode: 'BAIJIU' },
  { code: 'SPEC_BAIJIU_5L', name: '5L', subCategoryCode: 'BAIJIU' },
  // 啤酒规格
  { code: 'SPEC_BEER_330ML', name: '330ml', subCategoryCode: 'BEER' },
  { code: 'SPEC_BEER_500ML', name: '500ml', subCategoryCode: 'BEER' },
  { code: 'SPEC_BEER_1L', name: '1L', subCategoryCode: 'BEER' },
  // 饮料规格
  { code: 'SPEC_BEVERAGE_250ML', name: '250ml', subCategoryCode: 'SOFT_DRINK' },
  { code: 'SPEC_BEVERAGE_1L', name: '1L', subCategoryCode: 'SOFT_DRINK' },
];

// 包装 - 现在属于二级分类
const PACKAGINGS = [
  // 白酒包装
  { code: 'PKG_BAIJIU_BOTTLE', name: '瓶', subCategoryCode: 'BAIJIU' },
  { code: 'PKG_BAIJIU_BOX_6', name: '箱(6瓶)', subCategoryCode: 'BAIJIU' },
  { code: 'PKG_BAIJIU_BOX_12', name: '箱(12瓶)', subCategoryCode: 'BAIJIU' },
  // 啤酒包装
  { code: 'PKG_BEER_BOTTLE', name: '瓶', subCategoryCode: 'BEER' },
  { code: 'PKG_BEER_CAN', name: '罐', subCategoryCode: 'BEER' },
  { code: 'PKG_BEER_BOX_6', name: '箱(6瓶)', subCategoryCode: 'BEER' },
  { code: 'PKG_BEER_BOX_24', name: '箱(24瓶)', subCategoryCode: 'BEER' },
  // 饮料包装
  { code: 'PKG_BEVERAGE_BOX', name: '箱', subCategoryCode: 'SOFT_DRINK' },
];

async function seedRoles() {
  console.log('\nSeeding roles...');

  for (const role of ROLES) {
    try {
      const found = await prisma.role.findUnique({
        where: { code: role.code }
      });

      if (found) {
        console.log(`  ${role.code}: already exists`);
      } else {
        await prisma.role.create({ data: role });
        console.log(`  ${role.code}: created`);
      }
    } catch (err) {
      console.error(`  ${role.code}: error - ${err.message}`);
    }
  }
}

async function seedCategories() {
  console.log('\nSeeding product categories (一级分类)...');

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
  console.log('\nSeeding product subcategories (二级分类)...');

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
        } else {
          console.log(`  ${sub.code}: category ${sub.categoryCode} not found`);
        }
      }
    } catch (err) {
      console.error(`  ${sub.code}: error - ${err.message}`);
    }
  }
}

async function seedBrands() {
  console.log('\nSeeding product brands (品牌)...');

  for (const brand of BRANDS) {
    try {
      const found = await prisma.productBrand.findUnique({
        where: { code: brand.code }
      });

      if (found) {
        console.log(`  ${brand.code}: already exists`);
      } else {
        const subCategory = await prisma.productSubCategory.findUnique({
          where: { code: brand.subCategoryCode }
        });

        if (subCategory) {
          await prisma.productBrand.create({
            data: {
              code: brand.code,
              name: brand.name,
              subCategoryId: subCategory.id,
              description: brand.description,
            }
          });
          console.log(`  ${brand.code}: created`);
        } else {
          console.log(`  ${brand.code}: subCategory ${brand.subCategoryCode} not found`);
        }
      }
    } catch (err) {
      console.error(`  ${brand.code}: error - ${err.message}`);
    }
  }
}

async function seedSpecs() {
  console.log('\nSeeding spec options (规格)...');

  for (const spec of SPECS) {
    try {
      const found = await prisma.specOption.findUnique({
        where: { code: spec.code }
      });

      if (found) {
        console.log(`  ${spec.code}: already exists`);
      } else {
        await prisma.specOption.create({
          data: {
            code: spec.code,
            name: spec.name,
          }
        });
        console.log(`  ${spec.code}: created`);
      }
    } catch (err) {
      console.error(`  ${spec.code}: error - ${err.message}`);
    }
  }
}

async function seedPackagings() {
  console.log('\nSeeding packaging options (包装)...');

  for (const pkg of PACKAGINGS) {
    try {
      const found = await prisma.packagingOption.findUnique({
        where: { code: pkg.code }
      });

      if (found) {
        console.log(`  ${pkg.code}: already exists`);
      } else {
        await prisma.packagingOption.create({
          data: {
            code: pkg.code,
            name: pkg.name,
          }
        });
        console.log(`  ${pkg.code}: created`);
      }
    } catch (err) {
      console.error(`  ${pkg.code}: error - ${err.message}`);
    }
  }
}

async function seedSubCategorySpecs() {
  console.log('\nSeeding subcategory specs (二级分类-规格关联)...');

  for (const spec of SPECS) {
    try {
      const subCategory = await prisma.productSubCategory.findUnique({
        where: { code: spec.subCategoryCode }
      });
      const specOption = await prisma.specOption.findUnique({
        where: { code: spec.code }
      });

      if (subCategory && specOption) {
        await prisma.subCategorySpec.upsert({
          where: {
            subCategoryId_specId: {
              subCategoryId: subCategory.id,
              specId: specOption.id,
            }
          },
          update: {},
          create: {
            subCategoryId: subCategory.id,
            specId: specOption.id,
          }
        });
        console.log(`  ${spec.code} -> ${spec.subCategoryCode}: created`);
      }
    } catch (err) {
      console.error(`  ${spec.code}: error - ${err.message}`);
    }
  }
}

async function seedSubCategoryPackagings() {
  console.log('\nSeeding subcategory packagings (二级分类-包装关联)...');

  for (const pkg of PACKAGINGS) {
    try {
      const subCategory = await prisma.productSubCategory.findUnique({
        where: { code: pkg.subCategoryCode }
      });
      const packagingOption = await prisma.packagingOption.findUnique({
        where: { code: pkg.code }
      });

      if (subCategory && packagingOption) {
        await prisma.subCategoryPackaging.upsert({
          where: {
            subCategoryId_packagingId: {
              subCategoryId: subCategory.id,
              packagingId: packagingOption.id,
            }
          },
          update: {},
          create: {
            subCategoryId: subCategory.id,
            packagingId: packagingOption.id,
          }
        });
        console.log(`  ${pkg.code} -> ${pkg.subCategoryCode}: created`);
      }
    } catch (err) {
      console.error(`  ${pkg.code}: error - ${err.message}`);
    }
  }
}

async function seedAdminUser() {
  console.log('\nSeeding admin user...');

  try {
    const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });

    if (!adminRole) {
      console.log('  ADMIN role not found, skipping admin user creation');
      return;
    }

    const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (existingAdmin) {
      console.log('  admin user: already exists');
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          name: '系统管理员',
          isAdmin: true,
          phone: '13800138000',
          email: 'admin@example.com',
        }
      });
      console.log('  admin user: created');
    }
  } catch (err) {
    console.error('  seedAdminUser error:', err.message);
  }
}

async function main() {
  console.log('Starting seed...');

  try {
    await seedRoles();
    await seedAdminUser();
    await seedCategories();
    await seedSubCategories();
    await seedBrands();
    await seedSpecs();
    await seedPackagings();
    await seedSubCategorySpecs();
    await seedSubCategoryPackagings();

    console.log('\nSeed completed!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
