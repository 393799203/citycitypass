const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const KNOWLEDGE_BASE = [
  { type: 'product', category: 'product', title: '白酒品牌规格', content: '【白酒】品牌：茅台 规格：500ml/1L 包装：箱(6瓶)/瓶装 | 品牌：五粮液 规格：500ml/1L 包装：箱(6瓶)/瓶装 | 品牌：泸州老窖 规格：500ml/1.5L 包装：箱(6瓶)/瓶装 | 品牌：洋河 规格：500ml 包装：箱(6瓶)/瓶装 | 品牌：汾酒 规格：500ml 包装：箱(6瓶)/瓶装' },
  { type: 'product', category: 'product', title: '啤酒品牌规格', content: '【啤酒】品牌：百威 规格：330ml/500ml 包装：罐装/瓶装/箱(12罐) | 品牌：燕京 规格：330ml/500ml 包装：罐装/瓶装/箱(12罐) | 品牌：青岛 规格：330ml/500ml 包装：罐装/瓶装/箱(12罐)/箱(12瓶)' },
  { type: 'product', category: 'product', title: '葡萄酒品牌规格', content: '【葡萄酒】品牌：长城 规格：750ml/1.5L 包装：瓶装/箱(6瓶) | 品牌：张裕 规格：750ml/1.5L 包装：瓶装/箱(6瓶)' },
  { type: 'product', category: 'product', title: '洋酒品牌规格', content: '【洋酒】品牌：麦卡伦 规格：700ml 包装：瓶装/箱(6瓶) | 品牌：人头马 规格：700ml 包装：瓶装/箱(6瓶) | 品牌：威士忌/白兰地等常见规格为700ml' },
  { type: 'rule', category: 'order', title: '订单状态流转', content: '【订单状态】待确认 → 已确认 → 已发货 → 已收货(完成) | 客户下单后需要确认库存，确认后发货，收货后订单完成' },
  { type: 'rule', category: 'return', title: '退货处理流程', content: '【退货流程】客户申请退货 → 退货中(已发货) → 退货收货 → 验收确认(合格/不合格) → 合格入库/不合格退回 → 退款处理 | 退货商品需要验收，合格品入库，不合格品退回供应商或客户' },
  { type: 'rule', category: 'inventory', title: '库存预警规则', content: '【库存预警】库存低于安全库存时触发预警 | 库存为0时无法继续销售 | 批次效期管理：遵循先进先出原则' },
  { type: 'format', category: 'order', title: '订单创建格式', content: '创建订单格式：{"intent": "create_order", "type": "sales_order", "data": {"customerId": "客户ID", "warehouseId": "仓库ID", "items": [{"productName": "商品名称", "skuId": "SKU ID", "quantity": 数量, "unitPrice": 单价}]}}' },
  { type: 'format', category: 'dispatch', title: '调度配送格式', content: '调度配送格式：{"intent": "create_dispatch", "type": "dispatch_order", "data": {"orderId": "订单ID", "vehicleId": "车辆ID", "driverId": "司机ID", "items": [{"orderItemId": "订单明细ID", "quantity": "数量"}]}}' },
];

async function seedKnowledge() {
  const owners = await prisma.owner.findMany();
  
  for (const owner of owners) {
    console.log('\n=== 为主体 ' + owner.name + ' 初始化知识库 ===');
    
    for (const item of KNOWLEDGE_BASE) {
      try {
        const metadataJson = JSON.stringify({ type: item.type, category: item.category, title: item.title });
        await prisma.$executeRaw`INSERT INTO rag_documents (content, metadata, owner_id) VALUES (${item.content}, ${metadataJson}::jsonb, ${owner.id}::uuid)`;
        console.log('  ✓ ' + item.title);
      } catch (err) {
        console.error('  ✗ ' + item.title + ': ' + err.message);
      }
    }
  }
  
  await prisma.$disconnect();
  console.log('\n=== 知识库初始化完成 ===');
}

seedKnowledge();