// Query type identification and normalization
export type QueryType = 'code' | 'article' | 'situation';

/**
 * Identify the type of query based on its format
 * @param query - User input query
 * @returns 'code' for MBFT codes (XXX-XX), 'article' for legal references, 'situation' for natural language
 */
export function identifyQueryType(query: string): QueryType {
  const trimmed = query.trim();

  // Check for code format: XXX-XX (with optional spaces around the hyphen)
  if (/^\d{3}\s*-\s*\d{2}$/.test(trimmed)) {
    return 'code';
  }

  // Check for article format: "art", "artigo", "art.", "§", "inc", "alínea", "inciso"
  if (/^(?:art\.?|artigo|§|inciso|inc|alínea|alinea)/i.test(trimmed)) {
    return 'article';
  }

  return 'situation';
}

/**
 * Normalize query for searching (lowercase, remove accents)
 * @param query - User input query
 * @returns Normalized query string
 */
export function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // Remove accents for searching
}

/**
 * Normalize a query for cache keys and display: trim, collapse whitespace,
 * lowercase. Keeps accents — the cache key is internal and consistent.
 */
export function normalizeForCache(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Extract the MBFT code from a query if present: "516-91" → "516-91"
 * Tolerates spaces and variations like "516 - 91".
 */
export function extractMbftCode(query: string): string | null {
  const match = query.match(/\b(\d{3})\s*-?\s*(\d{2})\b/);
  return match ? `${match[1]}-${match[2]}` : null;
}

/**
 * Extract the article reference from a query if present: "art. 165" → "art. 165"
 */
export function extractArticleRef(query: string): string | null {
  const match = query.match(/\b(?:art\.?|artigo)\s+(\d{1,3}(?:-[a-z])?)\s*(?:§\s*(\d+))?\s*(?:,?\s*(?:inciso|inc|i)?\s*([ivxlcdm]+|\d+))?/i);
  if (!match) return null;
  let ref = `art. ${match[1]}`;
  if (match[2]) ref += ` § ${match[2]}º`;
  if (match[3]) ref += ` ${match[3]}`;
  return ref;
}