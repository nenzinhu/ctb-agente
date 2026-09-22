// Registry of the pluggable AI providers, used by the admin panel.
import { GroqProvider } from './groq';
import { NVIDIAProvider } from './nvidia';
import { OpenRouterProvider } from './openrouter';
import { MistralProvider } from './mistral';
import type { AIProvider } from './base';

export interface ProviderDescriptor {
  id: string;
  nome: string;
  envVar: string;
  modeloPadrao: string;
  papel: 'resposta rapida' | 'resposta analitica' | 'embeddings';
  criar: () => AIProvider;
}

const TIMEOUT_MS = 8000;

export const PROVIDERS: ProviderDescriptor[] = [
  {
    id: 'groq',
    nome: 'Groq',
    envVar: 'GROQ_API_KEY',
    modeloPadrao: 'llama-3.3-70b-versatile',
    papel: 'resposta rapida',
    criar: () => new GroqProvider(process.env.GROQ_API_KEY || ''),
  },
  {
    id: 'nvidia',
    nome: 'NVIDIA NIM',
    envVar: 'NVIDIA_API_KEY',
    modeloPadrao: 'meta/llama-3.1-70b-instruct',
    papel: 'resposta rapida',
    criar: () => new NVIDIAProvider(process.env.NVIDIA_API_KEY || ''),
  },
  {
    id: 'openrouter',
    nome: 'OpenRouter (modelos :free)',
    envVar: 'OPENROUTER_API_KEY',
    modeloPadrao: 'meta-llama/llama-3.2-3b-instruct:free',
    papel: 'resposta analitica',
    criar: () => new OpenRouterProvider(process.env.OPENROUTER_API_KEY || ''),
  },
  {
    id: 'mistral',
    nome: 'Mistral',
    envVar: 'MISTRAL_API_KEY',
    modeloPadrao: 'mistral-small-latest',
    papel: 'resposta analitica',
    criar: () => new MistralProvider(process.env.MISTRAL_API_KEY || ''),
  },
];

export interface ProviderStatus {
  id: string;
  nome: string;
  envVar: string;
  modeloPadrao: string;
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
    modeloPadrao: provider.modeloPadrao,
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

  if (!process.env[descriptor.envVar]) {
    return {
      provider: descriptor.nome,
      ok: false,
      modeloUsado: descriptor.modeloPadrao,
      latenciaMs: 0,
      erro: `${descriptor.envVar} não configurada`,
    };
  }

  try {
    const provider = descriptor.criar();
    const resposta = await withTimeout(
      provider.generate('Responda apenas com a palavra: ok', descriptor.modeloPadrao, 8, 0),
      TIMEOUT_MS
    );

    return {
      provider: descriptor.nome,
      ok: true,
      modeloUsado: descriptor.modeloPadrao,
      latenciaMs: Date.now() - inicio,
      resposta: resposta.trim().slice(0, 80),
    };
  } catch (error) {
    return {
      provider: descriptor.nome,
      ok: false,
      modeloUsado: descriptor.modeloPadrao,
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
