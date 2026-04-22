import { Router, type Request, type Response } from 'express';
import imageRouter from './image';
import ragRouter from './rag';
import { callAI, ToolCall } from '../../api/ai';
import { inventoryTools, executeTool } from '../../api/tools';

const router = Router();

router.use('/image', imageRouter);
router.use('/rag', ragRouter);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'AI service is healthy' });
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { prompt, history, images, enableTools } = req.body;
    const ownerId = req.headers['x-owner-id'] as string;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid prompt format' });
    }

    let messages: any[] = [];

    if (history && history.length > 0) {
      for (const h of history) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    if (images && images.length > 0) {
      const imageContents = images.map((img: string) => ({
        type: 'image_url' as const,
        image_url: { url: img }
      }));
      messages.push({
        role: 'user',
        content: [{ type: 'text', text: prompt }, ...imageContents]
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const tools = enableTools ? inventoryTools : [];

    const effectiveOwnerId = ownerId && ownerId !== 'null' && ownerId !== 'undefined' ? ownerId : undefined;

    let maxIterations = 5;
    let finalContent = '';

    while (maxIterations > 0) {
      maxIterations--;

      const result = await callAI(prompt, messages, images, tools);

      if (!result.success) {
        return res.status(200).json({
          success: false,
          error: result.error
        });
      }

      const aiMessage = result.data;
      const rawContent = typeof aiMessage === 'string' ? aiMessage : aiMessage.content || '';
      finalContent = rawContent;

      if (!result.hasToolCalls) {
        const contentLower = rawContent.toLowerCase();
        if (contentLower.includes('"tool"') && contentLower.includes('"params"')) {
          try {
            const toolStart = rawContent.indexOf('"tool"');
            const jsonStart = rawContent.lastIndexOf('{', toolStart);
            
            let braceCount = 0;
            let jsonEnd = jsonStart;
            for (let i = jsonStart; i < rawContent.length; i++) {
              if (rawContent[i] === '{') braceCount++;
              else if (rawContent[i] === '}') braceCount--;
              if (braceCount === 0) {
                jsonEnd = i + 1;
                break;
              }
            }
            
            const fullJson = rawContent.substring(jsonStart, jsonEnd);
            const parsed = JSON.parse(fullJson);

            if (parsed.tool && parsed.params) {
              const toolName = parsed.tool;
              const toolParams = { ...parsed.params };

              if (['match_sku', 'match_supplier', 'match_warehouse', 'query_inventory', 'query_owner_stock_summary'].includes(toolName) && effectiveOwnerId) {
                toolParams.ownerId = effectiveOwnerId;
              }

              console.log(`[AI Chat] Tool call found in text: ${toolName}`, toolParams);

              const toolResult = await executeTool(toolName, toolParams);

              const toolResultText = `\n\n[工具执行结果]\n${JSON.stringify(toolResult, null, 2)}\n\n请根据以上结果回答用户的问题。`;

              messages.push({ role: 'assistant', content: rawContent });
              messages.push({ role: 'user', content: toolResultText });

              finalContent = '';
              continue;
            }
          } catch (e) {
            console.log(`[AI Chat] Failed to parse tool call: ${e}`);
          }
        }
        break;
      }

      const toolCalls = result.toolCalls || [];
      const toolResults: Array<{ role: string; tool_call_id: string; name: string; content: string }> = [];

      for (const toolCall of toolCalls) {
        const { id, type, function: fn } = toolCall;
        const { name, arguments: argsStr } = fn;
        const args = JSON.parse(argsStr);

        if (['match_sku', 'match_supplier', 'match_warehouse', 'query_inventory', 'query_owner_stock_summary'].includes(name) && effectiveOwnerId) {
          args.ownerId = effectiveOwnerId;
        }

        console.log(`[AI Chat] Tool call: ${name}`, args);

        const toolResult = await executeTool(name, args);
        toolResults.push({
          role: 'tool',
          tool_call_id: id,
          name,
          content: JSON.stringify(toolResult)
        });
      }

      messages.push({
        role: 'assistant',
        tool_calls: toolCalls
      });

      messages.push(...toolResults);
    }

    res.json({ success: true, data: { content: finalContent } });
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
