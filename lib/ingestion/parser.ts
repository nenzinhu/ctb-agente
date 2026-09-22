// Document parser for PDF, DOCX, and TXT files
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// For PDF parsing. Use the "legacy" Node build, not the default browser
// build — pdfjs-dist warns about this every time the wrong one loads
// server-side, and the browser build's worker setup doesn't resolve
// correctly here anyway.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

// For DOCX parsing
import mammoth from 'mammoth';

// Without this, pdfjs falls back to `await import(workerSrc)` at parse
// time to find its worker code. That works in a plain node_modules
// checkout, but once Next.js/Vercel bundles this route into a single
// file, there's no pdf.worker.mjs sitting next to it on disk and the
// dynamic import 404s ("Cannot find module '.../pdf.worker.mjs'").
// Registering the handler pdfjs already bundled via this static import
// short-circuits that lookup entirely — see PDFWorker.#mainThreadWorkerMessageHandler
// in pdfjs-dist/legacy/build/pdf.mjs.
(globalThis as unknown as { pdfjsWorker?: { WorkerMessageHandler: unknown } }).pdfjsWorker = {
  WorkerMessageHandler,
};

export interface ParsedDocument {
  text: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  pageCount?: number;
  extractedAt: string;
}

// Schema for file validation
const FileValidationSchema = z.object({
  filePath: z.string(),
  fileName: z.string(),
  maxSizeBytes: z.number().default(50 * 1024 * 1024), // 50MB default
  allowedTypes: z
    .array(z.enum(['pdf', 'docx', 'txt']))
    .default(['pdf', 'docx', 'txt']),
});

export type FileValidationInput = z.infer<typeof FileValidationSchema>;

/**
 * Validates file size and type
 */
export function validateFile(input: Partial<FileValidationInput>): void {
  const validated = FileValidationSchema.parse(input);

  // Check file exists
  if (!fs.existsSync(validated.filePath)) {
    throw new Error(`File not found: ${validated.filePath}`);
  }

  // Check file size
  const stats = fs.statSync(validated.filePath);
  if (stats.size > validated.maxSizeBytes) {
    throw new Error(
      `File too large: ${stats.size} bytes exceeds ${validated.maxSizeBytes} bytes`,
    );
  }

  // Check file type
  const ext = path.extname(validated.fileName).toLowerCase().slice(1);
  if (!validated.allowedTypes.includes(ext as any)) {
    throw new Error(
      `File type not allowed: ${ext}. Allowed: ${validated.allowedTypes.join(', ')}`,
    );
  }
}

/**
 * Parses a TXT file
 */
async function parseTxt(filePath: string): Promise<string> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Clean up excessive whitespace and normalize line breaks
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (error) {
    throw new Error(
      `Failed to parse TXT file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Parses a DOCX file using mammoth
 */
async function parseDocx(filePath: string): Promise<string> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: fileBuffer });

    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX parsing warnings:', result.messages);
    }

    // Clean up excessive whitespace
    return result.value
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (error) {
    throw new Error(
      `Failed to parse DOCX file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// pdfjs needs these data files for two very common kinds of PDF: CMaps for
// CID-keyed fonts (what Word/LibreOffice emit for most non-ASCII text —
// without them the text layer of a Portuguese document can come out empty
// or garbled) and the standard 14 font metrics for PDFs that reference
// Helvetica/Times without embedding them (typical of government PDFs).
// They're resolved from node_modules at runtime; next.config.ts traces them
// into the deployed function via outputFileTracingIncludes.
const PDFJS_DIR = path.join(process.cwd(), 'node_modules', 'pdfjs-dist');

function pdfjsDataDir(name: string): string | undefined {
  const dir = path.join(PDFJS_DIR, name);
  return fs.existsSync(dir) ? dir + path.sep : undefined;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

/**
 * Rebuilds a page's reading text from pdfjs text items.
 *
 * pdfjs hands back positioned fragments, not lines: a word can be split in
 * several items (kerning) and many PDFs never set `hasEOL`. Joining with ''
 * glued words together and joining with ' ' split words apart, and neither
 * produced line/paragraph breaks — so an entire page reached the chunker as
 * one run-on paragraph. Using each item's position instead: a vertical move
 * starts a new line (a bigger-than-usual gap starts a new paragraph), and a
 * horizontal gap between fragments on the same line becomes a space.
 */
export function pageItemsToText(items: PdfTextItem[]): string {
  let out = '';
  let lastY: number | undefined;
  let lastEndX = 0;
  let lastHeight = 0;

  for (const item of items) {
    if (typeof item.str !== 'string') continue; // marked-content markers

    const [, , , scaleY, x, y] = item.transform ?? [];
    const height = Math.abs(item.height || scaleY || 0) || lastHeight || 10;

    if (lastY !== undefined && typeof y === 'number') {
      const dy = Math.abs(y - lastY);
      if (dy > Math.max(height, lastHeight) * 0.5) {
        out = out.replace(/[ \t]+$/, '');
        out += dy > Math.max(height, lastHeight) * 1.9 ? '\n\n' : '\n';
      } else if (typeof x === 'number' && x - lastEndX > height * 0.15 && !/\s$/.test(out) && !/^\s/.test(item.str)) {
        out += ' ';
      }
    }

    out += item.str;

    if (typeof y === 'number') {
      lastY = y;
      lastEndX = (typeof x === 'number' ? x : lastEndX) + (item.width || 0);
    } else if (item.hasEOL) {
      out += '\n';
    }
    if (item.str.trim()) lastHeight = height;
  }

  return out;
}

/**
 * Normalizes extracted PDF text so the chunker can find real boundaries:
 * rejoins words hyphenated across lines and forces a paragraph break before
 * every article/paragraph/chapter heading, which legal PDFs usually set
 * with uniform line spacing (no visual blank line to detect).
 */
export function normalizePdfText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .replace(/\n(?=(?:Art\.?|Artigo|§|CAP[IÍ]TULO|T[IÍ]TULO|SE[CÇ][AÃ]O|Se[cç][aã]o)\s)/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parses a PDF file using pdfjs-dist
 */
async function parsePdf(filePath: string): Promise<{ text: string; pageCount: number }> {
  // pdfjs-dist rejects a Node Buffer even though Buffer is technically a
  // Uint8Array subclass — it checks the exact constructor. A plain
  // Uint8Array view over the same bytes passes that check without a copy.
  const pdfBuffer = fs.readFileSync(filePath);
  const data = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);

  let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
  try {
    // The legacy Node build detects it isn't running in a browser and
    // falls back to an in-process "fake worker" (registered at the top of
    // this file) — no GlobalWorkerOptions.workerSrc needed.
    pdf = await pdfjsLib.getDocument({
      data,
      cMapUrl: pdfjsDataDir('cmaps'),
      cMapPacked: true,
      standardFontDataUrl: pdfjsDataDir('standard_fonts'),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
    }).promise;
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'PasswordException') {
      throw new Error('o PDF está protegido por senha. Remova a senha e envie novamente.');
    }
    if (name === 'InvalidPDFException') {
      throw new Error('o arquivo não é um PDF válido ou está corrompido.');
    }
    throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const pageCount = pdf.numPages;
    const pages: string[] = [];
    let failedPages = 0;

    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        pages.push(pageItemsToText(textContent.items as PdfTextItem[]));
        page.cleanup();
      } catch (pageError) {
        failedPages++;
        console.warn(`Failed to extract text from page ${i}:`, pageError);
      }
    }

    if (failedPages === pageCount) {
      throw new Error('não foi possível ler o texto de nenhuma página do PDF.');
    }

    // Blank line between pages so the chunker sees a paragraph break at
    // every page boundary.
    const text = normalizePdfText(pages.join('\n\n'));

    // A scanned PDF is just page images: pdfjs finds (almost) no text. Say
    // so instead of the generic "no text content" error further down.
    if (text.replace(/\s/g, '').length < pageCount * 5) {
      throw new Error(
        'o PDF não tem texto selecionável (parece ser digitalizado/escaneado). Passe um OCR no arquivo antes de enviar.',
      );
    }

    return { text, pageCount };
  } finally {
    await pdf.destroy().catch(() => undefined);
  }
}

/**
 * Main parsing function - handles PDF, DOCX, and TXT files
 */
export async function parseDocument(
  filePath: string,
  fileName: string,
): Promise<ParsedDocument> {
  // Validate file first
  validateFile({
    filePath,
    fileName,
    // Storage caps the *uploaded* bytes at 50MB, but the admin panel may
    // gzip a file first, so the restored original can be larger — matches
    // MAX_DECOMPRESSED_BYTES in lib/ingestion/decompress.ts.
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
  });

  const ext = path.extname(fileName).toLowerCase().slice(1);
  let text: string;
  let pageCount: number | undefined;

  try {
    if (ext === 'pdf') {
      const result = await parsePdf(filePath);
      text = result.text;
      pageCount = result.pageCount;
    } else if (ext === 'docx') {
      text = await parseDocx(filePath);
    } else if (ext === 'txt') {
      text = await parseTxt(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    if (!text || text.length === 0) {
      throw new Error('No text content extracted from file');
    }

    return {
      text,
      fileName,
      fileType: ext as 'pdf' | 'docx' | 'txt',
      pageCount,
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(
      `Falha ao ler o documento: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
