import { buscarFichas } from '@/lib/mbft/fichas';
import { buscarPops } from '@/lib/pop/pops';
import { buscarNoIndice, criarIndiceBusca, similaridadePalavra, trechoDaConsulta } from '@/lib/search/lexical';
import { normalizarBusca } from '@/lib/search/sinonimos';

describe('recuperação no corpus oficial: variações da consulta', () => {
  it.each([
    ['516-91', '516-91'],
    ['51691', '516-91'],
    ['5169-1', '516-91'],
    ['código 516 91', '516-91'],
    ['art. 165A', '757-90'],
    ['recusa do bafômetro', '757-90'],
    ['rec bafom', '757-90'],
    ['s/ cinto', '518-51'],
    ['sem cint', '518-51'],
    ['moto s/ capacete', '703-01'],
    ['moto sem capac', '703-01'],
    ['segurando celualr', '763-31'],
    ['dirigir segurando o zap', '763-31'],
    ['Posso usar o celular no semáforo?', '763-31'],
    ['estac vaga idoso', '762-52'],
    ['vaga pcd', '762-51'],
    ['racha', '524-00'],
    ['dar grau', '705-61'],
    ['empinando moto', '705-61'],
    ['estacionar na calçada', '545-21'],
  ])('MBFT: %s encontra %s entre as três primeiras fichas', (consulta, codigo) => {
    expect(buscarFichas(consulta, 3).map((f) => f.codigo)).toContain(codigo);
  });

  it.each([
    ['POP 002', '002'],
    ['pop 2', '002'],
    ['105.1.1', '105.1.1'],
    ['algmeas', '003'],
    ['algem', '003'],
    ['uso de algemas', '003'],
    ['busc pess', '002'],
    ['baculejo', '002'],
    ['revista pessoal', '002'],
    ['blitz', '105.1.1'],
    ['barreira polic', '105.1.1'],
    ['maria da penha', '201.4.6'],
    ['violencia domest', '201.4.6'],
    ['batida de carro', '201.6.1'],
    ['perseguicao de veiculo', '006'],
  ])('POP: %s encontra %s entre os três primeiros procedimentos', (consulta, numero) => {
    expect(buscarPops(consulta, 3).map((p) => p.numero)).toContain(numero);
  });

  it.each(['516-99', '99999', 'art. 999', 'art. 181, L', 'receita de bolo de chocolate', 'xyzqwerty', ''])('não inventa ficha para %s', (consulta) => {
    expect(buscarFichas(consulta)).toEqual([]);
  });

  it.each(['POP 999', 'POP 201.4.999', 'receita de bolo de chocolate', 'xyzqwerty', ''])('não substitui POP ausente em %s', (consulta) => {
    expect(buscarPops(consulta)).toEqual([]);
  });

  it('preserva alternativas reais de um mesmo artigo/inciso', () => {
    expect(buscarFichas('art. 181, XX').map((f) => f.codigo)).toEqual(['762-51', '762-52']);
  });

  it('não mistura infrações sem relação com o celular nas alternativas', () => {
    const fichas = buscarFichas('segurando celualr');
    expect(fichas.length).toBeGreaterThan(0);
    expect(fichas.every((f) => /celular/i.test(`${f.tipificacaoResumida} ${f.tipificacao}`))).toBe(true);
  });
});

describe('limites da aproximação lexical', () => {
  it('preserva a negação nas abreviações do manual', () => {
    expect(normalizarBusca('condutor s/ capacete e c/ passageiro')).toBe('condutor sem capacete e com passageiro');
  });

  it('não corrige números nem une palavras só por cinco letras iniciais', () => {
    expect(similaridadePalavra('51691', '51692')).toBe(0);
    expect(similaridadePalavra('transporte', 'transitar')).toBe(0);
    expect(similaridadePalavra('alg', 'algema')).toBe(0);
  });

  it('prefere a fonte que cobre a situação completa', () => {
    const indice = criarIndiceBusca([
      { item: 'celular', titulo: 'Dirigir segurando telefone celular', corpo: '' },
      { item: 'seguranca', titulo: 'Condições de segurança', corpo: '' },
      { item: 'guidom', titulo: 'Segurando o guidom', corpo: '' },
    ]);
    expect(buscarNoIndice('segurando celualr', indice, 8)).toEqual(['celular']);
  });

  it('mantém o trecho relevante que aparece depois do corte inicial de uma seção longa', () => {
    const contexto = 'Não retirar a tornozeleira eletrônica. Comunicar à central quando estiver rompida.';
    const texto = `${'Preparar o equipamento para o serviço.\n'.repeat(160)}\n${contexto}\nRegistrar a ocorrência.`;
    const trecho = trechoDaConsulta(texto, 'tornozeleira rompida');
    expect(trecho).toContain(contexto);
    expect(trecho.startsWith('…')).toBe(true);
    expect(texto).toContain(trecho.replace(/^…|…$/g, ''));
    expect(trecho.length).toBeLessThanOrEqual(3502);
  });

  it('não reescreve uma fonte curta e mantém o começo quando nada corresponde', () => {
    expect(trechoDaConsulta('1. Comunicar à central.', 'central')).toBe('1. Comunicar à central.');
    const texto = 'Preparar o equipamento.\n'.repeat(200);
    const trecho = trechoDaConsulta(texto, 'xyzqwerty');
    expect(trecho.startsWith('Preparar o equipamento.')).toBe(true);
    expect(trecho.endsWith('…')).toBe(true);
    expect(texto.startsWith(trecho.slice(0, -1))).toBe(true);
  });
});
