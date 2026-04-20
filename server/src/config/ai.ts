export interface AIConfig {
  name: string;
  apiKey: string;
  model: string;
  visionModel?: string;
  apiUrl: string;
}

export const aiConfigs: AIConfig[] = [
  {
    name: 'SiliconFlow',
    apiKey: 'sk-zgplwjaynnfbgmjwvdvtkmpabzhbwwhamxdfusaebuwnlwff',
    model: 'Qwen/Qwen2.5-72B-Instruct',
    visionModel: 'Qwen/Qwen2.5-VL-72B-Instruct',
    apiUrl: 'https://api.siliconflow.cn/v1/chat/completions'
  }
];

// 默认使用的配置索引
export const DEFAULT_CONFIG_INDEX = 0; // SiliconFlow

// 根据是否需要视觉或工具调用获取配置
export const getAIConfig = (options?: { hasImages?: boolean; hasTools?: boolean }): AIConfig => {
  const baseConfig = aiConfigs[DEFAULT_CONFIG_INDEX] || aiConfigs[0];

  // 工具调用优先使用非视觉模型
  if (options?.hasTools) {
    return {
      ...baseConfig,
      model: baseConfig.model // 使用基础模型（非视觉）
    };
  }

  // 有图片时使用视觉模型
  if (options?.hasImages && baseConfig.visionModel) {
    return {
      ...baseConfig,
      model: baseConfig.visionModel
    };
  }

  return baseConfig;
};
