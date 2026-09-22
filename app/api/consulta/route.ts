// POST /api/consulta endpoint
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ConsultaRequestSchema } from './types';
import { handleConsulta, type ConsultaError } from './handler';

const STATUS_POR_ERRO: Record<ConsultaError, number> = {
  rate_limit_exceeded: 429,
  ip_blocked: 403,
  turnstile_failed: 403,
  internal_error: 500,
};

const MENSAGEM_POR_ERRO: Record<ConsultaError, string> = {
  rate_limit_exceeded:
    'Limite de consultas por hora atingido. Tente novamente mais tarde.',
  ip_blocked: 'Acesso bloqueado. Fale com o administrador.',
  turnstile_failed: 'Falha na verificação anti-bot. Recarregue a página e tente novamente.',
  internal_error: 'Erro interno ao processar a consulta.',
};

/**
 * POST /api/consulta
 * Main consultation endpoint
 * Accepts query and returns structured response card
 * @example
 * POST /api/consulta
 * { "consulta": "516-91" }
 * @returns { card, sucesso, tempo_ms, cache_hit }
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

  let consulta: string;
  let turnstileToken: string | undefined;

  try {
    const parsed = ConsultaRequestSchema.parse(body);
    consulta = parsed.consulta;
    turnstileToken = parsed.turnstileToken;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'Consulta inválida: informe entre 3 e 1000 caracteres.',
          issues: error.issues.map((issue) => ({
            campo: issue.path.join('.') || 'consulta',
            mensagem: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'validation_error', message: 'Requisição inválida.' },
      { status: 400 }
    );
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const result = await handleConsulta(consulta, ipAddress, turnstileToken);

  if (result.error) {
    return NextResponse.json(
      {
        error: result.error,
        message: MENSAGEM_POR_ERRO[result.error],
        card: result.card,
        sucesso: false,
        tempo_ms: result.tempo_ms,
      },
      { status: STATUS_POR_ERRO[result.error] }
    );
  }

  return NextResponse.json(result, { status: 200 });
}
