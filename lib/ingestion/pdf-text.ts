// Rebuilding readable text from pdf.js text items. Pure module: the server
// parser (lib/ingestion/parser.ts) and the browser PDF compressor
// (lib/pdf-tools/compressor.ts) both use it, so a PDF reads the same way
// whether it is indexed on the server or converted in the browser.

export interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

/**
 * Page boundaries travel inside the extracted text as a line of their own,
 * so the chunker can tell which page each excerpt starts on. ASCII on
 * purpose: String#trim() strips control characters such as \f.
 */
export const PAGE_MARKER_RE = /^\[\[pagina:(\d+)\]\]$/;

export function pageMarker(page: number): string {
  return `[[pagina:${page}]]`;
}

// "--- Página 3 ---": the page separator written by the PDF compressor's
// text-only outputs (lib/pdf-tools), so converted files keep the original
// page numbers when they are indexed later.
const READABLE_PAGE_MARKER_RE = /^-{2,}\s*P[áa]gina\s+(\d+)\s*-{2,}$/gim;

export function readablePageMarker(page: number): string {
  return `--- Página ${page} ---`;
}

/**
 * @param text - Text that may contain "--- Página N ---" lines
 * @returns Text with those lines turned into the chunker's page markers
 */
export function convertReadablePageMarkers(text: string): string {
  return text.replace(READABLE_PAGE_MARKER_RE, (_line, page: string) => pageMarker(Number(page)));
}

function hasReadablePageMarkers(text: string): boolean {
  return /^-{2,}\s*P[áa]gina\s+\d+\s*-{2,}$/im.test(text);
}

/**
 * @param text - Extracted text, possibly carrying page markers
 * @returns The same text without them
 */
export function stripPageMarkers(text: string): string {
  return text.replace(/^\[\[pagina:\d+\]\]$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
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

// Pronouns attached with a hyphen ("conduzi-lo", "lavrar-se-á", "aplica-se").
// A line ending in "-" followed by one of them is a real hyphen, not a word
// split across lines, and must stay.
const CLITICO_RE = /^(?:se|lo|la|los|las|lhe|lhes|me|te|nos|vos|o|a|os|as|no|na|nas)$/;

/**
 * Joins a wrapped line to the one before it, undoing end-of-line hyphenation
 * ("infra-" + "ção" → "infração") but keeping real hyphens ("conduzi-" + "lo").
 */
export function joinWrappedLine(antes: string, depois: string): string {
  const fragmento = /^(\p{Ll}+)(?=\P{L}|$)/u.exec(depois)?.[1];
  if (/\p{L}-$/u.test(antes) && fragmento) {
    return CLITICO_RE.test(fragmento) ? `${antes}${depois}` : `${antes.slice(0, -1)}${depois}`;
  }
  return `${antes} ${depois}`;
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
    .replace(/(\p{L})-\n(\p{Ll}+)(?=\P{L}|$)/gu, (_m, antes: string, depois: string) =>
      CLITICO_RE.test(depois) ? `${antes}-${depois}` : `${antes}${depois}`
    )
    .replace(/\n(?=(?:Art\.?|Artigo|§|CAP[IÍ]TULO|T[IÍ]TULO|SE[CÇ][AÃ]O|Se[cç][aã]o)\s)/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Headers sit in the first lines of a page (a POP's header is often a 4-5
// line table), footers in the last ones.
const TOP_LINES = 5;
const BOTTOM_LINES = 3;

// Structural lines of a law are never running headers, however often they repeat.
const LEGAL_LINE_RE = /^(?:art\.?\s*\d|artigo\s|§|par[áa]grafo|[ivxl]+\s*[-–—]|infra[çc][ãa]o|penalidade|medida\s+administrativa)/i;
const PAGE_NUMBER_RE = /^(?:p[áa]g(?:ina)?\.?\s*)?#(?:\s*(?:de|\/)\s*#)?$|^-\s*#\s*-$/;
const MENTIONS_PAGE_RE = /p[áa]g(?:ina)?\.?\s*\d|\bpage\s*\d|\d+\s*(?:de|\/)\s*\d+/i;

const exactKey = (line: string) => line.toLowerCase().replace(/\s+/g, ' ').trim();
const digitKey = (line: string) => exactKey(line).replace(/\d+/g, '#');

// A line ending in "POP" / "POP nº": the next line is the POP's number.
const POP_ROTULO_RE = /\bPOP(?:\s*n[º°o]\.?)?$/i;

/** Index of the closest filled line above `i`, or -1. */
function anteriorPreenchida(lines: string[], i: number): number {
  for (let j = i - 1; j >= 0; j--) {
    if (lines[j].trim()) return j;
  }
  return -1;
}

/**
 * Drops running headers/footers — lines repeated at the top or bottom of
 * most pages ("Página 3 de 120", the site URL and print date on a Planalto
 * PDF, the "POLÍCIA MILITAR DE SANTA CATARINA" block of a POP). Left in, they
 * land in almost every excerpt and drown the real content in search.
 * @param pages - Text of each page, in order
 * @returns The pages without those lines
 */
export function removeRunningHeaders(pages: string[]): string[] {
  if (pages.length < 3) return pages;

  const split = pages.map((page) => page.split('\n'));
  const edges = split.map((lines) => {
    const filled = lines.map((_line, i) => i).filter((i) => lines[i].trim());
    const top = filled.slice(0, TOP_LINES);
    const bottom = filled.slice(Math.max(TOP_LINES, filled.length - BOTTOM_LINES));
    return [...top.map((i) => ({ i, pos: 'topo' })), ...bottom.map((i) => ({ i, pos: 'rodape' }))];
  });

  // In how many pages each line shows up at the same edge. Lines carrying a
  // page number ("POP 1.01 - Pág. 3/8") also count with the digits masked.
  const seen = new Map<string, number>();
  split.forEach((lines, p) => {
    const keys = new Set<string>();
    for (const { i, pos } of edges[p]) {
      keys.add(`${pos}|${exactKey(lines[i])}`);
      if (MENTIONS_PAGE_RE.test(lines[i])) keys.add(`${pos}|#|${digitKey(lines[i])}`);
    }
    for (const key of keys) seen.set(key, (seen.get(key) ?? 0) + 1);
  });

  const threshold = Math.max(3, Math.ceil(pages.length * 0.5));
  const repeated = (key: string) => (seen.get(key) ?? 0) >= threshold;

  return split.map((lines, p) => {
    const drop = new Set(
      edges[p]
        .filter(({ i, pos }) => {
          const line = lines[i].trim();
          if (LEGAL_LINE_RE.test(line) || hasReadablePageMarkers(line)) return false;
          return (
            PAGE_NUMBER_RE.test(digitKey(line)) ||
            repeated(`${pos}|${exactKey(line)}`) ||
            (MENTIONS_PAGE_RE.test(line) && repeated(`${pos}|#|${digitKey(line)}`))
          );
        })
        .map(({ i }) => i)
    );
    // "POP" / "002": the POP's number in its header box, not a page number —
    // unless the box repeats on most pages and goes as a running header too.
    for (const i of [...drop]) {
      const anterior = anteriorPreenchida(lines, i);
      if (anterior >= 0 && !drop.has(anterior) && POP_ROTULO_RE.test(lines[anterior].trim())) drop.delete(i);
    }
    return lines.filter((_line, i) => !drop.has(i)).join('\n');
  });
}

/**
 * The text a PDF converted in the browser ("Máxima") is uploaded as: the same
 * cleanup the server applies to a PDF (joinPdfPages), with "--- Página N ---"
 * lines the indexer turns back into page numbers. Unlike the .txt offered for
 * download, lines are not reflowed, so structure detection (articles, POP
 * header boxes) sees exactly what it would see in the PDF.
 * @param pages - Raw text of each page (from pageItemsToText)
 */
export function pdfTextForUpload(pages: string[]): string {
  const limpas = removeRunningHeaders(pages);
  return `${normalizePdfText(limpas.map((page, i) => `${readablePageMarker(i + 1)}\n${page}`).join('\n\n'))}\n`;
}

/**
 * Joins the pages of a PDF into one text with page markers.
 * @param pages - Raw text of each page (from pageItemsToText)
 * @returns Normalized text the chunker understands
 */
export function joinPdfPages(pages: string[]): string {
  const limpas = removeRunningHeaders(pages);
  // A text-only PDF made by the compressor names the original pages itself;
  // its own page breaks would renumber them.
  if (limpas.some(hasReadablePageMarkers)) {
    return normalizePdfText(convertReadablePageMarkers(limpas.join('\n\n')));
  }
  return normalizePdfText(limpas.map((page, i) => `${pageMarker(i + 1)}\n${page}`).join('\n\n'));
}
