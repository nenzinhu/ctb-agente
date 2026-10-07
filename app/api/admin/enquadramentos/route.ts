// Admin CRUD for the `enquadramentos` (MBFT codes) table
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateSession } from '@/lib/auth/session';
import { databaseConfigured } from '@/lib/db/client';
import { deleteEnquadramento, listEnquadramentos, upsertEnquadramento } from '@/lib/db/queries';
import { invalidateResponseCache } from '@/lib/response/cache';

const SEM_BANCO = {
  error: 'database_not_configured',
  message:
    'Banco de dados não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
};

const EnquadramentoSchema = z.object({
  codigo_mbft: z.string().min(3).max(20),
  desdobramento: z.number().int().min(0).default(0),
  descricao: z.string().min(3).max(500),
  gravidade: z.enum(['leve', 'média', 'grave', 'gravíssima']),
  pontos: z.number().int().min(0).max(20),
  valor_multa: z.number().int().min(0),
  unidade: z.string().min(1).max(40),
  retem_veiculo: z.boolean().default(false),
  remove_veiculo: z.boolean().default(false),
  recolhe_documento: z.enum(['cnh', 'crlv', 'ambos']).nullable().default(null),
  amparo_legal: z.string().min(3).max(300),
  medida_administrativa: z.string().max(300).default(''),
  responsavel: z.enum(['condutor', 'proprietario', 'ambos']),
});

/**
 * GET /api/admin/enquadramentos
 * @returns Every registered enforcement code
 */
export async function GET() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  if (!databaseConfigured) {
    return NextResponse.json({ enquadramentos: [], aviso: SEM_BANCO.message }, { status: 200 });
  }

  const enquadramentos = await listEnquadramentos();
  return NextResponse.json({ enquadramentos }, { status: 200 });
}

/**
 * POST /api/admin/enquadramentos
 * Creates or updates an enforcement code (upsert by codigo_mbft).
 */
export async function POST(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  if (!databaseConfigured) {
    return NextResponse.json(SEM_BANCO, { status: 503 });
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

  const parsed = EnquadramentoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'validation_error',
        issues: parsed.error.issues.map((i) => ({
          campo: i.path.join('.'),
          mensagem: i.message,
        })),
      },
      { status: 400 }
    );
  }

  try {
    const enquadramento = await upsertEnquadramento(parsed.data);
    // Cards cached by code now cite the new description/values: drop them.
    await invalidateResponseCache();
    return NextResponse.json({ enquadramento }, { status: 200 });
  } catch (error) {
    console.error('Falha ao salvar o enquadramento:', error);
    return NextResponse.json(
      { error: 'upsert_failed', message: 'Não foi possível salvar o enquadramento no banco.' },
      { status: 503 }
    );
  }
}

/**
 * DELETE /api/admin/enquadramentos?codigo=516-91
 */
export async function DELETE(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const codigo = request.nextUrl.searchParams.get('codigo');
  if (!codigo) {
    return NextResponse.json(
      { error: 'missing_code', message: 'Informe o código a remover.' },
      { status: 400 }
    );
  }

  if (!databaseConfigured) {
    return NextResponse.json(SEM_BANCO, { status: 503 });
  }

  try {
    await deleteEnquadramento(codigo);
    await invalidateResponseCache();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Falha ao excluir o enquadramento:', error);
    return NextResponse.json(
      { error: 'delete_failed', message: 'Não foi possível remover o enquadramento do banco.' },
      { status: 503 }
    );
  }
}
