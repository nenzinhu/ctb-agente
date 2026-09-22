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
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        return await provider.embed(text);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`${provider.name} failed:`, error);
        continue;
      }
    }

    throw new Error(
      lastError
        ? `All embedding providers failed. Last error: ${lastError.message}`
        : 'No embedding providers are configured (set MISTRAL_API_KEY).'
    );
  }
}

export const embeddingChain = new EmbeddingChain();
