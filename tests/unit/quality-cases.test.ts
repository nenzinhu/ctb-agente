/** @jest-environment node */

import { carregarCasosBusca, validarCasosBusca } from '@/lib/quality/cases';

describe('casos de referência da busca', () => {
  it('tem identificadores únicos e cobre linguagem operacional', () => {
    const casos = carregarCasosBusca();
    expect(casos.length).toBeGreaterThanOrEqual(15);
    expect(new Set(casos.map((caso) => caso.id)).size).toBe(casos.length);
    const categorias = new Set(casos.map((caso) => caso.categoria));
    for (const categoria of ['codigo', 'artigo', 'frase', 'abreviacao', 'fragmento', 'erro', 'sinonimo', 'giria']) {
      expect(categorias).toContain(categoria);
    }
  });

  it('inclui os exemplos cirúrgicos aprovados', () => {
    const casos = carregarCasosBusca();
    expect(casos).toEqual(expect.arrayContaining([
      expect.objectContaining({ colecao: 'mbft', consulta: '516-91', esperados: ['516-91'] }),
      expect.objectContaining({ colecao: 'mbft', consulta: 'capac', esperados: ['703-01'], comparacao: 'prefixo' }),
      expect.objectContaining({ colecao: 'pop', consulta: 'alguema', esperados: ['003'] }),
      expect.objectContaining({ colecao: 'ctb', consulta: 'recusa bafômetro', esperados: ['art. 165-A'] }),
    ]));
  });

  it('rejeita IDs duplicados indicando o registro', () => {
    const caso = carregarCasosBusca()[0];
    expect(() => validarCasosBusca([caso, caso])).toThrow(new RegExp(`caso duplicado.*${caso.id}`, 'i'));
  });
});
