import { FONTES_ESTRANGEIROS, buscarTrechosEstrangeiros } from '@/lib/estrangeiros/acervo';

describe('acervo oficial de estrangeiros', () => {
  it('anexa somente os dois PDFs íntegros com origem oficial e revisão explícita', () => {
    expect(FONTES_ESTRANGEIROS).toHaveLength(2);
    expect(FONTES_ESTRANGEIROS).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'resolucao-contran-933-2022', arquivo: '/documentos/estrangeiros/resolucao-contran-933-2022.pdf' }),
      expect.objectContaining({ id: 'decreto-86714-1981', arquivo: '/documentos/estrangeiros/decreto-86714-1981.pdf' }),
    ]));
    expect(FONTES_ESTRANGEIROS.every((fonte) => fonte.urlOficial.startsWith('https://'))).toBe(true);
  });

  it('recupera o prazo e os documentos da Resolução 933 sem inventar países', () => {
    const resultados = buscarTrechosEstrangeiros('estrangeiro pode dirigir 180 dias quais documentos');
    expect(resultados[0]).toMatchObject({ fonteId: 'resolucao-contran-933-2022', referencia: 'Art. 2º' });
    expect(resultados[0].texto).toMatch(/180.*dias/i);
    expect(resultados[0].texto).toMatch(/habilitação estrangeira/i);
  });

  it('recupera os artigos 41 e 42 da Convenção por referência exata', () => {
    expect(buscarTrechosEstrangeiros('artigo 41 habilitação internacional')[0]).toMatchObject({
      fonteId: 'decreto-86714-1981',
      referencia: 'Art. 41',
    });
    expect(buscarTrechosEstrangeiros('artigo 42 suspensão documento')[0]).toMatchObject({
      fonteId: 'decreto-86714-1981',
      referencia: 'Art. 42',
    });
  });
});
