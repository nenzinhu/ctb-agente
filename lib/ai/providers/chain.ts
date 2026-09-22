import { AIProvider, AIModel } from './base';
import { GroqProvider } from './groq';
import { NVIDIAProvider } from './nvidia';
import { OpenRouterProvider } from './openrouter';
import { MistralProvider } from './mistral';

export class ProviderChain implements AIProvider {
  name = 'Provider Chain';
  private providers: AIProvider[];
  private currentProviderIndex = 0;

  constructor() {
    this.providers = [
      new GroqProvider(process.env.GROQ_API_KEY || ''),
      new NVIDIAProvider(process.env.NVIDIA_API_KEY || ''),
      new OpenRouterProvider(process.env.OPENROUTER_API_KEY || ''),
      new MistralProvider(process.env.MISTRAL_API_KEY || ''),
    ].filter(p => p !== null);
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

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      try {
        return await provider.generate(prompt, model, maxTokens, temperature);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Provider ${provider.name} failed, trying next...`, error);
        continue;
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }
}
