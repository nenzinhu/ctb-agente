// Text chunker that respects document structure (articles, sections)
import { z } from 'zod';

export interface TextChunk {
  text: string;
  numero_dispositivo?: string; // e.g., "art. 165 § 1º"
  section?: string; // Section title if available
  order: number;
}

// Schema for validating chunk input
const ChunkInputSchema = z.object({
  text: z.string().min(10),
  normaId: z.string(),
  documentType: z.enum(['lei', 'resolucao', 'portaria', 'manual']),
});

export type ChunkInput = z.infer<typeof ChunkInputSchema>;

// Regular expressions to detect article/section patterns
// Note: These patterns are used by extractDispositivoNumber() inline
// const ARTICLE_PATTERN = /(?:art\.?\s*|artigo\s+)(\d+(?:\s*[-–]\s*\d+)?)/gi;
// const SECTION_PATTERN = /(?:§|seção|secção)\s+(\d+(?:\s*[-–]\s*\d+)?)/gi;
// const PARAGRAPH_PATTERN = /^\s*§\s*\d+/m;
// const TITLE_PATTERN = /^#{1,3}\s+.+$/gm;

/**
 * Detects article numbers in text and returns the article number and position
 * Example: "Art. 165 § 1º" -> "art. 165 § 1º"
 */
function extractDispositivoNumber(text: string): string | undefined {
  // Match common patterns: Art. 165, art. 165 § 1º, art. 165 § 1º a
  const dispositivoMatch = text.match(
    /(?:art\.?|artigo)\s+(\d+)(?:\s*[-–§]\s*(\d+[ºabc]?)?)?/i,
  );

  if (dispositivoMatch) {
    let numero = `art. ${dispositivoMatch[1]}`;
    if (dispositivoMatch[2]) {
      numero += ` § ${dispositivoMatch[2]}`;
    }
    return numero.toLowerCase();
  }

  return undefined;
}

/**
 * Splits text into chunks preserving document structure
 * Target chunk size is ~500 characters, but respects paragraph breaks
 */
export function chunkText(
  text: string,
  targetChunkSize: number = 500,
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let chunkOrder = 0;
  let lastDispositivoNumber: string | undefined;

  // Split by paragraphs (double line breaks)
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  for (const paragraph of paragraphs) {
    // Check if this paragraph starts with a dispositivo number
    const dispositivoNumber = extractDispositivoNumber(paragraph);
    if (dispositivoNumber) {
      lastDispositivoNumber = dispositivoNumber;
    }

    // If current chunk + paragraph would exceed target size, save current chunk
    if (
      currentChunk.length > 0 &&
      currentChunk.length + paragraph.length > targetChunkSize
    ) {
      chunks.push({
        text: currentChunk.trim(),
        numero_dispositivo: lastDispositivoNumber,
        order: chunkOrder++,
      });
      currentChunk = '';
    }

    // Add paragraph to current chunk
    currentChunk += (currentChunk ? '\n\n' : '') + paragraph;

    // If current chunk is large enough or is the last paragraph, consider saving
    if (currentChunk.length >= targetChunkSize) {
      // Try to find a good break point (end of sentence)
      const lastPeriodIndex = currentChunk.lastIndexOf('.');
      if (
        lastPeriodIndex > targetChunkSize * 0.7 &&
        lastPeriodIndex < currentChunk.length - 1
      ) {
        // Save up to the last period
        chunks.push({
          text: currentChunk.substring(0, lastPeriodIndex + 1).trim(),
          numero_dispositivo: lastDispositivoNumber,
          order: chunkOrder++,
        });
        currentChunk = currentChunk.substring(lastPeriodIndex + 1).trim();
      }
    }
  }

  // Save remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      numero_dispositivo: lastDispositivoNumber,
      order: chunkOrder++,
    });
  }

  // Safety net: a paragraph with no period near its end (e.g. a wall of
  // text with no punctuation) skips the sentence-break above entirely and
  // comes out here as one oversized chunk — large enough to blow past an
  // embedding provider's input limit. Hard-split anything still far bigger
  // than the target instead of shipping it as-is.
  const sized = chunks.flatMap((chunk) => splitOversizedChunk(chunk, targetChunkSize));

  // Validate chunk size - remove empty chunks and ensure quality
  return sized
    .filter((chunk) => chunk.text.length > 20)
    .map((chunk, i) => ({ ...chunk, order: i }));
}

const MAX_CHUNK_MULTIPLIER = 4;

/**
 * Splits a chunk that's far larger than the target size into ~target-sized
 * pieces, breaking on whitespace so words stay intact.
 */
function splitOversizedChunk(chunk: TextChunk, targetChunkSize: number): TextChunk[] {
  const maxSize = targetChunkSize * MAX_CHUNK_MULTIPLIER;
  if (chunk.text.length <= maxSize) {
    return [chunk];
  }

  const pieces: TextChunk[] = [];
  let rest = chunk.text;

  while (rest.length > maxSize) {
    let breakAt = rest.lastIndexOf(' ', targetChunkSize);
    if (breakAt < targetChunkSize * 0.5) {
      breakAt = targetChunkSize; // no good whitespace break — cut hard
    }

    pieces.push({
      text: rest.slice(0, breakAt).trim(),
      numero_dispositivo: chunk.numero_dispositivo,
      order: chunk.order,
    });
    rest = rest.slice(breakAt).trim();
  }

  if (rest.length > 0) {
    pieces.push({ text: rest, numero_dispositivo: chunk.numero_dispositivo, order: chunk.order });
  }

  return pieces;
}

/**
 * Validates and chunks text according to specifications
 */
export async function validateAndChunk(input: Partial<ChunkInput>): Promise<TextChunk[]> {
  // Validate input with zod
  const validated = ChunkInputSchema.parse(input);

  return chunkText(validated.text);
}
