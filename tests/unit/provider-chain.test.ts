import { ProviderChain } from '@/lib/ai/providers/chain';
import { listProviders, PROVIDERS } from '@/lib/ai/providers/registry';

describe('ProviderChain', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('is built from the full registry (7 providers)', () => {
    const chain = new ProviderChain();
    expect(chain.name).toBe('Provider Chain');
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

  it('explains itself when no provider is configured', async () => {
    for (const p of PROVIDERS) delete process.env[p.envVar];

    const chain = new ProviderChain();
    await expect(chain.generate('x', 'm', 8)).rejects.toThrow(/Nenhum provedor de IA configurado/);
  });
});
