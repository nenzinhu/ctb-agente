import { ACERVO, lerAcervo } from '@/lib/ingestion/acervo';

describe('acervo da Lista de Fatos PMSC Mobile', () => {
  it('oferece o catálogo estruturado para indexação na coleção própria', () => {
    const item = ACERVO.find((entrada) => entrada.id === 'fatos-pmsc-mobile');
    expect(item).toMatchObject({
      colecao: 'natureza_potencial',
      paginas: 23,
      fonteOficial: 'PMSC Mobile',
      versao: 'Lista atualizada em 10/06/2019',
      vigenteDesde: '2019-06-10',
      conferidoEm: '2026-10-10',
      situacao: 'vigente',
    });
    expect(lerAcervo(item!)).toContain('Natureza: Perturbação do trabalho ou sossego alheios');
  });

  it('oferece a Resolução CONTRAN 882 para o RAG de pesos e dimensões', () => {
    const item = ACERVO.find((entrada) => entrada.id === 'resolucao-contran-882-2021');

    expect(item).toMatchObject({
      colecao: 'ctb',
      normaId: 'contran-res-882-2021',
      documentType: 'resolucao',
      paginas: 27,
      dataPublicacao: '2021-12-24T00:00:00.000Z',
      dataVigenciaInicio: '2022-01-03T00:00:00.000Z',
      fonteOficial:
        'https://www.in.gov.br/en/web/dou/-/resolucao-contran-n-882-de-13-de-dezembro-de-2021-370017699',
      versao: 'Publicada no DOU em 24/12/2021',
      vigenteDesde: '2022-01-03',
      conferidoEm: '2026-10-10',
      situacao: 'vigente',
    });
    expect(lerAcervo(item!)).toContain('Art. 65. Esta Resolução entra em vigor em 3 de janeiro de 2022.');
  });
});
