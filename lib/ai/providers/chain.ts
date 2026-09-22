// Fallback chain over every provider registered in registry.ts.
// The order of PROVIDERS is the failover order: fast responders first, then
// the analytical ones. A provider without its env var is skipped, so the
// chain works with any subset of keys configured.
import type { AIModel, AIProvider } from './base';
import { PROVIDERS } from './registry';

export class ProviderChain implements AIProvider {
  name = 'Provider Chain';
  private providers: AIProvider[];

  constructor() {
    this.providers = PROVIDERS.filter((p) => Boolean(process.env[p.envVar])).map((p) =>
      p.criar()
    );
  }

  /** Providers actually wired in this deployment, in failover order. */
  get ativos(): string[] {
    return this.providers.map((p) => p.name);
  }

  async getModels(): Promise<AIModel[]> {
    const allModels: AIModel[] = [];
    for (const provider of this.providers) {
      try {
        const models = await provider.getModels();
        allModels.push(...models);
      } catch (error) {
        console.warn(`Failed to fetch models from ${provider.name}:`, error);
      }
    }
    return allModels;
  }

  async generate(prompt: string, model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      // Skip the model if the chain already knows the current provider does
      // not serve it; otherwise try and fail over on any error.
      try {
        return await provider.generate(prompt, model, maxTokens, temperature);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Provider ${provider.name} failed, trying next...`, error);
        continue;
      }
    }

    throw new Error(
      this.providers.length === 0
        ? 'Nenhum provedor de IA configurado — defina ao menos uma API key (ver .env.local.example).'
        : `All providers failed. Last error: ${lastError?.message}`
    );
  }
}
