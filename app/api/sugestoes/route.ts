import { NextRequest, NextResponse } from 'next/server';
import { sugerirBusca, type FonteSugestao } from '@/lib/search/sugestoes';

export const dynamic = 'force-dynamic';

/** Lightweight typeahead over the bundled official MBFT and POP manuals. */
export async function GET(request: NextRequest) {
  const consulta = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const fonte = request.nextUrl.searchParams.get('fonte') === 'pop' ? 'pop' : 'ctb';
  if (consulta.length < 3) return NextResponse.json({ sugestoes: [] });

  return NextResponse.json({ sugestoes: sugerirBusca(consulta.slice(0, 200), fonte as FonteSugestao) });
}
