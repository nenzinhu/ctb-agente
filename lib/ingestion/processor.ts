// Document processor: Creates embeddings and inserts into database
import { z } from 'zod';
import { embeddingChain } from '@/lib/ai/embeddings';
import { supabaseAdmin } from '@/lib/db/client';

// Schema for processor input
const ProcessorInputSchema = z.object({
  chunks: z.array(
    z.object({
      text: z.string(),
      numero_dispositivo: z.string().optional(),
      order: z.number(),
    }),
  ),
  normaId: z.string().min(1),
  documentType: z.enum(['lei', 'resolucao', 'portaria', 'manual']).default('lei'),
  dataPublicacao: z.string().datetime().optional(),
  dataVigenciaInicio: z.string().datetime().optional(),
  dataVigenciaFim: z.string().datetime().optional().nullable(),
});

export type ProcessorInput = z.infer<typeof ProcessorInputSchema>;

export interface ProcessingResult {
  insertedCount: number;
  failedCount: number;
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
 * Processes chunks by generating embeddings and inserting into database
 */
export async function processChunks(input: ProcessorInput): Promise<ProcessingResult> {
  const validated = ProcessorInputSchema.parse(input);

  const result: ProcessingResult = {
    insertedCount: 0,
    failedCount: 0,
    errors: [],
    insertedIds: [],
  };

  // Set defaults for dates if not provided
  const now = new Date().toISOString();
  const dataPublicacao = validated.dataPublicacao || now;
  const dataVigenciaInicio = validated.dataVigenciaInicio || now;

  function failAll(indexes: number[], error: string): void {
    for (const i of indexes) {
      result.failedCount++;
      result.errors.push({ chunkIndex: i, error });
    }
  }

  async function processBatch(indexes: number[]): Promise<void> {
    try {
      let embeddings: number[][];
      try {
        embeddings = await embeddingChain.embedBatch(indexes.map((i) => validated.chunks[i].text));
      } catch (embedError) {
        console.error(`Failed to generate embeddings for chunks ${indexes[0]}-${indexes[indexes.length - 1]}:`, embedError);
        failAll(
          indexes,
          `Embedding generation failed: ${embedError instanceof Error ? embedError.message : String(embedError)}`
        );
        return;
      }

      const dispositivos = indexes.map((i, j) => {
        const chunk = validated.chunks[i];
        return {
          numero_dispositivo: chunk.numero_dispositivo || `chunk-${i}`,
          texto: chunk.text,
          norma_id: validated.normaId,
          tipo: validated.documentType,
          data_publicacao: dataPublicacao,
          data_vigencia_inicio: dataVigenciaInicio,
          data_vigencia_fim: validated.dataVigenciaFim || null,
          embedding: embeddings[j],
          citacoes_dentro: extractCitations(chunk.text),
          criado_em: now,
          atualizado_em: now,
        };
      });

      const { data, error } = await supabaseAdmin.from('dispositivos').insert(dispositivos).select('id');

      if (error) {
        console.error(`Failed to insert chunks ${indexes[0]}-${indexes[indexes.length - 1]}:`, error);
        failAll(indexes, `Database insert failed: ${error.message}`);
        return;
      }

      const ids = (data ?? []).map((row: { id: string }) => row.id);
      result.insertedCount += ids.length;
      result.insertedIds.push(...ids);
      if (ids.length < indexes.length) {
        failAll(indexes.slice(ids.length), 'Insert returned no ID');
      }
    } catch (error) {
      console.error('Unexpected error processing batch:', error);
      failAll(indexes, `Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Bounded-concurrency worker pool: each worker pulls the next batch off
  // the shared cursor until none are left. Plain number increments/array
  // pushes on `result` are safe here — JS never interleaves mid-statement,
  // only at `await` points.
  const batches = buildBatches(validated.chunks.map((c) => c.text));
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
 * Extracts citations from text (e.g., "art. 165", "Res. 432/2013")
 */
function extractCitations(text: string): string[] {
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
    throw new Error('No chunks were processed');
  }
}
