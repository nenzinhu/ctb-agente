import { NextResponse } from 'next/server';
import { buscarPopPorNumero } from '@/lib/pop/pops';

export async function GET(
  _request: Request,
  contexto: { params: Promise<{ numero: string }> }
) {
  const { numero: parametro } = await contexto.params;
  const numero = decodeURIComponent(parametro).trim();
  const pop = buscarPopPorNumero(numero);

  if (!pop) {
    return NextResponse.json(
      { error: 'pop_not_found', message: 'POP não encontrado no catálogo oficial.' },
      { status: 404 }
    );
  }

  return NextResponse.json(pop, { status: 200 });
}
