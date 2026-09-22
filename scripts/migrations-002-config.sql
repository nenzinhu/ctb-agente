-- Migration 002 — runtime configuration, IP exceptions and usage reporting
-- Apply after scripts/migrations.sql

-- Key/value runtime settings edited in the "Limites" tab
CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Defaults matching the specification (30 queries/IP/hour, Turnstile on)
INSERT INTO configuracoes (chave, valor)
VALUES ('app', '{"consultas_por_hora": 30, "turnstile_ativo": true}'::jsonb)
ON CONFLICT (chave) DO NOTHING;

-- IPs explicitly blocked by the master
CREATE TABLE IF NOT EXISTS ip_bloqueados (
  ip TEXT PRIMARY KEY,
  motivo TEXT DEFAULT '',
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Store the query text so the "perguntas sem resposta" report has content
ALTER TABLE uso_diario ADD COLUMN IF NOT EXISTS pergunta TEXT;

-- Speed up the hourly rate limit window lookup
CREATE INDEX IF NOT EXISTS idx_uso_diario_ip_ts ON uso_diario (ip_endereco, timestamp DESC);

-- Speed up the cache TTL sweep
CREATE INDEX IF NOT EXISTS idx_cache_respostas_acesso ON cache_respostas (data_ultimo_acesso DESC);

-- Jurisprudence lookups by related devices (array overlap)
CREATE INDEX IF NOT EXISTS idx_jurisprudencia_dispositivos
  ON jurisprudencia USING GIN (dispositivos_relacionados);
