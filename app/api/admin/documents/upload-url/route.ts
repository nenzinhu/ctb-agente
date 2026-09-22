// Mints a short-lived Supabase Storage signed upload URL for the admin panel.
// The browser uploads the file bytes directly to Supabase, never through this
// Vercel function — Vercel Serverless Functions hard-reject request bodies
// over 4.5MB, well under the documents this app needs to ingest.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateSession } from '@/lib/auth/session';
import { databaseConfigured, supabaseAdmin } from '@/lib/db/client';
import { DOCUMENTS_BUCKET } from '@/lib/ingestion/storage';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const RequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
});

/**
 * Strip everything but the characters Supabase Storage paths accept.
 * @param name - Original file name
 * @returns A path-safe file name, capped to keep the full path short
 */
function sanitizeFileName(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe.slice(-150) || 'documento';
}

/**
 * POST /api/admin/documents/upload-url
 * Body: { fileName, contentType } → { bucket, path, token }
 */
export async function POST(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!databaseConfigured) {
    return NextResponse.json(
      {
        error: 'database_not_configured',
        message:
          'Banco de dados não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      },
      { status: 503 }
    );
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

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'validation_error',
        issues: parsed.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
      },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(parsed.data.contentType)) {
    return NextResponse.json(
      {
        error: 'invalid_type',
        message: `Tipo não aceito: ${parsed.data.contentType}. Aceitos: PDF, DOCX, TXT.`,
      },
      { status: 400 }
    );
  }

  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFileName(parsed.data.fileName)}`;

  const { data, error } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('Failed to create signed upload URL:', error);
    return NextResponse.json(
      { error: 'signed_url_failed', message: 'Não foi possível preparar o envio.' },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { bucket: DOCUMENTS_BUCKET, path: data.path, token: data.token },
    { status: 200 }
  );
}
