import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { databaseConfigured, supabaseAdmin } from '@/lib/db/client';
import {
  COLECOES,
  MigrationPendingError,
  deleteDocument,
  isMissingSchemaError,
  listDocuments,
  type Colecao,
  type DocumentoRegistro,
  type GrupoLegado,
} from '@/lib/ingestion/documents';
import { countPendingEmbeddings } from '@/lib/ingestion/backfill';
import { invalidateResponseCache } from '@/lib/response/cache';

function colecaoDe(request: NextRequest): Colecao | undefined {
  const valor = request.nextUrl.searchParams.get('colecao');
  return COLECOES.find((c) => c === valor);
}

/**
 * Groups the excerpts that don't belong to a registered document.
 */
async function gruposLegados(): Promise<GrupoLegado[]> {
  let resposta = await supabaseAdmin
    .from('dispositivos')
    .select('norma_id, tipo')
    .is('documento_id', null)
    .limit(20000);
  if (resposta.error && isMissingSchemaError(resposta.error)) {
    // Before migration 008 every excerpt is legacy.
    resposta = await supabaseAdmin.from('dispositivos').select('norma_id, tipo').limit(20000);
  }
  if (resposta.error) throw new Error(resposta.error.message);

  const grupos = new Map<string, GrupoLegado>();
  for (const linha of (resposta.data ?? []) as { norma_id: string | null; tipo: string }[]) {
    const norma = linha.norma_id ?? 'sem norma';
    const chave = `${norma}|${linha.tipo}`;
    const grupo = grupos.get(chave) ?? { norma_id: norma, tipo: linha.tipo, trechos: 0 };
    grupo.trechos++;
    grupos.set(chave, grupo);
  }
  return [...grupos.values()].sort((a, b) => b.trechos - a.trechos);
}

/**
 * List the indexed documents for the admin panel
 * GET /api/admin/documents?colecao=ctb|pop
 * Requires valid admin session
 */
export async function GET(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Without credentials the list is legitimately empty; a 500 here would
  // look like a broken panel on a fresh deployment.
  if (!databaseConfigured) {
    return NextResponse.json(
      {
        documentos: [],
        legado: [],
        pendentesVetor: 0,
        migracaoPendente: false,
        bancoConfigurado: false,
        message: 'Banco não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.',
      },
      { status: 200 }
    );
  }

  const colecao = colecaoDe(request);
  try {
    let documentos: DocumentoRegistro[] = [];
    let migracaoPendente = false;
    try {
      documentos = await listDocuments(colecao);
    } catch (error) {
      if (!(error instanceof MigrationPendingError)) throw error;
      migracaoPendente = true;
    }

    const [legado, pendentesVetor] = await Promise.all([
      colecao === 'pop' ? Promise.resolve([]) : gruposLegados(),
      countPendingEmbeddings(),
    ]);

    return NextResponse.json(
      { documentos, legado, pendentesVetor, migracaoPendente, bancoConfigurado: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Não foi possível carregar os documentos.' }, { status: 500 });
  }
}

/**
 * Delete a document (and its excerpts) or a legacy group of CTB excerpts
 * DELETE /api/admin/documents?id=<uuid>
 * DELETE /api/admin/documents?legado=<norma_id>&tipo=<tipo>
 */
export async function DELETE(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!databaseConfigured) {
    return NextResponse.json({ error: 'database_not_configured', message: 'Banco não configurado.' }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const id = params.get('id');
  const legado = params.get('legado');

  try {
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return NextResponse.json({ error: 'invalid_id', message: 'Identificador inválido.' }, { status: 400 });
      }
      const removido = await deleteDocument(id);
      if (!removido) {
        return NextResponse.json({ error: 'not_found', message: 'Documento não encontrado.' }, { status: 404 });
      }
    } else if (legado) {
      let query = supabaseAdmin.from('dispositivos').delete().eq('norma_id', legado);
      const tipo = params.get('tipo');
      if (tipo) query = query.eq('tipo', tipo);
      let { error } = await query.is('documento_id', null);
      if (error && isMissingSchemaError(error)) {
        let semColuna = supabaseAdmin.from('dispositivos').delete().eq('norma_id', legado);
        if (tipo) semColuna = semColuna.eq('tipo', tipo);
        ({ error } = await semColuna);
      }
      if (error) throw new Error(error.message);
    } else {
      return NextResponse.json({ error: 'missing_target', message: 'Informe id ou legado.' }, { status: 400 });
    }

    // Answers cached from the removed text must not outlive it.
    await invalidateResponseCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MigrationPendingError) {
      return NextResponse.json({ error: 'migration_pending', message: error.message }, { status: 503 });
    }
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Não foi possível excluir.' }, { status: 500 });
  }
}
