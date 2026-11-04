import { NextResponse } from 'next/server';
import { artigoDoAcervo } from '@/lib/ctb/acervo';
import { numeroArtigo } from '@/lib/ctb/artigos';
export async function GET(_request: Request, context: { params: Promise<{ numero: string }> }) {
  const { numero } = await context.params;
  if (!numeroArtigo(numero)) return NextResponse.json({ message: 'Número de artigo inválido.' }, { status: 400 });
  try {
    const artigo = artigoDoAcervo(numero);
    return artigo ? NextResponse.json({ artigo }, { headers: { 'Cache-Control': 'public, max-age=300' } }) : NextResponse.json({ message: 'Artigo não encontrado no acervo. Consulte a fonte oficial.' }, { status: 404 });
  } catch { return NextResponse.json({ message: 'Não foi possível abrir o acervo. Consulte a fonte oficial.' }, { status: 503 }); }
}
