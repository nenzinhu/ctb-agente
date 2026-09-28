// Practice cases: a real MBFT "Observações do AIT" example as the scene, and
// four framings to choose from — the right one plus three look-alikes (same
// article, else neighbouring codes). Local data only, so a case is instant.
import { INTENCOES } from '@/lib/search/intencoes';
import type { FichaMbft } from './parser';

export interface OpcaoCaso {
  codigo: string;
  rotulo: string;
  amparo: string;
}

export interface Caso {
  cena: string;
  opcoes: OpcaoCaso[];
  correta: string;
  gravidade: string;
  /** Plain-language example, when the infraction is in the intents map */
  explicacao: string | null;
}

const artigo = (f: FichaMbft) => f.amparoLegal.match(/Art\.?\s*(\d+(?:-[A-Z])?)/i)?.[1] ?? '';
const base = (f: FichaMbft) => Number(f.codigo.slice(0, 3));

/** Scene text without numbering nor codes that would give the answer away */
function limparCena(exemplo: string): string {
  return exemplo
    .replace(/^\d+(\.\d+)*\.?\s*/, '')
    .replace(/\b\d{3}-\d{2}\b/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the sheet has an example long enough to be a scene */
export const temCena = (f: FichaMbft) => f.exemplos.some((e) => limparCena(e).length >= 25);

function embaralhar<T>(lista: T[], aleatorio: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

const opcao = (f: FichaMbft): OpcaoCaso => ({ codigo: f.codigo, rotulo: f.tipificacaoResumida.trim(), amparo: f.amparoLegal });

/**
 * One practice case.
 * @param fichas - Sheet pool (needs at least 4 with distinct wording)
 * @param aleatorio - Random source in [0, 1)
 * @param alvos - Sheets the right answer must come from (a chosen topic); defaults to all
 */
export function montarCaso(fichas: FichaMbft[], aleatorio: () => number = Math.random, alvos: FichaMbft[] = fichas): Caso {
  const candidatas = alvos.filter(temCena);
  if (candidatas.length === 0) throw new Error('Nenhuma ficha com exemplo para montar o caso');
  const certa = candidatas[Math.floor(aleatorio() * candidatas.length)];
  const cenas = certa.exemplos.map(limparCena).filter((c) => c.length >= 25);
  const cena = cenas[Math.floor(aleatorio() * cenas.length)];

  // Look-alikes: same article first, then the nearest codes
  const vistos = new Set([certa.tipificacaoResumida.trim()]);
  const parecidas = fichas
    .filter((f) => f.codigo !== certa.codigo)
    .map((f) => ({ f, distancia: (artigo(f) === artigo(certa) ? 0 : 1000) + Math.abs(base(f) - base(certa)) }))
    .sort((a, b) => a.distancia - b.distancia)
    .map((x) => x.f)
    .filter((f) => {
      const rotulo = f.tipificacaoResumida.trim();
      if (vistos.has(rotulo)) return false;
      vistos.add(rotulo);
      return true;
    });
  const erradas = embaralhar(parecidas.slice(0, 6), aleatorio).slice(0, 3);

  return {
    cena,
    opcoes: embaralhar([certa, ...erradas], aleatorio).map(opcao),
    correta: certa.codigo,
    gravidade: certa.gravidade,
    explicacao: INTENCOES.find((i) => i.opcoes.some((o) => o.codigo === certa.codigo))?.exemplo ?? null,
  };
}
