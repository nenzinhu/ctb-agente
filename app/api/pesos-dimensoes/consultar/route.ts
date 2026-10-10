import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { calcularLimite } from '@/lib/pesos-dimensoes/calculadora';
import { obterConfiguracao } from '@/lib/pesos-dimensoes/catalogo';
import { avaliarFiscalizacao } from '@/lib/pesos-dimensoes/fiscalizacao';

export const dynamic = 'force-dynamic';

const numeroKg = z.number().finite().nonnegative();
const numeroPositivo = z.number().finite().positive();
const grupoEixoSchema = z.object({
  id: z.string().trim().min(1).max(80),
  nome: z.string().trim().min(1).max(120),
  pesoKg: numeroKg,
  limiteLegalKg: numeroPositivo,
  limiteTecnicoKg: numeroPositivo.optional(),
});

const schema = z.object({
  configuracaoId: z.string().trim().min(1).max(100),
  limite: z.object({
    taraKg: numeroKg.optional(),
    comprimentoM: numeroPositivo.optional(),
    pbtTecnicoKg: numeroKg.optional(),
    cmtKg: numeroKg.optional(),
    limiteSinalizadoKg: numeroKg.optional(),
    limiteAetKg: numeroKg.optional(),
  }),
  fiscalizacao: z.object({
    modo: z.enum(['documento', 'balanca']),
    tipoPesoDocumento: z.enum(['carga', 'peso-bruto-total']).optional(),
    pesoCargaDocumentoKg: numeroKg.optional(),
    pesoBrutoTotalDocumentoKg: numeroKg.optional(),
    pesoTotalAferidoKg: numeroKg.optional(),
    gruposEixo: z.array(grupoEixoSchema).max(12).optional(),
    quantidadeEmbarcadores: z.number().int().nonnegative().max(1000).optional(),
  }),
});

const semCache = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'json_invalido', message: 'O corpo da requisição deve ser um JSON válido.' },
      { status: 400, headers: semCache },
    );
  }

  const validacao = schema.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json({
      error: 'dados_invalidos',
      message: 'Informe os pesos como números em quilogramas, sem ponto de milhar ou vírgula decimal, e não use valores negativos.',
    }, { status: 400, headers: semCache });
  }

  const configuracao = obterConfiguracao(validacao.data.configuracaoId);
  if (!configuracao) {
    return NextResponse.json(
      { error: 'configuracao_nao_encontrada', message: 'A configuração de veículo informada não existe no catálogo.' },
      { status: 404, headers: semCache },
    );
  }

  const limite = calcularLimite({ configuracao, ...validacao.data.limite });
  const fiscalizacao = avaliarFiscalizacao({
    limite,
    ...validacao.data.fiscalizacao,
    taraKg: validacao.data.limite.taraKg,
    cmtKg: validacao.data.limite.cmtKg,
  });

  return NextResponse.json({ configuracao, limite, fiscalizacao }, { headers: semCache });
}
