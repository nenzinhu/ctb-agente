import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { buscarFatosPmsc, todosOsFatosPmsc } from '@/lib/fatos-pmsc/fatos';
import { combinarFatosComRag } from '@/lib/fatos-pmsc/rag';
import { filterPII } from '@/lib/query/pii-filter';
import { buscarTrechos } from '@/lib/search/trechos';

export const dynamic = 'force-dynamic';

const Schema = z.object({ consulta: z.string().trim().min(3).max(500) });
const semCache = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function POST(request: NextRequest) {
  try {
    const { consulta } = Schema.parse(await request.json());
    const filtrada = filterPII(consulta).trim();
    const catalogo = todosOsFatosPmsc();
    const locais = buscarFatosPmsc(filtrada, 3, catalogo);
    const trechos = await buscarTrechos(filtrada, 'natureza_potencial', 6).catch((error) => {
      console.warn('RAG de naturezas indisponível; usando catálogo local:', error);
      return [];
    });
    const alternativas = combinarFatosComRag(locais, trechos, catalogo).map(({ fato, origem }, indice) => ({
      ...fato,
      compatibilidade: indice === 0 && origem === 'local' ? 'mais compatível' : 'alternativa próxima',
    }));
    return NextResponse.json({ alternativas, decisaoAutomatica: false }, { headers: semCache });
  } catch (error) {
    const validacao = error instanceof ZodError;
    return NextResponse.json({
      error: validacao ? 'validation_error' : 'invalid_json',
      message: validacao ? 'Informe uma situação com 3 a 500 caracteres.' : 'Corpo da requisição inválido.',
    }, { status: 400, headers: semCache });
  }
}
