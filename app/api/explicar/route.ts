// POST /api/explicar — plain-language explanation of an MBFT sheet or a POP
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { explicar, type ExplicarErro } from './handler';

export const maxDuration = 60;

const PedidoSchema = z.object({
  tipo: z.enum(['ficha', 'pop']),
  id: z.string().trim().regex(/^\d{3}(?:-\d{2}|(?:\.\d+){0,3})$/),
});

const STATUS: Record<ExplicarErro, number> = {
  not_found: 404,
  no_ai: 503,
  ai_failed: 502,
  rate_limit_exceeded: 429,
  ip_blocked: 403,
};

const MENSAGEM: Record<ExplicarErro, string> = {
  not_found: 'Ficha ou POP não encontrado.',
  no_ai: 'Nenhum provedor de IA configurado para gerar a explicação.',
  ai_failed: 'A IA não respondeu agora. Tente de novo em instantes.',
  rate_limit_exceeded: 'Limite de consultas por hora atingido. Tente novamente mais tarde.',
  ip_blocked: 'Acesso bloqueado. Fale com o administrador.',
};

/**
 * @example POST /api/explicar { "tipo": "ficha", "id": "516-91" }
 */
export async function POST(request: NextRequest) {
  const parsed = PedidoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', message: 'Pedido inválido.' }, { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const resultado = await explicar(parsed.data.tipo, parsed.data.id, ip);

  if ('erro' in resultado) {
    return NextResponse.json({ error: resultado.erro, message: MENSAGEM[resultado.erro] }, { status: STATUS[resultado.erro] });
  }
  return NextResponse.json(resultado.explicacao);
}
