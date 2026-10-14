import {
  SelecaoPaginasInvalida,
  parseSelecaoPaginas,
  rotuloSelecaoPaginas,
} from '@/lib/apostila/paginas';

describe('seleção de páginas da apostila', () => {
  it('normaliza páginas e intervalos com hífen ou travessão', () => {
    const selecao = parseSelecaoPaginas('3, 10-14, 35–38', 40);

    expect(selecao.paginas).toEqual([
      3,
      10, 11, 12, 13, 14,
      35, 36, 37, 38,
    ]);
    expect(selecao.intervalos).toEqual([
      { inicio: 3, fim: 3 },
      { inicio: 10, fim: 14 },
      { inicio: 35, fim: 38 },
    ]);
    expect(selecao.canonico).toBe('3, 10–14, 35–38');
    expect(rotuloSelecaoPaginas(selecao)).toBe('páginas 3, 10–14 e 35–38');
  });

  it('deduplica, ordena e compacta intervalos sobrepostos', () => {
    const selecao = parseSelecaoPaginas('4, 3, 2-3, 4', 10);

    expect(selecao.paginas).toEqual([2, 3, 4]);
    expect(selecao.intervalos).toEqual([{ inicio: 2, fim: 4 }]);
    expect(selecao.canonico).toBe('2–4');
  });

  it('produz rótulo singular para uma página', () => {
    expect(rotuloSelecaoPaginas(parseSelecaoPaginas('7', 10))).toBe('página 7');
  });

  it.each([
    ['', 'Informe ao menos uma página.'],
    ['0', 'As páginas devem começar em 1.'],
    ['-2', 'Use páginas e intervalos como 3, 10–18.'],
    ['8-3', 'O início do intervalo não pode ser maior que o fim.'],
    ['abc', 'Use páginas e intervalos como 3, 10–18.'],
    ['2,,4', 'Use páginas e intervalos como 3, 10–18.'],
  ])('rejeita seleção inválida %p', (valor, mensagem) => {
    expect(() => parseSelecaoPaginas(valor, 20)).toThrow(mensagem);
  });

  it('rejeita página acima do limite conhecido', () => {
    expect(() => parseSelecaoPaginas('9-12', 10)).toThrow('A página 12 ultrapassa o limite disponível (10).');
  });

  it('aceita no máximo dez páginas por apostila', () => {
    expect(parseSelecaoPaginas('1-10').paginas).toHaveLength(10);
  });

  it('rejeita mais de dez páginas antes de consultar o banco', () => {
    expect(() => parseSelecaoPaginas('1-11')).toThrow('Selecione no máximo 10 páginas por apostila.');
  });

  it('aceita intervalos sobrepostos quando o total único respeita o limite', () => {
    expect(parseSelecaoPaginas('1-10, 1-10').paginas).toHaveLength(10);
  });

  it('expõe um erro de domínio identificável', () => {
    try {
      parseSelecaoPaginas('x');
      throw new Error('deveria falhar');
    } catch (error) {
      expect(error).toBeInstanceOf(SelecaoPaginasInvalida);
    }
  });
});
