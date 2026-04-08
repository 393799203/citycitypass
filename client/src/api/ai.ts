const API_KEY = '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';
const MODEL = 'google/gemma-4-26b-a4b-it:free';

export async function callAI(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.choices?.[0]?.message?.content) {
    console.error('AI API error:', data);
    throw new Error(data.error?.message || 'AI请求失败');
  }

  return data.choices[0].message.content;
}

export async function parseAIResponse<T>(prompt: string): Promise<T | null> {
  try {
    const content = await callAI(prompt);
    console.log('AI response:', content);
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      return null;
    }

    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    console.error('parseAIResponse error:', error);
    throw error;
  }
}
