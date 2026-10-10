import { avaliarFiscalizacao } from '@/lib/pesos-dimensoes/fiscalizacao';
import type { ResultadoLimite } from '@/lib/pesos-dimensoes/calculadora';

function limite(limiteKg = 23000): ResultadoLimite {
  return {
    status: 'conclusivo',
    limiteKg,
    fatorDeterminante: 'legal',
    capacidadeCargaKg: limiteKg - 9000,
    faltantes: [],
    fontes: [{ documento: 'Resolução CONTRAN nº 882/2021', artigo: 'Art. 6º', pagina: 3 }],
  };
}

describe('fiscalização de pesos', () => {
  it('soma tara e carga da nota sem aplicar tolerância', () => {
    const resultado = avaliarFiscalizacao({
      limite: limite(),
      modo: 'documento',
      taraKg: 10000,
      pesoCargaDocumentoKg: 13001,
      quantidadeEmbarcadores: 1,
    });

    expect(resultado).toMatchObject({
      status: 'autuavel',
      pesoApuradoKg: 23001,
      excessoTotalKg: 1,
      codigos: ['683-11'],
      valorPesoCentavos: 13548,
      responsavelProvavel: 'Embarcador e transportador, solidariamente',
      memoriaPeso: '10.000 kg de tara + 13.001 kg de carga declarada = 23.001 kg de PBT apurado',
      alertaDocumento: null,
    });
  });

  it('usa diretamente o PBT declarado no documento sem somar a tara novamente', () => {
    const resultado = avaliarFiscalizacao({
      limite: limite(),
      modo: 'documento',
      tipoPesoDocumento: 'peso-bruto-total',
      taraKg: 10000,
      pesoBrutoTotalDocumentoKg: 23001,
    });

    expect(resultado).toMatchObject({
      status: 'autuavel',
      pesoApuradoKg: 23001,
      excessoTotalKg: 1,
      codigos: ['683-11'],
      memoriaPeso: '23.001 kg de peso bruto total declarado = 23.001 kg de PBT apurado',
    });
    expect(resultado.alertaDocumento).toMatch(/peso da carga.*quilogramas.*autuação/i);
  });

  it('não conclui a forma PBT declarado quando o peso bruto total estiver ausente', () => {
    const resultado = avaliarFiscalizacao({
      limite: limite(),
      modo: 'documento',
      tipoPesoDocumento: 'peso-bruto-total',
      taraKg: 10000,
    });

    expect(resultado.status).toBe('inconclusivo');
    expect(resultado.faltantes).toContain('peso bruto total em kg no documento');
  });

  it('mantém o peso exatamente no limite sem autuação', () => {
    const resultado = avaliarFiscalizacao({
      limite: limite(),
      modo: 'documento',
      taraKg: 10000,
      pesoCargaDocumentoKg: 13000,
    });
    expect(resultado.status).toBe('regular');
    expect(resultado.codigos).toEqual([]);
  });

  it('não conclui documento sem peso da carga ou tara', () => {
    const resultado = avaliarFiscalizacao({ limite: limite(), modo: 'documento' });
    expect(resultado.status).toBe('inconclusivo');
    expect(resultado.faltantes).toEqual(expect.arrayContaining(['tara do veículo', 'peso da carga em kg no documento']));
    expect(resultado.providencias.join(' ')).toMatch(/pesagem|documento substituto/i);
  });

  it('aplica 5% somente como tolerância de balança', () => {
    const noLimite = avaliarFiscalizacao({ limite: limite(), modo: 'balanca', pesoTotalAferidoKg: 24150 });
    const passou = avaliarFiscalizacao({ limite: limite(), modo: 'balanca', pesoTotalAferidoKg: 24151 });

    expect(noLimite).toMatchObject({ status: 'dentro-tolerancia', excessoTotalKg: 0, limiteFiscalizacaoKg: 24150 });
    expect(passou).toMatchObject({ status: 'autuavel', excessoTotalKg: 1, codigos: ['683-11'] });
  });

  it('não autua eixo isoladamente em veículo até 50 t quando o total não supera 5%', () => {
    const resultado = avaliarFiscalizacao({
      limite: limite(),
      modo: 'balanca',
      pesoTotalAferidoKg: 23000,
      gruposEixo: [{ id: 'traseiro', nome: 'Traseiro', pesoKg: 12000, limiteLegalKg: 10000 }],
    });
    expect(resultado.codigos).toEqual([]);
    expect(resultado.excessoEixosKg).toBe(0);
  });

  it('usa 683-13 quando total e eixo superam as tolerâncias', () => {
    const resultado = avaliarFiscalizacao({
      limite: limite(),
      modo: 'balanca',
      pesoTotalAferidoKg: 24350,
      gruposEixo: [{ id: 'traseiro', nome: 'Traseiro', pesoKg: 11600, limiteLegalKg: 10000 }],
    });
    expect(resultado).toMatchObject({ excessoTotalKg: 200, excessoEixosKg: 350, codigos: ['683-13'] });
    expect(resultado.valorPesoCentavos).toBe(14612);
  });

  it('usa 683-12 para excesso apenas por eixo quando o limite total supera 50 t', () => {
    const resultado = avaliarFiscalizacao({
      limite: limite(57000),
      modo: 'balanca',
      pesoTotalAferidoKg: 57000,
      gruposEixo: [{ id: 'tandem', nome: 'Tandem', pesoKg: 19200, limiteLegalKg: 17000 }],
    });
    expect(resultado).toMatchObject({ excessoTotalKg: 0, excessoEixosKg: 75, codigos: ['683-12'] });
  });

  it.each([
    [600, '688-20', 13016],
    [601, '689-00', 19523],
    [1001, '690-40', 88041],
  ])('enquadra excesso de CMT de %i kg', (excesso, codigo, valorCmtCentavos) => {
    const resultado = avaliarFiscalizacao({
      limite: limite(57000),
      modo: 'balanca',
      pesoTotalAferidoKg: 57000,
      cmtKg: 57000 - excesso,
    });
    expect(resultado.codigos).toContain(codigo);
    expect(resultado.valorCmtCentavos).toBe(valorCmtCentavos);
  });

  it('indica transportador quando há vários embarcadores', () => {
    const resultado = avaliarFiscalizacao({
      limite: limite(),
      modo: 'balanca',
      pesoTotalAferidoKg: 25000,
      quantidadeEmbarcadores: 2,
    });
    expect(resultado.responsavelProvavel).toBe('Transportador');
    expect(resultado.providencias.join(' ')).toMatch(/retenção|transbordo/i);
  });
});
