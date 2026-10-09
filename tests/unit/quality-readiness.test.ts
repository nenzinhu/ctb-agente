/** @jest-environment node */

import { avaliarProntidao, type AvaliacaoProntidao } from '@/lib/quality/readiness';

const base: AvaliacaoProntidao = {
  fontes: [{
    fonteOficial: 'https://fonte.oficial/',
    versao: '2026',
    vigenteDesde: '2024-01-01',
    conferidoEm: '2026-09-01',
    situacao: 'vigente',
  }],
  documentos: 1,
  itens: 100,
  trechos: 100,
  trechosSemVetor: 0,
  vetoresAplicaveis: true,
  buscaSemanticaDisponivel: true,
  invalidos: 0,
  duplicados: 0,
  busca: { total: 10, hit1: 90, hit3: 100, tempoMedioMs: 200, piorTempoMs: 500, casos: [] },
};

describe('prontidão da base', () => {
  it('marca base vazia e integridade crítica como crítica', () => {
    expect(avaliarProntidao({ ...base, itens: 0, trechos: 0 }).status).toBe('critica');
    expect(avaliarProntidao({ ...base, invalidos: 1 }).status).toBe('critica');
    expect(avaliarProntidao({ ...base, duplicados: 1 }).status).toBe('critica');
  });

  it('pede atenção para metadados incompletos', () => {
    const resultado = avaliarProntidao({
      ...base,
      fontes: [{ ...base.fontes[0], conferidoEm: null, situacao: 'revisar' }],
    });
    expect(resultado.status).toBe('atencao');
    expect(resultado.motivos.join(' ')).toMatch(/metadados|revisão/i);
  });

  it('não finge 100% quando a busca semântica está indisponível', () => {
    const resultado = avaliarProntidao({
      ...base,
      vetoresAplicaveis: false,
      buscaSemanticaDisponivel: false,
      trechosSemVetor: 100,
    });
    expect(resultado.status).toBe('atencao');
    expect(resultado.motivos.join(' ')).toMatch(/semântica indisponível/i);
  });

  it.each([
    ['vetores pendentes', { trechosSemVetor: 1 }],
    ['Hit@3 abaixo de 100%', { busca: { ...base.busca, hit3: 90 } }],
    ['Hit@1 abaixo de 90%', { busca: { ...base.busca, hit1: 80 } }],
    ['caso acima de 1.500 ms', { busca: { ...base.busca, piorTempoMs: 1501 } }],
  ])('pede atenção para %s', (_descricao, mudanca) => {
    expect(avaliarProntidao({ ...base, ...mudanca }).status).toBe('atencao');
  });

  it('marca pronta somente quando todos os limites passam', () => {
    expect(avaliarProntidao(base)).toEqual({ status: 'pronta', motivos: [] });
  });
});
