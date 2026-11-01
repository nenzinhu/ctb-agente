import {
  classificarDominioConsulta,
  resolverDominioConsulta,
  type PredicaoModeloIntencao,
} from '@/lib/search/intent-specialist';
import { anonimizarConsultaIntencao, prepararExemploIntencao } from '@/lib/search/intent-feedback';
import { registrarExemploIntencao } from '@/lib/search/intent-feedback-store';

describe('modelo especializado em intenção', () => {
  it.each([
    ['art. 165-A do CTB', 'ctb'],
    ['mexendo no zap no volante', 'infracao'],
    ['qual o procedimento do baculejo', 'pop'],
    ['baculejo em fundada suspeita', 'pop'],
    ['qual natureza pra briga de vizinho', 'fato_pmsc'],
  ] as const)('classifica %s no domínio %s sem responder a questão', (consulta, dominio) => {
    expect(classificarDominioConsulta(consulta).dominio).toBe(dominio);
  });

  it('preserva identificadores oficiais mesmo quando o modelo sugere outro domínio', async () => {
    const modelo = async (): Promise<PredicaoModeloIntencao> => ({
      dominio: 'pop',
      confianca: 0.99,
      modelo: 'intent-small-v1',
    });

    await expect(resolverDominioConsulta('art. 165-A do CTB', modelo)).resolves.toMatchObject({
      dominio: 'ctb',
      fonte: 'regra',
    });
  });

  it.each([
    ['art. 165 durante abordagem', 'ctb'],
    ['POP 101 sobre som alto', 'pop'],
    ['516-91 em uma abordagem', 'infracao'],
  ] as const)('faz o identificador explícito vencer o vocabulário de %s', (consulta, dominio) => {
    expect(classificarDominioConsulta(consulta)).toMatchObject({ dominio, confianca: 1 });
  });

  it('usa o modelo pequeno somente para uma consulta ambígua com confiança suficiente', async () => {
    const modelo = async (): Promise<PredicaoModeloIntencao> => ({
      dominio: 'pop',
      confianca: 0.91,
      modelo: 'intent-small-v1',
    });

    await expect(resolverDominioConsulta('e nessa situação aí?', modelo)).resolves.toMatchObject({
      dominio: 'pop',
      confianca: 0.91,
      fonte: 'modelo_intencao',
      modelo: 'intent-small-v1',
    });
  });

  it('descarta uma predição fraca e mantém o fallback determinístico', async () => {
    const modelo = async (): Promise<PredicaoModeloIntencao> => ({
      dominio: 'fato_pmsc',
      confianca: 0.54,
      modelo: 'intent-small-v1',
    });

    await expect(resolverDominioConsulta('e nessa situação aí?', modelo)).resolves.toMatchObject({
      dominio: 'ctb',
      fonte: 'regra',
    });
  });
});

describe('base de treinamento de intenção', () => {
  it('remove nome, telefone formatado e e-mail da consulta de treinamento', () => {
    expect(anonimizarConsultaIntencao(
      'Maria Souza telefone (48) 99999-8888 email maria.souza@example.com quer saber do POP'
    )).toBe('[PESSOA] telefone [TELEFONE] email [EMAIL] quer saber do POP');
  });

  it('remove nome livre e IP digitados no relato', () => {
    expect(anonimizarConsultaIntencao(
      'João da Silva foi flagrado usando celular no IP 192.168.10.24'
    )).toBe('[PESSOA] foi flagrado usando celular no IP [IP]');
  });

  it.each([
    ['JOÃO DA SILVA foi flagrado usando celular', '[PESSOA] foi flagrado usando celular'],
    ['joão da silva foi flagrado usando celular', '[PESSOA] foi flagrado usando celular'],
    ['IP 2001:db8::1 durante abordagem', 'IP [IP] durante abordagem'],
  ])('anonimiza variação sensível: %s', (consulta, esperada) => {
    expect(anonimizarConsultaIntencao(consulta)).toBe(esperada);
  });

  it('remove RG e endereço escrito na consulta', () => {
    expect(anonimizarConsultaIntencao(
      'RG 12.345.678-9 mora na Rua das Flores, 123; dúvida sobre infração'
    )).toBe('RG [RG] mora na [ENDERECO]; dúvida sobre infração');
  });

  it('gera exemplo anônimo, sem IP e sem guardar conteúdo oficial como resposta', () => {
    const exemplo = prepararExemploIntencao({
      consulta: 'placa ABC1D23, João Silva CPF 123.456.789-00 mexendo no zap',
      classificacao: { dominio: 'infracao', confianca: 0.88, fonte: 'regra', sinais: ['giria_transito'] },
      resultados: [{ tipo: 'ficha_mbft', id: '736-62' }],
      ip: '10.0.0.9',
    });

    expect(exemplo.consultaAnonimizada).toBe('placa ****, [PESSOA] CPF ***-**** mexendo no zap');
    expect(exemplo.hashConsulta).toMatch(/^[a-f0-9]{64}$/);
    expect(exemplo.resultados).toEqual([{ tipo: 'ficha_mbft', id: '736-62' }]);
    expect(JSON.stringify(exemplo)).not.toContain('10.0.0.9');
    expect(JSON.stringify(exemplo)).not.toContain('textoOficial');
  });

  it('persiste somente metadados anônimos e referências recuperadas', async () => {
    let linhaGravada: Record<string, unknown> | null = null;
    const persistir = async (linha: Record<string, unknown>) => {
      linhaGravada = linha;
      return 'exemplo-1';
    };

    const id = await registrarExemploIntencao({
      consulta: 'CPF 123.456.789-00, qual artigo?',
      classificacao: { dominio: 'ctb', confianca: 0.8, fonte: 'regra', sinais: ['vocabulario_ctb'] },
      resultados: [{ tipo: 'artigo_ctb', id: 'art. 165' }],
      ip: '192.0.2.10',
    }, persistir);

    expect(id).toBe('exemplo-1');
    expect(linhaGravada).toMatchObject({
      consulta_anonimizada: 'CPF ***-****, qual artigo?',
      dominio_previsto: 'ctb',
      resultados: [{ tipo: 'artigo_ctb', id: 'art. 165' }],
      revisada: false,
    });
    expect(JSON.stringify(linhaGravada)).not.toContain('192.0.2.10');
  });

  it('não derruba a consulta quando a coleta estiver indisponível', async () => {
    const persistir = async () => { throw new Error('banco indisponível'); };
    await expect(registrarExemploIntencao({
      consulta: 'usar algema',
      classificacao: { dominio: 'pop', confianca: 0.84, fonte: 'regra', sinais: [] },
    }, persistir)).resolves.toBeNull();
  });
});
