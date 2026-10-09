import { evaluateSupabaseAudit } from '@/lib/health/supabase-audit';

const seguro = {
  meta: { generated_at: '2026-10-08T00:00:00Z' },
  extensions: { vector: true, unaccent: true },
  tables: {
    dispositivos: true,
    enquadramentos: true,
    configuracoes: true,
    cache_respostas: true,
    ip_bloqueados: true,
    uso_diario: true,
    documentos: true,
    documento_trechos: true,
  },
  columns: { embedding: true, documento_id: true, corpus_version: true },
  indexes: { text_search: true, vector_search: true },
  bucket: { exists: true, public: false },
  rls: {
    dispositivos: true,
    enquadramentos: true,
    configuracoes: true,
    cache_respostas: true,
    ip_bloqueados: true,
    uso_diario: true,
    documentos: true,
    documento_trechos: true,
  },
  private_access: { cache_anon: false, ips_anon: false },
  functions: {
    rag_schema_version: { exists: true, security_definer: false, public_execute: true },
    search_dispositivos_tsvector: { exists: true, security_definer: false, public_execute: true },
    search_dispositivos_vector: { exists: true, security_definer: false, public_execute: true },
    register_query_and_check_limit: { exists: true, security_definer: true, public_execute: false },
    bump_corpus_version: { exists: true, security_definer: true, public_execute: false },
    purge_expired_cache: { exists: true, security_definer: true, public_execute: false },
  },
  rag_schema_version: 10,
  counts: { documentos: 1, trechos: 10, dispositivos: 20, enquadramentos: 5, vetores_pendentes: 0 },
  seed_examples: [],
};

describe('evaluateSupabaseAudit', () => {
  it('aprova um snapshot completo e seguro', () => {
    expect(evaluateSupabaseAudit(seguro)).toMatchObject({ status: 'ok' });
  });

  it('bloqueia esquema RAG anterior à migration 010', () => {
    const report = evaluateSupabaseAudit({ ...seguro, rag_schema_version: 9 });
    expect(report.status).toBe('bloqueio');
    expect(report.checks).toContainEqual(expect.objectContaining({
      id: 'rag_schema_version',
      migration: 'scripts/migrations-010-rag-precision-performance.sql',
    }));
  });

  it('bloqueia leitura anônima de dados privados e RPC privilegiada pública', () => {
    const report = evaluateSupabaseAudit({
      ...seguro,
      private_access: { cache_anon: true, ips_anon: false },
      functions: {
        ...seguro.functions,
        purge_expired_cache: { exists: true, security_definer: true, public_execute: true },
      },
    });
    expect(report.status).toBe('bloqueio');
    expect(report.checks.map((check) => check.id)).toEqual(
      expect.arrayContaining(['private_tables', 'privileged_functions'])
    );
  });

  it('aceita as formas exportadas pelo SQL Editor', () => {
    expect(evaluateSupabaseAudit([{ audit: seguro }]).status).toBe('ok');
    expect(evaluateSupabaseAudit({ audit: seguro }).status).toBe('ok');
  });

  it('sinaliza dados de exemplo sem reprovar a segurança do banco', () => {
    const report = evaluateSupabaseAudit({ ...seguro, seed_examples: ['516-91'] });
    expect(report.status).toBe('atencao');
    expect(report.checks).toContainEqual(expect.objectContaining({ id: 'seed_examples' }));
  });

  it('falha fechado quando o relatório está incompleto', () => {
    expect(() => evaluateSupabaseAudit({ rag_schema_version: 10 })).toThrow(
      'Relatório de auditoria incompleto'
    );
  });
});
