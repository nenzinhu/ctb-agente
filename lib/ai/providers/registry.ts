// Registry of the pluggable AI providers, used by the admin panel and the
// fallback chain. Every one of them has a free tier; `modelos` are the
// suggested free models (most recommended first). These catalogs change
// every few weeks, so the admin panel can also pull each provider's current
// free catalog live (listLiveModels) and test any model in it.
import { GroqProvider } from './groq';
import { NVIDIAProvider } from './nvidia';
import { OpenRouterProvider } from './openrouter';
import { NOUS_FREE_MODELS, NousProvider } from './nous';
import { OrcaRouterProvider } from './orcarouter';
import { AnyApiProvider } from './anyapi';
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
      'llama-3.3-70b-versatile',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'llama-3.1-8b-instant',
      'qwen/qwen3.6-27b',
    ],
    papel: 'resposta rapida',
    cadastro: 'https://console.groq.com/keys',
    criar: () => new GroqProvider(process.env.GROQ_API_KEY || ''),
  },
  {
    id: 'cerebras',
    nome: 'Cerebras',
    envVar: 'CEREBRAS_API_KEY',
    modelos: ['gpt-oss-120b', 'llama-3.3-70b', 'llama3.1-8b', 'qwen-3-32b'],
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
    id: 'nvidia',
    nome: 'NVIDIA NIM',
    envVar: 'NVIDIA_API_KEY',
    modelos: [
      'nvidia/nemotron-3-super-120b-a12b',
      'deepseek-ai/deepseek-v4.1-flash',
      'moonshotai/kimi-k2.6',
      'z-ai/glm-5.3-flash',
      'openai/gpt-oss-20b',
      'nvidia/llama-3.1-nemotron-70b-instruct',
    ],
    papel: 'resposta rapida',
    cadastro: 'https://build.nvidia.com',
    criar: () => new NVIDIAProvider(process.env.NVIDIA_API_KEY || ''),
  },
  {
    id: 'gemini',
    nome: 'Google Gemini (AI Studio)',
    envVar: 'GEMINI_API_KEY',
    modelos: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
    papel: 'resposta analitica',
    cadastro: 'https://aistudio.google.com/apikey',
    criar: () =>
      new OpenAICompatibleProvider({
        name: 'Gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        filtroGratis: (id) => /^gemini-.*flash/i.test(id) && !/image|tts|audio|live/i.test(id),
      }),
  },
  {
    id: 'sambanova',
    nome: 'SambaNova Cloud',
    envVar: 'SAMBANOVA_API_KEY',
    modelos: ['Meta-Llama-3.3-70B-Instruct', 'DeepSeek-V3.2', 'gpt-oss-120b', 'gemma-4-31B-it'],
    papel: 'resposta analitica',
    cadastro: 'https://cloud.sambanova.ai/apis',
    criar: () =>
      new OpenAICompatibleProvider({
        name: 'SambaNova',
        apiKey: process.env.SAMBANOVA_API_KEY || '',
        baseUrl: 'https://api.sambanova.ai/v1',
      }),
  },
  {
    id: 'huggingface',
    nome: 'Hugging Face (créditos grátis mensais)',
    envVar: 'HF_TOKEN',
    modelos: [
      'openai/gpt-oss-120b',
      'meta-llama/Llama-3.3-70B-Instruct',
      'deepseek-ai/DeepSeek-V4.1-Flash',
      'Qwen/Qwen3.8-27B',
      'google/gemma-4-31B-it',
    ],
    papel: 'resposta analitica',
    cadastro: 'https://huggingface.co/settings/tokens',
    criar: () =>
      new OpenAICompatibleProvider({
        name: 'Hugging Face',
        apiKey: process.env.HF_TOKEN || '',
        baseUrl: 'https://router.huggingface.co/v1',
      }),
  },
  {
    id: 'nous',
    nome: 'Nous Portal',
    envVar: 'NOUS_API_KEY',
    modelos: [...NOUS_FREE_MODELS],
    papel: 'resposta analitica',
    cadastro: 'https://portal.nousresearch.com',
    criar: () =>
      new NousProvider(process.env.NOUS_API_KEY || '', process.env.NOUS_BASE_URL || undefined),
  },
  {
    id: 'orcarouter',
    nome: 'OrcaRouter',
    envVar: 'ORCAROUTER_API_KEY',
    modelos: [
      'deepseek/deepseek-v4-flash-free',
      'orcarouter/free',
      'tencent/hy4-preview-free',
      'z-ai/glm-5.3-flash-free',
      'tencent/hy3-free',
    ],
    papel: 'resposta analitica',
    cadastro: '',
    criar: () =>
      new OrcaRouterProvider(process.env.ORCAROUTER_API_KEY || '', process.env.ORCAROUTER_BASE_URL || ''),
  },
  {
    id: 'anyapi',
    nome: 'AnyAPI',
    envVar: 'ANYAPI_API_KEY',
    modelos: [
      'dots-studio/dots-3-note-preview:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    ],
    papel: 'resposta analitica',
    cadastro: '',
    criar: () => new AnyApiProvider(process.env.ANYAPI_API_KEY || '', process.env.ANYAPI_BASE_URL || ''),
  },
  {
    id: 'openrouter',
    nome: 'OpenRouter (modelos :free)',
    envVar: 'OPENROUTER_API_KEY',
    modelos: [
      'nvidia/nemotron-3-super-120b-a12b:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'nvidia/nemotron-3.5-lightning:free',
      'poolside/laguna-s-2.1:free',
      'liquid/lfm-2.5-2.6b:free',
      'openrouter/free',
      'google/gemma-4-31b-it:free',
      'qwen/qwen3.8-27b:free',
      'z-ai/glm-5.2:free',
      'nex-agi/nex-n2.5-pro:free',
    ],
    papel: 'resposta analitica',
    cadastro: 'https://openrouter.ai/keys',
    criar: () => new OpenRouterProvider(process.env.OPENROUTER_API_KEY || ''),
  },
  {
    id: 'mistral',
    nome: 'Mistral',
    envVar: 'MISTRAL_API_KEY',
    modelos: ['mistral-small-latest', 'ministral-14b-latest', 'ministral-8b-latest'],
    papel: 'resposta analitica',
    cadastro: 'https://console.mistral.ai/api-keys',
    criar: () =>
      new OpenAICompatibleProvider({
        name: 'Mistral',
        apiKey: process.env.MISTRAL_API_KEY || '',
        baseUrl: 'https://api.mistral.ai/v1',
        filtroGratis: (id) => !/embed|moderation|ocr|voxtral/i.test(id),
      }),
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

/**
 * The provider's current free catalog, straight from its /models endpoint
 * @param providerId - Provider identifier
 * @returns Model ids, or the error that prevented listing them
 */
export async function listLiveModels(
  providerId: string
): Promise<{ modelos: string[]; erro?: string }> {
  const descriptor = PROVIDERS.find((p) => p.id === providerId);
  if (!descriptor) return { modelos: [], erro: 'Provedor desconhecido' };
  if (!process.env[descriptor.envVar]) {
    return { modelos: [], erro: `${descriptor.envVar} não configurada` };
  }
  try {
    const modelos = await descriptor.criar(
      process.env[descriptor.envVar] || '',
      descriptor.baseUrlEnvVar ? process.env[descriptor.baseUrlEnvVar] : undefined
    ).getModels();
    return { modelos: Array.from(new Set(modelos.map((m) => m.id))).sort() };
  } catch (error) {
    return { modelos: [], erro: error instanceof Error ? error.message : 'Falha desconhecida' };
  }
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
