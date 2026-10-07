// Query type identification and normalization
export type QueryType = 'code' | 'article' | 'situation';

/** Identify the type while accepting common field variants of MBFT codes. */
export function identifyQueryType(query: string): QueryType {
  const trimmed = query.trim();
  if (codigoMbft(trimmed)) return 'code';
  if (/^(?:art\.?|artigo|§|inciso|inc|alínea|alinea)/i.test(trimmed)) return 'article';
  return 'situation';
}

/** Normalize query for searching (lowercase, remove accents). */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normalize a query for cache keys while preserving accents. */
export function normalizeForCache(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Accept the printed code, its compact form and the usual four-plus-one form. */
export function codigoMbft(consulta: string): string | null {
  const encontrado = consulta.match(/(?<![\p{L}\d.-])(\d{3}\s*[-–]\s*\d{2}|\d{4}\s*[-–]\s*\d|\d{3}\s+\d{2}|\d{5})(?![\p{L}\d.-])/u);
  if (!encontrado) return null;
  const digitos = encontrado[1].replace(/\D/g, '');
  return `${digitos.slice(0, 3)}-${digitos.slice(3)}`;
}

/** Backwards-compatible name used by database helpers. */
export function extractMbftCode(query: string): string | null {
  return codigoMbft(query);
}

/** Extract a normalized article, paragraph and inciso reference. */
export function extractArticleRef(query: string): string | null {
  const match = query.match(/\b(?:art\.?|artigo)\s+(\d{1,3}(?:-[a-z])?)\s*(?:§\s*(\d+))?\s*(?:,?\s*(?:inciso|inc|i)?\s*([ivxlcdm]+|\d+))?/i);
  if (!match) return null;
  let ref = `art. ${match[1]}`;
  if (match[2]) ref += ` § ${match[2]}º`;
  if (match[3]) ref += ` ${match[3]}`;
  return ref;
}

/** Only explicit POP labels or a standalone procedure number are identifiers. */
export function numeroPop(consulta: string): string | null {
  const numero = /\bpop\s*(?:n[ºo°.]?\s*)?(\d{1,3}(?:\.\d+){0,3})(?![\d.])/i.exec(consulta)?.[1]
    ?? /^\s*(\d{1,3}(?:\.\d+){0,3})\s*$/.exec(consulta)?.[1];
  return numero ? (numero.includes('.') ? numero : numero.padStart(3, '0')) : null;
}
