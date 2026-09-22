import { EmbeddingProvider } from './providers/base';
import { MistralEmbedding } from './providers/mistral';

export class EmbeddingChain implements EmbeddingProvider {
  name = 'Embedding Chain';
  private providers: EmbeddingProvider[];

  constructor() {
    this.providers = [
      new MistralEmbedding(process.env.MISTRAL_API_KEY || ''),
      // Add more providers as fallback
    ].filter(p => p !== null);
  }

  async embed(text: string): Promise<number[]> {
    for (const provider of this.providers) {
      try {
        return await provider.embed(text);
      } catch (error) {
        console.warn(`${provider.name} failed:`, error);
        continue;
      }
    }
    throw new Error('All embedding providers failed');
  }
}

export const embeddingChain = new EmbeddingChain();
