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

const buscarFichas = jest.fn();
jest.mock('../../lib/mbft/fichas', () => ({ buscarFichas: (...a: unknown[]) => buscarFichas(...a) }));

const buscarPops = jest.fn();
jest.mock('../../lib/pop/pops', () => ({ buscarPops: (...a: unknown[]) => buscarPops(...a) }));

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

const fichaCelular = {
  codigo: '763-31', tipificacaoResumida: 'Dirigir segurando telefone celular',
  amparoLegal: 'Art. 252, VI', gravidade: 'gravíssima', pontuacao: '7', penalidade: 'multa',
  medidaAdministrativa: 'não', infrator: 'condutor', configuraCrime: 'não',
  tipificacao: 'Dirigir veículo segurando telefone celular', quandoAutuar: ['Condutor segurando celular.'],
  quandoNaoAutuar: ['Veículo estacionado.'],
};

describe('POST /api/professor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    provedores = ['Groq'];
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 20, blocked: false, registroId: 'r1' });
    buscarFichas.mockReturnValue([fichaCelular]);
    buscarPops.mockReturnValue([]);
    hybridSearch.mockResolvedValue([
      { id: '1', numero_dispositivo: 'art. 252', texto: 'Art. 252. Dirigir o veículo: VI - utilizando-se de telefone celular (Redação dada pela Lei nº 13.281, de 2016)', score: 1 },
    ]);
    getJurisprudencia.mockResolvedValue([]);
    buscarProjetosDeLei.mockResolvedValue([
      { numero: 'PL 100/2026', ano: 2026, ementa: 'Altera o Código de Trânsito Brasileiro sobre celular', situacao: 'Em tramitação', link: 'https://camara/1' },
      { numero: 'PL 200/2026', ano: 2026, ementa: 'Dispõe sobre festas juninas', situacao: 'Em tramitação', link: 'https://camara/2' },
    ]);
    generateRapido.mockResolvedValue({ texto: 'É infração gravíssima [1]. Há o PL 100/2026 [2]. Veja [9].', provedor: 'Groq', modelo: 'llama' });
  });

  it('answers from local MBFT and requested bill sources, dropping citations that do not exist', async () => {
    const corpo = await (await perguntar({ pergunta: 'Posso usar o celular no semáforo? Existe projeto de lei para mudar isso?' })).json();

    expect(corpo.fontes.map((f: { tipo: string }) => f.tipo)).toEqual(expect.arrayContaining(['mbft', 'projeto']));
    expect(corpo.fontes.filter((f: { tipo: string }) => f.tipo === 'projeto')).toHaveLength(1);
    expect(corpo.resposta).not.toContain('[9]');
    expect(corpo.modelo).toBe('Groq · llama');

    const prompt = generateRapido.mock.calls[0][0] as string;
    expect(prompt).toMatch(/Professor Grão-Mestre em Trânsito/);
    expect(prompt).toMatch(/PROJETO DE LEI EM TRAMITAÇÃO · PL 100\/2026/);
    expect(prompt).not.toMatch(/festas juninas/);
    expect(hybridSearch).not.toHaveBeenCalled();
    expect(getJurisprudencia).not.toHaveBeenCalled();
  });

  it('keeps the subject of follow-up questions and filters personal data', async () => {
    await perguntar({
      pergunta: 'E a multa? Placa ABC1D23',
      historico: [
        { papel: 'agente', texto: 'Dirigir usando celular é infração?' },
        { papel: 'professor', texto: 'Sim, é gravíssima.' },
      ],
    });
    expect(hybridSearch).not.toHaveBeenCalled();
    expect(generateRapido.mock.calls[0][0]).toMatch(/CONVERSA ATÉ AQUI/);
    expect(generateRapido.mock.calls[0][0]).not.toMatch(/ABC1D23/);
  });

  it('returns a direct official-source answer when no model is configured', async () => {
    provedores = [];
    const corpo = await (await perguntar({ pergunta: 'Posso usar o celular no semáforo?' })).json();
    expect(corpo.resposta).toMatch(/MBFT 763-31/);
    expect(corpo.local).toBe(true);
    expect(corpo.modelo).toBe('Base oficial local');
    expect(corpo.fontes.length).toBeGreaterThan(0);
    expect(corpo.aviso).toMatch(/sem IA/);
  });

  it('survives a source that fails', async () => {
    buscarFichas.mockReturnValue([]);
    buscarPops.mockReturnValue([]);
    hybridSearch.mockRejectedValue(new Error('db down'));
    buscarProjetosDeLei.mockRejectedValue(new Error('camara down'));
    const resposta = await perguntar({ pergunta: 'Existe projeto de lei sobre trânsito autônomo?' });
    expect(resposta.status).toBe(200);
  });

  it('answers POP questions from the bundled manual without waiting for the database', async () => {
    buscarFichas.mockReturnValue([]);
    buscarPops.mockReturnValue([{
      numero: '002', titulo: 'Busca pessoal', pagina: 12,
      sequencia: [{ numero: '1', texto: 'Realizar a busca conforme a técnica e a fundada suspeita.' }],
      atividadesCriticas: [{ numero: '1', texto: 'Manter segurança e controle.' }],
      errosEvitar: [], material: [],
    }]);

    const corpo = await (await perguntar({ pergunta: 'Qual POP orienta a busca pessoal?' })).json();
    expect(corpo.fontes.map((f: { tipo: string }) => f.tipo)).toContain('pop');
    expect(corpo.fontes.some((f: { titulo: string }) => f.titulo.includes('POP 002'))).toBe(true);
    expect(hybridSearch).not.toHaveBeenCalled();
    expect(buscarFichas).not.toHaveBeenCalled();
    expect(buscarPops).toHaveBeenCalledWith('busca pessoal', 3);
  });

  it('honors the selected POP and CTB consultation modes', async () => {
    await perguntar({ pergunta: 'Explique esta dúvida operacional', modo: 'pop' });
    expect(buscarPops).toHaveBeenCalled();
    expect(buscarFichas).not.toHaveBeenCalled();

    jest.clearAllMocks();
    hybridSearch.mockResolvedValue([]);
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 20, blocked: false, registroId: 'r2' });
    await perguntar({ pergunta: 'Explique o artigo 5 do CTB', modo: 'ctb' });
    expect(hybridSearch).toHaveBeenCalled();
    expect(buscarFichas).not.toHaveBeenCalled();
  });

  it('returns visible clarification choices for ambiguous infractions', async () => {
    buscarFichas.mockReturnValue([
      fichaCelular,
      { ...fichaCelular, codigo: '763-32', tipificacaoResumida: 'Dirigir manuseando telefone celular', quandoAutuar: ['Condutor manuseando o aparelho.'] },
    ]);
    const corpo = await (await perguntar({ pergunta: 'O motorista estava usando celular', modo: 'simulador' })).json();
    expect(corpo.esclarecimento.pergunta).toMatch(/situações/);
    expect(corpo.esclarecimento.opcoes.map((opcao: { valor: string }) => opcao.valor)).toEqual(['763-31', '763-32']);
  });

  it('compares two MBFT codes locally without calling AI', async () => {
    buscarFichas.mockImplementation((consulta: string) => consulta.includes('763-32')
      ? [{ ...fichaCelular, codigo: '763-32', tipificacaoResumida: 'Dirigir manuseando telefone celular' }]
      : [fichaCelular]);
    const corpo = await (await perguntar({ pergunta: 'Compare 763-31 e 763-32' })).json();
    expect(corpo.comparacao.map((item: { codigo: string }) => item.codigo)).toEqual(['763-31', '763-32']);
    expect(corpo.local).toBe(true);
    expect(generateRapido).not.toHaveBeenCalled();
  });

  it('uses database RAG for a general CTB question not found in local manuals', async () => {
    buscarFichas.mockReturnValue([]);
    buscarPops.mockReturnValue([]);
    await perguntar({ pergunta: 'Quem compõe o Sistema Nacional de Trânsito?' });
    expect(hybridSearch).toHaveBeenCalledWith(expect.stringMatching(/Sistema Nacional/), 5);
  });

  it('queries jurisprudence only when the student asks for it', async () => {
    await perguntar({ pergunta: 'Existe jurisprudência sobre uso de celular ao volante?' });
    expect(getJurisprudencia).toHaveBeenCalled();
    expect(buscarProjetosDeLei).not.toHaveBeenCalled();
  });

  it('validates the question and applies the rate limit', async () => {
    expect((await perguntar({ pergunta: 'oi' })).status).toBe(400);
    checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, blocked: false, registroId: null });
    expect((await perguntar({ pergunta: 'Dirigir sem cinto dá multa?' })).status).toBe(429);
  });
});
