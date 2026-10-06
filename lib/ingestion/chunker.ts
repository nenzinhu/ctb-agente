// Structure-aware chunker.
//
// Legal texts (CTB, resoluções) are cut at every article: an excerpt never
// mixes the end of one article with the start of the next, and it is
// labeled only by the article heading that opens it — never by an article
// it merely cites ("nos termos do art. 270"). A long article is split at its
// own paragraphs/incisos, and each continuation says where it starts
// ("art. 181 XVII", "art. 165 § 1º").
//
// Procedural documents (POP-PMSC, manuais) are cut at their section
// headings ("SEQUÊNCIA DAS AÇÕES", "3.1 Da abordagem", "# Título") and
// packed up to the size limit inside each section.
import { PAGE_MARKER_RE, joinWrappedLine } from './pdf-text';
import { getSettings } from '../config/settings';

export interface TextChunk {
  text: string;
  /** Legal reference: "art. 165", "art. 165-A", "art. 181 XVII", "art. 165 § 1º". */
  numero_dispositivo?: string;
  /** Nearest heading above the excerpt (chapter, POP section…). */
  section?: string;
  /** Page the excerpt starts on, when the source had pages. */
  page?: number;
  order: number;
}

export type ChunkMode = 'legal' | 'secoes';

/** Soft size limit of an excerpt, in characters (~300 tokens of Portuguese). */
export const DEFAULT_CHUNK_CHARS = 1200;
export const DEFAULT_MIN_CHUNK_CHARS = 20;

type UnitKind = 'artigo' | 'titulo' | 'paragrafo' | 'inciso' | 'item' | 'texto';

interface Unit {
  kind: UnitKind;
  text: string;
  page?: number;
  /** Headings only: nesting depth (see headingLevel). */
  nivel?: number;
}

// Article heading at the start of a paragraph: "Art. 165.", "Art. 165-A.",
// "Art. 1º", "Artigo 5º", "art. 165 proíbe…".
const ARTIGO_RE = /^(?:art\.?|artigo)\s*(\d+)\s*[ºo°]?(?:-([A-Za-z])(?![A-Za-z]))?/i;
// Inside a paragraph (a wrapped PDF line) only the unambiguous form counts:
// capital "Art." and a separator after the number. A wrapped citation such
// as "art. 280, observado…" never matches.
const ARTIGO_ESTRITO_RE = /^(?:Art\.|Artigo)\s*\d+(?:-[A-Z])?\s*(?:[ºo°]\s*[.\-–—]?|[.\-–—])\s/;
const PARAGRAFO_RE = /^(?:§\s*(\d+)\s*[ºo°]?|(Par[áa]grafo\s+[úu]nico))/i;
const INCISO_RE = /^(L?X{0,3}(?:IX|IV|V?I{0,3}))\s*[-–—]\s*\S/;
const ALINEA_RE = /^[a-z]\)\s*\S/;
const ITEM_RE = /^(?:[-–•●▪◦*·]\s+\S|\d{1,3}\s*[.)]\s+\S|\d{1,3}\s+[-–]\s+\S)/;
// CTB penalty lines, one per line in the source.
const CAMPO_CTB_RE = /^(?:Infra[çc][ãa]o|Penalidade|Medida\s+administrativa)\s*[-–—:]/i;
const TITULO_RE =
  /^(?:t[íi]tulo|cap[íi]tulo|se[çc][ãa]o|subse[çc][ãa]o|livro|parte|anexo)(?:\s+(?:[IVXLCDM]+|\d+|[úu]nic[oa])\b|\s*$)/i;
const MD_TITULO_RE = /^#{1,6}\s+(\S.*)$/;
const TITULO_NUMERADO_RE = /^\d+(?:\.\d+)+\.?\s+[A-ZÀ-Ý]/;
const VETADO_RE = /^\(?\s*(?:vetad[oa]|revogad[oa])/i;

/**
 * Short line in capitals, e.g. "SEQUÊNCIA DAS AÇÕES" or "1. FINALIDADE".
 */
function isCapsHeading(line: string): boolean {
  if (line.length > 100 || /[,;]$/.test(line) || VETADO_RE.test(line) || INCISO_RE.test(line)) return false;
  const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 4 || line.split(/\s+/).length > 14) return false;
  const upper = letters.replace(/[^A-ZÀ-Ý]/g, '').length;
  return upper / letters.length >= 0.85;
}

function classify(line: string, atParagraphStart: boolean, mode: ChunkMode): UnitKind {
  if (ARTIGO_RE.test(line) && (atParagraphStart || ARTIGO_ESTRITO_RE.test(line))) {
    return mode === 'legal' ? 'artigo' : 'item';
  }
  if ((TITULO_RE.test(line) && line.length <= 120) || MD_TITULO_RE.test(line)) return 'titulo';
  if (PARAGRAFO_RE.test(line)) return 'paragrafo';
  if (INCISO_RE.test(line) && !/^\s*[-–—]/.test(line)) return 'inciso';
  if (ALINEA_RE.test(line)) return 'item';
  if (mode === 'secoes' && (isCapsHeading(line) || (TITULO_NUMERADO_RE.test(line) && line.length <= 90 && !/[.;:,]$/.test(line)))) {
    return 'titulo';
  }
  if (mode === 'legal' && atParagraphStart && isCapsHeading(line) && line.split(/\s+/).length <= 8) return 'titulo';
  if (ITEM_RE.test(line) || CAMPO_CTB_RE.test(line)) return 'item';
  return 'texto';
}

// Name of a chapter/section in normal case: "Da Autuação", "Das Disposições…".
const NOME_DE_TITULO_RE = /^(?:D[aeo]s?|Disposi[çc][õo]es|Normas|Regras)\s/;

/**
 * Whether a line completes the heading right above it (its name, a note in
 * parentheses, or the wrapped rest of a long name).
 */
function continuesHeading(titulo: string, line: string, kind: UnitKind): boolean {
  if (titulo.length > 200 || MD_TITULO_RE.test(titulo) || MD_TITULO_RE.test(line)) return false;
  if (kind === 'titulo') return true;
  if (kind !== 'texto') return false;
  if (isCapsHeading(line)) return true;
  // Normal-case names only follow keyword headings ("Seção II", "CAPÍTULO XV").
  if (!TITULO_RE.test(titulo)) return false;
  return (
    line.length <= 160 &&
    !/[:;,]$/.test(line) &&
    (NOME_DE_TITULO_RE.test(line) || /^\(.*\)$/.test(line) || /^\p{Ll}/u.test(line))
  );
}

/**
 * Splits text into structural units. A blank line or a structural marker
 * (article, §, inciso, list item, heading) starts a unit; any other line is
 * a wrapped continuation and is reflowed into the unit it continues.
 */
function segment(text: string, mode: ChunkMode): Unit[] {
  const units: Unit[] = [];
  let current: Unit | null = null;
  let page: number | undefined;
  let atParagraphStart = true;

  const close = () => {
    if (current && current.text.trim()) units.push(current);
    current = null;
  };

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/[ \t ]+/g, ' ').trim();
    if (!line) {
      close();
      atParagraphStart = true;
      continue;
    }

    const marker = PAGE_MARKER_RE.exec(line);
    if (marker) {
      close();
      page = Number(marker[1]);
      atParagraphStart = true;
      continue;
    }

    const kind = classify(line, atParagraphStart, mode);
    const open = current as Unit | null;

    // "CAPÍTULO XV" + "DAS INFRAÇÕES", "Seção II" + "Da Composição e da
    // Competência…" (+ "(Incluído pela Lei…)"): one heading, not a heading
    // followed by a stray excerpt.
    if (open?.kind === 'titulo' && continuesHeading(open.text, line, kind)) {
      open.text = /^\p{Ll}/u.test(line) ? joinWrappedLine(open.text, line) : `${open.text} — ${line}`;
    } else if (kind !== 'texto' || !open || open.kind === 'titulo') {
      // A heading is a single line: whatever follows it opens a new unit.
      close();
      current = { kind, text: line, page };
    } else {
      open.text = joinWrappedLine(open.text, line);
    }
    atParagraphStart = false;
  }
  close();

  return units.map((unit) =>
    unit.kind === 'titulo'
      ? { ...unit, nivel: headingLevel(unit.text), text: cleanHeading(unit.text) }
      : unit
  );
}

// Legislative notes that clutter a heading: "(Incluído pela Lei nº …)", "(Vigência)".
const NOTA_LEGISLATIVA_RE =
  /\s*(?:—\s*)?\((?:Inclu[íi]d|Reda[çc][ãa]o|Vide|Vig[êe]ncia|Revogad|Renumerad|Acrescid)[^)]*\)/gi;

function cleanHeading(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s*#+$/, '')
    .replace(NOTA_LEGISLATIVA_RE, '')
    .replace(/(?:\s*—\s*)+$/, '')
    .trim();
}

/**
 * Nesting depth of a heading: a law nests Título > Capítulo > Seção >
 * Subseção; a POP nests its title > "3. SEQUÊNCIA" > "3.1 …"; Markdown by #.
 */
function headingLevel(text: string): number {
  const md = /^(#{1,6})\s/.exec(text);
  if (md) return 10 + md[1].length;
  if (/^(?:livro|parte)\b/i.test(text)) return 0;
  if (/^(?:t[íi]tulo|anexo)\b/i.test(text)) return 1;
  if (/^cap[íi]tulo\b/i.test(text)) return 2;
  if (/^se[çc][ãa]o\b/i.test(text)) return 3;
  if (/^subse[çc][ãa]o\b/i.test(text)) return 4;
  if (/^(?:pop\b|procedimento operacional)/i.test(text)) return 5;
  const numerado = /^(\d+(?:\.\d+)*)\.?\s/.exec(text);
  if (numerado) return 6 + numerado[1].split('.').length;
  return 6;
}

/**
 * Keeps the headings above the current point, deepest last, and names the
 * section with the last two levels: "CAPÍTULO II — DO SISTEMA NACIONAL DE
 * TRÂNSITO › Seção I — Disposições Gerais" says what "Disposições Gerais"
 * alone doesn't.
 */
class HeadingPath {
  private stack: { nivel: number; texto: string }[] = [];

  push(nivel: number, texto: string): void {
    while (this.stack.length > 0 && this.stack[this.stack.length - 1].nivel >= nivel) this.stack.pop();
    this.stack.push({ nivel, texto });
  }

  get label(): string | undefined {
    const ultimos = this.stack.slice(-2).map((h) => h.texto);
    return ultimos.length > 0 ? ultimos.join(' › ') : undefined;
  }
}

/**
 * "Art. 165-A. Recusar-se…" → "art. 165-A"; "Art. 165 § 1º proíbe" → "art. 165 § 1º".
 */
function articleLabel(line: string): string {
  const match = ARTIGO_RE.exec(line);
  if (!match) return '';
  let label = `art. ${match[1]}${match[2] ? `-${match[2].toUpperCase()}` : ''}`;
  const paragrafo = /^\s*,?\s*§\s*(\d+)/.exec(line.slice(match[0].length));
  if (paragrafo) label += ` § ${paragrafo[1]}º`;
  return label;
}

function paragraphLabel(line: string): string | undefined {
  const match = PARAGRAFO_RE.exec(line);
  if (!match) return undefined;
  return match[1] ? `§ ${match[1]}º` : 'parágrafo único';
}

/** Identity of a structural block: the article, § or inciso it opens. */
function blockKey(unit: Unit): string | undefined {
  if (unit.kind === 'artigo') return articleLabel(unit.text);
  if (unit.kind === 'paragrafo') return paragraphLabel(unit.text);
  if (unit.kind === 'inciso') return `inc. ${INCISO_RE.exec(unit.text)?.[1] ?? ''}`;
  return undefined;
}

/**
 * Compiled laws (the CTB from planalto.gov.br) print each past wording of an
 * article, § or inciso — struck through — right before the current one. The
 * strike-through is lost in the extracted text, so the old "multa (cinco
 * vezes)" would sit next to the current "multa (dez vezes)". The same block
 * opening twice in a row means: keep only the last (current) wording.
 * Only legal mode calls this; a plain text never repeats a block that way.
 */
function dropSupersededWordings(units: Unit[]): Unit[] {
  const out: Unit[] = [];
  // Where the latest block of each level started in `out`, and its key. A §
  // contains its incisos, so a repeated § drops its old incisos with it.
  let artigo: { at: number; key: string } | undefined;
  let paragrafo: { at: number; key: string } | undefined;
  let inciso: { at: number; key: string } | undefined;

  for (const unit of units) {
    const key = blockKey(unit) ?? '';
    if (unit.kind === 'titulo') {
      artigo = paragrafo = inciso = undefined;
    } else if (unit.kind === 'artigo') {
      if (artigo?.key === key) out.length = artigo.at;
      artigo = { at: out.length, key };
      paragrafo = inciso = undefined;
    } else if (artigo && unit.kind === 'paragrafo') {
      if (paragrafo?.key === key) out.length = paragrafo.at;
      paragrafo = { at: out.length, key };
      inciso = undefined;
    } else if (artigo && unit.kind === 'inciso') {
      if (inciso?.key === key) out.length = inciso.at;
      inciso = { at: out.length, key };
    }
    out.push(unit);
  }
  return out;
}

const ABREVIACOES = new Set([
  'art', 'arts', 'inc', 'incs', 'n', 'nº', 'no', 'nos', 'p', 'pp', 'pág', 'pag', 'fl', 'fls', 'al', 'par',
  'sr', 'sra', 'srs', 'dr', 'dra', 'exmo', 'exma', 'ilmo', 'ilma', 'prof', 'profa', 'res', 'port', 'dec',
  'obs', 'ex', 'cf', 'v', 'min', 'máx', 'mín', 'aprox', 'tel', 'av', 'cel', 'maj', 'cap', 'ten', 'sgt',
  'cb', 'sd', 'subten', 'asp',
]);

/**
 * Sentence boundaries that do not fall inside "art. 165", "nº 9.503" or "Sgt. PM".
 */
function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  const boundary = /([.!?;])\s+(?=\S)/g;
  for (let match = boundary.exec(text); match; match = boundary.exec(text)) {
    if (match[1] === '.') {
      const word = /([^\s(]+)$/.exec(text.slice(start, match.index))?.[1]?.toLowerCase() ?? '';
      if (ABREVIACOES.has(word) || /^\p{L}$/u.test(word)) continue;
    }
    const end = match.index + match[1].length;
    sentences.push(text.slice(start, end).trim());
    start = boundary.lastIndex;
  }
  const rest = text.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences;
}

function splitByWords(text: string, max: number): string[] {
  const pieces: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.5) cut = max; // no usable space: hard cut
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

/**
 * Splits one unit larger than the limit at sentence boundaries (then words).
 */
function splitLongUnit(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const pieces: string[] = [];
  let current = '';
  for (const sentence of splitSentences(text)) {
    if (sentence.length > max) {
      if (current) pieces.push(current);
      current = '';
      pieces.push(...splitByWords(sentence, max));
    } else if (current && current.length + 1 + sentence.length > max) {
      pieces.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/**
 * Splits text into excerpts that respect the document's structure.
 * @param text - Extracted text (may carry page markers from the parser)
 * @param maxChars - Soft size limit per excerpt (overrides settings)
 * @param mode - 'legal' (articles) or 'secoes' (headed sections)
 * @param minChars - Minimum chunk size (overrides settings)
 * @returns Excerpts in document order
 */
export function chunkText(
  text: string,
  maxChars?: number,
  mode: ChunkMode = 'legal',
  minChars?: number
): TextChunk[] {
  if (!text || !text.trim()) return [];
  const max = Math.max(50, maxChars ?? DEFAULT_CHUNK_CHARS);
  const min = Math.max(1, minChars ?? DEFAULT_MIN_CHUNK_CHARS);

  const chunks: Omit<TextChunk, 'order'>[] = [];
  let buffer: string[] = [];
  let bufferPage: number | undefined;
  let label: string | undefined;
  let section: string | undefined;
  const caminho = new HeadingPath();

  // Current article and where inside it we are, for continuation labels.
  let artigo: string | undefined;
  let paragrafo: string | undefined;
  let inciso: string | undefined;

  const size = () => buffer.reduce((total, part) => total + part.length + 1, 0);
  const flush = () => {
    if (buffer.length > 0) {
      chunks.push({ text: buffer.join('\n'), numero_dispositivo: label, section, page: bufferPage });
    }
    buffer = [];
    bufferPage = undefined;
  };
  const push = (part: string, page: number | undefined) => {
    if (buffer.length === 0) bufferPage = page;
    buffer.push(part);
  };
  const continuationLabel = () => (artigo ? [artigo, paragrafo, inciso].filter(Boolean).join(' ') : undefined);

  const units = segment(text, mode);
  for (const unit of mode === 'legal' ? dropSupersededWordings(units) : units) {
    if (unit.kind === 'titulo') {
      flush();
      caminho.push(unit.nivel ?? 6, unit.text);
      section = caminho.label;
      artigo = undefined;
      label = undefined;
      continue;
    }

    if (unit.kind === 'artigo') {
      flush();
      artigo = articleLabel(unit.text);
      paragrafo = undefined;
      inciso = undefined;
      label = artigo;
    } else if (mode === 'legal' && artigo) {
      if (unit.kind === 'paragrafo') {
        paragrafo = paragraphLabel(unit.text);
        inciso = undefined;
      } else if (unit.kind === 'inciso') {
        inciso = INCISO_RE.exec(unit.text)?.[1];
      }
    }

    if (buffer.length > 0 && size() + unit.text.length > max) {
      flush();
      label = continuationLabel();
    }

    const pieces = splitLongUnit(unit.text, max);
    pieces.forEach((piece, i) => {
      push(piece, unit.page);
      if (i < pieces.length - 1) {
        flush();
        label = continuationLabel();
      }
    });
  }
  flush();

  return chunks
    .filter((chunk) => chunk.text.trim().length > min)
    .map((chunk, order) => ({ ...chunk, order }));
}

/**
 * Async version that reads chunking settings from the database. Use this in
 * routes that can await settings (ingestion, admin panel). The sync version
 * above is kept for tests and code that runs before settings are ready.
 */
export async function chunkTextAsync(
  text: string,
  maxChars?: number,
  mode: ChunkMode = 'legal',
  minChars?: number
): Promise<TextChunk[]> {
  if (!text || !text.trim()) return [];
  try {
    const s = await getSettings();
    return chunkText(text, maxChars ?? s.defaultChunkChars ?? DEFAULT_CHUNK_CHARS, mode, minChars ?? s.minChunkChars ?? DEFAULT_MIN_CHUNK_CHARS);
  } catch {
    return chunkText(text, maxChars, mode, minChars);
  }
}

/**
 * The paragraphs, list items and headings of a text, reflowed — what a
 * reader would see as blocks. Used by the text-only PDF export.
 */
export function blocosDeTexto(text: string): { texto: string; titulo: boolean }[] {
  return segment(text, 'secoes').map((unit) => ({ texto: unit.text, titulo: unit.kind === 'titulo' }));
}
