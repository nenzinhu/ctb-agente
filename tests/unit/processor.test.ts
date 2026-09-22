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
let insertCalls = 0;

const embed = jest.fn(async (_text: string) => [0.1, 0.2, 0.3]);
jest.mock('../../lib/ai/embeddings', () => ({
  embeddingChain: {
    embed: (text: string) => embed(text),
    embedBatch: (texts: string[]) => Promise.all(texts.map((text) => embed(text))),
  },
}));

jest.mock('../../lib/db/client', () => {
  const builder = () => {
    const chain: Record<string, unknown> = {};
    let size = 0;
    chain.insert = (rows: Record<string, unknown>[]) => {
      insertedRows.push(...rows);
      size = rows.length;
      insertCalls++;
      return chain;
    };
    chain.select = () =>
      Promise.resolve({ data: Array.from({ length: size }, (_v, i) => ({ id: `disp-${i}` })), error: null });
    return chain;
  };
  return { supabaseAdmin: { from: () => builder() } };
});

import { processChunks } from '../../lib/ingestion/processor';

describe('processChunks', () => {
  beforeEach(() => {
    insertedRows.length = 0;
    insertCalls = 0;
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

  it('embeds and inserts in batches instead of one request per chunk', async () => {
    const chunks = Array.from({ length: 70 }, (_v, i) => ({ text: `Art. ${i + 1} texto`, order: i }));

    const result = await processChunks({ chunks, normaId: 'ctb', documentType: 'lei' });

    expect(result.insertedCount).toBe(70);
    expect(result.failedCount).toBe(0);
    expect(insertCalls).toBe(3); // 32 + 32 + 6
  });

  it('marks every chunk of a batch as failed when its embedding request fails', async () => {
    embed.mockImplementation(async () => {
      throw new Error('Mistral Embed API error 429: rate limited');
    });

    const result = await processChunks({
      chunks: [
        { text: 'primeiro trecho', order: 0 },
        { text: 'segundo trecho', order: 1 },
      ],
      normaId: 'ctb',
      documentType: 'lei',
    });

    expect(result.insertedCount).toBe(0);
    expect(result.failedCount).toBe(2);
    expect(result.errors[0].error).toMatch(/429/);
  });
});
