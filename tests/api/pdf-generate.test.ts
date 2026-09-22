/**
 * @jest-environment node
 */
// Route tests for POST/GET /api/pdf/generate
const renderDossie = jest.fn(async (_input: unknown) => Buffer.from('%PDF-1.4 dossie'));
const getCachedPdf = jest.fn(async (): Promise<Buffer | null> => null);
const setCachedPdf = jest.fn(async (..._args: unknown[]) => undefined);
const listEnquadramentos = jest.fn(async () => [] as unknown[]);
const searchDispositivos = jest.fn(async (_query: string, _limit: number) => [] as unknown[]);
const getProjetosDeLei = jest.fn(async (_theme: unknown) => [] as unknown[]);
const jurisprudenciaRows: unknown[] = [];

jest.mock('../../lib/pdf/generator', () => ({
  renderDossie: (input: unknown) => renderDossie(input),
}));
jest.mock('../../lib/pdf/cache', () => ({
  buildPdfCacheKey: () => 'pdf:test',
  getCorpusVersion: async () => 'd1-e1',
  getCachedPdf: () => getCachedPdf(),
  setCachedPdf: (...args: unknown[]) => setCachedPdf(...args),
}));
jest.mock('../../lib/db/queries', () => ({
  listEnquadramentos: () => listEnquadramentos(),
  searchDispositivos: (query: string, limit: number) => searchDispositivos(query, limit),
}));
jest.mock('../../lib/pdf/projetos-de-lei', () => ({
  getProjetosDeLei: (theme: unknown) => getProjetosDeLei(theme),
}));
jest.mock('../../lib/db/client', () => {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.limit = () => chain;
  chain.eq = () => chain;
  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: jurisprudenciaRows, error: null }).then(resolve);
  const client = { from: () => chain };
  return { supabase: client, supabaseAdmin: client };
});

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/pdf/generate/route';
import type { Enquadramento } from '@/lib/db/schema';

/**
 * Build a POST request with a JSON payload
 * @param body - Raw body string
 * @returns NextRequest
 */
function post(body: string): NextRequest {
  return new NextRequest('http://localhost/api/pdf/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

const ENQUADRAMENTO: Enquadramento = {
  id: '1',
  codigo_mbft: '516-91',
  desdobramento: 0,
  descricao: 'Estacionar em vaga de idoso',
  gravidade: 'gravíssima',
  pontos: 7,
  valor_multa: 29347,
  unidade: 'UIRF',
  retem_veiculo: false,
  remove_veiculo: true,
  recolhe_documento: null,
  amparo_legal: 'art. 181 XX do CTB',
  medida_administrativa: 'Remoção do veículo',
  responsavel: 'proprietario',
  criado_em: '2024-01-01T00:00:00.000Z',
};

describe('POST /api/pdf/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCachedPdf.mockResolvedValue(null);
    listEnquadramentos.mockResolvedValue([ENQUADRAMENTO]);
    searchDispositivos.mockResolvedValue([]);
    getProjetosDeLei.mockResolvedValue([]);
    jurisprudenciaRows.length = 0;
  });

  it('rejects a malformed body with 400', async () => {
    const resposta = await POST(post('{nao é json'));
    expect(resposta.status).toBe(400);
  });

  it('rejects a missing theme with 400', async () => {
    const resposta = await POST(post(JSON.stringify({})));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).error).toBe('validation_error');
  });

  it('returns 404 for an unknown theme', async () => {
    const resposta = await POST(post(JSON.stringify({ temaId: 'inexistente' })));
    expect(resposta.status).toBe(404);
    expect(renderDossie).not.toHaveBeenCalled();
  });

  it('renders and returns the PDF', async () => {
    const resposta = await POST(post(JSON.stringify({ temaId: 'estacionamento' })));

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('Content-Type')).toBe('application/pdf');
    expect(resposta.headers.get('Content-Disposition')).toContain('ctb-estacionamento.pdf');
    expect(resposta.headers.get('X-CTB-Cache')).toBe('MISS');
    expect(renderDossie).toHaveBeenCalledTimes(1);
    expect(setCachedPdf).toHaveBeenCalledTimes(1);

    const corpo = await resposta.arrayBuffer();
    expect(new TextDecoder().decode(corpo)).toContain('%PDF');
  });

  it('serves a cached dossiê without re-rendering', async () => {
    getCachedPdf.mockResolvedValue(Buffer.from('%PDF-1.4 cache'));

    const resposta = await POST(post(JSON.stringify({ temaId: 'estacionamento' })));

    expect(resposta.headers.get('X-CTB-Cache')).toBe('HIT');
    expect(renderDossie).not.toHaveBeenCalled();
    expect(setCachedPdf).not.toHaveBeenCalled();
  });

  it('passes the requested sections to the renderer', async () => {
    await POST(
      post(
        JSON.stringify({
          temaId: 'estacionamento',
          secoes: { normas: false, projetosDeLei: true },
        })
      )
    );

    const entrada = renderDossie.mock.calls[0][0] as unknown as {
      secoes: Record<string, boolean>;
      enquadramentos: unknown[];
    };
    expect(entrada.secoes.normas).toBe(false);
    expect(entrada.secoes.projetosDeLei).toBe(true);
    expect(entrada.secoes.enquadramentos).toBe(true);
    expect(entrada.enquadramentos).toHaveLength(1);
  });

  it('maps an unexpected failure to 500', async () => {
    renderDossie.mockRejectedValueOnce(new Error('renderer exploded'));

    const resposta = await POST(post(JSON.stringify({ temaId: 'estacionamento' })));
    expect(resposta.status).toBe(500);
  });
});

describe('GET /api/pdf/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCachedPdf.mockResolvedValue(null);
    listEnquadramentos.mockResolvedValue([ENQUADRAMENTO]);
  });

  it('requires a theme', async () => {
    const resposta = await GET(new NextRequest('http://localhost/api/pdf/generate'));
    expect(resposta.status).toBe(400);
  });

  it('honours the sections query parameter', async () => {
    const resposta = await GET(
      new NextRequest('http://localhost/api/pdf/generate?tema=estacionamento&secoes=normas')
    );

    expect(resposta.status).toBe(200);
    const entrada = renderDossie.mock.calls[0][0] as unknown as {
      secoes: Record<string, boolean>;
    };
    expect(entrada.secoes.normas).toBe(true);
    expect(entrada.secoes.enquadramentos).toBe(false);
  });
});
