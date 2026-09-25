// Reciprocal Rank Fusion: merges ranked lists using only each item's
// position, never its raw score. The previous reranker summed the full-text
// rank (0–0.1) with the vector search's cosine *distance* (0–2, lower is
// better) as if both were "higher is better" — the least similar excerpt
// came out on top. Positions have no scale to get wrong.

/** Smoothing constant from the original RRF paper (Cormack et al., 2009). */
export const RRF_K = 60;

/**
 * @param lists - Rankings to merge, best item first in each
 * @param k - Smoothing constant; higher values flatten the head of each list
 * @returns Every distinct item (by id), best fused score first
 */
export function reciprocalRankFusion<T extends { id: string }>(lists: T[][], k: number = RRF_K): Array<T & { score: number }> {
  const fused = new Map<string, { item: T; score: number }>();

  for (const list of lists) {
    list.forEach((item, position) => {
      const gain = 1 / (k + position + 1);
      const current = fused.get(item.id);
      if (current) {
        current.item = { ...current.item, ...item };
        current.score += gain;
      } else {
        fused.set(item.id, { item, score: gain });
      }
    });
  }

  return [...fused.values()].sort((a, b) => b.score - a.score).map(({ item, score }) => ({ ...item, score }));
}
