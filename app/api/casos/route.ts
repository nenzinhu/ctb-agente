// GET /api/casos[?tema=] — one practice case from the bundled MBFT (no AI,
// instant). With a topic (slang, code or article), the right answer comes
// from the sheets the consultation search finds for it.
import { NextResponse, type NextRequest } from 'next/server';
import { buscarFichas, todasAsFichas } from '@/lib/mbft/fichas';
import { montarCaso, temCena } from '@/lib/mbft/casos';
import { filterPII } from '@/lib/query/pii-filter';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const fichas = todasAsFichas();
  if (fichas.length < 4) {
    return NextResponse.json({ message: 'Fichas do MBFT indisponíveis no momento.' }, { status: 503 });
  }

  const tema = (request.nextUrl.searchParams.get('tema') ?? '').trim().slice(0, 120);
  let alvos = fichas;
  if (tema) {
    alvos = buscarFichas(filterPII(tema), 30).filter(temCena);
    if (alvos.length === 0) {
      return NextResponse.json({ message: `Nenhum caso para “${tema}”. Tente outra palavra.` }, { status: 404 });
    }
  }
  return NextResponse.json(montarCaso(fichas, Math.random, alvos), { headers: { 'Cache-Control': 'no-store' } });
}
