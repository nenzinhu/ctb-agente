import { AIProvider, AIModel, EmbeddingProvider } from './base';
import { fetchWithTimeout } from './timeout';
import { SISTEMA_PORTUGUES_BR } from '../portugues';

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
    const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SISTEMA_PORTUGUES_BR },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro na API da Mistral: ${response.statusText || `HTTP ${response.status}`}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}

// Statuses worth retrying: rate limiting (the free tier allows very few
// requests per second — a document upload hits it immediately) and
// transient upstream failures.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MistralEmbedding implements EmbeddingProvider {
  name = 'Mistral Embed';
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embed(text: string): Promise<number[]> {
    const [embedding] = await this.embedBatch([text]);
    return embedding;
  }

  /**
   * Embeds several texts in one request (the endpoint accepts an array).
   * One call per chunk turned a single law into hundreds of requests, which
   * tripped Mistral's rate limit and ran past the function timeout.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY não configurada.');
    }

    for (let attempt = 1; ; attempt++) {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/embeddings`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: 'mistral-embed', input: texts }),
        },
        30_000
      );

      if (response.ok) {
        const data = (await response.json()) as { data?: { index?: number; embedding?: number[] }[] };
        const items = [...(data.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        const embeddings = items.map((item) => item.embedding ?? []);
        if (embeddings.length !== texts.length || embeddings.some((e) => e.length === 0)) {
          throw new Error(
            `Mistral Embed devolveu ${embeddings.length} embedding(s) para ${texts.length} texto(s)`
          );
        }
        return embeddings;
      }

      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1);
        await sleep(Math.min(delay, 10_000));
        continue;
      }

      // statusText is empty over HTTP/2, which is what the old
      // "Mistral Embed API error: " (with nothing after it) came from — the
      // body is where Mistral actually says what went wrong.
      const body = await response.text().catch(() => '');
      throw new Error(
        `Mistral Embed API error ${response.status}${response.statusText ? ` ${response.statusText}` : ''}${body ? `: ${body.slice(0, 300)}` : ''}`
      );
    }
  }
}
