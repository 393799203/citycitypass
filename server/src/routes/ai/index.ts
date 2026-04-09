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
2. 从知识库中查找对应意图的数据格式要求
3. 按照格式要求提取用户输入中的信息
4. 返回结构化的JSON数据

## 意图判断关键词

- "订购"、"下单"、"购买"、"买" → create_order（销售订单）
- "采购"、"向XX供应商" → create_purchase_order（采购订单）
- "入库"、"入库到" → create_inbound（入库单）
- "查询"、"多少"、"有没有" → query（查询）

## 数据格式要求

请从知识库中查找对应的数据格式。以下是知识库中的规则：

${context?.join('\n\n') || '知识库中暂无格式规则，请参考以下默认格式：\n\n【销售订单格式】\nintent: create_order\n必需字段: ownerId, receiver, phone, province, city, address\nitems: [{productName, spec, packaging, quantity}]\n\n【采购订单格式】\nintent: create_purchase_order\n必需字段: supplierId\nitems: [{productName, quantity, price}]\n\n【入库单格式】\nintent: create_inbound\n必需字段: warehouseId, items: [{productName, quantity}]'}

## 重要规则

1. 必须只返回JSON，不要任何其他文字
2. 数量必须是数字，不是字符串
3. 地址要拆分：address="详细地址（不含省市）"，province="省份"，city="城市"
4. 如果信息不完整，相关字段填null或留空
5. productName是最重要的字段，必须从用户输入中提取`;
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