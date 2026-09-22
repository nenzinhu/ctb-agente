// BM25 full-text search using PostgreSQL tsvector
import { supabase } from '@/lib/db/client';

/**
 * Search dispositivos using BM25 (tsvector) in Portuguese
 * Requires RPC function in Supabase:
 * CREATE FUNCTION search_dispositivos_tsvector(query_text TEXT, limit_count INT DEFAULT 10)
 * RETURNS TABLE (id UUID, numero_dispositivo TEXT, texto TEXT, rank REAL) AS $$
 * BEGIN
 *   RETURN QUERY
 *   SELECT d.id, d.numero_dispositivo, d.texto, ts_rank(d.tsvector_pt, plainto_tsquery('portuguese', query_text)) as rank
 *   FROM dispositivos d
 *   WHERE d.tsvector_pt @@ plainto_tsquery('portuguese', query_text)
 *   ORDER BY rank DESC
 *   LIMIT limit_count;
 * END;
 * $$ LANGUAGE plpgsql;
 * @param query - Search query
 * @param limit - Maximum number of results
 * @returns Array of search results with rank
 */
export async function searchByTsvector(query: string, limit = 10) {
  const { data, error } = await supabase.rpc('search_dispositivos_tsvector', {
    query_text: query,
    limit_count: limit,
  });

  if (error) throw error;
  return data || [];
}
