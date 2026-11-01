import { codigoMbft } from '@/lib/query/router';

const RECENT_QUERIES_KEY = 'ctb-recent-queries';
const MAX_RECENT = 5;

/** Only standalone legal identifiers can be retained automatically. */
function identificadorSeguro(query: string): string | null {
  const text = query.trim().replace(/\s+/g, ' ');
  if (!text || text.length > 80) return null;
  const codeText = text.replace(/^(?:c[oó]digo|c[oó]d\.?)\s*/iu, '');
  if (/^[\d\s.\u2013/-]+$/u.test(codeText)) {
    const code = codigoMbft(codeText);
    if (code && codeText.replace(/\D/g, '').length === 5) return code;
  }
  const article = /^art(?:igo)?\.?\s*\d{1,3}(?:-[a-z])?(?:\s*,?\s*(?:inciso\s+)?[ivxlcdm]+|\s*§\s*\d{1,2}[º°o]?|\s*,?\s*par[aá]grafo\s+[uú]nico){0,2}\.?$/iu;
  if (!article.test(text)) return null;
  return text.replace(/^art(?:igo)?\.?\s*/iu, 'art. ').replace(/\s*,\s*/g, ', ').replace(/\.$/, '');
}

/** Free descriptions and personal identifiers are never written to recent history. */
export function saveQuery(query: string): void {
  try {
    const safe = identificadorSeguro(query);
    if (!safe) return;
    const recent = getRecentQueries().filter((q) => q.toLowerCase() !== safe.toLowerCase());
    localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify([safe, ...recent].slice(0, MAX_RECENT)));
  } catch (error) {
    console.error('Não foi possível salvar o identificador neste aparelho:', error);
  }
}

/** Remove legacy free text as well as excluding it from the visible list. */
export function getRecentQueries(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_QUERIES_KEY);
    if (!raw) return [];
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = []; }
    const safe = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').map(identificadorSeguro).filter((item): item is string => item !== null)
      : [];
    const recent = safe.filter((item, index) => safe.findIndex((q) => q.toLowerCase() === item.toLowerCase()) === index).slice(0, MAX_RECENT);
    if (JSON.stringify(recent) !== raw) {
      try {
        if (recent.length) localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(recent));
        else localStorage.removeItem(RECENT_QUERIES_KEY);
      } catch { /* Storage can be read-only; never display the unsafe entries. */ }
    }
    return recent;
  } catch {
    return [];
  }
}

/** Return false if the device refused deletion; the UI must not claim success. */
export function clearRecentQueries(): boolean {
  try {
    localStorage.removeItem(RECENT_QUERIES_KEY);
    return true;
  } catch (error) {
    console.error('Não foi possível limpar as consultas:', error);
    return false;
  }
}
