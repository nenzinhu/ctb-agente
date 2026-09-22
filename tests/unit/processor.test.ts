/**
 * @jest-environment node
 */
/**
 * lib/ingestion/processor.ts writes rows straight into the `dispositivos`
 * table. Two constraints from scripts/migrations.sql must hold at the
 * insert boundary:
 *   - `tsvector_pt` is `GENERATED ALWAYS AS (...) STORED`, so Postgres
 *     rejects any insert that names it explicitly.
 *   - `embedding` must carry whatever the embedding provider actually
 *     returns, unmodified.
 */
const insertedRows: Record<string, unknown>[] = [];

const embed = jest.fn(async (_text: string) => [0.1, 0.2, 0.3]);
jest.mock('../../lib/ai/embeddings', () => ({
  embeddingChain: { embed: (text: string) => embed(text) },
}));

jest.mock('../../lib/db/client', () => {
  const builder = () => {
    const chain: Record<string, unknown> = {};
    chain.insert = (rows: Record<string, unknown>[]) => {
      insertedRows.push(...rows);
      return chain;
    };
    chain.select = () => Promise.resolve({ data: [{ id: 'disp-1' }], error: null });
    return chain;
  };
  return { supabaseAdmin: { from: () => builder() } };
});

import { processChunks } from '../../lib/ingestion/processor';

describe('processChunks', () => {
  beforeEach(() => {
    insertedRows.length = 0;
    jest.clearAllMocks();
    embed.mockImplementation(async () => [0.1, 0.2, 0.3]);
  });

  it('does not send tsvector_pt, a generated column, in the insert payload', async () => {
    const result = await processChunks({
      chunks: [{ text: 'Art. 165 do CTB', order: 0 }],
      normaId: 'ctb',
      documentType: 'lei',
    });

    expect(result.insertedCount).toBe(1);
    expect(insertedRows[0]).not.toHaveProperty('tsvector_pt');
  });

  it('stores the embedding returned by the embedding provider, unmodified', async () => {
    embed.mockImplementation(async () => [0.4, 0.5, 0.6, 0.7]);

    const result = await processChunks({
      chunks: [{ text: 'texto qualquer', order: 0 }],
      normaId: 'ctb',
      documentType: 'lei',
    });

    expect(result.insertedCount).toBe(1);
    expect(insertedRows[0].embedding).toEqual([0.4, 0.5, 0.6, 0.7]);
  });
});
