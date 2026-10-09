import { lerPops } from '@/lib/pop/parser';
import { buscarPops, sugerirPops, todosOsPops } from '@/lib/pop/pops';
import type { Pagina } from '@/lib/mbft/parser';
import type { Pop } from '@/lib/pop/parser';

const l = (...partes: [number, string][]) => partes.map(([x, texto]) => ({ x, texto }));
const cabecalho = [
  l([153, 'PROCEDIMENTO OPERACIONAL PADRÃO']),
  l([135, 'USO DE ALGEMA (TÉCNICA POLICIAL)']),
  l([493, 'POP']),
  l([495, '003']),
  l([151, 'Estabelecido em'], [266, 'Atualizado em'], [388, 'Execução']),
  l([162, '23/12/2011'], [273, '27/03/2018'], [374, 'Guarnição PM']),
];
const PAGINAS: Pagina[] = [
  {
    numero: 12,
    linhas: [
      ...cabecalho,
      l([225, 'MATERIAL NECESSÁRIO']),
      l([62, '1. Algema;']),
      l([177, 'FUNDAMENTAÇÃO LEGAL E DOUTRINÁRIA']),
      l([103, 'LEGISLAÇÃO/DOUTRINA'], [372, 'ESPECIFICAÇÃO']),
      l([57, 'Súmula Vinculante 11 - STF'], [306, 'Inteiro teor']),
      l([227, 'SEQUÊNCIA DAS AÇÕES']),
      l([57, '1.'], [82, 'Algemar com as mãos'], [300, 'para trás:']),
      l([85, 'a.'], [111, 'conferir o']),
      l([111, 'travamento;']),
      l([297, 'Manual de POP PMSC Compilado gerado em 25/09/2026 15:02']),
      l([584, '12']),
    ],
  },
  {
    numero: 13,
    linhas: [
      ...cabecalho,
      l([227, 'ATIVIDADES CRÍTICAS']),
      l([57, '1. Resistência ativa.']),
      l([227, 'ERROS A SEREM EVITADOS']),
      l([57, '1. Algemar pela frente.']),
    ],
  },
];

describe('lerPops', () => {
  const pops = lerPops(PAGINAS);

  it('reads the header once, even when it repeats on every page', () => {
    expect(pops).toHaveLength(1);
    expect(pops[0]).toMatchObject({
      numero: '003',
      titulo: 'USO DE ALGEMA (TÉCNICA POLICIAL)',
      estabelecido: '23/12/2011',
      atualizado: '27/03/2018',
      execucao: 'Guarnição PM',
      pagina: 12,
    });
  });

  it('reads every standard section, keeping numbering and indentation', () => {
    const [pop] = pops;
    expect(pop.material).toEqual([{ texto: '1. Algema;', nivel: 0 }]);
    expect(pop.fundamentacao).toEqual([{ norma: 'Súmula Vinculante 11 - STF', especificacao: 'Inteiro teor' }]);
    expect(pop.sequencia).toEqual([
      { texto: '1. Algemar com as mãos para trás:', nivel: 0 },
      { texto: 'a. conferir o travamento;', nivel: 1 },
    ]);
    expect(pop.atividadesCriticas).toEqual([{ texto: '1. Resistência ativa.', nivel: 0 }]);
    expect(pop.errosEvitar).toEqual([{ texto: '1. Algemar pela frente.', nivel: 0 }]);
  });
});

describe('buscarPops (manual incluído no app)', () => {
  const numeros = (q: string) => buscarPops(q, 3).map((p) => p.numero);

  it('ships the whole compiled manual', () => {
    expect(todosOsPops().length).toBeGreaterThan(140);
  });

  it('finds by number and by question', () => {
    expect(numeros('POP 002')).toEqual(['002']);
    expect(numeros('Quando é permitido o uso de algemas?')[0]).toBe('003');
    expect(numeros('barreira policial')[0]).toBe('105.1.1');
    expect(numeros('violência doméstica')[0]).toBe('201.4.6');
  });

  it('prioriza título e atividade crítica sobre menção apenas na fundamentação', () => {
    const base = (numero: string, titulo: string): Pop => ({
      numero, titulo, estabelecido: '', atualizado: '', execucao: '', pagina: 1,
      material: [], fundamentacao: [], sequencia: [], atividadesCriticas: [], errosEvitar: [], anexos: [],
    });
    const apenasFundamentacao = base('900', 'ROTINA ADMINISTRATIVA');
    apenasFundamentacao.fundamentacao = [{ norma: 'Manual de isolamento de perímetro', especificacao: '' }];
    const operacional = base('901', 'PRESERVAÇÃO DO LOCAL');
    operacional.atividadesCriticas = [{ texto: 'Realizar isolamento do perímetro.', nivel: 0 }];

    expect(buscarPops('isolamento do perímetro', 2, [apenasFundamentacao, operacional])[0]?.numero)
      .toBe('901');
  });

  it('oferece sugestão próxima sem tratá-la como resultado seguro', () => {
    const base = (numero: string, titulo: string): Pop => ({
      numero, titulo, estabelecido: '', atualizado: '', execucao: '', pagina: 1,
      material: [], fundamentacao: [], sequencia: [], atividadesCriticas: [], errosEvitar: [], anexos: [],
    });
    const local = base('901', 'PRESERVAÇÃO DO LOCAL');
    local.atividadesCriticas = [{ texto: 'Realizar isolamento do perímetro.', nivel: 0 }];

    expect(buscarPops('isolamento helicóptero neve', 3, [local])).toEqual([]);
    expect(sugerirPops('isolamento helicóptero neve', 3, [local]).map((p) => p.numero)).toEqual(['901']);
  });
});
