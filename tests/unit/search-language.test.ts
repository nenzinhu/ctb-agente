import { buscarFichas } from '@/lib/mbft/fichas';
import { buscarPops } from '@/lib/pop/pops';
import { buscarNoIndice, criarIndiceBusca, similaridadePalavra } from '@/lib/search/lexical';

// Retrieval expectations refer to the shipped manuals, not model-generated text.
describe('Portuguese retrieval over the official bundled manuals', () => {
  it.each([
    ['recusa do bafômetro', '757-90'],
    ['recusou o bafo', '757-90'],
    ['bebado', '516-91'],
    ['celualr', '763-31'],
    ['segurando o celul', '763-31'],
    ['mexendo no zap', '763-32'],
    ['racha', '524-00'],
    ['dar grau de moto', '705-61'],
    ['pneu careca', '672-61'],
    ['escapamento aberto', '665-31'],
    ['sem carteira', '501-00'],
    ['estacion na calcada', '545-21'],
    ['sem cinto', '518-51'],
  ])('finds %s among the leading sheets', (consulta, codigo) => {
    expect(buscarFichas(consulta, 3).map((f) => f.codigo)).toContain(codigo);
  });

  it.each([
    ['algem', '003'],
    ['algmeas', '003'],
    ['busca pess', '002'],
    ['revista pessoal', '002'],
    ['baculejo', '002'],
    ['blitz', '105.1.1'],
    ['violencia domest', '201.4.6'],
    ['maria da penha', '201.4.6'],
    ['perseguicao', '006'],
    ['batida de carro', '201.6.1'],
  ])('finds the expected POP for %s', (consulta, numero) => {
    expect(buscarPops(consulta, 3).map((p) => p.numero)).toContain(numero);
  });

  it.each(['516-91', '51691', '5169-1', 'código 516 91'])('preserves exact code identity for %s', (consulta) => {
    expect(buscarFichas(consulta).map((f) => f.codigo)).toEqual(['516-91']);
  });

  it('never substitutes another code or article suffix for an unknown complete reference', () => {
    expect(buscarFichas('516-99')).toEqual([]);
    expect(buscarFichas('art. 181, L')).toEqual([]);
    expect(buscarFichas('art. 999')).toEqual([]);
    expect(buscarFichas('art. 165-A').map((f) => f.codigo)).toEqual(['757-90']);
    expect(buscarPops('POP 999')).toEqual([]);
    expect(buscarPops('POP 2').map((p) => p.numero)).toEqual(['002']);
  });

  it('does not treat the article number inside a situation as a POP identifier', () => {
    expect(buscarPops('uso de algemas art. 002', 1)[0]?.numero).toBe('003');
  });

  it.each(['', 'sem', 'al', 'zzzzzzzzzzz'])('returns no results for a non-specific query %s', (consulta) => {
    expect(buscarFichas(consulta)).toEqual([]);
    expect(buscarPops(consulta)).toEqual([]);
  });
});

describe('Pesos e dimensões (art. 231, IV–VI)', () => {
  // Resolução Contran 882/2021 groups these limits as "pesos e dimensões", but
  // the sheets write "excesso de peso", "PBT/PBTC" and "dimensões". The plural
  // "pesos" alone used to reach only 574-61 (art. 187) and hide the group.
  const grupo = ['682-31', '682-32', '683-11', '683-12', '683-13', '684-01', '684-02'];

  it.each(['pesos e dimensões', 'PESOS E DIMENSÕES', 'limites de pesos e dimensões'])(
    'offers every sheet of the group for %s',
    (consulta) => {
      expect(buscarFichas(consulta, 40).map((f) => f.codigo)).toEqual(expect.arrayContaining(grupo));
    }
  );

  it.each(['pesos', 'peso', 'peso bruto', 'PBT', 'excesso de peso'])('reaches 683-11 from %s', (consulta) => {
    expect(buscarFichas(consulta, 4).map((f) => f.codigo)).toContain('683-11');
  });
});

describe('lexical matching boundaries', () => {
  it('requires a real prefix or a bounded typo, not arbitrary shared letters', () => {
    expect(similaridadePalavra('estacion', 'estacionar')).toBeGreaterThan(0);
    expect(similaridadePalavra('celualr', 'celular')).toBeGreaterThan(0);
    expect(similaridadePalavra('transporte', 'transitar')).toBe(0);
    expect(similaridadePalavra('alg', 'algema')).toBe(0);
    expect(similaridadePalavra('51691', '51692')).toBe(0);
  });

  it('does not correct an existing exact term and deduplicates repeated query words', () => {
    const indice = criarIndiceBusca([
      { item: 'typo', titulo: 'Coluna', corpo: '' },
      { item: 'exact', titulo: 'Colina', corpo: '' },
    ]);
    expect(buscarNoIndice('colina', indice, 2)).toEqual(['exact']);
    expect(buscarNoIndice('colina colina', indice, 2)).toEqual(['exact']);
  });
});
