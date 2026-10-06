// Fallback chain over every provider registered in registry.ts.
// The provider/model the master picked in the admin panel goes first; after
// it, the order of PROVIDERS is the failover order. A provider without its
// env var is skipped, so the chain works with any subset of keys configured.
import type { AIModel, AIProvider } from './base';
import { PROVIDERS } from './registry';
import { getAIPreference, type AIPreference } from '../preference';

interface Elo {
  id: string;
  provider: AIProvider;
  modeloPadrao: string;
}

/** Retry configuration for transient errors (rate limits, 5xx) */
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message;
    if (/timeout|temporarily unavailable|rate limit|try again later|service unavailable/i.test(msg)) return true;
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = MAX_ATTEMPTS): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts && isRetryable(error)) {
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), 10_000);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export class ProviderChain implements AIProvider {
  name = 'Provider Chain';
  private elos: Elo[];

  constructor() {
    this.elos = PROVIDERS.filter((p) => Boolean(process.env[p.envVar])).map((p) => ({
      id: p.id,
      provider: p.criar(process.env[p.envVar] || '', p.baseUrlEnvVar ? process.env[p.baseUrlEnvVar] : undefined),
      modeloPadrao: p.modelos[0],
    }));
  }

  /** Providers actually wired in this deployment, in failover order. */
  get ativos(): string[] {
    return this.elos.map((e) => e.provider.name);
  }

  /**
   * Attempts in order: the preferred provider/model, then every other
   * provider with its own default model.
   */
  tentativas(preferencia: AIPreference | null): Array<{ elo: Elo; modelo: string }> {
    const preferido = preferencia && this.elos.find((e) => e.id === preferencia.providerId);
    const resto = this.elos.filter((e) => e !== preferido).map((elo) => ({ elo, modelo: elo.modeloPadrao }));
    return preferido ? [{ elo: preferido, modelo: preferencia!.modelo }, ...resto] : resto;
  }

  async getModels(): Promise<AIModel[]> {
    const allModels: AIModel[] = [];
    for (const { provider } of this.elos) {
      try {
        allModels.push(...(await provider.getModels()));
      } catch (error) {
        console.warn(`Failed to fetch models from ${provider.name}:`, error);
      }
    }
    return allModels;
  }

  /**
   * @param model - Ignored: model ids are provider-specific, so passing one
   * id to every provider made each fallback fail with "model not found".
   * The model comes from the admin preference or each provider's default.
   */
  async generate(prompt: string, _model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    return (await this.generateDetailed(prompt, maxTokens, temperature)).texto;
  }

  /**
   * Same as generate, also telling which provider/model answered (shown next
   * to AI-written answers so the agent knows where they came from).
   */
  async generateDetailed(
    prompt: string,
    maxTokens: number,
    temperature = 0.7
  ): Promise<{ texto: string; provedor: string; modelo: string }> {
    if (this.elos.length === 0) {
      throw new Error(
        'Nenhum provedor de IA configurado — defina ao menos uma API key (ver .env.local.example).'
      );
    }

    let lastError: Error | null = null;
    for (const { elo, modelo } of this.tentativas(await getAIPreference())) {
      try {
        const texto = await withRetry(() => elo.provider.generate(prompt, modelo, maxTokens, temperature));
        return { texto, provedor: elo.provider.name, modelo };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Provider ${elo.provider.name} (${modelo}) failed, trying next...`, error);
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Like generateDetailed, but asks the first `paralelos` attempts at once and
   * keeps the first answer: one slow free model no longer holds the agent for
   * its whole timeout. The remaining attempts run one by one if all of those fail.
   */
  async generateRapido(
    prompt: string,
    maxTokens: number,
    temperature = 0.7,
    paralelos = 3
  ): Promise<{ texto: string; provedor: string; modelo: string }> {
    if (this.elos.length === 0) {
      throw new Error('Nenhum provedor de IA configurado — defina ao menos uma API key (ver .env.local.example).');
    }

    const tentativas = this.tentativas(await getAIPreference());
    const tentar = async ({ elo, modelo }: { elo: Elo; modelo: string }) => {
      const texto = await withRetry(() => elo.provider.generate(prompt, modelo, maxTokens, temperature));
      if (!texto.trim()) throw new Error(`${elo.provider.name} (${modelo}) respondeu vazio`);
      return { texto, provedor: elo.provider.name, modelo };
    };

    try {
      return await primeiraQueResolver(tentativas.slice(0, paralelos).map(tentar));
    } catch (error) {
      console.warn('First AI attempts failed, trying the rest in order...', error);
    }

    let lastError: unknown = null;
    for (const tentativa of tentativas.slice(paralelos)) {
      try {
        return await tentar(tentativa);
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`All providers failed. Last error: ${lastError instanceof Error ? lastError.message : 'sem resposta'}`);
  }
}

/**
 * First promise to fulfil wins; rejects only when all of them reject
 * (Promise.any, which the ES2020 target doesn't type).
 */
function primeiraQueResolver<T>(promessas: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    if (promessas.length === 0) return reject(new Error('Nenhuma tentativa'));
    let falhas = 0;
    let ultimoErro: unknown;
    for (const promessa of promessas) {
      promessa.then(resolve, (erro) => {
        ultimoErro = erro;
        if (++falhas === promessas.length) reject(ultimoErro);
      });
    }
  });
}