const API_KEY = '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';
const MODEL = 'stepfun/step-3.5-flash:free';

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
  return data.choices?.[0]?.message?.content || '';
}

export async function parseAIResponse<T>(prompt: string): Promise<T | null> {
  const content = await callAI(prompt);
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}
