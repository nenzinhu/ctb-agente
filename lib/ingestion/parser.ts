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

/**
 * Parses a PDF file using pdfjs-dist
 */
async function parsePdf(filePath: string): Promise<{ text: string; pageCount: number }> {
  try {
    // pdfjs-dist rejects a Node Buffer even though Buffer is technically a
    // Uint8Array subclass — it checks the exact constructor. Copy into a
    // plain Uint8Array before handing it over.
    const pdfBuffer = fs.readFileSync(filePath);
    const data = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);

    // The legacy Node build detects it isn't running in a browser and
    // falls back to an in-process "fake worker" automatically — no
    // GlobalWorkerOptions.workerSrc needed, which avoids resolving a
    // worker script path across bundlers/hosts (a source of failures on
    // its own).
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    let fullText = '';
    const pageCount = pdf.numPages;

    // Extract text from each page
    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Combine text items into a coherent string
        const pageText = textContent.items
          .map((item: any) => (item.str ? item.str : ''))
          .join('');

        fullText += pageText + '\n';
      } catch (pageError) {
        console.warn(`Failed to extract text from page ${i}:`, pageError);
        continue;
      }
    }

    // Clean up text
    const cleanedText = fullText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { text: cleanedText, pageCount };
  } catch (error) {
    throw new Error(
      `Failed to parse PDF file: ${error instanceof Error ? error.message : String(error)}`,
    );
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
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
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
      `Document parsing failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
