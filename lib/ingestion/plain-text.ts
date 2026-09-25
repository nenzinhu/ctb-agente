// Text-file helpers for ingestion (TXT, Markdown, and the text the .doc
// extractor returns). Pure module, no Node APIs.
// Page markers now live with the other page helpers.
export { convertReadablePageMarkers, readablePageMarker } from './pdf-text';

/**
 * Decodes a text file without mangling accents. Files saved on Windows are
 * often Windows-1252 (Latin-1), not UTF-8: read as UTF-8, every "ç"/"ã"
 * became "�" and those words never matched a search again.
 * @param bytes - Raw file content
 * @returns Decoded text (BOM removed)
 */
export function decodeTextBytes(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  const body =
    bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    return new TextDecoder('windows-1252').decode(body);
  }
}

/**
 * Line endings, stray NULs and runs of blank lines, the same way for every format.
 */
export function normalizeLineBreaks(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Markdown → text the chunker understands: keeps headings (#) and list
 * markers — they carry the document's structure — and drops the markup
 * that would only add noise to excerpts and search (links, emphasis,
 * images, code fences, table rulers, HTML tags).
 */
export function markdownToText(markdown: string): string {
  return normalizeLineBreaks(markdown)
    .replace(/^```.*$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)*\|?[ \t]*$/gm, '')
    .replace(/^[ \t]*\|(.*)\|[ \t]*$/gm, (_row, cells: string) => cells.split('|').map((c) => c.trim()).join(' | '))
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
    .replace(/(^|[\s(])[*_](?=\S)([^*_\n]*?\S)[*_](?=[\s).,;:!?]|$)/gm, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[ \t]*>[ \t]?/gm, '')
    .replace(/^([ \t]*)[*+][ \t]+/gm, '$1- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
