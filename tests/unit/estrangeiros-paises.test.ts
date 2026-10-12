import { buscarAcordosPais, descreverAcordosPais } from '@/lib/estrangeiros/paises';

describe('catálogo de tratados e reciprocidade', () => {
  it('identifica país com mais de um instrumento', () => {
    expect(buscarAcordosPais('motorista argentino')).toMatchObject({
      pais: 'Argentina',
      instrumentos: ['A'],
    });
    expect(descreverAcordosPais('AR')).toMatch(/outros tratados/i);
  });

  it('distingue reciprocidade de Convenção de Viena', () => {
    expect(buscarAcordosPais('habilitação portuguesa')).toMatchObject({ pais: 'Portugal', instrumentos: ['R', 'V'], pagina: 6 });
    expect(buscarAcordosPais('condutor alemão')).toMatchObject({ pais: 'Alemanha', instrumentos: ['V'] });
  });

  it('inclui países e territórios adicionais presentes no PDF do Denatran', () => {
    expect(buscarAcordosPais('condutor da Arábia Saudita')).toMatchObject({ pais: 'Arábia Saudita', instrumentos: ['V'] });
    expect(buscarAcordosPais('veículo de Anguilla')).toMatchObject({ pais: 'Anguilla', instrumentos: ['R'] });
    expect(buscarAcordosPais('habilitação do Vietnã')).toMatchObject({ pais: 'Vietnam', instrumentos: ['V'] });
  });

  it('normaliza acentos, abreviações e variações usuais', () => {
    expect(buscarAcordosPais('rep checa')).toMatchObject({ pais: 'República Checa' });
    expect(buscarAcordosPais('guine bissau')).toMatchObject({ pais: 'Guiné-Bissau' });
  });

  it('não confirma país ausente ou texto ambíguo', () => {
    expect(buscarAcordosPais('país desconhecido')).toBeNull();
    expect(buscarAcordosPais('estrangeiro')).toBeNull();
    expect(buscarAcordosPais('condutor de país desconhecido')).toBeNull();
    expect(buscarAcordosPais('ele irá dirigir no Brasil')).toBeNull();
  });
});
