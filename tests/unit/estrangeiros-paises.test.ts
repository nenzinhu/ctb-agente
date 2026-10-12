import { buscarAcordosPais, descreverAcordosPais } from '@/lib/estrangeiros/paises';

describe('catálogo de tratados e reciprocidade', () => {
  it('identifica país com mais de um instrumento', () => {
    expect(buscarAcordosPais('motorista argentino')).toMatchObject({
      pais: 'Argentina',
      instrumentos: ['A', 'V'],
    });
    expect(descreverAcordosPais('AR')).toMatch(/RBUT.*Convenção de Viena/i);
  });

  it('distingue reciprocidade de Convenção de Viena', () => {
    expect(buscarAcordosPais('habilitação portuguesa')).toMatchObject({ pais: 'Portugal', instrumentos: ['R'] });
    expect(buscarAcordosPais('condutor alemão')).toMatchObject({ pais: 'Alemanha', instrumentos: ['V'] });
  });

  it('normaliza acentos, abreviações e variações usuais', () => {
    expect(buscarAcordosPais('rep checa')).toMatchObject({ pais: 'República Checa' });
    expect(buscarAcordosPais('guine bissau')).toMatchObject({ pais: 'Guiné-Bissau' });
  });

  it('não confirma país ausente ou texto ambíguo', () => {
    expect(buscarAcordosPais('país desconhecido')).toBeNull();
    expect(buscarAcordosPais('estrangeiro')).toBeNull();
    expect(buscarAcordosPais('condutor de país desconhecido')).toBeNull();
  });
});
