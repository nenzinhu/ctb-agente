-- Migration 011 — metadados oficiais e diagnóstico das bases documentais
-- Aplicar depois de scripts/migrations-010-rag-precision-performance.sql.
-- Idempotente e compatível com documentos cadastrados antes desta versão.

ALTER TABLE documentos ADD COLUMN IF NOT EXISTS fonte_oficial TEXT;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS versao TEXT;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS vigente_desde DATE;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS conferido_em DATE;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS situacao TEXT
  CHECK (situacao IN ('vigente', 'revisar', 'substituido'));

CREATE INDEX IF NOT EXISTS idx_documentos_situacao_conferencia
  ON documentos (situacao, conferido_em);

CREATE TABLE IF NOT EXISTS diagnosticos_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colecao TEXT NOT NULL CHECK (colecao IN ('ctb', 'mbft', 'pop')),
  status TEXT NOT NULL CHECK (status IN ('pronta', 'atencao', 'critica')),
  fontes JSONB NOT NULL DEFAULT '[]'::jsonb,
  metricas JSONB NOT NULL,
  detalhes JSONB NOT NULL,
  duracao_ms INTEGER NOT NULL DEFAULT 0 CHECK (duracao_ms >= 0),
  executado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnosticos_base_colecao_execucao
  ON diagnosticos_base (colecao, executado_em DESC);

-- Sem política para anon/authenticated: somente o servidor com service role
-- pode ler ou gravar diagnósticos e metadados administrativos.
ALTER TABLE diagnosticos_base ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION document_quality_stats(p_colecao TEXT)
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
    WHERE colecao = p_colecao
  ),
  itens AS (
    SELECT d.texto, d.embedding
    FROM dispositivos d
    JOIN docs ON docs.id = d.documento_id
    WHERE p_colecao = 'ctb'
    UNION ALL
    SELECT t.texto, t.embedding
    FROM documento_trechos t
    JOIN docs ON docs.id = t.documento_id
    WHERE p_colecao = 'pop'
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

CREATE OR REPLACE FUNCTION quality_schema_version()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 11;
$$;

REVOKE ALL ON TABLE diagnosticos_base FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION document_quality_stats(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION quality_schema_version() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION document_quality_stats(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION quality_schema_version() TO service_role;
