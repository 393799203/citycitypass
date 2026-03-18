import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

const alcoholData = {
  alcoholCategories: [
    {
      categoryName: "白酒",
      brands: [
        "茅台", "五粮液", "泸州老窖", "洋河", "汾酒",
        "郎酒", "习酒", "古井贡酒", "剑南春", "舍得",
        "水井坊", "西凤酒", "酒鬼酒", "口子窖", "今世缘",
        "迎驾贡酒", "金种子酒", "董酒", "赖茅", "珍酒"
      ]
    },
    {
      categoryName: "啤酒",
      brands: {
        "国产头部": [
          "青岛啤酒", "雪花啤酒", "燕京啤酒", "百威啤酒（中国）",
          "珠江啤酒", "哈尔滨啤酒", "山城啤酒", "金星啤酒",
          "金威啤酒", "崂山啤酒"
        ],
        "进口主流": [
          "喜力", "科罗娜", "嘉士伯", "福佳白", "教士啤酒",
          "百威（进口）", "健力士", "乐堡", "奥丁格", "柏龙"
        ]
      }
    },
    {
      categoryName: "洋酒",
      brands: {
        "威士忌": ["尊尼获加", "芝华士", "杰克丹尼", "百龄坛", "麦卡伦", "格兰菲迪", "山崎", "白州", "响", "占边"],
        "白兰地": ["轩尼诗", "人头马", "马爹利", "拿破仑", "张裕可雅", "卡慕"],
        "伏特加": ["绝对伏特加", "斯米诺", "灰雁", "深蓝伏特加", "雪树伏特加"],
        "朗姆酒": ["百加得", "摩根船长", "哈瓦那俱乐部", "美雅士"],
        "金酒": ["哥顿金酒", "添加利", "必富达", "孟买蓝宝石"],
        "利口酒": ["百利甜", "君度", "野格", "甘露咖啡"]
      }
    },
    {
      categoryName: "葡萄酒",
      brands: {
        "国产葡萄酒": ["张裕", "长城", "王朝", "威龙", "莫高", "贺兰山", "怡园酒庄", "龙徽", "香格里拉"],
        "进口葡萄酒": ["拉菲", "拉图", "木桐", "玛歌", "侯伯王", "奔富", "杰卡斯", "黄尾袋鼠", "干露", "桃乐丝", "卡思黛乐", "蒙特斯"]
      }
    }
  ]
};

function generateCode(name: string): string {
  const pinyinMap: Record<string, string> = {
    '白酒': 'BAIJIU', '啤酒': 'PIJIU', '洋酒': 'YANGJIU', '葡萄酒': 'PUTAOJIU',
    '茅台': 'MAOTAI', '五粮液': 'WULIANGYE', '泸州老窖': 'LUZHOULAOJIAO',
    '洋河': 'YANGHE', '汾酒': 'FENJIU', '郎酒': 'LANGJIU', '习酒': 'XIJIU',
    '古井贡酒': 'GUJINGGONGJIU', '剑南春': 'JIANNANCHUN', '舍得': 'SHEDE',
    '水井坊': 'SHUIJINGFANG', '西凤酒': 'XIFENGJIU', '酒鬼酒': 'JIUGUIJIU',
    '口子窖': 'KOUZIJIAO', '今世缘': 'JINSHIYUAN', '迎驾贡酒': 'YINGJIAGONGJIU',
    '金种子酒': 'JINZHONGZIJIU', '董酒': 'DONGJIU', '赖茅': 'LAIMAO', '珍酒': 'ZHENJIU',
    '青岛啤酒': 'QINGDAO', '雪花啤酒': 'XUEHUA', '燕京啤酒': 'YANJING',
    '百威啤酒（中国）': 'BUDWEISER_CN', '珠江啤酒': 'ZHUJIANG', '哈尔滨啤酒': 'HAERBIN',
    '山城啤酒': 'SHANCHENG', '金星啤酒': 'JINXING', '金威啤酒': 'JINWEI', '崂山啤酒': 'LAOSHAN',
    '喜力': 'HEINEKEN', '科罗娜': 'CORONA', '嘉士伯': 'CARLSBERG', '福佳白': 'HOEGAARDEN',
    '教士啤酒': 'BRIGITTE', '健力士': 'GUINNESS', '乐堡': 'TUBORG', '奥丁格': 'OETTINGER', '柏龙': 'PAULANER',
    '尊尼获加': 'JOHNNIE_WALKER', '芝华士': 'CHIVAS', '杰克丹尼': 'JACK_DANIELS', '百龄坛': 'BALLANTINES',
    '麦卡伦': 'MACALLAN', '格兰菲迪': 'GLENFIDDICH', '山崎': 'YAMAZAKI', '白州': 'HAKUSHU', '响': 'HIBIKI', '占边': 'JIM_BEAN',
    '轩尼诗': 'HENNESSY', '人头马': 'REMY_MARTIN', '马爹利': 'MARTELL', '拿破仑': 'COURVOISIER',
    '张裕可雅': 'ZHANGYUKAYA', '卡慕': 'CAMUS',
    '绝对伏特加': 'ABSOLUT', '斯米诺': 'SMIRNOFF', '灰雁': 'GREY_GOOSE', '深蓝伏特加': 'SKYY', '雪树伏特加': 'BELVEDERE',
    '百加得': 'BACARDI', '摩根船长': 'CAPTAIN_MORGAN', '哈瓦那俱乐部': 'HAVANA_CLUB', '美雅士': 'MYERS',
    '哥顿金酒': 'GORDON', '添加利': 'TANQUERAY', '必富达': 'BEEFEATER', '孟买蓝宝石': 'BOMBAY',
    '百利甜': 'BAILEYS', '君度': 'COINTREAU', '野格': 'JAGERMEISTER', '甘露咖啡': 'KAHLUA',
    '张裕': 'CHANGYU', '长城': 'CHANGCHENG', '王朝': 'WANGCHAO', '威龙': 'WEILONG', '莫高': 'MOGAO',
    '贺兰山': 'HELANSHAN', '怡园酒庄': 'YIGARDEN', '龙徽': 'LONGHUI', '香格里拉': 'SHANGRI_LA',
    '拉菲': 'LAFITE', '拉图': 'LATOUR', '木桐': 'MOUTON', '玛歌': 'MARGOUX', '侯伯王': 'HAUTBRION',
    '奔富': 'PENFOLDS', '杰卡斯': 'JACOB', '黄尾袋鼠': 'YELLOW_TAIL', '干露': 'CONCHA_Y_TORO',
    '桃乐丝': 'TORRES', '卡思黛乐': 'CASTEL', '蒙特斯': 'MONTES'
  };
  
  return pinyinMap[name] || name.slice(0, 4).toUpperCase();
}

async function main() {
  console.log('开始初始化商品类目和品牌数据...');

  // 清空现有订单相关数据
  await prisma.orderItem.deleteMany();
  console.log('已清空现有订单明细数据');
  
  await prisma.stockLock.deleteMany();
  console.log('已清空现有库存锁定数据');
  
  await prisma.order.deleteMany();
  console.log('已清空现有订单数据');

  // 清空库存数据
  await prisma.stockIn.deleteMany();
  console.log('已清空现有入库记录数据');
  
  await prisma.stock.deleteMany();
  console.log('已清空现有库存数据');

  // 清空现有商品数据（先删除SKU，再删除商品）
  await prisma.productSKU.deleteMany();
  console.log('已清空现有SKU数据');
  
  await prisma.product.deleteMany();
  console.log('已清空现有商品数据');

  // 清空现有品牌数据
  await prisma.productBrand.deleteMany();
  console.log('已清空现有品牌数据');

  // 清空现有分类数据
  await prisma.productCategory.deleteMany();
  console.log('已清空现有分类数据');

  const categoryMap: Record<string, string> = {};

  for (const categoryData of alcoholData.alcoholCategories) {
    // 创建分类
    const category = await prisma.productCategory.create({
      data: {
        code: generateCode(categoryData.categoryName),
        name: categoryData.categoryName,
        sortOrder: alcoholData.alcoholCategories.indexOf(categoryData.categoryName),
      }
    });
    categoryMap[categoryData.categoryName] = category.id;
    console.log(`创建分类: ${categoryData.categoryName}`);

    // 处理品牌数据
    const brands = categoryData.brands as any;
    
    if (Array.isArray(brands)) {
      // 简单数组格式（白酒）
      for (const brandName of brands) {
        await prisma.productBrand.create({
          data: {
            code: generateCode(brandName),
            name: brandName,
            categoryId: category.id,
          }
        });
        console.log(`  - 创建品牌: ${brandName}`);
      }
    } else if (typeof brands === 'object') {
      // 对象格式（啤酒、洋酒、葡萄酒）
      for (const [subCategory, brandList] of Object.entries(brands)) {
        for (const brandName of brandList as string[]) {
          await prisma.productBrand.create({
            data: {
              code: generateCode(brandName),
              name: brandName,
              categoryId: category.id,
              subCategory: subCategory,
            }
          });
          console.log(`  - 创建品牌: ${brandName} (${subCategory})`);
        }
      }
    }
  }

  console.log('数据初始化完成！');

  // 创建管理员用户
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

  console.log('所有初始化完成！');
}

main()
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
