/** @jest-environment node */
const mockRpc = jest.fn(async (_name: string, _args: unknown) => ({ data: [], error: null }));
const mockEmbed = jest.fn(async (..._args: unknown[]) => [0.6, 0.8]);
let mockModel = { id: 'nvidia/nemotron-3.5-embed-8b:free', coluna: 'embedding_nemotron', configurado: true };
jest.mock('../../lib/db/client', () => ({ databaseConfigured: true, supabase: { rpc: (...args: [string, unknown]) => mockRpc(...args) } }));
jest.mock('../../lib/ai/embedding-config', () => ({ getEmbeddingConfig: async () => mockModel }));
jest.mock('../../lib/ai/embeddings', () => ({ embeddingChain: { embed: (...args: unknown[]) => mockEmbed(...args) } }));

import { searchByVector } from '@/lib/search/vector';

describe('isolamento dos espaços vetoriais', () => {
  beforeEach(() => { jest.clearAllMocks(); mockModel = { id: 'nvidia/nemotron-3.5-embed-8b:free', coluna: 'embedding_nemotron', configurado: true }; });

  it('consulta a RPC Nemotron mesmo sem chave Mistral', async () => {
    await searchByVector('artigo sobre iluminação', 6);
    expect(mockEmbed).toHaveBeenCalledWith('artigo sobre iluminação', mockModel.id);
    expect(mockRpc).toHaveBeenCalledWith('search_dispositivos_nemotron', { query_embedding: [0.6, 0.8], limit_count: 6 });
  });

  it('mantém a RPC antiga para vetores Mistral', async () => {
    mockModel = { id: 'mistral-embed', coluna: 'embedding', configurado: true };
    await searchByVector('consulta', 5);
    expect(mockRpc).toHaveBeenCalledWith('search_dispositivos_vector', expect.any(Object));
  });

  it('mantém busca textual quando o modelo escolhido não tem chave', async () => {
    mockModel.configurado = false;
    await expect(searchByVector('consulta')).resolves.toEqual([]);
    expect(mockEmbed).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
