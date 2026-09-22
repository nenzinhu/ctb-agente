import { AIProvider, AIModel, EmbeddingProvider } from './base';

export class MistralProvider implements AIProvider {
  name = 'Mistral';
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getModels(): Promise<AIModel[]> {
    // Mistral free tier
    return [
      { id: 'mistral-small', name: 'Mistral Small', maxTokens: 8000, costPer1kTokens: 0, isFree: true },
      { id: 'mistral-medium', name: 'Mistral Medium', maxTokens: 8000, costPer1kTokens: 0, isFree: true },
    ];
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
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}

export class MistralEmbedding implements EmbeddingProvider {
  name = 'Mistral Embed';
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-embed',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral Embed API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0]?.embedding || [];
  }
}
