import { ACERVO, lerAcervo } from '@/lib/ingestion/acervo';

describe('acervo da Lista de Fatos PMSC Mobile', () => {
  it('oferece o catálogo estruturado para indexação na coleção própria', () => {
    const item = ACERVO.find((entrada) => entrada.id === 'fatos-pmsc-mobile');
    expect(item).toMatchObject({ colecao: 'natureza_potencial', paginas: 23 });
    expect(lerAcervo(item!)).toContain('Natureza: Perturbação do trabalho ou sossego alheios');
  });
});
