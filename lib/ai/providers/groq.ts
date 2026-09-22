import { AIProvider, AIModel } from './base';

export class GroqProvider implements AIProvider {
  name = 'Groq';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getModels(): Promise<AIModel[]> {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const data = await response.json();

    // Filter to only free models (mixtral, llama)
    return (data.data || [])
      .filter((m: any) => ['mixtral', 'llama'].some(name => m.id.includes(name)))
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        maxTokens: 4096,
        costPer1kTokens: 0,
        isFree: true,
      }));
  }

  async generate(prompt: string, model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
