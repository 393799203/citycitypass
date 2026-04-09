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

当用户输入与仓储管理相关时，请从知识库中查找对应的数据格式并返回JSON：

${context?.join('\n\n') || '知识库中暂无格式规则，使用以下默认格式：'}

【销售订单格式】
{"intent": "create_order", "type": "sales_order", "data": {"ownerId": null, "receiver": "客户姓名", "phone": "电话", "province": "省份", "city": "城市", "address": "详细地址", "items": [{"productName": "商品名称", "spec": "规格", "packaging": "包装", "quantity": 数量}]}}

【采购订单格式】
{"intent": "create_purchase_order", "type": "purchase_order", "data": {"supplierId": null, "items": [{"productName": "商品名称", "quantity": 数量, "price": 单价}]}}

【入库单格式】
{"intent": "create_inbound", "type": "inbound_order", "data": {"warehouseId": null, "items": [{"productName": "商品名称", "quantity": 数量}]}}

## 重要规则

1. 如果用户输入与仓储管理无关，直接用普通文本回答，不要返回JSON
2. 如果是仓储相关问题，必须只返回JSON，不要任何其他文字
3. 数量必须是数字，不是字符串
4. 地址要拆分：address="详细地址（不含省市）"，province="省份"，city="城市"
5. 如果信息不完整，相关字段填null或留空
6. productName是最重要的字段，必须从用户输入中提取`;
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