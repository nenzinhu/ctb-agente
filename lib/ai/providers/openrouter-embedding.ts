import type { EmbeddingProvider } from './base';
import { fetchWithTimeout } from './timeout';
import { EMBEDDING_DIMENSIONS, NEMOTRON_EMBED_MODEL } from '../embedding-models';

interface EmbeddingItem { index: number; embedding: number[] }

function normalizedVector(vector: unknown): number[] {
  if (!Array.isArray(vector) || ![EMBEDDING_DIMENSIONS, 4096].includes(vector.length)
    || vector.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new Error('Nemotron devolveu um vetor inválido; esperadas 1024 ou 4096 dimensões numéricas.');
  }
  // Matryoshka reduction: truncate first, then normalize the retained dimensions.
  const reduced = vector.slice(0, EMBEDDING_DIMENSIONS) as number[];
  const norm = Math.hypot(...reduced);
  if (!Number.isFinite(norm) || norm === 0) throw new Error('Nemotron devolveu um vetor de norma inválida.');
  return reduced.map((value) => value / norm);
}

/** One embedding space for documents and queries, accessed only on the server. */
export class OpenRouterEmbedding implements EmbeddingProvider {
  name = 'NVIDIA Nemotron Embed · OpenRouter';
  constructor(private readonly apiKey: string) {}

  async embed(text: string): Promise<number[]> {
    return (await this.request([text], 'query'))[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.request(texts, 'passage');
  }

  private async request(texts: string[], inputType: 'query' | 'passage'): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (!this.apiKey) throw new Error('OPENROUTER_API_KEY não configurada para o modelo vetorial Nemotron.');
    const deadline = Date.now() + 30_000;
    let response: Response;
    for (let attempt = 0; ; attempt++) {
      response = await fetchWithTimeout('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: NEMOTRON_EMBED_MODEL, input: texts, input_type: inputType,
          dimensions: EMBEDDING_DIMENSIONS, encoding_format: 'float' }),
      }, Math.max(1, deadline - Date.now()));
      // Retry once within the original timeout; never change embedding spaces.
      if (![500, 502, 503, 504, 529].includes(response.status) || attempt >= 1) break;
      const retryAfter = Number(response.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500;
      if (Date.now() + delay + 1_000 >= deadline) break;
      await response.body?.cancel().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (!response.ok) {
      // Upstream bodies can contain submitted text or credentials; never echo them.
      const detail = response.status >= 500
        ? 'Provedor do Nemotron indisponível ou com falha na resposta. Os trechos foram preservados; tente gerar os vetores novamente mais tarde.'
        : response.status === 429
          ? 'Limite temporário do modelo gratuito; tente novamente mais tarde.'
          : [401, 403].includes(response.status)
            ? 'Verifique a chave OpenRouter e as permissões de acesso ao modelo.'
            : 'Verifique a disponibilidade e a configuração do modelo.';
      throw new Error(`OpenRouter Nemotron Embed: erro HTTP ${response.status}. ${detail}`);
    }
    const payload = await response.json() as { data?: EmbeddingItem[]; error?: unknown };
    if (payload.error || !Array.isArray(payload.data) || payload.data.length !== texts.length) {
      throw new Error('Nemotron devolveu um lote de embeddings incompleto.');
    }
    const sorted = [...payload.data].sort((a, b) => a.index - b.index);
    if (sorted.some((item, index) => item.index !== index)) throw new Error('Nemotron devolveu índices inválidos no lote de embeddings.');
    return sorted.map((item) => normalizedVector(item.embedding));
  }
}
