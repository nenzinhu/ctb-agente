import { filterPII } from '@/lib/query/pii-filter';

describe('filterPII', () => {
  it('masks old and Mercosul plates', () => {
    expect(filterPII('placa ABC-1234 e abc1234')).toBe('placa **** e ****');
    expect(filterPII('veículo ABC1D23 parado')).toBe('veículo **** parado');
  });

  it('masks CPF and CNPJ', () => {
    expect(filterPII('CPF 123.456.789-09')).toBe('CPF ***-****');
    expect(filterPII('CNPJ 12.345.678/0001-90')).toBe('CNPJ ****-****');
  });

  it('keeps legal references and MBFT codes', () => {
    expect(filterPII('art. 165 do CTB, código 516-91, Lei 9.503')).toBe('art. 165 do CTB, código 516-91, Lei 9.503');
  });
});
