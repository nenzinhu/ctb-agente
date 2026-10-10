import { listProviders, PROVIDERS, pingProvider } from '@/lib/ai/providers/registry';
import { clearProviderHealth } from '@/lib/ai/providers/health';

describe('AI provider registry', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    clearProviderHealth();
  });

  it('includes nous, orcarouter and anyapi alongside the original chain', () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(['groq', 'nvidia', 'openrouter', 'mistral', 'nous', 'orcarouter', 'anyapi'])
    );
  });

  it('every provider lists at least one free model, and modeloPadrao is the first one', () => {
    for (const provider of PROVIDERS) {
      expect(provider.modelos.length).toBeGreaterThan(0);
    }
    for (const status of listProviders()) {
      expect(status.modeloPadrao).toBe(status.modelos[0]);
    }
  });

  it('pings a provider missing its base URL with a clear error instead of a fetch crash', async () => {
    delete process.env.ORCAROUTER_BASE_URL;
    process.env.ORCAROUTER_API_KEY = 'test-key';
    const result = await pingProvider('orcarouter');
    expect(result.ok).toBe(false);
    expect(result.erro).toMatch(/ORCAROUTER_BASE_URL/);
  });

  it('reports configured=false when the env var is absent', () => {
    delete process.env.NOUS_API_KEY;
    const nous = listProviders().find((p) => p.id === 'nous');
    expect(nous?.configurado).toBe(false);
  });

  it('reports configured=true once the env var is set', () => {
    process.env.NOUS_API_KEY = 'test-key';
    const nous = listProviders().find((p) => p.id === 'nous');
    expect(nous?.configurado).toBe(true);
  });

  it('exposes the full model list on the status object', () => {
    const openrouter = listProviders().find((p) => p.id === 'openrouter');
    expect(openrouter?.modelos.length).toBeGreaterThan(1);
  });

  it('oferece os novos modelos gratuitos aprovados no OpenRouter e OrcaRouter', () => {
    const openrouter = listProviders().find((p) => p.id === 'openrouter');
    expect(openrouter?.modelos).toEqual(expect.arrayContaining([
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'poolside/laguna-s-2.1:free',
      'nvidia/nemotron-3.5-lightning:free',
      'liquid/lfm-2.5-2.6b:free',
    ]));

    const orcarouter = listProviders().find((p) => p.id === 'orcarouter');
    expect(orcarouter?.modelos).toEqual(expect.arrayContaining([
      'orcarouter/free',
      'tencent/hy4-preview-free',
      'tencent/hy3-free',
      'z-ai/glm-5.3-flash-free',
      'deepseek/deepseek-v4-flash-free',
    ]));
    expect(orcarouter?.modelos).not.toContain('orca/orcaverify-text1.0-free');
  });

  it('mantém no Nous Portal somente os nove modelos gratuitos aprovados', () => {
    const nous = listProviders().find((p) => p.id === 'nous');
    expect(nous?.modelos).toEqual([
      'inclusionai/ling-3.0-flash-fin',
      'inclusionai/ling-3.0-flash-sante:free',
      'inclusionai/ling-3.1-flash',
      'meituan/longcat-2.0:free',
      'meituan/longcat-2.5-preview',
      'poolside/laguna-s-2.1',
      'poolside/laguna-xs-2.1',
      'stepfun/step-3.7-flash',
      'upstage/solar-mini-4',
    ]);
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
