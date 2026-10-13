import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databaseAdminConfigured } from '@/lib/db/client';
import { listarDocumentosApostila } from '@/lib/apostila/repositorio';
import { gerarApostilaDocumento } from './handler';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!databaseAdminConfigured) {
    return NextResponse.json({ documentos: [], bancoConfigurado: false });
  }
  const consulta = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 200);
  try {
    const documentos = await listarDocumentosApostila(consulta, 30);
    return NextResponse.json({ documentos, bancoConfigurado: true });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    if (/search_documentos_apostila|paginas_documentos_apostila|migra[cç][aã]o 014/i.test(mensagem)) {
      return NextResponse.json({
        error: 'migration_pending',
        message: 'O catálogo de apostilas ainda não está configurado: aplique a migração 014 no Supabase.',
      }, { status: 503 });
    }
    console.error('Falha ao listar documentos para apostila:', error);
    return NextResponse.json({ error: 'catalog_error', message: 'Não foi possível carregar os documentos.' }, { status: 500 });
  }
}

const SelecaoSchema = z.discriminatedUnion('modo', [
  z.object({ modo: z.literal('inteiro') }),
  z.object({
    modo: z.literal('paginas'),
    intervalos: z.string().trim().min(1).max(200),
  }),
]);

const PedidoSchema = z.object({
  documentoId: z.string().uuid(),
  selecao: SelecaoSchema,
  publico: z.enum(['agente', 'leigo']).default('agente'),
  titulo: z.string().trim().min(1).max(120).optional(),
});

const ERROS = {
  rate_limit_exceeded: ['Limite de consultas por hora atingido. Tente novamente mais tarde.', 429],
  ip_blocked: ['Acesso bloqueado. Fale com o administrador.', 403],
  not_found: ['Documento não encontrado, sem conteúdo ou indisponível para apostila.', 404],
  pagina_indisponivel: ['Este documento precisa ser reindexado para permitir seleção por páginas.', 409],
  paginas_sem_texto: ['Uma ou mais páginas escolhidas não possuem texto indexado.', 400],
  conteudo_excessivo: ['O conteúdo é muito extenso. Escolha uma faixa menor de páginas.', 413],
  selecao_invalida: ['Informe páginas válidas, como 3, 10–18.', 400],
} as const;

export async function POST(request: NextRequest) {
  if (!databaseAdminConfigured) {
    return NextResponse.json({ error: 'database_not_configured', message: 'Banco documental não configurado.' }, { status: 503 });
  }
  const parsed = PedidoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', message: 'Revise o documento, o modo e as páginas escolhidas.' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const resultado = await gerarApostilaDocumento(parsed.data, ip);
  if ('erro' in resultado) {
    const [padrao, status] = ERROS[resultado.erro];
    return NextResponse.json({ error: resultado.erro, message: resultado.mensagem || padrao }, { status });
  }

  if (!resultado.documento) {
    return NextResponse.json({ error: 'not_found', message: ERROS.not_found[0] }, { status: 404 });
  }
  const { hashConteudo: _hashConteudo, ...documento } = resultado.documento;
  return NextResponse.json({ ...resultado, documento });
}
