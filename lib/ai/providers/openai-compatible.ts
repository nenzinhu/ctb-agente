// One client for every provider that speaks the OpenAI chat-completions
// protocol (Groq, NVIDIA, OpenRouter, Mistral, Gemini, Cerebras, ...).
import type { AIModel, AIProvider } from './base';
import { fetchWithTimeout } from './timeout';
import { SISTEMA_PORTUGUES_BR } from '../portugues';

/** A /models entry; OpenRouter-style catalogs also carry per-token prices. */
export interface ModeloListado {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string | number; completion?: string | number };
}

export type FiltroGratis = (modelId: string, modelo?: ModeloListado) => boolean;

/** True when the catalog prices both input and output at zero */
export function precoZero(modelo?: ModeloListado): boolean {
  const { prompt, completion } = modelo?.pricing ?? {};
  return prompt !== undefined && completion !== undefined && Number(prompt) === 0 && Number(completion) === 0;
}

export interface OpenAICompatibleOptions {
  name: string;
  apiKey: string;
  baseUrl: string;
  /** Env var holding the base URL, named in the error when it's missing. */
  baseUrlEnvVar?: string;
  /** Keeps only the models usable on the provider's free tier. */
  filtroGratis?: FiltroGratis;
  headers?: Record<string, string>;
}

/**
 * Builds an error message a person can act on. `statusText` alone is empty
 * over HTTP/2 (every provider here), which used to surface as
 * "Groq API error: " with no reason at all.
 */
export async function describeHttpError(name: string, response: Response): Promise<string> {
  const raw = await response.text().catch(() => '');
  let detalhe = raw;
  try {
    const body = JSON.parse(raw);
    detalhe = body?.error?.message || body?.message || body?.detail || body?.error || raw;
    if (typeof detalhe !== 'string') detalhe = JSON.stringify(detalhe);
  } catch {
    // not JSON — keep the raw text
  }
  const motivo = { 401: 'chave inválida', 403: 'acesso negado', 404: 'modelo não encontrado', 429: 'limite de uso atingido' }[
    response.status
  ];
  const explicacao = motivo ?? traduzirDetalheErro(detalhe, response.statusText);
  return `${name} HTTP ${response.status}: ${explicacao}`;
}

function traduzirDetalheErro(detalhe: string, statusText: string): string {
  const mensagem = `${detalhe || statusText}`.toLocaleLowerCase('en-US');
  if (/api.?key|authentication|unauthorized|credential/.test(mensagem)) return 'chave de API ou autenticação inválida';
  if (/rate.?limit|too many requests|quota/.test(mensagem)) return 'limite de uso atingido';
  if (/model.*(not found|does not exist)|not found/.test(mensagem)) return 'recurso ou modelo não encontrado';
  if (/timeout|timed out/.test(mensagem)) return 'tempo limite da solicitação excedido';
  if (/bad request|invalid request/.test(mensagem)) return 'solicitação inválida';
  if (/unavailable|overloaded/.test(mensagem)) return 'serviço temporariamente indisponível';
  return 'erro retornado pelo provedor de IA';
}

export class OpenAICompatibleProvider implements AIProvider {
  name: string;
  protected apiKey: string;
  protected baseUrl: string;
  private baseUrlEnvVar?: string;
  private filtroGratis?: FiltroGratis;
  private headers: Record<string, string>;

  constructor(options: OpenAICompatibleOptions) {
    this.name = options.name;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.baseUrlEnvVar = options.baseUrlEnvVar;
    this.filtroGratis = options.filtroGratis;
    this.headers = options.headers ?? {};
  }

  private requireBaseUrl(): void {
    if (!this.baseUrl) {
      throw new Error(`${this.baseUrlEnvVar ?? 'URL base'} não configurada`);
    }
    if (!this.apiKey) {
      throw new Error(`${this.name}: chave de API não configurada`);
    }
  }

  async getModels(): Promise<AIModel[]> {
    this.requireBaseUrl();
    const response = await fetchWithTimeout(
      `${this.baseUrl}/models`,
      { headers: { Authorization: `Bearer ${this.apiKey}`, ...this.headers } }
    );
    if (!response.ok) {
      throw new Error(await describeHttpError(this.name, response));
    }

    const data = await response.json();
    const lista: Array<ModeloListado> = Array.isArray(data)
      ? data
      : data.data || data.models || [];

    return lista
      .map((m) => ({ ...m, id: String(m.id).replace(/^models\//, '') }))
      .filter((m) => !this.filtroGratis || this.filtroGratis(m.id, m))
      .map((m) => ({
        id: m.id,
        name: m.name || m.id,
        maxTokens: m.context_length || 4096,
        costPer1kTokens: 0,
        isFree: true,
      }));
  }

  async generate(prompt: string, model: string, maxTokens: number, temperature = 0.7): Promise<string> {
    this.requireBaseUrl();
    const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SISTEMA_PORTUGUES_BR },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(await describeHttpError(this.name, response));
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    // Reasoning models (gpt-oss, nemotron-*-reasoning) may spend a small
    // max_tokens budget entirely on `reasoning` and leave `content` empty.
    return message?.content || message?.reasoning_content || message?.reasoning || '';
  }
}
