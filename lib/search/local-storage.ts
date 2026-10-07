const RECENT_QUERIES_KEY = 'ctb-recent-queries';
const MAX_RECENT = 5;
/** Queries longer than this are not usable chips, so they are simply not stored. */
const MAX_QUERY_LENGTH = 200;

/**
 * Persist a query in the recent list
 * @param query - Raw query text
 */
export function saveQuery(query: string): void {
  try {
    const limpa = query.trim().slice(0, MAX_QUERY_LENGTH);
    if (!limpa) return;

    const recent = getRecentQueries();
    const filtered = recent.filter((q) => q !== limpa);
    const updated = [limpa, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Falha ao salvar a consulta:', err);
  }
}

/**
 * Read the recent queries
 * @returns Recent queries, oldest entries dropped when the data is unusable
 */
export function getRecentQueries(): string[] {
  try {
    const data = localStorage.getItem(RECENT_QUERIES_KEY);
    if (!data) return [];

    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().slice(0, MAX_QUERY_LENGTH))
      .filter(Boolean);
  } catch (err) {
    console.error('Falha ao obter as consultas recentes:', err);
    return [];
  }
}

export function clearRecentQueries(): void {
  try {
    localStorage.removeItem(RECENT_QUERIES_KEY);
  } catch (err) {
    console.error('Falha ao limpar as consultas:', err);
  }
}
