import { readFileSync } from 'fs';
import path from 'path';

describe('migration 013 de estrangeiros', () => {
  const sql = readFileSync(path.join(process.cwd(), 'scripts', 'migrations-013-estrangeiros.sql'), 'utf8');

  it('preserva coleções existentes e habilita estrangeiros de forma idempotente', () => {
    for (const colecao of ['ctb', 'pop', 'natureza_potencial', 'estrangeiros']) expect(sql).toContain(`'${colecao}'`);
    expect(sql).toMatch(/drop constraint if exists/i);
    expect(sql).toMatch(/where p_colecao <> 'ctb'/i);
    expect(sql).toMatch(/select 13/i);
  });
});
