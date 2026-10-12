-- Migration 013 — coleção RAG para fiscalização de estrangeiros
-- Aplique depois das migrations 008, 011 e 012. É segura para reaplicação.

ALTER TABLE public.documentos
  DROP CONSTRAINT IF EXISTS documentos_colecao_check;

ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_colecao_check
  CHECK (colecao IN ('ctb', 'pop', 'natureza_potencial', 'estrangeiros'));

ALTER TABLE public.diagnosticos_base
  DROP CONSTRAINT IF EXISTS diagnosticos_base_colecao_check;

ALTER TABLE public.diagnosticos_base
  ADD CONSTRAINT diagnosticos_base_colecao_check
  CHECK (colecao IN ('ctb', 'mbft', 'pop', 'natureza_potencial', 'estrangeiros'));

-- Mantém a assinatura consumida pelo painel de qualidade. CTB/MBFT ficam em
-- dispositivos; todas as outras coleções ficam em documento_trechos.
CREATE OR REPLACE FUNCTION public.document_quality_stats(p_colecao TEXT)
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
    SELECT d.texto, d.embedding
    FROM dispositivos d
    JOIN docs ON docs.id = d.documento_id
    WHERE p_colecao IN ('ctb', 'mbft')
    UNION ALL
    SELECT t.texto, t.embedding
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

CREATE OR REPLACE FUNCTION public.estrangeiros_schema_version()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 13;
$$;

REVOKE ALL ON FUNCTION public.document_quality_stats(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.estrangeiros_schema_version() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.document_quality_stats(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.estrangeiros_schema_version() TO service_role;
