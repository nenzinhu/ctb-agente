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
import { parseDocument } from '@/lib/ingestion/parser';
import { chunkText } from '@/lib/ingestion/chunker';
import { processChunks } from '@/lib/ingestion/processor';
import { invalidateResponseCache } from '@/lib/response/cache';

// A full document is now parsed into hundreds of chunks, each needing an
// embedding call before it's inserted. 60s is the highest value every
// Vercel plan (including Hobby) accepts without failing the deploy — raise
// it if the account is confirmed to be on Pro or higher.
export const maxDuration = 60;

const UploadRequestSchema = z.object({
  storagePath: z.string().min(1),
  fileName: z.string().min(1),
  normaId: z.string().min(1),
  documentType: z.enum(['lei', 'resolucao', 'portaria', 'manual']),
  dataPublicacao: z.string().datetime().optional(),
  dataVigenciaInicio: z.string().datetime().optional(),
  dataVigenciaFim: z.string().datetime().optional().nullable(),
});

/**
 * POST /api/ingestion/upload
 * Body: { storagePath, fileName, normaId, documentType, ... } — the file
 * itself already lives in Supabase Storage at `storagePath`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const parsed = UploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'validation_error',
        issues: parsed.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
      },
      { status: 400 }
    );
  }

  const { storagePath, fileName, normaId, documentType, dataPublicacao, dataVigenciaInicio, dataVigenciaFim } =
    parsed.data;

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

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    tempFilePath = path.join(os.tmpdir(), `ctb-ingestion-${Date.now()}-${fileName}`);
    fs.writeFileSync(tempFilePath, buffer);

    console.log(`Parsing document: ${fileName}`);
    const parsedDoc = await parseDocument(tempFilePath, fileName);

    console.log('Chunking document into segments');
    const chunks = chunkText(parsedDoc.text, 500); // ~500 char chunks

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'No text content could be extracted from the file' },
        { status: 422 }
      );
    }

    console.log(`Created ${chunks.length} chunks`);
    console.log('Processing chunks and generating embeddings');
    const processingResult = await processChunks({
      chunks,
      normaId,
      documentType,
      dataPublicacao,
      dataVigenciaInicio,
      dataVigenciaFim,
    });

    console.log(
      `Processing complete: ${processingResult.insertedCount} inserted, ${processingResult.failedCount} failed`
    );

    // The corpus changed: cached cards may cite outdated text. Best-effort —
    // a failed invalidation must not fail an upload that actually landed.
    if (processingResult.insertedCount > 0) {
      const removidos = await invalidateResponseCache();
      console.log(`Response cache invalidated: ${removidos} entries removed`);
    }

    const success = processingResult.insertedCount > 0;

    // A 200 here with insertedCount 0 would look like a successful upload to
    // the admin panel (it only checks response.ok) while nothing actually
    // landed in `dispositivos`. Fail the request instead so the real reason
    // (usually the embedding provider) surfaces in the UI.
    if (!success) {
      const firstError = processingResult.errors[0]?.error;
      return NextResponse.json(
        {
          error: 'ingestion_failed',
          message: firstError
            ? `Nenhum trecho de "${fileName}" foi importado: ${firstError}`
            : `Nenhum trecho de "${fileName}" pôde ser importado.`,
          data: {
            fileName,
            chunkCount: chunks.length,
            insertedCount: processingResult.insertedCount,
            failedCount: processingResult.failedCount,
            errors: processingResult.errors,
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${fileName}: ${processingResult.insertedCount} chunks inserted`,
        data: {
          fileName,
          chunkCount: chunks.length,
          insertedCount: processingResult.insertedCount,
          failedCount: processingResult.failedCount,
          insertedIds: processingResult.insertedIds,
          errors: processingResult.errors.length > 0 ? processingResult.errors : undefined,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Failed to clean up temp file:', cleanupError);
      }
    }

    // Best-effort: the object in `documentos-pendentes` is scratch space,
    // not the document of record (that's the rows processChunks inserted).
    try {
      await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    } catch (cleanupError) {
      console.error('Failed to remove temp storage object:', cleanupError);
    }
  }
}

/**
 * Handles GET request with information about the endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      name: 'Document Upload Endpoint',
      version: '2.0.0',
      description: 'Processes a legal document (PDF, DOCX, or TXT) already uploaded to Supabase Storage',
      methods: {
        POST: {
          description: 'Process a document previously uploaded via /api/admin/documents/upload-url',
          accepts: 'application/json',
          fields: {
            storagePath: 'Path returned by /api/admin/documents/upload-url',
            fileName: 'Original file name',
            normaId: 'Norm identifier the document belongs to',
            documentType: 'lei | resolucao | portaria | manual',
          },
          maxFileSize: '50MB (enforced by the documentos-pendentes Storage bucket)',
        },
      },
    },
    { status: 200 }
  );
}
