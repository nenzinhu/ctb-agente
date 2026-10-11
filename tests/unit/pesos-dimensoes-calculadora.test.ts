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

  it('calcula só com o desenho escolhido e rejeita valores negativos', () => {
    // O catálogo já traz o limite legal da configuração: tara, comprimento,
    // CMT e sinalização são opcionais e só estreitam o limite quando informados.
    const doDesenho = calcularLimite({ configuracao: truck });

    expect(doDesenho).toMatchObject({
      status: 'conclusivo',
      limiteKg: 23000,
      fatorDeterminante: 'legal',
      capacidadeCargaKg: null,
      faltantes: [],
    });

    const negativo = calcularLimite({ configuracao: truck, taraKg: -1 });

    expect(negativo.status).toBe('inconclusivo');
    expect(negativo.faltantes).toContain('tara válida');
  });

  it('usa o PBT/PBTC informado e a CMT quando eles estreitam o limite legal', () => {
    const semCmt = calcularLimite({ configuracao: carreta, pbtTecnicoKg: 45000 });
    expect(semCmt).toMatchObject({ status: 'conclusivo', limiteKg: 45000, fatorDeterminante: 'tecnico' });

    const comCmt = calcularLimite({ configuracao: carreta, pbtTecnicoKg: 48500, cmtKg: 40000 });
    expect(comCmt).toMatchObject({ status: 'conclusivo', limiteKg: 40000, fatorDeterminante: 'cmt' });
  });

  it('só questiona o comprimento quando ele é informado fora da faixa', () => {
    const fora = calcularLimite({ configuracao: carreta, comprimentoM: 15 });
    expect(fora.status).toBe('inconclusivo');
    expect(fora.faltantes).toContain('comprimento compatível com a configuração');

    const dentro = calcularLimite({ configuracao: carreta, comprimentoM: 17 });
    expect(dentro).toMatchObject({ status: 'conclusivo', limiteKg: 48500 });
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
