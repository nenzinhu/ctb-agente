import fs from 'node:fs';
import path from 'node:path';

const sql = fs.readFileSync(
  path.join(process.cwd(), 'scripts/migrations-014-apostila-paginas.sql'),
  'utf8'
);

describe('migration 014 — páginas e catálogo de apostilas', () => {
  it('adds an optional source page and the ordered lookup index', () => {
    expect(sql).toMatch(/ALTER TABLE public\.dispositivos\s+ADD COLUMN IF NOT EXISTS pagina INTEGER/is);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_dispositivos_documento_pagina_ordem\s+ON public\.dispositivos \(documento_id, pagina, ordem\)/is);
    expect(sql).not.toMatch(/UPDATE\s+(?:public\.)?dispositivos\s+SET\s+pagina/is);
  });

  it('creates one textual search for titles and both excerpt stores', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.search_documentos_apostila\(/i);
    expect(sql).toMatch(/RETURNS TABLE \(documento_id UUID, rank REAL\)/i);
    expect(sql).toMatch(/FROM public\.dispositivos/i);
    expect(sql).toMatch(/FROM public\.documento_trechos/i);
    expect(sql).toMatch(/to_tsvector\('public\.pt_unaccent', coalesce\(doc\.titulo, ''\)\)/i);
  });

  it('keeps the catalog server-only', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.search_documentos_apostila\(TEXT, INT\) FROM PUBLIC, anon, authenticated/i);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.search_documentos_apostila\(TEXT, INT\) TO service_role/i);
  });
});
