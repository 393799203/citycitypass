import prisma from './src/lib/prisma';

async function main() {
  console.log('开始更新品牌logo...');

  const logos: Record<string, string> = {
    'MOUTAI': 'https://img.maotai.com/files/images/LOGO.png',
    'WULIANGYE': 'https://www.wuliangye.com.cn/images/logo.png',
    'YANGHE': 'https://www.yanghe.com.cn/images/logo.png',
    'LUZHOULAOJIAO': 'https://www.lzlj.com/images/logo.png',
    'GUJINGGONG': 'https://www.gujing.com/images/logo.png',
    'JIUGUI': 'https://www.jiugui.com/images/logo.png',
  };

  for (const [code, logo] of Object.entries(logos)) {
    await prisma.productBrand.update({
      where: { code },
      data: { logo }
    });
    console.log(`更新 ${code} logo: ${logo}`);
  }

  console.log('品牌logo更新完成！');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
