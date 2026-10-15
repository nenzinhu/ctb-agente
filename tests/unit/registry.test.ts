import { listProviders, PROVIDERS, pingProvider } from '@/lib/ai/providers/registry';
import { clearProviderHealth } from '@/lib/ai/providers/health';

describe('AI provider registry', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    clearProviderHealth();
  });

  it('mantém somente os quatro provedores aprovados para respostas', () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(['groq', 'cerebras', 'cohere', 'openrouter']);
  });

  it('every provider lists at least one free model, and modeloPadrao is the first one', () => {
    for (const provider of PROVIDERS) {
      expect(provider.modelos.length).toBeGreaterThan(0);
    }
    for (const status of listProviders()) {
      expect(status.modeloPadrao).toBe(status.modelos[0]);
    }
  });

  it('usa o endpoint compatível oficial da Cohere', async () => {
    process.env.COHERE_API_KEY = 'test-key';
    const originalFetch = global.fetch;
    const fetchMock = jest.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    }));
    (global as { fetch: unknown }).fetch = fetchMock;
    try {
      await expect(pingProvider('cohere', 'command-a-03-2025')).resolves.toMatchObject({
        ok: true,
        modeloUsado: 'command-a-03-2025',
      });
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.cohere.ai/compatibility/v1/chat/completions');
    } finally {
      (global as { fetch: unknown }).fetch = originalFetch;
    }
  });

  it('reports configured=false when the env var is absent', () => {
    delete process.env.COHERE_API_KEY;
    const cohere = listProviders().find((p) => p.id === 'cohere');
    expect(cohere?.configurado).toBe(false);
  });

  it('reports configured=true once the env var is set', () => {
    process.env.COHERE_API_KEY = 'test-key';
    const cohere = listProviders().find((p) => p.id === 'cohere');
    expect(cohere?.configurado).toBe(true);
  });

  it('exposes the full model list on the status object', () => {
    const openrouter = listProviders().find((p) => p.id === 'openrouter');
    expect(openrouter?.modelos.length).toBeGreaterThan(1);
  });

  it('expõe somente a lista aprovada em cada provedor', () => {
    expect(listProviders().find((p) => p.id === 'groq')?.modelos).toEqual([
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
    ]);
    expect(listProviders().find((p) => p.id === 'cerebras')?.modelos).toEqual([
      'qwen-3.8-27b',
      'gpt-oss-120b',
    ]);
    expect(listProviders().find((p) => p.id === 'cohere')?.modelos).toEqual([
      'c4ai-aya-vision-32b',
      'command-a-03-2025',
      'command-a-plus-05-2026',
    ]);
    const openrouter = listProviders().find((p) => p.id === 'openrouter');
    expect(openrouter?.modelos).toEqual([
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
    ]);
  });

  it('rejeita modelo fora da lista fixa', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    await expect(pingProvider('groq', 'modelo-fora-da-lista')).resolves.toMatchObject({
      ok: false,
      erro: 'Modelo não autorizado para este provedor.',
    });
  });

  it('expõe no painel o resultado operacional do último teste real', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const originalFetch = global.fetch;
    (global as { fetch: unknown }).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    }));
    try {
      await expect(pingProvider('groq')).resolves.toMatchObject({ ok: true });
      expect(listProviders().find((p) => p.id === 'groq')?.saude).toMatchObject({
        status: 'funcionando', modeloTestado: expect.any(String), latenciaMs: expect.any(Number),
      });
    } finally {
      (global as { fetch: unknown }).fetch = originalFetch;
    }
  });
});
