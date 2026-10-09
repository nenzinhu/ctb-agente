import { calcularLimite } from '@/lib/pesos-dimensoes/calculadora';
import { obterConfiguracao } from '@/lib/pesos-dimensoes/catalogo';
import { avaliarFiscalizacao } from '@/lib/pesos-dimensoes/fiscalizacao';

function limiteTruck() {
  const configuracao = obterConfiguracao('truck-3-eixos')!;
  return calcularLimite({ configuracao, taraKg: 9000, comprimentoM: 10, pbtTecnicoKg: 23000 });
}

function limitePesado() {
  return {
    status: 'conclusivo' as const,
    limiteKg: 57000,
    fatorDeterminante: 'legal' as const,
    capacidadeCargaKg: 40000,
    faltantes: [],
    fontes: [{ documento: 'Resolução CONTRAN nº 882/2021', artigo: 'Art. 6º', pagina: 4 }],
  };
}

describe('fluxo integrado de pesos e dimensões', () => {
  it('avalia documento fiscal e balança regular', () => {
    expect(avaliarFiscalizacao({
      limite: limiteTruck(), modo: 'documento', taraKg: 9000, pesoCargaDocumentoKg: 14001,
    })).toMatchObject({ status: 'autuavel', codigos: ['683-11'], excessoTotalKg: 1 });

    expect(avaliarFiscalizacao({
      limite: limiteTruck(), modo: 'balanca', pesoTotalAferidoKg: 23000,
      gruposEixo: [
        { id: 'dianteiro', nome: 'Dianteiro', pesoKg: 6000, limiteLegalKg: 6000 },
        { id: 'traseiro', nome: 'Traseiro', pesoKg: 17000, limiteLegalKg: 17000 },
      ],
    }).status).toBe('regular');
  });

  it.each([
    [{ pesoTotalAferidoKg: 24300 }, '683-11'],
    [{ pesoTotalAferidoKg: 57000, gruposEixo: [{ id: 'e', nome: 'Eixo', pesoKg: 19200, limiteLegalKg: 17000 }] }, '683-12'],
    [{ pesoTotalAferidoKg: 61000, gruposEixo: [{ id: 'e', nome: 'Eixo', pesoKg: 19200, limiteLegalKg: 17000 }] }, '683-13'],
  ])('seleciona o enquadramento de peso %s', (dados, codigo) => {
    const base = codigo === '683-11' ? limiteTruck() : limitePesado();
    expect(avaliarFiscalizacao({ limite: base, modo: 'balanca', ...dados }).codigos).toContain(codigo);
  });

  it.each([
    [600, '688-20'],
    [601, '689-00'],
    [1001, '690-40'],
  ])('seleciona a faixa CMT para excesso de %i kg', (excesso, codigo) => {
    const resultado = avaliarFiscalizacao({
      limite: limitePesado(), modo: 'balanca', pesoTotalAferidoKg: 57000, cmtKg: 57000 - excesso,
    });
    expect(resultado.codigos).toContain(codigo);
  });

  it('não presume limite de rodotrem sem AET', () => {
    const configuracao = obterConfiguracao('rodotrem-9-eixos-aet')!;
    const resultado = calcularLimite({
      configuracao, taraKg: 20000, comprimentoM: 25, pbtTecnicoKg: 74000, cmtKg: 74000,
    });
    expect(resultado).toMatchObject({ status: 'inconclusivo', limiteKg: null });
    expect(resultado.faltantes).toContain('limite autorizado na AET');
  });
});
