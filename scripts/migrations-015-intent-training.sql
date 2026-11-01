-- Base supervisionada para um futuro classificador pequeno de intenção.
-- Guarda somente a consulta anonimizada, rótulos e referências de fontes;
-- legislação e conteúdo integral das respostas permanecem no RAG.

CREATE TABLE IF NOT EXISTS public.intencao_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_anonimizada TEXT NOT NULL CHECK (char_length(consulta_anonimizada) BETWEEN 1 AND 1000),
  hash_consulta TEXT NOT NULL CHECK (hash_consulta ~ '^[a-f0-9]{64}$'),
  dominio_previsto TEXT NOT NULL CHECK (dominio_previsto IN ('ctb', 'infracao', 'pop', 'fato_pmsc')),
  confianca DOUBLE PRECISION NOT NULL CHECK (confianca BETWEEN 0 AND 1),
  fonte_classificacao TEXT NOT NULL CHECK (fonte_classificacao IN ('regra', 'modelo_intencao')),
  modelo_intencao TEXT,
  sinais JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sinais) = 'array'),
  resultados JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(resultados) = 'array'),
  dominio_esperado TEXT CHECK (dominio_esperado IN ('ctb', 'infracao', 'pop', 'fato_pmsc')),
  resultados_esperados JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(resultados_esperados) = 'array'),
  nota_correcao TEXT CHECK (nota_correcao IS NULL OR char_length(nota_correcao) <= 1000),
  revisada BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_em TIMESTAMPTZ,
  CHECK (NOT revisada OR (dominio_esperado IS NOT NULL AND revisado_em IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_intencao_consultas_revisao
  ON public.intencao_consultas (revisada, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_intencao_consultas_hash
  ON public.intencao_consultas (hash_consulta);

ALTER TABLE public.intencao_consultas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intencao_consultas FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.intencao_consultas TO service_role;

COMMENT ON TABLE public.intencao_consultas IS
  'Exemplos anonimizados e revisados para classificar intenção; não armazena legislação nem IP.';
