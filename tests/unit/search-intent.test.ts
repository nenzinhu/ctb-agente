import { classificarIntencaoBusca } from '@/lib/search/intent';

describe('classificação de intenção da busca', () => {
  it.each([
    ['código 51691', 'codigo', '516-91'],
    ['art. 165-A do CTB', 'artigo', 'art. 165-A'],
    ['POP 003', 'pop', '003'],
  ] as const)('preserva o identificador exato em %s', (consulta, intencao, identificador) => {
    expect(classificarIntencaoBusca(consulta)).toMatchObject({
      intencao,
      confianca: 1,
      identificador,
    });
  });

  it.each([
    ['qual procedimento para uso de algemas?', 'pop'],
    ['dirigindo segurando celular', 'infracao'],
    ['qual natureza para tentativa de suicídio?', 'natureza_pmsc'],
    ['o que diz a legislação sobre trânsito?', 'consulta_geral'],
  ] as const)('classifica %s como %s', (consulta, intencao) => {
    expect(classificarIntencaoBusca(consulta).intencao).toBe(intencao);
  });

  it('não transforma um número qualquer em identificador POP', () => {
    expect(classificarIntencaoBusca('acidente com duas vítimas').intencao).not.toBe('pop');
  });
});
