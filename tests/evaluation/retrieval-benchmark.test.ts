import { todasAsFichas, buscarFichas } from '@/lib/mbft/fichas';
import { todosOsPops, buscarPops } from '@/lib/pop/pops';
import { avaliarRanking } from '@/lib/search/evaluation';

interface Caso {
  consulta: string;
  colecao: 'mbft' | 'pop';
  esperados: string[];
  grupo: string;
}

const linguagem: Caso[] = [
  ['recusa do bafômetro', 'mbft', ['757-90'], 'alcool'],
  ['rec bafom', 'mbft', ['757-90'], 'alcool'],
  ['segurando celualr', 'mbft', ['763-31'], 'celular'],
  ['mexendo no zap', 'mbft', ['763-32'], 'celular'],
  ['moto s/ capacete', 'mbft', ['703-01'], 'capacete'],
  ['garupa sem capacete', 'mbft', ['704-81'], 'capacete'],
  ['dar grau', 'mbft', ['705-61'], 'manobra'],
  ['pneu careca', 'mbft', ['672-61'], 'equipamento'],
  ['escapamento aberto', 'mbft', ['665-31'], 'equipamento'],
  ['sem carteira', 'mbft', ['501-00'], 'habilitacao'],
  ['estac vaga idoso', 'mbft', ['762-52'], 'estacionamento'],
  ['vaga pcd', 'mbft', ['762-51'], 'estacionamento'],
  ['andando no acostamento', 'mbft', ['581-97'], 'circulacao'],
  ['ultrapassou pelo acostamento', 'mbft', ['590-80'], 'circulacao'],
  ['moto sem placa', 'mbft', ['658-00'], 'identificacao'],
  ['uso de algemas', 'pop', ['003'], 'algemas'],
  ['algmeas', 'pop', ['003'], 'algemas'],
  ['busc pess', 'pop', ['002'], 'busca_pessoal'],
  ['baculejo', 'pop', ['002'], 'busca_pessoal'],
  ['revista pessoal', 'pop', ['002'], 'busca_pessoal'],
  ['blitz', 'pop', ['105.1.1'], 'barreira'],
  ['barreira polic', 'pop', ['105.1.1'], 'barreira'],
  ['maria da penha', 'pop', ['201.4.6'], 'violencia_domestica'],
  ['violencia domest', 'pop', ['201.4.6'], 'violencia_domestica'],
  ['batida de carro', 'pop', ['201.6.1'], 'acidente'],
  ['perseguicao de veiculo', 'pop', ['006'], 'perseguicao'],
  ['encontrado morto', 'pop', ['201.4.22'], 'obito'],
] .map(([consulta, colecao, esperados, grupo]) => ({ consulta, colecao, esperados, grupo })) as Caso[];

const exatosMbft: Caso[] = todasAsFichas().slice(0, 70).map((ficha) => ({
  consulta: `código ${ficha.codigo}`,
  colecao: 'mbft',
  esperados: [ficha.codigo],
  grupo: `mbft-${ficha.codigo}`,
}));

const exatosPop: Caso[] = todosOsPops().slice(0, 40).map((pop) => ({
  consulta: `POP ${pop.numero}`,
  colecao: 'pop',
  esperados: [pop.numero],
  grupo: `pop-${pop.numero}`,
}));

const negativos: Caso[] = [
  ['código 99999', 'mbft', [], 'negativo-codigo'],
  ['art. 999', 'mbft', [], 'negativo-artigo'],
  ['receita de bolo de chocolate', 'mbft', [], 'negativo-fora'],
  ['xyzqwerty', 'mbft', [], 'negativo-ruido'],
  ['POP 999', 'pop', [], 'negativo-pop'],
  ['POP 201.4.999', 'pop', [], 'negativo-pop-composto'],
  ['receita de bolo de chocolate', 'pop', [], 'negativo-pop-fora'],
  ['xyzqwerty', 'pop', [], 'negativo-pop-ruido'],
].map(([consulta, colecao, esperados, grupo]) => ({ consulta, colecao, esperados, grupo })) as Caso[];

const casos = [...exatosMbft, ...exatosPop, ...linguagem, ...negativos];

describe('benchmark controlado de recuperação', () => {
  it('mantém entre 100 e 200 casos revisáveis', () => {
    expect(casos.length).toBeGreaterThanOrEqual(100);
    expect(casos.length).toBeLessThanOrEqual(200);
    expect(new Set(casos.map((caso) => `${caso.colecao}:${caso.consulta}`)).size).toBe(casos.length);
  });

  it('atinge Hit@3 mínimo de 95% sem regressão em identificadores exatos', () => {
    const resultados = casos.map((caso) => ({
      esperados: caso.esperados,
      retornados: caso.colecao === 'mbft'
        ? buscarFichas(caso.consulta, 3).map((ficha) => ficha.codigo)
        : buscarPops(caso.consulta, 3).map((pop) => pop.numero),
    }));
    const metricas = avaliarRanking(resultados);
    expect(metricas.hit3).toBeGreaterThanOrEqual(0.95);
    expect(metricas.falsosPositivos).toBe(0);
    expect(resultados.slice(0, exatosMbft.length + exatosPop.length).every((item) => item.retornados[0] === item.esperados[0])).toBe(true);
  });
});
