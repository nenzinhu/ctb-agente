import { ProviderChain } from '@/lib/ai/providers/chain';
import { listProviders, PROVIDERS } from '@/lib/ai/providers/registry';

describe('ProviderChain', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('is built from the full registry', () => {
    const chain = new ProviderChain();
    expect(chain.name).toBe('Cadeia de provedores');
    expect(chain.getModels).toBeDefined();
    expect(chain.generate).toBeDefined();
    expect(listProviders()).toHaveLength(PROVIDERS.length);
  });

  it('wires only the providers whose env var is set, in registry order', () => {
    process.env.GROQ_API_KEY = 'k';
    process.env.MISTRAL_API_KEY = 'k';
    delete process.env.NVIDIA_API_KEY;
    delete process.env.NOUS_API_KEY;
    delete process.env.ORCAROUTER_API_KEY;
    delete process.env.ANYAPI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const chain = new ProviderChain();
    expect(chain.ativos).toEqual(['Groq', 'Mistral']);
  });

  it('tries the preferred model first, then each other provider with its own default model', () => {
    for (const p of PROVIDERS) delete process.env[p.envVar];
    process.env.GROQ_API_KEY = 'k';
    process.env.MISTRAL_API_KEY = 'k';
    process.env.OPENROUTER_API_KEY = 'k';

    const chain = new ProviderChain();
    const plano = chain
      .tentativas({ providerId: 'openrouter', modelo: 'openrouter/free' })
      .map((t) => `${t.elo.id}:${t.modelo}`);

    const padrao = (id: string) => PROVIDERS.find((p) => p.id === id)!.modelos[0];
    expect(plano).toEqual([
      'openrouter:openrouter/free',
      `groq:${padrao('groq')}`,
      `mistral:${padrao('mistral')}`,
    ]);
  });

  it('falls over to the next provider with that provider\'s model', async () => {
    for (const p of PROVIDERS) delete process.env[p.envVar];
    process.env.GROQ_API_KEY = 'k';
    process.env.MISTRAL_API_KEY = 'k';

    const originalFetch = global.fetch;
    const modelosPedidos: string[] = [];
    (global as { fetch: unknown }).fetch = jest.fn(async (url: string, init: RequestInit) => {
      modelosPedidos.push(JSON.parse(init.body as string).model);
      if (url.includes('groq')) {
        return { ok: false, status: 429, statusText: '', text: async () => '{"error":{"message":"slow down"}}' };
      }
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'resposta' } }] }) };
    });

    try {
      const chain = new ProviderChain();
      await expect(chain.generate('x', 'ignored', 8)).resolves.toBe('resposta');
      expect(modelosPedidos).toEqual([
        PROVIDERS.find((p) => p.id === 'groq')!.modelos[0],
        PROVIDERS.find((p) => p.id === 'mistral')!.modelos[0],
      ]);
    } finally {
      (global as { fetch: unknown }).fetch = originalFetch;
    }
  });

  it('generateRapido keeps the first model that answers', async () => {
    for (const p of PROVIDERS) delete process.env[p.envVar];
    process.env.GROQ_API_KEY = 'k';
    process.env.MISTRAL_API_KEY = 'k';

    const originalFetch = global.fetch;
    (global as { fetch: unknown }).fetch = jest.fn(async (url: string) => {
      // Groq is slow, Mistral answers at once
      if (url.includes('groq')) await new Promise((r) => setTimeout(r, 200));
      const content = url.includes('groq') ? 'lenta' : 'rápida';
      return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
    });

    try {
      const resultado = await new ProviderChain().generateRapido('x', 8);
      expect(resultado.texto).toBe('rápida');
      expect(resultado.provedor).toBe('Mistral');
    } finally {
      (global as { fetch: unknown }).fetch = originalFetch;
    }
  });

  it('rewrites an English answer in Portuguese before returning it', async () => {
    for (const p of PROVIDERS) delete process.env[p.envVar];
    process.env.GROQ_API_KEY = 'k';

    const originalFetch = global.fetch;
    const fetchMock = jest
      .fn(async (_url: string, _init: RequestInit) => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' } }] }),
      }))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'The driver must stop the vehicle and show the requested documents.' } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'O condutor deve parar o veículo e apresentar os documentos solicitados.' } }] }),
      });
    (global as { fetch: unknown }).fetch = fetchMock;

    try {
      const resultado = await new ProviderChain().generateDetailed('O que fazer?', 120, 0.2);
      expect(resultado.texto).toMatch(/^O condutor/);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const segundoBody = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
      expect(segundoBody.messages[1].content).toContain('Reescreva a resposta');
      expect(segundoBody.temperature).toBe(0);
    } finally {
      (global as { fetch: unknown }).fetch = originalFetch;
    }
  });

  it('explains itself when no provider is configured', async () => {
    for (const p of PROVIDERS) delete process.env[p.envVar];

    const chain = new ProviderChain();
    await expect(chain.generate('x', 'm', 8)).rejects.toThrow(/Nenhum provedor de IA configurado/);
  });
});
