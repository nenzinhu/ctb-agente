/** @jest-environment node */

import fs from 'fs';
import path from 'path';

describe('migration 011 de qualidade documental', () => {
  const sqlPath = path.join(process.cwd(), 'scripts', 'migrations-011-document-quality.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  it.each(['fonte_oficial', 'versao', 'vigente_desde', 'conferido_em', 'situacao'])(
    'adiciona o metadado %s aos documentos',
    (coluna) => {
      expect(sql).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS ${coluna}\\b`, 'i'));
    },
  );

  it('cria histórico fechado com coleções e estados válidos', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS diagnosticos_base/i);
    expect(sql).toMatch(/colecao\s+TEXT[^;]+CHECK\s*\(colecao IN \('ctb', 'mbft', 'pop'\)\)/is);
    expect(sql).toMatch(/status\s+TEXT[^;]+CHECK\s*\(status IN \('pronta', 'atencao', 'critica'\)\)/is);
    expect(sql).toMatch(/ALTER TABLE diagnosticos_base ENABLE ROW LEVEL SECURITY/i);
    expect(sql).not.toMatch(/CREATE POLICY[^;]+(?:anon|authenticated)/i);
  });

  it('oferece estatísticas agregadas e a versão do esquema', () => {
    expect(sql).toMatch(/FUNCTION document_quality_stats\s*\(p_colecao TEXT\)/i);
    expect(sql).toMatch(/FUNCTION quality_schema_version\s*\(\)/i);
    expect(sql).toMatch(/SELECT\s+11\s*;?/i);
  });
});
