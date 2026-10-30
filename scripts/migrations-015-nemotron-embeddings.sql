-- Apply after migration 014. Additive: existing Mistral vectors remain intact.
BEGIN;
SET LOCAL search_path = public, extensions;

ALTER TABLE public.dispositivos ADD COLUMN IF NOT EXISTS embedding_nemotron VECTOR(1024);
ALTER TABLE public.documento_trechos ADD COLUMN IF NOT EXISTS embedding_nemotron VECTOR(1024);
COMMENT ON COLUMN public.dispositivos.embedding_nemotron IS 'nvidia/nemotron-3.5-embed-8b:free, truncated to 1024 dimensions and L2-normalized';
COMMENT ON COLUMN public.documento_trechos.embedding_nemotron IS 'nvidia/nemotron-3.5-embed-8b:free, truncated to 1024 dimensions and L2-normalized';

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_dispositivos_nemotron_hnsw ON public.dispositivos
    USING hnsw (embedding_nemotron vector_cosine_ops) WHERE embedding_nemotron IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_trechos_nemotron_hnsw ON public.documento_trechos
    USING hnsw (embedding_nemotron vector_cosine_ops) WHERE embedding_nemotron IS NOT NULL;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'HNSW indisponível: busca Nemotron exata, sem índice.';
END $$;

CREATE OR REPLACE FUNCTION public.search_dispositivos_nemotron(query_embedding VECTOR(1024), limit_count INT DEFAULT 10)
RETURNS TABLE (id UUID, numero_dispositivo TEXT, texto TEXT, similarity REAL)
LANGUAGE sql STABLE SET search_path = public, extensions
AS $$
  SELECT d.id, d.numero_dispositivo, d.texto, (1 - (d.embedding_nemotron <=> query_embedding))::REAL
  FROM public.dispositivos d
  WHERE d.embedding_nemotron IS NOT NULL AND (1 - (d.embedding_nemotron <=> query_embedding)) >= 0.35
  ORDER BY d.embedding_nemotron <=> query_embedding
  LIMIT greatest(0, least(coalesce(limit_count, 10), 100))
$$;

CREATE OR REPLACE FUNCTION public.search_trechos_nemotron(query_embedding VECTOR(1024), p_colecao TEXT, limit_count INT DEFAULT 20)
RETURNS TABLE (id UUID, documento_id UUID, titulo TEXT, secao TEXT, pagina INT, ordem INT, texto TEXT, similarity REAL)
LANGUAGE sql STABLE SET search_path = public, extensions
AS $$
  SELECT t.id, t.documento_id, d.titulo, t.secao, t.pagina, t.ordem, t.texto,
    (1 - (t.embedding_nemotron <=> query_embedding))::REAL
  FROM public.documento_trechos t JOIN public.documentos d ON d.id = t.documento_id
  WHERE d.colecao = p_colecao AND t.embedding_nemotron IS NOT NULL
    AND (1 - (t.embedding_nemotron <=> query_embedding)) >= 0.35
  ORDER BY t.embedding_nemotron <=> query_embedding
  LIMIT greatest(0, least(coalesce(limit_count, 20), 100))
$$;

REVOKE ALL ON FUNCTION public.search_dispositivos_nemotron(VECTOR, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_dispositivos_nemotron(VECTOR, INT) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.search_trechos_nemotron(VECTOR, TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_trechos_nemotron(VECTOR, TEXT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.rag_embedding_schema_version()
RETURNS INT LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 1 $$;
REVOKE ALL ON FUNCTION public.rag_embedding_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rag_embedding_schema_version() TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.document_quality_stats_nemotron(p_colecao TEXT)
RETURNS TABLE (
  documentos BIGINT,
  trechos BIGINT,
  trechos_sem_vetor BIGINT,
  vazios BIGINT,
  curtos BIGINT,
  duplicados BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH docs AS (
    SELECT id
    FROM documentos
    WHERE
      (p_colecao = 'ctb' AND colecao = 'ctb' AND coalesce(tipo, '') <> 'manual') OR
      (p_colecao = 'mbft' AND colecao = 'ctb' AND tipo = 'manual') OR
      (p_colecao NOT IN ('ctb', 'mbft') AND colecao = p_colecao)
  ),
  itens AS (
    SELECT d.texto, d.embedding_nemotron AS embedding
    FROM dispositivos d
    JOIN docs ON docs.id = d.documento_id
    WHERE p_colecao IN ('ctb', 'mbft')
    UNION ALL
    SELECT t.texto, t.embedding_nemotron AS embedding
    FROM documento_trechos t
    JOIN docs ON docs.id = t.documento_id
    WHERE p_colecao <> 'ctb' AND p_colecao <> 'mbft'
  ),
  repetidos AS (
    SELECT lower(regexp_replace(btrim(texto), '\s+', ' ', 'g')) AS texto_normalizado,
           count(*) AS quantidade
    FROM itens
    WHERE btrim(coalesce(texto, '')) <> ''
    GROUP BY 1
    HAVING count(*) > 1
  )
  SELECT
    (SELECT count(*) FROM docs),
    (SELECT count(*) FROM itens),
    (SELECT count(*) FROM itens WHERE embedding IS NULL),
    (SELECT count(*) FROM itens WHERE btrim(coalesce(texto, '')) = ''),
    (SELECT count(*) FROM itens WHERE char_length(btrim(coalesce(texto, ''))) BETWEEN 1 AND 79),
    coalesce((SELECT sum(quantidade - 1) FROM repetidos), 0)::BIGINT
$$;

REVOKE ALL ON FUNCTION public.document_quality_stats_nemotron(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.document_quality_stats_nemotron(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
