import { formatSupabaseAuditReport } from '../../scripts/check-supabase-audit';

describe('formatSupabaseAuditReport', () => {
  it('resume checks sem despejar o snapshot ou segredos', () => {
    const output = formatSupabaseAuditReport({
      status: 'bloqueio',
      snapshot: {} as never,
      checks: [{ id: 'rls', status: 'bloqueio', mensagem: 'RLS ausente', migration: 'scripts/migrations-004-rls.sql' }],
    });
    expect(output).toContain('BLOQUEIO');
    expect(output).toContain('scripts/migrations-004-rls.sql');
    expect(output).not.toContain('snapshot');
  });
});
