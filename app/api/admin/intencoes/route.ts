import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateSession } from '@/lib/auth/session';
import {
  corrigirExemploIntencao,
  listarExemplosIntencao,
} from '@/lib/search/intent-feedback-repository';

const DominioSchema = z.enum(['ctb', 'infracao', 'pop', 'fato_pmsc']);
const ResultadoSchema = z.object({
  tipo: z.enum(['artigo_ctb', 'ficha_mbft', 'pop', 'fato_pmsc', 'nenhum']),
  id: z.string().trim().min(1).max(160),
});
const CorrecaoSchema = z.object({
  id: z.string().uuid().or(z.string().trim().min(1).max(120)),
  dominioEsperado: DominioSchema,
  resultadosEsperados: z.array(ResultadoSchema).max(20).default([]),
  notaCorrecao: z.string().trim().max(1000).optional(),
});

export async function GET() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  try {
    return NextResponse.json({ exemplos: await listarExemplosIntencao() });
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar as intenções.' }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }
  const parsed = CorrecaoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Correção de intenção inválida.' }, { status: 400 });
  }
  try {
    const exemplo = await corrigirExemploIntencao(parsed.data.id, {
      dominioEsperado: parsed.data.dominioEsperado,
      resultadosEsperados: parsed.data.resultadosEsperados,
      notaCorrecao: parsed.data.notaCorrecao,
    });
    return NextResponse.json({ exemplo });
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar a correção.' }, { status: 503 });
  }
}
