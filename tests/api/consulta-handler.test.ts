/** @jest-environment node */
const getEnquadramentoByCodigo = jest.fn(async (_codigo: string) => null);
const searchDispositivos = jest.fn(async () => []);
const hybridSearch = jest.fn(async () => []);
const generateDetailed = jest.fn();
const registrarExemploIntencao = jest.fn(async (_entrada: unknown) => 'intencao-1');

jest.mock('../../lib/db/queries', () => ({
  getEnquadramentoByCodigo: (codigo: string) => getEnquadramentoByCodigo(codigo),
  getDispositivoByNumero: async () => null,
  findDispositivoByReferencia: async () => null,
  searchDispositivos: () => searchDispositivos(),
  porOrdem: () => 0,
}));
jest.mock('../../lib/search/hybrid', () => ({ hybridSearch: () => hybridSearch() }));
jest.mock('../../lib/response/cache', () => ({
  getCachedCard: async () => null,
  setCachedCard: async () => undefined,
}));
jest.mock('../../lib/ratelimit/limiter', () => ({
  checkRateLimit: async () => ({ allowed: true, remaining: 20 }),
  recordQuery: async () => undefined,
}));
jest.mock('../../lib/ratelimit/turnstile', () => ({
  turnstileEnabled: async () => false,
  verifyTurnstile: async () => ({ ok: true }),
}));
jest.mock('../../lib/ai/providers/chain', () => ({
  ProviderChain: jest.fn().mockImplementation(() => ({
    ativos: ['test'],
    generateDetailed,
  })),
}));
jest.mock('../../lib/search/intent-feedback-store', () => ({
  registrarExemploIntencao: (entrada: unknown) => registrarExemploIntencao(entrada),
}));

import { handleConsulta } from '@/app/api/consulta/handler';

describe('consulta com identificador legal explícito', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['51691', '5169-1', '516 91', 'código 516-91'])(
    'normaliza %s e responde pela ficha oficial local sem esperar o banco',
    async (consulta) => {
      const result = await handleConsulta(consulta, '127.0.0.1');
      expect(getEnquadramentoByCodigo).not.toHaveBeenCalled();
      expect(result.sucesso).toBe(true);
      expect(result.card.fichas_mbft?.map((ficha) => ficha.codigo)).toEqual(['516-91']);
      expect(result.intencao).toMatchObject({ dominio: 'infracao', fonte: 'regra' });
      expect(generateDetailed).not.toHaveBeenCalled();
    }
  );

  it('não troca um desdobramento inexistente por outra infração ou ficha de IA', async () => {
    const result = await handleConsulta('516-99', '127.0.0.1');
    expect(result.sucesso).toBe(false);
    expect(result.card.fichas_mbft ?? []).toEqual([]);
    expect(result.card.ficha_ia).toBeFalsy();
    expect(searchDispositivos).not.toHaveBeenCalled();
    expect(hybridSearch).not.toHaveBeenCalled();
    expect(generateDetailed).not.toHaveBeenCalled();
  });

  it('registra intenção anônima com referências, sem carregar o IP', async () => {
    await handleConsulta('placa ABC1D23 usando celular', '203.0.113.7');

    expect(registrarExemploIntencao).toHaveBeenCalledWith(expect.objectContaining({
      consulta: 'placa **** usando celular',
      classificacao: expect.objectContaining({ dominio: 'infracao' }),
      resultados: expect.arrayContaining([expect.objectContaining({ tipo: 'ficha_mbft' })]),
    }));
    expect(JSON.stringify(registrarExemploIntencao.mock.calls)).not.toContain('203.0.113.7');
  });

  it('não inventa uma ficha para artigo ausente na base', async () => {
    const result = await handleConsulta('art. 999', '127.0.0.1');
    expect(result.sucesso).toBe(false);
    expect(result.card.ficha_ia).toBeFalsy();
    expect(searchDispositivos).not.toHaveBeenCalled();
    expect(hybridSearch).not.toHaveBeenCalled();
    expect(generateDetailed).not.toHaveBeenCalled();
  });
});
