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

const getCachedValue = jest.fn(async (): Promise<unknown> => null);
const setCachedValue = jest.fn(async () => undefined);
jest.mock('../../lib/response/cache', () => ({
  getCachedValue: () => getCachedValue(),
  setCachedValue: (...args: unknown[]) => setCachedValue(...(args as [])),
}));

let provedores: string[] = ['Groq'];
const generateDetailed = jest.fn();
jest.mock('../../lib/ai/providers/chain', () => ({
  ProviderChain: jest.fn().mockImplementation(() => ({
    get ativos() {
      return provedores;
    },
    generateDetailed: (...args: unknown[]) => generateDetailed(...args),
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

function perguntar(pergunta: string, extras: Record<string, unknown> = {}) {
  return POST(
    new NextRequest('http://localhost/api/pop/consulta', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({ pergunta, ...extras }),
    })
  );
}

describe('POST /api/pop/consulta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    provedores = ['Groq'];
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 20, blocked: false, registroId: 'r1' });
    buscarTrechos.mockResolvedValue([trecho(1), trecho(2)]);
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
  });

  it('filters personal data before searching, logging or prompting', async () => {
    await perguntar('Abordagem ao veículo ABC1234 do CPF 123.456.789-00');

    const [consulta] = buscarTrechos.mock.calls[0];
    expect(consulta).not.toMatch(/ABC1234|123\.456\.789-00/);
    const [prompt] = generateDetailed.mock.calls[0];
    expect(prompt).not.toMatch(/ABC1234|123\.456\.789-00/);
  });

  it('skips the AI and the cache when the agent turns the AI off', async () => {
    const corpo = await (await perguntar('Como abordar uma pessoa?', { ia: false })).json();

    expect(generateDetailed).not.toHaveBeenCalled();
    expect(getCachedValue).not.toHaveBeenCalled();
    expect(setCachedValue).not.toHaveBeenCalled();
    expect(corpo.resposta).toBeNull();
    expect(corpo.aviso).toBeUndefined();
    expect(corpo.semResposta).toBe(false);
    expect(corpo.fontes).toHaveLength(2);
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

  it('reports "not found" and logs it as unanswered when nothing matches', async () => {
    buscarTrechos.mockResolvedValue([]);
    const corpo = await (await perguntar('Pergunta sem relação')).json();

    expect(corpo.semResposta).toBe(true);
    expect(generateDetailed).not.toHaveBeenCalled();
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
});
