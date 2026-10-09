/**
 * @jest-environment node
 */
const buscarTrechos = jest.fn();
jest.mock('../../lib/search/trechos', () => ({ buscarTrechos: (...args: unknown[]) => buscarTrechos(...args) }));

const checkRateLimit = jest.fn();
const recordQuery = jest.fn(async () => undefined);
jest.mock('../../lib/ratelimit/limiter', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
  recordQuery: (...args: unknown[]) => recordQuery(...(args as [])),
}));

jest.mock('../../lib/ratelimit/turnstile', () => ({
  turnstileEnabled: async () => false,
  verifyTurnstile: async () => ({ ok: true, skipped: true }),
}));

const getCachedValue = jest.fn(async (_chave: string): Promise<unknown> => null);
const setCachedValue = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('../../lib/response/cache', () => ({
  getCachedValue: (chave: string) => getCachedValue(chave),
  setCachedValue: (...args: unknown[]) => setCachedValue(...args),
}));

let provedores: string[] = ['Groq'];
const buscarPops = jest.fn();
const sugerirPops = jest.fn();
jest.mock('../../lib/pop/pops', () => ({
  buscarPops: (...args: unknown[]) => buscarPops(...args),
  sugerirPops: (...args: unknown[]) => sugerirPops(...args),
}));

const generateDetailed = jest.fn();
jest.mock('../../lib/ai/providers/chain', () => ({
  ProviderChain: jest.fn().mockImplementation(() => ({
    get ativos() {
      return provedores;
    },
    generateRapido: (...args: unknown[]) => generateDetailed(...args),
  })),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/pop/consulta/route';
import { MigrationPendingError } from '@/lib/ingestion/documents';

const trecho = (n: number) => ({
  id: `t${n}`,
  documento_id: 'd1',
  titulo: 'POP 1.01',
  secao: 'SEQUÊNCIA DAS AÇÕES',
  pagina: n,
  ordem: n,
  texto: `Passo ${n} do procedimento.`,
  score: 1 / n,
});

function perguntar(pergunta: string) {
  return POST(
    new NextRequest('http://localhost/api/pop/consulta', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({ pergunta }),
    })
  );
}

describe('POST /api/pop/consulta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    provedores = ['Groq'];
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 20, blocked: false, registroId: 'r1' });
    buscarTrechos.mockResolvedValue([trecho(1), trecho(2)]);
    buscarPops.mockReturnValue([]);
    sugerirPops.mockReturnValue([{ numero: '003', titulo: 'USO DE ALGEMA' }]);
    generateDetailed.mockResolvedValue({ texto: 'Informe a central [1] e aborde [2][7].', provedor: 'Groq', modelo: 'llama' });
  });

  it('answers with the retrieved excerpts as numbered sources', async () => {
    const resposta = await perguntar('Como abordar uma pessoa?');
    expect(resposta.status).toBe(200);

    const corpo = await resposta.json();
    expect(corpo.resposta).toBe('Informe a central [1] e aborde [2].'); // [7] does not exist
    expect(corpo.modelo).toBe('Groq · llama');
    expect(corpo.fontes.map((f: { n: number; pagina: number }) => [f.n, f.pagina])).toEqual([
      [1, 1],
      [2, 2],
    ]);
    expect(setCachedValue).toHaveBeenCalled();
    // Responses based on the previous ranking must be recomputed with new sources.
    expect(getCachedValue).toHaveBeenCalledWith('pop:v8:como abordar uma pessoa?');
    expect(setCachedValue.mock.calls[0][0]).toBe('pop:v8:como abordar uma pessoa?');
  });

  it('filters personal data before searching, logging or prompting', async () => {
    await perguntar('Abordagem ao veículo ABC1234 do CPF 123.456.789-00');

    const [consulta] = buscarTrechos.mock.calls[0];
    expect(consulta).not.toMatch(/ABC1234|123\.456\.789-00/);
    const [prompt] = generateDetailed.mock.calls[0];
    expect(prompt).not.toMatch(/ABC1234|123\.456\.789-00/);
  });

  it('returns the excerpts alone when no AI provider is configured', async () => {
    provedores = [];
    const corpo = await (await perguntar('Como abordar uma pessoa?')).json();

    expect(corpo.resposta).toBeNull();
    expect(corpo.fontes).toHaveLength(2);
    expect(corpo.aviso).toMatch(/Nenhum provedor de IA/);
    expect(setCachedValue).not.toHaveBeenCalled();
  });

  it('keeps the excerpts when the AI fails', async () => {
    generateDetailed.mockRejectedValue(new Error('All providers failed'));
    const corpo = await (await perguntar('Como abordar uma pessoa?')).json();

    expect(corpo.resposta).toBeNull();
    expect(corpo.fontes).toHaveLength(2);
    expect(corpo.aviso).toMatch(/não respondeu/);
  });

  it('never asks a model for an operational answer when no official POP source was found', async () => {
    buscarTrechos.mockResolvedValue([]);
    const corpo = await (await perguntar('Pergunta sem relação')).json();

    expect(corpo.geral).toBe(false);
    expect(corpo.semResposta).toBe(true);
    expect(corpo.resposta).toBeNull();
    expect(generateDetailed).not.toHaveBeenCalled();
    expect(corpo.sugestoes).toEqual([{ numero: '003', titulo: 'USO DE ALGEMA' }]);
  });

  it('does not answer an absent explicit POP from another procedure or general AI', async () => {
    // The search backend returned POP 1.01; it cannot stand in for POP 999.
    const corpo = await (await perguntar('POP 999')).json();
    expect(corpo.semResposta).toBe(true);
    expect(corpo.geral).toBe(false);
    expect(corpo.fontes).toEqual([]);
    expect(generateDetailed).not.toHaveBeenCalled();
    expect(setCachedValue).not.toHaveBeenCalled();
  });

  it('keeps the official excerpts but does not make a second ungrounded call', async () => {
    generateDetailed
      .mockResolvedValueOnce({ texto: 'Não encontrei essa informação nos POPs indexados.', provedor: 'Groq', modelo: 'llama' });
    const corpo = await (await perguntar('Como abordar uma pessoa?')).json();

    expect(corpo.geral).toBe(false);
    expect(corpo.semResposta).toBe(true);
    expect(corpo.resposta).toBeNull();
    expect(corpo.fontes).toHaveLength(2);
    expect(generateDetailed).toHaveBeenCalledTimes(1);
  });

  it('reports "not found" and logs it as unanswered when nothing matches and the AI fails', async () => {
    buscarTrechos.mockResolvedValue([]);
    generateDetailed.mockRejectedValue(new Error('All providers failed'));
    const corpo = await (await perguntar('Pergunta sem relação')).json();

    expect(corpo.semResposta).toBe(true);
    expect(recordQuery).toHaveBeenCalledWith('10.0.0.1', 'Pergunta sem relação', expect.objectContaining({ tipo: 'pop', sucesso: false }), 'r1');
  });

  it('serves a cached answer without calling the model', async () => {
    getCachedValue.mockResolvedValueOnce({ pergunta: 'x', resposta: 'Em cache [1].', fontes: [], semResposta: false, cache_hit: false, tempo_ms: 5 });
    const corpo = await (await perguntar('Como abordar uma pessoa?')).json();

    expect(corpo.cache_hit).toBe(true);
    expect(generateDetailed).not.toHaveBeenCalled();
  });

  it('maps the rate limit to 429 and a missing migration to 503', async () => {
    checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, blocked: false, registroId: null });
    expect((await perguntar('Como abordar?')).status).toBe(429);

    buscarTrechos.mockRejectedValueOnce(new MigrationPendingError());
    expect((await perguntar('Como abordar?')).status).toBe(503);
  });

  it('rejects an empty question', async () => {
    expect((await perguntar('  ')).status).toBe(400);
  });

  it('answers from the bundled POP manual, whole sections as sources', async () => {
    const pop = {
      numero: '003',
      titulo: 'USO DE ALGEMA (TÉCNICA POLICIAL)',
      estabelecido: '23/12/2011',
      atualizado: '27/03/2018',
      execucao: 'Guarnição PM',
      material: [{ texto: '1. Algema.', nivel: 0 }],
      fundamentacao: [],
      sequencia: [{ texto: '1. Algemar com as mãos para trás.', nivel: 0 }],
      atividadesCriticas: [{ texto: '1. Resistência.', nivel: 0 }],
      errosEvitar: [{ texto: '1. Algemar pela frente.', nivel: 0 }],
      anexos: [],
      pagina: 12,
    };
    buscarPops.mockReturnValue([pop]);
    const corpo = await (await perguntar('Quando usar algemas?')).json();

    expect(buscarTrechos).not.toHaveBeenCalled();
    expect(corpo.pops).toHaveLength(1);
    expect(corpo.fontes.map((f: { secao: string }) => f.secao)).toEqual([
      'SEQUÊNCIA DAS AÇÕES',
      'ATIVIDADES CRÍTICAS',
      'ERROS A SEREM EVITADOS',
      'MATERIAL NECESSÁRIO',
    ]);
    expect(generateDetailed.mock.calls[0][0]).toContain('POP 003 — USO DE ALGEMA');
  });
});
