export interface AIConfig {
  name: string;
  apiKey: string;
  model: string;
  apiUrl: string;
}

export const aiConfigs: AIConfig[] = [
  {
    name: 'OpenRouter',
    apiKey: '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',
    model: 'openrouter/free',
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions'
  },
  {
    name: 'SiliconFlow',
    apiKey: 'sk-zgplwjaynnfbgmjwvdvtkmpabzhbwwhamxdfusaebuwnlwff',
    model: 'Qwen/Qwen2.5-VL-72B-Instruct',
    apiUrl: 'https://api.siliconflow.cn/v1/chat/completions'
  }
];

// 默认使用的配置索引
export const DEFAULT_CONFIG_INDEX = 1; // 0 for OpenRouter, 1 for SiliconFlow

// 获取当前配置
export const getCurrentConfig = (): AIConfig => {
  // 可以从环境变量或其他地方获取配置索引
  const configIndex = process.env.AI_CONFIG_INDEX ? parseInt(process.env.AI_CONFIG_INDEX) : DEFAULT_CONFIG_INDEX;
  return aiConfigs[configIndex] || aiConfigs[0];
};
