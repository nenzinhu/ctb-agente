import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('audit-supabase.sql', () => {
  const sqlPath = path.join(process.cwd(), 'scripts/audit-supabase.sql');

  it('é somente leitura e retorna uma única coluna audit em JSON', () => {
    const sql = readFileSync(sqlPath, 'utf8');
    const executable = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(executable).toMatch(/select\s+jsonb_build_object\([\s\S]+\)\s+as\s+audit\s*;?\s*$/i);
    expect(executable).not.toMatch(/\b(insert|update|delete|alter|create|drop|grant|revoke|truncate)\b/i);
    for (const section of ['extensions', 'tables', 'columns', 'indexes', 'bucket', 'rls', 'private_access', 'functions', 'counts', 'seed_examples']) {
      expect(sql).toContain(`'${section}'`);
    }
    expect(sql).toContain('select public.rag_schema_version() as rag_schema_version');
    expect(sql).not.toMatch(/then\s+10\s+end/i);
  });
});
