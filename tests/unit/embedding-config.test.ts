/** @jest-environment node */
let mockSaved: unknown = null;
let mockWritable = true;
const mockUpsert = jest.fn(async (row: { valor: unknown }) => { mockSaved = row.valor; return { error: null }; });
jest.mock('../../lib/db/client', () => ({
  get databaseAdminConfigured() { return mockWritable; },
  supabaseAdmin: { from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { valor: mockSaved }, error: null }) }) }),
    upsert: (row: { valor: unknown }) => mockUpsert(row),
  }) },
}));
import { getEmbeddingConfig, setEmbeddingModel } from '@/lib/ai/embedding-config';
import { NEMOTRON_EMBED_MODEL, MISTRAL_EMBED_MODEL } from '@/lib/ai/embedding-models';

describe('configuração do espaço vetorial', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    mockSaved = null; mockWritable = true; jest.clearAllMocks();
    delete process.env.OPENROUTER_API_KEY; delete process.env.MISTRAL_API_KEY; delete process.env.RAG_EMBEDDING_MODEL;
  });
  afterEach(() => { process.env = { ...originalEnv }; });

  it('prioriza Nemotron quando a chave OpenRouter existe', async () => {
    process.env.OPENROUTER_API_KEY = 'openrouter-key';
    process.env.MISTRAL_API_KEY = 'mistral-key';
    await expect(getEmbeddingConfig()).resolves.toMatchObject({ id: NEMOTRON_EMBED_MODEL, configurado: true, coluna: 'embedding_nemotron' });
  });
  it('preserva instalações que só configuraram Mistral', async () => {
    process.env.MISTRAL_API_KEY = 'mistral-key';
    await expect(getEmbeddingConfig()).resolves.toMatchObject({ id: MISTRAL_EMBED_MODEL, coluna: 'embedding' });
  });
  it('preferência salva prevalece e não cai para outro espaço se faltar chave', async () => {
    process.env.MISTRAL_API_KEY = 'mistral-key';
    await setEmbeddingModel(NEMOTRON_EMBED_MODEL);
    await expect(getEmbeddingConfig()).resolves.toMatchObject({ id: NEMOTRON_EMBED_MODEL, configurado: false });
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ chave: 'rag_embeddings', valor: { modelo: NEMOTRON_EMBED_MODEL } }));
  });
  it('aceita escolha explícita pelo ambiente e não exige alterar a preferência de respostas', async () => {
    process.env.OPENROUTER_API_KEY = 'openrouter-key';
    process.env.RAG_EMBEDDING_MODEL = MISTRAL_EMBED_MODEL;
    await expect(getEmbeddingConfig()).resolves.toMatchObject({ id: MISTRAL_EMBED_MODEL });
  });
});
