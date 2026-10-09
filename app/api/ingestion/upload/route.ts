// Processes a document already uploaded to Supabase Storage (see
// /api/admin/documents/upload-url): downloads it server-to-server with the
// service role client — no request body size limit applies here, since the
// file never passes through this Vercel function.
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { z } from 'zod';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/db/client';
import { DOCUMENTS_BUCKET } from '@/lib/ingestion/storage';
import { maybeGunzip } from '@/lib/ingestion/decompress';
import { parseDocument } from '@/lib/ingestion/parser';
import { MigrationPendingError, QualityMigrationPendingError } from '@/lib/ingestion/documents';
import { indexarDocumento, type IndexarResultado } from '@/lib/ingestion/indexar';
import { DocumentoMetadataSchema } from '@/lib/quality/metadata';

// A full document is now parsed into hundreds of chunks, each needing an
// embedding call before it's inserted. 60s is the highest value every
// Vercel plan (including Hobby) accepts without failing the deploy — raise
// it if the account is confirmed to be on Pro or higher. The processor stops
// asking for embeddings before that and leaves the rest for the panel's
// "gerar vetores pendentes".
export const maxDuration = 60;

const ArquivoBase = {
  storagePath: z.string().min(1),
  fileName: z.string().min(1),
  titulo: z.string().trim().max(200).optional(),
};

const DocumentoOficialBase = {
  ...ArquivoBase,
  ...DocumentoMetadataSchema.shape,
};

const UploadRequestSchema = z.discriminatedUnion('colecao', [
  z.object({
    ...DocumentoOficialBase,
    colecao: z.literal('ctb'),
    normaId: z.string().min(1),
    documentType: z.enum(['lei', 'resolucao', 'portaria', 'manual']),
    dataPublicacao: z.string().datetime().optional(),
    dataVigenciaInicio: z.string().datetime().optional(),
    dataVigenciaFim: z.string().datetime().optional().nullable(),
  }),
  z.object({ ...DocumentoOficialBase, colecao: z.literal('pop') }),
  z.object({ ...ArquivoBase, colecao: z.literal('natureza_potencial') }),
]);

/**
 * POST /api/ingestion/upload
 * Body: { storagePath, fileName, colecao: 'ctb' | 'pop' | 'natureza_potencial', ... } — the file
 * itself already lives in Supabase Storage at `storagePath`. Without
 * `colecao` the request is a CTB upload (the original contract).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Corpo da requisição não é um JSON válido.' },
      { status: 400 }
    );
  }

  const withDefault =
    body && typeof body === 'object' && !('colecao' in body) ? { ...body, colecao: 'ctb' } : body;
  const parsed = UploadRequestSchema.safeParse(withDefault);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'validation_error',
        issues: parsed.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
      },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const { storagePath, fileName } = input;
  let tempFilePath: string | null = null;

  try {
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .download(storagePath);

    if (downloadError || !fileBlob) {
      return NextResponse.json(
        { error: 'file_not_found', message: 'Arquivo não encontrado no armazenamento temporário.' },
        { status: 404 }
      );
    }

    // The admin panel may gzip the file before uploading it (see
    // lib/ingestion/compress-client.ts); restore the original bytes.
    let buffer: Buffer;
    try {
      buffer = maybeGunzip(Buffer.from(await fileBlob.arrayBuffer()));
    } catch (gunzipError) {
      const detalhe = gunzipError instanceof Error ? gunzipError.message : String(gunzipError);
      return NextResponse.json(
        { error: 'decompress_failed', message: `Não foi possível ler "${fileName}": ${detalhe}` },
        { status: 422 }
      );
    }
    // fileName comes from the client: only its extension is needed (the
    // parser picks the format by it), and keeping the rest out of the path
    // stops a name like "../../x.pdf" from writing outside tmpdir.
    const ext = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
    tempFilePath = path.join(
      os.tmpdir(),
      `ctb-ingestion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    );
    fs.writeFileSync(tempFilePath, buffer);

    let parsedDoc;
    try {
      parsedDoc = await parseDocument(tempFilePath, fileName);
    } catch (parseError) {
      // An unreadable file (scanned, password-protected, corrupt) is a
      // problem with the upload, not a server fault — say what's wrong.
      const detalhe = parseError instanceof Error ? parseError.message : String(parseError);
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { error: 'parse_failed', message: `Não foi possível ler "${fileName}": ${detalhe}` },
        { status: 422 }
      );
    }

    const indexado = await indexarDocumento({
      texto: parsedDoc.text,
      fileName,
      formato: parsedDoc.fileType,
      paginas: parsedDoc.pageCount,
      colecao: input.colecao,
      titulo: input.titulo,
      ...(input.colecao !== 'natureza_potencial'
        ? {
            fonteOficial: input.fonteOficial,
            versao: input.versao,
            vigenteDesde: input.vigenteDesde,
            conferidoEm: input.conferidoEm,
            situacao: input.situacao,
          }
        : {}),
      ...(input.colecao === 'ctb'
        ? {
            normaId: input.normaId,
            documentType: input.documentType,
            dataPublicacao: input.dataPublicacao,
            dataVigenciaInicio: input.dataVigenciaInicio,
            dataVigenciaFim: input.dataVigenciaFim,
          }
        : {}),
    });

    return respostaDaIndexacao(indexado, fileName, parsedDoc);
  } catch (error) {
    if (error instanceof QualityMigrationPendingError) {
      return NextResponse.json({ error: 'quality_migration_pending', message: error.message }, { status: 503 });
    }
    if (error instanceof MigrationPendingError) {
      return NextResponse.json({ error: 'migration_pending', message: error.message }, { status: 503 });
    }
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao enviar o arquivo' },
      { status: 500 }
    );
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Falha ao excluir o arquivo temporário:', cleanupError);
      }
    }

    // Best-effort: the object in `documentos-pendentes` is scratch space,
    // not the document of record (that's the rows processChunks inserted).
    try {
      await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    } catch (cleanupError) {
      console.error('Falha ao excluir o objeto temporário do armazenamento:', cleanupError);
    }
  }
}

/**
 * Maps the pipeline outcome to the HTTP answer the panel expects.
 */
function respostaDaIndexacao(
  indexado: IndexarResultado,
  fileName: string,
  parsedDoc: { fileType: string; pageCount?: number }
): NextResponse {
  if (indexado.status === 'vazio') {
    return NextResponse.json(
      { error: 'empty_document', message: `Nenhum texto aproveitável foi encontrado em "${fileName}".` },
      { status: 422 }
    );
  }

  if (indexado.status === 'duplicado') {
    const existente = indexado.documento;
    return NextResponse.json({
      success: true,
      duplicado: true,
      message: `"${fileName}" já está indexado como "${existente.titulo}" — nada foi alterado.`,
      data: { documentoId: existente.id, fileName, chunkCount: existente.trechos, insertedCount: 0, failedCount: 0 },
    });
  }

  // A 200 here with insertedCount 0 would look like a successful upload to
  // the admin panel (it only checks response.ok) while nothing actually
  // landed. Fail the request instead so the real reason surfaces in the UI.
  if (indexado.status === 'falhou') {
    const { resultado, chunkCount } = indexado;
    const firstError = resultado.errors[0]?.error;
    return NextResponse.json(
      {
        error: 'ingestion_failed',
        message: firstError
          ? `Nenhum trecho de "${fileName}" foi importado: ${firstError}`
          : `Nenhum trecho de "${fileName}" pôde ser importado.`,
        data: {
          fileName,
          chunkCount,
          insertedCount: resultado.insertedCount,
          failedCount: resultado.failedCount,
          errors: resultado.errors,
        },
      },
      { status: 422 }
    );
  }

  const { resultado, documento, titulo, chunkCount, substituidos } = indexado;
  return NextResponse.json(
    {
      success: true,
      message: `"${titulo}": ${resultado.insertedCount} trechos indexados.`,
      data: {
        documentoId: documento?.id ?? null,
        titulo,
        fileName,
        formato: parsedDoc.fileType,
        paginas: parsedDoc.pageCount ?? null,
        chunkCount,
        insertedCount: resultado.insertedCount,
        failedCount: resultado.failedCount,
        semVetor: resultado.semVetor,
        avisoVetor: resultado.avisoVetor,
        substituidos,
        legado: documento === null,
        errors: resultado.errors.length > 0 ? resultado.errors : undefined,
      },
    },
    { status: 200 }
  );
}

/**
 * Handles GET request with information about the endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      name: 'Serviço de envio de documentos',
      version: '3.0.0',
      description:
        'Indexa na base do CTB ou dos POPs da PMSC um documento (PDF, DOC, DOCX, MD ou TXT) já enviado ao armazenamento do Supabase.',
      methods: {
        POST: {
          description: 'Processa um documento enviado anteriormente por /api/admin/documents/upload-url.',
          accepts: 'application/json',
          fields: {
            storagePath: 'Caminho retornado por /api/admin/documents/upload-url',
            fileName: 'Nome original do arquivo',
            colecao: 'ctb (padrão) | pop | natureza_potencial',
            titulo: 'Título opcional para exibição',
            normaId: 'Somente CTB: identificador da norma à qual o documento pertence',
            documentType: 'Somente CTB: lei | resolucao | portaria | manual',
          },
          maxFileSize: '50 MB (limite aplicado pelo recipiente documentos-pendentes do armazenamento)',
        },
      },
    },
    { status: 200 }
  );
}
