/** @jest-environment node */

import { DEFAULT_MIN_CHUNK_CHARS } from '@/lib/ingestion/chunker';
import { analisarItensLocais } from '@/lib/quality/integrity';

describe('integridade do corpus local', () => {
  it('conta vazios, curtos, sem estrutura e duplicidades normalizadas', () => {
    const textoValido = 'Abordagem operacional com conteúdo oficial suficiente.';
    const resultado = analisarItensLocais([
      { id: 'a', texto: '   ', estruturado: true },
      { id: 'b', texto: 'x'.repeat(DEFAULT_MIN_CHUNK_CHARS - 1), estruturado: true },
      { id: 'c', texto: textoValido, estruturado: false },
      { id: 'd', texto: textoValido, estruturado: true },
      { id: 'd', texto: `  ${textoValido.toUpperCase()}  `, estruturado: true },
    ]);

    expect(resultado).toEqual({
      itens: 5,
      vazios: 1,
      curtos: 1,
      semEstrutura: 1,
      duplicados: 2,
      invalidos: 3,
    });
  });

  it('aprova um conjunto estruturado e único', () => {
    expect(analisarItensLocais([
      { id: '1', texto: 'Primeiro trecho oficial com tamanho suficiente.', estruturado: true },
      { id: '2', texto: 'Segundo trecho oficial com conteúdo diferente.', estruturado: true },
    ])).toMatchObject({ invalidos: 0, duplicados: 0 });
  });
});
