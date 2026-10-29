// Field cases: for a situation the agent types, the official MBFT sheets that
// match it, each with its real "Observações do AIT" examples and the criteria
// for when to issue (and when NOT to). Only official text, no AI, no guesses.
import { crimeDaFicha } from './ficha-extras';
import type { FichaMbft } from './parser';

export interface CasoPratico {
  codigo: string;
  infracao: string;
  amparo: string;
  gravidade: string;
  medidaAdministrativa: string;
  /** Crime articles when the infraction can also be a crime */
  crime: string | null;
  /** How the AIT observation field is written for this infraction */
  exemplos: string[];
  quandoAutuar: string[];
  quandoNaoAutuar: string[];
  pagina: number;
}

/** "1. Veículo …" → "Veículo …" */
const semNumero = (t: string) => t.replace(/^\d+(\.\d+)*\.?\s*/, '').replace(/\s+/g, ' ').trim();

/** The field view of an official sheet */
export function casoDaFicha(f: FichaMbft): CasoPratico {
  return {
    codigo: f.codigo,
    infracao: f.tipificacao?.trim() || f.tipificacaoResumida.trim(),
    amparo: f.amparoLegal.trim().replace(/\.$/, ''),
    gravidade: f.gravidade,
    medidaAdministrativa: f.medidaAdministrativa?.trim() ?? '',
    crime: crimeDaFicha(f),
    exemplos: f.exemplos.map(semNumero).filter(Boolean),
    quandoAutuar: f.quandoAutuar.map(semNumero).filter(Boolean),
    quandoNaoAutuar: f.quandoNaoAutuar.map(semNumero).filter(Boolean),
    pagina: f.pagina,
  };
}
