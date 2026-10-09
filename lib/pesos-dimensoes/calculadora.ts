import type { ConfiguracaoVeiculo, FontePeso } from './types';

export type FatorLimite = 'legal' | 'tecnico' | 'cmt' | 'sinalizacao' | 'aet';

export interface EntradaLimite {
  configuracao: ConfiguracaoVeiculo;
  taraKg?: number;
  comprimentoM?: number;
  pbtTecnicoKg?: number;
  cmtKg?: number;
  limiteSinalizadoKg?: number;
  limiteAetKg?: number;
}

export interface ResultadoLimite {
  status: 'conclusivo' | 'inconclusivo';
  limiteKg: number | null;
  fatorDeterminante: FatorLimite | null;
  capacidadeCargaKg: number | null;
  faltantes: string[];
  fontes: FontePeso[];
}

function positivo(valor: number | undefined): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
}

export function calcularCapacidadeCarga(limiteKg: number, taraKg: number): number {
  if (!Number.isFinite(limiteKg) || !Number.isFinite(taraKg)) return 0;
  return Math.max(0, limiteKg - taraKg);
}

export function calcularLimite(entrada: EntradaLimite): ResultadoLimite {
  const { configuracao } = entrada;
  const faltantes: string[] = [];

  if (!positivo(entrada.taraKg)) faltantes.push('tara válida');
  if (!positivo(entrada.pbtTecnicoKg)) faltantes.push('PBT/PBTC técnico');
  if (configuracao.unidades > 1 && !positivo(entrada.cmtKg)) faltantes.push('CMT da unidade tratora');
  if (configuracao.requerAet && !positivo(entrada.limiteAetKg)) faltantes.push('limite autorizado na AET');

  const exigeComprimento = configuracao.comprimentoMinimoM !== null || configuracao.comprimentoMaximoM !== null;
  if (exigeComprimento) {
    if (!positivo(entrada.comprimentoM)) {
      faltantes.push('comprimento do veículo');
    } else if (
      (configuracao.comprimentoMinimoM !== null && entrada.comprimentoM < configuracao.comprimentoMinimoM) ||
      (configuracao.comprimentoMaximoM !== null && entrada.comprimentoM > configuracao.comprimentoMaximoM)
    ) {
      faltantes.push('comprimento compatível com a configuração');
    }
  }

  for (const [valor, rotulo] of [
    [entrada.limiteSinalizadoKg, 'limite sinalizado válido'],
    [entrada.limiteAetKg, 'limite autorizado na AET válido'],
    [entrada.cmtKg, 'CMT válida'],
  ] as Array<[number | undefined, string]>) {
    if (valor !== undefined && !positivo(valor) && !faltantes.includes(rotulo)) faltantes.push(rotulo);
  }

  if (faltantes.length > 0) {
    return {
      status: 'inconclusivo',
      limiteKg: null,
      fatorDeterminante: null,
      capacidadeCargaKg: null,
      faltantes,
      fontes: configuracao.fontes,
    };
  }

  const candidatos: Array<{ valor: number; fator: FatorLimite }> = [];
  if (configuracao.limiteTotalKg !== null) candidatos.push({ valor: configuracao.limiteTotalKg, fator: 'legal' });
  candidatos.push({ valor: entrada.pbtTecnicoKg!, fator: 'tecnico' });
  if (configuracao.unidades > 1) candidatos.push({ valor: entrada.cmtKg!, fator: 'cmt' });
  if (positivo(entrada.limiteSinalizadoKg)) candidatos.push({ valor: entrada.limiteSinalizadoKg, fator: 'sinalizacao' });
  if (positivo(entrada.limiteAetKg)) candidatos.push({ valor: entrada.limiteAetKg, fator: 'aet' });

  const determinante = candidatos.reduce((menor, atual) => atual.valor < menor.valor ? atual : menor);
  return {
    status: 'conclusivo',
    limiteKg: determinante.valor,
    fatorDeterminante: determinante.fator,
    capacidadeCargaKg: calcularCapacidadeCarga(determinante.valor, entrada.taraKg!),
    faltantes: [],
    fontes: configuracao.fontes,
  };
}
