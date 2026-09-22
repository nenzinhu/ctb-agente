// Hybrid search combining BM25 and pgvector
import { searchByTsvector } from './bm25';
import { searchByVector } from './vector';
import { rerank, type RankedResult } from './reranker';

/**
 * Perform hybrid search combining BM25 (full-text) and vector (semantic) search
 * Fetches results from both methods, merges, deduplicates, reranks, and returns top results
 * @param query - Search query
 * @param limit - Maximum number of top results to return
 * @returns Sorted array of top ranked results
 */
export async function hybridSearch(
  query: string,
  limit = 5
): Promise<RankedResult[]> {
  try {
    const [bm25Results, vectorResults] = await Promise.all([
      searchByTsvector(query, 20),
      searchByVector(query, 20),
    ]);

    // Merge and deduplicate by ID
    const merged = new Map();
    [...bm25Results, ...vectorResults].forEach((r) => {
      if (!merged.has(r.id)) {
        merged.set(r.id, r);
      }
    });

    const combined = Array.from(merged.values());
    const reranked = rerank(combined, query);
    return reranked.slice(0, limit);
  } catch (error) {
    console.error('Hybrid search failed:', error);
    throw error;
  }
}
