import { segmentarReferenciasPop } from '@/lib/pop/referencias';

describe('referências entre POPs', () => {
  const catalogo = [
    { numero: '002', titulo: 'Busca pessoal' },
    { numero: '201.4.6', titulo: 'Violência doméstica' },
  ];

  it('identifica variações de referência somente quando o POP existe no catálogo', () => {
    expect(segmentarReferenciasPop('Aplicar o POP nº 002 e depois o pop 201.4.6.', catalogo)).toEqual([
      { tipo: 'texto', texto: 'Aplicar o ' },
      { tipo: 'referencia', texto: 'POP nº 002', numero: '002', titulo: 'Busca pessoal' },
      { tipo: 'texto', texto: ' e depois o ' },
      { tipo: 'referencia', texto: 'pop 201.4.6', numero: '201.4.6', titulo: 'Violência doméstica' },
      { tipo: 'texto', texto: '.' },
    ]);
  });

  it('mantém como texto uma numeração que não existe no catálogo', () => {
    expect(segmentarReferenciasPop('Consulte o POP 999.', catalogo)).toEqual([
      { tipo: 'texto', texto: 'Consulte o POP 999.' },
    ]);
  });

  it('reconhece as grafias abreviadas usadas no manual consolidado', () => {
    expect(segmentarReferenciasPop('Seguir o POP n. 002 e observar o POP nº201.4.6.', catalogo))
      .toEqual(expect.arrayContaining([
        { tipo: 'referencia', texto: 'POP n. 002', numero: '002', titulo: 'Busca pessoal' },
        { tipo: 'referencia', texto: 'POP nº201.4.6', numero: '201.4.6', titulo: 'Violência doméstica' },
      ]));
  });
});
