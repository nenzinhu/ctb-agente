import { sugerirBusca } from '@/lib/search/sugestoes';

describe('sugestões instantâneas de busca', () => {
  it('sugere infrações com código e amparo a partir de linguagem comum', () => {
    const sugestoes = sugerirBusca('mexendo no zap', 'ctb');
    expect(sugestoes.map((item) => item.valor)).toContain('763-32');
    expect(sugestoes.find((item) => item.valor === '763-32')).toEqual(expect.objectContaining({
      tipo: 'Infração MBFT',
      detalhe: expect.stringMatching(/252.*Quando autuar/),
    }));
  });

  it('mantém artigo explícito como primeira escolha exata', () => {
    expect(sugerirBusca('165-A do CTB', 'ctb')[0]).toEqual(expect.objectContaining({
      valor: 'art. 165-A',
      tipo: 'Artigo CTB',
    }));
  });

  it('sugere POP em linha identificada por número', () => {
    expect(sugerirBusca('baculejo', 'pop')[0]).toEqual(expect.objectContaining({
      valor: 'POP 002',
      tipo: 'POP',
      detalhe: expect.stringMatching(/Execução:|Procedimento oficial/),
    }));
  });

  it('não sugere com texto insuficiente', () => {
    expect(sugerirBusca('ab', 'ctb')).toEqual([]);
  });
});
