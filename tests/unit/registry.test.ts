import { listProviders, PROVIDERS, pingProvider } from '@/lib/ai/providers/registry';

describe('AI provider registry', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
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

  it('includes Cloudflare Workers AI and asks for the account id when it is missing', async () => {
    process.env.CLOUDFLARE_API_TOKEN = 'test-key';
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    expect(listProviders().find((p) => p.id === 'cloudflare')?.configurado).toBe(true);
    const result = await pingProvider('cloudflare');
    expect(result.ok).toBe(false);
    expect(result.erro).toMatch(/CLOUDFLARE_ACCOUNT_ID/);
  });

  it('puts a free Nous model first, so the default works without credits', () => {
    expect(PROVIDERS.find((p) => p.id === 'nous')?.modelos[0]).toMatch(/:free$/);
  });
});
