-- Migration 009: Extended configuration columns
-- Adds configurable parameters for search, chunking, providers and cache.
-- Safe to run multiple times (IF NOT EXISTS pattern).

-- Update the app settings JSON with new fields if the row already exists.
UPDATE configuracoes
SET valor = jsonb_set(
  COALESCE(valor, '{}'::jsonb) || '{"pesoInfracoes":1.04,"rrfK":60,"minChunkChars":20,"defaultChunkChars":1200,"providerTimeoutMs":25000,"providerMaxAttempts":3,"cacheTtlDias":30,"debugLog":false}',
  '{atualizado_em}',
  to_jsonb(now())
)
WHERE chave = 'app';

-- If no row exists yet, insert one with all defaults.
INSERT INTO configuracoes (chave, valor, atualizado_em)
SELECT 'app',
  '{"consultas_por_hora":30,"turnstile_ativo":true,"pesoInfracoes":1.04,"rrfK":60,"minChunkChars":20,"defaultChunkChars":1200,"providerTimeoutMs":25000,"providerMaxAttempts":3,"cacheTtlDias":30,"debugLog":false}'::jsonb,
  now()
WHERE NOT EXISTS (SELECT 1 FROM configuracoes WHERE chave = 'app');