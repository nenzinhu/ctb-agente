// GET /api/casos — one practice case from the bundled MBFT (no AI, instant)
import { NextResponse } from 'next/server';
import { todasAsFichas } from '@/lib/mbft/fichas';
import { montarCaso } from '@/lib/mbft/casos';

export const dynamic = 'force-dynamic';

export function GET() {
  const fichas = todasAsFichas();
  if (fichas.length < 4) {
    return NextResponse.json({ message: 'Fichas do MBFT indisponíveis no momento.' }, { status: 503 });
  }
  return NextResponse.json(montarCaso(fichas), { headers: { 'Cache-Control': 'no-store' } });
}
