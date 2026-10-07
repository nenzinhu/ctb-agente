// Document processor: embeds excerpts and inserts them into the database.
//
// Two destinations: CTB excerpts go to `dispositivos` (article lookups and
// the enforcement cards read them), POP-PMSC excerpts go to
// `documento_trechos` (migration 008). Both share the same batching.
//
// An embedding failure no longer drops excerpts: they are inserted without a
// vector, so word search finds them right away, and the panel can generate
// the missing vectors later (backfillEmbeddings). Before, a missing or
// rate-limited MISTRAL_API_KEY meant "nothing was indexed".
import { z } from 'zod';
import { embeddingChain } from '@/lib/ai/embeddings';
import { supabaseAdmin } from '@/lib/db/client';

const ChunkSchema = z.object({
  text: z.string(),
  numero_dispositivo: z.string().optional(),
  section: z.string().optional(),
  page: z.number().optional(),
  order: z.number(),
});

// Schema for processor input
const ProcessorInputSchema = z.object({
  chunks: z.array(ChunkSchema),
  normaId: z.string().min(1),
  documentType: z.enum(['lei', 'resolucao', 'portaria', 'manual']).default('lei'),
  dataPublicacao: z.string().datetime().optional(),
  dataVigenciaInicio: z.string().datetime().optional(),
  dataVigenciaFim: z.string().datetime().optional().nullable(),
  /** Row in `documentos` the excerpts belong to (migration 008). */
  documentoId: z.string().optional(),
  /** Stop calling the embedding provider after this instant (epoch ms). */
  deadline: z.number().optional(),
});

export type ProcessorInput = z.input<typeof ProcessorInputSchema>;
type Chunk = z.infer<typeof ChunkSchema>;

export interface ProcessingResult {
  insertedCount: number;
  failedCount: number;
  /** Inserted without an embedding (word search only, until backfilled). */
  semVetor: number;
  /** Why some excerpts have no embedding, when that happened. */
  avisoVetor?: string;
  errors: { chunkIndex: number; error: string }[];
  insertedIds: string[];
}

// A real document produces hundreds (a full law, thousands) of chunks. One
// embedding request per chunk tripped Mistral's rate limit within seconds
// and ran past Vercel's function timeout, so chunks are now embedded and
// inserted in batches: one embedding request and one insert per batch,
// with a couple of batches in flight at once.
const CONCURRENCY = 2;
const BATCH_MAX_ITEMS = 32;
// mistral-embed caps the tokens of a whole request, not just each input.
// ~3 chars/token for Portuguese keeps a full batch well under that cap.
const BATCH_MAX_CHARS = 30_000;
// Leaves room for the inserts before Vercel's 60s limit (maxDuration).
export const DEFAULT_EMBEDDING_BUDGET_MS = 40_000;

/**
 * Groups chunk indexes into batches bounded by item count and total size.
 */
function buildBatches(texts: string[]): number[][] {
  const batches: number[][] = [];
  let current: number[] = [];
  let chars = 0;

  texts.forEach((text, i) => {
    if (current.length > 0 && (current.length >= BATCH_MAX_ITEMS || chars + text.length > BATCH_MAX_CHARS)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(i);
    chars += text.length;
  });
  if (current.length > 0) batches.push(current);

  return batches;
}

/**
 * Text sent to the embedding model: the excerpt plus where it comes from.
 * "art. 165" alone says little; "CTB · art. 165 · Das infrações" places it.
 * Only the vector sees this — the stored text stays the literal excerpt.
 */
export function embeddingInput(texto: string, contexto: (string | null | undefined)[]): string {
  const cabecalho = contexto.filter((parte): parte is string => Boolean(parte && parte.trim())).join(' · ');
  return cabecalho ? `${cabecalho}\n${texto}` : texto;
}

/**
 * Embeds a batch, or explains why it could not.
 */
async function embedOrNull(
  texts: string[],
  deadline: number
): Promise<{ vectors: (number[] | null)[]; erro?: string }> {
  if (Date.now() > deadline) {
    return { vectors: texts.map(() => null), erro: 'tempo esgotado para gerar vetores nesta requisição' };
  }
  try {
    return { vectors: await embeddingChain.embedBatch(texts) };
  } catch (error) {
    return { vectors: texts.map(() => null), erro: error instanceof Error ? error.message : String(error) };
  }
}

type RowBuilder = (chunk: Chunk, index: number, embedding: number[] | null) => Record<string, unknown>;

/**
 * Embeds and inserts chunks in batches with bounded concurrency.
 */
async function indexChunks(
  table: 'dispositivos' | 'documento_trechos',
  chunks: Chunk[],
  embeddingText: (chunk: Chunk) => string,
  buildRow: RowBuilder,
  deadline: number
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    insertedCount: 0,
    failedCount: 0,
    semVetor: 0,
    errors: [],
    insertedIds: [],
  };

  function failAll(indexes: number[], error: string): void {
    for (const i of indexes) {
      result.failedCount++;
      result.errors.push({ chunkIndex: i, error });
    }
  }

  async function processBatch(indexes: number[]): Promise<void> {
    try {
      const { vectors, erro } = await embedOrNull(indexes.map((i) => embeddingText(chunks[i])), deadline);
      if (erro) {
        console.warn(`Embeddings unavailable for chunks ${indexes[0]}-${indexes[indexes.length - 1]}: ${erro}`);
        result.avisoVetor ??= erro;
      }

      const rows = indexes.map((i, j) => buildRow(chunks[i], i, vectors[j]));
      const { data, error } = await supabaseAdmin.from(table).insert(rows).select('id');

      if (error) {
        console.error(`Falha ao inserir os trechos ${indexes[0]}-${indexes[indexes.length - 1]}:`, error);
        failAll(indexes, `Falha ao inserir no banco: ${error.message}`);
        return;
      }

      const ids = (data ?? []).map((row: { id: string }) => row.id);
      result.insertedCount += ids.length;
      result.insertedIds.push(...ids);
      result.semVetor += vectors.slice(0, ids.length).filter((v) => v === null).length;
      if (ids.length < indexes.length) {
        failAll(indexes.slice(ids.length), 'Insert returned no ID');
      }
    } catch (error) {
      console.error('Erro inesperado ao processar o lote:', error);
      failAll(indexes, `Erro inesperado: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Bounded-concurrency worker pool: each worker pulls the next batch off
  // the shared cursor until none are left. Plain number increments/array
  // pushes on `result` are safe here — JS never interleaves mid-statement,
  // only at `await` points.
  const batches = buildBatches(chunks.map(embeddingText));
  let nextBatch = 0;
  async function worker(): Promise<void> {
    while (nextBatch < batches.length) {
      await processBatch(batches[nextBatch++]);
    }
  }

  const workerCount = Math.min(CONCURRENCY, batches.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return result;
}

/**
 * Label for an excerpt that isn't an article (preamble, annexes, manuals).
 * It used to be "chunk-12", which the cards then showed as if it were a
 * legal reference. Now: the innermost heading and, in a glossary like the
 * CTB's Anexo I, the first term defined — "ANEXO I · CICLOMOTOR".
 */
export function fallbackLabel(chunk: Pick<Chunk, 'text' | 'section' | 'order'>, normaId: string): string {
  const secao = chunk.section?.split(' › ').pop()?.split(' — ')[0];
  const termo = /(?:^|\n)([A-ZÀ-Ý][A-ZÀ-Ý0-9 ]{1,40}?)\s+[-–]\s/.exec(chunk.text)?.[1];
  return `${secao ?? normaId} · ${termo ?? `trecho ${chunk.order + 1}`}`;
}

/**
 * Indexes CTB excerpts into `dispositivos`.
 */
export async function processChunks(input: ProcessorInput): Promise<ProcessingResult> {
  const validated = ProcessorInputSchema.parse(input);

  // Set defaults for dates if not provided
  const now = new Date().toISOString();
  const dataPublicacao = validated.dataPublicacao || now;
  const dataVigenciaInicio = validated.dataVigenciaInicio || now;
  const deadline = validated.deadline ?? Date.now() + DEFAULT_EMBEDDING_BUDGET_MS;

  return indexChunks(
    'dispositivos',
    validated.chunks,
    (chunk) => embeddingInput(chunk.text, [validated.normaId, chunk.numero_dispositivo, chunk.section]),
    (chunk, _i, embedding) => ({
      numero_dispositivo: chunk.numero_dispositivo || fallbackLabel(chunk, validated.normaId),
      texto: chunk.text,
      norma_id: validated.normaId,
      tipo: validated.documentType,
      data_publicacao: dataPublicacao,
      data_vigencia_inicio: dataVigenciaInicio,
      data_vigencia_fim: validated.dataVigenciaFim || null,
      embedding,
      citacoes_dentro: extractCitations(chunk.text),
      criado_em: now,
      atualizado_em: now,
      // Columns added by migration 008; sent only when it is applied.
      ...(validated.documentoId ? { documento_id: validated.documentoId, ordem: chunk.order } : {}),
    }),
    deadline
  );
}

const TrechosInputSchema = z.object({
  chunks: z.array(ChunkSchema),
  documentoId: z.string().min(1),
  titulo: z.string().min(1),
  deadline: z.number().optional(),
});

/**
 * Indexes excerpts of a POP (or any collection kept in `documento_trechos`).
 */
export async function processTrechos(input: z.input<typeof TrechosInputSchema>): Promise<ProcessingResult> {
  const validated = TrechosInputSchema.parse(input);
  const deadline = validated.deadline ?? Date.now() + DEFAULT_EMBEDDING_BUDGET_MS;

  return indexChunks(
    'documento_trechos',
    validated.chunks,
    (chunk) => embeddingInput(chunk.text, [validated.titulo, chunk.section]),
    (chunk, _i, embedding) => ({
      documento_id: validated.documentoId,
      ordem: chunk.order,
      secao: chunk.section ?? null,
      pagina: chunk.page ?? null,
      texto: chunk.text,
      embedding,
    }),
    deadline
  );
}

/**
 * Extracts citations from text (e.g., "art. 165", "Res. 432/2013")
 */
export function extractCitations(text: string): string[] {
  const citations: Set<string> = new Set();

  // Match article references
  const articleMatches = text.matchAll(/art\.?\s+(\d+(?:\s*[-–§]\s*\d+[a-z]?)?)/gi);
  for (const match of articleMatches) {
    citations.add(`art. ${match[1].toLowerCase()}`);
  }

  // Match resolution/portaria references
  const resMatches = text.matchAll(/(?:res\.?|resolução)\s+(\d+\/\d+)/gi);
  for (const match of resMatches) {
    citations.add(`res. ${match[1]}`);
  }

  // Match portaria references
  const portMatches = text.matchAll(/(?:port\.?|portaria)\s+(\d+\/\d+)/gi);
  for (const match of portMatches) {
    citations.add(`port. ${match[1]}`);
  }

  return Array.from(citations);
}

/**
 * Validates processing result and reports any issues
 */
export function validateProcessingResult(result: ProcessingResult): void {
  if (result.failedCount > 0) {
    console.warn(`Processing completed with ${result.failedCount} failures:`);
    result.errors.forEach((err) => {
      console.warn(`  Chunk ${err.chunkIndex}: ${err.error}`);
    });
  }

  if (result.insertedCount === 0 && result.failedCount === 0) {
    throw new Error('Nenhum trecho foi processado');
  }
}
