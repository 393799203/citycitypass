import fs from 'fs';
import path from 'path';
import { getCurrentConfig } from '../config/ai';

const LOG_FILE = path.join(process.cwd(), 'ai-calls.log');
const aiConfig = getCurrentConfig();

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

export interface AIError {
  code: number;
  message: string;
  provider?: string;
  raw?: string;
}

export interface AICallResult {
  success: boolean;
  data?: string;
  error?: AIError;
}

export async function callAI(prompt: string): Promise<AICallResult> {
  logContent = '';

  appendLog('========== AI 调用开始 ==========');
  appendLog('AI 输入:');
  appendLog(prompt);
  appendLog('----------------------------------');

  try {
    const url = aiConfig.apiUrl;
    const body = JSON.stringify({
      model: aiConfig.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    appendLog(`正在调用 ${aiConfig.name} API...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body: body,
    });

    appendLog('Response status: ' + response.status);
    const data: any = await response.json();
    appendLog('Response data: ' + JSON.stringify(data));

    if (!response.ok || !data.choices?.[0]?.message?.content) {
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

    const result = data.choices[0].message.content;
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
