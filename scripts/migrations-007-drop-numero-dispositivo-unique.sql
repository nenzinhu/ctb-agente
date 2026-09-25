-- Migration 007 — Drop the global UNIQUE constraint on numero_dispositivo
-- Apply after scripts/migrations-006-documents-storage-bucket.sql
--
-- numero_dispositivo (e.g. "art. 5") was never actually unique in practice:
-- - Two different normas (a lei and a resolução, say) can both have an
--   "art. 1" — nothing scopes the constraint to norma_id.
-- - A single article that runs past ~500 chars gets split across multiple
--   chunks by lib/ingestion/chunker.ts, and all of them legitimately share
--   the same numero_dispositivo.
-- - A consolidated/compiled law (redlines from several amending laws) can
--   plausibly repeat an article number in its own text.
--
-- Any of these made real document ingestion fail partway through with
-- "duplicate key value violates unique constraint dispositivos_numero_dispositivo_key",
-- silently dropping whichever chunk lost the race. The one caller that
-- assumed uniqueness (getDispositivoByNumero in lib/db/queries.ts) already
-- treats "no row or ambiguous" as a cache-miss and falls back to
-- findDispositivoByReferencia's scored search, so dropping the constraint
-- needs no application code changes.

ALTER TABLE dispositivos DROP CONSTRAINT dispositivos_numero_dispositivo_key;

-- Keep a plain (non-unique) index so exact-match lookups stay fast.
CREATE INDEX IF NOT EXISTS dispositivos_numero_dispositivo_idx ON dispositivos (numero_dispositivo);
