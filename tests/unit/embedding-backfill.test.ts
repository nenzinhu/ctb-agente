/** @jest-environment node */
import { embeddingModel, NEMOTRON_EMBED_MODEL, MISTRAL_EMBED_MODEL, type EmbeddingModelId } from '@/lib/ai/embedding-models';

type Row = Record<string, unknown>;
const mockRows: Record<string, Row[]> = { dispositivos: [], documento_trechos: [], documentos: [] };
let mockSelection: EmbeddingModelId = NEMOTRON_EMBED_MODEL;
let mockChangeDuringBatch = false;
const mockEmbedBatch = jest.fn(async (texts: string[], _model: string) => {
  if (mockChangeDuringBatch) mockSelection = MISTRAL_EMBED_MODEL;
  return texts.map((_t, index) => [index + 1]);
});
jest.mock('../../lib/ai/embedding-config', () => ({ getEmbeddingConfig: async () => ({ ...embeddingModel(mockSelection), configurado: true }) }));
jest.mock('../../lib/ai/embeddings', () => ({ embeddingChain: { embedBatch: (...args: [string[], string]) => mockEmbedBatch(...args) } }));
jest.mock('../../lib/db/client', () => ({ supabaseAdmin: {
  from: (table: string) => {
    const filters: Array<[string, unknown]> = [];
    let update: Row | null = null;
    let limit = Infinity;
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.is = (column: string, value: unknown) => { filters.push([column, value]); return chain; };
    chain.eq = (column: string, value: unknown) => { filters.push([column, value]); return chain; };
    chain.limit = (value: number) => { limit = value; return chain; };
    chain.update = (value: Row) => { update = value; return chain; };
    chain.then = (resolve: (value: unknown) => unknown) => {
      const rows = mockRows[table].filter((row) => filters.every(([key, value]) => (row[key] ?? null) === value)).slice(0, limit);
      if (update) rows.forEach((row) => Object.assign(row, update));
      return Promise.resolve({ data: rows, count: rows.length, error: null }).then(resolve);
    };
    return chain;
  },
} }));

import { backfillEmbeddings, countPendingEmbeddings } from '@/lib/ingestion/backfill';

describe('geração de pendentes por espaço vetorial', () => {
  beforeEach(() => {
    mockSelection = NEMOTRON_EMBED_MODEL; mockChangeDuringBatch = false; jest.clearAllMocks();
    mockRows.dispositivos = [
      { id: 'a', texto: 'artigo A', norma_id: 'ctb', numero_dispositivo: 'art. 1', documento_id: null, embedding: [9], embedding_nemotron: null },
      { id: 'b', texto: 'artigo B', norma_id: 'ctb', numero_dispositivo: 'art. 2', documento_id: null, embedding: [8], embedding_nemotron: null },
    ];
    mockRows.documento_trechos = []; mockRows.documentos = [];
  });
  it('conta novos vetores pendentes mesmo quando os vetores Mistral já existem', async () => {
    await expect(countPendingEmbeddings()).resolves.toBe(2);
    mockSelection = MISTRAL_EMBED_MODEL;
    await expect(countPendingEmbeddings()).resolves.toBe(0);
  });
  it('conclui o lote no modelo original mesmo se a escolha mudar durante a geração', async () => {
    mockChangeDuringBatch = true;
    const result = await backfillEmbeddings(Date.now() + 10_000);
    expect(result).toMatchObject({ atualizados: 2, restantes: 0 });
    expect(mockRows.dispositivos.map((r) => r.embedding)).toEqual([[9], [8]]);
    expect(mockRows.dispositivos.map((r) => r.embedding_nemotron)).toEqual([[1], [2]]);
    expect(mockEmbedBatch).toHaveBeenCalledWith(expect.any(Array), NEMOTRON_EMBED_MODEL);
  });
});
