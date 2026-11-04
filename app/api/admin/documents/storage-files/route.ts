import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { databaseConfigured, supabaseAdmin } from '@/lib/db/client';
import { DOCUMENTS_BUCKET } from '@/lib/ingestion/storage';
import { formatoDoArquivo } from '@/lib/ingestion/formats';

export async function GET(request: NextRequest) {
  if (!(await validateSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!databaseConfigured) return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 503 });
  const prefix = request.nextUrl.searchParams.get('prefix') ?? '';
  if (prefix.length > 1000 || /[\\\u0000-\u001f]/.test(prefix) || (prefix && prefix.split('/').some(part => !part || part === '.' || part === '..'))) {
    return NextResponse.json({ error: 'Informe um caminho de pasta válido.' }, { status: 400 });
  }
  try {
    const { data, error } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error) return NextResponse.json({ error: 'Não foi possível listar o bucket documentos-pendentes. Confira a configuração do Storage.' }, { status: 502 });
    return NextResponse.json({
      bucket: DOCUMENTS_BUCKET, prefix, hasMore: (data?.length ?? 0) === 1000,
      entries: (data ?? []).map(item => ({
        name: item.name,
        path: prefix ? `${prefix}/${item.name}` : item.name,
        folder: !item.id && !item.metadata,
        supported: Boolean(formatoDoArquivo(item.name)),
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'O Storage está indisponível. Tente novamente.' }, { status: 502 });
  }
}
