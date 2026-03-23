import React from 'react';

interface BrandLogoProps {
  brandCode: string;
  brandName: string;
  size?: 'sm' | 'md' | 'lg';
}

const colorMap: Record<string, string> = {
  // 白酒 - 红色系
  MAOTAI: '#C41E3A',
  WULIANGYE: '#1E90FF',
  LUZHOU: '#FF4500',
  YANGHE: '#4169E1',
  FENJIU: '#DC143C',
  LANGJIU: '#FF6347',
  XIJIU: '#228B22',
  GUJING: '#8B0000',
  JIANNAN: '#B22222',
  SHEDE: '#DAA520',
  SUIJINGFANG: '#8B4513',
  XIFENG: '#FF8C00',
  JIUGUI: '#DC143C',
  KOUZIJIU: '#B8860B',
  JINSHIYUAN: '#FF69B4',
  YINGJIA: '#4169E1',
  JINZHONGZI: '#FF4500',
  DONGJIU: '#8B0000',
  LAIMAO: '#B22222',
  ZHENJIU: '#DC143C',
  
  // 啤酒 - 蓝色系
  QINGDAO: '#006400',
  SNOW: '#1E90FF',
  YANJING: '#00008B',
  BUDWEISER_CN: '#FF0000',
  ZHUHAI: '#4169E1',
  HARBIN: '#FFD700',
  SHANCHENG: '#FF4500',
  JINXING: '#FFD700',
  JINWEI: '#B8860B',
  LAOSHAN: '#228B22',
  HEINEKEN: '#006400',
  CORONA: '#FFD700',
  CARLSBERG: '#FF0000',
  HOEGGAARDEN: '#4169E1',
  FRANZISKANER: '#FFA500',
  BUDWEISER_IMPORT: '#FF0000',
  GUINNESS: '#000000',
  TUBORG: '#4169E1',
  OETTINGER: '#FFD700',
  PAULANER: '#FFA500',
  
  // 葡萄酒 - 紫色/红色系
  CHANGYU: '#8B0000',
  GREATWALL: '#FF0000',
  WANGCHAO: '#4169E1',
  WEILONG: '#228B22',
  MOGAO: '#DAA520',
  HELANSHAN: '#8B4513',
  YIYUAN: '#FF69B4',
  LONGHUI: '#8B0000',
  SHANGRILA: '#DC143C',
  LAFITE: '#000000',
  LATOUR: '#000000',
  MOUTON: '#000000',
  MARGAUX: '#000000',
  HAUTBRION: '#000000',
  PENFOLDS: '#DC143C',
  JACOB: '#FF0000',
  YELLOWTAIL: '#FFD700',
  CONCHA: '#FF0000',
  TORRES: '#FF0000',
  CASTEL: '#4169E1',
  MONTES: '#800080',
  
  // 洋酒 - 威士忌
  JOHNNIEWALKER: '#C0C0C0',
  CHIVAS: '#FF0000',
  JACKDANIEL: '#FFA500',
  BALVENIE: '#DAA520',
  MACALLAN: '#8B4513',
  GLENFIDDICH: '#228B22',
  YAMAZAKI: '#FFD700',
  HAKUSHU: '#228B22',
  HIBIKI: '#FFD700',
  JIMBEAM: '#FFA500',
  
  // 洋酒 - 白兰地
  HENNESSY: '#8B4513',
  REMYMARTIN: '#DAA520',
  MARTELL: '#8B4513',
  COURVOISIER: '#DAA520',
  KAHLUA: '#8B4513',
  CAMUS: '#DAA520',
  
  // 洋酒 - 伏特加
  ABSOLUT: '#000000',
  SMIRNOFF: '#4169E1',
  GREYGOOSE: '#C0C0C0',
  SKOL: '#4169E1',
  BELVEDERE: '#C0C0C0',
  
  // 洋酒 - 朗姆酒
  BACARDI: '#FF0000',
  CAPTAINMORGAN: '#8B4513',
  HAVANA: '#DAA520',
  MYERS: '#8B4513',
  
  // 洋酒 - 金酒
  GORDONS: '#000000',
  TANQUERAY: '#228B22',
  BEEFEATER: '#FF0000',
  BOMBAY: '#4169E1',
  
  // 洋酒 - 利口酒
  BAILEYS: '#8B4513',
  COINTREAU: '#FFA500',
  JAGERMEISTER: '#000000',
};

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
};

export default function BrandLogo({ brandCode, brandName, size = 'md' }: BrandLogoProps) {
  const bgColor = colorMap[brandCode] || '#6B7280';
  const initial = brandName.charAt(0);
  const dimension = sizeMap[size];
  
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{
        backgroundColor: bgColor,
        width: dimension,
        height: dimension,
        fontSize: dimension * 0.5,
      }}
    >
      {initial}
    </div>
  );
}
