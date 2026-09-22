// Registry of the pluggable AI providers, used by the admin panel.
import { GroqProvider } from './groq';
import { NVIDIAProvider } from './nvidia';
import { OpenRouterProvider } from './openrouter';
import { MistralProvider } from './mistral';
import { NousProvider } from './nous';
import { OrcaRouterProvider } from './orcarouter';
import { AnyApiProvider } from './anyapi';
import type { AIProvider } from './base';

export interface ProviderDescriptor {
  id: string;
  nome: string;
  envVar: string;
  /** Free-tier models this provider offers, most recommended first. */
  modelos: string[];
  papel: 'resposta rapida' | 'resposta analitica' | 'embeddings';
  criar: () => AIProvider;
}

const TIMEOUT_MS = 8000;

export const PROVIDERS: ProviderDescriptor[] = [
  {
    id: 'groq',
    nome: 'Groq',
    envVar: 'GROQ_API_KEY',
    modelos: [
      'llama-3.3-70b-versatile',
      'qwen/qwen3.6-27b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
    ],
    papel: 'resposta rapida',
    criar: () => new GroqProvider(process.env.GROQ_API_KEY || ''),
  },
  {
    id: 'nvidia',
    nome: 'NVIDIA NIM',
    envVar: 'NVIDIA_API_KEY',
    modelos: ['meta/llama-3.1-70b-instruct', 'nvidia/nemotron-3-super-120b-a12b'],
    papel: 'resposta rapida',
    criar: () => new NVIDIAProvider(process.env.NVIDIA_API_KEY || ''),
  },
  {
    id: 'nous',
    nome: 'Nous Portal',
    envVar: 'NOUS_API_KEY',
    modelos: [
      'deepseek/deepseek-v4-flash-0731',
      'meituan/longcat-2.0:free',
      'qwen/qwen3.7-flash',
      'mistralai/mistral-nemo',
      'openai/gpt-oss-120b',
      'meta-llama/llama-3.1-8b-instruct',
    ],
    papel: 'resposta analitica',
    criar: () =>
      new NousProvider(process.env.NOUS_API_KEY || '', process.env.NOUS_BASE_URL || undefined),
  },
  {
    id: 'orcarouter',
    nome: 'OrcaRouter',
    envVar: 'ORCAROUTER_API_KEY',
    modelos: [
      'deepseek/deepseek-v4-flash-free',
      'z-ai/glm-5.3-flash-free',
      'tencent/hy3-free',
    ],
    papel: 'resposta analitica',
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
    criar: () => new AnyApiProvider(process.env.ANYAPI_API_KEY || '', process.env.ANYAPI_BASE_URL || ''),
  },
  {
    id: 'openrouter',
    nome: 'OpenRouter (modelos :free)',
    envVar: 'OPENROUTER_API_KEY',
    modelos: [
      'meta-llama/llama-3.2-3b-instruct:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'openrouter/free',
      'nex-agi/nex-n2.5-pro:free',
    ],
    papel: 'resposta analitica',
    criar: () => new OpenRouterProvider(process.env.OPENROUTER_API_KEY || ''),
  },
  {
    id: 'mistral',
    nome: 'Mistral',
    envVar: 'MISTRAL_API_KEY',
    modelos: ['mistral-small-latest', 'ministral-14b-latest', 'ministral-8b-latest'],
    papel: 'resposta analitica',
    criar: () => new MistralProvider(process.env.MISTRAL_API_KEY || ''),
  },
];

export interface ProviderStatus {
  id: string;
  nome: string;
  envVar: string;
  modeloPadrao: string;
  modelos: string[];
  papel: string;
  ordem: number;
  configurado: boolean;
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
    ordem: index + 1,
    configurado: Boolean(process.env[provider.envVar]),
  }));
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
 * Generate a trivial completion to prove the provider works end to end
 * @param providerId - Provider identifier
 * @returns Ping result, never throws
 */
export async function pingProvider(providerId: string): Promise<PingResult> {
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

  const modeloPadrao = descriptor.modelos[0];

  if (!process.env[descriptor.envVar]) {
    return {
      provider: descriptor.nome,
      ok: false,
      modeloUsado: modeloPadrao,
      latenciaMs: 0,
      erro: `${descriptor.envVar} não configurada`,
    };
  }

  try {
    const provider = descriptor.criar();
    const resposta = await withTimeout(
      provider.generate('Responda apenas com a palavra: ok', modeloPadrao, 8, 0),
      TIMEOUT_MS
    );

    return {
      provider: descriptor.nome,
      ok: true,
      modeloUsado: modeloPadrao,
      latenciaMs: Date.now() - inicio,
      resposta: resposta.trim().slice(0, 80),
    };
  } catch (error) {
    return {
      provider: descriptor.nome,
      ok: false,
      modeloUsado: modeloPadrao,
      latenciaMs: Date.now() - inicio,
      erro: error instanceof Error ? error.message : 'Falha desconhecida',
    };
  }
}

/**
 * Race a promise against a timeout
 * @param promise - Promise to await
 * @param ms - Timeout in milliseconds
 * @returns The promise result
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout ao contatar o provedor')), ms)
    ),
  ]);
}
