// Pure helpers of the PDF compressor: page texts → text-only outputs.
import { blocosDeTexto } from '@/lib/ingestion/chunker';
import { readablePageMarker, removeRunningHeaders } from '@/lib/ingestion/pdf-text';
import type { DocumentoTexto } from './pdf-writer';

/**
 * @param titulo - Document title (file name without extension)
 * @param paginas - Raw text of each page (pageItemsToText)
 * @returns Blocks per page for pdfSomenteTexto, running headers removed
 */
export function paginasParaDocumento(titulo: string, paginas: string[]): DocumentoTexto {
  return { titulo, paginas: removeRunningHeaders(paginas).map((pagina) => blocosDeTexto(pagina)) };
}

/**
 * Plain-text version with "--- Página N ---" separators, which the indexer
 * reads back as page numbers.
 */
export function paginasParaTxt(titulo: string, paginas: string[]): string {
  const corpo = removeRunningHeaders(paginas)
    .map((pagina, i) => `${readablePageMarker(i + 1)}\n${blocosDeTexto(pagina).map((b) => b.texto).join('\n\n')}`)
    .join('\n\n');
  return `${titulo}\n\n${corpo}\n`;
}

/**
 * Whether the pages carry any selectable text at all (a scanned PDF doesn't).
 */
export function temTexto(paginas: string[]): boolean {
  return paginas.join('').replace(/\s/g, '').length >= Math.max(20, paginas.length * 5);
}
