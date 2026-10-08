import { anonimizarConsultaAvaliacao, avaliarRanking, dividirCasosSemVazamento, prepararConsultasReais } from '@/lib/search/evaluation';

describe('avaliação da recuperação', () => {
  it('remove dados pessoais antes de aceitar uma consulta real', () => {
    expect(anonimizarConsultaAvaliacao('João Silva CPF 123.456.789-00 placa ABC1D23 telefone 48999998888')).toBe(
      '[PESSOA] CPF [CPF] placa [PLACA] telefone [TELEFONE]'
    );
  });

  it('calcula Hit@1, Hit@3, MRR e falsos positivos', () => {
    const metricas = avaliarRanking([
      { esperados: ['a'], retornados: ['a', 'b'] },
      { esperados: ['c'], retornados: ['x', 'c'] },
      { esperados: [], retornados: ['x'] },
      { esperados: [], retornados: [] },
    ]);
    expect(metricas).toEqual({ hit1: 0.5, hit3: 1, mrr: 0.75, falsosPositivos: 0.5, positivos: 2, negativos: 2 });
  });

  it('mantém variações do mesmo caso na mesma divisão', () => {
    const casos = [
      { id: 'a-1', grupo: 'alcool', consulta: 'motorista bêbado' },
      { id: 'a-2', grupo: 'alcool', consulta: 'condutor alcoolizado' },
      { id: 'b-1', grupo: 'celular', consulta: 'mexendo no zap' },
    ];
    const divisao = dividirCasosSemVazamento(casos, ['alcool']);
    expect(divisao.teste.map((caso) => caso.id)).toEqual(['a-1', 'a-2']);
    expect(divisao.desenvolvimento.map((caso) => caso.id)).toEqual(['b-1']);
  });

  it('agrupa consultas reais anonimizadas sem carregar IP para a avaliação', () => {
    const preparadas = prepararConsultasReais([
      { pergunta: 'João Silva CPF 123.456.789-00 placa ABC1D23', ip_endereco: '10.0.0.1', tipo_consulta: 'situacao' },
      { pergunta: 'João Silva CPF 123.456.789-00 placa ABC1D23', ip_endereco: '10.0.0.2', tipo_consulta: 'situacao' },
    ]);
    expect(preparadas).toEqual([{
      consulta: '[PESSOA] CPF [CPF] placa [PLACA]',
      frequencia: 2,
      tipo: 'situacao',
      revisada: false,
    }]);
    expect(JSON.stringify(preparadas)).not.toContain('10.0.0');
  });
});
