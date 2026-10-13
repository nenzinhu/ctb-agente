-- Migration 014 — páginas dos trechos CTB/MBFT e pesquisa do catálogo de apostilas
-- Aplicar depois de scripts/migrations-013-estrangeiros.sql.
-- Idempotente. Documentos CTB/MBFT já indexados permanecem com pagina NULL:
-- reindexe-os somente se precisar habilitar a seleção precisa por páginas.

ALTER TABLE public.dispositivos
  ADD COLUMN IF NOT EXISTS pagina INTEGER;

CREATE INDEX IF NOT EXISTS idx_dispositivos_documento_pagina_ordem
  ON public.dispositivos (documento_id, pagina, ordem);

CREATE INDEX IF NOT EXISTS idx_documentos_situacao_titulo
  ON public.documentos (situacao, titulo);

CREATE OR REPLACE FUNCTION public.search_documentos_apostila(
  query_text TEXT,
  limit_count INT DEFAULT 30
)
RETURNS TABLE (documento_id UUID, rank REAL)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH q AS (
    SELECT public.to_or_tsquery_pt(query_text) AS valor
  ),
  candidatos AS (
    SELECT doc.id AS documento_id,
           (100 + ts_rank_cd(
             to_tsvector('public.pt_unaccent', coalesce(doc.titulo, '')),
             q.valor,
             1 | 32
           ))::REAL AS rank
    FROM public.documentos doc
    CROSS JOIN q
    WHERE doc.situacao IN ('vigente', 'revisar')
      AND q.valor IS NOT NULL
      AND to_tsvector('public.pt_unaccent', coalesce(doc.titulo, '')) @@ q.valor

    UNION ALL

    SELECT d.documento_id,
           ts_rank_cd(d.tsvector_pt, q.valor, 1 | 32)::REAL AS rank
    FROM public.dispositivos d
    JOIN public.documentos doc ON doc.id = d.documento_id
    CROSS JOIN q
    WHERE doc.situacao IN ('vigente', 'revisar')
      AND q.valor IS NOT NULL
      AND d.tsvector_pt @@ q.valor

    UNION ALL

    SELECT t.documento_id,
           ts_rank_cd(t.tsv, q.valor, 1 | 32)::REAL AS rank
    FROM public.documento_trechos t
    JOIN public.documentos doc ON doc.id = t.documento_id
    CROSS JOIN q
    WHERE doc.situacao IN ('vigente', 'revisar')
      AND q.valor IS NOT NULL
      AND t.tsv @@ q.valor
  )
  SELECT candidatos.documento_id, max(candidatos.rank)::REAL AS rank
  FROM candidatos
  GROUP BY candidatos.documento_id
  ORDER BY rank DESC, candidatos.documento_id
  LIMIT greatest(1, least(coalesce(limit_count, 30), 50))
$$;

REVOKE ALL ON FUNCTION public.search_documentos_apostila(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_documentos_apostila(TEXT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.paginas_documentos_apostila(documento_ids UUID[])
RETURNS TABLE (documento_id UUID, pagina_maxima INTEGER)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH paginas AS (
    SELECT d.documento_id, max(d.pagina)::INTEGER AS pagina_maxima
    FROM public.dispositivos d
    WHERE d.documento_id = ANY(coalesce(documento_ids, '{}'::UUID[]))
      AND d.pagina IS NOT NULL
    GROUP BY d.documento_id

    UNION ALL

    SELECT t.documento_id, max(t.pagina)::INTEGER AS pagina_maxima
    FROM public.documento_trechos t
    WHERE t.documento_id = ANY(coalesce(documento_ids, '{}'::UUID[]))
      AND t.pagina IS NOT NULL
    GROUP BY t.documento_id
  )
  SELECT paginas.documento_id, max(paginas.pagina_maxima)::INTEGER AS pagina_maxima
  FROM paginas
  GROUP BY paginas.documento_id
$$;

REVOKE ALL ON FUNCTION public.paginas_documentos_apostila(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.paginas_documentos_apostila(UUID[]) TO service_role;

