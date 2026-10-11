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

  // The catalog supplies the legal limit of the drawn configuration, so the
  // technical data the agent cannot always read on the road (tare, length,
  // CMT, signage) is optional: it only narrows the limit when informed. The
  // AET limit is the exception — a configuration that circulates under an
  // authorization must never have its limit presumed (Res. 882/2021).
  if (configuracao.requerAet && !positivo(entrada.limiteAetKg)) faltantes.push('limite autorizado na AET');

  const exigeComprimento = configuracao.comprimentoMinimoM !== null || configuracao.comprimentoMaximoM !== null;
  if (
    exigeComprimento &&
    positivo(entrada.comprimentoM) &&
    ((configuracao.comprimentoMinimoM !== null && entrada.comprimentoM < configuracao.comprimentoMinimoM) ||
      (configuracao.comprimentoMaximoM !== null && entrada.comprimentoM > configuracao.comprimentoMaximoM))
  ) {
    faltantes.push('comprimento compatível com a configuração');
  }

  // Whatever is informed must be usable: a zero or negative figure is an error.
  for (const [valor, rotulo] of [
    [entrada.taraKg, 'tara válida'],
    [entrada.comprimentoM, 'comprimento válido'],
    [entrada.pbtTecnicoKg, 'PBT/PBTC válido'],
    [entrada.limiteSinalizadoKg, 'limite sinalizado válido'],
    [entrada.limiteAetKg, 'limite autorizado na AET válido'],
    [entrada.cmtKg, 'CMT válida'],
  ] as Array<[number | undefined, string]>) {
    if (valor !== undefined && !positivo(valor) && !faltantes.includes(rotulo)) faltantes.push(rotulo);
  }

  const candidatos: Array<{ valor: number; fator: FatorLimite }> = [];
  if (configuracao.limiteTotalKg !== null) candidatos.push({ valor: configuracao.limiteTotalKg, fator: 'legal' });
  if (positivo(entrada.pbtTecnicoKg)) candidatos.push({ valor: entrada.pbtTecnicoKg, fator: 'tecnico' });
  if (configuracao.unidades > 1 && positivo(entrada.cmtKg)) candidatos.push({ valor: entrada.cmtKg, fator: 'cmt' });
  if (positivo(entrada.limiteSinalizadoKg)) candidatos.push({ valor: entrada.limiteSinalizadoKg, fator: 'sinalizacao' });
  if (positivo(entrada.limiteAetKg)) candidatos.push({ valor: entrada.limiteAetKg, fator: 'aet' });
  if (candidatos.length === 0) faltantes.push('limite regulamentar do catálogo');

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

  const determinante = candidatos.reduce((menor, atual) => atual.valor < menor.valor ? atual : menor);
  return {
    status: 'conclusivo',
    limiteKg: determinante.valor,
    fatorDeterminante: determinante.fator,
    // Only the tare makes the payload capacity known.
    capacidadeCargaKg: positivo(entrada.taraKg) ? calcularCapacidadeCarga(determinante.valor, entrada.taraKg) : null,
    faltantes: [],
    fontes: configuracao.fontes,
  };
}
