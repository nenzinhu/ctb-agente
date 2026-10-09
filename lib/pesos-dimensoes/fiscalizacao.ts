import type { ResultadoLimite } from './calculadora';
import type { FontePeso } from './types';

export type ModoFiscalizacao = 'documento' | 'balanca';
export type StatusFiscalizacao = 'regular' | 'dentro-tolerancia' | 'autuavel' | 'inconclusivo';

export interface AfericaoGrupoEixo {
  id: string;
  nome: string;
  pesoKg: number;
  limiteLegalKg: number;
  limiteTecnicoKg?: number;
}

export interface EntradaFiscalizacao {
  limite: ResultadoLimite;
  modo: ModoFiscalizacao;
  taraKg?: number;
  pesoCargaDocumentoKg?: number;
  pesoTotalAferidoKg?: number;
  gruposEixo?: AfericaoGrupoEixo[];
  cmtKg?: number;
  quantidadeEmbarcadores?: number;
}

export interface ResultadoFiscalizacao {
  status: StatusFiscalizacao;
  pesoApuradoKg: number | null;
  limiteFiscalizacaoKg: number | null;
  excessoTotalKg: number;
  excessoEixosKg: number;
  excessoCmtKg: number;
  codigos: string[];
  valorPesoCentavos: number;
  valorCmtCentavos: number;
  valorTotalCentavos: number;
  responsavelProvavel: string | null;
  providencias: string[];
  faltantes: string[];
  fontes: FontePeso[];
}

const MULTA_MEDIA_CENTAVOS = 13016;
const MULTA_GRAVISSIMA_CENTAVOS = 29347;

const FONTES_FISCALIZACAO: FontePeso[] = [
  { documento: 'Resolução CONTRAN nº 882/2021', artigo: 'Arts. 49 e 50', pagina: 18 },
  { documento: 'Resolução CONTRAN nº 882/2021', artigo: 'Arts. 55 a 57', pagina: 20 },
  { documento: 'Código de Trânsito Brasileiro', artigo: 'Arts. 231, V, e 257', pagina: 0 },
];

function positivo(valor: number | undefined): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
}

function naoNegativo(valor: number | undefined): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
}

function aliquotaPorFracaoCentavos(excessoKg: number): number {
  if (excessoKg <= 600) return 532;
  if (excessoKg <= 800) return 1064;
  if (excessoKg <= 1000) return 2128;
  if (excessoKg <= 3000) return 3192;
  if (excessoKg <= 5000) return 4256;
  return 5320;
}

function acrescimoPesoCentavos(excessoKg: number): number {
  if (excessoKg <= 0) return 0;
  return Math.ceil(excessoKg / 200) * aliquotaPorFracaoCentavos(excessoKg);
}

function multaCmt(excessoKg: number): { codigo: string; valorCentavos: number } | null {
  if (excessoKg <= 0) return null;
  if (excessoKg <= 600) return { codigo: '688-20', valorCentavos: MULTA_MEDIA_CENTAVOS };
  if (excessoKg <= 1000) return { codigo: '689-00', valorCentavos: 19523 };
  return {
    codigo: '690-40',
    valorCentavos: Math.ceil(excessoKg / 500) * MULTA_GRAVISSIMA_CENTAVOS,
  };
}

function resultadoInconclusivo(
  entrada: EntradaFiscalizacao,
  faltantes: string[],
  providencias: string[],
): ResultadoFiscalizacao {
  return {
    status: 'inconclusivo',
    pesoApuradoKg: null,
    limiteFiscalizacaoKg: entrada.limite.limiteKg,
    excessoTotalKg: 0,
    excessoEixosKg: 0,
    excessoCmtKg: 0,
    codigos: [],
    valorPesoCentavos: 0,
    valorCmtCentavos: 0,
    valorTotalCentavos: 0,
    responsavelProvavel: null,
    providencias,
    faltantes,
    fontes: [...entrada.limite.fontes, ...FONTES_FISCALIZACAO],
  };
}

function determinarResponsavel(
  entrada: EntradaFiscalizacao,
  excessoEixosKg: number,
  excessoCmtKg: number,
): string {
  if ((entrada.quantidadeEmbarcadores ?? 0) > 1 || excessoEixosKg > 0 || excessoCmtKg > 0) {
    return 'Transportador';
  }
  if (entrada.modo === 'documento') return 'Embarcador e transportador, solidariamente';
  return 'Responsabilidade a confirmar conforme o documento fiscal e o art. 257 do CTB';
}

export function avaliarFiscalizacao(entrada: EntradaFiscalizacao): ResultadoFiscalizacao {
  const limiteInformadoKg = entrada.limite.limiteKg;
  if (
    entrada.limite.status === 'inconclusivo' ||
    typeof limiteInformadoKg !== 'number' ||
    !Number.isFinite(limiteInformadoKg) ||
    limiteInformadoKg <= 0
  ) {
    return resultadoInconclusivo(
      entrada,
      entrada.limite.faltantes.length > 0 ? entrada.limite.faltantes : ['limite regulamentar conclusivo'],
      ['Complete os dados técnicos e regulamentares antes de definir a autuação.'],
    );
  }

  const limiteKg = limiteInformadoKg;
  let pesoApuradoKg: number;
  let limiteFiscalizacaoKg: number;

  if (entrada.modo === 'documento') {
    const faltantes: string[] = [];
    if (!positivo(entrada.taraKg)) faltantes.push('tara do veículo');
    if (!naoNegativo(entrada.pesoCargaDocumentoKg)) faltantes.push('peso da carga em kg no documento');
    if (faltantes.length > 0) {
      return resultadoInconclusivo(entrada, faltantes, [
        'Encaminhar o veículo para pesagem quando houver equipamento disponível.',
        'Solicitar documento fiscal substituto com o peso da carga expresso em quilogramas.',
      ]);
    }
    pesoApuradoKg = entrada.taraKg! + entrada.pesoCargaDocumentoKg!;
    limiteFiscalizacaoKg = limiteKg;
  } else {
    if (!positivo(entrada.pesoTotalAferidoKg)) {
      return resultadoInconclusivo(entrada, ['peso total aferido na balança'], [
        'Informe o peso total indicado por equipamento regulamentado.',
      ]);
    }
    pesoApuradoKg = entrada.pesoTotalAferidoKg;
    limiteFiscalizacaoKg = limiteKg * 1.05;
  }

  const excessoTotalKg = Math.max(0, pesoApuradoKg - limiteFiscalizacaoKg);
  const permiteFiscalizarEixos = entrada.modo === 'balanca' && (limiteKg > 50000 || excessoTotalKg > 0);
  const excessoEixosKg = permiteFiscalizarEixos
    ? (entrada.gruposEixo ?? []).reduce((total, grupo) => {
        const limiteBase = positivo(grupo.limiteTecnicoKg)
          ? Math.min(grupo.limiteLegalKg, grupo.limiteTecnicoKg)
          : grupo.limiteLegalKg;
        const limiteComTolerancia = limiteBase * 1.125;
        return total + Math.max(0, grupo.pesoKg - limiteComTolerancia);
      }, 0)
    : 0;

  const excessoCmtKg = positivo(entrada.cmtKg) ? Math.max(0, pesoApuradoKg - entrada.cmtKg) : 0;
  const codigos: string[] = [];
  if (excessoTotalKg > 0 && excessoEixosKg > 0) codigos.push('683-13');
  else if (excessoTotalKg > 0) codigos.push('683-11');
  else if (excessoEixosKg > 0) codigos.push('683-12');

  const temExcessoPeso = excessoTotalKg > 0 || excessoEixosKg > 0;
  const valorPesoCentavos = temExcessoPeso
    ? MULTA_MEDIA_CENTAVOS + acrescimoPesoCentavos(excessoTotalKg) + acrescimoPesoCentavos(excessoEixosKg)
    : 0;
  const enquadramentoCmt = multaCmt(excessoCmtKg);
  if (enquadramentoCmt) codigos.push(enquadramentoCmt.codigo);
  const valorCmtCentavos = enquadramentoCmt?.valorCentavos ?? 0;
  const autuavel = codigos.length > 0;
  const dentroTolerancia = entrada.modo === 'balanca' && pesoApuradoKg > limiteKg && !autuavel;
  const providencias: string[] = [];

  if (autuavel) {
    providencias.push('Efetuar a autuação após conferir placa, documentos, equipamento e enquadramento.');
    if (excessoEixosKg > 0) {
      providencias.push('Reter para remanejamento da carga ou transbordo até cessar o excesso por eixo.');
    } else {
      providencias.push('Reter para transbordo da carga excedente antes de prosseguir a viagem.');
    }
  }

  return {
    status: autuavel ? 'autuavel' : dentroTolerancia ? 'dentro-tolerancia' : 'regular',
    pesoApuradoKg,
    limiteFiscalizacaoKg,
    excessoTotalKg,
    excessoEixosKg,
    excessoCmtKg,
    codigos,
    valorPesoCentavos,
    valorCmtCentavos,
    valorTotalCentavos: valorPesoCentavos + valorCmtCentavos,
    responsavelProvavel: autuavel ? determinarResponsavel(entrada, excessoEixosKg, excessoCmtKg) : null,
    providencias,
    faltantes: [],
    fontes: [...entrada.limite.fontes, ...FONTES_FISCALIZACAO],
  };
}
