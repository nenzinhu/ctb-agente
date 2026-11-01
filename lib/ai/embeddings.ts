import type { EmbeddingProvider } from './providers/base';
import { MistralEmbedding } from './providers/mistral';
import { OpenRouterEmbedding } from './providers/openrouter-embedding';
import { getEmbeddingConfig } from './embedding-config';
import { NEMOTRON_EMBED_MODEL, type EmbeddingModelId } from './embedding-models';

export class EmbeddingChain implements EmbeddingProvider {
  name = 'Modelo vetorial do RAG';

  private async provider(modelo?: EmbeddingModelId): Promise<EmbeddingProvider> {
    const id = modelo ?? (await getEmbeddingConfig()).id;
    return id === NEMOTRON_EMBED_MODEL
      ? new OpenRouterEmbedding(process.env.OPENROUTER_API_KEY || '')
      : new MistralEmbedding(process.env.MISTRAL_API_KEY || '');
  }

  async embed(text: string, modelo?: EmbeddingModelId): Promise<number[]> {
    return (await this.provider(modelo)).embed(text);
  }

  async embedBatch(texts: string[], modelo?: EmbeddingModelId): Promise<number[][]> {
    if (texts.length === 0) return [];
    const provider = await this.provider(modelo);
    // Never fall back across models: their vectors belong to separate spaces.
    return provider.embedBatch!(texts);
  }
}

export const embeddingChain = new EmbeddingChain();
