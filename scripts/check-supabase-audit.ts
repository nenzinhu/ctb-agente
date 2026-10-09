import { readFileSync } from 'node:fs';
import { evaluateSupabaseAudit, type SupabaseAuditReport } from '../lib/health/supabase-audit';

const ICON: Record<string, string> = { ok: 'OK', atencao: 'ATENÇÃO', bloqueio: 'BLOQUEIO' };

export function formatSupabaseAuditReport(report: SupabaseAuditReport): string {
  const lines = [`Auditoria do Supabase: ${ICON[report.status]}`];
  for (const check of report.checks) {
    lines.push(`[${ICON[check.status]}] ${check.mensagem}${check.migration ? ` — ${check.migration}` : ''}`);
  }
  return lines.join('\n');
}

function main(): void {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: npm run check:supabase-audit -- /caminho/auditoria.json');
    process.exitCode = 1;
    return;
  }
  try {
    const report = evaluateSupabaseAudit(JSON.parse(readFileSync(file, 'utf8')) as unknown);
    console.log(formatSupabaseAuditReport(report));
    if (report.status === 'bloqueio') process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Relatório de auditoria inválido.');
    process.exitCode = 1;
  }
}

if (typeof require !== 'undefined' && require.main === module) main();
