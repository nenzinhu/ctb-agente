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
const tabelas: string[] = [];
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
  return {
    supabaseAdmin: {
      from: (tabela: string) => {
        tabelas.push(tabela);
        return builder();
      },
    },
  };
});

import { embeddingInput, fallbackLabel, processChunks, processTrechos } from '../../lib/ingestion/processor';

describe('processChunks', () => {
  beforeEach(() => {
    insertedRows.length = 0;
    tabelas.length = 0;
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

  it('inserts the excerpts without a vector when the embedding provider fails', async () => {
    // Before: the whole batch was dropped and nothing got indexed without a
    // working MISTRAL_API_KEY. Word search works on these rows right away.
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

    expect(result.insertedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.semVetor).toBe(2);
    expect(result.avisoVetor).toMatch(/429/);
    expect(insertedRows.map((row) => row.embedding)).toEqual([null, null]);
  });

  it('stops asking for embeddings once the time budget is spent', async () => {
    const result = await processChunks({
      chunks: [{ text: 'trecho', order: 0 }],
      normaId: 'ctb',
      documentType: 'lei',
      deadline: Date.now() - 1,
    });

    expect(embed).not.toHaveBeenCalled();
    expect(result.semVetor).toBe(1);
  });

  it('embeds each excerpt with its context but stores only the literal text', async () => {
    await processChunks({
      chunks: [{ text: 'Art. 165. Dirigir sob a influência de álcool', numero_dispositivo: 'art. 165', section: 'Das infrações', order: 0 }],
      normaId: 'ctb',
      documentType: 'lei',
    });

    expect(embed).toHaveBeenCalledWith('ctb · art. 165 · Das infrações\nArt. 165. Dirigir sob a influência de álcool');
    expect(insertedRows[0].texto).toBe('Art. 165. Dirigir sob a influência de álcool');
  });

  it('labels non-article excerpts by section instead of "chunk-N"', async () => {
    await processChunks({
      chunks: [{ text: 'Texto do anexo', section: 'ANEXO I', order: 4 }],
      normaId: 'res-432',
      documentType: 'resolucao',
    });

    expect(insertedRows[0].numero_dispositivo).toBe('ANEXO I · trecho 5');
  });

  it('names glossary excerpts by the first term they define', () => {
    expect(
      fallbackLabel(
        { text: 'Para efeito deste Código:\nCICLOMOTOR - veículo de duas rodas', section: 'ANEXO I — DOS CONCEITOS E DEFINIÇÕES', order: 9 },
        'ctb'
      )
    ).toBe('ANEXO I · CICLOMOTOR');
    expect(fallbackLabel({ text: 'Preâmbulo da lei.', order: 0 }, 'ctb')).toBe('ctb · trecho 1');
  });

  it('links the rows to their document only when one is given (migration 008)', async () => {
    await processChunks({ chunks: [{ text: 'sem documento', order: 0 }], normaId: 'ctb', documentType: 'lei' });
    expect(insertedRows[0]).not.toHaveProperty('documento_id');

    await processChunks({
      chunks: [{ text: 'com documento', order: 3 }],
      normaId: 'ctb',
      documentType: 'lei',
      documentoId: 'doc-1',
    });
    expect(insertedRows[1]).toMatchObject({ documento_id: 'doc-1', ordem: 3 });
  });

  it('indexes POP excerpts into documento_trechos with section and page', async () => {
    const result = await processTrechos({
      chunks: [{ text: 'Posicionar a viatura a 5 metros.', section: '3. SEQUÊNCIA DAS AÇÕES', page: 2, order: 0 }],
      documentoId: 'doc-9',
      titulo: 'POP 1.01',
    });

    expect(result.insertedCount).toBe(1);
    expect(tabelas).toEqual(['documento_trechos']);
    expect(insertedRows[0]).toEqual({
      documento_id: 'doc-9',
      ordem: 0,
      secao: '3. SEQUÊNCIA DAS AÇÕES',
      pagina: 2,
      texto: 'Posicionar a viatura a 5 metros.',
      embedding: [0.1, 0.2, 0.3],
    });
    expect(embed).toHaveBeenCalledWith('POP 1.01 · 3. SEQUÊNCIA DAS AÇÕES\nPosicionar a viatura a 5 metros.');
  });

  it('builds the embedding input without empty context parts', () => {
    expect(embeddingInput('texto', [undefined, '', 'CTB'])).toBe('CTB\ntexto');
    expect(embeddingInput('texto', [])).toBe('texto');
  });
});
