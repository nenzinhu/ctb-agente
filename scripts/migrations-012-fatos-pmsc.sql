-- Migration 012 — coleção RAG da Lista de Fatos (PMSC Mobile)
-- Apply after migration 008. Idempotent.

ALTER TABLE public.documentos
  DROP CONSTRAINT IF EXISTS documentos_colecao_check;

ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_colecao_check
  CHECK (colecao IN ('ctb', 'pop', 'natureza_potencial'));

