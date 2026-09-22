// Query type identification and normalization
export type QueryType = 'code' | 'article' | 'situation';

/**
 * Identify the type of query based on its format
 * @param query - User input query
 * @returns 'code' for MBFT codes (XXX-XX), 'article' for legal references, 'situation' for natural language
 */
export function identifyQueryType(query: string): QueryType {
  const trimmed = query.trim();

  // Check for code format: XXX-XX
  if (/^\d{3}-\d{2}$/.test(trimmed)) {
    return 'code';
  }

  // Check for article format: "art", "artigo", "§", "inc", "alínea"
  if (/^(art|artigo|art\.|§|inc|alínea|inciso)/i.test(trimmed)) {
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
