// GET  /api/apostila?fonte=mbft&tema=estacionamento — official items to pick
// POST /api/apostila { fonte, ids, publico } — the handout, one AI chapter per item
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { gerarApostila, sugerirItens } from './handler';

export const maxDuration = 60;

const Fonte = z.enum(['mbft', 'pop']);

export async function GET(request: NextRequest) {
  const fonte = Fonte.safeParse(request.nextUrl.searchParams.get('fonte'));
  const tema = (request.nextUrl.searchParams.get('tema') ?? '').trim().slice(0, 200);
  if (!fonte.success || tema.length < 2) {
    return NextResponse.json({ error: 'validation_error', message: 'Informe a fonte e um tema.' }, { status: 400 });
  }
  return NextResponse.json({ itens: sugerirItens(fonte.data, tema) });
}

const PedidoSchema = z.object({
  fonte: Fonte,
  ids: z
    .array(z.string().regex(/^\d{3}(?:-\d{2}|(?:\.\d+){0,3})$/))
    .min(1)
    .max(6),
  publico: z.enum(['agente', 'leigo']).default('agente'),
});

const MENSAGEM = {
  rate_limit_exceeded: ['Limite de consultas por hora atingido. Tente novamente mais tarde.', 429],
  ip_blocked: ['Acesso bloqueado. Fale com o administrador.', 403],
  not_found: ['Nenhum dos itens escolhidos foi encontrado.', 404],
} as const;

export async function POST(request: NextRequest) {
  const parsed = PedidoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Escolha de 1 a 6 itens para a apostila.' },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const resultado = await gerarApostila(parsed.data.fonte, [...new Set(parsed.data.ids)], parsed.data.publico, ip);

  if ('erro' in resultado) {
    const [message, status] = MENSAGEM[resultado.erro];
    return NextResponse.json({ error: resultado.erro, message }, { status });
  }
  return NextResponse.json(resultado);
}
