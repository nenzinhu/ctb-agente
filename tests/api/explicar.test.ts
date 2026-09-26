/**
 * @jest-environment node
 */
const checkRateLimit = jest.fn();
const recordQuery = jest.fn();
jest.mock('../../lib/ratelimit/limiter', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimit(...a),
  recordQuery: (...a: unknown[]) => recordQuery(...a),
}));

const getCachedValue = jest.fn();
const setCachedValue = jest.fn();
jest.mock('../../lib/response/cache', () => ({
  getCachedValue: (...a: unknown[]) => getCachedValue(...a),
  setCachedValue: (...a: unknown[]) => setCachedValue(...a),
}));

let provedores = ['Groq'];
const generateRapido = jest.fn();
jest.mock('../../lib/ai/providers/chain', () => ({
  ProviderChain: jest.fn().mockImplementation(() => ({
    get ativos() {
      return provedores;
    },
    generateRapido: (...a: unknown[]) => generateRapido(...a),
  })),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/explicar/route';

const pedir = (corpo: unknown) =>
  POST(new NextRequest('http://localhost/api/explicar', { method: 'POST', body: JSON.stringify(corpo) }));

describe('POST /api/explicar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    provedores = ['Groq'];
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 20, blocked: false, registroId: 'r1' });
    getCachedValue.mockResolvedValue(null);
    generateRapido.mockResolvedValue({ texto: '**O que é** — dirigir depois de beber.', provedor: 'Groq', modelo: 'llama' });
  });

  it('explains an MBFT sheet from its official text and caches it', async () => {
    const resposta = await pedir({ tipo: 'ficha', id: '516-91' });
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.texto).toMatch(/O que é/);
    expect(generateRapido.mock.calls[0][0]).toMatch(/Exemplos do dia a dia/);
    expect(generateRapido.mock.calls[0][0]).toMatch(/516-91/);
    expect(setCachedValue).toHaveBeenCalledWith('explicar:ficha:516-91', expect.any(Object), expect.any(Object));
  });

  it('explains a POP from the manual', async () => {
    await pedir({ tipo: 'pop', id: '003' });
    expect(generateRapido.mock.calls[0][0]).toMatch(/POP 003 — USO DE ALGEMA/);
  });

  it('serves the cached explanation without calling the model', async () => {
    getCachedValue.mockResolvedValue({ texto: 'em cache', modelo: 'x', cache_hit: false });
    const corpo = await (await pedir({ tipo: 'ficha', id: '516-91' })).json();

    expect(corpo).toMatchObject({ texto: 'em cache', cache_hit: true });
    expect(generateRapido).not.toHaveBeenCalled();
  });

  it('rejects unknown ids and invalid requests', async () => {
    expect((await pedir({ tipo: 'ficha', id: '999-99' })).status).toBe(404);
    expect((await pedir({ tipo: 'ficha', id: 'texto livre qualquer' })).status).toBe(400);
  });

  it('says so when there is no AI or it fails', async () => {
    generateRapido.mockRejectedValueOnce(new Error('All providers failed'));
    expect((await pedir({ tipo: 'ficha', id: '516-91' })).status).toBe(502);
    provedores = [];
    expect((await pedir({ tipo: 'ficha', id: '516-91' })).status).toBe(503);
  });
});
