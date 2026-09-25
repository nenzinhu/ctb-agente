// GET /api/pop/documentos — the POP-PMSC library (titles and counts only;
// the full text is never exposed, only excerpts that answer a question).
import { NextResponse } from 'next/server';
import { databaseConfigured } from '@/lib/db/client';
import { MigrationPendingError, listDocuments } from '@/lib/ingestion/documents';

export async function GET() {
  if (!databaseConfigured) {
    return NextResponse.json({ documentos: [], migracaoPendente: false, bancoConfigurado: false });
  }

  try {
    const documentos = (await listDocuments('pop')).map((d) => ({
      id: d.id,
      titulo: d.titulo,
      formato: d.formato,
      paginas: d.paginas,
      trechos: d.trechos,
      trechos_sem_vetor: d.trechos_sem_vetor,
      criado_em: d.criado_em,
    }));
    return NextResponse.json({ documentos, migracaoPendente: false, bancoConfigurado: true });
  } catch (error) {
    if (error instanceof MigrationPendingError) {
      return NextResponse.json({ documentos: [], migracaoPendente: true, bancoConfigurado: true });
    }
    console.error('Failed to list POP documents:', error);
    return NextResponse.json({ error: 'Não foi possível carregar a biblioteca de POPs.' }, { status: 500 });
  }
}
