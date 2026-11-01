/** @jest-environment node */
import { OpenRouterEmbedding } from '@/lib/ai/providers/openrouter-embedding';

jest.mock('../../lib/ai/providers/timeout', () => ({
  fetchWithTimeout: (...args: unknown[]) => fetch(...(args as Parameters<typeof fetch>)),
}));

describe('Nemotron embeddings via OpenRouter', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  const vector = (x: number) => [x, ...Array(4095).fill(0)];

  it('usa o modelo gratuito, ordena o lote e normaliza 1024 dimensões para documentos', async () => {
    const mockFetch = jest.fn(async () => new Response(JSON.stringify({ data: [
      { index: 1, embedding: [0, 4, ...Array(4094).fill(0)] }, { index: 0, embedding: vector(2) },
    ] }), { status: 200 }));
    global.fetch = mockFetch;
    const result = await new OpenRouterEmbedding('test-secret').embedBatch(['primeiro', 'segundo']);
    const [url, request] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/embeddings');
    expect(JSON.parse(request.body as string)).toMatchObject({
      model: 'nvidia/nemotron-3.5-embed-8b:free', input: ['primeiro', 'segundo'],
      dimensions: 1024, input_type: 'passage', encoding_format: 'float',
    });
    expect(result.map((v) => v.length)).toEqual([1024, 1024]);
    expect(result[0][0]).toBe(1);
    expect(result[1][0]).toBe(0);
    expect(result[1][1]).toBe(1);
  });

  it('distingue consultas dos documentos sem mudar o espaço vetorial', async () => {
    const mockFetch = jest.fn(async () => new Response(JSON.stringify({
      data: [{ index: 0, embedding: [3, 4, ...Array(1022).fill(0)] }],
    })));
    global.fetch = mockFetch;
    const result = await new OpenRouterEmbedding('key').embed('pergunta');
    expect(JSON.parse((mockFetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).input_type).toBe('query');
    expect(result.slice(0, 2)).toEqual([0.6, 0.8]);
  });

  it.each([
    [{ index: 0, embedding: [1, 2] }],
    [{ index: 0, embedding: Array(1024).fill(0) }],
    [{ index: 1, embedding: vector(1) }],
    [{ index: 0, embedding: [null, ...Array(1023).fill(1)] }],
  ])('rejeita lotes inválidos', async (item) => {
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ data: [item] })));
    await expect(new OpenRouterEmbedding('key').embed('pergunta')).rejects.toThrow();
  });

  it('não chama API sem chave e aceita lote vazio', async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;
    const provider = new OpenRouterEmbedding('');
    await expect(provider.embedBatch([])).resolves.toEqual([]);
    await expect(provider.embed('pergunta')).rejects.toThrow(/OPENROUTER_API_KEY/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('relata falha de autenticação sem expor a chave nem repetir a requisição', async () => {
    const mockFetch = jest.fn(async () => new Response('unauthorized', { status: 401 }));
    global.fetch = mockFetch;
    await expect(new OpenRouterEmbedding('test-secret').embed('pergunta')).rejects.toThrow(/401/);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
