// Fixed allowlist of text-generation providers and models. Mistral is kept
// outside this registry because it is used exclusively for embeddings.
import { GroqProvider } from './groq';
import { OpenRouterProvider } from './openrouter';
import { OpenAICompatibleProvider } from './openai-compatible';
import type { AIProvider } from './base';
import { getProviderHealth, recordProviderFailure, recordProviderSuccess, type ProviderHealth } from './health';

export interface ProviderDescriptor {
  id: string;
  nome: string;
  envVar: string;
  /** Free-tier models this provider offers, most recommended first. */
  modelos: string[];
  papel: 'resposta rapida' | 'resposta analitica' | 'embeddings';
  /** Where to create a free key ('' when unknown). */
  cadastro: string;
  baseUrlEnvVar?: string;
  criar: (apiKey: string, baseUrl?: string) => AIProvider;
  /** Max attempts per call (retry on transient failures) */
  maxAttempts?: number;
  /** Per-call timeout in ms */
  timeoutMs?: number;
}

// Default values for provider configuration (overridden by settings).
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_ATTEMPTS = 3;

let timeoutMsCache: number = DEFAULT_TIMEOUT_MS;
let maxAttemptsCache: number = DEFAULT_MAX_ATTEMPTS;
let configCacheTs = 0;
const CONFIG_CACHE_TTL = 60_000;

export async function loadProviderConfig(): Promise<{ timeoutMs: number; maxAttempts: number }> {
  const now = Date.now();
  if (configCacheTs > 0 && now - configCacheTs < CONFIG_CACHE_TTL) {
    return { timeoutMs: timeoutMsCache, maxAttempts: maxAttemptsCache };
  }
  try {
    const { getSettings } = await import('../../config/settings');
    const s = await getSettings();
    timeoutMsCache = s.providerTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    maxAttemptsCache = s.providerMaxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  } catch {
    timeoutMsCache = DEFAULT_TIMEOUT_MS;
    maxAttemptsCache = DEFAULT_MAX_ATTEMPTS;
  }
  configCacheTs = now;
  return { timeoutMs: timeoutMsCache, maxAttempts: maxAttemptsCache };
}

export function invalidateProviderConfig(): void {
  configCacheTs = 0;
}

export const PROVIDERS: ProviderDescriptor[] = [
  {
    id: 'groq',
    nome: 'Groq',
    envVar: 'GROQ_API_KEY',
    modelos: [
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
    ],
    papel: 'resposta rapida',
    cadastro: 'https://console.groq.com/keys',
    criar: (apiKey) => new GroqProvider(apiKey),
  },
  {
    id: 'cerebras',
    nome: 'Cerebras',
    envVar: 'CEREBRAS_API_KEY',
    modelos: ['qwen-3.8-27b', 'gpt-oss-120b'],
    papel: 'resposta rapida',
    cadastro: 'https://cloud.cerebras.ai',
    criar: (apiKey, _baseUrl) =>
      new OpenAICompatibleProvider({
        name: 'Cerebras',
        apiKey,
        baseUrl: 'https://api.cerebras.ai/v1',
      }),
  },
  {
    id: 'cohere',
    nome: 'Cohere',
    envVar: 'COHERE_API_KEY',
    modelos: ['c4ai-aya-vision-32b', 'command-a-03-2025', 'command-a-plus-05-2026'],
    papel: 'resposta analitica',
    cadastro: 'https://dashboard.cohere.com/api-keys',
    criar: (apiKey) =>
      new OpenAICompatibleProvider({
        name: 'Cohere',
        apiKey,
        baseUrl: 'https://api.cohere.ai/compatibility/v1',
      }),
  },
  {
    id: 'openrouter',
    nome: 'OpenRouter (modelos :free)',
    envVar: 'OPENROUTER_API_KEY',
    modelos: [
      'poolside/laguna-s-2.1:free',
      'thinking-machines/inkling:free',
      'cohere/north-mini-code:free',
      'thinking-machines/inkling-small:free',
      'poolside/laguna-xs-2.1:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b:free',
      'liquid/lfm-2.5-2.6b:free',
      'google/gemma-4-26b-a4b:free',
      'google/gemma-4-31b:free',
    ],
    papel: 'resposta analitica',
    cadastro: 'https://openrouter.ai/keys',
    criar: (apiKey) => new OpenRouterProvider(apiKey),
  },
];

export interface ProviderStatus {
  id: string;
  nome: string;
  envVar: string;
  modeloPadrao: string;
  modelos: string[];
  papel: string;
  cadastro: string;
  ordem: number;
  configurado: boolean;
  saude: ProviderHealth;
}

/**
 * Status of every provider in the fallback chain
 * @returns Provider descriptors with configuration status
 */
export function listProviders(): ProviderStatus[] {
  return PROVIDERS.map((provider, index) => ({
    id: provider.id,
    nome: provider.nome,
    envVar: provider.envVar,
    modeloPadrao: provider.modelos[0],
    modelos: provider.modelos,
    papel: provider.papel,
    cadastro: provider.cadastro,
    ordem: index + 1,
    configurado: Boolean(process.env[provider.envVar]),
    saude: getProviderHealth(provider.id),
  }));
}

/** Confirms that a model belongs to the provider's fixed allowlist. */
export function modeloPermitido(providerId: string, modelo: string): boolean {
  return PROVIDERS.some((provider) => provider.id === providerId && provider.modelos.includes(modelo));
}

export interface PingResult {
  provider: string;
  ok: boolean;
  modeloUsado: string;
  latenciaMs: number;
  resposta?: string;
  erro?: string;
}

/**
 * Race a promise against a timeout
 * @param promise - Promise to await
 * @param ms - Timeout in milliseconds
 * @returns The promise result
 */
async function withTimeoutLocal<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout ao contatar o provedor')), ms)
    ),
  ]);
}

/**
 * Generate a trivial completion to prove the provider/model works end to end
 * @param providerId - Provider identifier
 * @param modelo - Model to test (defaults to the provider's first model)
 * @returns Ping result, never throws
 */
export async function pingProvider(providerId: string, modelo?: string): Promise<PingResult> {
  const descriptor = PROVIDERS.find((p) => p.id === providerId);
  const inicio = Date.now();

  if (!descriptor) {
    return {
      provider: providerId,
      ok: false,
      modeloUsado: '',
      latenciaMs: 0,
      erro: 'Provedor desconhecido',
    };
  }

  const modeloUsado = modelo || descriptor.modelos[0];

  if (!descriptor.modelos.includes(modeloUsado)) {
    return {
      provider: descriptor.nome,
      ok: false,
      modeloUsado,
      latenciaMs: 0,
      erro: 'Modelo não autorizado para este provedor.',
    };
  }

  if (!process.env[descriptor.envVar]) {
    return {
      provider: descriptor.nome,
      ok: false,
      modeloUsado,
      latenciaMs: 0,
      erro: `${descriptor.envVar} não configurada`,
    };
  }

  try {
    const provider = descriptor.criar(
      process.env[descriptor.envVar] || '',
      descriptor.baseUrlEnvVar ? process.env[descriptor.baseUrlEnvVar] : undefined
    );
    const config = await loadProviderConfig();
    // 64 tokens, not 8: reasoning models spend the first tokens thinking
    // and would come back empty on a tighter budget.
    const resposta = await withTimeoutLocal(
      provider.generate('Responda apenas com a palavra: ok', modeloUsado, 64, 0),
      config.timeoutMs
    );

    const latenciaMs = Date.now() - inicio;
    recordProviderSuccess(descriptor.id, modeloUsado, latenciaMs);

    return {
      provider: descriptor.nome,
      ok: true,
      modeloUsado,
      latenciaMs,
      resposta: resposta.trim().slice(0, 80),
    };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Falha desconhecida';
    recordProviderFailure(descriptor.id, modeloUsado, mensagem);
    return {
      provider: descriptor.nome,
      ok: false,
      modeloUsado,
      latenciaMs: Date.now() - inicio,
      erro: mensagem,
    };
  }
}
