-- Migration 006 — Storage bucket for documents pending ingestion
-- Apply after scripts/migrations-005-pin-function-search-path.sql
--
-- Used by /api/admin/documents/upload-url and /api/ingestion/upload:
-- the browser uploads the file directly here (bypassing Vercel's 4.5MB
-- request body limit), then the ingestion route downloads it with the
-- service role client and removes it once processed.
--
-- No public/anon storage policies are created: access is granted per
-- upload via a short-lived signed URL minted server-side (supabaseAdmin),
-- so the bucket itself stays fully locked to the service role.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-pendentes',
  'documentos-pendentes',
  false,
  52428800, -- 50MB
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
on conflict (id) do nothing;
