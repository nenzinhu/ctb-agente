import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateSession } from '@/lib/auth/session';
import { QualityMigrationPendingError } from '@/lib/ingestion/documents';
import { executarDiagnostico } from '@/lib/quality/diagnose';
import { listarUltimosDiagnosticos } from '@/lib/quality/repository';

export const maxDuration = 60;

const ExecucaoSchema = z.object({
  colecao: z.enum(['ctb', 'mbft', 'pop'], { message: 'Informe uma coleção válida: CTB, MBFT ou POP.' }),
});

export async function GET() {
  if (!(await validateSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    const diagnosticos = await listarUltimosDiagnosticos();
    return NextResponse.json({ diagnosticos, migracaoPendente: false });
  } catch (error) {
    if (error instanceof QualityMigrationPendingError) {
      return NextResponse.json({
        diagnosticos: [],
        migracaoPendente: true,
        message: error.message,
      });
    }
    console.error('Quality diagnostics read failed:', error);
    return NextResponse.json({ error: 'Não foi possível carregar a qualidade das bases.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await validateSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const parsed = ExecucaoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', message: parsed.error.issues[0]?.message }, { status: 400 });
  }
  try {
    return NextResponse.json({ diagnostico: await executarDiagnostico(parsed.data.colecao) });
  } catch (error) {
    if (error instanceof QualityMigrationPendingError) {
      return NextResponse.json({ error: 'quality_migration_pending', message: error.message }, { status: 503 });
    }
    console.error('Quality diagnosis failed:', error);
    return NextResponse.json({ error: 'Não foi possível executar o diagnóstico.' }, { status: 500 });
  }
}
