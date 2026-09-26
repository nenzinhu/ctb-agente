import { GroqProvider } from '@/lib/ai/providers/groq';
import { fetchWithTimeout } from '@/lib/ai/providers/timeout';
import { OpenAICompatibleProvider } from '@/lib/ai/providers/openai-compatible';
import { OpenRouterProvider } from '@/lib/ai/providers/openrouter';

describe('AI Providers', () => {
  describe('GroqProvider', () => {
    it('should initialize with API key', () => {
      const provider = new GroqProvider('test-key');
      expect(provider.name).toBe('Groq');
      expect(provider.getModels).toBeDefined();
    });
  });

  describe('fetchWithTimeout', () => {
    it('passes through a caller-provided signal untouched', async () => {
      const controller = new AbortController();
      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
      // jsdom has no global fetch to spyOn — replace it directly.
      (global as { fetch: unknown }).fetch = fetchMock;

      try {
        await fetchWithTimeout('https://exemplo.test', { signal: controller.signal }, 5);
        expect(fetchMock).toHaveBeenCalledWith(
          'https://exemplo.test',
          expect.objectContaining({ signal: controller.signal })
        );
      } finally {
        (global as { fetch: unknown }).fetch = originalFetch;
      }
    });
  });
});

describe('OpenAICompatibleProvider', () => {


  it('explains an HTTP error instead of an empty statusText', async () => {
    const originalFetch = global.fetch;
    (global as { fetch: unknown }).fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      statusText: '',
      text: async () => '{"error":{"message":"The model `x` does not exist"}}',
    }));
    try {
      const provider = new OpenAICompatibleProvider({ name: 'Groq', apiKey: 'k', baseUrl: 'https://a.test/v1' });
      await expect(provider.generate('oi', 'x', 8)).rejects.toThrow(
        'Groq HTTP 404 (modelo não encontrado): The model `x` does not exist'
      );
    } finally {
      (global as { fetch: unknown }).fetch = originalFetch;
    }
  });

  it('filters the live catalog down to free models', async () => {
    const originalFetch = global.fetch;
    (global as { fetch: unknown }).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: 'a:free' }, { id: 'b' }, { id: 'openrouter/free' }] }),
    }));
    try {

      const modelos = await new OpenRouterProvider('k').getModels();
      expect(modelos.map((m) => m.id)).toEqual(['a:free', 'openrouter/free']);
    } finally {
      (global as { fetch: unknown }).fetch = originalFetch;
    }
  });

  it('falls back to reasoning text when a reasoning model leaves content empty', async () => {
    const originalFetch = global.fetch;
    (global as { fetch: unknown }).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '', reasoning: 'ok' } }] }),
    }));
    try {
      const provider = new OpenAICompatibleProvider({ name: 'X', apiKey: 'k', baseUrl: 'https://a.test/v1' });
      await expect(provider.generate('oi', 'm', 8)).resolves.toBe('ok');
    } finally {
      (global as { fetch: unknown }).fetch = originalFetch;
    }
  });
});

describe('Nous Portal free catalog', () => {
  it('keeps only free models on the curated list', async () => {
    const { NousProvider } = await import('@/lib/ai/providers/nous');
    const originalFetch = global.fetch;
    (global as { fetch: unknown }).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          { id: 'nousresearch/hermes-4-70b', pricing: { prompt: '0', completion: '0' } },
          { id: 'meituan/longcat-2.0:free' },
          { id: 'upstage/solar-pro4:free' },
          { id: 'x/ling', name: 'Ling 3.0 Flash Fin:Free', pricing: { prompt: '0', completion: '0' } },
          { id: 'stepfun/step-3.7-flash', name: 'Step 3.7 Flash', pricing: { prompt: '1', completion: '1' } },
          { id: 'openai/gpt-5-pro', pricing: { prompt: '0.00001', completion: '0.00003' } },
          { id: 'sem-preco/modelo' },
        ],
      }),
    }));
    try {
      const modelos = await new NousProvider('k').getModels();
      expect(modelos.map((m) => m.id)).toEqual(['upstage/solar-pro4:free', 'x/ling']);
    } finally {
      (global as { fetch: unknown }).fetch = originalFetch;
    }
  });
});
