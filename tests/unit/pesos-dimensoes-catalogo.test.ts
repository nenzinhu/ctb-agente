import { listarConfiguracoes, obterConfiguracao } from '@/lib/pesos-dimensoes/catalogo';

describe('catálogo de pesos e dimensões', () => {
  it('oferece as configurações operacionais previstas', () => {
    const ids = listarConfiguracoes().map((item) => item.id);

    expect(ids).toEqual(expect.arrayContaining([
      'rigido-2-eixos',
      'truck-3-eixos',
      'bitruck-4-eixos',
      'cavalo-2s2',
      'cavalo-2s3',
      'cavalo-3s2',
      'cavalo-3s3',
      'cavalo-3s4',
      'caminhao-reboque',
      'bitrem-7-eixos',
      'rodotrem-9-eixos-aet',
      'especial-aet',
    ]));
  });

  it('mantém ids únicos, limites válidos e fontes rastreáveis', () => {
    const itens = listarConfiguracoes();
    expect(new Set(itens.map((item) => item.id)).size).toBe(itens.length);

    for (const item of itens) {
      expect(item.unidades).toBeGreaterThan(0);
      expect(item.gruposEixo.length).toBeGreaterThan(0);
      expect(item.gruposEixo.reduce((total, grupo) => total + grupo.quantidadeEixos, 0)).toBe(item.quantidadeEixos);
      if (item.limiteTotalKg !== null) expect(item.limiteTotalKg).toBeGreaterThan(0);
      expect(item.fontes.length).toBeGreaterThan(0);
      for (const fonte of item.fontes) {
        expect(fonte.documento).toBeTruthy();
        expect(fonte.artigo).toBeTruthy();
        expect(fonte.pagina).toBeGreaterThan(0);
      }
    }
  });

  it('não presume limite para configuração especial dependente de AET', () => {
    const especial = obterConfiguracao('especial-aet');
    expect(especial).toMatchObject({ requerAet: true, limiteTotalKg: null });
  });

  it('devolve null para configuração desconhecida', () => {
    expect(obterConfiguracao('nao-existe')).toBeNull();
  });
});
