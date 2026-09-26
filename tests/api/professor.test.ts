/**
 * @jest-environment node
 */
const checkRateLimit = jest.fn();
const recordQuery = jest.fn();
jest.mock('../../lib/ratelimit/limiter', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimit(...a),
  recordQuery: (...a: unknown[]) => recordQuery(...a),
}));

const hybridSearch = jest.fn();
jest.mock('../../lib/search/hybrid', () => ({ hybridSearch: (...a: unknown[]) => hybridSearch(...a) }));

const getJurisprudencia = jest.fn();
jest.mock('../../lib/response/card-builder', () => ({ getJurisprudencia: (...a: unknown[]) => getJurisprudencia(...a) }));

const buscarProjetosDeLei = jest.fn();
jest.mock('../../lib/pdf/projetos-de-lei', () => ({ buscarProjetosDeLei: (...a: unknown[]) => buscarProjetosDeLei(...a) }));

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
import { POST } from '@/app/api/professor/route';

const perguntar = (corpo: unknown) =>
  POST(new NextRequest('http://localhost/api/professor', { method: 'POST', body: JSON.stringify(corpo) }));

describe('POST /api/professor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    provedores = ['Groq'];
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 20, blocked: false, registroId: 'r1' });
    hybridSearch.mockResolvedValue([
      { id: '1', numero_dispositivo: 'art. 252', texto: 'Art. 252. Dirigir o veículo: VI - utilizando-se de telefone celular (Redação dada pela Lei nº 13.281, de 2016)', score: 1 },
    ]);
    getJurisprudencia.mockResolvedValue([]);
    buscarProjetosDeLei.mockResolvedValue([
      { numero: 'PL 100/2026', ano: 2026, ementa: 'Altera o Código de Trânsito Brasileiro sobre celular', situacao: 'Em tramitação', link: 'https://camara/1' },
      { numero: 'PL 200/2026', ano: 2026, ementa: 'Dispõe sobre festas juninas', situacao: 'Em tramitação', link: 'https://camara/2' },
    ]);
    generateRapido.mockResolvedValue({ texto: 'É infração gravíssima [1][2]. Há o PL 100/2026 [4]. Veja [9].', provedor: 'Groq', modelo: 'llama' });
  });

  it('answers from numbered CTB, MBFT and bill sources, dropping citations that do not exist', async () => {
    const corpo = await (await perguntar({ pergunta: 'Posso usar o celular no semáforo?' })).json();

    expect(corpo.fontes.map((f: { tipo: string }) => f.tipo)).toEqual(expect.arrayContaining(['ctb', 'mbft', 'projeto']));
    expect(corpo.fontes.filter((f: { tipo: string }) => f.tipo === 'projeto')).toHaveLength(1);
    expect(corpo.resposta).not.toContain('[9]');
    expect(corpo.modelo).toBe('Groq · llama');

    const prompt = generateRapido.mock.calls[0][0] as string;
    expect(prompt).toMatch(/Professor Grão-Mestre em Trânsito/);
    expect(prompt).toMatch(/Não há jurisprudência cadastrada/);
    expect(prompt).toMatch(/Redação dada pela Lei nº 13\.281/);
    expect(prompt).toMatch(/PROJETO DE LEI EM TRAMITAÇÃO · PL 100\/2026/);
    expect(prompt).not.toMatch(/festas juninas/);
  });

  it('keeps the subject of follow-up questions and filters personal data', async () => {
    await perguntar({
      pergunta: 'E a multa? Placa ABC1D23',
      historico: [
        { papel: 'agente', texto: 'Dirigir usando celular é infração?' },
        { papel: 'professor', texto: 'Sim, é gravíssima.' },
      ],
    });
    expect(hybridSearch.mock.calls[0][0]).toMatch(/celular/);
    expect(generateRapido.mock.calls[0][0]).toMatch(/CONVERSA ATÉ AQUI/);
    expect(generateRapido.mock.calls[0][0]).not.toMatch(/ABC1D23/);
  });

  it('returns the sources with a notice when no model can answer', async () => {
    provedores = [];
    const corpo = await (await perguntar({ pergunta: 'Posso usar o celular no semáforo?' })).json();
    expect(corpo.resposta).toBeNull();
    expect(corpo.fontes.length).toBeGreaterThan(0);
    expect(corpo.aviso).toMatch(/Nenhum provedor/);
  });

  it('survives a source that fails', async () => {
    hybridSearch.mockRejectedValue(new Error('db down'));
    buscarProjetosDeLei.mockRejectedValue(new Error('camara down'));
    const resposta = await perguntar({ pergunta: 'Dirigir sem cinto dá multa?' });
    expect(resposta.status).toBe(200);
  });

  it('validates the question and applies the rate limit', async () => {
    expect((await perguntar({ pergunta: 'oi' })).status).toBe(400);
    checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, blocked: false, registroId: null });
    expect((await perguntar({ pergunta: 'Dirigir sem cinto dá multa?' })).status).toBe(429);
  });
});
