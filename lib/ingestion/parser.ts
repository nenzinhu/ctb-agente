// Document parser: PDF, Word (DOCX and 97-2003 DOC), Markdown and TXT
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// For PDF parsing. Use the "legacy" Node build, not the default browser
// build — pdfjs-dist warns about this every time the wrong one loads
// server-side, and the browser build's worker setup doesn't resolve
// correctly here anyway.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

// DOCX (mammoth keeps paragraph breaks) and DOC (Word 97-2003 binary format)
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';

import { FORMATOS, formatoDoArquivo, type FormatoDocumento } from './formats';
import { joinPdfPages, pageItemsToText, stripPageMarkers, type PdfTextItem } from './pdf-text';
import { convertReadablePageMarkers, decodeTextBytes, markdownToText, normalizeLineBreaks } from './plain-text';

// Kept here for callers that already import them from the parser.
export { pageItemsToText, normalizePdfText } from './pdf-text';

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
  /** Extracted text. PDFs carry page markers (see lib/ingestion/pdf-text.ts). */
  text: string;
  fileName: string;
  fileType: FormatoDocumento;
  pageCount?: number;
  extractedAt: string;
}

const EXTENSOES_ACEITAS = (Object.keys(FORMATOS) as FormatoDocumento[]).flatMap((f) => FORMATOS[f].extensoes);

// Schema for file validation
const FileValidationSchema = z.object({
  filePath: z.string(),
  fileName: z.string(),
  maxSizeBytes: z.number().default(50 * 1024 * 1024), // 50MB default
  allowedTypes: z.array(z.string()).default(EXTENSOES_ACEITAS),
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
  if (!validated.allowedTypes.includes(ext)) {
    throw new Error(
      `File type not allowed: ${ext}. Allowed: ${validated.allowedTypes.join(', ')}`,
    );
  }
}

type Conteudo = 'pdf' | 'zip' | 'ole' | 'rtf' | 'texto';

/**
 * What the bytes really are, whatever the extension says: a .doc that is
 * really a .docx (or the other way round) is common when files are renamed.
 */
function detectContent(bytes: Buffer): Conteudo {
  const head = bytes.subarray(0, 8);
  if (head.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) return 'zip';
  if (head.equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return 'ole';
  if (head.subarray(0, 5).toString('latin1') === '{\\rtf') return 'rtf';
  return 'texto';
}

/**
 * Parses a DOCX file using mammoth
 */
async function parseDocx(bytes: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: bytes });
  if (result.messages && result.messages.length > 0) {
    console.warn('DOCX parsing warnings:', result.messages);
  }
  return normalizeLineBreaks(result.value);
}

/**
 * Parses a Word 97-2003 (.doc) file. word-extractor ends each paragraph with
 * a single "\n"; the chunker reads a single newline as a wrapped line, so
 * paragraphs are turned into blank-line separated blocks.
 */
async function parseDoc(bytes: Buffer): Promise<string> {
  const document = await new WordExtractor().extract(bytes);
  return normalizeLineBreaks(document.getBody().replace(/\n/g, '\n\n'));
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

/**
 * Parses a PDF file using pdfjs-dist
 */
async function parsePdf(bytes: Buffer): Promise<{ text: string; pageCount: number }> {
  // pdfjs-dist rejects a Node Buffer even though Buffer is technically a
  // Uint8Array subclass — it checks the exact constructor. A plain
  // Uint8Array view over the same bytes passes that check without a copy.
  const data = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);

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
        pages.push('');
        console.warn(`Failed to extract text from page ${i}:`, pageError);
      }
    }

    if (failedPages === pageCount) {
      throw new Error('não foi possível ler o texto de nenhuma página do PDF.');
    }

    // Running headers/footers removed, one page marker per page.
    const text = joinPdfPages(pages);

    // A scanned PDF is just page images: pdfjs finds (almost) no text. Say
    // so instead of the generic "no text content" error further down.
    if (stripPageMarkers(text).replace(/\s/g, '').length < pageCount * 5) {
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
 * Main parsing function — picks the extractor by the file's real content,
 * falling back to its extension for plain text (TXT/Markdown).
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

  const declarado = formatoDoArquivo(fileName) ?? 'txt';
  let fileType: FormatoDocumento = declarado;
  let text: string;
  let pageCount: number | undefined;

  try {
    const bytes = fs.readFileSync(filePath);
    const conteudo = detectContent(bytes);

    if (conteudo === 'pdf') {
      const result = await parsePdf(bytes);
      text = result.text;
      pageCount = result.pageCount;
      fileType = 'pdf';
    } else if (conteudo === 'zip') {
      text = await parseDocx(bytes);
      fileType = 'docx';
    } else if (conteudo === 'ole') {
      text = await parseDoc(bytes);
      fileType = 'doc';
    } else if (conteudo === 'rtf') {
      throw new Error('o arquivo é RTF. Abra no Word ou LibreOffice e salve como .docx ou .pdf.');
    } else if (declarado === 'pdf' || declarado === 'docx' || declarado === 'doc') {
      throw new Error(`o conteúdo não é um ${FORMATOS[declarado].rotulo} válido (arquivo corrompido ou renomeado).`);
    } else {
      const decoded = decodeTextBytes(bytes);
      text = convertReadablePageMarkers(declarado === 'md' ? markdownToText(decoded) : normalizeLineBreaks(decoded));
    }

    if (!text || stripPageMarkers(text).length === 0) {
      throw new Error('No text content extracted from file');
    }

    return {
      text,
      fileName,
      fileType,
      pageCount,
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(
      `Falha ao ler o documento: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
