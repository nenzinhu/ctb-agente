import { AIProvider, AIModel } from './base';

export class NousProvider implements AIProvider {
  name = 'Nous Portal';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://inference-api.nousresearch.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async getModels(): Promise<AIModel[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const data = await response.json();

    return (data.data || []).map((m: any) => ({
      id: m.id,
      name: m.id,
      maxTokens: m.context_length || 4096,
      costPer1kTokens: 0,
      isFree: true,
    }));
  }

  async generate(prompt: string, model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
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
      throw new Error(`Nous Portal API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
