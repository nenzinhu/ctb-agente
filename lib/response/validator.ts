// Citation validation logic
//
// Every reference found in a free-text field must be backed by a retrieved
// provision. The previous regex missed incisos beyond X (XVII, XVIII…),
// articles with letters (art. 165-A) and paragraphs (art. 165 § 2º), so it
// either flagged valid citations as unbacked or let invented ones through.
// A reference is now parsed into its components and matched against the
// retrieved norms by article number first, then by inciso/parágrafo when
// present.

export interface CitationValidation {
  valid: boolean;
  issues: string[];
}

/** One parsed legal reference: "art. 181 XVII" → { numero: "181", inciso: "XVII" } */
export interface Referencia {
  match: string;        // full text as it appeared, trimmed
  numero: string;       // "181" or "165-a"
  inciso?: string;      // "XVII", "i", "1"
  paragrafo?: string;   // "1", "2"
}

const ROMANOS = 'ivxlcdm';

function romanToNumber(roman: string): number {
  const r = roman.toLowerCase();
  let total = 0;
  let prev = 0;
  for (let i = r.length - 1; i >= 0; i--) {
    const v = ROMANOS.indexOf(r[i]);
    total += v < prev ? -v : v;
    prev = v;
  }
  return total;
}

function normalizeInciso(raw: string): string {
  const t = raw.trim();
  if (/^\d+$/.test(t)) return t;
  if (/^[ivxlcdm]+$/i.test(t)) return String(romanToNumber(t));
  return t.toUpperCase();
}

/**
 * Parse every legal reference found in text.
 * Matches: art. 165, art. 165-A, art. 165 § 1º, art. 181 XVII, art. 181, inciso XVII
 */
export function parseReferences(texto: string): Referencia[] {
  const refs: Referencia[] = [];
  // Pattern: "art." or "artigo" + number + optional "-letter" + optional "§ N" + optional inciso
  const re = /\b(?:art\.?|artigo)\s+(\d{1,3}(?:-[a-z])?)\s*(?:§\s*(\d+))?\s*(?:,?\s*(?:inciso|inc|i)?\s*([ivxlcdm]+|\d+))?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(texto)) !== null) {
    const numero = match[1].toLowerCase();
    const paragrafo = match[2] || undefined;
    const inciso = match[3] ? normalizeInciso(match[3]) : undefined;
    refs.push({
      match: match[0].trim(),
      numero,
      inciso,
      paragrafo,
    });
  }
  return refs;
}

/**
 * Check whether a parsed reference is backed by one of the retrieved norms.
 * Matching strategy:
 *   1. article number matches exactly (e.g. "165" in "art. 165")
 *   2. if the reference has an inciso, some norm's label must contain it
 *   3. if the reference has a paragraph, some norm's label must contain it
 */
function isBacked(ref: Referencia, normas: any[]): boolean {
  return normas.some((n) => {
    const label = String(n.numero_dispositivo ?? '').toLowerCase();
    if (!label.includes(`art. ${ref.numero}`) && !label.includes(`artigo ${ref.numero}`)) return false;
    if (ref.inciso) {
      const incisoLower = ref.inciso.toLowerCase();
      if (!label.includes(incisoLower)) return false;
    }
    if (ref.paragrafo) {
      if (!label.includes(`§ ${ref.paragrafo}`)) return false;
    }
    return true;
  });
}

/**
 * Validate that citations in response text actually exist in retrieved chunks
 * Prevents hallucinated references to non-existent articles
 * @param responseText - Generated response text
 * @param retrievedChunks - Array of chunks retrieved from database
 * @returns Validation result with any issues found
 */
export function validateCitations(
  responseText: string,
  retrievedChunks: any[]
): CitationValidation {
  const issues: string[] = [];
  const refs = parseReferences(responseText);

  for (const ref of refs) {
    if (!isBacked(ref, retrievedChunks)) {
      issues.push(`Citation not found: "${ref.match}"`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Drop article references that validation flagged as unbacked from free text
 * @param texto - Free-text field of the card
 * @param invalidas - Article keys flagged by the validator (e.g. "art. 999 § 2")
 * @returns Text without the unbacked references
 */
export function dropInvalidCitations(texto: string, invalidas: Set<string>): string {
  let resultado = texto;
  for (const chave of invalidas) {
    const escapado = chave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    resultado = resultado.replace(new RegExp(`${escapado}(?![\\d])\\s*,?\\s*`, 'gi'), '');
  }
  return resultado;
}