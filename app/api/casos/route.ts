// GET /api/casos?tema= — official MBFT field cases for a situation. First the
// exact conducts from the verified slang map; then look-alikes found by the
// consultation search, flagged so the agent checks their criteria. No AI.
import { NextResponse, type NextRequest } from 'next/server';
import { buscarFichas, fichaPorCodigo } from '@/lib/mbft/fichas';
import { casoDaFicha } from '@/lib/mbft/casos';
import type { FichaMbft } from '@/lib/mbft/parser';
import { filterPII } from '@/lib/query/pii-filter';
import { condutasCirurgicas } from '@/lib/search/intencoes';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const tema = filterPII((request.nextUrl.searchParams.get('tema') ?? '').trim().slice(0, 200));
  if (tema.length < 2) {
    return NextResponse.json({ message: 'Descreva a situação, a gíria, o código ou o artigo.' }, { status: 400 });
  }

  const mapeadas = condutasCirurgicas(tema)
    .map(fichaPorCodigo)
    .filter((f): f is FichaMbft => f !== null);
  const encontradas = buscarFichas(tema, 6);
  const principais = mapeadas.length ? mapeadas : encontradas;
  const relacionadas = mapeadas.length
    ? encontradas.filter((f) => !mapeadas.some((m) => m.codigo === f.codigo)).slice(0, 4)
    : [];

  if (principais.length === 0) {
    return NextResponse.json(
      { message: `Nenhuma ficha do MBFT para “${tema}”. Tente outras palavras ou o código da infração.` },
      { status: 404 }
    );
  }
  return NextResponse.json({
    tema,
    principais: principais.map(casoDaFicha),
    relacionadas: relacionadas.map(casoDaFicha),
  });
}
