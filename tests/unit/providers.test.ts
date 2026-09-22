import { GroqProvider } from '@/lib/ai/providers/groq';
import { fetchWithTimeout } from '@/lib/ai/providers/timeout';

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
