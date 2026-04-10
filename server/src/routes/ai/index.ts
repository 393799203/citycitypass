import { Router, type Request, type Response } from 'express';
import imageRouter from './image';
import ragRouter from './rag';
import { callAI } from '../../api/ai';

const router = Router();

router.use('/image', imageRouter);
router.use('/rag', ragRouter);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'AI service is healthy' });
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, context, structured } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Invalid messages format' });
    }

    const lastMessage = messages[messages.length - 1]?.content || '';

    let systemPrompt: string;
    if (structured) {
      systemPrompt = `你是一个专业的WMS仓储管理系统助手。你的任务是根据用户的自然语言输入，提取结构化的业务数据。

## 工作流程

1. 首先分析用户的输入，判断意图（创建订单/采购订单/入库/查询等）
2. 从知识库中查找对应意图的数据格式要求和商品规格信息
3. 严格按照知识库中的商品规格返回spec和packaging，不要自行编造
4. 返回结构化的JSON数据

## 重要：商品规格匹配规则

如果知识库中包含商品规格信息（如：规格=500ml, 包装=箱(6瓶)），必须：
- items中的spec字段必须从知识库的规格中选取
- items中的packaging字段必须从知识库的包装中选取
- 不要自行编造或修改spec和packaging值

## 意图判断关键词

- "订购"、"下单"、"购买"、"买"、"订" → create_order（**销售订单**：客户向你订购商品）
- "采购"、"向XX供应商采购"、"进货" → create_purchase_order（**采购订单**：你向供应商采购商品）
- "入库"、"入库到" → create_inbound（入库单）
- "查询"、"多少"、"库存" → query（查询）
- 如果用户输入与仓储管理无关（如：你好、天气、闲聊等）→ 返回普通文本回复，不要返回JSON

## 常见错误区分

- "帮XX订购/购买/下单" = create_order（销售订单）
- "向XX供应商采购/进货" = create_purchase_order（采购订单）

## 数据格式要求
若无相关业务数据格式要求，则返回普通文本回复，不要返回JSON。

【销售订单格式】：当用户订购商品时，必须返回此格式：
{"intent": "create_order", "type": "sales_order", "data": {"ownerId": "主体ID", "receiver": "客户姓名", "phone": "电话", "province": "省份", "city": "城市", "address": "详细地址", "items": [{"productName": "商品名称", "spec": "规格", "packaging": "包装", "quantity": 数量}]}}

【采购订单格式】：当用户采购商品时，必须返回此格式：
{"intent": "create_purchase_order", "type": "purchase_order", "data": {"supplierId": "供应商ID", "warehouseId": "仓库ID", "orderDate": "订单日期", "expectedDate": "预计到货日期", "remark": "备注", "items": [{"itemType": "PRODUCT", "skuId": "SKU ID", "bundleId": "套装ID", "quantity": 数量, "price": 单价}]}}

【入库单格式】：当用户创建入库单时，必须返回此格式：
{"intent": "create_inbound", "type": "inbound_order", "data": {"warehouseId": "仓库ID", "source": "来源", "remark": "备注", "items": [{"productName": "商品名称", "type": "PRODUCT", "skuId": "SKU ID", "bundleId": "套装ID", "quantity": 数量}]}}

【其他格式】其他与物流仓库系统有关的业务数据格式要求：
{"intent": "类型", "type": "other", "data": "结果" }

## 重要规则
1. 如果是仓储相关问题，必须只返回JSON，不要任何其他文字
2. 数量必须是数字，不是字符串
3. 地址要拆分：address="详细地址（不含省市）"，province="省份"，city="城市"
4. 如果信息不完整，相关字段填null或留空
5. productName是最重要的字段，必须从用户输入中提取
6. spec和packaging必须从知识库获取，不要自行编造

## 知识库内容

${context?.length > 0 ? '\n\n' + context.join('\n\n') : ''}

## 重要规则

1. 如果是仓储相关问题，必须只返回JSON，不要任何其他文字
2. 数量必须是数字，不是字符串
3. 地址要拆分：address="详细地址（不含省市）"，province="省份"，city="城市"
4. 如果信息不完整，相关字段填null或留空
5. productName是最重要的字段，必须从用户输入中提取
6. **【查询类问题-价格】**：当用户询问进货价/采购价格时：
   - 必须从知识库中找到"采购价格"或"进货"相关的数据
   - 例如知识库中写的是"采购价格：箱(6瓶)约6000元/双瓶约2000元/单瓶约1000元"
   - 必须把这个精准的价格信息填入data字段，问采购价只返回采购价，问销售价就返回销售价
   - data="采购价格：箱(6瓶)约6000元/双瓶约2000元/单瓶约1000元"`;
    } else {
      systemPrompt = `你是一个专业的WMS仓储管理系统助手。基于提供的知识库上下文信息回答用户问题。

知识库内容：
${context?.join('\n\n') || '暂无相关知识库内容'}

请根据知识库内容给出准确、专业的回答。如果知识库中没有相关信息，请说明并给出一般性建议。`;
    }

    const result = await callAI(systemPrompt + '\n\n用户输入：' + lastMessage);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        error: result.error
      });
    }

    res.json({ success: true, data: { content: result.data } });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false, 
      error: {
        code: 500,
        message: error.message || 'Chat failed'
      }
    });
  }
});

export default router;