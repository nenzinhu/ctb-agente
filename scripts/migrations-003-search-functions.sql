-- Migration 003 — hybrid search RPC functions
-- Apply after scripts/migrations-002-config.sql
--
-- lib/search/bm25.ts and lib/search/vector.ts call these via supabase.rpc(...);
-- without them the hybrid search degrades silently (no error, no results).

CREATE OR REPLACE FUNCTION search_dispositivos_tsvector(query_text TEXT, limit_count INT DEFAULT 10)
RETURNS TABLE (id UUID, numero_dispositivo TEXT, texto TEXT, rank REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.numero_dispositivo, d.texto,
         ts_rank(d.tsvector_pt, plainto_tsquery('portuguese', query_text))::REAL AS rank
  FROM dispositivos d
  WHERE d.tsvector_pt @@ plainto_tsquery('portuguese', query_text)
  ORDER BY rank DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION search_dispositivos_vector(query_embedding VECTOR(1024), limit_count INT DEFAULT 10)
RETURNS TABLE (id UUID, numero_dispositivo TEXT, texto TEXT, similarity REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.numero_dispositivo, d.texto,
         (d.embedding <=> query_embedding)::REAL AS similarity
  FROM dispositivos d
  WHERE d.embedding IS NOT NULL
  ORDER BY d.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;
