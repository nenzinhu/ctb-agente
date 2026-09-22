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

// A real document now produces hundreds of chunks (see the parser/chunker
// fix). Processing them one at a time — one embedding call, then one insert,
// then the next — made a full law take minutes and risked running past
// Vercel's function timeout. This bounds how many chunks are in flight at
// once instead of capping at 1.
const CONCURRENCY = 5;

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

  async function processOne(i: number): Promise<void> {
    const chunk = validated.chunks[i];

    try {
      // Generate embedding for the chunk
      let embedding: number[];
      try {
        embedding = await embeddingChain.embed(chunk.text);
      } catch (embedError) {
        console.error(`Failed to generate embedding for chunk ${i}:`, embedError);
        result.failedCount++;
        result.errors.push({
          chunkIndex: i,
          error: `Embedding generation failed: ${embedError instanceof Error ? embedError.message : String(embedError)}`,
        });
        return;
      }

      // Prepare dispositivo record
      const dispositivo = {
        numero_dispositivo: chunk.numero_dispositivo || `chunk-${i}`,
        texto: chunk.text,
        norma_id: validated.normaId,
        tipo: validated.documentType,
        data_publicacao: dataPublicacao,
        data_vigencia_inicio: dataVigenciaInicio,
        data_vigencia_fim: validated.dataVigenciaFim || null,
        embedding: embedding,
        citacoes_dentro: extractCitations(chunk.text),
        criado_em: now,
        atualizado_em: now,
      };

      // Insert into Supabase
      const { data, error } = await supabaseAdmin
        .from('dispositivos')
        .insert([dispositivo])
        .select('id');

      if (error) {
        console.error(`Failed to insert chunk ${i}:`, error);
        result.failedCount++;
        result.errors.push({
          chunkIndex: i,
          error: `Database insert failed: ${error.message}`,
        });
        return;
      }

      if (data && data.length > 0) {
        result.insertedCount++;
        result.insertedIds.push(data[0].id);
      } else {
        result.failedCount++;
        result.errors.push({
          chunkIndex: i,
          error: 'Insert returned no ID',
        });
      }
    } catch (error) {
      console.error(`Unexpected error processing chunk ${i}:`, error);
      result.failedCount++;
      result.errors.push({
        chunkIndex: i,
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // Bounded-concurrency worker pool: each worker pulls the next index off
  // the shared cursor until none are left. Plain number increments/array
  // pushes on `result` are safe here — JS never interleaves mid-statement,
  // only at `await` points.
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < validated.chunks.length) {
      const i = nextIndex++;
      await processOne(i);
    }
  }

  const workerCount = Math.min(CONCURRENCY, validated.chunks.length);
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
