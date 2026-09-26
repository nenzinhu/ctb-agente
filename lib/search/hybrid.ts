// Hybrid search over the CTB provisions: full-text (tsvector) + semantic (pgvector)
import { searchByTsvector } from './bm25';
import { searchByVector } from './vector';
import { reciprocalRankFusion, semTextoRepetido } from './fusion';
import { expandirSinonimos } from './sinonimos';

export interface RankedResult {
  id: string;
  numero_dispositivo: string;
  texto: string;
  score: number;
}

interface Linha {
  id: string;
  numero_dispositivo: string;
  texto: string;
}

/**
 * One source failing (e.g. the embedding provider is down) must not hide
 * what the other one found.
 */
async function semFalhar(fonte: string, busca: Promise<Linha[]>): Promise<Linha[]> {
  try {
    return await busca;
  } catch (error) {
    console.warn(`Hybrid search: ${fonte} unavailable`, error);
    return [];
  }
}

// Agents open the CTB to frame an infraction (Capítulo XV, arts. 161–255).
// Between near-equal matches the infraction comes first — "dirigir
// embriagado" → art. 165 (the AIT) before art. 306 (the crime). Small on
// purpose: at most ~2 positions, never over a clearly better match.
const PESO_INFRACOES = 1.04;

function ehInfracao(numero: string): boolean {
  const artigo = Number(/^art\. (\d+)/.exec(numero)?.[1]);
  return artigo >= 161 && artigo <= 255;
}

/**
 * @param resultados - Fused results, best first
 * @returns Same results with the infraction prior applied
 */
export function priorizarInfracoes<T extends { numero_dispositivo: string; score: number }>(resultados: T[]): T[] {
  return resultados
    .map((r) => (ehInfracao(r.numero_dispositivo) ? { ...r, score: r.score * PESO_INFRACOES } : r))
    .sort((a, b) => b.score - a.score);
}

/**
 * Perform hybrid search combining full-text and vector search, fused by rank
 * @param query - Search query, PII already filtered (keep the accents: the
 *   database matches both the accented and the unaccented form)
 * @param limit - Maximum number of top results to return
 * @returns Sorted array of top ranked results
 */
export async function hybridSearch(query: string, limit = 5): Promise<RankedResult[]> {
  const [texto, vetor] = await Promise.all([
    semFalhar('texto', searchByTsvector(expandirSinonimos(query), 20) as Promise<Linha[]>),
    semFalhar('vetor', searchByVector(query, 20) as Promise<Linha[]>),
  ]);

  return semTextoRepetido(priorizarInfracoes(reciprocalRankFusion([texto, vetor])))
    .slice(0, limit)
    .map(({ id, numero_dispositivo, texto: conteudo, score }) => ({ id, numero_dispositivo, texto: conteudo, score }));
}
