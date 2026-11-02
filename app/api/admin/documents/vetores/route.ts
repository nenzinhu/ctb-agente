// Generates embeddings for excerpts indexed without one. The panel calls it
// in a loop until `restantes` reaches zero.
import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { databaseConfigured } from '@/lib/db/client';
import { getEmbeddingConfig } from '@/lib/ai/embedding-config';
import { backfillEmbeddings } from '@/lib/ingestion/backfill';

export const maxDuration = 60;

// Stop starting new batches with room left for the last one to finish.
const BUDGET_MS = 40_000;

/**
 * POST /api/admin/documents/vetores → { atualizados, restantes, erro? }
 */
export async function POST() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  if (!databaseConfigured) {
    return NextResponse.json({ error: 'database_not_configured', message: 'Banco não configurado.' }, { status: 503 });
  }
  const config = await getEmbeddingConfig();
  if (!config.configurado) {
    return NextResponse.json(
      {
        error: 'embeddings_not_configured',
        message: `Defina ${config.envVar} para gerar vetores com ${config.nome}. A busca por palavras continua funcionando.`,
      },
      { status: 503 }
    );
  }

  try {
    const resultado = await backfillEmbeddings(Date.now() + BUDGET_MS);
    return NextResponse.json(resultado, { status: resultado.erro ? 502 : 200 });
  } catch (error) {
    console.error('Embedding backfill failed:', error);
    return NextResponse.json(
      { error: 'backfill_failed', message: error instanceof Error ? error.message : 'Falha ao gerar vetores.' },
      { status: 500 }
    );
  }
}
