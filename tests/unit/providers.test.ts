import { GroqProvider } from '@/lib/ai/providers/groq';
import { ProviderChain } from '@/lib/ai/providers/chain';

describe('AI Providers', () => {
  describe('GroqProvider', () => {
    it('should initialize with API key', () => {
      const provider = new GroqProvider('test-key');
      expect(provider.name).toBe('Groq');
      expect(provider.getModels).toBeDefined();
    });
  });

  describe('ProviderChain', () => {
    it('should initialize with multiple providers', () => {
      const chain = new ProviderChain();
      expect(chain.name).toBe('Provider Chain');
      expect(chain.generate).toBeDefined();
      expect(chain.getModels).toBeDefined();
    });
  });
});
