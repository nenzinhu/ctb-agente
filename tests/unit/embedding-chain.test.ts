/** @jest-environment node */
const mockNemotronEmbed = jest.fn();
const mockMistralEmbed = jest.fn();
jest.mock('../../lib/ai/providers/openrouter-embedding', () => ({ OpenRouterEmbedding: jest.fn().mockImplementation(() => ({ embed: mockNemotronEmbed })) }));
jest.mock('../../lib/ai/providers/mistral', () => ({ MistralEmbedding: jest.fn().mockImplementation(() => ({ embed: mockMistralEmbed })) }));
jest.mock('../../lib/ai/embedding-config', () => ({ getEmbeddingConfig: async () => ({ id: 'nvidia/nemotron-3.5-embed-8b:free' }) }));
import { EmbeddingChain } from '@/lib/ai/embeddings';

it('uma falha Nemotron não substitui a consulta por vetor Mistral', async () => {
  mockNemotronEmbed.mockRejectedValue(new Error('OpenRouter 429'));
  await expect(new EmbeddingChain().embed('consulta')).rejects.toThrow('OpenRouter 429');
  expect(mockMistralEmbed).not.toHaveBeenCalled();
});
