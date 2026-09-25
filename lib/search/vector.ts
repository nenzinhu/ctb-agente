// Vector similarity search using pgvector
import { databaseConfigured, supabase } from '@/lib/db/client';
import { embeddingChain } from '@/lib/ai/embeddings';

/**
 * Search dispositivos using vector embeddings (pgvector)
 * Requires RPC function in Supabase:
 * CREATE FUNCTION search_dispositivos_vector(query_embedding VECTOR, limit_count INT DEFAULT 10)
 * RETURNS TABLE (id UUID, numero_dispositivo TEXT, texto TEXT, similarity REAL) AS $$
 * BEGIN
 *   RETURN QUERY
 *   SELECT d.id, d.numero_dispositivo, d.texto, (d.embedding <=> query_embedding) as similarity
 *   FROM dispositivos d
 *   WHERE d.embedding IS NOT NULL
 *   ORDER BY d.embedding <=> query_embedding
 *   LIMIT limit_count;
 * END;
 * $$ LANGUAGE plpgsql;
 * @param query - Search query
 * @param limit - Maximum number of results
 * @returns Array of search results with similarity score
 */
export async function searchByVector(query: string, limit = 10) {
  if (!databaseConfigured || !process.env.MISTRAL_API_KEY) return [];

  const embedding = await embeddingChain.embed(query);

  const { data, error } = await supabase.rpc('search_dispositivos_vector', {
    query_embedding: embedding,
    limit_count: limit,
  });

  if (error) throw error;
  return data || [];
}
