-- Migration 010 — RAG mais rápido e preciso
-- Apply after scripts/migrations-009-config-extended.sql
--
-- 1. Prefixos: "estacion" encontra "estacionar" também nas RPCs do banco.
-- 2. Cobertura: perguntas longas precisam casar mais de uma palavra, evitando
--    que um termo genérico coloque um trecho sem relação entre os primeiros.
-- 3. Vetores: descarta vizinhos com similaridade muito baixa. Um índice sempre
--    devolve os vizinhos mais próximos, mesmo quando nenhum é realmente próximo.

CREATE OR REPLACE FUNCTION to_prefix_tsquery_pt(query_text TEXT)
RETURNS tsquery
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE WHEN count(*) = 0 THEN NULL
    ELSE string_agg(quote_literal(lexema) || ':*', ' | ')::tsquery
  END
  FROM (
    SELECT DISTINCT lexema
    FROM (
      SELECT unnest(tsvector_to_array(to_tsvector('pg_catalog.portuguese', coalesce(query_text, '')))) AS lexema
      UNION ALL
      SELECT unnest(tsvector_to_array(to_tsvector('public.pt_unaccent', coalesce(query_text, '')))) AS lexema
    ) formas
    WHERE length(lexema) >= 4
  ) unicos
$$;

CREATE OR REPLACE FUNCTION search_dispositivos_tsvector(query_text TEXT, limit_count INT DEFAULT 10)
RETURNS TABLE (id UUID, numero_dispositivo TEXT, texto TEXT, rank REAL)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH q AS (
    SELECT
      (coalesce(to_or_tsquery_pt(query_text), ''::tsquery) || coalesce(to_prefix_tsquery_pt(query_text), ''::tsquery)) AS busca,
      query_words_pt(query_text) AS palavras
  ), candidatos AS (
    SELECT d.*,
      (SELECT count(*) FROM unnest(q.palavras) AS p WHERE d.tsvector_pt @@ p) AS cobertura,
      cardinality(q.palavras) AS total_palavras,
      q.busca
    FROM dispositivos d CROSS JOIN q
    WHERE q.busca <> ''::tsquery AND d.tsvector_pt @@ q.busca
  )
  SELECT c.id, c.numero_dispositivo, c.texto,
    (c.cobertura + ts_rank_cd(c.tsvector_pt, c.busca, 1 | 32))::REAL AS rank
  FROM candidatos c
  WHERE c.cobertura >= CASE WHEN c.total_palavras >= 3 THEN 2 ELSE 1 END
  ORDER BY c.cobertura DESC, rank DESC
  LIMIT greatest(0, least(coalesce(limit_count, 10), 100))
$$;

CREATE OR REPLACE FUNCTION search_trechos_texto(query_text TEXT, p_colecao TEXT, limit_count INT DEFAULT 20)
RETURNS TABLE (
  id UUID, documento_id UUID, titulo TEXT, secao TEXT, pagina INT, ordem INT, texto TEXT, rank REAL
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH q AS (
    SELECT
      (coalesce(to_or_tsquery_pt(query_text), ''::tsquery) || coalesce(to_prefix_tsquery_pt(query_text), ''::tsquery)) AS busca,
      query_words_pt(query_text) AS palavras
  ), candidatos AS (
    SELECT t.*, d.titulo,
      (SELECT count(*) FROM unnest(q.palavras) AS p WHERE t.tsv @@ p) AS cobertura,
      cardinality(q.palavras) AS total_palavras,
      q.busca
    FROM documento_trechos t
    JOIN documentos d ON d.id = t.documento_id
    CROSS JOIN q
    WHERE d.colecao = p_colecao AND q.busca <> ''::tsquery AND t.tsv @@ q.busca
  )
  SELECT c.id, c.documento_id, c.titulo, c.secao, c.pagina, c.ordem, c.texto,
    (c.cobertura + ts_rank_cd(c.tsv, c.busca, 1 | 32))::REAL AS rank
  FROM candidatos c
  WHERE c.cobertura >= CASE WHEN c.total_palavras >= 3 THEN 2 ELSE 1 END
  ORDER BY c.cobertura DESC, rank DESC
  LIMIT greatest(0, least(coalesce(limit_count, 20), 100))
$$;

CREATE OR REPLACE FUNCTION search_dispositivos_vector(query_embedding VECTOR(1024), limit_count INT DEFAULT 10)
RETURNS TABLE (id UUID, numero_dispositivo TEXT, texto TEXT, similarity REAL)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT d.id, d.numero_dispositivo, d.texto, (1 - (d.embedding <=> query_embedding))::REAL AS similarity
  FROM dispositivos d
  WHERE d.embedding IS NOT NULL AND (1 - (d.embedding <=> query_embedding)) >= 0.35
  ORDER BY d.embedding <=> query_embedding
  LIMIT greatest(0, least(coalesce(limit_count, 10), 100))
$$;

CREATE OR REPLACE FUNCTION search_trechos_vetor(query_embedding VECTOR(1024), p_colecao TEXT, limit_count INT DEFAULT 20)
RETURNS TABLE (
  id UUID, documento_id UUID, titulo TEXT, secao TEXT, pagina INT, ordem INT, texto TEXT, similarity REAL
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT t.id, t.documento_id, d.titulo, t.secao, t.pagina, t.ordem, t.texto,
    (1 - (t.embedding <=> query_embedding))::REAL AS similarity
  FROM documento_trechos t
  JOIN documentos d ON d.id = t.documento_id
  WHERE d.colecao = p_colecao
    AND t.embedding IS NOT NULL
    AND (1 - (t.embedding <=> query_embedding)) >= 0.35
  ORDER BY t.embedding <=> query_embedding
  LIMIT greatest(0, least(coalesce(limit_count, 20), 100))
$$;

-- The health endpoint uses this marker to distinguish a reachable database
-- from one that is still running an older retrieval schema.
CREATE OR REPLACE FUNCTION rag_schema_version()
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT 10 $$;

ANALYZE dispositivos;
ANALYZE documento_trechos;
