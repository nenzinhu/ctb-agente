import { extractArtigo, porOrdem } from '@/lib/db/queries';
import type { Dispositivo } from '@/lib/db/schema';

function dispositivo(numero_dispositivo: string, ordem?: number): Dispositivo {
  return { numero_dispositivo, ordem } as unknown as Dispositivo;
}

const rotulos = (lista: Dispositivo[]) => lista.map((d) => d.numero_dispositivo);

describe('porOrdem', () => {
  it('reads search results (no order column) in the law order', () => {
    const lista = [dispositivo('art. 165-B'), dispositivo('art. 166'), dispositivo('art. 165-A'), dispositivo('art. 165')];

    expect(rotulos(lista.sort(porOrdem))).toEqual(['art. 165', 'art. 165-A', 'art. 165-B', 'art. 166']);
  });

  it('compares article numbers as numbers, not text', () => {
    const lista = [dispositivo('art. 181'), dispositivo('art. 18'), dispositivo('art. 1º')];

    expect(rotulos(lista.sort(porOrdem))).toEqual(['art. 1º', 'art. 18', 'art. 181']);
  });

  it('prefers the stored order, then the excerpt that opens the article', () => {
    const lista = [dispositivo('art. 181 XVII', 12), dispositivo('art. 181', 10), dispositivo('art. 181', 11)];

    expect(lista.sort(porOrdem).map((d) => (d as Dispositivo & { ordem: number }).ordem)).toEqual([10, 11, 12]);
    expect(rotulos([dispositivo('art. 181 XVII'), dispositivo('art. 181')].sort(porOrdem))).toEqual([
      'art. 181',
      'art. 181 XVII',
    ]);
  });

  it('puts labels without an article number last', () => {
    const lista = [dispositivo('Anexo I — condutor'), dispositivo('art. 280')];

    expect(rotulos(lista.sort(porOrdem))).toEqual(['art. 280', 'Anexo I — condutor']);
  });
});

describe('extractArtigo', () => {
  it('keeps the letter suffix and ignores the rest of the reference', () => {
    expect(extractArtigo('Art. 165-A do CTB')).toBe('art. 165-a');
    expect(extractArtigo('art. 181, inciso XVII')).toBe('art. 181');
    expect(extractArtigo('sem artigo')).toBeNull();
  });
});
