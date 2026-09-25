// POST /api/pdf/generate — build a thematic dossiê PDF
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databaseConfigured, supabase } from '@/lib/db/client';
import { listEnquadramentos, searchDispositivos } from '@/lib/db/queries';
import type { Enquadramento, Jurisprudencia } from '@/lib/db/schema';
import type { NormaAplicavel } from '@/lib/response/response-types';
import { buildExemplo, generateChecklistAIT, generateChecklistGenerico } from '@/lib/response/card-builder';
import { buildPdfCacheKey, getCachedPdf, getCorpusVersion, setCachedPdf } from '@/lib/pdf/cache';
import { renderDossie } from '@/lib/pdf/generator';
import { getProjetosDeLei } from '@/lib/pdf/projetos-de-lei';
import {
  SECOES_LABELS,
  filterByTheme,
  getTheme,
  normalizeSecoes,
  type SecoesDossie,
} from '@/lib/pdf/themes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  temaId: z.string().min(1),
  secoes: z
    .object({
      normas: z.boolean().optional(),
      enquadramentos: z.boolean().optional(),
      procedimento: z.boolean().optional(),
      exemplos: z.boolean().optional(),
      jurisprudencia: z.boolean().optional(),
      projetosDeLei: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Extract the requested sections from a query string (GET entry point)
 * @param params - URL search params
 * @returns Sections parsed from `secoes=normas,enquadramentos`
 */
function secoesFromQuery(params: URLSearchParams): Partial<SecoesDossie> | undefined {
  const raw = params.get('secoes');
  if (!raw) return undefined;

  const pedidas = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
  const secoes: Partial<SecoesDossie> = {};
  for (const chave of Object.keys(SECOES_LABELS) as (keyof SecoesDossie)[]) {
    secoes[chave] = pedidas.has(chave);
  }
  return secoes;
}

/**
 * POST /api/pdf/generate
 * @returns application/pdf with the dossiê
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Corpo da requisição não é um JSON válido.' },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Informe o campo "temaId".' },
      { status: 400 }
    );
  }

  return gerarDossie(parsed.data.temaId, normalizeSecoes(parsed.data.secoes));
}

/**
 * GET /api/pdf/generate?tema=alcoolemia&secoes=normas,enquadramentos
 * Convenience entry point for shareable links and smoke tests.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const temaId = params.get('tema') ?? params.get('temaId');

  if (!temaId) {
    return NextResponse.json(
      {
        error: 'missing_theme',
        message: 'Informe ?tema=<id>.',
        temas: Object.keys(SECOES_LABELS),
      },
      { status: 400 }
    );
  }

  return gerarDossie(temaId, normalizeSecoes(secoesFromQuery(params)));
}

/**
 * Fetch everything the dossiê needs, render it and return the PDF
 * @param temaId - Theme identifier
 * @param secoes - Requested sections
 * @returns PDF response
 */
async function gerarDossie(temaId: string, secoes: SecoesDossie) {
  const theme = getTheme(temaId);
  if (!theme) {
    return NextResponse.json(
      { error: 'theme_not_found', message: `Tema "${temaId}" não existe.` },
      { status: 404 }
    );
  }

  try {
    const versaoBase = await getCorpusVersion();
    const cacheKey = buildPdfCacheKey(theme.id, secoes, versaoBase);

    const cached = await getCachedPdf(cacheKey);
    if (cached) {
      return pdfResponse(cached, theme.id, 'HIT');
    }

    const todosEnquadramentos = (await listEnquadramentos()) as Enquadramento[];
    const enquadramentos = filterByTheme(todosEnquadramentos, theme.id) as Enquadramento[];

    const normas = secoes.normas ? await getNormas(theme.keywords) : [];
    const jurisprudencia = secoes.jurisprudencia ? await getJurisprudencia(theme.keywords) : [];
    const projetosDeLei = secoes.projetosDeLei ? await getProjetosDeLei(theme) : [];

    const procedimento = enquadramentos.length > 0
      ? [...new Set(enquadramentos.flatMap((enq) => generateChecklistAIT(enq)))]
      : generateChecklistGenerico();

    const exemplos = enquadramentos.slice(0, 3).map((enq) => ({
      titulo: `${enq.codigo_mbft} — ${enq.descricao}`,
      texto: buildExemplo(enq),
    }));

    const pdf = await renderDossie({
      theme,
      secoes,
      normas,
      enquadramentos,
      jurisprudencia,
      projetosDeLei,
      procedimento,
      exemplos,
      versaoBase,
    });

    await setCachedPdf(cacheKey, pdf, theme.label);

    return pdfResponse(pdf, theme.id, 'MISS');
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { error: 'pdf_failed', message: 'Não foi possível gerar o dossiê.' },
      { status: 500 }
    );
  }
}

/**
 * Build the binary PDF response
 * @param pdf - PDF bytes
 * @param temaId - Theme id, used in the filename
 * @param cacheStatus - HIT or MISS, exposed for observability
 * @returns Response with PDF headers
 */
function pdfResponse(pdf: Buffer, temaId: string, cacheStatus: 'HIT' | 'MISS'): Response {
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ctb-${temaId}.pdf"`,
      'Content-Length': String(pdf.byteLength),
      'Cache-Control': 'no-store',
      'X-CTB-Cache': cacheStatus,
    },
  });
}

/**
 * Collect the norms relevant to the theme keywords
 * @param keywords - Theme keywords
 * @returns Deduplicated norms
 */
async function getNormas(keywords: string[]): Promise<NormaAplicavel[]> {
  const encontradas = new Map<string, NormaAplicavel>();

  for (const keyword of keywords.slice(0, 4)) {
    const rows = await searchDispositivos(keyword, 4);
    for (const row of rows) {
      if (!encontradas.has(row.numero_dispositivo)) {
        encontradas.set(row.numero_dispositivo, {
          numero_dispositivo: row.numero_dispositivo,
          texto: row.texto,
          norma_id: row.norma_id,
          tipo: row.tipo,
          vigente: row.data_vigencia_fim === null,
        });
      }
    }
  }

  return [...encontradas.values()].slice(0, 12);
}

/**
 * Collect jurisprudence whose theme or devices match the theme keywords
 * @param keywords - Theme keywords
 * @returns Matching decisions
 */
async function getJurisprudencia(keywords: string[]): Promise<Jurisprudencia[]> {
  if (!databaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('jurisprudencia').select('*').limit(200);
    if (error || !data) return [];

    const chaves = keywords.map((k) => k.toLowerCase());
    return (data as Jurisprudencia[])
      .filter((decisao) => {
        const alvo = `${decisao.tema ?? ''} ${decisao.ementa ?? ''} ${
          (decisao.dispositivos_relacionados ?? []).join(' ')
        }`.toLowerCase();
        return chaves.some((k) => alvo.includes(k));
      })
      .slice(0, 10);
  } catch (error) {
    console.warn('Failed to load jurisprudence for the dossiê:', error);
    return [];
  }
}
