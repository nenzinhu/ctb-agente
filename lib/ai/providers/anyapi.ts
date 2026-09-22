import { AIProvider, AIModel } from './base';

/**
 * OpenAI-compatible endpoint with no fixed base URL — must be set via
 * ANYAPI_BASE_URL (see .env.local.example).
 */
export class AnyApiProvider implements AIProvider {
  name = 'AnyAPI';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
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
    if (!this.baseUrl) {
      throw new Error('ANYAPI_BASE_URL não configurada');
    }

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
      throw new Error(`AnyAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
