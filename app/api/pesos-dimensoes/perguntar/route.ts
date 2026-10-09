import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { explicarPesos } from '@/lib/pesos-dimensoes/rag';
import { filterPII } from '@/lib/query/pii-filter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const schema = z.object({ consulta: z.string().trim().min(3).max(500) });
const semCache = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'json_invalido', message: 'O corpo da requisição deve ser um JSON válido.' },
      { status: 400, headers: semCache },
    );
  }

  const validacao = schema.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json(
      { error: 'consulta_invalida', message: 'Escreva uma pergunta de 3 a 500 caracteres.' },
      { status: 400, headers: semCache },
    );
  }

  const consulta = filterPII(validacao.data.consulta).trim();
  if (consulta.length < 3) {
    return NextResponse.json(
      { error: 'consulta_invalida', message: 'Após remover dados pessoais, a pergunta precisa ter de 3 a 500 caracteres.' },
      { status: 400, headers: semCache },
    );
  }

  return NextResponse.json(await explicarPesos(consulta), { headers: semCache });
}
