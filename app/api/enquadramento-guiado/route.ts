import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { avaliarEnquadramento } from '@/lib/mbft/enquadramento-guiado';
import { filterPII } from '@/lib/query/pii-filter';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  descricao: z.string().trim().min(3).max(1000),
  respostas: z.record(z.string(), z.enum(['sim', 'nao', 'nao_informado'])).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = Schema.parse(await request.json());
    const descricao = filterPII(body.descricao).trim();
    const resultado = avaliarEnquadramento({ descricao, respostas: body.respostas });
    return NextResponse.json(resultado, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    const validacao = error instanceof ZodError;
    return NextResponse.json({
      error: validacao ? 'validation_error' : 'invalid_json',
      message: validacao
        ? 'Descreva a situação com 3 a 1000 caracteres.'
        : 'Corpo da requisição não é um JSON válido.',
    }, { status: 400, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  }
}
