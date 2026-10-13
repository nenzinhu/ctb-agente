import {
  ConteudoApostilaExcessivo,
  MAX_CARACTERES_APOSTILA,
  MAX_CARACTERES_PARTE,
  prepararPartesApostila,
} from '@/lib/apostila/conteudo';
import type { TrechoApostila } from '@/lib/apostila/tipos';

const trecho = (texto: string, pagina: number | null, ordem: number, secao = 'Seção'): TrechoApostila => ({
  id: `t-${ordem}`,
  documentoId: 'doc-1',
  secao,
  pagina,
  ordem,
  texto,
});

describe('preparação do conteúdo da apostila', () => {
  it('mantém ordem, páginas e seções ao agrupar trechos', () => {
    const partes = prepararPartesApostila([
      trecho('Conteúdo da página dois.', 2, 2, 'B'),
      trecho('Conteúdo da página um.', 1, 1, 'A'),
      trecho('Complemento.', 2, 3, 'B'),
    ]);
    expect(partes).toHaveLength(1);
    expect(partes[0]).toMatchObject({ indice: 0, paginas: [1, 2], secoes: ['A', 'B'] });
    expect(partes[0].texto.indexOf('página um')).toBeLessThan(partes[0].texto.indexOf('página dois'));
  });

  it('divide conteúdo grande sem ultrapassar seis mil caracteres por parte', () => {
    const partes = prepararPartesApostila([trecho(`${'A'.repeat(3_500)}\n${'B'.repeat(3_500)}`, 7, 1)]);
    expect(partes).toHaveLength(2);
    expect(partes.every((parte) => parte.texto.length <= MAX_CARACTERES_PARTE)).toBe(true);
    expect(partes.every((parte) => parte.paginas[0] === 7)).toBe(true);
  });

  it('recusa conteúdo acima do limite sem truncar', () => {
    expect(() => prepararPartesApostila([
      trecho('X'.repeat(MAX_CARACTERES_APOSTILA + 1), 1, 1),
    ])).toThrow(ConteudoApostilaExcessivo);
  });

  it('não cria partes vazias', () => {
    expect(prepararPartesApostila([trecho('   ', 1, 1)])).toEqual([]);
  });
});
