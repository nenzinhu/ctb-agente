import { lerFichas, type Pagina } from '@/lib/mbft/parser';
import { buscarFichas, todasAsFichas } from '@/lib/mbft/fichas';

/** One sheet as pdf.js lays it out: fragments with their x, line by line */
const l = (...partes: [number, string][]) => partes.map(([x, texto]) => ({ x, texto }));
const PAGINAS: Pagina[] = [
  {
    numero: 32,
    linhas: [
      l([205, 'CONSELHO NACIONAL DE TRÂNSITO']),
      l([222, 'FICHA DE FISCALIZAÇÃO']),
      l([41, 'Tipificação Resumida:'], [439, 'Código do Enquadramento:']),
      l([41, 'Iniciar obra sem permissão.'], [481, '751-01']),
      l([41, 'Amparo Legal:']),
      l([41, 'Art. 95.']),
      l([41, 'Tipificação do Enquadramento:']),
      l([41, 'Nenhuma obra será iniciada sem permissão prévia.']),
      l([41, 'Gravidade:'], [172, 'Penalidade:'], [303, 'Medida Administrativa:'], [438, 'Pode Configurar Crime de']),
      l([74, 'Não aplicável'], [220, 'Multa'], [338, 'Não aplicável'], [438, 'Trânsito:']),
      l([41, 'Infrator:'], [172, 'Competência:'], [486, 'NÃO']),
      l([52, 'Pessoa Física ou Jurídica'], [172, 'Órgão Municipal.']),
      l([41, 'Pontuação'], [85, ':'], [172, 'Constatação da Infração:']),
      l([68, 'Não computável'], [172, 'Mediante Abordagem.']),
      l([447, 'Exemplos do Campo de']),
      l([66, 'Quando AUTUAR'], [189, 'Quando NÃO Autuar'], [307, 'Definições e Procedimentos']),
      l([41, '1. Responsável que iniciar'], [172, '1. Quando houver'], [303, '1. Infração de pessoa'], [438, '1. Tapume sobre']),
      l([41, 'obra.'], [172, 'permissão.'], [303, 'física.'], [438, 'o passeio.']),
      l([303, '2. Ver infração 752-']),
      l([303, '81.']),
      l([306, '31']),
    ],
  },
  {
    numero: 33,
    linhas: [
      l([41, 'Informações Complementares:']),
      l([41, '1 . Duas infrações concomitantes.']),
      l([222, 'FICHA DE FISCALIZAÇÃO']),
      l([41, 'Tipificação Resumida:']),
    ],
  },
];

describe('lerFichas', () => {
  const [ficha] = lerFichas(PAGINAS);

  it('reads the identification block with the code', () => {
    expect(ficha.codigo).toBe('751-01');
    expect(ficha.tipificacaoResumida).toBe('Iniciar obra sem permissão.');
    expect(ficha.amparoLegal).toBe('Art. 95.');
    expect(ficha.tipificacao).toBe('Nenhuma obra será iniciada sem permissão prévia.');
  });

  it('reads the four-column rows, the crime answer included', () => {
    expect(ficha.gravidade).toBe('Não aplicável');
    expect(ficha.penalidade).toBe('Multa');
    expect(ficha.medidaAdministrativa).toBe('Não aplicável');
    expect(ficha.configuraCrime).toBe('NÃO');
    expect(ficha.infrator).toBe('Pessoa Física ou Jurídica');
    expect(ficha.competencia).toBe('Órgão Municipal.');
    expect(ficha.pontuacao).toBe('Não computável');
    expect(ficha.constatacao).toBe('Mediante Abordagem.');
  });

  it('splits the criteria columns and joins wrapped lines and codes', () => {
    expect(ficha.quandoAutuar).toEqual(['1. Responsável que iniciar obra.']);
    expect(ficha.quandoNaoAutuar).toEqual(['1. Quando houver permissão.']);
    expect(ficha.definicoes).toEqual(['1. Infração de pessoa física.', '2. Ver infração 752-81.']);
    expect(ficha.exemplos).toEqual(['1. Tapume sobre o passeio.']);
  });

  it('carries the sheet across pages and drops the page furniture', () => {
    expect(ficha.informacoesComplementares).toEqual(['1. Duas infrações concomitantes.']);
    expect(ficha.pagina).toBe(32);
  });

  it('skips a sheet it cannot read', () => {
    expect(lerFichas(PAGINAS)).toHaveLength(1);
  });
});

describe('buscarFichas (MBFT incluído no app)', () => {
  const codigos = (q: string) => buscarFichas(q, 4).map((f) => f.codigo);

  it('ships the whole manual', () => {
    expect(todasAsFichas().length).toBeGreaterThan(400);
    expect(todasAsFichas().every((f) => /^\d{3}-\d{2}$/.test(f.codigo))).toBe(true);
  });

  it('finds by code, by article and inciso, and by situation', () => {
    expect(codigos('516-91')).toEqual(['516-91']);
    expect(codigos('art. 181, XX')).toEqual(expect.arrayContaining(['762-51', '762-52']));
    expect(codigos('dirigir segurando o celular')).toContain('763-31');
    expect(codigos('sem cinto de segurança')).toContain('518-51');
    expect(codigos('recusa do bafômetro')).toContain('757-90');
  });

  it('lists every desdobramento of a bare article', () => {
    // The consulta picker fed the agent only the first 8 sheets of art. 231, so
    // the "pesos e dimensões" incisos (682-31, 683-11, 684-01) were never offered.
    const codigosArt231 = buscarFichas('art. 231').map((f) => f.codigo);
    expect(codigosArt231).toHaveLength(22);
    expect(codigosArt231).toEqual(expect.arrayContaining(['682-31', '682-32', '683-11', '683-12', '683-13', '684-01', '684-02']));
  });

  it('returns nothing for an empty query', () => {
    expect(buscarFichas('   ')).toEqual([]);
  });
});
