// Result reranking logic (score + recency + citability)
export interface RankedResult {
  id: string;
  numero_dispositivo: string;
  texto: string;
  score: number;
}

/**
 * Rerank search results by composite score
 * Factors: BM25/embedding rank, recency, citability (number of citations)
 * @param results - Raw search results
 * @param query - Original query (for context)
 * @param recencyWeight - Weight for recency (0-1)
 * @param citabilityWeight - Weight for citability (0-1)
 * @returns Sorted ranked results
 */
export function rerank(
  results: any[],
  query: string,
  recencyWeight = 0.1,
  citabilityWeight = 0.2
): RankedResult[] {
  return results
    .map((r) => ({
      id: r.id,
      numero_dispositivo: r.numero_dispositivo,
      texto: r.texto,
      score: calculateScore(r, query, recencyWeight, citabilityWeight),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculate composite score for a single result
 * @param result - Individual search result
 * @param _query - Original query
 * @param recencyWeight - Weight for recency
 * @param citabilityWeight - Weight for citability
 * @returns Composite score
 */
function calculateScore(
  result: any,
  _query: string,
  recencyWeight: number,
  citabilityWeight: number
): number {
  let score = 0;

  // BM25 or embedding rank (primary signal)
  score += result.rank || result.similarity || 0;

  // Recency (newer documents score higher)
  if (result.data_publicacao) {
    const daysOld =
      (new Date().getTime() - new Date(result.data_publicacao).getTime()) /
      (1000 * 60 * 60 * 24);
    score += (1 - Math.min(daysOld / 365, 1)) * recencyWeight;
  }

  // Citability (articles cited more often score higher)
  if (result.citacoes_dentro?.length) {
    score += Math.min(result.citacoes_dentro.length / 10, 1) * citabilityWeight;
  }

  return score;
}
