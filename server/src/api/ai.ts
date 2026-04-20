import fs from 'fs';
import path from 'path';
import { getAIConfig } from '../config/ai';

const LOG_FILE = path.join(process.cwd(), 'ai-calls.log');

let logContent = '';

function appendLog(message: string) {
  const timestamp = new Date().toISOString();
  logContent += `[${timestamp}] ${message}\n`;
}

function flushLog() {
  if (logContent) {
    fs.writeFileSync(LOG_FILE, logContent);
  }
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface AIError {
  code: number;
  message: string;
  provider?: string;
  raw?: string;
}

export interface AICallResult {
  success: boolean;
  data?: any;
  hasToolCalls?: boolean;
  toolCalls?: ToolCall[];
  error?: AIError;
}

export async function callAI(
  prompt: string,
  messages?: Array<{role: string; content: string | any[]}>,
  images?: string[],
  tools?: any[]
): Promise<AICallResult> {
  const aiConfig = getAIConfig({
    hasImages: images && images.length > 0,
    hasTools: tools && tools.length > 0
  });
  logContent = '';

  appendLog('========== AI 调用开始 ==========');
  appendLog('AI 输入:');
  appendLog(prompt);
  if (images && images.length > 0) {
    appendLog(`【图片】共 ${images.length} 张`);
  }
  if (tools && tools.length > 0) {
    appendLog(`【工具】共 ${tools.length} 个: ${tools.map(t => t.function.name).join(', ')}`);
  }
  appendLog('----------------------------------');

  try {
    const url = aiConfig.apiUrl;
    const requestMessages: Array<any> = [];

    if (messages && messages.length > 0) {
      appendLog('【历史消息】共 ' + messages.length + ' 条:');
      for (const h of messages) {
        requestMessages.push({ role: h.role, content: h.content });
        const content = typeof h.content === 'string' ? h.content : (h.content ? JSON.stringify(h.content) : '');
        appendLog(`  [${h.role}]: ${content ? content.substring(0, 100) : '(empty)'}${content && content.length > 100 ? '...' : ''}`);
      }
    }

    if (images && images.length > 0) {
      const imageContents = images.map(img => ({
        type: 'image_url',
        image_url: { url: img }
      }));
      requestMessages.push({
        role: 'user',
        content: [{ type: 'text', text: prompt }, ...imageContents]
      });
    } else {
      requestMessages.push({ role: 'user', content: prompt });
    }

    const requestBody: any = {
      model: aiConfig.model,
      messages: requestMessages,
      temperature: 0.3,
      max_tokens: 4000,
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
    }

    const body = JSON.stringify(requestBody);

    appendLog(`正在调用 ${aiConfig.name} API...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`,
        },
        body: body,
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeout);
      if (fetchError.name === 'AbortError') {
        appendLog('AI API timeout (60s)');
        flushLog();
        return { success: false, error: { code: 408, message: 'Request timeout' } };
      }
      throw fetchError;
    }

    clearTimeout(timeout);

    appendLog('Response status: ' + response.status);
    const data: any = await response.json();
    appendLog('Response data: ' + JSON.stringify(data));

    const message = data.choices?.[0]?.message;

    if (!response.ok || !message) {
      const rawError = data.error?.metadata?.raw;
      let rawMessage = '';
      if (typeof rawError === 'string') {
        try {
          const parsedRaw = JSON.parse(rawError);
          rawMessage = parsedRaw.error?.message || rawError;
        } catch {
          rawMessage = rawError;
        }
      }

      const aiError: AIError = {
        code: response.status,
        message: data.error?.message || 'AI request failed',
        provider: data.error?.metadata?.provider_name,
        raw: rawMessage,
      };
      appendLog('AI API error: ' + JSON.stringify(aiError));
      flushLog();
      return { success: false, error: aiError };
    }

    const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;

    if (hasToolCalls) {
      appendLog('========== AI 工具调用 ==========');
      appendLog('Tool calls: ' + JSON.stringify(message.tool_calls));
      appendLog('==================================');
      flushLog();
      return {
        success: true,
        data: message,
        hasToolCalls: true,
        toolCalls: message.tool_calls
      };
    }

    const result = message.content;
    appendLog('========== AI 调用成功 ==========');
    appendLog('AI 输出:');
    appendLog(result);
    appendLog('==================================');
    flushLog();
    return { success: true, data: result };
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || String(error);
    appendLog('========== AI 调用失败 ==========');
    appendLog('Error: ' + errorMessage);
    appendLog('==================================');
    flushLog();
    return { 
      success: false, 
      error: {
        code: 500,
        message: errorMessage,
      }
    };
  }
}

export async function parseAIResponse<T>(prompt: string): Promise<{ success: boolean; data?: T; error?: AIError }> {
  try {
    const result = await callAI(prompt);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }
    const content = result.data;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: { code: 400, message: 'No JSON found in response' } };
    }
    return { success: true, data: JSON.parse(jsonMatch[0]) as T };
  } catch (error: any) {
    return { 
      success: false, 
      error: { 
        code: 500, 
        message: error?.message || 'Unknown error' 
      } 
    };
  }
}
