const RECENT_QUERIES_KEY = 'ctb-recent-queries';
const MAX_RECENT = 5;

export function saveQuery(query: string): void {
  try {
    const recent = getRecentQueries();
    const filtered = recent.filter((q) => q !== query);
    const updated = [query, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save query:', err);
  }
}

export function getRecentQueries(): string[] {
  try {
    const data = localStorage.getItem(RECENT_QUERIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to get recent queries:', err);
    return [];
  }
}

export function clearRecentQueries(): void {
  try {
    localStorage.removeItem(RECENT_QUERIES_KEY);
  } catch (err) {
    console.error('Failed to clear queries:', err);
  }
}
