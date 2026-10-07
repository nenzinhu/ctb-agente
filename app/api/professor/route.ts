// POST /api/professor — one turn of the conversation with the traffic professor
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { perguntarAoProfessor } from './handler';

export const maxDuration = 60;

const PedidoSchema = z.object({
  pergunta: z.string().trim().min(3).max(800),
  modo: z.enum(['auto', 'ctb', 'infracao', 'pop', 'simulador']).default('auto'),
  historico: z
    .array(z.object({ papel: z.enum(['agente', 'professor']), texto: z.string().max(4000) }))
    .max(12)
    .default([]),
});

const ERROS = {
  rate_limit_exceeded: ['Limite de consultas por hora atingido. Tente novamente mais tarde.', 429],
  ip_blocked: ['Acesso bloqueado. Fale com o administrador.', 403],
} as const;

/**
 * @example POST /api/professor { "pergunta": "Posso usar o celular no semáforo?", "historico": [] }
 */
export async function POST(request: NextRequest) {
  const parsed = PedidoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Pergunta inválida: escreva entre 3 e 800 caracteres.' },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const resultado = await perguntarAoProfessor(parsed.data.pergunta, parsed.data.historico, ip, parsed.data.modo);

  if ('erro' in resultado) {
    const [message, status] = ERROS[resultado.erro];
    return NextResponse.json({ error: resultado.erro, message }, { status });
  }
  return NextResponse.json(resultado.resposta);
}
