/** @jest-environment node */

import { carregarFontesLocais, validarFontesLocais } from '@/lib/quality/manifest';

describe('manifesto das fontes locais', () => {
  it('tem exatamente um registro para CTB, MBFT e POP', () => {
    const fontes = carregarFontesLocais();
    expect(fontes).toHaveLength(3);
    expect(fontes.map((fonte) => fonte.colecao).sort()).toEqual(['ctb', 'mbft', 'pop']);
    expect(new Set(fontes.map((fonte) => fonte.arquivo)).size).toBe(3);
  });

  it('não inventa versão nem datas desconhecidas', () => {
    const fontes = carregarFontesLocais();
    const desconhecidas = fontes.filter((fonte) => fonte.colecao !== 'ctb');
    expect(desconhecidas).toHaveLength(2);
    for (const fonte of desconhecidas) {
      expect(fonte.versao).toBe('não informado');
      expect(fonte.vigenteDesde).toBeNull();
      expect(fonte.conferidoEm).toBeNull();
      expect(fonte.situacao).toBe('revisar');
    }
  });

  it('rejeita coleções duplicadas com erro em português', () => {
    const fonte = carregarFontesLocais()[0];
    expect(() => validarFontesLocais([fonte, fonte])).toThrow(/coleção duplicada.*ctb/i);
  });
});
