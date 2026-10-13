/** @jest-environment node */
import { readFileSync } from 'node:fs';

const checkRateLimit = jest.fn();
const recordQuery = jest.fn();
jest.mock('../../lib/ratelimit/limiter', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
  recordQuery: (...args: unknown[]) => recordQuery(...args),
}));

const getCachedValue = jest.fn();
const setCachedValue = jest.fn();
jest.mock('../../lib/response/cache', () => ({
  getCachedValue: (...args: unknown[]) => getCachedValue(...args),
  setCachedValue: (...args: unknown[]) => setCachedValue(...args),
}));

const generateRapido = jest.fn();
jest.mock('../../lib/ai/providers/chain', () => ({
  ProviderChain: jest.fn().mockImplementation(() => ({ generateRapido: (...args: unknown[]) => generateRapido(...args) })),
}));

const obterDocumento = jest.fn();
const carregarTrechos = jest.fn();
jest.mock('../../lib/apostila/repositorio', () => ({
  obterDocumentoApostila: (...args: unknown[]) => obterDocumento(...args),
  carregarTrechosApostila: (...args: unknown[]) => carregarTrechos(...args),
}));

import { gerarApostilaDocumento, TEMPO_IA_MS } from '@/app/api/apostila/handler';
import { blocosDaApostila, capituloDocumentoSemIA, promptCapituloDocumento } from '@/lib/rag/apostila';
import { pdfDeBlocos } from '@/lib/pdf-tools/pdf-writer';
import type { DocumentoApostila, ParteApostila, TrechoApostila } from '@/lib/apostila/tipos';

const documento: DocumentoApostila & { hashConteudo: string } = {
  id: '11111111-1111-4111-8111-111111111111', titulo: 'Resolução CONTRAN nº 882/2021', colecao: 'ctb',
  paginas: 93, paginaMaximaDisponivel: 93, trechos: 10, situacao: 'revisar', hashConteudo: 'hash-882',
};

const parte: ParteApostila = {
  indice: 0, paginas: [10, 11], secoes: ['Art. 5º'], texto: 'Art. 5º O limite deve ser observado.',
};

const trecho = (indice: number, tamanho = 80): TrechoApostila => ({
  id: `t${indice}`, documentoId: documento.id, secao: `Seção ${indice}`, pagina: indice + 1,
  ordem: indice, texto: `Trecho ${indice} ${'x'.repeat(tamanho)}`,
});

describe('apostila documental por IA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 20, blocked: false, registroId: 'r1' });
    getCachedValue.mockResolvedValue(null);
    obterDocumento.mockResolvedValue(documento);
    carregarTrechos.mockResolvedValue([trecho(0)]);
    generateRapido.mockResolvedValue({ texto: '## Objetivos\n- Entender a regra.', provedor: 'Groq', modelo: 'llama' });
  });

  it('instrui o modelo em português com fonte, páginas e aviso de revisão', () => {
    const prompt = promptCapituloDocumento(documento, parte, 'agente');
    expect(prompt).toContain('Português do Brasil');
    expect(prompt).toContain('Resolução CONTRAN nº 882/2021');
    expect(prompt).toContain('páginas 10–11');
    expect(prompt).toContain('EM REVISÃO');
    expect(prompt).toContain('não invente códigos, artigos, prazos, valores ou procedimentos');
    expect(prompt).not.toMatch(/em formação/i);
  });

  it('produz fallback rastreável sem IA', () => {
    const capitulo = capituloDocumentoSemIA(documento, parte);
    expect(capitulo).toMatchObject({ paginas: [10, 11], situacao: 'revisar', modelo: null });
    expect(capitulo.titulo).toContain('Resolução CONTRAN nº 882/2021');
    expect(capitulo.texto).toContain('Art. 5º O limite deve ser observado.');
  });

  it('gera por documento e usa cache vinculado ao hash e às páginas', async () => {
    carregarTrechos.mockResolvedValue([trecho(9), trecho(10)]);
    const resultado = await gerarApostilaDocumento({
      documentoId: documento.id, selecao: { modo: 'paginas', intervalos: '10-11' },
      publico: 'agente', titulo: 'Pesos e dimensões',
    }, '127.0.0.1');
    expect(resultado).toEqual(expect.objectContaining({ titulo: 'Pesos e dimensões', selecaoRotulo: 'páginas 10–11' }));
    expect(setCachedValue).toHaveBeenCalledWith(
      `apostila:v4:${documento.id}:hash-882:revisar:10–11:agente:0`, expect.objectContaining({ paginas: [10, 11] }), expect.any(Object)
    );
    expect(recordQuery).toHaveBeenCalled();
  });

  it('preserva capítulos gerados e usa fallback somente na parte que falhou', async () => {
    carregarTrechos.mockResolvedValue([
      { ...trecho(0, 5_900), pagina: 1 }, { ...trecho(1, 5_900), pagina: 2 },
    ]);
    generateRapido
      .mockResolvedValueOnce({ texto: '## Capítulo gerado', provedor: 'Groq', modelo: 'llama' })
      .mockRejectedValueOnce(new Error('indisponível'));
    const resultado = await gerarApostilaDocumento({
      documentoId: documento.id, selecao: { modo: 'inteiro' }, publico: 'agente',
    }, '127.0.0.1');
    if ('erro' in resultado) throw new Error(resultado.erro);
    expect(resultado.capitulos).toHaveLength(2);
    expect(resultado.capitulos[0].modelo).toBe('Groq · llama');
    expect(resultado.capitulos[1].modelo).toBeNull();
  });

  it('limita a três chamadas de IA simultâneas', async () => {
    carregarTrechos.mockResolvedValue(Array.from({ length: 6 }, (_, indice) => ({
      ...trecho(indice, 5_700), pagina: indice + 1,
    })));
    let ativas = 0;
    let maximo = 0;
    generateRapido.mockImplementation(async () => {
      ativas++;
      maximo = Math.max(maximo, ativas);
      await new Promise((resolve) => setTimeout(resolve, 5));
      ativas--;
      return { texto: '## Conteúdo', provedor: 'Groq', modelo: 'llama' };
    });
    const resultado = await gerarApostilaDocumento({
      documentoId: documento.id, selecao: { modo: 'inteiro' }, publico: 'agente',
    }, '127.0.0.1');
    expect('erro' in resultado).toBe(false);
    expect(maximo).toBeLessThanOrEqual(3);
    expect(generateRapido).toHaveBeenCalledTimes(6);
  });

  it('reserva tempo para duas rodadas de três partes dentro do limite da rota', () => {
    expect(TEMPO_IA_MS).toBeLessThanOrEqual(25_000);
  });
});

describe('apostila em PDF', () => {
  it('converte capítulos rastreáveis em blocos e PDF institucional', async () => {
    const capitulo = capituloDocumentoSemIA(documento, parte);
    const blocos = blocosDaApostila([capitulo]);
    expect(blocos.some((bloco) => bloco.texto.includes('páginas 10–11'))).toBe(true);
    expect(blocos.some((bloco) => bloco.texto.includes('Em revisão'))).toBe(true);
    const logoJpeg = new Uint8Array(readFileSync('public/brasao-cpmrv.jpg'));
    const pdf = await pdfDeBlocos('Apostila — Pesos', blocos, undefined, {
      instituicao: 'Polícia Militar Rodoviária de Santa Catarina', logoJpeg, logoLarguraPx: 115, logoAlturaPx: 144,
    });
    const conteudo = Buffer.from(pdf).toString('latin1');
    expect(conteudo).toContain('/Im0 Do');
    expect(conteudo).toContain('Pol\\355cia Militar Rodovi\\341ria de Santa Catarina');
  });
});
