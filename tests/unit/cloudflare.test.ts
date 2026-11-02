import { CloudflareProvider } from '@/lib/ai/providers/cloudflare';

describe('CloudflareProvider', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists the Text Generation catalog from the native API', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: [{ name: '@cf/openai/gpt-oss-20b' }, { name: '@cf/meta/llama-3.1-8b-instruct-fast' }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const modelos = await new CloudflareProvider('tok', 'acc123').getModels();
    expect(modelos.map((m) => m.id)).toEqual(['@cf/openai/gpt-oss-20b', '@cf/meta/llama-3.1-8b-instruct-fast']);
    expect(fetchMock.mock.calls[0][0]).toContain('/accounts/acc123/ai/models/search');
  });

  it('generates through the OpenAI-compatible endpoint of the account', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await new CloudflareProvider('tok', 'acc123').generate('oi', '@cf/openai/gpt-oss-20b', 10)).toBe('ok');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.cloudflare.com/client/v4/accounts/acc123/ai/v1/chat/completions');
  });
});
