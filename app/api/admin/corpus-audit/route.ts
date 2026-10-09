import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { databaseConfigured } from '@/lib/db/client';
import { listEnquadramentos } from '@/lib/db/queries';
import { listDocuments } from '@/lib/ingestion/documents';
import { todasAsFichas } from '@/lib/mbft/fichas';
import { auditEnquadramentos } from '@/lib/mbft/corpus-audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  if (!databaseConfigured) {
    return NextResponse.json({
      error: 'database_not_configured',
      message: 'Configure o Supabase antes de revisar a base real.',
    }, { status: 503 });
  }

  try {
    const [enquadramentos, documentos] = await Promise.all([
      listEnquadramentos(),
      listDocuments(),
    ]);
    const trechos = documentos.reduce((total, documento) => total + Number(documento.trechos || 0), 0);
    const vetoresPendentes = documentos.reduce(
      (total, documento) => total + Number(documento.trechos_sem_vetor || 0),
      0
    );
    const ctbIndexado = documentos.some(
      (documento) => documento.colecao === 'ctb' && /ctb|9503/i.test(documento.norma_id ?? documento.titulo)
    );

    return NextResponse.json({
      corpus: { documentos: documentos.length, trechos, vetoresPendentes, ctbIndexado },
      enquadramentos: auditEnquadramentos(enquadramentos, todasAsFichas()),
    });
  } catch (error) {
    console.error('Corpus audit failed:', error);
    return NextResponse.json(
      { error: 'corpus_audit_failed', message: 'Não foi possível revisar a base agora.' },
      { status: 500 }
    );
  }
}
