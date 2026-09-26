// POST /api/pop/consulta — questions about the POP-PMSC base (RAG)
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { responderPop, type PopErro } from './handler';

export const maxDuration = 60;

const PerguntaSchema = z.object({
  pergunta: z.string().trim().min(3).max(500),
  turnstileToken: z.string().optional(),
  /** false: only the excerpts, no AI answer (faster). */
  ia: z.boolean().optional(),
});

const STATUS: Record<PopErro, number> = {
  rate_limit_exceeded: 429,
  ip_blocked: 403,
  turnstile_failed: 403,
  migration_pending: 503,
  internal_error: 500,
};

const MENSAGEM: Record<PopErro, string> = {
  rate_limit_exceeded: 'Limite de consultas por hora atingido. Tente novamente mais tarde.',
  ip_blocked: 'Acesso bloqueado. Fale com o administrador.',
  turnstile_failed: 'Falha na verificação anti-bot. Recarregue a página e tente novamente.',
  migration_pending: 'A base de POPs ainda não está disponível.',
  internal_error: 'Erro interno ao consultar os POPs.',
};

/**
 * @example POST /api/pop/consulta { "pergunta": "Quando usar algemas na abordagem?", "ia": true }
 * @returns RespostaPop — answer organized by AI (when asked for and available) and the cited excerpts
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Corpo da requisição não é um JSON válido.' },
      { status: 400 }
    );
  }

  const parsed = PerguntaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Pergunta inválida: escreva entre 3 e 500 caracteres.' },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  const resultado = await responderPop(parsed.data.pergunta, ip, parsed.data.turnstileToken, {
    ia: parsed.data.ia ?? true,
  });
  if (resultado.erro) {
    return NextResponse.json(
      { error: resultado.erro, message: resultado.mensagem ?? MENSAGEM[resultado.erro] },
      { status: STATUS[resultado.erro] }
    );
  }
  return NextResponse.json(resultado.resposta, { status: 200 });
}
