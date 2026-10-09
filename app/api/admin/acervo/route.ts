// Bundled documents (lib/ingestion/acervo.ts): list them with their indexing
// status, and index one on demand — no upload needed.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateSession } from '@/lib/auth/session';
import { databaseConfigured } from '@/lib/db/client';
import { ACERVO, lerAcervo, nomeArquivoAcervo } from '@/lib/ingestion/acervo';
import {
  MigrationPendingError,
  QualityMigrationPendingError,
  findDocumentByHash,
  hashConteudo,
} from '@/lib/ingestion/documents';
import { indexarDocumento } from '@/lib/ingestion/indexar';
import { stripPageMarkers } from '@/lib/ingestion/pdf-text';

export const maxDuration = 60;

/**
 * GET /api/admin/acervo → { itens: [{ id, titulo, descricao, paginas, fonte, indexado, documento? }] }
 */
export async function GET() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  let migracaoPendente = false;
  const itens = await Promise.all(
    ACERVO.map(async (item) => {
      const base = {
        id: item.id,
        titulo: item.titulo,
        descricao: item.descricao,
        paginas: item.paginas,
        fonte: item.fonte,
        colecao: item.colecao,
      };
      if (!databaseConfigured) return { ...base, indexado: false };
      try {
        const documento = await findDocumentByHash(item.colecao, hashConteudo(stripPageMarkers(lerAcervo(item))));
        return { ...base, indexado: Boolean(documento), documento };
      } catch (error) {
        if (error instanceof MigrationPendingError) migracaoPendente = true;
        else console.error('Acervo status failed:', error);
        return { ...base, indexado: false };
      }
    })
  );

  return NextResponse.json({ itens, migracaoPendente, bancoConfigurado: databaseConfigured });
}

const IndexarSchema = z.object({ id: z.string().min(1) });

/**
 * POST /api/admin/acervo { id } → indexes that bundled document
 */
export async function POST(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  if (!databaseConfigured) {
    return NextResponse.json({ error: 'database_not_configured', message: 'Banco não configurado.' }, { status: 503 });
  }

  const parsed = IndexarSchema.safeParse(await request.json().catch(() => null));
  const item = parsed.success ? ACERVO.find((i) => i.id === parsed.data.id) : undefined;
  if (!item) {
    return NextResponse.json({ error: 'not_found', message: 'Documento do acervo não encontrado.' }, { status: 404 });
  }

  try {
    const resultado = await indexarDocumento({
      texto: lerAcervo(item),
      fileName: nomeArquivoAcervo(item),
      formato: 'txt',
      paginas: item.paginas,
      colecao: item.colecao,
      titulo: item.titulo,
      normaId: item.normaId,
      documentType: item.documentType,
    });

    if (resultado.status === 'duplicado') {
      return NextResponse.json({ success: true, duplicado: true, message: `"${item.titulo}" já está indexado.` });
    }
    if (resultado.status !== 'indexado') {
      const erro = resultado.status === 'falhou' ? resultado.resultado.errors[0]?.error : undefined;
      return NextResponse.json(
        { error: 'ingestion_failed', message: `Não foi possível indexar "${item.titulo}"${erro ? `: ${erro}` : '.'}` },
        { status: 422 }
      );
    }

    const { resultado: r, substituidos, documento } = resultado;
    return NextResponse.json({
      success: true,
      message: `"${item.titulo}": ${r.insertedCount} trechos indexados.`,
      data: {
        documentoId: documento?.id ?? null,
        insertedCount: r.insertedCount,
        semVetor: r.semVetor,
        avisoVetor: r.avisoVetor,
        substituidos,
        legado: documento === null,
      },
    });
  } catch (error) {
    if (error instanceof QualityMigrationPendingError) {
      return NextResponse.json({ error: 'quality_migration_pending', message: error.message }, { status: 503 });
    }
    if (error instanceof MigrationPendingError) {
      return NextResponse.json({ error: 'migration_pending', message: error.message }, { status: 503 });
    }
    console.error('Acervo indexing failed:', error);
    return NextResponse.json({ error: 'Falha ao indexar o documento do acervo.' }, { status: 500 });
  }
}
