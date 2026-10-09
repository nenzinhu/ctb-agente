import { calcularCapacidadeCarga, calcularLimite } from '@/lib/pesos-dimensoes/calculadora';
import { obterConfiguracao } from '@/lib/pesos-dimensoes/catalogo';

const truck = obterConfiguracao('truck-3-eixos')!;
const carreta = obterConfiguracao('cavalo-3s3')!;
const rodotrem = obterConfiguracao('rodotrem-9-eixos-aet')!;

describe('motor de limite regulamentar', () => {
  it('usa o menor limite entre legal, técnico, CMT e sinalização', () => {
    const resultado = calcularLimite({
      configuracao: carreta,
      taraKg: 15000,
      comprimentoM: 17,
      pbtTecnicoKg: 48000,
      cmtKg: 52000,
      limiteSinalizadoKg: 44000,
    });

    expect(resultado).toMatchObject({
      status: 'conclusivo',
      limiteKg: 44000,
      fatorDeterminante: 'sinalizacao',
      capacidadeCargaKg: 29000,
      faltantes: [],
    });
  });

  it('aceita valor exatamente igual ao limite legal sem acrescentar tolerância', () => {
    const resultado = calcularLimite({
      configuracao: truck,
      taraKg: 9000,
      comprimentoM: 12,
      pbtTecnicoKg: 23000,
    });

    expect(resultado.limiteKg).toBe(23000);
    expect(resultado.capacidadeCargaKg).toBe(14000);
  });

  it('reduz capacidade a zero quando a tara supera o limite', () => {
    expect(calcularCapacidadeCarga(23000, 24000)).toBe(0);
  });

  it('exige dados técnicos e rejeita valores negativos', () => {
    const resultado = calcularLimite({
      configuracao: truck,
      taraKg: -1,
      comprimentoM: 12,
    });

    expect(resultado.status).toBe('inconclusivo');
    expect(resultado.faltantes).toEqual(expect.arrayContaining(['tara válida', 'PBT/PBTC técnico']));
  });

  it('exige CMT para combinação articulada', () => {
    const resultado = calcularLimite({
      configuracao: carreta,
      taraKg: 15000,
      comprimentoM: 17,
      pbtTecnicoKg: 48500,
    });

    expect(resultado.status).toBe('inconclusivo');
    expect(resultado.faltantes).toContain('CMT da unidade tratora');
  });

  it('exige comprimento dentro da faixa da configuração', () => {
    const resultado = calcularLimite({
      configuracao: carreta,
      taraKg: 15000,
      comprimentoM: 15,
      pbtTecnicoKg: 48500,
      cmtKg: 50000,
    });

    expect(resultado.status).toBe('inconclusivo');
    expect(resultado.faltantes).toContain('comprimento compatível com a configuração');
  });

  it('usa o limite autorizado e exige AET quando obrigatória', () => {
    const semAet = calcularLimite({
      configuracao: rodotrem,
      taraKg: 25000,
      comprimentoM: 28,
      pbtTecnicoKg: 74000,
      cmtKg: 80000,
    });
    const comAet = calcularLimite({
      configuracao: rodotrem,
      taraKg: 25000,
      comprimentoM: 28,
      pbtTecnicoKg: 74000,
      cmtKg: 80000,
      limiteAetKg: 72000,
    });

    expect(semAet.faltantes).toContain('limite autorizado na AET');
    expect(comAet).toMatchObject({ status: 'conclusivo', limiteKg: 72000, fatorDeterminante: 'aet' });
  });
});
