import { AIProvider, AIModel } from './base';
import { fetchWithTimeout } from './timeout';

export class NVIDIAProvider implements AIProvider {
  name = 'NVIDIA NIM';
  private apiKey: string;
  private baseUrl = 'https://integrate.api.nvidia.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getModels(): Promise<AIModel[]> {
    // NVIDIA NIM free tier includes llama, qwen, etc.
    return [
      { id: 'meta/llama2-70b', name: 'Llama 2 70B', maxTokens: 4096, costPer1kTokens: 0, isFree: true },
      { id: 'meta/llama-3.1-70b', name: 'Llama 3.1 70B', maxTokens: 8192, costPer1kTokens: 0, isFree: true },
      { id: 'qwen/qwen-110b', name: 'Qwen 110B', maxTokens: 4096, costPer1kTokens: 0, isFree: true },
    ];
  }

  async generate(prompt: string, model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
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
      throw new Error(`NVIDIA API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
