-- Migration 008 — indexação que encontra o que o agente digita + base de documentos (RAG)
-- Apply after scripts/migrations-007-ratelimit-cache.sql
--
-- Corrige a busca que devolvia pouco ou nada (reproduzido em Postgres 16 +
-- pgvector 0.6 com o texto real do CTB):
--   1) Acentos: o índice guardava "habilitaç…"/"veícul…" e o app buscava sem
--      acento ("habilitacao") → 0 resultados. Agora o índice guarda as duas
--      formas (com e sem acento) e a consulta procura as duas.
--   2) Semântica E: plainto_tsquery exigia TODAS as palavras no mesmo trecho —
--      uma pergunta natural ("qual a multa por dirigir sem cinto") nunca
--      casava. Agora é OU, ordenado primeiro por quantas palavras distintas
--      da pergunta o trecho contém e depois por relevância (ts_rank_cd).
--   3) Vetores: search_dispositivos_vector devolvia a DISTÂNCIA com o nome
--      "similarity" (menor = melhor), e o app somava como se maior fosse
--      melhor → o trecho menos parecido vinha primeiro. Agora devolve 1 - distância.
--   4) O índice IVFFlat foi criado com a tabela vazia (o próprio pgvector avisa
--      "low recall"). Trocado por HNSW, que não depende de dados prévios.
-- E cria a base de documentos usada pela aba POP-PMSC e pelo painel:
--   5) documentos (um registro por arquivo enviado) + documento_trechos, com
--      exclusão em cascata, deduplicação por hash e reenvio que substitui.
--   6) dispositivos.documento_id/ordem para o CTB saber de qual arquivo veio
--      cada trecho (listar, substituir e excluir documentos no painel), e
--      numero_dispositivo sem UNIQUE (o mesmo "art. 1" existe em normas
--      diferentes; igual à migrations-007-drop-numero-dispositivo-unique.sql,
--      repetido aqui para esta migration bastar sozinha).
--   7) O bucket de envio passa a aceitar .doc (Word 97-2003) e .md.
--
-- Idempotente: pode ser executada de novo sem erro.

-- ---------------------------------------------------------------------------
-- 1) Configuração de busca sem acento
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
      CREATE EXTENSION unaccent WITH SCHEMA extensions; -- padrão do Supabase
    ELSE
      CREATE EXTENSION unaccent;
    END IF;
  END IF;
END $$;

-- The unaccent filter runs before the Portuguese stemmer. That alone would
-- stop "habilitação"/"habilitações" from sharing a stem (the stemmer keys on
-- "ção"), so the indexes below store both this and the plain `portuguese`
-- form, and to_or_tsquery_pt searches both.
DO $$
DECLARE
  v_schema TEXT;
BEGIN
  SELECT n.nspname INTO v_schema
  FROM pg_ts_dict d
  JOIN pg_namespace n ON n.oid = d.dictnamespace
  WHERE d.dictname = 'unaccent'
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM pg_ts_config
    WHERE cfgname = 'pt_unaccent' AND cfgnamespace = 'public'::regnamespace
  ) THEN
    CREATE TEXT SEARCH CONFIGURATION public.pt_unaccent (COPY = pg_catalog.portuguese);
  END IF;

  EXECUTE format(
    'ALTER TEXT SEARCH CONFIGURATION public.pt_unaccent
       ALTER MAPPING FOR hword, hword_part, word WITH %I.unaccent, pg_catalog.portuguese_stem',
    v_schema
  );
END $$;

-- Any-word query over both forms, e.g. "dirigir sem cinto" →
-- 'dirig' | 'cint' (stopwords dropped). NULL when nothing searchable is left.
CREATE OR REPLACE FUNCTION to_or_tsquery_pt(query_text TEXT)
RETURNS tsquery
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN s.com_acento = '' AND s.sem_acento = '' THEN NULL
    WHEN s.com_acento = '' THEN s.sem_acento::tsquery
    WHEN s.sem_acento = '' THEN s.com_acento::tsquery
    ELSE (s.com_acento || ' | ' || s.sem_acento)::tsquery
  END
  FROM (
    SELECT
      replace(plainto_tsquery('pg_catalog.portuguese', coalesce(query_text, ''))::text, ' & ', ' | ') AS com_acento,
      replace(plainto_tsquery('public.pt_unaccent', coalesce(query_text, ''))::text, ' & ', ' | ') AS sem_acento
  ) s
$$;

-- The distinct words of the question, each as its own query (both forms).
-- Ranking first by how many of them an excerpt contains keeps "cinto" +
-- "segurança" above an excerpt that only repeats "multa" (a coordination
-- factor; ts_rank_cd alone rewards repetition).
CREATE OR REPLACE FUNCTION query_words_pt(query_text TEXT)
RETURNS tsquery[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(array_agg(s.q), '{}')
  FROM (
    SELECT DISTINCT to_or_tsquery_pt(w) AS q
    FROM regexp_split_to_table(coalesce(query_text, ''), '\s+') AS w
  ) s
  WHERE s.q IS NOT NULL
$$;

-- ---------------------------------------------------------------------------
-- 2) dispositivos: índice textual com as duas formas (+ o número do artigo)
-- ---------------------------------------------------------------------------
-- Dropped first: the column rewrite below would otherwise rebuild it.
DROP INDEX IF EXISTS idx_dispositivos_embedding;

DO $$
BEGIN
  -- Skip the table rewrite when this migration already ran.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dispositivos'
      AND column_name = 'tsvector_pt' AND generation_expression LIKE '%pt_unaccent%'
  ) THEN
    ALTER TABLE dispositivos DROP COLUMN IF EXISTS tsvector_pt;
    ALTER TABLE dispositivos ADD COLUMN tsvector_pt TSVECTOR GENERATED ALWAYS AS (
      setweight(to_tsvector('pg_catalog.portuguese', coalesce(numero_dispositivo, '')), 'A') ||
      setweight(to_tsvector('public.pt_unaccent', coalesce(numero_dispositivo, '')), 'A') ||
      setweight(to_tsvector('pg_catalog.portuguese', coalesce(texto, '')), 'B') ||
      setweight(to_tsvector('public.pt_unaccent', coalesce(texto, '')), 'B')
    ) STORED;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_dispositivos_tsvector_pt ON dispositivos USING GIN (tsvector_pt);

-- ---------------------------------------------------------------------------
-- 3) Funções de busca do CTB (mesma assinatura: o app não muda de contrato)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_dispositivos_tsvector(query_text TEXT, limit_count INT DEFAULT 10)
RETURNS TABLE (id UUID, numero_dispositivo TEXT, texto TEXT, rank REAL)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH q AS (SELECT to_or_tsquery_pt(query_text) AS q, query_words_pt(query_text) AS palavras)
  SELECT d.id, d.numero_dispositivo, d.texto,
         ((SELECT count(*) FROM unnest(q.palavras) AS p WHERE d.tsvector_pt @@ p)
          + ts_rank_cd(d.tsvector_pt, q.q, 1 | 32))::REAL
  FROM dispositivos d, q
  WHERE d.tsvector_pt @@ q.q
  ORDER BY 4 DESC
  LIMIT limit_count
$$;

-- `extensions` stays on the path so `<=>` resolves when pgvector was enabled
-- from the Supabase dashboard (installed there instead of in public).
CREATE OR REPLACE FUNCTION search_dispositivos_vector(query_embedding VECTOR(1024), limit_count INT DEFAULT 10)
RETURNS TABLE (id UUID, numero_dispositivo TEXT, texto TEXT, similarity REAL)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT d.id, d.numero_dispositivo, d.texto, (1 - (d.embedding <=> query_embedding))::REAL
  FROM dispositivos d
  WHERE d.embedding IS NOT NULL
  ORDER BY d.embedding <=> query_embedding
  LIMIT limit_count
$$;

-- ---------------------------------------------------------------------------
-- 4) HNSW no lugar do IVFFlat criado com a tabela vazia (removido na seção 2)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_dispositivos_embedding_hnsw
    ON dispositivos USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN undefined_object THEN
  -- pgvector < 0.5 has no HNSW: exact search (no index) still has full recall.
  RAISE NOTICE 'pgvector sem HNSW: busca vetorial exata, sem índice.';
END $$;

-- ---------------------------------------------------------------------------
-- 5) Base de documentos (RAG)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colecao TEXT NOT NULL CHECK (colecao IN ('ctb', 'pop')),
  titulo TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  formato TEXT NOT NULL,
  norma_id TEXT,          -- só no CTB (ex.: "ctb", "res-432-2013")
  tipo TEXT,              -- só no CTB: lei | resolucao | portaria | manual
  hash_conteudo TEXT NOT NULL,
  paginas INT,
  caracteres INT NOT NULL DEFAULT 0,
  trechos INT NOT NULL DEFAULT 0,
  trechos_sem_vetor INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The same content is indexed once per collection.
CREATE UNIQUE INDEX IF NOT EXISTS idx_documentos_hash ON documentos (colecao, hash_conteudo);
CREATE INDEX IF NOT EXISTS idx_documentos_colecao ON documentos (colecao, criado_em DESC);

CREATE TABLE IF NOT EXISTS documento_trechos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  secao TEXT,
  pagina INT,
  texto TEXT NOT NULL,
  embedding VECTOR(1024), -- NULL enquanto o provedor de embeddings não respondeu
  tsv TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('pg_catalog.portuguese', coalesce(secao, '')), 'A') ||
    setweight(to_tsvector('public.pt_unaccent', coalesce(secao, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.portuguese', texto), 'B') ||
    setweight(to_tsvector('public.pt_unaccent', texto), 'B')
  ) STORED,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trechos_documento ON documento_trechos (documento_id, ordem);
CREATE INDEX IF NOT EXISTS idx_trechos_tsv ON documento_trechos USING GIN (tsv);
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_trechos_embedding_hnsw
    ON documento_trechos USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'pgvector sem HNSW: busca vetorial exata, sem índice.';
END $$;

-- Read only through the server (service role): no anon policy on purpose, so
-- the public key in the browser bundle can't page through the full documents.
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_trechos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION search_trechos_texto(query_text TEXT, p_colecao TEXT, limit_count INT DEFAULT 20)
RETURNS TABLE (
  id UUID, documento_id UUID, titulo TEXT, secao TEXT, pagina INT, ordem INT, texto TEXT, rank REAL
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH q AS (SELECT to_or_tsquery_pt(query_text) AS q, query_words_pt(query_text) AS palavras)
  SELECT t.id, t.documento_id, d.titulo, t.secao, t.pagina, t.ordem, t.texto,
         ((SELECT count(*) FROM unnest(q.palavras) AS p WHERE t.tsv @@ p)
          + ts_rank_cd(t.tsv, q.q, 1 | 32))::REAL
  FROM documento_trechos t
  JOIN documentos d ON d.id = t.documento_id
  CROSS JOIN q
  WHERE d.colecao = p_colecao AND t.tsv @@ q.q
  ORDER BY 8 DESC
  LIMIT limit_count
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
         (1 - (t.embedding <=> query_embedding))::REAL
  FROM documento_trechos t
  JOIN documentos d ON d.id = t.documento_id
  WHERE d.colecao = p_colecao AND t.embedding IS NOT NULL
  ORDER BY t.embedding <=> query_embedding
  LIMIT limit_count
$$;

-- ---------------------------------------------------------------------------
-- 6) CTB: de qual arquivo veio cada dispositivo (NULL = seed/legado)
-- ---------------------------------------------------------------------------
ALTER TABLE dispositivos ADD COLUMN IF NOT EXISTS documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE;
ALTER TABLE dispositivos ADD COLUMN IF NOT EXISTS ordem INT;
CREATE INDEX IF NOT EXISTS idx_dispositivos_documento ON dispositivos (documento_id, ordem);

-- Sem isto, indexar o CTB falha com "duplicate key" assim que um rótulo
-- repete o de um trecho antigo ou de outra norma.
ALTER TABLE dispositivos DROP CONSTRAINT IF EXISTS dispositivos_numero_dispositivo_key;
CREATE INDEX IF NOT EXISTS dispositivos_numero_dispositivo_idx ON dispositivos (numero_dispositivo);

-- ---------------------------------------------------------------------------
-- 7) Envio: aceitar .doc (Word 97-2003) e .md
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown'
]
WHERE id = 'documentos-pendentes';
