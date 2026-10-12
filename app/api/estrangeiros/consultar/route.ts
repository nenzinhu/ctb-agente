import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FONTES_ESTRANGEIROS, buscarTrechosEstrangeiros } from '@/lib/estrangeiros/acervo';
import { interpretarConsultaEstrangeiros } from '@/lib/estrangeiros/consulta';
import { avaliarEstrangeiro } from '@/lib/estrangeiros/motor';
import type { FatosEstrangeiros, TrechoFonteEstrangeiros } from '@/lib/estrangeiros/types';
import { buscarTrechos } from '@/lib/search/trechos';

const FatosSchema = z.object({
  paisHabilitacao: z.string().max(40).optional(),
  paisPlaca: z.string().max(40).optional(),
  visitanteOuResidente: z.enum(['visitante', 'residente']).optional(),
  dataEntrada: z.string().max(10).optional(),
  habilitacao: z.enum(['valida', 'vencida', 'nao_apresentada']).optional(),
  pidApresentada: z.boolean().optional(),
  identidadeApresentada: z.boolean().optional(),
  categoriaCompativel: z.boolean().optional(),
  registroVeiculo: z.enum(['brasileiro', 'estrangeiro']).optional(),
  finalidade: z.enum(['particular', 'carga', 'passageiros']).optional(),
  seguroApresentado: z.boolean().optional(),
  admissaoTemporariaApresentada: z.boolean().optional(),
}).strict();

const ConsultaSchema = z.object({
  pergunta: z.string().trim().min(2).max(500),
  fatos: FatosSchema.optional(),
}).strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const parsed = ConsultaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Informe uma consulta entre 2 e 500 caracteres.' }, { status: 400 });
  }

  const fatos: FatosEstrangeiros = {
    ...parsed.data.fatos,
    ...interpretarConsultaEstrangeiros(parsed.data.pergunta),
  };
  const resultado = avaliarEstrangeiro(fatos);
  const locais = buscarTrechosEstrangeiros(parsed.data.pergunta);
  const banco = await buscarTrechos(parsed.data.pergunta, 'estrangeiros', 4).catch((error) => {
    console.warn('RAG de estrangeiros no Supabase indisponível; usando acervo local.', error);
    return [];
  });
  const remotos: TrechoFonteEstrangeiros[] = banco.map((trecho) => {
    const fonte = FONTES_ESTRANGEIROS.find((item) => trecho.titulo.toLowerCase().includes(item.titulo.toLowerCase()));
    return {
      id: trecho.id,
      fonteId: fonte?.id ?? trecho.documento_id,
      titulo: trecho.titulo,
      referencia: trecho.secao || 'Trecho indexado',
      texto: trecho.texto,
      pagina: trecho.pagina ?? undefined,
      arquivo: fonte?.arquivo ?? '',
      urlOficial: fonte?.urlOficial ?? '',
      score: trecho.score,
    };
  });
  const ids = new Set(locais.map((trecho) => trecho.id));
  const trechos = [...locais, ...remotos.filter((trecho) => !ids.has(trecho.id))].slice(0, 6);

  return NextResponse.json({ ...resultado, trechos });
}
