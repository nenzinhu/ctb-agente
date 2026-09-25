-- Migration 004 — Row Level Security
-- Apply after scripts/migrations-003-search-functions.sql
--
-- Without this, the publishable (anon) key — which ships in the client
-- bundle, since it's a NEXT_PUBLIC_* env var — has unrestricted read/write
-- access to every table. This locks writes to the service-role key
-- (used server-side via supabaseAdmin) and grants anon read-only access
-- only where the app actually reads with the anon client.

ALTER TABLE dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquadramentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE remissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE uso_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_bloqueados ENABLE ROW LEVEL SECURITY;

-- Public read access: matches what the app already reads via the anon key
-- (lib/db/queries.ts, lib/response/card-builder.ts, lib/pdf/cache.ts,
-- lib/response/cache.ts, lib/config/settings.ts). Writes to these tables
-- only ever go through supabaseAdmin (service role), which bypasses RLS,
-- so no anon write policy is needed.
CREATE POLICY "public read" ON dispositivos FOR SELECT TO anon USING (true);
CREATE POLICY "public read" ON enquadramentos FOR SELECT TO anon USING (true);
CREATE POLICY "public read" ON jurisprudencia FOR SELECT TO anon USING (true);
CREATE POLICY "public read" ON cache_respostas FOR SELECT TO anon USING (true);
CREATE POLICY "public read" ON configuracoes FOR SELECT TO anon USING (true);
CREATE POLICY "public read" ON ip_bloqueados FOR SELECT TO anon USING (true);

-- remissoes and uso_diario get no anon policy at all: remissoes has no
-- reader in the app yet, and uso_diario (visitor IPs + question text) is
-- read/written exclusively via supabaseAdmin in lib/ratelimit/limiter.ts.
